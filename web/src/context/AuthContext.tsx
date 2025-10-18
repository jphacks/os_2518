"use client";

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';

import { ApiError } from '@/lib/api/client';
import { getCurrentUser, login as loginApi, logout as logoutApi, registerUser } from '@/lib/api/auth';
import { User } from '@/types/domain';
import { SessionTokens } from '@/types/session';

type AuthContextValue = {
  user: User | null;
  tokens: SessionTokens | null;
  loading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: {
    displayName: string;
    email: string;
    password: string;
    nativeLanguageCode: string;
    targetLanguages: Array<{ languageCode: string; level: number }>;
    hobby?: string;
    skill?: string;
    comment?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setUser: Dispatch<SetStateAction<User | null>>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<SessionTokens | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const response = await getCurrentUser();
        if (!active) {
          return;
        }
        setUser(response.user);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const handleLogin: AuthContextValue['login'] = async (payload) => {
    const response = await loginApi(payload);
    setUser(response.user);
    setTokens(response.tokens);
  };

  const handleRegister: AuthContextValue['register'] = async (payload) => {
    const response = await registerUser(payload);
    setUser(response.user);
    setTokens(response.tokens);
  };

  const handleLogout: AuthContextValue['logout'] = async () => {
    await logoutApi();
    setUser(null);
    setTokens(null);
  };

  const value = useMemo<AuthContextValue>(() => ({
    user,
    tokens,
    loading,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
    setUser,
  }), [user, tokens, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
