import {createContext, useContext} from 'react';

export type User = {
  id: string;
  username: string;
  level: number;
  xp: number;
  selectedTitleId: string;
  gold: number;
  diamonds: number;
  unreadMessages: number;
  unreadNotifications: number;
};

export type Auth = {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string, passwordRepeat: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  patch: (patch: Partial<User>) => void;
};

export const AuthContext = createContext<Auth>(null as never);

type ApiError = {error?: string};

export async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch('/api' + path, {
    ...init,
    headers: {'Content-Type': 'application/json', ...(init?.headers || {})},
    credentials: 'include',
  });
  const body = await response.json().catch((): ApiError => ({})) as ApiError;
  if (!response.ok) throw new Error(body.error || 'İşlem başarısız.');
  return body as T;
}

export const useAuth = () => useContext(AuthContext);
