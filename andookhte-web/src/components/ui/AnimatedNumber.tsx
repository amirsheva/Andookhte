import { useAnimatedNumber } from '../../hooks/useAnimatedNumber';
import { compactNumber, cx, formatNumber } from '../../lib/format';

interface AnimatedNumberProps {
  value: number;
  /** واحد پول یا پسوند */
  suffix?: string;
  /** خلاصه‌سازی اعداد بزرگ */
  compact?: boolean;
  fractionDigits?: number;
  duration?: number;
  className?: string;
  suffixClassName?: string;
}

export function AnimatedNumber({
  value,
  suffix,
  compact = false,
  fractionDigits = 0,
  duration = 1100,
  className,
  suffixClassName,
}: AnimatedNumberProps) {
  const animated = useAnimatedNumber(value, duration);
  const text = compact ? compactNumber(animated) : formatNumber(animated, fractionDigits);

  return (
    <span className={cx('num inline-flex items-baseline gap-1.5', className)}>
      <span>{text}</span>
      {suffix && (
        <span className={cx('text-[0.6em] font-normal opacity-70', suffixClassName)}>{suffix}</span>
      )}
    </span>
  );
}
