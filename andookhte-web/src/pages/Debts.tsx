import { useMemo, useState } from 'react';
import {
  Plus, ChevronRight, ChevronLeft, Landmark, Check, Trash2, Pencil,
  CalendarPlus, ArrowDownCircle, ArrowUpCircle, Undo2,
} from 'lucide-react';
import {
  DebtDirection, DebtRecurrenceType, DEBT_DIRECTION_LABEL, DEBT_RECURRENCE_LABEL,
  InstallmentStatus, readErrorMessage, type Debt as DebtRecord, type Installment,
} from '../api';
import { useAuth } from '../store/authContext';
import { useDebts } from '../store/debtsContext';
import { useFinance } from '../store/financeContext';
import { useToast } from '../store/toastContext';
import {
  addMonths, JALALI_WEEKDAY_SHORT, jalaliKeyOf, jalaliKeyOfUtcDate, jalaliOfDate,
  monthGridDays, sameMonth, todayJalali, type JalaliYm,
} from '../lib/jalali';
import { currencyLabel, cx, formatDate, formatNumber, persianMonthName, toEn, toFa } from '../lib/format';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { SelectField, TextField } from '../components/ui/Field';
import { ActionMenu, type ActionMenuItem } from '../components/ui/ActionMenu';
import { Skeleton } from '../components/ui/Skeleton';
import { DebtForm } from '../components/DebtForm';

type Entry = { debt: DebtRecord; installment: Installment };

export function Debts() {
  const { debts, loading, error, removeDebt, extendDebt } = useDebts();
  const { accounts } = useFinance();
  const { activeWorkspace } = useAuth();

  const [createOpen, setCreateOpen] = useState(false);
  const [month, setMonth] = useState<JalaliYm>(todayJalali());
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DebtRecord | null>(null);

  const currency = currencyLabel(accounts[0]?.currencyCode ?? activeWorkspace?.currencyCode);

  const allEntries = useMemo<Entry[]>(
    () => debts.flatMap((debt) => debt.installments.map((installment) => ({ debt, installment }))),
    [debts],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, Entry[]>();
    for (const entry of allEntries) {
      const key = jalaliKeyOfUtcDate(entry.installment.dueDateUtc);
      const list = map.get(key) ?? [];
      list.push(entry);
      map.set(key, list);
    }
    return map;
  }, [allEntries]);

  const selectedEntries = selectedDayKey ? byDay.get(selectedDayKey) ?? [] : [];

  const pendingTotal = (direction: number) =>
    allEntries
      .filter((e) => e.installment.status === InstallmentStatus.Pending && e.debt.direction === direction)
      .reduce((sum, e) => sum + e.installment.amount, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-4xl" />
        <Skeleton className="aspect-square rounded-4xl sm:aspect-video" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold lg:hidden">بدهی و طلب</h1>
          <p className="mt-1 text-xs text-dim lg:mt-0">وام، قرض، اقساط و صورت‌حساب‌های تکرارشونده</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={17} />
          بدهی/طلب جدید
        </Button>
      </div>

      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-500">{error}</p>}

      <div className="grid gap-5 sm:grid-cols-2">
        <GlassCard glow="244 63 94">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-dim">مجموع بدهی در انتظار</p>
              <p className="num mt-2 text-2xl font-extrabold text-rose-500">
                {formatNumber(pendingTotal(DebtDirection.Payable))}{' '}
                <span className="text-sm text-dim">{currency}</span>
              </p>
            </div>
            <ArrowUpCircle className="text-rose-500" size={28} />
          </div>
        </GlassCard>
        <GlassCard glow="16 185 129">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-dim">مجموع طلب در انتظار</p>
              <p className="num mt-2 text-2xl font-extrabold text-emerald-500">
                {formatNumber(pendingTotal(DebtDirection.Receivable))}{' '}
                <span className="text-sm text-dim">{currency}</span>
              </p>
            </div>
            <ArrowDownCircle className="text-emerald-500" size={28} />
          </div>
        </GlassCard>
      </div>

      <CalendarCard month={month} onChangeMonth={setMonth} byDay={byDay} onSelectDay={setSelectedDayKey} />

      <div className="space-y-3">
        <h2 className="text-sm font-bold">همهٔ بدهی‌ها و طلب‌ها</h2>
        {debts.length === 0 ? (
          <GlassCard className="py-14 text-center">
            <Landmark className="mx-auto mb-4 text-brand-500" size={30} />
            <p className="text-sm font-semibold">هنوز بدهی یا طلبی ثبت نشده</p>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              وام، قرضی که داده‌اید یا صورت‌حساب تکرارشونده مثل شارژ ساختمان را همین‌جا ثبت کنید.
            </p>
          </GlassCard>
        ) : (
          debts.map((debt) => (
            <DebtCard
              key={debt.id}
              debt={debt}
              currency={currency}
              onDelete={() => setDeleting(debt)}
              onExtend={() => void extendDebt(debt.id, 6)}
            />
          ))
        )}
      </div>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="بدهی/طلب جدید" width="max-w-xl">
        <DebtForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={selectedDayKey !== null}
        onClose={() => setSelectedDayKey(null)}
        title="اقساط این روز"
        description={selectedEntries[0] ? formatDate(selectedEntries[0].installment.dueDateUtc) : undefined}
      >
        <DayDetail entries={selectedEntries} currency={currency} onDone={() => setSelectedDayKey(null)} />
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeDebt(deleting!.id)}
        title="حذف بدهی/طلب"
        confirmLabel="حذف کن"
        description={<>«{deleting?.title}» حذف می‌شود. این کار قابل بازگشت نیست.</>}
      />
    </div>
  );
}

/* ————————————————— تقویم ————————————————— */

function CalendarCard({
  month, onChangeMonth, byDay, onSelectDay,
}: {
  month: JalaliYm;
  onChangeMonth: (month: JalaliYm) => void;
  byDay: Map<string, Entry[]>;
  onSelectDay: (key: string) => void;
}) {
  const days = useMemo(() => monthGridDays(month.jy, month.jm), [month.jy, month.jm]);
  const isCurrentMonth = sameMonth(month, todayJalali());
  const todayJd = jalaliOfDate(new Date()).jd;

  return (
    <GlassCard className="mx-auto max-w-xl">
      <div className="mb-5 flex items-center justify-between">
        {/* راست = ماه قبل، چپ = ماه بعد؛ هم‌جهت با فلش‌های رفت‌وبرگشت در بقیهٔ اپ */}
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, -1))}
          aria-label="ماه قبل"
          className="grid h-9 w-9 place-items-center rounded-xl text-dim transition hover:bg-slate-500/10 hover:text-[var(--text-strong)]"
        >
          <ChevronRight size={18} />
        </button>
        <p className="num text-sm font-bold">
          {persianMonthName(month.jm)} {toFa(month.jy)}
        </p>
        <button
          type="button"
          onClick={() => onChangeMonth(addMonths(month, 1))}
          aria-label="ماه بعد"
          className="grid h-9 w-9 place-items-center rounded-xl text-dim transition hover:bg-slate-500/10 hover:text-[var(--text-strong)]"
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] text-dim">
        {JALALI_WEEKDAY_SHORT.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="mt-1.5 grid grid-cols-7 gap-1.5">
        {days.map((day, index) => {
          if (day === null) return <span key={`empty-${index}`} />;

          const key = jalaliKeyOf(month.jy, month.jm, day);
          const entries = byDay.get(key) ?? [];
          const isToday = isCurrentMonth && day === todayJd;
          const hasPayable = entries.some(
            (e) => e.installment.status === InstallmentStatus.Pending && e.debt.direction === DebtDirection.Payable,
          );
          const hasReceivable = entries.some(
            (e) => e.installment.status === InstallmentStatus.Pending && e.debt.direction === DebtDirection.Receivable,
          );

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay(key)}
              disabled={entries.length === 0}
              className={cx(
                // ارتفاع ثابت عمداً به‌جای aspect-square — ستون‌های یک شبکهٔ عریض
                // (دسکتاپ/تبلت) خیلی پهن می‌شوند و مربع‌کردن سلول باعث فضای خالی
                // عمودی زیاد می‌شد.
                'num flex h-11 flex-col items-center justify-center gap-1 rounded-xl text-xs transition disabled:cursor-default sm:h-12',
                isToday && 'font-bold text-brand-500 ring-1 ring-inset ring-brand-400/50',
                entries.length > 0 ? 'glass-soft hover:scale-105' : 'text-[var(--text-strong)]',
              )}
            >
              {toFa(day)}
              {(hasPayable || hasReceivable) && (
                <span className="flex gap-0.5">
                  {hasPayable && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                  {hasReceivable && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </GlassCard>
  );
}

/* ————————————————— جزئیات یک روز ————————————————— */

function DayDetail({ entries, currency, onDone }: { entries: Entry[]; currency: string; onDone: () => void }) {
  if (entries.length === 0) {
    return <p className="py-6 text-center text-xs text-dim">قسطی برای این روز نیست.</p>;
  }

  return (
    <div className="space-y-4">
      {entries.map(({ debt, installment }) => (
        <div key={installment.id}>
          <p className="mb-1.5 px-1 text-xs font-bold">
            {debt.title} <span className="font-normal text-dim">· {DEBT_DIRECTION_LABEL[debt.direction]}</span>
          </p>
          <InstallmentRow installment={installment} currency={currency} />
        </div>
      ))}
      <Button variant="soft" className="w-full" onClick={onDone}>بستن</Button>
    </div>
  );
}

/* ————————————————— کارت یک بدهی/طلب ————————————————— */

function DebtCard({
  debt, currency, onDelete, onExtend,
}: {
  debt: DebtRecord;
  currency: string;
  onDelete: () => void;
  onExtend: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const paidCount = debt.installments.filter((i) => i.status === InstallmentStatus.Paid).length;
  const total = debt.installments.length;
  const pendingTotal = debt.installments
    .filter((i) => i.status === InstallmentStatus.Pending)
    .reduce((sum, i) => sum + i.amount, 0);
  const isPayable = debt.direction === DebtDirection.Payable;
  const canDelete = debt.installments.every((i) => i.status !== InstallmentStatus.Paid);

  const items: ActionMenuItem[] = [];
  if (debt.recurrenceType === DebtRecurrenceType.Monthly) {
    items.push({ key: 'extend', label: 'افزودن ۶ ماه دیگر', icon: <CalendarPlus size={14} />, onSelect: onExtend });
  }
  items.push({
    key: 'delete',
    label: 'حذف',
    icon: <Trash2 size={14} />,
    tone: 'danger',
    disabled: !canDelete,
    disabledHint: 'قسط پرداخت‌شده دارد.',
    onSelect: onDelete,
  });

  return (
    <GlassCard>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-w-0 flex-1 items-center gap-3 text-right"
        >
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
            style={{ background: isPayable ? 'rgb(244 63 94 / .14)' : 'rgb(16 185 129 / .14)' }}
          >
            <Landmark size={18} style={{ color: isPayable ? 'rgb(244 63 94)' : 'rgb(16 185 129)' }} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{debt.title}</p>
            <p className="mt-0.5 truncate text-[11px] text-dim">
              {DEBT_DIRECTION_LABEL[debt.direction]} · {DEBT_RECURRENCE_LABEL[debt.recurrenceType]}
              {debt.counterpartyName && ` · ${debt.counterpartyName}`}
              {total > 1 && ` · ${formatNumber(paidCount)} از ${formatNumber(total)}`}
            </p>
          </div>
        </button>

        <div className="shrink-0 text-left">
          <p className="num text-sm font-bold">{formatNumber(pendingTotal)}</p>
          <p className="text-[10px] text-dim">{currency} باقی‌مانده</p>
        </div>

        <ActionMenu label={`عملیات ${debt.title}`} align="end" items={items} />
      </div>

      {expanded && (
        <div className="mt-4 space-y-2.5 border-t border-slate-500/10 pt-4">
          {debt.installments.map((installment) => (
            <InstallmentRow key={installment.id} installment={installment} currency={currency} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

/* ————————————————— یک ردیف قسط: مشاهده / اصلاح مبلغ / ثبت پرداخت ————————————————— */

function InstallmentRow({ installment, currency }: { installment: Installment; currency: string }) {
  const { updateInstallment, payInstallment, revertInstallment } = useDebts();
  const { accounts } = useFinance();
  const { showToast } = useToast();

  const [mode, setMode] = useState<'view' | 'edit' | 'pay'>('view');
  const [amount, setAmount] = useState(String(installment.amount));
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPaid = installment.status === InstallmentStatus.Paid;

  const handleSaveAmount = async () => {
    setError(null);
    const numeric = Number(toEn(amount).replace(/[^\d]/g, ''));
    if (!numeric || numeric <= 0) return setError('مبلغ معتبر وارد کنید.');

    setBusy(true);
    try {
      await updateInstallment(installment.id, numeric);
      setMode('view');
    } catch (err) {
      setError(readErrorMessage(err, 'اصلاح مبلغ با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async () => {
    setError(null);
    if (!accountId) return setError('حساب را انتخاب کنید.');

    setBusy(true);
    try {
      await payInstallment(installment.id, accountId);
      showToast(`قسط ${formatNumber(installment.amount)} ${currency} پرداخت‌شده ثبت شد`);
      setMode('view');
    } catch (err) {
      setError(readErrorMessage(err, 'ثبت پرداخت با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRevert = async () => {
    setError(null);
    setBusy(true);
    try {
      await revertInstallment(installment.id);
    } catch (err) {
      setError(readErrorMessage(err, 'بازگرداندن با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-soft rounded-2xl px-3.5 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium">
            قسط {formatNumber(installment.sequenceNumber)}
            <span className="mr-2 text-[10px] text-dim">{formatDate(installment.dueDateUtc)}</span>
          </p>
          {mode !== 'edit' && (
            <p className="num mt-1 text-sm font-bold">
              {formatNumber(installment.amount)} <span className="text-[10px] font-normal text-dim">{currency}</span>
            </p>
          )}
        </div>

        {mode === 'view' && (
          <div className="flex shrink-0 items-center gap-1.5">
            {isPaid ? (
              <>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold text-emerald-500">
                  پرداخت‌شده
                </span>
                <button
                  type="button"
                  onClick={() => void handleRevert()}
                  title="بازگرداندن به در انتظار"
                  className="grid h-8 w-8 place-items-center rounded-lg text-dim transition hover:bg-slate-500/10"
                >
                  <Undo2 size={14} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setMode('edit')}
                  title="اصلاح مبلغ"
                  className="grid h-8 w-8 place-items-center rounded-lg text-dim transition hover:bg-slate-500/10"
                >
                  <Pencil size={13} />
                </button>
                <Button size="sm" onClick={() => setMode('pay')}>ثبت پرداخت</Button>
              </>
            )}
          </div>
        )}
      </div>

      {mode === 'edit' && (
        <div className="mt-3 flex items-end gap-2">
          <TextField
            label="مبلغ تازه"
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            suffix={currency}
            className="flex-1"
          />
          <Button size="sm" loading={busy} onClick={() => void handleSaveAmount()}>
            <Check size={14} />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode('view')}>انصراف</Button>
        </div>
      )}

      {mode === 'pay' && (
        <div className="mt-3 space-y-2.5">
          <SelectField
            label="از/به کدام حساب"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.title}</option>
            ))}
          </SelectField>
          <div className="flex gap-2">
            <Button size="sm" loading={busy} onClick={() => void handlePay()} className="flex-1">
              تأیید پرداخت
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode('view')}>انصراف</Button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}
