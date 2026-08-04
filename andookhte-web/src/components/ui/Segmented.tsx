import { cx } from '../../lib/format';
import { haptic } from '../../hooks/useMediaQuery';

export interface SegmentOption<T extends string | number> {
  value: T;
  label: string;
  /** رنگ اختصاصی نشانگر به صورت «r g b» */
  rgb?: string;
}

interface SegmentedProps<T extends string | number> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  className,
  size = 'md',
}: SegmentedProps<T>) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const active = options[index];

  return (
    <div
      role="tablist"
      className={cx(
        'glass-soft relative grid rounded-2xl p-1',
        size === 'sm' ? 'h-10 text-xs' : 'h-12 text-sm',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-xl transition-[transform,background] duration-400 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          right: '0.25rem',
          transform: `translateX(${-index * 100}%)`,
          background: `rgb(${active?.rgb ?? '51 100 255'} / 0.16)`,
          boxShadow: `inset 0 0 0 1px rgb(${active?.rgb ?? '51 100 255'} / 0.35)`,
        }}
      />
      {options.map((option) => (
        <button
          key={String(option.value)}
          role="tab"
          aria-selected={option.value === value}
          onClick={() => {
            haptic(8);
            onChange(option.value);
          }}
          className={cx(
            'relative z-1 rounded-xl px-2 font-medium transition-colors duration-300',
            option.value === value ? 'text-[var(--text-strong)]' : 'text-dim hover:text-[var(--text-strong)]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
