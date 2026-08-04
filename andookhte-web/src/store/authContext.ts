import { createContext, useContext } from 'react';
import type { AuthUser, WorkspaceSummary } from '../api';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;

  loginWithPassword: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber?: string;
  }) => Promise<void>;
  requestOtp: (phoneNumber: string) => Promise<{ expiresInSeconds: number; developmentCode?: string | null }>;
  verifyOtp: (input: { phoneNumber: string; code: string; displayName?: string }) => Promise<void>;

  requestPasswordReset: (
    identifier: string,
  ) => Promise<{ expiresInSeconds: number; developmentCode?: string | null }>;
  resetPassword: (input: {
    identifier: string;
    code: string;
    newPassword: string;
  }) => Promise<void>;

  logout: (allDevices?: boolean) => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  createWorkspace: (input: { name: string; type: number; currencyCode?: string }) => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth باید داخل AuthProvider استفاده شود');
  return ctx;
};

/** آیا نقش کاربر دست‌کم برابر سطح خواسته‌شده است. */
export const hasRole = (role: number | undefined | null, minimum: number): boolean =>
  (role ?? 0) >= minimum;
