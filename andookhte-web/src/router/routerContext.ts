import { createContext, useContext } from 'react';

export interface RouterContextValue {
  /** مسیر جاری، همیشه با / شروع می‌شود */
  path: string;
  navigate: (to: string, options?: { replace?: boolean }) => void;
}

export const RouterContext = createContext<RouterContextValue | null>(null);

export const useRouter = (): RouterContextValue => {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter باید داخل Router استفاده شود');
  return ctx;
};

/** آیا مسیر جاری با مسیر داده‌شده مطابقت دارد */
export const matchPath = (current: string, target: string, exact = false): boolean => {
  if (target === '/') return current === '/';
  return exact ? current === target : current === target || current.startsWith(`${target}/`);
};
