'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AuthUser, AuthTokens, LoginCredentials } from '@/types/auth';
import { login as apiLogin, logout as apiLogout } from '@/lib/api/auth';

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // ページロード時にlocalStorageからトークンを復元
    const token = localStorage.getItem('accessToken');
    if (token) {
      // TODO: トークンからユーザー情報をデコード
      setUser({ id: '', email: '', role: '' });
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const tokens: AuthTokens = await apiLogin(credentials);
    localStorage.setItem('accessToken', tokens.accessToken);
    localStorage.setItem('refreshToken', tokens.refreshToken);
    // TODO: トークンをデコードしてユーザー情報をセット
    setUser({ id: 'user-1', email: credentials.email, role: 'user' });
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth は AuthProvider 内で使用してください');
  }
  return context;
}
