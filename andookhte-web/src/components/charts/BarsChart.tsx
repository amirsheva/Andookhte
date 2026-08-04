import { useState } from 'react';
import { compactNumber, cx } from '../../lib/format';

export interface BarGroup {
  key: string;
  label: string;
  values: { key: string; label: string; value: number; rgb: string }[];
}

interface BarsChartProps {
  groups: BarGroup[];
  height?: number;
}

export function BarsChart({ groups, height = 220 }: BarsChartProps) {
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...groups.flatMap((g) => g.values.map((v) => v.value)));

  if (groups.length === 0) {
    return <div className="grid h-40 place-items-center text-xs text-dim">داده‌ای برای نمایش نیست</div>;
  }

  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-2 sm:gap-4" style={{ height }}>
        {groups.map((group, groupIndex) => {
          const isActive = active === group.key;
          return (
            <div
              key={group.key}
              onMouseEnter={() => setActive(group.key)}
              onMouseLeave={() => setActive(null)}
              className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
            >
              <div className="relative flex h-full w-full items-end justify-center gap-1.5">
                {group.values.map((bar, barIndex) => (
                  <div
                    key={bar.key}
                    title={`${bar.label}: ${compactNumber(bar.value)}`}
                    className="relative w-full max-w-7 rounded-t-xl transition-all duration-300"
                    style={{
                      height: `${Math.max(2, (bar.value / max) * 100)}%`,
                      background: `linear-gradient(to top, rgb(${bar.rgb} / .95), rgb(${bar.rgb} / .45))`,
                      boxShadow: isActive
                        ? `0 -8px 26px -6px rgb(${bar.rgb} / .7)`
                        : `0 -4px 14px -6px rgb(${bar.rgb} / .45)`,
                      transformOrigin: 'bottom',
                      animation: `grow-up .8s cubic-bezier(.16,1,.3,1) ${
                        groupIndex * 70 + barIndex * 40
                      }ms both`,
                    }}
                  />
                ))}
              </div>
              <span
                className={cx(
                  'text-[11px] transition-colors duration-200',
                  isActive ? 'font-semibold text-[var(--text-strong)]' : 'text-dim',
                )}
              >
                {group.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* راهنمای رنگ‌ها */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-dim">
        {groups[0].values.map((bar) => (
          <span key={bar.key} className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: `rgb(${bar.rgb})` }} />
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
