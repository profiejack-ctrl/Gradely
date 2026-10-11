/**
 * apiSyncEngine.ts
 * ----------------
 * Replaces the old syncEngine.ts (which called Supabase directly from the browser).
 * All mutations now go through the Express backend via apiClient.ts.
 *
 * This engine:
 *  - Tracks online/offline status
 *  - Queues mutations offline and flushes them when reconnected
 *  - Provides the same SyncStatus observable interface as the old syncEngine
 */

import {
  addToOfflineQueue,
  loadOfflineQueue,
  clearOfflineQueue,
  flushOfflineQueue,
  dataApi,
  getToken,
} from './apiClient';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'pending' | 'local_only';

type StatusListener = (status: SyncStatus, queueLength: number) => void;

class ApiSyncEngine {
  private isOnline: boolean;
  private status: SyncStatus;
  private listeners: Set<StatusListener> = new Set();
  private isFlushing = false;

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.status = this.isOnline ? 'synced' : 'offline';

    const pendingQueue = loadOfflineQueue();
    if (pendingQueue.length > 0) {
      this.status = 'pending';
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online',  () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
    }
  }

  // -------------------------------------------------------------------------
  // Subscription
  // -------------------------------------------------------------------------

  subscribeStatus(cb: StatusListener): () => void {
    this.listeners.add(cb);
    cb(this.status, loadOfflineQueue().length);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    const q = loadOfflineQueue().length;
    this.listeners.forEach(cb => cb(this.status, q));
  }

  private setStatus(s: SyncStatus) {
    this.status = s;
    this.notify();
  }

  getStatus() {
    return {
      status: this.status,
      queueLength: loadOfflineQueue().length,
      isConfigured: Boolean(getToken()),
    };
  }

  // -------------------------------------------------------------------------
  // Online / offline events
  // -------------------------------------------------------------------------

  private handleOnline() {
    this.isOnline = true;
    this.flushQueue();
  }

  private handleOffline() {
    this.isOnline = false;
    this.setStatus('offline');
  }

  // -------------------------------------------------------------------------
  // Enqueueing mutations
  // -------------------------------------------------------------------------

  enqueue(table: string, action: 'UPSERT' | 'DELETE', payload: any) {
    this.enqueueBatch(table, action, [payload]);
  }

  enqueueBatch(table: string, action: 'UPSERT' | 'DELETE', payloads: any[]) {
    if (!payloads || payloads.length === 0) return;
    for (const p of payloads) {
      addToOfflineQueue(table, action, p);
    }

    if (this.isOnline) {
      this.flushQueue();
    } else {
      this.setStatus('offline');
    }
  }

  // -------------------------------------------------------------------------
  // Flush
  // -------------------------------------------------------------------------

  async flushQueue(): Promise<{ success: boolean; syncedCount: number }> {
    if (this.isFlushing) return { success: true, syncedCount: 0 };
    const queue = loadOfflineQueue();
    if (queue.length === 0) {
      this.setStatus('synced');
      return { success: true, syncedCount: 0 };
    }

    this.isFlushing = true;
    this.setStatus('syncing');

    try {
      const result = await flushOfflineQueue();
      if (result.success) {
        this.setStatus('synced');
      } else {
        this.setStatus(this.isOnline ? 'pending' : 'offline');
      }
      return { success: result.success, syncedCount: result.synced };
    } finally {
      this.isFlushing = false;
    }
  }

  clearQueue() {
    clearOfflineQueue();
    this.setStatus('synced');
  }

  getQueue() {
    return loadOfflineQueue();
  }

  // -------------------------------------------------------------------------
  // Load all data from backend
  // -------------------------------------------------------------------------

  async pullAll() {
    if (!getToken()) return null;
    try {
      const res = await dataApi.loadAll();
      if (res.error || !res.data) return null;
      return res.data;
    } catch {
      return null;
    }
  }

  // -------------------------------------------------------------------------
  // Push full snapshot (Dean: sync-all)
  // -------------------------------------------------------------------------

  async pushAllData(data: {
    users: any[];
    sections: any[];
    templates: any[];
    subjects: any[];
    assessments: any[];
    scores: any[];
    attendance: any[];
    holidays: any[];
  }): Promise<{ success: boolean; error?: any }> {
    try {
      this.setStatus('syncing');

      // Build mutations from full snapshot
      const mutations: Array<{ table: string; action: 'UPSERT'; payload: any }> = [
        ...data.users.map(u => ({
          table: 'users', action: 'UPSERT' as const,
          payload: {
            id: u.id, name: u.name, email: u.email, role: u.role,
            student_number: u.studentNumber || null,
            section_id: (u.sectionIds || []).join(',') || (u.sectionId ? u.sectionId : null),
            avatar: u.avatar || null, department: u.department || null, title: u.title || null,
          }
        })),
        ...data.sections.map(s => ({
          table: 'sections', action: 'UPSERT' as const,
          payload: {
            id: s.id, name: s.name, grade_level_or_year: s.gradeLevelOrYear,
            academic_year: s.academicYear, semester: s.semester,
            room: s.room || null,
            description: s.description || '',
            adviserId: s.adviserId,
          }
        })),
        ...data.templates.map(t => ({
          table: 'grading_matrix_templates', action: 'UPSERT' as const,
          payload: { id: t.id, name: t.name, description: t.description || null, is_default: t.isDefault, passing_grade: t.passingGrade, matrix: t.matrix }
        })),
        ...data.subjects.map(s => ({
          table: 'subjects', action: 'UPSERT' as const,
          payload: { id: s.id, section_id: s.sectionId, teacher_id: s.teacherId, name: s.name, code: s.code, schedule: s.schedule, units: s.units, passing_grade: s.passingGrade, matrix: s.matrix }
        })),
        ...data.assessments.map(a => ({
          table: 'assessments', action: 'UPSERT' as const,
          payload: { id: a.id, subject_id: a.subjectId, category_id: a.categoryId, parent_category_id: a.parentCategoryId || null, period: a.period || 'prelim', title: a.title, max_score: a.maxScore, date: a.date, due_date: a.dueDate || null, description: a.description || null }
        })),
        ...data.scores.map(s => ({
          table: 'score_records', action: 'UPSERT' as const,
          payload: { id: s.id, assessment_id: s.assessmentId, student_id: s.studentId, score: s.score, remarks: s.remarks || null }
        })),
        ...data.attendance.map(a => ({
          table: 'attendance_records', action: 'UPSERT' as const,
          payload: { id: a.id, subject_id: a.subjectId, student_id: a.studentId, date: a.date, period: a.period || 'prelim', status: a.status, note: a.note || null }
        })),
        ...data.holidays.map(h => ({
          table: 'holidays', action: 'UPSERT' as const,
          payload: { id: h.id, date: h.date, title: h.title, type: h.type, description: h.description || null }
        })),
      ];

      const res = await dataApi.sync(mutations);
      if (res.error) {
        this.setStatus('offline');
        return { success: false, error: res.error };
      }

      this.clearQueue();
      this.setStatus('synced');
      return { success: true };
    } catch (err) {
      this.setStatus('offline');
      return { success: false, error: err };
    }
  }

  // -------------------------------------------------------------------------
  // Wipe cloud database (Dean only)
  // -------------------------------------------------------------------------

  async wipeCloudDatabase(options?: { keepTeachersAndTemplates?: boolean }) {
    try {
      this.setStatus('syncing');
      const res = await dataApi.wipe(options?.keepTeachersAndTemplates);
      if (res.error) return { success: false, error: res.error };
      this.clearQueue();
      this.setStatus('synced');
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  }

  // -------------------------------------------------------------------------
  // Realtime (stub — can be added via SSE or polling)
  // -------------------------------------------------------------------------

  initRealtime(onRemoteChange: () => void) {
    // Optional: implement polling or SSE here
    // For now, we poll every 30s when online
    let interval: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (interval) return;
      interval = setInterval(() => {
        if (this.isOnline) onRemoteChange();
      }, 30000);
    };

    const stop = () => {
      if (interval) { clearInterval(interval); interval = null; }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', start);
      window.addEventListener('blur', stop);
      start();
    }
  }
}

export const syncEngine = new ApiSyncEngine();
