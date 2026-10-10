import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import {
  Section,
  Subject,
  Assessment,
  ScoreRecord,
  AttendanceRecord,
  User,
  GradingMatrixTemplate,
  Holiday,
} from '../types';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'pending' | 'local_only';

export interface QueuedMutation {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
}

const QUEUE_STORAGE_KEY = 'aurasms_offline_sync_queue';

class SyncEngine {
  private queue: QueuedMutation[] = [];
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private status: SyncStatus = isSupabaseConfigured ? 'synced' : 'local_only';
  private listeners: Set<(status: SyncStatus, queueLength: number) => void> = new Set();
  private realtimeChannel: any = null;

  constructor() {
    this.loadQueue();

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  private isFlushing: boolean = false;
  private cancelRequested: boolean = false;

  public subscribeStatus(callback: (status: SyncStatus, queueLength: number) => void) {
    this.listeners.add(callback);
    callback(this.status, this.queue.length);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => cb(this.status, this.queue.length));
  }

  private setStatus(newStatus: SyncStatus) {
    this.status = newStatus;
    this.notify();
  }

  private loadQueue() {
    try {
      const saved = localStorage.getItem(QUEUE_STORAGE_KEY);
      this.queue = saved ? JSON.parse(saved) : [];
      if (this.queue.length > 0 && this.isOnline && isSupabaseConfigured) {
        this.status = 'pending';
      }
    } catch (e) {
      this.queue = [];
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notify();
    } catch (e) {
      console.error('Failed to save sync queue', e);
    }
  }

  private handleOnline() {
    this.isOnline = true;
    if (isSupabaseConfigured) {
      this.flushQueue();
    } else {
      this.setStatus('local_only');
    }
  }

  private handleOffline() {
    this.isOnline = false;
    this.setStatus('offline');
  }

  public getStatus(): { status: SyncStatus; queueLength: number; isConfigured: boolean } {
    return {
      status: this.status,
      queueLength: this.queue.length,
      isConfigured: isSupabaseConfigured,
    };
  }

  /**
   * Clears the pending offline mutation queue immediately
   */
  public clearQueue() {
    this.cancelRequested = true;
    this.queue = [];
    try {
      localStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (e) {}
    this.saveQueue();
    this.setStatus(isSupabaseConfigured ? 'synced' : 'local_only');
  }

  /**
   * Enqueues a local mutation to be synchronized to Supabase
   */
  public enqueue(table: string, action: 'UPSERT' | 'DELETE', payload: any) {
    this.enqueueBatch(table, action, [payload]);
  }

  /**
   * Enqueues multiple local mutations to be synchronized to Supabase in a single batch
   */
  public enqueueBatch(table: string, action: 'UPSERT' | 'DELETE', payloads: any[]) {
    if (!payloads || payloads.length === 0) return;

    const mutations: QueuedMutation[] = payloads.map((payload) => ({
      id: `mut-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      table,
      action,
      payload,
      timestamp: Date.now(),
    }));

    this.queue.push(...mutations);
    this.saveQueue();

    if (this.isOnline && isSupabaseConfigured) {
      this.flushQueue();
    } else {
      this.setStatus('offline');
    }
  }

  /**
   * Flushes all queued offline mutations to Supabase PostgreSQL in batched chunks
   */
  public async flushQueue(): Promise<{ success: boolean; syncedCount: number }> {
    if (!isSupabaseConfigured || !supabase || this.queue.length === 0 || this.isFlushing) {
      if (this.queue.length === 0) {
        this.setStatus(isSupabaseConfigured ? 'synced' : 'local_only');
      }
      return { success: true, syncedCount: 0 };
    }

    this.isFlushing = true;
    this.cancelRequested = false;
    this.setStatus('syncing');
    let syncedCount = 0;

    const ON_CONFLICT_MAP: Record<string, string> = {
      attendance_records: 'subject_id,student_id,date',
      score_records: 'assessment_id,student_id',
      users: 'id',
      sections: 'id',
      subjects: 'id',
      assessments: 'id',
      grading_matrix_templates: 'id',
      holidays: 'id',
    };

    while (this.queue.length > 0 && !this.cancelRequested) {
      const firstItem = this.queue[0];
      // Gather contiguous items targeting the same table and action (up to 50 items per batch)
      const batch = this.queue
        .filter((item) => item.table === firstItem.table && item.action === firstItem.action)
        .slice(0, 50);

      const batchIds = new Set(batch.map((b) => b.id));

      try {
        let error: any = null;

        if (firstItem.action === 'UPSERT') {
          const onConflict = ON_CONFLICT_MAP[firstItem.table] || 'id';
          const payloads = batch.map((b) => b.payload);
          const res = await supabase.from(firstItem.table).upsert(payloads, { onConflict });
          error = res.error;
        } else if (firstItem.action === 'DELETE') {
          const idsToDelete = batch.map((b) => b.payload.id);
          const res = await supabase.from(firstItem.table).delete().in('id', idsToDelete);
          error = res.error;
        }

        if (error) {
          if (error.code === 'PGRST205') {
            console.warn(
              `⚠️ Table '${firstItem.table}' does not exist in Supabase yet. Run 'supabase/schema.sql' in your Supabase SQL Editor to create the tables.`
            );
            break;
          } else if (error.code === '23503' || error.code === '23505') {
            console.warn(
              `⚠️ Constraint notice for ${firstItem.table} (${error.details || error.message}). Skipped invalid batch to keep queue running.`
            );
            // Remove failing items to prevent deadlock
            this.queue = this.queue.filter((item) => !batchIds.has(item.id));
            this.saveQueue();
          } else {
            console.warn(`Sync failed for ${firstItem.table}:`, error);
            break;
          }
        } else {
          syncedCount += batch.length;
          // Successfully processed: remove ONLY these processed items from this.queue
          this.queue = this.queue.filter((item) => !batchIds.has(item.id));
          this.saveQueue();
        }
      } catch (err) {
        console.error('Network sync error during flushQueue:', err);
        break;
      }
    }

    this.isFlushing = false;

    if (this.cancelRequested) {
      this.queue = [];
      this.saveQueue();
      this.setStatus(isSupabaseConfigured ? 'synced' : 'local_only');
      return { success: true, syncedCount };
    }

    if (this.queue.length === 0) {
      this.setStatus('synced');
    } else {
      this.setStatus('pending');
    }

    return { success: this.queue.length === 0, syncedCount };
  }

  /**
   * Pushes entire local database snapshot to Supabase in topological dependency order
   */
  public async pushAllData(data: {
    users: User[];
    sections: Section[];
    templates: GradingMatrixTemplate[];
    subjects: Subject[];
    assessments: Assessment[];
    scores: ScoreRecord[];
    attendance: AttendanceRecord[];
    holidays: Holiday[];
  }): Promise<{ success: boolean; error?: any }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: false, error: 'Supabase is not configured' };
    }

    this.setStatus('syncing');
    try {
      // 1. Users
      if (data.users && data.users.length > 0) {
        await supabase.from('users').upsert(
          data.users.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            student_number: u.studentNumber || null,
            section_id: u.sectionId || null,
            avatar: u.avatar || null,
            department: u.department || null,
            title: u.title || null,
          })),
          { onConflict: 'id' }
        );
      }

      // 2. Sections
      if (data.sections && data.sections.length > 0) {
        await supabase.from('sections').upsert(
          data.sections.map((s) => ({
            id: s.id,
            name: s.name,
            grade_level_or_year: s.gradeLevelOrYear,
            academic_year: s.academicYear,
            semester: s.semester,
            room: s.room || null,
            description: s.description || null,
          })),
          { onConflict: 'id' }
        );
      }

      // 3. Matrix Templates
      if (data.templates && data.templates.length > 0) {
        await supabase.from('grading_matrix_templates').upsert(
          data.templates.map((t) => ({
            id: t.id,
            name: t.name,
            description: t.description || null,
            is_default: t.isDefault,
            passing_grade: t.passingGrade,
            matrix: t.matrix,
          })),
          { onConflict: 'id' }
        );
      }

      // 4. Subjects
      if (data.subjects && data.subjects.length > 0) {
        await supabase.from('subjects').upsert(
          data.subjects.map((sub) => ({
            id: sub.id,
            section_id: sub.sectionId,
            teacher_id: sub.teacherId,
            name: sub.name,
            code: sub.code,
            schedule: sub.schedule,
            units: sub.units,
            passing_grade: sub.passingGrade,
            matrix: sub.matrix,
          })),
          { onConflict: 'id' }
        );
      }

      // 5. Assessments
      if (data.assessments && data.assessments.length > 0) {
        await supabase.from('assessments').upsert(
          data.assessments.map((a) => ({
            id: a.id,
            subject_id: a.subjectId,
            category_id: a.categoryId,
            parent_category_id: a.parentCategoryId || null,
            period: a.period || 'prelim',
            title: a.title,
            max_score: a.maxScore,
            date: a.date,
            due_date: a.dueDate || null,
            description: a.description || null,
          })),
          { onConflict: 'id' }
        );
      }

      // 6. Scores
      if (data.scores && data.scores.length > 0) {
        await supabase.from('score_records').upsert(
          data.scores.map((sc) => ({
            id: sc.id,
            assessment_id: sc.assessmentId,
            student_id: sc.studentId,
            score: sc.score,
            remarks: sc.remarks || null,
          })),
          { onConflict: 'assessment_id,student_id' }
        );
      }

      // 7. Attendance
      if (data.attendance && data.attendance.length > 0) {
        await supabase.from('attendance_records').upsert(
          data.attendance.map((att) => ({
            id: att.id,
            subject_id: att.subjectId,
            student_id: att.studentId,
            date: att.date,
            period: att.period || 'prelim',
            status: att.status,
            note: att.note || null,
          })),
          { onConflict: 'subject_id,student_id,date' }
        );
      }

      // 8. Holidays
      if (data.holidays && data.holidays.length > 0) {
        await supabase.from('holidays').upsert(
          data.holidays.map((h) => ({
            id: h.id,
            date: h.date,
            title: h.title,
            type: h.type,
            description: h.description || null,
          })),
          { onConflict: 'id' }
        );
      }

      this.clearQueue();
      this.setStatus('synced');
      return { success: true };
    } catch (err: any) {
      console.error('Failed to push all data to Supabase:', err);
      this.setStatus('offline');
      return { success: false, error: err };
    }
  }

  /**
   * Wipes or clears tables from Supabase cloud database
   */
  public async wipeCloudDatabase(options?: {
    keepTeachersAndTemplates?: boolean;
  }): Promise<{ success: boolean; error?: any }> {
    if (!isSupabaseConfigured || !supabase) {
      return { success: true };
    }

    this.setStatus('syncing');
    try {
      // Delete in reverse foreign-key order
      // 1. score_records
      await supabase.from('score_records').delete().not('id', 'is', null);
      // 2. attendance_records
      await supabase.from('attendance_records').delete().not('id', 'is', null);
      // 3. assessments
      await supabase.from('assessments').delete().not('id', 'is', null);
      // 4. subjects
      await supabase.from('subjects').delete().not('id', 'is', null);
      // 5. sections
      await supabase.from('sections').delete().not('id', 'is', null);

      if (options?.keepTeachersAndTemplates) {
        // Delete only students
        await supabase.from('users').delete().eq('role', 'student');
      } else {
        await supabase.from('users').delete().not('id', 'is', null);
        await supabase.from('grading_matrix_templates').delete().not('id', 'is', null);
        await supabase.from('holidays').delete().not('id', 'is', null);
      }

      this.clearQueue();
      this.setStatus('synced');
      return { success: true };
    } catch (err: any) {
      console.error('Failed to wipe Supabase database:', err);
      return { success: false, error: err };
    }
  }

  /**
   * Pulls latest database records from Supabase
   */
  public async pullAll(): Promise<{
    users?: User[];
    sections?: Section[];
    subjects?: Subject[];
    assessments?: Assessment[];
    scores?: ScoreRecord[];
    attendance?: AttendanceRecord[];
    matrixTemplates?: GradingMatrixTemplate[];
    holidays?: Holiday[];
  } | null> {
    if (!isSupabaseConfigured || !supabase) return null;

    try {
      const [
        usersRes,
        sectionsRes,
        templatesRes,
        subjectsRes,
        assessmentsRes,
        scoresRes,
        attendanceRes,
        holidaysRes,
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('sections').select('*'),
        supabase.from('grading_matrix_templates').select('*'),
        supabase.from('subjects').select('*'),
        supabase.from('assessments').select('*'),
        supabase.from('score_records').select('*'),
        supabase.from('attendance_records').select('*'),
        supabase.from('holidays').select('*'),
      ]);

      return {
        users: usersRes.data
          ? usersRes.data.map((u: any) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              studentNumber: u.student_number || undefined,
              sectionId: u.section_id || undefined,
              avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name)}`,
              department: u.department || undefined,
              title: u.title || undefined,
            }))
          : undefined,
        sections: sectionsRes.data
          ? sectionsRes.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              gradeLevelOrYear: s.grade_level_or_year,
              academicYear: s.academic_year,
              semester: s.semester,
              room: s.room || undefined,
              description: s.description || undefined,
            }))
          : undefined,
        matrixTemplates: templatesRes.data
          ? templatesRes.data.map((t: any) => ({
              id: t.id,
              name: t.name,
              description: t.description || undefined,
              isDefault: t.is_default ?? false,
              passingGrade: t.passing_grade ?? 75,
              matrix: t.matrix || [],
            }))
          : undefined,
        subjects: subjectsRes.data
          ? subjectsRes.data.map((sub: any) => ({
              id: sub.id,
              sectionId: sub.section_id,
              teacherId: sub.teacher_id,
              name: sub.name,
              code: sub.code,
              schedule: sub.schedule,
              units: sub.units,
              passingGrade: sub.passing_grade ?? 75,
              matrix: sub.matrix || [],
            }))
          : undefined,
        assessments: assessmentsRes.data
          ? assessmentsRes.data.map((a: any) => ({
              id: a.id,
              subjectId: a.subject_id,
              categoryId: a.category_id,
              parentCategoryId: a.parent_category_id || undefined,
              period: a.period || 'prelim',
              title: a.title,
              maxScore: a.max_score,
              date: a.date,
              dueDate: a.due_date || undefined,
              description: a.description || undefined,
            }))
          : undefined,
        scores: scoresRes.data
          ? scoresRes.data.map((s: any) => ({
              id: s.id,
              assessmentId: s.assessment_id,
              studentId: s.student_id,
              score: s.score,
              remarks: s.remarks || undefined,
              submittedAt: s.submitted_at,
            }))
          : undefined,
        attendance: attendanceRes.data
          ? attendanceRes.data.map((a: any) => ({
              id: a.id,
              subjectId: a.subject_id,
              studentId: a.student_id,
              date: a.date,
              period: a.period,
              status: a.status,
              note: a.note || undefined,
            }))
          : undefined,
        holidays: holidaysRes.data
          ? holidaysRes.data.map((h: any) => ({
              id: h.id,
              date: h.date,
              title: h.title,
              type: h.type,
              description: h.description || undefined,
            }))
          : undefined,
      };
    } catch (e) {
      console.error('Failed to pull from Supabase:', e);
      return null;
    }
  }

  /**
   * Subscribes to Supabase Realtime changes
   */
  public initRealtime(onRemoteChange: () => void) {
    if (!isSupabaseConfigured || !supabase || this.realtimeChannel) return;

    this.realtimeChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        () => {
          onRemoteChange();
        }
      )
      .subscribe();
  }
}

export const syncEngine = new SyncEngine();
