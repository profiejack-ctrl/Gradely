import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { syncEngine } from '../services/syncEngine';
import { authVault, StoredCredential, CREDENTIALS_STORAGE_KEY } from '../services/authVault';
import { formatSectionIds } from '../utils/enrollmentUtils';

export { CREDENTIALS_STORAGE_KEY };
export type { StoredCredential };

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

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  isTeacher: boolean;
  isDean: boolean;
  isStudent: boolean;
  isLoading: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  signIn: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (params: SignUpParams) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateStudentPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (data: Partial<User>, newPassword?: string) => Promise<{ success: boolean; error?: string }>;
  quickLogin: (userOrId: User | string) => void;
  switchUser: (user: User) => void;
  refreshUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const USERS_STORAGE_KEY = 'aurasms_data_store_v3_users';
export const CURRENT_USER_KEY = 'aurasms_current_user_v2';

export const getStoredCredential = (identifier?: string): StoredCredential | null => {
  return authVault.getCredential(identifier);
};

export const saveStoredCredential = async (user: User, password?: string, mustChange?: boolean): Promise<void> => {
  await authVault.saveCredential(user, password, mustChange);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(CURRENT_USER_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {}
    return null; // Will show AuthPage when null
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('aurasms_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  // Reload local cached users
  const refreshUsers = useCallback(() => {
    try {
      const saved = localStorage.getItem(USERS_STORAGE_KEY);
      if (saved) {
        setUsers(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to refresh users cache', e);
    }
  }, []);

  // Listen to Supabase Auth State & initialize session
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      setIsLoading(true);
      await authVault.syncDown();
      if (isSupabaseConfigured && supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user && mounted) {
            // Find user in Supabase table
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('email', session.user.email)
              .maybeSingle();

            if (profile) {
              const cred =
                getStoredCredential(profile.id) ||
                (profile.email ? getStoredCredential(profile.email) : null) ||
                (profile.student_number ? getStoredCredential(profile.student_number) : null);

              const matchedUser: User = {
                id: profile.id,
                name: profile.name,
                email: profile.email,
                role: profile.role,
                avatar: profile.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
                studentNumber: profile.student_number || undefined,
                sectionId: profile.section_id || undefined,
                department: profile.department || undefined,
                title: profile.title || undefined,
                customPassword: cred?.customPassword,
                mustChangePassword: cred ? cred.mustChangePassword : (profile.role === 'student'),
              };
              setCurrentUser(matchedUser);
            }
          }
        } catch (err) {
          console.warn('Supabase auth session check offline or skipped:', err);
        }
      }
      if (mounted) {
        setIsLoading(false);
      }
    };

    initAuth();

    // Realtime auth listener
    let authSubscription: any = null;
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      const { data } = client.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        } else if (session?.user && event === 'SIGNED_IN') {
          const { data: profile } = await client
            .from('users')
            .select('*')
            .eq('email', session.user.email)
            .maybeSingle();

          if (profile) {
            const cred =
              getStoredCredential(profile.id) ||
              (profile.email ? getStoredCredential(profile.email) : null) ||
              (profile.student_number ? getStoredCredential(profile.student_number) : null);

            setCurrentUser({
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              avatar: profile.avatar || `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
              studentNumber: profile.student_number || undefined,
              sectionId: profile.section_id || undefined,
              department: profile.department || undefined,
              title: profile.title || undefined,
              customPassword: cred?.customPassword,
              mustChangePassword: cred ? cred.mustChangePassword : (profile.role === 'student'),
            });
          }
        }
      });
      authSubscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Sync active user to local storage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, [currentUser]);

  // Theme synchronization
  useEffect(() => {
    localStorage.setItem('aurasms_theme', theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  /**
   * Update student password on first-time login
   */
  const updateStudentPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };

    const cleanPass = newPassword.trim();
    if (cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const updatedUser: User = {
      ...currentUser,
      mustChangePassword: false,
      customPassword: cleanPass,
    };

    // Save to dedicated persistent credentials store
    await saveStoredCredential(updatedUser, cleanPass, false);

    // 1. Update current session state & local storage
    setCurrentUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // 2. Update users cache in local storage
    setUsers((prev) => {
      const copy = prev.map((u) => (u.id === currentUser.id ? updatedUser : u));
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(copy));
      } catch (e) {}
      return copy;
    });

    // 3. Enqueue to Supabase table with encoded credential fallback
    syncEngine.enqueue('users', 'UPSERT', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      student_number: updatedUser.studentNumber || null,
      section_id: formatSectionIds(updatedUser.sectionIds || (updatedUser.sectionId ? [updatedUser.sectionId] : [])) || null,
      avatar: updatedUser.avatar || null,
      department: JSON.stringify({ customPassword: cleanPass, mustChangePassword: false }),
      title: updatedUser.title || null,
    });

    // 4. Update Supabase Auth if online
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: cleanPass });
      } catch (err) {
        console.warn('Supabase auth password update skipped or local only:', err);
      }
    }

    return { success: true };
  };

  /**
   * Update User Profile (Faculty or Student)
   */
  const updateProfile = async (
    data: Partial<User>,
    newPassword?: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!currentUser) return { success: false, error: 'No user is currently signed in.' };

    const cleanPass = newPassword ? newPassword.trim() : undefined;
    if (cleanPass && cleanPass.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const finalPass = cleanPass || currentUser.customPassword;
    const mustChange = cleanPass ? false : currentUser.mustChangePassword;

    const updatedUser: User = {
      ...currentUser,
      ...data,
      customPassword: finalPass,
      mustChangePassword: mustChange,
    };

    // Save to dedicated persistent credentials store
    if (finalPass) {
      saveStoredCredential(updatedUser, finalPass, mustChange);
    }

    // 1. Update current session state & local storage
    setCurrentUser(updatedUser);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));

    // 2. Update in cached users list
    setUsers((prev) => {
      const copy = prev.map((u) => (u.id === currentUser.id ? updatedUser : u));
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(copy));
      } catch (e) {}
      return copy;
    });

    // 3. Enqueue to Supabase table
    syncEngine.enqueue('users', 'UPSERT', {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      student_number: updatedUser.studentNumber || null,
      section_id: updatedUser.sectionId || null,
      avatar: updatedUser.avatar || null,
      department: updatedUser.department || null,
      title: updatedUser.title || null,
    });

    // 4. Update Supabase Auth if online and password provided
    if (cleanPass && isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.updateUser({ password: cleanPass });
      } catch (err) {
        console.warn('Supabase auth password update error:', err);
      }
    }

    return { success: true };
  };

  /**
   * Sign In with Email or Student ID Number & Password (with Cloud & Local support)
   */
  const signIn = async (identifier: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const rawId = (identifier || '').trim();
    const cleanId = rawId.toLowerCase();
    const cleanPassword = (password || '').trim();

    if (!cleanId) {
      setIsLoading(false);
      return { success: false, error: 'Please enter your Student ID, Email, or Full Name.' };
    }

    // Always sync down latest cloud credentials first so updates made on production/mobile are immediately recognized
    await authVault.syncDown();

    // 1. Get cached local users
    const localUsers: User[] = (() => {
      try {
        const saved = localStorage.getItem(USERS_STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];
        // Merge with INITIAL_USERS to ensure demo/seed users are always available
        const merged = [...parsed];
        for (const initU of INITIAL_USERS) {
          if (!merged.some((u: User) => u.id === initU.id || u.email.toLowerCase() === initU.email.toLowerCase())) {
            merged.push(initU);
          }
        }
        return merged;
      } catch {
        return INITIAL_USERS;
      }
    })();

    // 2. Search in local users
    let matchedUser = localUsers.find(
      (u) =>
        u.id?.toLowerCase() === cleanId ||
        u.email?.toLowerCase() === cleanId ||
        (u.studentNumber && u.studentNumber.toLowerCase() === cleanId) ||
        u.name?.toLowerCase() === cleanId ||
        (u.name && (u.name.toLowerCase().includes(cleanId) || cleanId.includes(u.name.toLowerCase())))
    );

    // 3. Search in Supabase if online (using safe individual queries to prevent PostgREST dot/syntax errors)
    if (isSupabaseConfigured && supabase) {
      try {
        let cloudProfile: any = null;

        // Try lookup by email if contains @
        if (cleanId.includes('@')) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .ilike('email', cleanId)
            .maybeSingle();
          if (data) cloudProfile = data;
        }

        // Try lookup by student_number
        if (!cloudProfile) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('student_number', rawId)
            .maybeSingle();
          if (data) cloudProfile = data;
        }

        // Try lookup by id
        if (!cloudProfile) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .eq('id', rawId)
            .maybeSingle();
          if (data) cloudProfile = data;
        }

        // Try lookup by name
        if (!cloudProfile) {
          const { data } = await supabase
            .from('users')
            .select('*')
            .ilike('name', rawId)
            .maybeSingle();
          if (data) cloudProfile = data;
        }

        if (cloudProfile) {
          let embeddedCred: StoredCredential | null = null;
          if (cloudProfile.department && cloudProfile.department.startsWith('{')) {
            try {
              embeddedCred = JSON.parse(cloudProfile.department);
            } catch (e) {}
          }

          const cred =
            authVault.getCredential(cloudProfile.id) ||
            (cloudProfile.email ? authVault.getCredential(cloudProfile.email) : null) ||
            (cloudProfile.student_number ? authVault.getCredential(cloudProfile.student_number) : null) ||
            embeddedCred;

          const mappedCloudUser: User = {
            id: cloudProfile.id,
            name: cloudProfile.name,
            email: cloudProfile.email,
            role: (cloudProfile.role as UserRole) || (cloudProfile.student_number ? 'student' : 'teacher'),
            avatar:
              cloudProfile.avatar ||
              `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cloudProfile.name)}`,
            studentNumber: cloudProfile.student_number || undefined,
            sectionId: cloudProfile.section_id || undefined,
            department: (embeddedCred && cloudProfile.role === 'student') ? undefined : cloudProfile.department || undefined,
            title: cloudProfile.title || undefined,
            mustChangePassword:
              cred ? Boolean(cred.mustChangePassword) : cloudProfile.role === 'student',
            customPassword: cred?.customPassword,
          };

          matchedUser = matchedUser
            ? { ...matchedUser, ...mappedCloudUser, customPassword: cred?.customPassword ?? matchedUser.customPassword, mustChangePassword: cred?.mustChangePassword ?? matchedUser.mustChangePassword }
            : mappedCloudUser;
        }
      } catch (err: any) {
        console.warn('Supabase cloud profile query error:', err);
      }
    }

    // 4. If user not found, try Supabase Auth direct sign in if email + password provided
    if (!matchedUser && isSupabaseConfigured && supabase && cleanId.includes('@') && cleanPassword) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
          email: cleanId,
          password: cleanPassword,
        });
        if (!authErr && authData?.user) {
          const u = authData.user;
          matchedUser = {
            id: u.id,
            name: u.user_metadata?.name || u.email?.split('@')[0] || 'User',
            email: u.email || cleanId,
            role: (u.user_metadata?.role as UserRole) || 'teacher',
            avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email || 'user')}`,
            studentNumber: u.user_metadata?.studentNumber || undefined,
            sectionId: u.user_metadata?.sectionId || undefined,
          };
        }
      } catch (e) {
        console.warn('Supabase direct auth login check error:', e);
      }
    }

    // If still no account found
    if (!matchedUser) {
      setIsLoading(false);
      return {
        success: false,
        error: `No account found matching "${rawId}". Please verify your Student ID, Email, or Full Name.`,
      };
    }

    const userObj: User = { ...matchedUser };

    // Retrieve from dedicated persistent credentials store
    const storedCred =
      getStoredCredential(userObj.id) ||
      (userObj.email ? getStoredCredential(userObj.email) : null) ||
      (userObj.studentNumber ? getStoredCredential(userObj.studentNumber) : null);

    if (storedCred) {
      if (storedCred.customPassword) {
        userObj.customPassword = storedCred.customPassword;
      }
      if (typeof storedCred.mustChangePassword === 'boolean') {
        userObj.mustChangePassword = storedCred.mustChangePassword;
      }
    }

    // 5. Verify Student credentials
    if (userObj.role === 'student') {
      // Student already set a custom password
      if (userObj.customPassword) {
        if (cleanPassword === userObj.customPassword) {
          userObj.mustChangePassword = false;
        } else if (cleanPassword === userObj.studentNumber || cleanPassword === 'student123') {
          setIsLoading(false);
          return {
            success: false,
            error: 'Temporary password expired. Please sign in using your updated custom password.',
          };
        } else if (!cleanPassword) {
          setIsLoading(false);
          return {
            success: false,
            error: 'Password is required for student login.',
          };
        } else {
          setIsLoading(false);
          return {
            success: false,
            error: 'Incorrect password for this student account.',
          };
        }
      } else {
        // First-time student login (temporary password is Student ID or empty or student123)
        const isTempMatch =
          !cleanPassword ||
          cleanPassword === userObj.studentNumber ||
          cleanPassword === rawId ||
          cleanPassword === 'student123' ||
          cleanPassword === 'password';

        if (isTempMatch) {
          userObj.mustChangePassword = true;
        } else {
          setIsLoading(false);
          return {
            success: false,
            error: `Invalid password. For first-time student login, use your Student ID (${userObj.studentNumber || 'Student ID'}) as your temporary password.`,
          };
        }
      }
    }

    // 6. Verify Faculty / Teacher / Dean credentials
    if (userObj.role === 'teacher' || userObj.role === 'dean') {
      let isTeacherAuthSuccess = false;

      // Check custom password if set
      if (userObj.customPassword && cleanPassword === userObj.customPassword) {
        isTeacherAuthSuccess = true;
      }

      // Check Supabase Auth if online and password given
      if (!isTeacherAuthSuccess && isSupabaseConfigured && supabase && cleanPassword) {
        try {
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: userObj.email,
            password: cleanPassword,
          });
          if (!authError && authData?.user) {
            isTeacherAuthSuccess = true;
          }
        } catch (e) {
          console.warn('Supabase auth check bypassed:', e);
        }
      }

      // Allow standard default / demo credentials for faculty
      if (
        !isTeacherAuthSuccess &&
        (!cleanPassword ||
          cleanPassword === 'teacher123' ||
          cleanPassword === 'admin123' ||
          cleanPassword === 'admin' ||
          cleanPassword === 'password' ||
          cleanPassword === 'faculty123' ||
          cleanPassword === userObj.email ||
          cleanPassword.toLowerCase() === userObj.name.toLowerCase())
      ) {
        isTeacherAuthSuccess = true;
      }

      if (!isTeacherAuthSuccess) {
        setIsLoading(false);
        return {
          success: false,
          error: 'Incorrect password for faculty account. Default initial password is "teacher123".',
        };
      }
    }

    // 7. Save authenticated user session and persist to local cache
    setCurrentUser(userObj);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userObj));

    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.id !== userObj.id && u.email.toLowerCase() !== userObj.email.toLowerCase()
      );
      const updated = [...filtered, userObj];
      try {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setIsLoading(false);
    return { success: true };
  };

  /**
   * Sign Up new Instructor or Student
   */
  const signUp = async (params: SignUpParams): Promise<{ success: boolean; error?: string }> => {
    setIsLoading(true);
    const cleanEmail = params.email.trim().toLowerCase();
    const newId = `${params.role === 'teacher' ? 'teacher' : 'stud'}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 3)}`;

    const newUser: User = {
      id: newId,
      name: params.name.trim(),
      email: cleanEmail,
      role: params.role,
      avatar:
        params.avatar ||
        (params.role === 'teacher'
          ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80'),
      studentNumber: params.studentNumber?.trim() || undefined,
      sectionId: params.sectionId || undefined,
      department: params.department?.trim() || undefined,
      title: params.title?.trim() || undefined,
    };

    // 1. Try Supabase Auth registration if online
    if (isSupabaseConfigured && supabase && params.password) {
      try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              name: newUser.name,
              role: newUser.role,
            },
          },
        });

        if (authError && !authError.message.includes('already registered')) {
          console.warn('Supabase Auth error:', authError.message);
        }

        // Upsert into Supabase public users table
        const profileId = authData?.user?.id || newId;
        newUser.id = profileId;

        await supabase.from('users').upsert(
          {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            student_number: newUser.studentNumber || null,
            section_id: newUser.sectionId || null,
            avatar: newUser.avatar,
            department: newUser.department || null,
            title: newUser.title || null,
          },
          { onConflict: 'email' }
        );
      } catch (err: any) {
        console.warn('Supabase signup network error, registering locally:', err);
      }
    }

    // 2. Save locally
    try {
      const currentUsers: User[] = (() => {
        const saved = localStorage.getItem(USERS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : INITIAL_USERS;
      })();

      const filtered = currentUsers.filter((u) => u.email.toLowerCase() !== cleanEmail);
      const updated = [...filtered, newUser];
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      setUsers(updated);
    } catch (e) {
      console.error('Failed to save user to local storage', e);
    }

    setCurrentUser(newUser);
    setIsLoading(false);
    return { success: true };
  };

  /**
   * Sign Out
   */
  const signOut = async () => {
    setIsLoading(true);
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase sign-out network error:', e);
      }
    }
    setCurrentUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    setIsLoading(false);
  };

  /**
   * Fast Demo Login Switcher
   */
  const quickLogin = (userOrId: User | string) => {
    let target: User | undefined;
    if (typeof userOrId === 'string') {
      target = users.find((u) => u.id === userOrId);
    } else {
      target = userOrId;
    }
    if (target) {
      setCurrentUser(target);
      try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(target));
      } catch (e) {}
    }
  };

  const switchUser = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (e) {}
  };

  const isDean = Boolean(
    currentUser?.role === 'dean' ||
    currentUser?.email === 'profiejack@gmail.com' ||
    (currentUser?.role === 'teacher' && (
      (currentUser?.title || '').toLowerCase().includes('chair') ||
      (currentUser?.title || '').toLowerCase().includes('dean') ||
      (currentUser?.title || '').toLowerCase().includes('head')
    ))
  );

  const isTeacher = currentUser?.role === 'teacher' || currentUser?.role === 'dean';
  const isStudent = currentUser?.role === 'student';

  return (
    <AuthContext.Provider
      value={{
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
        updateProfile,
        quickLogin,
        switchUser,
        refreshUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
