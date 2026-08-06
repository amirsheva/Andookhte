import { useMemo, useState } from 'react';
import { Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useFinance } from '../store/financeContext';
import {
  byCategory, computeTotals, dailySeries, excludeForeignUnitTransactions, monthlySeries, withinDays,
} from '../lib/analytics';
import { compactNumber, currencyLabel, cx, formatNumber } from '../lib/format';
import { GlassCard } from '../components/ui/GlassCard';
import { Segmented } from '../components/ui/Segmented';
import { Skeleton } from '../components/ui/Skeleton';
import { StatCard } from '../components/StatCard';
import { DonutChart } from '../components/charts/DonutChart';
import { TrendChart } from '../components/charts/TrendChart';
import { BarsChart } from '../components/charts/BarsChart';

export function Analytics() {
  const { accounts, transactions, loading } = useFinance();
  const [range, setRange] = useState(90);
  const [kind, setKind] = useState<'expense' | 'income'>('expense');

  const rialTransactions = useMemo(
    () => excludeForeignUnitTransactions(transactions, accounts),
    [transactions, accounts],
  );
  const scoped = useMemo(() => withinDays(rialTransactions, range), [rialTransactions, range]);
  const totals = useMemo(() => computeTotals(accounts, scoped), [accounts, scoped]);
  const slices = useMemo(() => byCategory(scoped, kind, 8), [scoped, kind]);
  const daily = useMemo(() => dailySeries(rialTransactions, range), [rialTransactions, range]);
  const monthly = useMemo(() => monthlySeries(rialTransactions, 6), [rialTransactions]);
  const currency = currencyLabel('IRR');

  const savingRate = totals.income > 0 ? (totals.net / totals.income) * 100 : 0;
  const dailyAverage = totals.expense / Math.max(1, range);

  const busiest = useMemo(
    () => [...daily].sort((a, b) => b.expense - a.expense)[0],
    [daily],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-4xl" />
        <Skeleton className="h-80 rounded-4xl" />
        <Skeleton className="h-72 rounded-4xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* بازه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">تحلیل مالی</h2>
          <p className="mt-0.5 text-[11px] text-dim">
            بررسی الگوی خرج‌کرد در {formatNumber(range)} روز گذشته
          </p>
        </div>
        <Segmented
          size="sm"
          className="w-56"
          value={range}
          onChange={setRange}
          options={[
            { value: 30, label: '۱ ماه' },
            { value: 90, label: '۳ ماه' },
            { value: 180, label: '۶ ماه' },
          ]}
        />
      </div>

      {/* شاخص‌ها */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          index={0}
          label="نرخ پس‌انداز"
          value={Math.round(savingRate)}
          suffix="٪"
          icon={Target}
          rgb={savingRate >= 20 ? '16 185 129' : savingRate >= 0 ? '245 158 11' : '244 63 94'}
          hint={
            savingRate >= 20 ? 'وضعیت مطلوب' : savingRate >= 0 ? 'قابل بهبود' : 'کسری بودجه'
          }
        />
        <StatCard
          index={1}
          label="میانگین هزینه روزانه"
          value={Math.round(dailyAverage)}
          suffix={currency}
          icon={Scale}
          rgb="168 85 247"
          compact
        />
        <StatCard
          index={2}
          label="کل درآمد دوره"
          value={totals.income}
          suffix={currency}
          icon={TrendingUp}
          rgb="16 185 129"
          compact
        />
        <StatCard
          index={3}
          label="کل هزینه دوره"
          value={totals.expense}
          suffix={currency}
          icon={TrendingDown}
          rgb="244 63 94"
          compact
          hint={busiest ? `پرهزینه‌ترین روز: ${busiest.label}` : undefined}
        />
      </section>

      {/* روند */}
      <GlassCard className="animate-[rise_.65s_cubic-bezier(.16,1,.3,1)_.1s_both]">
        <div className="mb-5">
          <h3 className="text-base font-bold">جریان نقدی</h3>
          <p className="mt-0.5 text-[11px] text-dim">مقایسهٔ روزانهٔ ورودی و خروجی</p>
        </div>
        <TrendChart
          height={280}
          labels={daily.map((point) => point.label)}
          series={[
            { key: 'income', label: 'درآمد', rgb: '16 185 129', values: daily.map((p) => p.income) },
            { key: 'expense', label: 'هزینه', rgb: '244 63 94', values: daily.map((p) => p.expense) },
          ]}
        />
      </GlassCard>

      {/* دسته‌بندی + مقایسه ماهانه */}
      <section className="grid gap-5 xl:grid-cols-2">
        <GlassCard className="animate-[rise_.65s_cubic-bezier(.16,1,.3,1)_.16s_both]">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold">تفکیک بر اساس دسته</h3>
            <Segmented
              size="sm"
              className="w-40"
              value={kind}
              onChange={setKind}
              options={[
                { value: 'expense', label: 'هزینه', rgb: '244 63 94' },
                { value: 'income', label: 'درآمد', rgb: '16 185 129' },
              ]}
            />
          </div>

          <div className="flex flex-col items-center gap-7 lg:flex-row lg:items-start">
            <DonutChart data={slices} size={230} centerLabel="مجموع" currency={currency} />
            <ul className="w-full flex-1 space-y-2.5">
              {slices.map((slice) => (
                <li key={slice.key}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: `rgb(${slice.rgb})`, boxShadow: `0 0 10px rgb(${slice.rgb} / .8)` }}
                      />
                      <span className="truncate">{slice.label}</span>
                      <span className="num shrink-0 text-[10px] text-dim">
                        ({formatNumber(slice.count)})
                      </span>
                    </span>
                    <span className="num shrink-0 font-semibold">{compactNumber(slice.value)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-500/12">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, slice.share * 100)}%`,
                        background: `linear-gradient(to left, rgb(${slice.rgb}), rgb(${slice.rgb} / .5))`,
                        animation: 'fade-in .8s ease-out both',
                      }}
                    />
                  </div>
                </li>
              ))}
              {slices.length === 0 && <li className="text-xs text-dim">داده‌ای برای این بازه نیست.</li>}
            </ul>
          </div>
        </GlassCard>

        <GlassCard className="animate-[rise_.65s_cubic-bezier(.16,1,.3,1)_.22s_both]">
          <div className="mb-6">
            <h3 className="text-base font-bold">مقایسهٔ ماه‌ها</h3>
            <p className="mt-0.5 text-[11px] text-dim">شش ماه اخیر شمسی</p>
          </div>
          <BarsChart
            height={230}
            groups={monthly.map((month) => ({
              key: month.key,
              label: month.label,
              values: [
                { key: 'income', label: 'درآمد', value: month.income, rgb: '16 185 129' },
                { key: 'expense', label: 'هزینه', value: month.expense, rgb: '244 63 94' },
              ],
            }))}
          />

          <div className="mt-6 space-y-2 border-t border-slate-500/10 pt-5">
            {monthly.slice(-3).reverse().map((month) => (
              <div key={month.key} className="flex items-center justify-between text-xs">
                <span className="text-dim">{month.label}</span>
                <span
                  className={cx(
                    'num font-semibold',
                    month.net >= 0 ? 'text-emerald-500' : 'text-rose-500',
                  )}
                >
                  {month.net >= 0 ? '+' : '−'} {compactNumber(month.net)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
