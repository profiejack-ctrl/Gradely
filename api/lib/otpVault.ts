import { supabase } from './supabase';

interface StoredOtp {
  email: string;
  code: string;
  expiresAt: number;
  attempts: number;
  studentId?: string;
}

// In-memory cache for fast access
const memoryStore = new Map<string, StoredOtp>();

export async function saveOtp(key: string, data: StoredOtp): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  memoryStore.set(normalizedKey, data);

  if (!supabase) return;

  try {
    // Read current vault entries
    const { data: row } = await supabase
      .from('grading_matrix_templates')
      .select('matrix')
      .eq('id', 'sys-otp-vault')
      .maybeSingle();

    const currentMap: Record<string, StoredOtp> = (row?.matrix as Record<string, StoredOtp>) || {};
    currentMap[normalizedKey] = data;

    // Clean up expired entries
    const now = Date.now();
    for (const k of Object.keys(currentMap)) {
      if (currentMap[k].expiresAt < now) {
        delete currentMap[k];
      }
    }

    await supabase.from('grading_matrix_templates').upsert(
      {
        id: 'sys-otp-vault',
        name: '__otp_vault__',
        description: 'System OTP vault - do not delete',
        is_default: false,
        passing_grade: 0,
        matrix: currentMap,
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[otpVault] Failed to persist to Supabase, using memory store:', err);
  }
}

export async function getOtp(key: string): Promise<StoredOtp | null> {
  const normalizedKey = key.toLowerCase().trim();

  // 1. Check in-memory store first
  const inMemory = memoryStore.get(normalizedKey);
  if (inMemory && inMemory.expiresAt > Date.now()) {
    return inMemory;
  }

  // 2. Check Supabase
  if (!supabase) return null;

  try {
    const { data: row } = await supabase
      .from('grading_matrix_templates')
      .select('matrix')
      .eq('id', 'sys-otp-vault')
      .maybeSingle();

    if (!row || !row.matrix) return null;
    const currentMap = row.matrix as Record<string, StoredOtp>;
    const entry = currentMap[normalizedKey];

    if (entry && entry.expiresAt > Date.now()) {
      memoryStore.set(normalizedKey, entry);
      return entry;
    }
    return null;
  } catch (err) {
    console.warn('[otpVault] Failed to retrieve from Supabase:', err);
    return null;
  }
}

export async function deleteOtp(key: string): Promise<void> {
  const normalizedKey = key.toLowerCase().trim();
  memoryStore.delete(normalizedKey);

  if (!supabase) return;

  try {
    const { data: row } = await supabase
      .from('grading_matrix_templates')
      .select('matrix')
      .eq('id', 'sys-otp-vault')
      .maybeSingle();

    if (!row || !row.matrix) return;
    const currentMap = row.matrix as Record<string, StoredOtp>;
    delete currentMap[normalizedKey];

    await supabase.from('grading_matrix_templates').upsert(
      {
        id: 'sys-otp-vault',
        name: '__otp_vault__',
        description: 'System OTP vault - do not delete',
        is_default: false,
        passing_grade: 0,
        matrix: currentMap,
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[otpVault] Failed to delete from Supabase:', err);
  }
}
