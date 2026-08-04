import { useMemo, useState } from 'react';
import type { CategorySlice } from '../../lib/analytics';
import { compactNumber, formatNumber } from '../../lib/format';

interface DonutChartProps {
  data: CategorySlice[];
  size?: number;
  thickness?: number;
  /** برچسب مرکز وقتی چیزی انتخاب نشده */
  centerLabel?: string;
  centerValue?: number;
  currency?: string;
}

const polar = (cx: number, cy: number, r: number, angle: number) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const arcPath = (cx: number, cy: number, r: number, start: number, end: number): string => {
  const safeEnd = end - start >= 360 ? start + 359.99 : end;
  const from = polar(cx, cy, r, safeEnd);
  const to = polar(cx, cy, r, start);
  const largeArc = safeEnd - start > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${r} ${r} 0 ${largeArc} 0 ${to.x} ${to.y}`;
};

export function DonutChart({
  data,
  size = 240,
  thickness = 26,
  centerLabel = 'مجموع',
  centerValue,
  currency = 'ریال',
}: DonutChartProps) {
  const [active, setActive] = useState<number | null>(null);
  const radius = (size - thickness) / 2;
  const center = size / 2;

  const segments = useMemo(() => {
    const total = data.reduce((acc, cur) => acc + cur.value, 0) || 1;
    const result: (CategorySlice & { start: number; end: number })[] = [];
    let cursor = 0;
    for (const slice of data) {
      const sweep = (slice.value / total) * 360;
      result.push({ ...slice, start: cursor, end: cursor + sweep });
      cursor += sweep;
    }
    return result;
  }, [data]);

  const total = centerValue ?? data.reduce((acc, cur) => acc + cur.value, 0);
  const shown = active !== null ? segments[active] : null;

  if (data.length === 0) {
    return (
      <div
        className="grid place-items-center rounded-full border border-dashed border-slate-400/30 text-xs text-dim"
        style={{ width: size, height: size }}
      >
        داده‌ای برای نمایش نیست
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-0">
        <defs>
          <filter id="donut-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.28" />
          </filter>
        </defs>

        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgb(148 163 184 / .14)"
          strokeWidth={thickness}
        />

        <g filter="url(#donut-shadow)">
          {segments.map((segment, index) => {
            const isActive = active === index;
            const dimmed = active !== null && !isActive;
            return (
              <path
                key={segment.key}
                d={arcPath(center, center, radius, segment.start, segment.end)}
                fill="none"
                stroke={`rgb(${segment.rgb})`}
                strokeWidth={isActive ? thickness + 8 : thickness}
                strokeLinecap="round"
                pathLength={1}
                opacity={dimmed ? 0.28 : 1}
                onMouseEnter={() => setActive(index)}
                onMouseLeave={() => setActive(null)}
                className="cursor-pointer transition-[stroke-width,opacity] duration-300"
                style={{
                  strokeDasharray: 1,
                  animation: `donut-draw 1.1s cubic-bezier(.16,1,.3,1) ${index * 90}ms both`,
                }}
              />
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 grid place-items-center px-8 text-center">
        <div>
          <p className="text-[11px] text-dim">{shown ? shown.label : centerLabel}</p>
          <p className="num mt-1 text-xl font-extrabold">
            {compactNumber(shown ? shown.value : total)}
          </p>
          <p className="mt-0.5 text-[10px] text-dim">
            {shown ? `${formatNumber(Math.round(shown.share * 100))}٪ از کل` : currency}
          </p>
        </div>
      </div>
    </div>
  );
}
