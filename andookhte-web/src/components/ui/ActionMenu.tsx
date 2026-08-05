import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

const MENU_WIDTH = 192; // w-48
const ITEM_HEIGHT = 40;
const MENU_PADDING = 12;
const VIEWPORT_MARGIN = 8;

/**
 * منو با createPortal مستقیم روی document.body رندر می‌شود، نه داخل جای طبیعی خودش.
 * چرا: هر صفحه با انیمیشن ورودش (`animate-[page-in_...]`) پیچیده شده، و چون آن
 * انیمیشن روی transform/opacity اثر می‌گذارد، طبق مشخصات CSS یک stacking context
 * تازه می‌سازد. هر چیزی داخل آن wrapper بماند — با هر z-index‌ای — نمی‌تواند از
 * TopBar یا BottomNav (که بیرون از آن wrapper و با z-index صریح‌اند) بالاتر بیاید.
 * Modal همین مشکل را با پورتال دور زده؛ این کامپوننت هم باید همین کار را بکند.
 */
export function ActionMenu({ items, label = 'عملیات', className, align = 'start' }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // align="start": لبهٔ راست منو به لبهٔ راست دکمه می‌چسبد (باز شدن به چپ).
    // align="end": برعکس — برای دکمه‌هایی نزدیک لبهٔ چپ صفحه که جای بازشدن به چپ ندارند.
    let left = align === 'start' ? rect.right - MENU_WIDTH : rect.left;
    left = Math.min(Math.max(left, VIEWPORT_MARGIN), window.innerWidth - MENU_WIDTH - VIEWPORT_MARGIN);

    const menuHeight = items.length * ITEM_HEIGHT + MENU_PADDING;
    const opensBelow = rect.bottom + 6 + menuHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const top = opensBelow ? rect.bottom + 6 : rect.top - menuHeight - 6;

    setPosition({ top, left });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    // موقعیت منو یک‌بار در لحظهٔ باز شدن محاسبه می‌شود؛ با اسکرول دیگر معتبر
    // نیست، پس به‌جای دنبال‌کردن پیچیدهٔ اسکرول، منو را می‌بندیم.
    const onScroll = () => setOpen(false);

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(event) => {
          event.stopPropagation();
          haptic(8);
          if (open) setOpen(false);
          else openMenu();
        }}
        className={cx(
          'grid h-9 w-9 place-items-center rounded-xl text-dim transition hover:bg-slate-500/10 hover:text-[var(--text-strong)] dark:hover:bg-white/10',
          className,
        )}
      >
        <MoreVertical size={16} />
      </button>

      {open && position && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: position.top, left: position.left }}
          className="glass fixed z-[70] w-48 animate-[rise_.25s_cubic-bezier(.16,1,.3,1)_both] overflow-hidden rounded-2xl p-1.5"
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
        </div>,
        document.body,
      )}
    </>
  );
}
