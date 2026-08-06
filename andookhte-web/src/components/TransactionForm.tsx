import { useMemo, useState, type FormEvent } from 'react';
import { Check, Plus, Wallet } from 'lucide-react';
import { Link } from '../router/Link';
import { AccountType, TransactionType, readErrorMessage, type Transaction } from '../api';
import { useFinance } from '../store/financeContext';
import { useToast } from '../store/toastContext';
import { expenseCategories, getCategory, incomeCategories } from '../lib/categories';
import { accountUnitSuffix, isForeignUnitAccount } from '../lib/analytics';
import { compactNumber, cx, formatNumber, toEn } from '../lib/format';
import { Button } from './ui/Button';
import { SelectField, TextField } from './ui/Field';
import { Segmented } from './ui/Segmented';

const QUICK_AMOUNTS = [500_000, 1_000_000, 5_000_000, 10_000_000];

interface TransactionFormProps {
  onDone?: () => void;
  defaultType?: number;
  /** اگر داده شود فرم در حالت ویرایش کار می‌کند. */
  transaction?: Transaction;
}

export function TransactionForm({
  onDone,
  defaultType = TransactionType.Expense,
  transaction,
}: TransactionFormProps) {
  const { accounts, addTransaction, editTransaction, accountById } = useFinance();
  const { showToast } = useToast();

  const isEdit = transaction !== undefined;

  const [type, setType] = useState<number>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(
    transaction ? formatNumber(transaction.amount).replace(/[^\d۰-۹]/g, '') : '',
  );
  const [sourceId, setSourceId] = useState(transaction?.sourceAccountId ?? '');
  const [destinationId, setDestinationId] = useState(transaction?.destinationAccountId ?? '');
  const [category, setCategory] = useState(
    transaction?.category ? getCategory(transaction.category).key : '',
  );
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const primaryAccount = accounts[0]?.id ?? '';
  const effectiveSource = sourceId || primaryAccount;
  const effectiveDestination = destinationId || accounts[1]?.id || primaryAccount;

  const categories = useMemo(
    () => (type === TransactionType.Income ? incomeCategories : expenseCategories),
    [type],
  );

  const numericAmount = Number(toEn(amount).replace(/[^\d]/g, ''));
  const isTransfer = type === TransactionType.Transfer;

  // واحد مبلغ باید از حساب واقعاً انتخاب‌شده بیاید، نه همیشه اولین حساب کاربر —
  // وگرنه روی حساب دلاری/رمزارزی، کاربر عددی را به‌گمان ریال وارد می‌کند که
  // مستقیم و بدون تبدیل از موجودی همان واحد خارجی کم/زیاد می‌شود.
  const sourceAccount = accountById(effectiveSource);
  const destinationAccount = accountById(effectiveDestination);
  const relevantAccount = type === TransactionType.Income ? destinationAccount : sourceAccount;
  const amountSuffix = relevantAccount ? accountUnitSuffix(relevantAccount) : 'ریال';

  const sameTransferUnit = (a: NonNullable<typeof sourceAccount>, b: NonNullable<typeof destinationAccount>) => {
    if (isForeignUnitAccount(a) !== isForeignUnitAccount(b)) return false;
    if (!isForeignUnitAccount(a)) return true;
    if (a.type !== b.type) return false;
    if (a.type === AccountType.Currency) return a.currencyCode === b.currencyCode;
    if (a.type === AccountType.Crypto) return a.cryptoSymbol === b.cryptoSymbol;
    return true;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!numericAmount || numericAmount <= 0) {
      setError('مبلغ را وارد کنید.');
      return;
    }
    if (isTransfer && effectiveSource === effectiveDestination) {
      setError('حساب مبدأ و مقصد نباید یکسان باشند.');
      return;
    }
    if (isTransfer && sourceAccount && destinationAccount && !sameTransferUnit(sourceAccount, destinationAccount)) {
      setError('این دو حساب واحد متفاوتی دارند (مثلاً یکی ریالی و دیگری ارزی) — انتقال مستقیم بین آن‌ها ممکن نیست.');
      return;
    }
    if (accounts.length === 0) {
      setError('ابتدا باید حسابی ثبت شود.');
      return;
    }

    const payload = {
      type,
      amount: numericAmount,
      sourceAccountId: type === TransactionType.Income ? undefined : effectiveSource,
      destinationAccountId: type === TransactionType.Expense ? undefined : effectiveDestination,
      category: category || (isTransfer ? 'transfer' : categories[0].key),
      description: description || (isTransfer ? 'انتقال بین حساب' : ''),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        // تاریخ وقوع دست‌نخورده می‌ماند تا ویرایش مبلغ، تراکنش را در تاریخچه جابه‌جا نکند
        await editTransaction(transaction.id, { ...payload, occurredAtUtc: transaction.occurredAt });
      } else {
        await addTransaction(payload);
      }

      const typeLabel =
        type === TransactionType.Income ? 'درآمد' : type === TransactionType.Expense ? 'هزینه' : 'انتقال';
      const categoryLabel = !isTransfer ? ` · ${getCategory(payload.category).label}` : '';
      showToast(
        `${formatNumber(numericAmount)} ${amountSuffix} ${typeLabel}${categoryLabel} ${isEdit ? 'ویرایش شد' : 'ثبت شد'}`,
      );

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        if (!isEdit) {
          setAmount('');
          setDescription('');
        }
        onDone?.();
      }, 750);
    } catch (err) {
      setError(readErrorMessage(err, 'ذخیرهٔ تراکنش با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  const accentRgb =
    type === TransactionType.Income ? '16 185 129' : type === TransactionType.Expense ? '244 63 94' : '51 100 255';

  // بدون حساب، فرم تراکنش بی‌معناست — به‌جای خطا هنگام ثبت، مسیر درست را نشان می‌دهیم
  if (accounts.length === 0) {
    return (
      <div className="py-8 text-center">
        <Wallet className="mx-auto mb-4 text-brand-500" size={30} />
        <p className="text-sm font-semibold">اول یک حساب بسازید</p>
        <p className="mx-auto mt-2 max-w-xs text-xs leading-relaxed text-dim">
          هر تراکنش باید به یک حساب وصل شود. با ساخت اولین حساب، این فرم فعال می‌شود.
        </p>
        <Link to="/accounts" onClick={onDone} className="mt-6 inline-block">
          <Button>
            <Plus size={16} />
            رفتن به حساب‌ها
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Segmented
        value={type}
        onChange={(value) => {
          setType(value);
          setCategory('');
        }}
        options={[
          { value: TransactionType.Expense, label: 'هزینه', rgb: '244 63 94' },
          { value: TransactionType.Income, label: 'درآمد', rgb: '16 185 129' },
          { value: TransactionType.Transfer, label: 'انتقال', rgb: '51 100 255' },
        ]}
      />

      {/* مبلغ */}
      <div>
        <TextField
          label="مبلغ"
          inputMode="numeric"
          placeholder="۰"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          suffix={amountSuffix}
          icon={<Wallet size={16} />}
          className="[&_input]:text-lg [&_input]:font-bold"
        />
        {numericAmount > 0 && (
          <p className="mt-2 text-[11px] text-dim">{compactNumber(numericAmount)}</p>
        )}
        <div className="mt-2.5 flex flex-wrap gap-2">
          {QUICK_AMOUNTS.map((quick) => (
            <button
              key={quick}
              type="button"
              onClick={() => setAmount(String(numericAmount + quick))}
              className="glass-soft rounded-xl px-3 py-1.5 text-[11px] text-dim transition hover:scale-105 hover:text-[var(--text-strong)] active:scale-95"
            >
              + {compactNumber(quick)}
            </button>
          ))}
          {numericAmount > 0 && (
            <button
              type="button"
              onClick={() => setAmount('')}
              className="rounded-xl px-3 py-1.5 text-[11px] text-rose-500 transition hover:bg-rose-500/10"
            >
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* حساب‌ها */}
      <div className={cx('grid gap-4', isTransfer ? 'sm:grid-cols-2' : '')}>
        {type !== TransactionType.Income && (
          <SelectField
            label={isTransfer ? 'از حساب' : 'برداشت از'}
            value={effectiveSource}
            onChange={(event) => setSourceId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.title}
              </option>
            ))}
          </SelectField>
        )}
        {type !== TransactionType.Expense && (
          <SelectField
            label={isTransfer ? 'به حساب' : 'واریز به'}
            value={effectiveDestination}
            onChange={(event) => setDestinationId(event.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.title}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {/* دسته‌بندی */}
      {!isTransfer && (
        <div>
          <p className="mb-2 text-xs font-medium text-dim">دسته‌بندی</p>
          <div className="no-scrollbar -mx-1 grid max-h-44 grid-cols-3 gap-2 overflow-y-auto px-1 sm:grid-cols-4">
            {categories.map((item) => {
              const Icon = item.icon;
              const selected = (category || categories[0].key) === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setCategory(item.key)}
                  className={cx(
                    'flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[10px] transition-all duration-300',
                    selected ? 'scale-[1.03]' : 'glass-soft text-dim hover:text-[var(--text-strong)]',
                  )}
                  style={
                    selected
                      ? {
                          background: `rgb(${item.rgb} / .16)`,
                          boxShadow: `inset 0 0 0 1px rgb(${item.rgb} / .4)`,
                          color: 'var(--text-strong)',
                        }
                      : undefined
                  }
                >
                  <Icon size={17} style={{ color: `rgb(${item.rgb})` }} />
                  <span className="line-clamp-1">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <TextField
        label="توضیحات"
        placeholder="مثلاً خرید هفتگی"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />

      {error && (
        <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>
      )}

      <Button
        type="submit"
        loading={submitting}
        size="lg"
        variant={success ? 'success' : 'primary'}
        className="w-full"
        style={success ? undefined : { boxShadow: `0 14px 34px -14px rgb(${accentRgb} / .9)` }}
      >
        {success ? (
          <>
            <Check size={18} /> ذخیره شد
          </>
        ) : isEdit ? (
          'ذخیرهٔ تغییرات'
        ) : (
          'ثبت تراکنش'
        )}
      </Button>
    </form>
  );
}
