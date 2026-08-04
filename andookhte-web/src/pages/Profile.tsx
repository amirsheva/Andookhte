import { useState, type FormEvent } from 'react';
import {
  AtSign, BadgeCheck, Check, KeyRound, ShieldAlert, Smartphone, User,
} from 'lucide-react';
import {
  ContactChannel, WORKSPACE_ROLE_LABEL, profileApi, readErrorMessage,
} from '../api';
import { useAuth } from '../store/authContext';
import { authStorage } from '../lib/authStorage';
import { cx, formatNumber, toEn } from '../lib/format';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';

export function Profile() {
  const { user, activeWorkspace, workspaces } = useAuth();

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <GlassCard glow="51 100 255" className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_both]">
        <div className="flex flex-wrap items-center gap-5">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-xl font-bold text-white shadow-[0_16px_40px_-14px_rgb(51_100_255/.9)]">
            {user.displayName.trim().charAt(0) || '؟'}
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold">{user.displayName}</h2>
            <p className="num mt-1 truncate text-xs text-dim" dir="ltr">
              {user.email ?? user.phoneNumber ?? '—'}
            </p>
            <p className="mt-2 text-[11px] text-dim">
              {activeWorkspace
                ? `${WORKSPACE_ROLE_LABEL[activeWorkspace.role]} در ${activeWorkspace.name}`
                : '—'}
              {' · '}
              <span className="num">{formatNumber(workspaces.length)}</span> فضای کاری
            </p>
          </div>
        </div>
      </GlassCard>

      <IdentitySection />
      <VerificationSection />
      <PasswordSection />
    </div>
  );
}

/* ————————————————— اطلاعات هویتی ————————————————— */

function IdentitySection() {
  const { user, reloadProfile } = useAuth();

  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(user?.phoneNumber ?? '');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (!displayName.trim()) return setError('نام را وارد کنید.');

    setBusy(true);
    try {
      await profileApi.update({
        displayName: displayName.trim(),
        email: email.trim() || null,
        phoneNumber: toEn(phone).trim() || null,
      });
      await reloadProfile();
      setDone(true);
    } catch (err) {
      setError(readErrorMessage(err, 'ذخیرهٔ پروفایل با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_.08s_both]">
      <h3 className="text-sm font-bold">اطلاعات شخصی</h3>
      <p className="mt-1 text-[11px] text-dim">
        تغییر ایمیل یا موبایل، وضعیت تأیید همان مورد را صفر می‌کند.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <TextField
          label="نام و نام خانوادگی"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          icon={<User size={16} />}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="ایمیل"
            type="email"
            dir="ltr"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            icon={<AtSign size={16} />}
          />
          <TextField
            label="شمارهٔ موبایل"
            dir="ltr"
            inputMode="tel"
            placeholder="09121234567"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            icon={<Smartphone size={16} />}
          />
        </div>

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

        <Button type="submit" loading={busy} variant={done ? 'success' : 'primary'}>
          {done ? (
            <>
              <Check size={16} /> ذخیره شد
            </>
          ) : (
            'ذخیرهٔ تغییرات'
          )}
        </Button>
      </form>
    </GlassCard>
  );
}

/* ————————————————— تأیید ایمیل و موبایل ————————————————— */

function VerificationSection() {
  const { user } = useAuth();

  return (
    <GlassCard className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_.14s_both]">
      <h3 className="text-sm font-bold">تأیید هویت</h3>
      <p className="mt-1 text-[11px] text-dim">
        تأیید شماره و ایمیل برای بازیابی رمز عبور لازم است.
      </p>

      <div className="mt-5 space-y-3">
        <VerificationRow
          channel={ContactChannel.Phone}
          label="شمارهٔ موبایل"
          value={user?.phoneNumber ?? null}
          confirmed={user?.isPhoneConfirmed ?? false}
          icon={<Smartphone size={16} />}
        />
        <VerificationRow
          channel={ContactChannel.Email}
          label="ایمیل"
          value={user?.email ?? null}
          confirmed={user?.isEmailConfirmed ?? false}
          icon={<AtSign size={16} />}
        />
      </div>
    </GlassCard>
  );
}

function VerificationRow({
  channel, label, value, confirmed, icon,
}: {
  channel: number;
  label: string;
  value: string | null;
  confirmed: boolean;
  icon: React.ReactNode;
}) {
  const { reloadProfile } = useAuth();
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setError(null);
    setSending(true);
    try {
      const result = await profileApi.sendVerification(channel);
      setDevCode(result.developmentCode ?? null);
      setPending(true);
    } catch (err) {
      setError(readErrorMessage(err, 'ارسال کد با خطا مواجه شد.'));
    } finally {
      setSending(false);
    }
  };

  const confirm = async () => {
    setError(null);
    setSending(true);
    try {
      await profileApi.confirmVerification(channel, toEn(code));
      await reloadProfile();
      setPending(false);
      setCode('');
    } catch (err) {
      setError(readErrorMessage(err, 'تأیید کد با خطا مواجه شد.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="glass-soft rounded-3xl p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-dim">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium">{label}</p>
          <p className="num mt-0.5 truncate text-[11px] text-dim" dir="ltr">{value ?? '—'}</p>
        </div>

        {confirmed ? (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/12 px-3 py-1.5 text-[11px] text-emerald-500">
            <BadgeCheck size={13} />
            تأیید شده
          </span>
        ) : value ? (
          <Button size="sm" variant="soft" onClick={() => void send()} loading={sending && !pending}>
            ارسال کد
          </Button>
        ) : (
          <span className="text-[11px] text-dim">ثبت نشده</span>
        )}
      </div>

      {pending && !confirmed && (
        <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-slate-500/10 pt-4">
          <TextField
            className="w-36"
            label="کد تأیید"
            dir="ltr"
            inputMode="numeric"
            maxLength={6}
            placeholder="––––––"
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button size="md" onClick={() => void confirm()} loading={sending}>
            تأیید
          </Button>
          {devCode && (
            <p className="w-full text-[11px] text-amber-600 dark:text-amber-400">
              حالت توسعه — کد: <span className="num font-bold">{devCode}</span>
            </p>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[11px] text-rose-500">{error}</p>}
    </div>
  );
}

/* ————————————————— رمز عبور ————————————————— */

function PasswordSection() {
  const { user } = useAuth();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // کاربری که فقط با پیامک وارد شده هنوز رمزی ندارد
  const hasPassword = Boolean(user?.email);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setDone(false);

    if (next.length < 8) return setError('رمز تازه باید حداقل ۸ نویسه باشد.');
    if (next !== repeat) return setError('تکرار رمز با رمز تازه یکی نیست.');

    setBusy(true);
    try {
      const result = await profileApi.changePassword({
        currentPassword: current || null,
        newPassword: next,
      });

      // سرور همهٔ نشست‌ها را باطل کرده و توکن تازه داده؛ بدون جایگزینی،
      // درخواست بعدی ۴۰۱ می‌گیرد و کاربر بیرون می‌افتد.
      authStorage.setTokens(result.accessToken, result.refreshToken);

      setCurrent('');
      setNext('');
      setRepeat('');
      setDone(true);
    } catch (err) {
      setError(readErrorMessage(err, 'تغییر رمز با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_.2s_both]">
      <h3 className="text-sm font-bold">{hasPassword ? 'تغییر رمز عبور' : 'تعیین رمز عبور'}</h3>
      <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-relaxed text-dim">
        <ShieldAlert size={13} className="mt-0.5 shrink-0" />
        با تغییر رمز، همهٔ نشست‌های فعال روی دستگاه‌های دیگر بسته می‌شوند.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {hasPassword && (
          <TextField
            label="رمز فعلی"
            type="password"
            dir="ltr"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
            icon={<KeyRound size={16} />}
            autoComplete="current-password"
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="رمز تازه"
            type="password"
            dir="ltr"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            hint="دست‌کم ۸ نویسه"
            autoComplete="new-password"
          />
          <TextField
            label="تکرار رمز تازه"
            type="password"
            dir="ltr"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
            error={repeat.length > 0 && repeat !== next ? 'یکسان نیست' : undefined}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

        <Button
          type="submit"
          loading={busy}
          variant={done ? 'success' : 'primary'}
          className={cx(done && 'pointer-events-none')}
        >
          {done ? (
            <>
              <Check size={16} /> رمز تغییر کرد
            </>
          ) : (
            'ذخیرهٔ رمز'
          )}
        </Button>
      </form>
    </GlassCard>
  );
}
