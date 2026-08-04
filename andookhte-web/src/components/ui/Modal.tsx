import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cx } from '../../lib/format';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  /** عرض بیشینه در دسکتاپ */
  width?: string;
}

export function Modal({ open, onClose, title, description, children, width = 'max-w-lg' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-end justify-center sm:items-center">
      <button
        aria-label="بستن"
        onClick={onClose}
        className="absolute inset-0 animate-[fade-in_.3s_ease-out] bg-slate-950/50 backdrop-blur-md"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'glass relative w-full origin-bottom animate-[sheet-in_.45s_cubic-bezier(.16,1,.3,1)]',
          'max-h-[92dvh] overflow-y-auto rounded-t-5xl p-6 sm:rounded-4xl sm:p-7',
          width,
        )}
      >
        <span
          aria-hidden
          className="mx-auto mb-5 block h-1.5 w-11 rounded-full bg-slate-400/40 sm:hidden"
        />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {description && <p className="mt-1 text-xs text-dim">{description}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="بستن"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-dim transition hover:bg-slate-500/10 hover:text-[var(--text-strong)]"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}
