import type { HTMLAttributes, ReactNode } from 'react';
import { cx } from '../../lib/format';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /** درخشش نرم هنگام هاور */
  interactive?: boolean;
  /** رنگ هاله به صورت «r g b» */
  glow?: string;
  padded?: boolean;
}

export function GlassCard({
  children,
  className,
  interactive = false,
  glow,
  padded = true,
  style,
  ...rest
}: GlassCardProps) {
  return (
    <div
      {...rest}
      style={{ ...style, ...(glow ? ({ ['--glow']: glow } as React.CSSProperties) : {}) }}
      className={cx(
        'glass relative overflow-hidden rounded-4xl',
        padded && 'p-5 sm:p-6',
        interactive &&
          'transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1 hover:shadow-[0_28px_60px_-24px_rgb(var(--glow,51_100_255)/0.55)]',
        className,
      )}
    >
      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-16 h-56 w-56 rounded-full opacity-40 blur-3xl"
          style={{ background: `rgb(${glow} / 0.35)` }}
        />
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
