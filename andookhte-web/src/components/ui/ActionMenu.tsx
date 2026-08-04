import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MoreVertical } from 'lucide-react';
import { cx } from '../../lib/format';
import { haptic } from '../../hooks/useMediaQuery';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onSelect: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /** توضیح دلیل غیرفعال بودن — روی گزینهٔ غیرفعال نمایش داده می‌شود */
  disabledHint?: string;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  label?: string;
  className?: string;
  /** جهت باز شدن منو نسبت به دکمه */
  align?: 'start' | 'end';
}

export function ActionMenu({ items, label = 'عملیات', className, align = 'start' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          haptic(8);
          setOpen((value) => !value);
        }}
        className="grid h-9 w-9 place-items-center rounded-xl text-dim transition hover:bg-slate-500/10 hover:text-[var(--text-strong)] dark:hover:bg-white/10"
      >
        <MoreVertical size={16} />
      </button>

      {open && (
        <div
          role="menu"
          className={cx(
            'glass absolute top-full z-50 mt-1.5 w-48 animate-[rise_.25s_cubic-bezier(.16,1,.3,1)_both] overflow-hidden rounded-2xl p-1.5',
            align === 'start' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item) => (
            <button
              key={item.key}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              title={item.disabled ? item.disabledHint : undefined}
              onClick={(event) => {
                event.stopPropagation();
                setOpen(false);
                item.onSelect();
              }}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-xs transition',
                'disabled:cursor-not-allowed disabled:opacity-40',
                item.tone === 'danger'
                  ? 'text-rose-500 enabled:hover:bg-rose-500/10'
                  : 'text-dim enabled:hover:bg-slate-500/8 enabled:hover:text-[var(--text-strong)] dark:enabled:hover:bg-white/6',
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
