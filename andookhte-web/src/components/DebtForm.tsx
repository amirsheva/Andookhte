import { useMemo, useState, type FormEvent } from 'react';
import { Check, Landmark, User } from 'lucide-react';
import { DebtDirection, DebtRecurrenceType, readErrorMessage } from '../api';
import { useDebts } from '../store/debtsContext';
import { jalaliOfDate, jalaliToIsoDate } from '../lib/jalali';
import { persianMonthName, toEn, toFa } from '../lib/format';
import { Button } from './ui/Button';
import { SelectField, TextField } from './ui/Field';
import { Segmented } from './ui/Segmented';

const today = jalaliOfDate(new Date());

export function DebtForm({ onDone }: { onDone?: () => void }) {
  const { addDebt } = useDebts();

  const [title, setTitle] = useState('');
  const [direction, setDirection] = useState<number>(DebtDirection.Payable);
  const [recurrenceType, setRecurrenceType] = useState<number>(DebtRecurrenceType.OneTime);
  const [counterpartyName, setCounterpartyName] = useState('');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState('12');
  const [jy, setJy] = useState(today.jy);
  const [jm, setJm] = useState(today.jm);
  const [jd, setJd] = useState(today.jd);

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRecurring = recurrenceType !== DebtRecurrenceType.OneTime;
  const numericAmount = Number(toEn(amount).replace(/[^\d]/g, ''));
  const numericCount = Math.max(1, Number(toEn(occurrenceCount).replace(/[^\d]/g, '')) || 1);

  const dayOptions = useMemo(() => {
    // ۳۱ برای انتخاب سرراست کافی است؛ تاریخ نامعتبر (مثل ۳۱ آبان) هنگام ارسال تصحیح می‌شود
    return Array.from({ length: 31 }, (_, index) => index + 1);
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!title.trim()) return setError('عنوان را وارد کنید.');
    if (!numericAmount || numericAmount <= 0) {
      return setError(isRecurring ? 'مبلغ هر قسط را وارد کنید.' : 'مبلغ را وارد کنید.');
    }

    setSubmitting(true);
    try {
      await addDebt({
        title: title.trim(),
        direction,
        recurrenceType,
        firstDueDateUtc: jalaliToIsoDate(jy, jm, jd),
        amount: numericAmount,
        occurrenceCount: isRecurring ? numericCount : 1,
        counterpartyName: counterpartyName.trim() || undefined,
        note: note.trim() || undefined,
      });

      setSuccess(true);
      setTimeout(() => onDone?.(), 700);
    } catch (err) {
      setError(readErrorMessage(err, 'ثبت بدهی/طلب با خطا مواجه شد.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Segmented
        value={direction}
        onChange={setDirection}
        options={[
          { value: DebtDirection.Payable, label: 'بدهی من', rgb: '244 63 94' },
          { value: DebtDirection.Receivable, label: 'طلب من', rgb: '16 185 129' },
        ]}
      />

      <Segmented
        value={recurrenceType}
        onChange={setRecurrenceType}
        size="sm"
        options={[
          { value: DebtRecurrenceType.OneTime, label: 'یک‌باره', rgb: '51 100 255' },
          { value: DebtRecurrenceType.Installment, label: 'اقساط ثابت', rgb: '168 85 247' },
          { value: DebtRecurrenceType.Monthly, label: 'ماهیانه بازگشتی', rgb: '234 88 12' },
        ]}
      />

      <TextField
        label="عنوان"
        placeholder={direction === DebtDirection.Payable ? 'مثلاً وام بانکی مسکن' : 'مثلاً قرض به علی'}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        icon={<Landmark size={16} />}
      />

      <TextField
        label="طرف حساب (اختیاری)"
        placeholder="مثلاً بانک ملی یا نام شخص"
        value={counterpartyName}
        onChange={(event) => setCounterpartyName(event.target.value)}
        icon={<User size={16} />}
      />

      <div>
        <p className="mb-2 text-xs font-medium text-dim">
          {recurrenceType === DebtRecurrenceType.OneTime ? 'تاریخ سررسید' : 'تاریخ اولین قسط'}
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          <SelectField value={jd} onChange={(event) => setJd(Number(event.target.value))}>
            {dayOptions.map((day) => (
              <option key={day} value={day}>{toFa(day)}</option>
            ))}
          </SelectField>
          <SelectField value={jm} onChange={(event) => setJm(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>{persianMonthName(month)}</option>
            ))}
          </SelectField>
          <SelectField value={jy} onChange={(event) => setJy(Number(event.target.value))}>
            {Array.from({ length: 6 }, (_, index) => today.jy - 1 + index).map((year) => (
              <option key={year} value={year}>{toFa(year)}</option>
            ))}
          </SelectField>
        </div>
      </div>

      <div className={isRecurring ? 'grid gap-4 sm:grid-cols-2' : ''}>
        <TextField
          label={isRecurring ? 'مبلغ هر قسط' : 'مبلغ'}
          inputMode="numeric"
          placeholder="۰"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          suffix="ریال"
        />
        {isRecurring && (
          <TextField
            label={recurrenceType === DebtRecurrenceType.Monthly ? 'تعداد ماه (اولیه)' : 'تعداد قسط'}
            inputMode="numeric"
            value={occurrenceCount}
            onChange={(event) => setOccurrenceCount(event.target.value)}
            hint={
              recurrenceType === DebtRecurrenceType.Monthly
                ? 'بعداً از همین صفحه قابل تمدید است'
                : undefined
            }
          />
        )}
      </div>

      <TextField
        label="یادداشت (اختیاری)"
        placeholder="مثلاً شمارهٔ قرارداد یا توضیح بیشتر"
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />

      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

      <Button type="submit" size="lg" loading={submitting} variant={success ? 'success' : 'primary'} className="w-full">
        {success ? (
          <>
            <Check size={18} /> ثبت شد
          </>
        ) : (
          'ثبت'
        )}
      </Button>
    </form>
  );
}
