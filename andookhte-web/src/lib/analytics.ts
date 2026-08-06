import { AccountType, TransactionType, type Account, type Transaction } from '../api';
import { getCategory } from './categories';
import { currencyLabel, currencySymbol, persianMonthName, rialEquivalent } from './format';

/** حساب‌های ارز و رمزارز به واحد خودشان‌اند (دلار، بیت‌کوین، ...)، نه ریال. */
export const isForeignUnitAccount = (account?: Account): boolean =>
  !!account && (account.type === AccountType.Currency || account.type === AccountType.Crypto);

/** نماد/برچسب واحدی که مبلغ این حساب باید کنارش نمایش داده شود. */
export const accountUnitSuffix = (account: Account): string => {
  if (account.type === AccountType.Crypto) return account.cryptoSymbol || 'واحد';
  if (account.type === AccountType.Currency) {
    return currencySymbol(account.currencyCode) || currencyLabel(account.currencyCode);
  }
  return currencyLabel(account.currencyCode);
};

/**
 * آیا این تراکنش کاملاً ریالی است؟ اگر حساب مبدأ یا مقصدش ارز/رمزارز باشد، مبلغش
 * به همان واحد خارجی ثبت شده — نه ریال — و نباید در جمع‌های ریالی (داشبورد، تحلیل) بیاید.
 * حسابی که دیگر پیدا نشود (حذف‌شده) ریالی فرض می‌شود، نه مسدودکننده.
 */
export const isRialTransaction = (tx: Transaction, accounts: Account[]): boolean => {
  const source = accounts.find((a) => a.id === tx.sourceAccountId);
  const destination = accounts.find((a) => a.id === tx.destinationAccountId);
  return !isForeignUnitAccount(source) && !isForeignUnitAccount(destination);
};

export const excludeForeignUnitTransactions = (
  transactions: Transaction[],
  accounts: Account[],
): Transaction[] => transactions.filter((tx) => isRialTransaction(tx, accounts));

export interface Totals {
  balance: number;
  income: number;
  expense: number;
  net: number;
  transferCount: number;
}

const asDate = (tx: Transaction): Date => new Date(tx.occurredAt ?? Date.now());

export const isIncome = (tx: Transaction) => tx.type === TransactionType.Income;
export const isExpense = (tx: Transaction) => tx.type === TransactionType.Expense;
export const isTransfer = (tx: Transaction) => tx.type === TransactionType.Transfer;

/**
 * موجودی حساب‌های ارز/رمزارز به واحد خودشان است (مثلاً دلار)، نه ریال —
 * جمع مستقیم آن با بقیهٔ حساب‌ها بی‌معناست. با نرخ دستی به ریال تبدیل می‌شود؛
 * حسابی که هنوز نرخ ندارد، تا وارد شدن نرخ در جمع کل شمرده نمی‌شود.
 */
export const sumBalance = (accounts: Account[]): number =>
  accounts.reduce((acc, cur) => {
    if (!isForeignUnitAccount(cur)) return acc + (cur.currentBalance || 0);
    return acc + (rialEquivalent(cur.currentBalance || 0, cur.manualRateIrr) ?? 0);
  }, 0);

/** تراکنش‌های n روز اخیر */
export const withinDays = (transactions: Transaction[], days: number): Transaction[] => {
  const threshold = Date.now() - days * 86_400_000;
  return transactions.filter((tx) => asDate(tx).getTime() >= threshold);
};

export const computeTotals = (accounts: Account[], transactions: Transaction[]): Totals => {
  let income = 0;
  let expense = 0;
  let transferCount = 0;
  for (const tx of transactions) {
    if (isIncome(tx)) income += tx.amount;
    else if (isExpense(tx)) expense += tx.amount;
    else transferCount += 1;
  }
  return {
    balance: sumBalance(accounts),
    income,
    expense,
    net: income - expense,
    transferCount,
  };
};

export interface CategorySlice {
  key: string;
  label: string;
  rgb: string;
  value: number;
  share: number;
  count: number;
}

/** تفکیک هزینه‌ها (یا درآمدها) بر اساس دسته */
export const byCategory = (
  transactions: Transaction[],
  kind: 'income' | 'expense' = 'expense',
  limit = 8,
): CategorySlice[] => {
  const predicate = kind === 'income' ? isIncome : isExpense;
  const buckets = new Map<string, { value: number; count: number }>();

  for (const tx of transactions) {
    if (!predicate(tx)) continue;
    const meta = getCategory(tx.category);
    const entry = buckets.get(meta.key) ?? { value: 0, count: 0 };
    entry.value += tx.amount;
    entry.count += 1;
    buckets.set(meta.key, entry);
  }

  const total = [...buckets.values()].reduce((acc, cur) => acc + cur.value, 0) || 1;
  const slices = [...buckets.entries()]
    .map(([key, entry]) => {
      const meta = getCategory(key);
      return {
        key,
        label: meta.label,
        rgb: meta.rgb,
        value: entry.value,
        count: entry.count,
        share: entry.value / total,
      };
    })
    .sort((a, b) => b.value - a.value);

  if (slices.length <= limit) return slices;

  const head = slices.slice(0, limit - 1);
  const tail = slices.slice(limit - 1);
  const rest = tail.reduce(
    (acc, cur) => ({ value: acc.value + cur.value, count: acc.count + cur.count }),
    { value: 0, count: 0 },
  );
  head.push({
    key: '__rest__',
    label: 'سایر موارد',
    rgb: '148 163 184',
    value: rest.value,
    count: rest.count,
    share: rest.value / total,
  });
  return head;
};

export interface DailyPoint {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

/** روند روزانه در n روز اخیر (شامل روزهای بدون تراکنش) */
export const dailySeries = (transactions: Transaction[], days = 30): DailyPoint[] => {
  const points = new Map<string, DailyPoint>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = date.toISOString().slice(0, 10);
    points.set(key, {
      date: key,
      label: new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'short' }).format(date),
      income: 0,
      expense: 0,
      net: 0,
    });
  }

  for (const tx of transactions) {
    const key = asDate(tx).toISOString().slice(0, 10);
    const point = points.get(key);
    if (!point) continue;
    if (isIncome(tx)) point.income += tx.amount;
    else if (isExpense(tx)) point.expense += tx.amount;
    point.net = point.income - point.expense;
  }

  return [...points.values()];
};

export interface MonthlyPoint {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

/** مقایسهٔ ماه‌های شمسی */
export const monthlySeries = (transactions: Transaction[], months = 6): MonthlyPoint[] => {
  const formatter = new Intl.DateTimeFormat('en-u-ca-persian', {
    year: 'numeric',
    month: 'numeric',
  });

  const keyOf = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const year = Number(parts.find((p) => p.type === 'year')?.value ?? 0);
    const month = Number(parts.find((p) => p.type === 'month')?.value ?? 1);
    return { key: `${year}-${String(month).padStart(2, '0')}`, year, month };
  };

  const buckets = new Map<string, MonthlyPoint>();
  const today = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 15);
    const { key, month } = keyOf(date);
    buckets.set(key, { key, label: persianMonthName(month), income: 0, expense: 0, net: 0 });
  }

  for (const tx of transactions) {
    const { key } = keyOf(asDate(tx));
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (isIncome(tx)) bucket.income += tx.amount;
    else if (isExpense(tx)) bucket.expense += tx.amount;
    bucket.net = bucket.income - bucket.expense;
  }

  return [...buckets.values()];
};

/** درصد تغییر نسبت به دورهٔ قبل */
export const trendPercent = (current: number, previous: number): number | null => {
  if (!previous) return current ? 100 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

/** مقایسهٔ ۳۰ روز اخیر با ۳۰ روز قبل از آن */
export const periodComparison = (transactions: Transaction[], days = 30) => {
  const now = Date.now();
  const currentStart = now - days * 86_400_000;
  const previousStart = now - 2 * days * 86_400_000;

  const acc = { current: { income: 0, expense: 0 }, previous: { income: 0, expense: 0 } };

  for (const tx of transactions) {
    const time = asDate(tx).getTime();
    const target =
      time >= currentStart ? acc.current : time >= previousStart ? acc.previous : null;
    if (!target) continue;
    if (isIncome(tx)) target.income += tx.amount;
    else if (isExpense(tx)) target.expense += tx.amount;
  }

  return {
    ...acc,
    incomeTrend: trendPercent(acc.current.income, acc.previous.income),
    expenseTrend: trendPercent(acc.current.expense, acc.previous.expense),
  };
};
