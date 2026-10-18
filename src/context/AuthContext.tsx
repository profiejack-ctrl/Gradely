import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { INITIAL_USERS } from '../data/initialData';
import { User, UserRole } from '../types';
import { authApi, clearToken, hasSession, setToken } from '../services/apiClient';
import { syncEngine } from '../services/apiSyncEngine';

export interface SignUpParams {
  email: string;
  password?: string;
  name: string;
  role: UserRole;
  studentNumber?: string;
  sectionId?: string;
  department?: string;
  title?: string;
  avatar?: string;
}

export interface StoredCredential { mustChangePassword?: boolean; }
export const USERS_STORAGE_KEY = 'gradely_data_store_v3_users';
export const CURRENT_USER_KEY = 'gradely_current_user_v2';
export const CREDENTIALS_STORAGE_KEY = 'gradely_auth_credentials_v2';

// Compatibility exports. Passwords are never persisted in the browser.
export const getStoredCredential = (_identifier?: string): StoredCredential | null => null;
export const saveStoredCredential = async (_user: User, _password?: string, _mustChange?: boolean): Promise<void> => {};

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isTeacher: boolean;
  isDean: boolean;
  isStudent: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signIn: (identifier: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateStudentPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  sendEmailOtp: (email: string) => Promise<{ success: boolean; message?: string; devOtp?: string; error?: string }>;
  completeStudentOnboarding: (newPassword: string, email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>, newPassword?: string, currentPassword?: string) => Promise<{ success: boolean; error?: string }>;
  verifyCurrentPassword: (candidatePassword: string) => Promise<boolean>;
  quickLogin: (userOrId: User | string) => void;
  switchUser: (user: User) => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_USER_CACHE_KEY = 'gradely_session_user_cache_v1';

function loadCachedSessionUser(): User | null {
  try {
    if (!hasSession()) return null;
    const raw = sessionStorage.getItem(SESSION_USER_CACHE_KEY) || localStorage.getItem(SESSION_USER_CACHE_KEY);
    return raw ? safeUser(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function saveCachedSessionUser(user: User | null): void {
  try {
    if (user) {
      const serialized = JSON.stringify(safeUser(user));
      sessionStorage.setItem(SESSION_USER_CACHE_KEY, serialized);
      localStorage.setItem(SESSION_USER_CACHE_KEY, serialized);
    } else {
      sessionStorage.removeItem(SESSION_USER_CACHE_KEY);
      localStorage.removeItem(SESSION_USER_CACHE_KEY);
    }
  } catch {
    // Ignore storage quota limits
  }
}

function clearSensitiveCache() {
  saveCachedSessionUser(null);
  for (let i = localStorage.length - 1; i >= 0; i -= 1) {
    const key = localStorage.key(i);
    if (key?.startsWith('gradely_data_store_v3_') || key === 'gradely_offline_api_queue_v1') {
      localStorage.removeItem(key);
    }
  }
}

function safeUser(user: User): User {
  return { ...user };
}

function loadCachedUsers(): User[] {
  try {
    const saved = localStorage.getItem(USERS_STORAGE_KEY);
    const users = saved ? JSON.parse(saved) : INITIAL_USERS;
    return Array.isArray(users) ? users.map(safeUser) : [];
  } catch {
    return INITIAL_USERS.map(safeUser);
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(loadCachedUsers);
  const cachedInitialUser = React.useMemo(() => loadCachedSessionUser(), []);
  const [currentUser, setCurrentUser] = useState<User | null>(cachedInitialUser);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedInitialUser && hasSession());
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('gradely_theme') === 'dark' ? 'dark' : 'light');

  const refreshUsers = useCallback(() => setUsers(loadCachedUsers()), []);

  useEffect(() => {
    let mounted = true;
    const restoreSession = async () => {
      if (!hasSession()) {
        saveCachedSessionUser(null);
        if (mounted) setIsLoading(false);
        return;
      }
      const response = await authApi.me();
      if (mounted && response.data) {
        const validated = safeUser(response.data as User);
        setCurrentUser(validated);
        saveCachedSessionUser(validated);
      } else if (response.status === 401) {
        clearToken();
        saveCachedSessionUser(null);
        if (mounted) setCurrentUser(null);
      }
      if (mounted) setIsLoading(false);
    };
    void restoreSession();
    const handleUnauthorized = () => {
      saveCachedSessionUser(null);
      setCurrentUser(null);
    };
    window.addEventListener('gradely:auth_unauthorized', handleUnauthorized);
    return () => {
      mounted = false;
      window.removeEventListener('gradely:auth_unauthorized', handleUnauthorized);
    };
  }, []);

  useEffect(() => {
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(CREDENTIALS_STORAGE_KEY);
    localStorage.removeItem('aurasms_auth_credentials_v2');
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('gradely_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = () => setTheme(value => value === 'light' ? 'dark' : 'light');

  const signIn = async (identifier: string, password?: string) => {
    setIsLoading(true);
    if (!identifier.trim() || !password?.trim()) {
      setIsLoading(false);
      return { success: false, error: 'Student ID / Email and password are required.' };
    }
    const response = await authApi.login(identifier.trim(), password.trim());
    if (response.error || !response.data) {
      setIsLoading(false);
      return { success: false, error: response.error || 'Invalid Student ID / Email or password.' };
    }
    const result = response.data as { token: string; user: User };
    setToken(result.token);
    const user = safeUser(result.user);
    saveCachedSessionUser(user);
    setCurrentUser(user);
    setUsers(previous => [...previous.filter(item => item.id !== user.id), user]);
    setIsLoading(false);
    void syncEngine.flushQueue();
    return { success: true };
  };

  const signUp = async (params: SignUpParams) => {
    setIsLoading(true);
    if (!params.password || params.password.length < 8) {
      setIsLoading(false);
      return { success: false, error: 'Password must be at least 8 characters.' };
    }
    const response = await authApi.register(params);
    if (response.error || !response.data) {
      setIsLoading(false);
      return { success: false, error: response.error || 'Registration failed.' };
    }
    const result = response.data as { token: string; user: User };
    setToken(result.token);
    const user = safeUser(result.user);
    saveCachedSessionUser(user);
    setCurrentUser(user);
    setUsers(previous => [...previous.filter(item => item.id !== user.id), user]);
    setIsLoading(false);
    return { success: true };
  };

  const updateStudentPassword = async (newPassword: string) => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };
    if (newPassword.trim().length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
    const response = await authApi.changePassword(newPassword.trim());
    if (response.error) return { success: false, error: response.error };
    const updated = { ...currentUser, mustChangePassword: false };
    saveCachedSessionUser(updated);
    setCurrentUser(updated);
    return { success: true };
  };

  const sendEmailOtp = async (email: string) => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    const response = await authApi.sendEmailOtp(email.trim().toLowerCase());
    if (response.error || !response.data) {
      return { success: false, error: response.error || 'Failed to send verification code.' };
    }
    return {
      success: true,
      message: response.data.message,
      devOtp: response.data.devOtp,
    };
  };

  const completeStudentOnboarding = async (newPassword: string, email: string, otp: string) => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };
    if (newPassword.trim().length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      return { success: false, error: 'A 6-digit verification code is required.' };
    }

    const response = await authApi.completeStudentOnboarding({
      newPassword: newPassword.trim(),
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });

    if (response.error || !response.data) {
      return { success: false, error: response.error || 'Failed to complete account activation.' };
    }

    const result = response.data as { token: string; user: User };
    if (result.token) setToken(result.token);
    const updated = safeUser(result.user);
    saveCachedSessionUser(updated);
    setCurrentUser(updated);
    setUsers(previous => [...previous.filter(item => item.id !== updated.id), updated]);
    void syncEngine.flushQueue();
    return { success: true };
  };

  const verifyCurrentPassword = async (candidatePassword: string) => {
    if (!candidatePassword.trim()) return false;
    const response = await authApi.verifyPassword(candidatePassword.trim());
    return response.data?.valid === true;
  };

  const updateProfile = async (data: Partial<User>, newPassword?: string, currentPassword?: string) => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };
    if (newPassword) {
      if (newPassword.trim().length < 8) return { success: false, error: 'Password must be at least 8 characters.' };
      if (!currentPassword || !(await verifyCurrentPassword(currentPassword))) return { success: false, error: 'Incorrect current password.' };
    }
    const response = await authApi.updateProfile({ ...data, ...(newPassword ? { newPassword: newPassword.trim() } : {}) });
    if (response.error) return { success: false, error: response.error };
    const updated = { ...currentUser, ...safeUser({ ...currentUser, ...data }), mustChangePassword: newPassword ? false : currentUser.mustChangePassword };
    saveCachedSessionUser(updated);
    setCurrentUser(updated);
    return { success: true };
  };

  const signOut = async () => {
    await authApi.logout();
    clearToken();
    saveCachedSessionUser(null);
    clearSensitiveCache();
    setCurrentUser(null);
    setIsLoading(false);
  };

  // Demo impersonation is intentionally disabled in the secured build.
  const quickLogin = (_userOrId: User | string) => {};
  const switchUser = (_user: User) => {};

  const isDean = currentUser?.role === 'dean';
  const isTeacher = currentUser?.role === 'teacher' || isDean;
  const isStudent = currentUser?.role === 'student';

  return (
    <AuthContext.Provider value={{
      currentUser,
      users,
      isTeacher,
      isDean,
      isStudent,
      isLoading,
      theme,
      toggleTheme,
      signIn,
      signUp,
      signOut,
      updateStudentPassword,
      sendEmailOtp,
      completeStudentOnboarding,
      updateProfile,
      verifyCurrentPassword,
      quickLogin,
      switchUser,
      refreshUsers,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
