import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { User } from '../types';

export const CREDENTIALS_STORAGE_KEY = 'gradely_auth_credentials_v2';
export const AUTH_VAULT_RECORD_ID = 'sys-auth-vault';

export interface StoredCredential {
  customPassword?: string;
  mustChangePassword?: boolean;
  updatedAt?: number;
}

type CredentialsMap = Record<string, StoredCredential>;

class AuthVaultService {
  private inMemoryMap: CredentialsMap = {};
  private isSyncing: boolean = false;

  constructor() {
    this.loadFromLocalStorage();
  }

  /**
   * Load credentials cache from localStorage
   */
  private loadFromLocalStorage(): CredentialsMap {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY) || localStorage.getItem('aurasms_auth_credentials_v2');
      if (raw) {
        this.inMemoryMap = JSON.parse(raw);
        return this.inMemoryMap;
      }
    } catch (e) {
      console.warn('Failed to parse local credentials storage:', e);
    }
    return {};
  }

  /**
   * Save credentials cache to localStorage
   */
  private saveToLocalStorage(map: CredentialsMap) {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(map));
      this.inMemoryMap = map;
    } catch (e) {
      console.error('Failed to save to local credentials storage:', e);
    }
  }

  /**
   * Pull credentials vault from Supabase cloud
   */
  public async syncDown(): Promise<CredentialsMap> {
    if (!isSupabaseConfigured || !supabase || this.isSyncing) {
      return this.inMemoryMap;
    }

    this.isSyncing = true;
    try {
      const { data, error } = await supabase
        .from('grading_matrix_templates')
        .select('matrix')
        .eq('id', AUTH_VAULT_RECORD_ID)
        .maybeSingle();

      if (!error && data && data.matrix && typeof data.matrix === 'object' && !Array.isArray(data.matrix)) {
        const cloudMap = data.matrix as CredentialsMap;
        // Merge cloud with local: for each key, take the one with higher updatedAt
        const merged: CredentialsMap = { ...this.inMemoryMap };
        for (const [key, cloudCred] of Object.entries(cloudMap)) {
          const localCred = merged[key];
          if (!localCred || (cloudCred.updatedAt || 0) >= (localCred.updatedAt || 0)) {
            merged[key] = cloudCred;
          }
        }
        this.saveToLocalStorage(merged);
        return merged;
      }
    } catch (e) {
      console.warn('Auth vault cloud syncDown error:', e);
    } finally {
      this.isSyncing = false;
    }
    return this.inMemoryMap;
  }

  /**
   * Push an updated credential to Supabase cloud vault
   */
  public async saveCredential(
    user: User,
    password?: string,
    mustChange?: boolean
  ): Promise<void> {
    const map = { ...this.loadFromLocalStorage() };
    const cleanPass = password?.trim();
    const timestamp = Date.now();

    const cred: StoredCredential = {
      customPassword: cleanPass,
      mustChangePassword: mustChange ?? false,
      updatedAt: timestamp,
    };

    const keysToUpdate: string[] = [];
    if (user.id) keysToUpdate.push(user.id.trim().toLowerCase());
    if (user.email) keysToUpdate.push(user.email.trim().toLowerCase());
    if (user.studentNumber) keysToUpdate.push(user.studentNumber.trim().toLowerCase());

    for (const key of keysToUpdate) {
      map[key] = cred;
    }

    // 1. Immediately update localStorage for instant local responsiveness
    this.saveToLocalStorage(map);

    // 2. Push to Supabase Cloud Vault
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('grading_matrix_templates').upsert({
          id: AUTH_VAULT_RECORD_ID,
          name: 'System Auth Vault',
          description: 'Internal credentials sync',
          is_default: false,
          passing_grade: 0,
          matrix: map,
        });

        // 3. Also update the user record directly (using department/title metadata as portable fallback)
        if (user.id) {
          const updatePayload: Record<string, any> = {};
          if (cleanPass) {
            updatePayload.department = JSON.stringify({
              customPassword: cleanPass,
              mustChangePassword: mustChange ?? false,
            });
          }
          if (Object.keys(updatePayload).length > 0 && user.role === 'student') {
            await supabase.from('users').update(updatePayload).eq('id', user.id);
          }
        }
      } catch (err) {
        console.warn('Failed to push credential to cloud auth vault:', err);
      }
    }
  }

  /**
   * Retrieve a stored credential for an identifier (ID, email, or student number)
   */
  public getCredential(identifier?: string): StoredCredential | null {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    
    // Check in-memory / local storage
    if (this.inMemoryMap[cleanId]) {
      return this.inMemoryMap[cleanId];
    }

    // Reload from local storage
    const fresh = this.loadFromLocalStorage();
    return fresh[cleanId] || null;
  }

  /**
   * Direct fetch from cloud for a specific identifier if missing locally
   */
  public async fetchCredentialFromCloud(identifier?: string): Promise<StoredCredential | null> {
    if (!identifier) return null;
    const cleanId = identifier.trim().toLowerCase();
    
    // Try syncing down all
    const map = await this.syncDown();
    return map[cleanId] || null;
  }
}

export const authVault = new AuthVaultService();
