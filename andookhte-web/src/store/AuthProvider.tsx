import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, workspaceApi, type AuthResult, type AuthUser, type WorkspaceSummary } from '../api';
import { SESSION_EXPIRED_EVENT, authStorage } from '../lib/authStorage';
import { AuthContext, type AuthStatus } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(() =>
    authStorage.accessToken ? 'loading' : 'anonymous',
  );
  const [user, setUser] = useState<AuthUser | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    () => authStorage.workspaceId,
  );

  const applySession = useCallback((result: AuthResult) => {
    authStorage.setTokens(result.accessToken, result.refreshToken);

    const preferred =
      result.workspaces.find((w) => w.id === authStorage.workspaceId)?.id ??
      result.activeWorkspaceId ??
      result.workspaces[0]?.id ??
      null;

    authStorage.setWorkspaceId(preferred);
    setActiveWorkspaceId(preferred);
    setUser(result.user);
    setWorkspaces(result.workspaces);
    setStatus('authenticated');
  }, []);

  const clearSession = useCallback(() => {
    authStorage.clear();
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspaceId(null);
    setStatus('anonymous');
  }, []);

  /** خواندن پروفایل — هم در بارگذاری اولیه و هم پس از تغییرات استفاده می‌شود. */
  const loadProfile = useCallback(async () => {
    try {
      const me = await authApi.me();
      const preferred =
        me.workspaces.find((w) => w.id === authStorage.workspaceId)?.id ??
        me.activeWorkspaceId ??
        me.workspaces[0]?.id ??
        null;

      authStorage.setWorkspaceId(preferred);
      setActiveWorkspaceId(preferred);
      setUser(me.user);
      setWorkspaces(me.workspaces);
      setStatus('authenticated');
    } catch {
      clearSession();
    }
  }, [clearSession]);

  useEffect(() => {
    if (!authStorage.accessToken) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProfile();
  }, [loadProfile]);

  // اگر تمدید توکن شکست بخورد، اینترسپتور این رویداد را منتشر می‌کند
  useEffect(() => {
    const handler = () => clearSession();
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [clearSession]);

  const loginWithPassword = useCallback(
    async (input: { email: string; password: string }) => applySession(await authApi.login(input)),
    [applySession],
  );

  const register = useCallback(
    async (input: { email: string; password: string; displayName: string; phoneNumber?: string }) =>
      applySession(await authApi.register(input)),
    [applySession],
  );

  const requestOtp = useCallback(async (phoneNumber: string) => {
    const result = await authApi.requestOtp(phoneNumber);
    return { expiresInSeconds: result.expiresInSeconds, developmentCode: result.developmentCode };
  }, []);

  const verifyOtp = useCallback(
    async (input: { phoneNumber: string; code: string; displayName?: string }) =>
      applySession(await authApi.verifyOtp(input)),
    [applySession],
  );

  const requestPasswordReset = useCallback(async (identifier: string) => {
    const result = await authApi.forgotPassword(identifier);
    return { expiresInSeconds: result.expiresInSeconds, developmentCode: result.developmentCode };
  }, []);

  const resetPassword = useCallback(
    async (input: { identifier: string; code: string; newPassword: string }) =>
      applySession(await authApi.resetPassword(input)),
    [applySession],
  );

  const logout = useCallback(
    async (allDevices = false) => {
      await authApi.logout(allDevices);
      clearSession();
    },
    [clearSession],
  );

  const switchWorkspace = useCallback((workspaceId: string) => {
    authStorage.setWorkspaceId(workspaceId);
    setActiveWorkspaceId(workspaceId);
  }, []);

  const createWorkspace = useCallback(
    async (input: { name: string; type: number; currencyCode?: string }) => {
      const created = await workspaceApi.create(input);
      const list = await workspaceApi.list();
      setWorkspaces(list);
      authStorage.setWorkspaceId(created.id);
      setActiveWorkspaceId(created.id);
    },
    [],
  );

  const renameWorkspace = useCallback(async (name: string) => {
    await workspaceApi.rename(name);
    setWorkspaces(await workspaceApi.list());
  }, []);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [workspaces, activeWorkspaceId],
  );

  const value = useMemo(
    () => ({
      status,
      user,
      workspaces,
      activeWorkspace,
      loginWithPassword,
      register,
      requestOtp,
      verifyOtp,
      requestPasswordReset,
      resetPassword,
      logout,
      switchWorkspace,
      createWorkspace,
      renameWorkspace,
      reloadProfile: loadProfile,
    }),
    [
      status, user, workspaces, activeWorkspace,
      loginWithPassword, register, requestOtp, verifyOtp,
      requestPasswordReset, resetPassword,
      logout, switchWorkspace, createWorkspace, renameWorkspace, loadProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
