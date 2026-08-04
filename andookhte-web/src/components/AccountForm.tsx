import { useMemo, useState, type FormEvent } from 'react';
import { Check, CreditCard, Landmark, PenLine, Wallet } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL, AccountType, TransactionType, readErrorMessage, type Account } from '../api';
import { useAuth } from '../store/authContext';
import { useFinance } from '../store/financeContext';
import { useToast } from '../store/toastContext';
import { BANK_OPTIONS, detectBank, isKnownBank, isValidCardNumber } from '../lib/banks';
import { compactNumber, currencyLabel, formatCardNumber, formatCurrency, toEn } from '../lib/format';
import { BankCard } from './BankCard';
import { Button } from './ui/Button';
import { SelectField, TextField } from './ui/Field';

const QUICK_BALANCES = [1_000_000, 10_000_000, 100_000_000];

const ACCOUNT_TYPES: number[] = [
  AccountType.Bank,
  AccountType.Cash,
  AccountType.SavingsFund,
  AccountType.GoldAndCurrency,
  AccountType.Crypto,
];

interface AccountFormProps {
  /** اگر داده شود فرم در حالت ویرایش کار می‌کند. */
  account?: Account;
  onDone?: () => void;
}

export function AccountForm({ account, onDone }: AccountFormProps) {
  const { addAccount, editAccount, addTransaction } = useFinance();
  const { activeWorkspace } = useAuth();
  const { showToast } = useToast();

  const isEdit = account !== undefined;

  const [title, setTitle] = useState(account?.title ?? '');
  const [type, setType] = useState<number>(account?.type ?? AccountType.Bank);
  const [balance, setBalance] = useState('');
  const [currency, setCurrency] = useState(
    account?.currencyCode ?? activeWorkspace?.currencyCode ?? 'IRR',
  );
  const [cardNumber, setCardNumber] = useState(
    account?.cardNumber ? formatCardNumber(account.cardNumber) : '',
  );
  const [iban, setIban] = useState(account?.iban ?? '');
  const [bankName, setBankName] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fixingBalance, setFixingBalance] = useState(false);
  const [correctBalance, setCorrectBalance] = useState('');
  const [balanceFixBusy, setBalanceFixBusy] = useState(false);
  const [balanceFixError, setBalanceFixError] = useState<string | null>(null);

  const cardDigits = toEn(cardNumber).replace(/\D/g, '').slice(0, 16);
  const numericBalance = Number(toEn(balance).replace(/[^\d]/g, '')) || 0;
  const isBankAccount = type === AccountType.Bank;

  /** بانک از روی شمارهٔ کارت تشخیص داده می‌شود؛ انتخاب دستی بر آن اولویت دارد. */
  const detected = useMemo(() => detectBank(cardDigits, undefined), [cardDigits]);
  const autoDetected = isKnownBank(detected);
  const effectiveBankName = bankName || (autoDetected ? detected.name : account?.bankName ?? '');

  const cardTooShort = cardDigits.length > 0 && cardDigits.length < 16;
  const cardInvalid = cardDigits.length === 16 && !isValidCardNumber(cardDigits);

  const preview: Account = {
    id: account?.id ?? 'preview',
    title: title.trim() || 'حساب جدید',
    type,
    // در ویرایش، موجودی واقعی نمایش داده می‌شود چون از این فرم تغییر نمی‌کند
    currentBalance: isEdit ? account.currentBalance : numericBalance,
    currencyCode: currency,
    cardNumber: cardDigits || undefined,
    bankName: effectiveBankName || undefined,
    transactionCount: account?.transactionCount ?? 0,
  };

  /**
   * موجودی مستقیماً قابل ویرایش نیست — حاصل تراکنش‌هاست. اصلاح یعنی ثبت خودکار
   * یک تراکنش هزینه/درآمد به اندازهٔ اختلاف، تا کاربر مجبور نباشد خودش تفاضل را
   * حساب کند و دستی وارد فرم تراکنش شود.
   */
  const handleBalanceFix = async () => {
    if (!account) return;
    setBalanceFixError(null);

    const target = Number(toEn(correctBalance).replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(target)) return setBalanceFixError('یک عدد معتبر وارد کنید.');

    const delta = Math.round((target - account.currentBalance) * 100) / 100;
    if (delta === 0) return setBalanceFixError('این مبلغ همان موجودی فعلی است.');

    setBalanceFixBusy(true);
    try {
      await addTransaction({
        type: delta > 0 ? TransactionType.Income : TransactionType.Expense,
        amount: Math.abs(delta),
        sourceAccountId: delta < 0 ? account.id : undefined,
        destinationAccountId: delta > 0 ? account.id : undefined,
        category: 'other',
        description: 'اصلاح موجودی',
      });
      showToast(`موجودی به ${formatCurrency(target, account.currencyCode)} اصلاح شد`);
      setCorrectBalance('');
      setFixingBalance(false);
    } catch (err) {
      setBalanceFixError(readErrorMessage(err, 'اصلاح موجودی با خطا مواجه شد.'));
    } finally {
      setBalanceFixBusy(false);
    }
  };

  const handleCardChange = (value: string) => {
    const digits = toEn(value).replace(/\D/g, '').slice(0, 16);
    setCardNumber(digits.replace(/(.{4})/g, '$1 ').trim());
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) return setError('عنوان حساب را وارد کنید.');
    if (cardTooShort) return setError('شمارهٔ کارت باید ۱۶ رقم باشد.');
    if (cardInvalid) return setError('شمارهٔ کارت معتبر نیست. ارقام را دوباره بررسی کنید.');

    const shared = {
      title: title.trim(),
      type,
      currencyCode: currency,
      cardNumber: cardDigits || undefined,
      iban: toEn(iban).replace(/\s/g, '').toUpperCase() || undefined,
      bankName: effectiveBankName || undefined,
    };

    setSubmitting(true);
    try {
      if (isEdit) await editAccount(account.id, shared);
      else await addAccount({ ...shared, initialBalance: numericBalance });

      setSuccess(true);
      setTimeout(() => onDone?.(), 700);
    } catch (err) {
      setError(readErrorMessage(err, 'ذخیرهٔ حساب با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* پیش‌نمایش زنده — همان کامپوننتی که در فهرست حساب‌ها استفاده می‌شود */}
      <div className="mx-auto max-w-xs">
        <BankCard account={preview} compact />
      </div>

      <TextField
        label="عنوان حساب"
        placeholder="مثلاً حساب جاری"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        icon={<Wallet size={16} />}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="نوع حساب" value={type} onChange={(event) => setType(Number(event.target.value))}>
          {ACCOUNT_TYPES.map((value) => (
            <option key={value} value={value}>{ACCOUNT_TYPE_LABEL[value] ?? 'حساب'}</option>
          ))}
        </SelectField>

        <SelectField label="واحد پول" value={currency} onChange={(event) => setCurrency(event.target.value)}>
          <option value="IRR">ریال</option>
          <option value="IRT">تومان</option>
          <option value="USD">دلار</option>
          <option value="EUR">یورو</option>
        </SelectField>
      </div>

      {/* موجودی فقط در زمان ساخت قابل تعیین است؛ در ویرایش با تراکنش اصلاحی درست می‌شود */}
      {isEdit ? (
        <div className="rounded-2xl bg-slate-500/8 px-4 py-3.5 dark:bg-white/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] text-dim">موجودی فعلی</p>
              <p className="num mt-0.5 text-sm font-bold">
                {formatCurrency(account.currentBalance, account.currencyCode)}
              </p>
            </div>
            {!fixingBalance && (
              <button
                type="button"
                onClick={() => setFixingBalance(true)}
                className="glass-soft flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-medium text-dim transition hover:text-[var(--text-strong)]"
              >
                <PenLine size={13} />
                اصلاح موجودی
              </button>
            )}
          </div>

          {fixingBalance && (
            <div className="mt-3.5 space-y-3 border-t border-slate-500/10 pt-3.5">
              <p className="text-[11px] leading-relaxed text-dim">
                موجودی مستقیم ویرایش نمی‌شود چون حاصل تراکنش‌هاست. با تعیین عدد صحیح،
                یک تراکنش اصلاحی به اندازهٔ اختلاف خودکار ثبت می‌شود.
              </p>
              <TextField
                label="موجودی صحیح"
                inputMode="numeric"
                placeholder="۰"
                value={correctBalance}
                onChange={(event) => setCorrectBalance(event.target.value)}
                suffix={currencyLabel(account.currencyCode)}
              />
              {balanceFixError && <p className="text-[11px] text-rose-500">{balanceFixError}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  loading={balanceFixBusy}
                  onClick={() => void handleBalanceFix()}
                  className="flex-1"
                >
                  ثبت اصلاح
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setFixingBalance(false);
                    setCorrectBalance('');
                    setBalanceFixError(null);
                  }}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <TextField
            label="موجودی اولیه"
            inputMode="numeric"
            placeholder="۰"
            value={balance}
            onChange={(event) => setBalance(event.target.value)}
            suffix={currencyLabel(currency)}
          />
          <div className="mt-2.5 flex flex-wrap gap-2">
            {QUICK_BALANCES.map((quick) => (
              <button
                key={quick}
                type="button"
                onClick={() => setBalance(String(numericBalance + quick))}
                className="glass-soft rounded-xl px-3 py-1.5 text-[11px] text-dim transition hover:scale-105 hover:text-[var(--text-strong)] active:scale-95"
              >
                + {compactNumber(quick)}
              </button>
            ))}
            {numericBalance > 0 && (
              <button
                type="button"
                onClick={() => setBalance('')}
                className="rounded-xl px-3 py-1.5 text-[11px] text-rose-500 transition hover:bg-rose-500/10"
              >
                پاک کردن
              </button>
            )}
          </div>
        </div>
      )}

      {/* اطلاعات بانکی فقط برای حساب بانکی معنا دارد */}
      {isBankAccount && (
        <div className="space-y-4 border-t border-slate-500/10 pt-5">
          <TextField
            label="شمارهٔ کارت"
            dir="ltr"
            inputMode="numeric"
            placeholder="6037 9915 xxxx xxxx"
            value={cardNumber}
            onChange={(event) => handleCardChange(event.target.value)}
            icon={<CreditCard size={16} />}
            error={cardInvalid ? 'شمارهٔ کارت معتبر نیست.' : undefined}
            hint={
              autoDetected
                ? `بانک تشخیص داده شد: ${detected.name}`
                : 'اختیاری — با ورود شمارهٔ کارت، بانک خودکار تشخیص داده می‌شود'
            }
          />

          {/* اگر تشخیص خودکار نتیجه نداد، انتخاب دستی در دسترس است */}
          {!autoDetected && (
            <SelectField
              label="بانک"
              value={bankName || account?.bankName || ''}
              onChange={(event) => setBankName(event.target.value)}
              icon={<Landmark size={16} />}
            >
              <option value="">انتخاب نشده</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank.key} value={bank.name}>{bank.name}</option>
              ))}
            </SelectField>
          )}

          <TextField
            label="شمارهٔ شبا"
            dir="ltr"
            placeholder="IR000000000000000000000000"
            value={iban}
            onChange={(event) => setIban(event.target.value)}
            hint="اختیاری"
          />
        </div>
      )}

      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

      <Button
        type="submit"
        size="lg"
        loading={submitting}
        variant={success ? 'success' : 'primary'}
        className="w-full"
      >
        {success ? (
          <>
            <Check size={18} /> ذخیره شد
          </>
        ) : isEdit ? (
          'ذخیرهٔ تغییرات'
        ) : (
          'ساخت حساب'
        )}
      </Button>
    </form>
  );
}
