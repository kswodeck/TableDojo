'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AuthResponse, LoginBonus, User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  bonus: LoginBonus | null;
  login: (username: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Applies a fresh coin balance returned by a game endpoint. */
  setCoins: (coins: number) => void;
  refresh: () => Promise<void>;
  dismissBonus: () => void;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  birthday?: string;
  profileImage?: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [bonus, setBonus] = useState<LoginBonus | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await api.get<{ user: User | null }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const data = await api.post<AuthResponse>('/api/auth/login', { username, password });
    setUser(data.user);
    setBonus(data.bonus);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const data = await api.post<AuthResponse>('/api/auth/register', input);
    setUser(data.user);
    setBonus(data.bonus);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/api/auth/logout');
    setUser(null);
    setBonus(null);
  }, []);

  // Games return the authoritative balance with every response, so the header
  // stays in step without refetching the whole profile.
  const setCoins = useCallback((coins: number) => {
    setUser((current) => (current ? { ...current, coins } : current));
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, loading, bonus, login, register, logout, setCoins, refresh, dismissBonus: () => setBonus(null) }),
    [user, loading, bonus, login, register, logout, setCoins, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider');
  return context;
}
