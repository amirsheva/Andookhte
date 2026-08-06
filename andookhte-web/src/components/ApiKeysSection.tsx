import { useEffect, useState } from 'react';
import { Check, ChevronDown, Copy, Plus, Smartphone, Trash2 } from 'lucide-react';
import {
  API_BASE_URL, apiKeysApi, readErrorMessage, type ApiKeySummary, type CreatedApiKey,
} from '../api';
import { cx, formatDate } from '../lib/format';
import { GlassCard } from './ui/GlassCard';
import { Button } from './ui/Button';
import { TextField } from './ui/Field';
import { ConfirmDialog } from './ui/ConfirmDialog';

export function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiKey | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiKeySummary | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  const load = async () => {
    try {
      setKeys(await apiKeysApi.list());
      setError(null);
    } catch (err) {
      setError(readErrorMessage(err, 'دریافت کلیدها با خطا مواجه شد.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const handleCreate = async () => {
    setError(null);
    if (!label.trim()) return setError('یک نام برای کلید وارد کنید.');

    setBusy(true);
    try {
      const result = await apiKeysApi.create(label.trim());
      setJustCreated(result);
      setLabel('');
      setCreating(false);
      await load();
    } catch (err) {
      setError(readErrorMessage(err, 'ساخت کلید با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleCopy = async () => {
    if (!justCreated) return;
    await navigator.clipboard.writeText(justCreated.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <GlassCard className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_.04s_both]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold">کلیدهای API</h3>
          <p className="mt-1 text-[11px] text-dim">
            برای اتوماسیون‌هایی مثل شورتکات آیفون — بدون نیاز به ورود دستی هر بار.
          </p>
        </div>
        {!creating && (
          <Button size="sm" variant="soft" onClick={() => setCreating(true)}>
            <Plus size={14} /> کلید تازه
          </Button>
        )}
      </div>

      {justCreated && (
        <div className="mt-4 space-y-3 rounded-2xl bg-emerald-500/10 px-4 py-4">
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            کلید «{justCreated.label}» ساخته شد — همین الان کپی کن، بعداً دوباره نشان داده نمی‌شود.
          </p>
          <div className="flex items-center gap-2">
            <code
              dir="ltr"
              className="num flex-1 truncate rounded-xl bg-black/5 px-3 py-2.5 text-[11px] dark:bg-white/10"
            >
              {justCreated.rawKey}
            </code>
            <Button size="sm" onClick={() => void handleCopy()}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setJustCreated(null)}>
            باشه، ذخیره کردم
          </Button>
        </div>
      )}

      {creating && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-500/10 pt-4">
          <TextField
            label="نام کلید"
            placeholder="مثلاً شورتکات آیفون"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="min-w-48 flex-1"
          />
          <Button size="md" loading={busy} onClick={() => void handleCreate()}>
            ساخت
          </Button>
          <Button
            size="md"
            variant="ghost"
            onClick={() => {
              setCreating(false);
              setLabel('');
            }}
          >
            انصراف
          </Button>
        </div>
      )}

      {error && <p className="mt-3 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-dim">در حال بارگذاری...</p>
        ) : keys.length > 0 ? (
          keys.map((key) => (
            <div
              key={key.id}
              className="glass-soft flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{key.label}</p>
                <p className="num mt-0.5 text-[10px] text-dim" dir="ltr">
                  •••• {key.lastFour} · {formatDate(key.createdAtUtc)}
                  {' · '}
                  {key.lastUsedAtUtc ? `آخرین استفاده ${formatDate(key.lastUsedAtUtc)}` : 'هنوز استفاده نشده'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevoking(key)}
                aria-label={`باطل‌کردن ${key.label}`}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-dim transition hover:bg-rose-500/10 hover:text-rose-500"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        ) : (
          <p className="text-xs text-dim">هنوز کلیدی نساخته‌اید.</p>
        )}
      </div>

      <button
        type="button"
        onClick={() => setGuideOpen((value) => !value)}
        className="mt-5 flex w-full items-center justify-between border-t border-slate-500/10 pt-4 text-xs font-medium text-brand-500"
      >
        <span className="flex items-center gap-1.5">
          <Smartphone size={14} /> راهنمای ساخت شورتکات آیفون (Back Tap)
        </span>
        <ChevronDown size={14} className={cx('transition-transform', guideOpen && 'rotate-180')} />
      </button>

      {guideOpen && (
        <ol className="mt-3 list-decimal space-y-2.5 pr-4 text-[11px] leading-relaxed text-dim">
          <li>یک کلید تازه بساز (بالا) و همان‌جا کپی کن.</li>
          <li>اپ Shortcuts روی آیفون → «+» برای شورتکات جدید.</li>
          <li>
            دو اکشن «Ask for Input» اضافه کن: یکی برای مبلغ (نوع Number)، یکی برای اینکه هزینه است یا درآمد.
          </li>
          <li>
            اکشن «Get Contents of URL» اضافه کن — آدرس:
            <code dir="ltr" className="num mx-1 rounded bg-black/5 px-1.5 py-0.5 dark:bg-white/10">
              {API_BASE_URL}/Transactions
            </code>
            روش POST، در Headers دو مورد: <code dir="ltr">Authorization: Bearer &lt;کلید&gt;</code> و{' '}
            <code dir="ltr">Content-Type: application/json</code>.
          </li>
          <li>
            بدنهٔ JSON را با متغیرهای بالا پر کن، مثلاً برای هزینه (type=2):
            <code dir="ltr" className="num mt-1 block whitespace-pre-wrap rounded-xl bg-black/5 px-3 py-2 dark:bg-white/10">
              {'{ "type": 2, "amount": <مبلغ>, "sourceAccountId": "<شناسهٔ حساب>", "category": "other" }'}
            </code>
            شناسهٔ حساب را یک‌بار با همین کلید از آدرس <code dir="ltr">{API_BASE_URL}/Accounts</code> (روش GET) بگیر.
          </li>
          <li>تنظیمات آیفون → Accessibility → Touch → Back Tap → دو یا سه ضربه → همین شورتکات را انتخاب کن.</li>
        </ol>
      )}

      <ConfirmDialog
        open={revoking !== null}
        onClose={() => setRevoking(null)}
        onConfirm={async () => {
          if (!revoking) return;
          await apiKeysApi.revoke(revoking.id);
          await load();
        }}
        title="باطل‌کردن کلید"
        confirmLabel="باطل کن"
        description={<>کلید «{revoking?.label}» دیگر کار نخواهد کرد. این کار قابل بازگشت نیست.</>}
      />
    </GlassCard>
  );
}
