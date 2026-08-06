import { useRef, useState, type MouseEvent } from 'react';
import { Banknote, Bitcoin, CreditCard, Eye, EyeOff, Gem, PiggyBank } from 'lucide-react';
import type { Account } from '../api';
import { ACCOUNT_TYPE_LABEL, AccountType } from '../api';
import { detectBank, isKnownBank, type BankBrand } from '../lib/banks';
import {
  currencyLabel, currencySymbol, cx, formatCardNumber, formatCurrency, formatNumber,
  maskCardNumber, rialEquivalent, toFa,
} from '../lib/format';
import { AnimatedNumber } from './ui/AnimatedNumber';

/**
 * برای انواع غیربانکی، برند کارت همیشه به رنگ خنثای پیش‌فرض می‌افتاد و همه‌شان
 * یک شکل به‌نظر می‌رسیدند. هر نوع حساب رنگ خودش را می‌گیرد تا در نگاه اول
 * (بدون خواندن متن) نوع حساب مشخص باشد.
 */
const TYPE_THEME: Partial<Record<number, BankBrand>> = {
  [AccountType.Cash]: {
    key: 'cash', name: 'نقدی',
    gradient: 'linear-gradient(135deg,#14532d 0%,#22c55e 55%,#052e16 100%)',
    accent: '#4ade80', ink: '#f0fdf4',
  },
  [AccountType.SavingsFund]: {
    key: 'savings', name: 'صندوق پس‌انداز',
    gradient: 'linear-gradient(135deg,#083344 0%,#0891b2 55%,#042f3d 100%)',
    accent: '#22d3ee', ink: '#ecfeff',
  },
  [AccountType.Gold]: {
    key: 'gold', name: 'طلا',
    gradient: 'linear-gradient(135deg,#78350f 0%,#d97706 45%,#fbbf24 75%,#78350f 100%)',
    accent: '#fde68a', ink: '#1c1917',
  },
  [AccountType.Currency]: {
    key: 'currency', name: 'ارز',
    gradient: 'linear-gradient(135deg,#0c4a6e 0%,#0ea5e9 55%,#082f49 100%)',
    accent: '#7dd3fc', ink: '#f0f9ff',
  },
  [AccountType.Crypto]: {
    key: 'crypto', name: 'رمزارز',
    gradient: 'linear-gradient(135deg,#3b0764 0%,#9333ea 55%,#1e1b4b 100%)',
    accent: '#c4b5fd', ink: '#faf5ff',
  },
};

interface BankCardProps {
  account: Account;
  /** فشرده برای اسلایدر داشبورد */
  compact?: boolean;
  onClick?: () => void;
  className?: string;
  index?: number;
  /** برای پیش‌نمایش زنده‌ی فرم ساخت — چیزی برای مخفی‌کردن نیست چون هنوز ذخیره نشده */
  startRevealed?: boolean;
}

export function BankCard({
  account, compact = false, onClick, className, index = 0, startRevealed = false,
}: BankCardProps) {
  const isBank = account.type === AccountType.Bank;
  const isCash = account.type === AccountType.Cash;
  const isSavings = account.type === AccountType.SavingsFund;
  const isGold = account.type === AccountType.Gold;
  const isCrypto = account.type === AccountType.Crypto;
  const isCurrency = account.type === AccountType.Currency;

  const bankBrand = detectBank(account.cardNumber, account.bankName);
  const typeLabel = ACCOUNT_TYPE_LABEL[account.type] ?? 'حساب';

  // اگر بانک شناسایی نشده باشد، عنوان حساب جای نام بانک می‌نشیند تا متن تکراری یا بی‌معنا نمانَد
  const known = isBank && isKnownBank(bankBrand);
  const headline = known ? bankBrand.name : account.title;
  const subtitle = known ? `${account.title} · ${typeLabel}` : typeLabel;

  // رنگ کارت: بانک از روی برند تشخیص داده می‌شود، بقیهٔ انواع رنگ اختصاصی خودشان را دارند
  // تا بدون خواندن متن هم بشود فهمید حساب طلاست یا ارز یا رمزارز.
  const brand = isBank ? bankBrand : (TYPE_THEME[account.type] ?? bankBrand);
  const symbol = isCurrency ? currencySymbol(account.currencyCode) : undefined;
  const TypeIcon = isGold ? Gem : isCrypto ? Bitcoin : isSavings ? PiggyBank : isCash ? Banknote : CreditCard;

  const balanceSuffix = isCrypto
    ? account.cryptoSymbol || 'واحد'
    : isCurrency
      ? symbol || currencyLabel(account.currencyCode)
      : currencyLabel(account.currencyCode);
  const rial = isGold
    ? rialEquivalent(account.goldWeightGrams ?? 0, account.manualRateIrr)
    : (isCrypto || isCurrency)
      ? rialEquivalent(account.currentBalance, account.manualRateIrr)
      : undefined;

  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [shine, setShine] = useState({ x: 50, y: 50, on: false });
  const [revealed, setRevealed] = useState(startRevealed);

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
              <p className="truncate text-base font-bold sm:text-lg">{headline}</p>
              <p className="mt-0.5 truncate text-xs opacity-65">{subtitle}</p>
            </div>
            <div
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
              style={{ background: 'rgb(255 255 255 / .14)' }}
            >
              {symbol ? (
                <span className="text-base font-extrabold">{symbol}</span>
              ) : (
                <TypeIcon size={16} />
              )}
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

          {/* موجودی و ردیف پایینی مخصوص هر نوع حساب */}
          <div>
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] tracking-wide opacity-60">
                  {isCrypto || isCurrency ? 'مقدار' : 'موجودی'}
                </p>
                {revealed ? (
                  <AnimatedNumber
                    value={account.currentBalance}
                    suffix={balanceSuffix}
                    fractionDigits={isCrypto ? 4 : isCurrency ? 2 : 0}
                    className="text-xl font-extrabold sm:text-2xl"
                  />
                ) : (
                  <p className="num text-xl font-extrabold sm:text-2xl">••••••••</p>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setRevealed((value) => !value);
                }}
                aria-label={revealed ? 'مخفی کردن موجودی' : 'نمایش موجودی'}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition hover:bg-white/20"
                style={{ background: 'rgb(255 255 255 / .1)' }}
              >
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {revealed && rial !== undefined && (
              <p
                className="num mt-1.5 inline-flex w-fit items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold"
                style={{ background: 'rgb(255 255 255 / .14)' }}
              >
                {isGold ? 'ارزش روز ≈ ' : '≈ '}
                {formatCurrency(rial, 'IRR')}
              </p>
            )}

            {isBank && (
              <p dir="ltr" className="num mt-3 text-sm tracking-[0.18em] opacity-85 sm:text-base">
                {revealed ? formatCardNumber(account.cardNumber) : maskCardNumber(account.cardNumber)}
              </p>
            )}

            {isGold && (account.goldWeightGrams || account.goldPurity || account.goldItemType) && (
              <p className="num mt-3 truncate text-xs opacity-80 sm:text-sm">
                {[
                  account.goldWeightGrams != null && `${formatNumber(account.goldWeightGrams, 2)} گرم`,
                  account.goldPurity != null && `عیار ${toFa(account.goldPurity)}`,
                  account.goldItemType,
                ].filter(Boolean).join(' · ')}
              </p>
            )}

            {!isBank && !isGold && account.note && (
              <p className="mt-3 truncate text-xs opacity-80 sm:text-sm">{account.note}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
