import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Info } from 'lucide-react';
import { ToastContext, type ToastOptions } from './toastContext';
import { cx } from '../lib/format';

interface ToastItem {
  id: number;
  message: string;
  tone: 'success' | 'info';
}

const DEFAULT_DURATION_MS = 2600;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((message: string, options?: ToastOptions) => {
    const id = nextId.current++;
    const tone = options?.tone ?? 'success';
    setToasts((current) => [...current, { id, message, tone }]);

    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, options?.durationMs ?? DEFAULT_DURATION_MS);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div
          aria-live="polite"
          className="pointer-events-none fixed inset-x-0 z-[200] flex flex-col items-center gap-2 px-4"
          style={{ top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={cx(
                'glass pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-2xl px-4 py-3 text-sm font-medium',
                'animate-[rise_.35s_cubic-bezier(.16,1,.3,1)_both] shadow-[0_18px_45px_-22px_rgb(15_23_42/.4)]',
              )}
            >
              {toast.tone === 'success' ? (
                <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
              ) : (
                <Info size={18} className="shrink-0 text-brand-500" />
              )}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
