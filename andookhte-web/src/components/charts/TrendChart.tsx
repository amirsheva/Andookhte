import { useId, useMemo, useRef, useState, type MouseEvent } from 'react';
import { compactNumber } from '../../lib/format';

export interface TrendSeries {
  key: string;
  label: string;
  /** رنگ به صورت «r g b» */
  rgb: string;
  values: number[];
}

interface TrendChartProps {
  labels: string[];
  series: TrendSeries[];
  height?: number;
  /** تعداد خطوط راهنمای افقی */
  gridLines?: number;
}

/** مسیر منحنی نرم با درون‌یابی کاردینال */
const smoothPath = (points: { x: number; y: number }[], tension = 0.32): string => {
  if (points.length === 0) return '';
  if (points.length < 3) return points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
  }
  return d;
};

export function TrendChart({ labels, series, height = 240, gridLines = 4 }: TrendChartProps) {
  const uid = useId().replace(/[:]/g, '');
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const width = 1000;
  const padding = { top: 18, bottom: 30, left: 12, right: 12 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const { max, geometry } = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    const peak = Math.max(1, ...all);
    const count = labels.length || 1;
    const step = count > 1 ? innerW / (count - 1) : 0;

    const geo = series.map((s) => {
      const points = s.values.map((value, index) => ({
        x: padding.left + index * step,
        y: padding.top + innerH - (value / peak) * innerH,
      }));
      const line = smoothPath(points);
      const area = points.length
        ? `${line} L ${points[points.length - 1].x} ${padding.top + innerH} L ${points[0].x} ${padding.top + innerH} Z`
        : '';
      return { ...s, points, line, area };
    });

    return { max: peak, geometry: geo, step };
  }, [series, labels.length, innerW, innerH, padding.left, padding.top]);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = wrapRef.current;
    if (!node || labels.length === 0) return;
    const rect = node.getBoundingClientRect();
    // چیدمان راست‌به‌چپ نیست؛ svg در فضای LTR رسم می‌شود
    const ratio = (event.clientX - rect.left) / rect.width;
    const index = Math.round(ratio * (labels.length - 1));
    setHover(Math.min(labels.length - 1, Math.max(0, index)));
  };

  if (labels.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-xs text-dim">داده‌ای برای نمایش نیست</div>
    );
  }

  const hoverX =
    hover !== null && geometry[0]?.points[hover] ? geometry[0].points[hover].x : null;

  return (
    <div
      ref={wrapRef}
      dir="ltr"
      className="relative w-full"
      onMouseMove={handleMove}
      onMouseLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          {geometry.map((s) => (
            <linearGradient key={s.key} id={`grad-${uid}-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`rgb(${s.rgb})`} stopOpacity="0.42" />
              <stop offset="70%" stopColor={`rgb(${s.rgb})`} stopOpacity="0.06" />
              <stop offset="100%" stopColor={`rgb(${s.rgb})`} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>

        {/* خطوط راهنما */}
        {Array.from({ length: gridLines + 1 }).map((_, index) => {
          const y = padding.top + (innerH / gridLines) * index;
          return (
            <line
              key={index}
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="rgb(148 163 184 / .16)"
              strokeWidth="1"
              strokeDasharray={index === gridLines ? '0' : '4 8'}
            />
          );
        })}

        {geometry.map((s, seriesIndex) => (
          <g key={s.key}>
            <path
              d={s.area}
              fill={`url(#grad-${uid}-${s.key})`}
              style={{ animation: `fade-in .9s ease-out ${seriesIndex * 140 + 250}ms both` }}
            />
            <path
              d={s.line}
              fill="none"
              stroke={`rgb(${s.rgb})`}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              style={{
                strokeDasharray: 1,
                filter: `drop-shadow(0 6px 10px rgb(${s.rgb} / .35))`,
                animation: `draw-line 1.3s cubic-bezier(.16,1,.3,1) ${seriesIndex * 140}ms both`,
              }}
            />
          </g>
        ))}

        {/* نشانگر هاور */}
        {hoverX !== null && (
          <g>
            <line
              x1={hoverX}
              x2={hoverX}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="rgb(148 163 184 / .5)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            {geometry.map((s) => {
              const point = s.points[hover!];
              if (!point) return null;
              return (
                <g key={`dot-${s.key}`}>
                  <circle cx={point.x} cy={point.y} r="9" fill={`rgb(${s.rgb} / .22)`} />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="4.5"
                    fill={`rgb(${s.rgb})`}
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </g>
        )}
      </svg>

      {/* برچسب محور افقی */}
      <div dir="rtl" className="mt-1 flex justify-between px-1 text-[10px] text-dim">
        {[labels[labels.length - 1], labels[Math.floor(labels.length / 2)], labels[0]].map(
          (label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ),
        )}
      </div>

      {/* راهنما */}
      {hover !== null && (
        <div
          dir="rtl"
          className="glass pointer-events-none absolute top-2 z-10 min-w-40 rounded-2xl px-3.5 py-2.5 text-xs"
          style={{
            left: `clamp(0px, ${((hoverX ?? 0) / width) * 100}% - 80px, calc(100% - 160px))`,
          }}
        >
          <p className="mb-1.5 font-semibold">{labels[hover]}</p>
          {series.map((s) => (
            <p key={s.key} className="flex items-center justify-between gap-4 py-0.5">
              <span className="flex items-center gap-1.5 text-dim">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: `rgb(${s.rgb})` }}
                />
                {s.label}
              </span>
              <span className="num font-semibold">{compactNumber(s.values[hover] ?? 0)}</span>
            </p>
          ))}
        </div>
      )}

      <span className="sr-only">بیشینهٔ نمودار: {compactNumber(max)}</span>
    </div>
  );
}
