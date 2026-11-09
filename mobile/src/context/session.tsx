import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ApiError, type Tokens } from '../lib/api-client';
import type { User } from '../lib/types';

interface SessionContextValue { user: User | null; loading: boolean; error: string; login(email: string, password: string): Promise<void>; register(values: { email: string; password: string; fullName: string; phone?: string }): Promise<void>; logout(): Promise<void>; reload(): Promise<void> }
const SessionContext = createContext<SessionContextValue | null>(null);

async function readProfile(): Promise<User | null> {
  if (!await api.session()) return null;
  const profile = await api.request<User>('/auth/me');
  return await api.session() ? profile : null;
}

export function SessionProvider({ children }: React.PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const profile = await readProfile();
      setError('');
      setUser(profile);
    } catch (failure) {
      if (failure instanceof ApiError && [401, 403].includes(failure.status)) { await api.setSession(null); setUser(null); }
      else setError(failure instanceof Error ? failure.message : 'Không tải được tài khoản.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    const unsubscribe = api.subscribe(value => { if (active && !value) setUser(null); });
    readProfile().then(profile => { if (active) setUser(profile); }).catch(failure => {
      if (!active) return;
      if (failure instanceof ApiError && [401, 403].includes(failure.status)) {
        void api.setSession(null).catch(() => {});
      } else setError(failure instanceof Error ? failure.message : 'Không tải được tài khoản.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; unsubscribe(); };
  }, []);

  async function login(email: string, password: string) {
    const result = await api.request<Tokens>('/auth/login', { method: 'POST', body: { email: email.trim(), password }, authenticated: false });
    await api.setSession(result);
    try {
      const profile = await api.request<User>('/auth/me');
      if (!profile.roles.includes('CUSTOMER')) {
        await api.setSession(null);
        throw new Error('Ứng dụng này dành cho khách hàng. Tài khoản quản trị và nhân viên sử dụng cổng web.');
      }
      setUser(profile); setError('');
    } catch (failure) { await api.setSession(null); throw failure; }
  }
  async function register(values: { email: string; password: string; fullName: string; phone?: string }) {
    await api.request('/auth/register', { method: 'POST', body: { ...values, email: values.email.trim(), fullName: values.fullName.trim(), ...(values.phone?.trim() ? { phone: values.phone.trim() } : { phone: undefined }) }, authenticated: false });
    await login(values.email, values.password);
  }
  async function logout() {
    try { await api.request('/auth/logout', { method: 'POST' }); }
    finally { await api.setSession(null); setUser(null); }
  }
  return <SessionContext.Provider value={{ user, loading, error, login, register, logout, reload }}>{children}</SessionContext.Provider>;
}
export function useSession() { const value = useContext(SessionContext); if (!value) throw new Error('SessionProvider is missing'); return value; }
