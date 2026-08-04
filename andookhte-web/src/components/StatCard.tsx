import { TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { cx, formatNumber } from '../lib/format';

interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  icon: LucideIcon;
  /** رنگ به صورت «r g b» */
  rgb: string;
  /** درصد تغییر نسبت به دورهٔ قبل */
  trend?: number | null;
  /** برای هزینه، افزایش «بد» است */
  invertTrend?: boolean;
  hint?: string;
  index?: number;
  compact?: boolean;
}

export function StatCard({
  label, value, suffix, icon: Icon, rgb, trend, invertTrend = false, hint, index = 0, compact = false,
}: StatCardProps) {
  const positive = trend != null && trend >= 0;
  const good = invertTrend ? !positive : positive;
  const TrendIcon = positive ? TrendingUp : TrendingDown;

  return (
    <GlassCard
      interactive
      glow={rgb}
      style={{ animationDelay: `${index * 80}ms` }}
      className="animate-[rise_.65s_cubic-bezier(.16,1,.3,1)_both]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-dim">{label}</p>
          <AnimatedNumber
            value={value}
            suffix={suffix}
            compact={compact}
            className="mt-2 block text-2xl font-extrabold sm:text-[1.7rem]"
          />
          {hint && <p className="mt-1.5 text-[11px] text-dim">{hint}</p>}
        </div>
        <span
          className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: `rgb(${rgb} / .14)`, boxShadow: `inset 0 0 0 1px rgb(${rgb} / .25)` }}
        >
          <Icon size={19} style={{ color: `rgb(${rgb})` }} />
        </span>
      </div>

      {trend != null && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cx(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
              good ? 'bg-emerald-500/12 text-emerald-500' : 'bg-rose-500/12 text-rose-500',
            )}
          >
            <TrendIcon size={12} />
            <span className="num">{formatNumber(Math.abs(Math.round(trend)))}٪</span>
          </span>
          <span className="text-[11px] text-dim">نسبت به دورهٔ قبل</span>
        </div>
      )}
    </GlassCard>
  );
}
