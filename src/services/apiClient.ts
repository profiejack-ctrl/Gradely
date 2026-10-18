/**
 * apiClient.ts
 * -----------
 * Central HTTP client for communicating with the Express backend.
 * Replaces the direct Supabase connection on the frontend.
 *
 * Authentication uses a server-issued HttpOnly cookie. A short-lived session
 * marker is kept in sessionStorage only so the app can restore the session.
 * Works offline: mutations queue to localStorage and flush when reconnected.
 */

export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

const TOKEN_KEY = 'gradely_api_token_v1';
const SESSION_KEY = 'gradely_session_v1';
const REQUEST_TIMEOUT_MS = 12000;
const SYNC_REQUEST_TIMEOUT_MS = 60000;

// --------------------------------------------------------------------------
// Token management
// --------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function hasSession(): boolean {
  return Boolean(getToken() || sessionStorage.getItem(SESSION_KEY) === '1');
}

export function setToken(token: string): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(SESSION_KEY, '1');
  }
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('gradely:auth_unauthorized'));
  }
}

// --------------------------------------------------------------------------
// Core fetch wrapper
// --------------------------------------------------------------------------

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

async function request<T = any>(
  method: string,
  path: string,
  body?: any,
  skipAuth = false,
  timeoutMs = REQUEST_TIMEOUT_MS
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: 'include',
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    window.clearTimeout(timeout);

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      if (res.status === 401) clearToken();
      return { status: res.status, data: data as T, error: data?.error || `HTTP ${res.status}` };
    }

    return { status: res.status, data: data as T };
  } catch (err: any) {
    if (err?.name === 'AbortError') return { status: 0, error: 'The server took too long to respond.' };
    return { status: 0, error: 'Unable to connect to the server. Check that the API is running.' };
  }
}

// --------------------------------------------------------------------------
// Convenience methods
// --------------------------------------------------------------------------

export const api = {
  get:    <T = any>(path: string)            => request<T>('GET',    path),
  post:   <T = any>(path: string, body: any, timeoutMs = REQUEST_TIMEOUT_MS) => request<T>('POST', path, body, false, timeoutMs),
  put:    <T = any>(path: string, body: any) => request<T>('PUT',    path, body),
  patch:  <T = any>(path: string, body: any) => request<T>('PATCH',  path, body),
  delete: <T = any>(path: string, body?: any) => request<T>('DELETE', path, body),
};

// --------------------------------------------------------------------------
// Auth API
// --------------------------------------------------------------------------

export const authApi = {
  login: (identifier: string, password?: string) =>
    api.post('/api/auth/login', { identifier, email: identifier, password }),

  register: (data: object) =>
    api.post('/api/auth/register', data),

  me: () => api.get('/api/auth/me'),

  logout: () => api.post('/api/auth/logout', {}),

  changePassword: (newPassword: string) =>
    api.post('/api/auth/change-password', { newPassword }),

  sendEmailOtp: (email: string) =>
    api.post<{ success: boolean; message: string; mode?: string; devOtp?: string }>('/api/auth/send-email-otp', { email }),

  completeStudentOnboarding: (data: { newPassword: string; email: string; otp: string }) =>
    api.post<{ success: boolean; user: any; token: string }>('/api/auth/complete-student-onboarding', data),

  verifyPassword: (password: string) =>
    api.post('/api/auth/verify-password', { password }),

  updateProfile: (data: { name?: string; avatar?: string; title?: string; department?: string; newPassword?: string }) =>
    api.put('/api/auth/profile', data),
};

// --------------------------------------------------------------------------
// Data API
// --------------------------------------------------------------------------

export const dataApi = {
  /** Load all data for the authenticated user */
  loadAll: () => api.get('/api/data/all'),

  /** Send batch mutations to backend */
  sync: (mutations: Array<{ table: string; action: 'UPSERT' | 'DELETE'; payload: any }>) =>
    api.post('/api/data/sync', { mutations }, SYNC_REQUEST_TIMEOUT_MS),

  /** Wipe cloud database (Faculty only) */
  wipe: (keepTeachersAndTemplates = false) =>
    api.delete(`/api/data/wipe?keepTeachersAndTemplates=${keepTeachersAndTemplates}`),

  /** Push entire data snapshot to cloud (Faculty only) */
  pushAll: (payload: any) =>
    api.post('/api/data/push-all', payload),
};

// --------------------------------------------------------------------------
// Teachers API (Dean only)
// --------------------------------------------------------------------------

export const teachersApi = {
  list:   ()                 => api.get('/api/teachers'),
  create: (data: any)        => api.post('/api/teachers', data),
  update: (id: string, data: any) => api.put(`/api/teachers/${id}`, data),
  resetPassword: (id: string) => api.post(`/api/teachers/${id}/reset-password`, {}),
  remove: (id: string)       => api.delete(`/api/teachers/${id}`),
};

export const auditApi = {
  list: (limit = 100) => api.get(`/api/audit?limit=${Math.min(200, Math.max(1, limit))}`),
};

// --------------------------------------------------------------------------
// Offline mutation queue
// --------------------------------------------------------------------------

const OFFLINE_QUEUE_KEY = 'gradely_offline_api_queue_v1';

export interface OfflineMutation {
  id: string;
  table: string;
  action: 'UPSERT' | 'DELETE';
  payload: any;
  timestamp: number;
}

export function loadOfflineQueue(): OfflineMutation[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: OfflineMutation[]): void {
  try {
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export function addToOfflineQueue(table: string, action: 'UPSERT' | 'DELETE', payload: any): void {
  addBatchToOfflineQueue([{ table, action, payload }]);
}

export function addBatchToOfflineQueue(mutations: Array<{ table: string; action: 'UPSERT' | 'DELETE'; payload: any }>): void {
  if (!mutations || mutations.length === 0) return;
  const queue = loadOfflineQueue();
  const now = Date.now();
  for (let i = 0; i < mutations.length; i++) {
    const m = mutations[i];
    queue.push({
      id: `mut-${now.toString(36)}-${i}-${Math.random().toString(36).substr(2, 4)}`,
      table: m.table,
      action: m.action,
      payload: m.payload,
      timestamp: now,
    });
  }
  saveOfflineQueue(queue);
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/** Flush all queued offline mutations to the backend in fast, chunked batches */
export async function flushOfflineQueue(): Promise<{ success: boolean; synced: number; error?: string }> {
  // Keep requests comfortably below the backend's 2,000-mutation ceiling while
  // avoiding hundreds of round trips for a normal grade sheet import.
  const BATCH_SIZE = 500;
  let totalSynced = 0;

  while (true) {
    const currentQueue = loadOfflineQueue();
    if (currentQueue.length === 0) break;

    const chunk = currentQueue.slice(0, BATCH_SIZE);
    const mutations = chunk.map(q => ({
      table: q.table,
      action: q.action,
      payload: q.payload,
    }));

    const result = await dataApi.sync(mutations);
    if (result.status === 0) {
      // Offline or network error
      return { success: false, synced: totalSynced, error: result.error || 'Unable to reach the API server.' };
    }

    if (!result.error && result.data?.success !== false) {
      const chunkIds = new Set(chunk.map(q => q.id));
      const remaining = loadOfflineQueue().filter(q => !chunkIds.has(q.id));
      saveOfflineQueue(remaining);
      totalSynced += chunk.length;
    } else {
      // Keep failed mutations in the queue so the user can retry after fixing
      // a temporary production/API problem. The explicit Discard action in the
      // sync menu remains available when a payload truly needs to be removed.
      console.warn(`[SyncEngine] Keeping failed mutations for retry (${result.status}):`, result.error || result.data?.errors);
      const serverError =
        (Array.isArray(result.data?.errors) ? result.data.errors.join('; ') : '') ||
        result.error ||
        `The API rejected the sync request (HTTP ${result.status}).`;
      return { success: false, synced: totalSynced, error: serverError };
    }
  }

  return { success: true, synced: totalSynced };
}
