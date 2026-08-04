const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** تبدیل ارقام لاتین به فارسی */
export const toFa = (input: string | number): string =>
  String(input).replace(/\d/g, (d) => FA_DIGITS[Number(d)]);

/** تبدیل ارقام فارسی/عربی به لاتین (برای ورودی کاربر) */
export const toEn = (input: string): string =>
  input
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

/** جداکننده هزارگان با ارقام فارسی */
export const formatNumber = (value: number, fractionDigits = 0): string =>
  toFa(
    new Intl.NumberFormat('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(Number.isFinite(value) ? value : 0),
  );

/** مبلغ به همراه واحد پول */
export const formatCurrency = (value: number, currency = 'IRR'): string =>
  `${formatNumber(Math.abs(value))} ${currencyLabel(currency)}`;

export const currencyLabel = (code?: string): string => {
  const clean = (code ?? '').trim().toUpperCase();
  switch (clean) {
    case '':
    case 'IRR':
    case 'RIAL': return 'ریال';
    case 'IRT':
    case 'TOMAN': return 'تومان';
    case 'USD': return 'دلار';
    case 'EUR': return 'یورو';
    case 'GBP': return 'پوند';
    case 'AED': return 'درهم';
    case 'TRY': return 'لیر';
    default:
      // فقط کد سه‌حرفی استاندارد ISO نمایش داده می‌شود؛ بقیه به واحد پیش‌فرض برمی‌گردند
      return /^[A-Z]{3}$/.test(clean) ? clean : 'ریال';
  }
};

/** خلاصه‌سازی اعداد بزرگ: ۱٫۲ میلیارد */
export const compactNumber = (value: number): string => {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${formatNumber(value / 1_000_000_000_000, 1)} هزار میلیارد`;
  if (abs >= 1_000_000_000) return `${formatNumber(value / 1_000_000_000, 1)} میلیارد`;
  if (abs >= 1_000_000) return `${formatNumber(value / 1_000_000, 1)} میلیون`;
  if (abs >= 1_000) return `${formatNumber(value / 1_000, 1)} هزار`;
  return formatNumber(value);
};

/** ۶۰۳۷۹۹۱۱۱۱۱۱۱۱۱۱ → ۶۰۳۷ ۹۹۱۱ ۱۱۱۱ ۱۱۱۱ */
export const formatCardNumber = (card?: string): string => {
  if (!card) return '•••• •••• •••• ••••';
  const digits = toEn(card).replace(/\D/g, '').padEnd(16, '•').slice(0, 16);
  return toFa(digits.replace(/(.{4})/g, '$1 ').trim());
};

export const maskCardNumber = (card?: string): string => {
  if (!card) return '•••• •••• •••• ••••';
  const digits = toEn(card).replace(/\D/g, '');
  if (digits.length < 8) return formatCardNumber(card);
  return `${toFa(digits.slice(0, 4))} •••• •••• ${toFa(digits.slice(-4))}`;
};

const FA_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

/** تاریخ شمسی خوانا */
export const formatDate = (input?: string | Date): string => {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric', month: 'long', day: 'numeric',
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
};

export const formatTime = (input?: string | Date): string => {
  if (!input) return '';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return toFa(
    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`,
  );
};

/** «امروز» / «دیروز» / تاریخ کامل */
export const relativeDay = (input?: string | Date): string => {
  if (!input) return '—';
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return '—';
  const today = new Date();
  const diff = Math.floor(
    (new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() -
      new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) /
      86_400_000,
  );
  if (diff === 0) return 'امروز';
  if (diff === 1) return 'دیروز';
  if (diff > 1 && diff < 7) return `${toFa(diff)} روز پیش`;
  return formatDate(date);
};

/** نام ماه شمسی از روی شمارهٔ ماه (۱ تا ۱۲) */
export const persianMonthName = (month: number): string => FA_MONTHS[(month - 1 + 12) % 12];

export const persianYearMonth = (input: string | Date): { year: number; month: number; label: string } => {
  const date = input instanceof Date ? input : new Date(input);
  const parts = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric', month: 'numeric',
  }).formatToParts(date);
  const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
  const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
  return { year, month, label: persianMonthName(month) };
};

export const cx = (...classes: (string | false | null | undefined)[]): string =>
  classes.filter(Boolean).join(' ');
