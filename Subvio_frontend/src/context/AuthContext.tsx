import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, tokenStore } from '@/lib/api';
import type { User } from '@/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isStaff: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
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
    async (request: Promise<{ token: string }>) => {
      const { token } = await request;
      tokenStore.set(token);
      queryClient.clear();
      await refresh();
    },
    [queryClient, refresh],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isStaff: user?.role === 'ADMIN' || user?.role === 'STAFF',
      isAdmin: user?.role === 'ADMIN',
      login: (email, password) => startSession(api.post('/auth/login', { email, password })),
      signup: (name, email, password) => startSession(api.post('/auth/signup', { name, email, password })),
      loginWithGoogle: async () => {
        const { googleIdToken } = await import('@/lib/firebase');
        await startSession(api.post('/auth/google', { idToken: await googleIdToken() }));
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
