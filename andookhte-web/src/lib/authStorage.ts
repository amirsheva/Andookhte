/**
 * نگهداری توکن‌ها و فضای کاری فعال.
 *
 * توکن‌ها در localStorage ذخیره می‌شوند تا با رفرش صفحه از بین نروند.
 * این روش در برابر XSS آسیب‌پذیر است؛ امن‌ترین جایگزین، کوکی httpOnly است
 * که نیازمند تغییر سمت سرور (ست‌کردن کوکی و محافظت CSRF) است.
 */

const ACCESS_KEY = 'andookhte:access-token';
const REFRESH_KEY = 'andookhte:refresh-token';
const WORKSPACE_KEY = 'andookhte:workspace-id';

const read = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* حالت مرور خصوصی — نادیده گرفته می‌شود */
  }
};

export const authStorage = {
  get accessToken(): string | null {
    return read(ACCESS_KEY);
  },
  get refreshToken(): string | null {
    return read(REFRESH_KEY);
  },
  get workspaceId(): string | null {
    return read(WORKSPACE_KEY);
  },

  setTokens(accessToken: string, refreshToken: string): void {
    write(ACCESS_KEY, accessToken);
    write(REFRESH_KEY, refreshToken);
  },

  setWorkspaceId(workspaceId: string | null): void {
    write(WORKSPACE_KEY, workspaceId);
  },

  clear(): void {
    write(ACCESS_KEY, null);
    write(REFRESH_KEY, null);
    write(WORKSPACE_KEY, null);
  },
};

/** رویدادی که وقتی تمدید نشست شکست بخورد منتشر می‌شود تا اپ به صفحهٔ ورود برگردد. */
export const SESSION_EXPIRED_EVENT = 'andookhte:session-expired';

export const notifySessionExpired = (): void => {
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
};
