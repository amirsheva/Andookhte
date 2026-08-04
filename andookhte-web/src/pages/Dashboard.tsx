import { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowUpRight, ChevronLeft, CreditCard, Landmark, Pencil, PiggyBank, Plus,
  TrendingUp, Wallet,
} from 'lucide-react';
import { useFinance } from '../store/financeContext';
import {
  byCategory, computeTotals, dailySeries, periodComparison, sumBalance, withinDays,
} from '../lib/analytics';
import { ACCOUNT_TYPE_LABEL, type Account } from '../api';
import { currencyLabel, formatNumber } from '../lib/format';
import { GlassCard } from '../components/ui/GlassCard';
import { Skeleton, SkeletonRow } from '../components/ui/Skeleton';
import { StatCard } from '../components/StatCard';
import { BankCard } from '../components/BankCard';
import { AccountForm } from '../components/AccountForm';
import { TransactionRow } from '../components/TransactionRow';
import { TrendChart } from '../components/charts/TrendChart';
import { DonutChart } from '../components/charts/DonutChart';
import { Segmented } from '../components/ui/Segmented';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Link } from '../router/Link';

export function Dashboard() {
  const { accounts, transactions, loading } = useFinance();
  const [range, setRange] = useState(30);
  const [detail, setDetail] = useState<{ account: Account; editing: boolean } | null>(null);

  const scoped = useMemo(() => withinDays(transactions, range), [transactions, range]);
  const totals = useMemo(() => computeTotals(accounts, scoped), [accounts, scoped]);
  const comparison = useMemo(() => periodComparison(transactions, range), [transactions, range]);
  const daily = useMemo(() => dailySeries(transactions, range), [transactions, range]);
  const slices = useMemo(() => byCategory(scoped, 'expense', 6), [scoped]);
  const currency = currencyLabel(accounts[0]?.currencyCode);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-4xl" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-4xl" />
        <div className="glass space-y-2 rounded-4xl p-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-7">
      {/* کارت‌های آماری */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="مجموع دارایی"
          value={sumBalance(accounts)}
          suffix={currency}
          icon={Wallet}
          rgb="51 100 255"
          compact
          hint={`${formatNumber(accounts.length)} حساب فعال`}
        />
        <StatCard
          index={1}
          label={`درآمد ${formatNumber(range)} روز`}
          value={totals.income}
          suffix={currency}
          icon={ArrowDownLeft}
          rgb="16 185 129"
          compact
          trend={comparison.incomeTrend}
        />
        <StatCard
          index={2}
          label={`هزینه ${formatNumber(range)} روز`}
          value={totals.expense}
          suffix={currency}
          icon={ArrowUpRight}
          rgb="244 63 94"
          compact
          trend={comparison.expenseTrend}
          invertTrend
        />
        <StatCard
          index={3}
          label="مانده دوره"
          value={totals.net}
          suffix={currency}
          icon={PiggyBank}
          rgb="168 85 247"
          compact
          hint={totals.net >= 0 ? 'در مسیر پس‌انداز' : 'هزینه بیش از درآمد'}
        />
      </section>

      {/* نمودار روند + دسته‌بندی */}
      <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <GlassCard className="animate-[rise_.7s_cubic-bezier(.16,1,.3,1)_.15s_both]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold">روند درآمد و هزینه</h2>
              <p className="mt-0.5 text-[11px] text-dim">نمای کلی جریان نقدی</p>
            </div>
            <Segmented
              size="sm"
              className="w-44"
              value={range}
              onChange={setRange}
              options={[
                { value: 7, label: '۷ روز' },
                { value: 30, label: '۳۰ روز' },
                { value: 90, label: '۹۰ روز' },
              ]}
            />
          </div>
          <TrendChart
            height={250}
            labels={daily.map((point) => point.label)}
            series={[
              { key: 'income', label: 'درآمد', rgb: '16 185 129', values: daily.map((p) => p.income) },
              { key: 'expense', label: 'هزینه', rgb: '244 63 94', values: daily.map((p) => p.expense) },
            ]}
          />
        </GlassCard>

        <GlassCard className="animate-[rise_.7s_cubic-bezier(.16,1,.3,1)_.22s_both]">
          <h2 className="text-base font-bold">هزینه بر اساس دسته</h2>
          <p className="mt-0.5 text-[11px] text-dim">نشانگر را روی بخش‌ها ببرید</p>
          <div className="mt-5 flex flex-col items-center gap-6">
            <DonutChart data={slices} size={220} centerLabel="کل هزینه" currency={currency} />
            <ul className="w-full space-y-2">
              {slices.slice(0, 5).map((slice) => (
                <li key={slice.key} className="flex items-center gap-2.5 text-xs">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: `rgb(${slice.rgb})`, boxShadow: `0 0 10px rgb(${slice.rgb} / .8)` }}
                  />
                  <span className="truncate">{slice.label}</span>
                  <span className="num mr-auto shrink-0 text-dim">
                    {formatNumber(Math.round(slice.share * 100))}٪
                  </span>
                </li>
              ))}
              {slices.length === 0 && <li className="text-xs text-dim">هزینه‌ای ثبت نشده است.</li>}
            </ul>
          </div>
        </GlassCard>
      </section>

      {/* کارت‌های بانکی */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">حساب‌های من</h2>
          <Link
            to="/accounts"
            className="flex items-center gap-1 text-xs text-brand-500 transition hover:gap-2"
          >
            مشاهده همه <ChevronLeft size={14} />
          </Link>
        </div>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-3">
          {accounts.map((account, index) => (
            <BankCard
              key={account.id}
              account={account}
              index={index}
              compact
              onClick={() => setDetail({ account, editing: false })}
              className="w-[78vw] shrink-0 snap-center sm:w-80 lg:w-auto"
            />
          ))}
          {accounts.length === 0 && (
            <GlassCard glow="51 100 255" className="w-full py-10 text-center">
              <Wallet className="mx-auto mb-3 text-brand-500" size={28} />
              <p className="text-sm font-semibold">هنوز حسابی ندارید</p>
              <p className="mt-1.5 text-xs text-dim">
                برای شروع ثبت درآمد و هزینه، اول یک حساب بسازید.
              </p>
              <Link to="/accounts" className="mt-5 inline-block">
                <Button>
                  <Plus size={16} />
                  ساخت حساب
                </Button>
              </Link>
            </GlassCard>
          )}
        </div>
      </section>

      {/* آخرین تراکنش‌ها */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold">آخرین تراکنش‌ها</h2>
          <Link
            to="/transactions"
            className="flex items-center gap-1 text-xs text-brand-500 transition hover:gap-2"
          >
            دفترچه کامل <ChevronLeft size={14} />
          </Link>
        </div>
        <GlassCard padded={false} className="p-2 sm:p-3">
          {transactions.slice(0, 8).map((transaction, index) => (
            <TransactionRow key={transaction.id} transaction={transaction} index={index} />
          ))}
          {transactions.length === 0 && (
            <p className="p-8 text-center text-sm text-dim">هنوز تراکنشی ثبت نشده است.</p>
          )}
        </GlassCard>
      </section>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail?.editing ? 'ویرایش حساب' : 'جزئیات حساب'}
        description={detail?.account.title}
      >
        {detail && (
          detail.editing ? (
            <AccountForm account={detail.account} onDone={() => setDetail(null)} />
          ) : (
            <AccountDetail
              account={detail.account}
              onEdit={() => setDetail({ account: detail.account, editing: true })}
            />
          )
        )}
      </Modal>
    </div>
  );
}

function AccountDetail({ account, onEdit }: { account: Account; onEdit: () => void }) {
  return (
    <div className="space-y-5">
      <BankCard account={account} startRevealed />

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-soft rounded-2xl px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-dim">
            <Landmark size={13} /> نوع حساب
          </p>
          <p className="mt-1.5 text-sm font-bold">{ACCOUNT_TYPE_LABEL[account.type] ?? 'حساب'}</p>
        </div>
        <div className="glass-soft rounded-2xl px-4 py-3">
          <p className="flex items-center gap-1.5 text-[11px] text-dim">
            <TrendingUp size={13} /> تراکنش‌ها
          </p>
          <p className="num mt-1.5 text-sm font-bold">{formatNumber(account.transactionCount)}</p>
        </div>
        {account.iban && (
          <div className="glass-soft col-span-2 rounded-2xl px-4 py-3">
            <p className="flex items-center gap-1.5 text-[11px] text-dim">
              <CreditCard size={13} /> شمارهٔ شبا
            </p>
            <p dir="ltr" className="num mt-1.5 text-right text-sm font-bold">{account.iban}</p>
          </div>
        )}
      </div>

      <Button onClick={onEdit} variant="soft" size="lg" className="w-full">
        <Pencil size={16} />
        ویرایش حساب
      </Button>
    </div>
  );
}
