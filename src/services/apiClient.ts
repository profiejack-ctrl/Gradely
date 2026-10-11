/**
 * apiClient.ts
 * -----------
 * Central HTTP client for communicating with the Express backend.
 * Replaces the direct Supabase connection on the frontend.
 *
 * All requests include the JWT Bearer token stored in localStorage.
 * Works offline: mutations queue to localStorage and flush when reconnected.
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'aurasms_api_token_v1';

// --------------------------------------------------------------------------
// Token management
// --------------------------------------------------------------------------

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
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
  skipAuth = false
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
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      data = null;
    }

    if (!res.ok) {
      return { status: res.status, error: data?.error || `HTTP ${res.status}` };
    }

    return { status: res.status, data: data as T };
  } catch (err: any) {
    // Network error (offline)
    return { status: 0, error: err.message || 'Network error' };
  }
}

// --------------------------------------------------------------------------
// Convenience methods
// --------------------------------------------------------------------------

export const api = {
  get:    <T = any>(path: string)            => request<T>('GET',    path),
  post:   <T = any>(path: string, body: any) => request<T>('POST',   path, body),
  put:    <T = any>(path: string, body: any) => request<T>('PUT',    path, body),
  patch:  <T = any>(path: string, body: any) => request<T>('PATCH',  path, body),
  delete: <T = any>(path: string, body?: any) => request<T>('DELETE', path, body),
};

// --------------------------------------------------------------------------
// Auth API
// --------------------------------------------------------------------------

export const authApi = {
  login: (email: string, password?: string) =>
    api.post('/api/auth/login', { email, password }),

  me: () => api.get('/api/auth/me'),

  changePassword: (newPassword: string) =>
    api.post('/api/auth/change-password', { newPassword }),

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
    api.post('/api/data/sync', { mutations }),

  /** Wipe cloud database (Dean only) */
  wipe: (keepTeachersAndTemplates = false) =>
    api.delete(`/api/data/wipe?keepTeachersAndTemplates=${keepTeachersAndTemplates}`),
};

// --------------------------------------------------------------------------
// Teachers API (Dean only)
// --------------------------------------------------------------------------

export const teachersApi = {
  list:   ()                 => api.get('/api/teachers'),
  create: (data: any)        => api.post('/api/teachers', data),
  update: (id: string, data: any) => api.put(`/api/teachers/${id}`, data),
  remove: (id: string)       => api.delete(`/api/teachers/${id}`),
};

// --------------------------------------------------------------------------
// Offline mutation queue
// --------------------------------------------------------------------------

const OFFLINE_QUEUE_KEY = 'aurasms_offline_api_queue_v1';

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
  const queue = loadOfflineQueue();
  queue.push({
    id: `mut-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
    table,
    action,
    payload,
    timestamp: Date.now(),
  });
  saveOfflineQueue(queue);
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

/** Flush all queued offline mutations to the backend */
export async function flushOfflineQueue(): Promise<{ success: boolean; synced: number }> {
  const queue = loadOfflineQueue();
  if (queue.length === 0) return { success: true, synced: 0 };

  const mutations = queue.map(q => ({
    table: q.table,
    action: q.action,
    payload: q.payload,
  }));

  const result = await dataApi.sync(mutations);
  if (result.status === 0) {
    // Still offline
    return { success: false, synced: 0 };
  }

  if (!result.error) {
    clearOfflineQueue();
    return { success: true, synced: queue.length };
  }

  return { success: false, synced: 0 };
}
