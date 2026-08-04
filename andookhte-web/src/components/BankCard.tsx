import { useRef, useState, type MouseEvent } from 'react';
import { Eye, EyeOff, Wallet } from 'lucide-react';
import type { Account } from '../api';
import { ACCOUNT_TYPE_LABEL } from '../api';
import { detectBank, isKnownBank } from '../lib/banks';
import { currencyLabel, cx, formatCardNumber, maskCardNumber } from '../lib/format';
import { AnimatedNumber } from './ui/AnimatedNumber';

interface BankCardProps {
  account: Account;
  /** فشرده برای اسلایدر داشبورد */
  compact?: boolean;
  onClick?: () => void;
  className?: string;
  index?: number;
}

export function BankCard({ account, compact = false, onClick, className, index = 0 }: BankCardProps) {
  const brand = detectBank(account.cardNumber, account.bankName);
  const typeLabel = ACCOUNT_TYPE_LABEL[account.type] ?? 'حساب';

  // اگر بانک شناسایی نشده باشد، عنوان حساب جای نام بانک می‌نشیند تا متن تکراری یا بی‌معنا نمانَد
  const known = isKnownBank(brand);
  const headline = known ? brand.name : account.title;
  const subtitle = known ? `${account.title} · ${typeLabel}` : typeLabel;

  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50, on: false });
  const [revealed, setRevealed] = useState(false);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * 14, y: (px - 0.5) * 18 });
    setShine({ x: px * 100, y: py * 100, on: true });
  };

  const reset = () => {
    setTilt({ x: 0, y: 0 });
    setShine((current) => ({ ...current, on: false }));
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      style={{ perspective: '1200px', animationDelay: `${index * 90}ms` }}
      className={cx('animate-[rise_.7s_cubic-bezier(.16,1,.3,1)_both]', onClick && 'cursor-pointer', className)}
    >
      <div
        className="relative w-full overflow-hidden rounded-4xl transition-transform duration-300 ease-out will-change-transform"
        style={{
          aspectRatio: compact ? '1.9 / 1' : '1.66 / 1',
          background: brand.gradient,
          color: brand.ink,
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(0)`,
          boxShadow: `0 26px 55px -24px rgb(2 6 23 / .75), 0 0 0 1px rgb(255 255 255 / .08) inset`,
        }}
      >
        {/* بافت و درخشش */}
        <span
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            background:
              'radial-gradient(120% 90% at 85% 0%, rgb(255 255 255 / .22), transparent 55%), radial-gradient(90% 80% at 0% 100%, rgb(0 0 0 / .35), transparent 60%)',
          }}
        />
        <span
          aria-hidden
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: shine.on ? 1 : 0,
            background: `radial-gradient(circle at ${shine.x}% ${shine.y}%, rgb(255 255 255 / .28), transparent 45%)`,
          }}
        />
        <span
          aria-hidden
          className="absolute -top-24 -left-16 h-64 w-64 rounded-full blur-3xl"
          style={{ background: `${brand.accent}33` }}
        />

        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          {/* سطر بالا */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{headline}</p>
              <p className="mt-0.5 truncate text-[11px] opacity-65">{subtitle}</p>
            </div>
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: 'rgb(255 255 255 / .14)' }}
            >
              <Wallet size={16} />
            </div>
          </div>

          {/* تراشه */}
          {!compact && (
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className="block h-8 w-11 rounded-md shadow-[0_2px_6px_rgb(0_0_0/.35)]"
                style={{
                  background:
                    'linear-gradient(135deg,#f7dc95 0%,#e7bf6d 35%,#b8912f 55%,#f0d089 75%,#c9a24a 100%)',
                }}
              />
            </div>
          )}

          {/* موجودی و شماره کارت */}
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-wide opacity-60">موجودی</p>
                {revealed ? (
                  <AnimatedNumber
                    value={account.currentBalance}
                    suffix={currencyLabel(account.currencyCode)}
                    className="text-xl font-extrabold sm:text-2xl"
                  />
                ) : (
                  <p className="num text-xl font-extrabold sm:text-2xl">••••••••</p>
                )}
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  setRevealed((value) => !value);
                }}
                aria-label={revealed ? 'مخفی کردن موجودی و شمارهٔ کارت' : 'نمایش موجودی و شمارهٔ کارت'}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-white/20"
                style={{ background: 'rgb(255 255 255 / .1)' }}
              >
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            <p className="num mt-3 text-sm tracking-[0.18em] opacity-85 sm:text-base">
              {revealed ? formatCardNumber(account.cardNumber) : maskCardNumber(account.cardNumber)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
