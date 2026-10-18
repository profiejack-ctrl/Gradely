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
  addBatchToOfflineQueue,
  loadOfflineQueue,
  clearOfflineQueue,
  flushOfflineQueue,
  dataApi,
  hasSession,
  getToken,
} from './apiClient';

export type SyncStatus = 'synced' | 'offline' | 'syncing' | 'pending' | 'local_only';

type StatusListener = (status: SyncStatus, queueLength: number) => void;

class ApiSyncEngine {
  private isOnline: boolean;
  private status: SyncStatus;
  private listeners: Set<StatusListener> = new Set();
  private isFlushing = false;
  private flushPromise: Promise<{ success: boolean; syncedCount: number; error?: string }> | null = null;

  constructor() {
    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    this.status = this.isOnline ? 'synced' : 'offline';

    const pendingQueue = loadOfflineQueue();
    if (pendingQueue.length > 0) {
      this.status = 'pending';
      if (this.isOnline && typeof window !== 'undefined') {
        setTimeout(() => {
          if (hasSession()) void this.flushQueue();
        }, 300);
      }
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
      isConfigured: hasSession(),
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
    const items = payloads.map(p => ({ table, action, payload: p }));
    addBatchToOfflineQueue(items);

    if (this.isOnline) {
      this.flushQueue();
    } else {
      this.setStatus('offline');
    }
  }

  // -------------------------------------------------------------------------
  // Flush
  // -------------------------------------------------------------------------

  async flushQueue(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    // Multiple enqueueBatch calls can happen during one import. Share the
    // in-flight promise so callers can await the real upload instead of
    // receiving a false-positive while another flush is still running.
    if (this.flushPromise) return this.flushPromise;

    this.flushPromise = this.performFlushQueue();
    try {
      return await this.flushPromise;
    } finally {
      this.flushPromise = null;
    }
  }

  private async performFlushQueue(): Promise<{ success: boolean; syncedCount: number; error?: string }> {
    if (this.isFlushing) return { success: true, syncedCount: 0 };
    if (!hasSession() || !getToken()) {
      return { success: false, syncedCount: 0 };
    }
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
      return { success: result.success, syncedCount: result.synced, error: result.error };
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
    if (!hasSession()) return null;
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

      const res = await dataApi.pushAll({
        users: data.users,
        sections: data.sections,
        matrixTemplates: data.templates,
        subjects: data.subjects,
        assessments: data.assessments,
        scores: data.scores,
        attendance: data.attendance,
        holidays: data.holidays,
      });

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
