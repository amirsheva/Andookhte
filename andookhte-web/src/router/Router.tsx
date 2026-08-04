import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { RouterContext } from './routerContext';

const readPath = (): string =>
  typeof window === 'undefined' ? '/' : window.location.pathname || '/';

/** روتر سبک مبتنی بر History API — بدون وابستگی بیرونی */
export function Router({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(readPath);

  useEffect(() => {
    const onPopState = () => setPath(readPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback(
    (to: string, options?: { replace?: boolean }) => {
      if (to === path) return;
      if (options?.replace) window.history.replaceState({}, '', to);
      else window.history.pushState({}, '', to);
      setPath(to);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [path],
  );

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}
