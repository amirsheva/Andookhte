import { useState, type FormEvent } from 'react';
import { ArrowLeftRight, Landmark, Pencil, Plus, Sparkles, TrendingUp, Trash2 } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL, WorkspaceRole, type Account } from '../api';
import { ActionMenu } from '../components/ui/ActionMenu';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useAuth, hasRole } from '../store/authContext';
import { useFinance } from '../store/financeContext';
import { AccountForm } from '../components/AccountForm';
import { sumBalance } from '../lib/analytics';
import { compactNumber, currencyLabel, formatNumber, toEn } from '../lib/format';
import { detectBank } from '../lib/banks';
import { BankCard } from '../components/BankCard';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { SelectField, TextField } from '../components/ui/Field';
import { AnimatedNumber } from '../components/ui/AnimatedNumber';
import { Skeleton } from '../components/ui/Skeleton';

export function Accounts() {
  const { accounts, loading, transfer, removeAccount } = useFinance();
  const { activeWorkspace } = useAuth();
  const [transferOpen, setTransferOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);

  const canEdit = hasRole(activeWorkspace?.role, WorkspaceRole.Accountant);
  const currency = currencyLabel(accounts[0]?.currencyCode ?? activeWorkspace?.currencyCode);
  const total = sumBalance(accounts);

  if (loading) {
    return (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="aspect-[1.66/1] rounded-4xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* خلاصه */}
      <GlassCard glow="51 100 255" className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_both]">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs text-dim">مجموع موجودی همهٔ حساب‌ها</p>
            <AnimatedNumber
              value={total}
              suffix={currency}
              className="mt-2 block text-3xl font-extrabold glow-brand sm:text-4xl"
            />
            <p className="num mt-2 text-[11px] text-dim">
              {formatNumber(accounts.length)} حساب · معادل {compactNumber(total)}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {canEdit && (
              <Button onClick={() => setCreateOpen(true)} size="lg">
                <Plus size={17} />
                حساب جدید
              </Button>
            )}
            <Button
              onClick={() => setTransferOpen(true)}
              size="lg"
              variant="soft"
              disabled={accounts.length < 2}
              title={accounts.length < 2 ? 'انتقال به دست‌کم دو حساب نیاز دارد' : undefined}
            >
              <ArrowLeftRight size={17} />
              انتقال وجه
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* کارت‌ها */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {accounts.map((account, index) => {
          const brand = detectBank(account.cardNumber, account.bankName);
          const inUse = account.transactionCount > 0;

          return (
            <div key={account.id} className="space-y-3">
              <BankCard account={account} index={index} />
              <div className="flex items-center justify-between gap-2 px-2 text-[11px] text-dim">
                <span className="flex items-center gap-1.5">
                  <Landmark size={13} style={{ color: brand.accent }} />
                  {ACCOUNT_TYPE_LABEL[account.type] ?? 'حساب'}
                </span>
                <span className="num flex items-center gap-1.5">
                  <TrendingUp size={13} />
                  {formatNumber(account.transactionCount)} تراکنش
                </span>
                {canEdit && (
                  <ActionMenu
                    label={`عملیات ${account.title}`}
                    items={[
                      {
                        key: 'edit',
                        label: 'ویرایش',
                        icon: <Pencil size={14} />,
                        onSelect: () => setEditing(account),
                      },
                      {
                        key: 'delete',
                        label: 'حذف',
                        icon: <Trash2 size={14} />,
                        tone: 'danger',
                        // حذف حسابی که تراکنش دارد تاریخچه را بی‌معنا می‌کند؛
                        // سرور هم آن را رد می‌کند، اینجا فقط زودتر گفته می‌شود
                        disabled: inUse,
                        disabledHint: 'این حساب در تراکنش‌ها استفاده شده است.',
                        onSelect: () => setDeleting(account),
                      },
                    ]}
                  />
                )}
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && (
          <GlassCard glow="51 100 255" className="col-span-full py-14 text-center">
            <span className="animate-float mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-[0_18px_40px_-16px_rgb(51_100_255/.9)]">
              <Sparkles size={26} />
            </span>
            <h3 className="mt-5 text-base font-bold">اولین حسابتان را بسازید</h3>
            <p className="mx-auto mt-2 max-w-sm text-xs leading-relaxed text-dim">
              برای ثبت درآمد و هزینه، دست‌کم یک حساب لازم است. کارت بانکی، کیف پول نقدی یا
              صندوق پس‌انداز — هرکدام که با آن شروع می‌کنید.
            </p>
            {canEdit ? (
              <Button onClick={() => setCreateOpen(true)} size="lg" className="mt-6">
                <Plus size={17} />
                ساخت حساب
              </Button>
            ) : (
              <p className="mt-5 text-xs text-dim">
                نقش شما اجازهٔ ساخت حساب ندارد — از مدیر فضای کاری بخواهید.
              </p>
            )}
          </GlassCard>
        )}
      </div>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="حساب جدید"
        description="کارت را همین‌جا زنده می‌بینید"
      >
        <AccountForm onDone={() => setCreateOpen(false)} />
      </Modal>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title="ویرایش حساب"
        description={editing?.title}
      >
        {editing && <AccountForm account={editing} onDone={() => setEditing(null)} />}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        onConfirm={() => removeAccount(deleting!.id)}
        title="حذف حساب"
        confirmLabel="حذف کن"
        description={
          <>
            حساب «{deleting?.title}» حذف می‌شود. این کار قابل بازگشت نیست.
          </>
        }
      />

      <TransferModal open={transferOpen} onClose={() => setTransferOpen(false)} onSubmit={transfer} />
    </div>
  );
}

interface TransferModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: {
    amount: number;
    sourceAccountId: string;
    destinationAccountId: string;
    description?: string;
  }) => Promise<void>;
}

function TransferModal({ open, onClose, onSubmit }: TransferModalProps) {
  const { accounts } = useFinance();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState(accounts[0]?.id ?? '');
  const [destination, setDestination] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const numeric = Number(toEn(amount).replace(/[^\d]/g, ''));
  const sourceAccount = accounts.find((a) => a.id === source);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!numeric) return setError('مبلغ را وارد کنید.');
    if (source === destination) return setError('حساب مبدأ و مقصد یکسان است.');
    if (sourceAccount && numeric > sourceAccount.currentBalance) {
      return setError('موجودی حساب مبدأ کافی نیست.');
    }

    setBusy(true);
    try {
      await onSubmit({
        amount: numeric,
        sourceAccountId: source,
        destinationAccountId: destination,
        description: description || 'انتقال بین حساب',
      });
      setAmount('');
      setDescription('');
      onClose();
    } catch {
      setError('انتقال با خطا مواجه شد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="انتقال وجه" description="جابه‌جایی موجودی بین حساب‌های شما">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="از حساب" value={source} onChange={(e) => setSource(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.title}</option>
            ))}
          </SelectField>
          <SelectField label="به حساب" value={destination} onChange={(e) => setDestination(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>{account.title}</option>
            ))}
          </SelectField>
        </div>

        <TextField
          label="مبلغ"
          inputMode="numeric"
          placeholder="۰"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          suffix={currencyLabel(sourceAccount?.currencyCode)}
          hint={
            sourceAccount
              ? `موجودی قابل برداشت: ${formatNumber(sourceAccount.currentBalance)}`
              : undefined
          }
        />

        <TextField
          label="توضیحات"
          placeholder="اختیاری"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          <ArrowLeftRight size={17} />
          انجام انتقال
        </Button>
      </form>
    </Modal>
  );
}
