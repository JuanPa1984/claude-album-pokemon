'use client';

import type { AuthResponseDto, UserDto } from '@album-pokemon/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, ApiError, tokenStorage } from './api';

interface AuthContextValue {
  user: UserDto | null;
  /** True until the stored session (if any) has been checked. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStorage.get()) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch((error) => {
        if (error instanceof ApiError && error.status === 401) tokenStorage.clear();
      })
      .finally(() => setLoading(false));
  }, []);

  const startSession = useCallback(({ accessToken, user }: AuthResponseDto) => {
    tokenStorage.set(accessToken);
    setUser(user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login: async (email, password) => startSession(await api.login({ email, password })),
      register: async (email, username, password) =>
        startSession(await api.register({ email, username, password })),
      logout: () => {
        tokenStorage.clear();
        setUser(null);
      },
    }),
    [user, loading, startSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
