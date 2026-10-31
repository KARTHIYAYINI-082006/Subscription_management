import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';
import type { Role, User } from '@/types';

/** Auth endpoints either start a session (token) or report that the account awaits admin approval (message). */
type AuthResponse = { token?: string; pending?: boolean; message?: string };

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (email: string, password: string, role: Role) => Promise<void>;
  /** Resolves to an approval message when the new account must be activated by an admin first. */
  signup: (name: string, email: string, password: string, role: Role) => Promise<string | null>;
  loginWithGoogle: (role: Role) => Promise<string | null>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(Boolean(tokenStore.get()));
  const queryClient = useQueryClient();

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return setUser(null);
    try {
      setUser(await api.get<User>('/auth/me'));
    } catch {
      tokenStore.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const onExpired = () => setUser(null);
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [refresh]);

  const startSession = useCallback(
    async (request: Promise<AuthResponse>) => {
      const { token, message } = await request;
      if (!token) return message ?? 'Your account is waiting for admin approval.';
      tokenStore.set(token);
      queryClient.clear();
      await refresh();
      return null;
    },
    [queryClient, refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF',
      isAdmin: user?.role === 'ADMIN',
      login: async (email, password, role) => {
        await startSession(api.post('/auth/login', { email, password, role }));
      },
      signup: (name, email, password, role) => startSession(api.post('/auth/signup', { name, email, password, role })),
      loginWithGoogle: async (role) => {
        const { googleIdToken } = await import('@/lib/firebase');
        return startSession(api.post('/auth/google', { idToken: await googleIdToken(), role }));
      },
      logout: () => {
        tokenStore.clear();
        queryClient.clear();
        setUser(null);
      },
      refresh,
    }),
    [user, loading, startSession, queryClient, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
