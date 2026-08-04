import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/format';
import { haptic } from '../../hooks/useMediaQuery';

type Variant = 'primary' | 'ghost' | 'soft' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'text-white bg-gradient-to-l from-brand-600 via-brand-500 to-brand-400 shadow-[0_14px_34px_-14px_rgb(51_100_255/0.85)] hover:shadow-[0_18px_44px_-14px_rgb(51_100_255/0.95)]',
  success:
    'text-white bg-gradient-to-l from-emerald-600 via-emerald-500 to-teal-400 shadow-[0_14px_34px_-14px_rgb(16_185_129/0.8)]',
  danger:
    'text-white bg-gradient-to-l from-rose-600 via-rose-500 to-orange-400 shadow-[0_14px_34px_-14px_rgb(244_63_94/0.8)]',
  soft: 'glass-soft text-[var(--text-strong)] hover:bg-white/70 dark:hover:bg-white/10',
  ghost:
    'text-dim hover:text-[var(--text-strong)] hover:bg-slate-500/10 dark:hover:bg-white/10',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs gap-1.5 rounded-xl',
  md: 'h-11 px-5 text-sm gap-2 rounded-2xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-2xl',
  icon: 'h-11 w-11 rounded-2xl',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  onClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={(event) => {
        haptic(10);
        onClick?.(event);
      }}
      className={cx(
        'relative inline-flex select-none items-center justify-center font-medium',
        'transition-all duration-300 ease-out active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {loading && (
        <span className="absolute inline-flex h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      <span className={cx('inline-flex items-center gap-2', loading && 'opacity-0')}>{children}</span>
    </button>
  );
}
