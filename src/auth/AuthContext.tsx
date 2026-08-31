import {ReactNode, useCallback, useEffect, useState} from 'react';
import {api, AuthContext, User} from './auth';

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { setUser((await api<{user: User}>('/me')).user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const patch = (next: Partial<User>) => setUser(current => current ? {...current, ...next} : current);
  return <AuthContext.Provider value={{
    user,
    loading,
    refresh,
    patch,
    login: async (username, password) => {
      const next = (await api<{user: User}>('/login', {method: 'POST', body: JSON.stringify({username, password})})).user;
      setUser(next);
      return next;
    },
    register: async (username, password, passwordRepeat) => {
      const next = (await api<{user: User}>('/register', {method: 'POST', body: JSON.stringify({username, password, passwordRepeat})})).user;
      setUser(next);
      return next;
    },
    logout: async () => {
      await api('/logout', {method: 'POST'});
      setUser(null);
    },
  }}>{children}</AuthContext.Provider>;
}
