import { useDeferredValue, useMemo, useState } from 'react';
import { ChevronDown, Filter, Loader2, Plus, Search, X } from 'lucide-react';
import { TransactionType, WorkspaceRole, type Transaction } from '../api';
import { useAuth, hasRole } from '../store/authContext';
import { useFinance } from '../store/financeContext';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { CATEGORIES, getCategory } from '../lib/categories';
import { compactNumber, cx, formatNumber, relativeDay } from '../lib/format';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Segmented } from '../components/ui/Segmented';
import { TextField, SelectField } from '../components/ui/Field';
import { SkeletonRow } from '../components/ui/Skeleton';
import { TransactionRow } from '../components/TransactionRow';
import { TransactionForm } from '../components/TransactionForm';

type TypeFilter = 'all' | 'income' | 'expense' | 'transfer';

const TYPE_MATCH: Record<TypeFilter, (tx: Transaction) => boolean> = {
  all: () => true,
  income: (tx) => tx.type === TransactionType.Income,
  expense: (tx) => tx.type === TransactionType.Expense,
  transfer: (tx) => tx.type === TransactionType.Transfer,
};

export function Transactions() {
  const {
    transactions, accounts, loading, loadingMore, hasMore, totalTransactions,
    loadMore, removeTransaction,
  } = useFinance();
  const { activeWorkspace } = useAuth();

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const canEdit = hasRole(activeWorkspace?.role, WorkspaceRole.Accountant);

  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      if (!TYPE_MATCH[typeFilter](tx)) return false;
      if (categoryFilter !== 'all' && getCategory(tx.category).key !== categoryFilter) return false;
      if (
        accountFilter !== 'all' &&
        tx.sourceAccountId !== accountFilter &&
        tx.destinationAccountId !== accountFilter
      ) {
        return false;
      }
      if (!needle) return true;
      const haystack = `${tx.description ?? ''} ${getCategory(tx.category).label} ${tx.amount}`;
      return haystack.toLowerCase().includes(needle);
    });
  }, [transactions, deferredQuery, typeFilter, categoryFilter, accountFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const tx of filtered) {
      const key = relativeDay(tx.occurredAt);
      const bucket = map.get(key) ?? [];
      bucket.push(tx);
      map.set(key, bucket);
    }
    return [...map.entries()];
  }, [filtered]);

  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of filtered) {
      if (tx.type === TransactionType.Income) income += tx.amount;
      else if (tx.type === TransactionType.Expense) expense += tx.amount;
    }
    return { income, expense, count: filtered.length };
  }, [filtered]);

  const activeFilters =
    (typeFilter !== 'all' ? 1 : 0) +
    (categoryFilter !== 'all' ? 1 : 0) +
    (accountFilter !== 'all' ? 1 : 0);

  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter('all');
    setAccountFilter('all');
  };

  return (
    <div className="space-y-5">
      {/* نوار جستجو و فیلتر */}
      <GlassCard className="animate-[rise_.5s_cubic-bezier(.16,1,.3,1)_both]">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-52 flex-1">
            <TextField
              placeholder="جستجو در توضیحات، دسته یا مبلغ…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              icon={<Search size={16} />}
            />
          </div>

          <Segmented
            className="w-full sm:w-72"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'all', label: 'همه' },
              { value: 'income', label: 'درآمد', rgb: '16 185 129' },
              { value: 'expense', label: 'هزینه', rgb: '244 63 94' },
              { value: 'transfer', label: 'انتقال', rgb: '51 100 255' },
            ]}
          />

          <Button variant="soft" onClick={() => setFiltersOpen(true)} className="relative">
            <Filter size={16} />
            فیلتر
            {activeFilters > 0 && (
              <span className="num absolute -top-1.5 -left-1.5 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] text-white">
                {formatNumber(activeFilters)}
              </span>
            )}
          </Button>

          <Button onClick={() => setFormOpen(true)}>
            <Plus size={16} />
            ثبت جدید
          </Button>
        </div>

        {/* خلاصهٔ نتایج */}
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-500/10 pt-4 text-xs">
          <span className="text-dim">
            <span className="num font-semibold text-[var(--text-strong)]">
              {formatNumber(summary.count)}
            </span>{' '}
            تراکنش
            {/* تفاوت این دو عدد یعنی هنوز صفحه‌های بعدی بارگذاری نشده‌اند */}
            {totalTransactions > transactions.length && (
              <span className="num text-dim"> از {formatNumber(totalTransactions)}</span>
            )}
          </span>
          <span className="num text-emerald-500">+ {compactNumber(summary.income)}</span>
          <span className="num text-rose-500">− {compactNumber(summary.expense)}</span>
          {activeFilters > 0 && (
            <button
              onClick={resetFilters}
              className="mr-auto flex items-center gap-1 text-dim transition hover:text-rose-500"
            >
              <X size={13} /> حذف فیلترها
            </button>
          )}
        </div>
      </GlassCard>

      {/* فهرست */}
      {loading ? (
        <GlassCard padded={false} className="space-y-1 p-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </GlassCard>
      ) : grouped.length === 0 ? (
        <GlassCard className="py-16 text-center">
          <Search className="mx-auto mb-3 text-dim" size={28} />
          <p className="text-sm text-dim">تراکنشی با این مشخصات پیدا نشد.</p>
        </GlassCard>
      ) : (
        <div className="space-y-5">
          {grouped.map(([day, items]) => {
            const dayTotal = items.reduce(
              (acc, tx) =>
                tx.type === TransactionType.Income
                  ? acc + tx.amount
                  : tx.type === TransactionType.Expense
                    ? acc - tx.amount
                    : acc,
              0,
            );
            return (
              <section key={day}>
                <div className="mb-2 flex items-center justify-between px-2">
                  <h3 className="text-xs font-semibold text-dim">{day}</h3>
                  <span
                    className={cx(
                      'num text-xs font-semibold',
                      dayTotal >= 0 ? 'text-emerald-500' : 'text-rose-500',
                    )}
                  >
                    {dayTotal >= 0 ? '+' : '−'} {compactNumber(dayTotal)}
                  </span>
                </div>
                <GlassCard padded={false} className="p-2 sm:p-3">
                  {items.map((transaction, index) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                      index={index}
                      onEdit={canEdit ? setEditing : undefined}
                      onDelete={canEdit ? setDeleting : undefined}
                    />
                  ))}
                </GlassCard>
              </section>
            );
          })}

          {hasMore && (
            <div className="pt-2 text-center">
              <Button variant="soft" size="lg" onClick={() => void loadMore()} disabled={loadingMore}>
                {loadingMore ? <Loader2 size={17} className="animate-spin" /> : <ChevronDown size={17} />}
                بارگذاری تراکنش‌های قدیمی‌تر
              </Button>
              <p className="num mt-2.5 text-[11px] text-dim">
                {formatNumber(transactions.length)} از {formatNumber(totalTransactions)} تراکنش
                بارگذاری شده
              </p>
            </div>
          )}
        </div>
      )}

      {/* پنجرهٔ فیلتر */}
      <Modal open={filtersOpen} onClose={() => setFiltersOpen(false)} title="فیلتر پیشرفته">
        <div className="space-y-4">
          <SelectField
            label="دسته‌بندی"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="all">همهٔ دسته‌ها</option>
            {CATEGORIES.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </SelectField>

          <SelectField
            label="حساب"
            value={accountFilter}
            onChange={(event) => setAccountFilter(event.target.value)}
          >
            <option value="all">همهٔ حساب‌ها</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.title}</option>
            ))}
          </SelectField>

          <div className="flex gap-3 pt-2">
            <Button variant="soft" className="flex-1" onClick={resetFilters}>
              بازنشانی
            </Button>
            <Button className="flex-1" onClick={() => setFiltersOpen(false)}>
              اعمال فیلتر
            </Button>
          </div>
        </div>
      </Modal>

      {/* پنجرهٔ ثبت */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="ثبت تراکنش">
        <TransactionForm onDone={() => setFormOpen(false)} />
      </Modal>

      {/* پنجرهٔ ویرایش */}
      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="ویرایش تراکنش"
        description="موجودی حساب‌ها خودکار اصلاح می‌شود"
      >
        {editing && <TransactionForm transaction={editing} onDone={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeTransaction(deleting!.id)}
        title="حذف تراکنش"
        confirmLabel="حذف کن"
        description={
          <>
            مبلغ{' '}
            <span className="num font-bold">{formatNumber(deleting?.amount ?? 0)}</span>{' '}
            به موجودی حساب برمی‌گردد و تراکنش از فهرست حذف می‌شود.
          </>
        }
      />
    </div>
  );
}
