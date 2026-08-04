import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowLeft, AtSign, KeyRound, Loader2, Smartphone, Sparkles, User,
} from 'lucide-react';
import { readErrorMessage } from '../api';
import { useAuth } from '../store/authContext';
import { Aurora } from '../components/Aurora';
import { GlassCard } from '../components/ui/GlassCard';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { Segmented, type SegmentOption } from '../components/ui/Segmented';
import { ThemeToggle } from '../components/ThemeToggle';
import { cx, formatNumber, toEn } from '../lib/format';

type Mode = 'password' | 'otp';
type PasswordStep = 'login' | 'register';

export function Login() {
  const [mode, setMode] = useState<Mode>('password');
  const [forgot, setForgot] = useState(false);

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Aurora />

      <div className="absolute top-5 left-5">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* نشان برند */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="animate-float grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-[0_20px_45px_-16px_rgb(51_100_255/.95)]">
            <Sparkles size={26} />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold">اندوخته</h1>
          <p className="mt-1.5 text-xs text-dim">مدیریت هوشمند مالی</p>
        </div>

        <GlassCard className="animate-[rise_.6s_cubic-bezier(.16,1,.3,1)_both]">
          {forgot ? (
            <>
              <h2 className="mb-5 text-base font-bold">بازیابی رمز عبور</h2>
              <ForgotPasswordForm onBack={() => setForgot(false)} />
            </>
          ) : (
            <>
              <Segmented
                className="mb-6"
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'password', label: 'ایمیل و رمز', rgb: '51 100 255' },
                  { value: 'otp', label: 'کد پیامکی', rgb: '16 185 129' },
                ]}
              />

              {mode === 'password' ? <PasswordForm onForgot={() => setForgot(true)} /> : <OtpForm />}
            </>
          )}
        </GlassCard>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-dim">
          با ورود، داده‌های مالی شما در یک فضای کاری اختصاصی و جدا از دیگران نگهداری می‌شود.
        </p>
      </div>
    </div>
  );
}

/* ————————————————— ورود و ثبت‌نام با رمز ————————————————— */

function PasswordForm({ onForgot }: { onForgot: () => void }) {
  const { loginWithPassword, register } = useAuth();
  const [step, setStep] = useState<PasswordStep>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = step === 'register';

  const STEP_OPTIONS: SegmentOption<PasswordStep>[] = [
    { value: 'login', label: 'ورود', rgb: '51 100 255' },
    { value: 'register', label: 'ساخت حساب تازه', rgb: '16 185 129' },
  ];

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!email.trim()) return setError('ایمیل را وارد کنید.');
    if (password.length < 8) return setError('رمز عبور باید حداقل ۸ نویسه باشد.');
    if (isRegister && !displayName.trim()) return setError('نام خود را وارد کنید.');

    setBusy(true);
    try {
      if (isRegister) {
        await register({ email: email.trim(), password, displayName: displayName.trim() });
      } else {
        await loginWithPassword({ email: email.trim(), password });
      }
    } catch (err) {
      setError(readErrorMessage(err, 'ورود با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Segmented
        value={step}
        onChange={(value) => {
          setStep(value);
          setError(null);
        }}
        options={STEP_OPTIONS}
      />

      {isRegister && (
        <TextField
          label="نام و نام خانوادگی"
          placeholder="مثلاً امیر"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          icon={<User size={16} />}
          autoComplete="name"
        />
      )}

      <TextField
        label="ایمیل"
        type="email"
        dir="ltr"
        placeholder="you@example.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        icon={<AtSign size={16} />}
        autoComplete="email"
      />

      <TextField
        label="رمز عبور"
        type="password"
        dir="ltr"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        icon={<KeyRound size={16} />}
        autoComplete={isRegister ? 'new-password' : 'current-password'}
        hint={isRegister ? 'دست‌کم ۸ نویسه' : undefined}
      />

      {error && <ErrorNote message={error} />}

      <Button type="submit" size="lg" loading={busy} className="w-full">
        {isRegister ? 'ساخت حساب' : 'ورود'}
      </Button>

      {!isRegister && (
        <button
          type="button"
          onClick={onForgot}
          className="block w-full text-center text-xs text-dim transition hover:text-brand-500"
        >
          رمز را فراموش کردید؟
        </button>
      )}
    </form>
  );
}

/* ————————————————— بازیابی رمز ————————————————— */

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const { requestPasswordReset, resetPassword } = useAuth();

  const [phase, setPhase] = useState<'identify' | 'reset'>('identify');
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) return setError('ایمیل یا شمارهٔ موبایل را وارد کنید.');

    setBusy(true);
    try {
      const result = await requestPasswordReset(toEn(identifier).trim());
      setDevCode(result.developmentCode ?? null);
      setPhase('reset');
    } catch (err) {
      setError(readErrorMessage(err, 'درخواست بازیابی با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) return setError('رمز تازه باید حداقل ۸ نویسه باشد.');

    setBusy(true);
    try {
      await resetPassword({
        identifier: toEn(identifier).trim(),
        code: toEn(code),
        newPassword: password,
      });
    } catch (err) {
      setError(readErrorMessage(err, 'بازیابی رمز با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'identify') {
    return (
      <form onSubmit={handleRequest} className="space-y-4">
        <p className="text-xs leading-relaxed text-dim">
          ایمیل یا شمارهٔ موبایل حسابتان را وارد کنید تا کد بازیابی فرستاده شود.
        </p>

        <TextField
          label="ایمیل یا موبایل"
          dir="ltr"
          placeholder="you@example.com یا 09121234567"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          icon={<AtSign size={16} />}
        />

        {error && <ErrorNote message={error} />}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          ارسال کد بازیابی
        </Button>

        <button
          type="button"
          onClick={onBack}
          className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs text-dim transition hover:text-brand-500"
        >
          بازگشت به ورود
          <ArrowLeft size={13} />
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleReset} className="space-y-4">
      <p className="num text-xs text-dim" dir="ltr">{identifier}</p>

      <TextField
        label="کد بازیابی"
        dir="ltr"
        inputMode="numeric"
        maxLength={6}
        placeholder="––––––"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="[&_input]:text-center [&_input]:text-xl [&_input]:tracking-[0.5em]"
        autoComplete="one-time-code"
      />

      <TextField
        label="رمز تازه"
        type="password"
        dir="ltr"
        placeholder="••••••••"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        icon={<KeyRound size={16} />}
        hint="دست‌کم ۸ نویسه"
        autoComplete="new-password"
      />

      {devCode && (
        <p className="rounded-2xl bg-amber-500/12 px-4 py-2.5 text-[11px] text-amber-600 dark:text-amber-400">
          حالت توسعه — کد ارسال‌شده: <span className="num font-bold">{devCode}</span>
        </p>
      )}

      {error && <ErrorNote message={error} />}

      <Button type="submit" size="lg" loading={busy} className="w-full">
        تعیین رمز و ورود
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex w-full items-center justify-center gap-1.5 pt-1 text-xs text-dim transition hover:text-brand-500"
      >
        بازگشت به ورود
        <ArrowLeft size={13} />
      </button>
    </form>
  );
}

/* ————————————————— ورود با کد پیامکی ————————————————— */

function OtpForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const [phase, setPhase] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    timerRef.current = window.setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [secondsLeft]);

  const handleRequest = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const result = await requestOtp(toEn(phone));
      setDevCode(result.developmentCode ?? null);
      setSecondsLeft(result.expiresInSeconds);
      setPhase('code');
    } catch (err) {
      setError(readErrorMessage(err, 'ارسال کد با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await verifyOtp({
        phoneNumber: toEn(phone),
        code: toEn(code),
        displayName: displayName.trim() || undefined,
      });
    } catch (err) {
      setError(readErrorMessage(err, 'تأیید کد با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  if (phase === 'phone') {
    return (
      <form onSubmit={handleRequest} className="space-y-4">
        <TextField
          label="شمارهٔ موبایل"
          dir="ltr"
          inputMode="tel"
          placeholder="09121234567"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          icon={<Smartphone size={16} />}
          autoComplete="tel"
          hint="کد تأیید به همین شماره فرستاده می‌شود"
        />

        {error && <ErrorNote message={error} />}

        <Button type="submit" size="lg" variant="success" loading={busy} className="w-full">
          ارسال کد تأیید
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="num text-dim" dir="ltr">{phone}</span>
        <button
          type="button"
          onClick={() => {
            setPhase('phone');
            setCode('');
            setError(null);
          }}
          className="text-brand-500 transition hover:underline"
        >
          تغییر شماره
        </button>
      </div>

      <TextField
        label="کد تأیید"
        dir="ltr"
        inputMode="numeric"
        maxLength={6}
        placeholder="––––––"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="[&_input]:text-center [&_input]:text-xl [&_input]:tracking-[0.5em]"
        autoComplete="one-time-code"
      />

      <TextField
        label="نام شما (اختیاری)"
        placeholder="فقط برای ثبت‌نام اولین بار"
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        icon={<User size={16} />}
      />

      {devCode && (
        <p className="rounded-2xl bg-amber-500/12 px-4 py-2.5 text-[11px] text-amber-600 dark:text-amber-400">
          حالت توسعه — کد ارسال‌شده: <span className="num font-bold">{devCode}</span>
        </p>
      )}

      {error && <ErrorNote message={error} />}

      <Button type="submit" size="lg" variant="success" loading={busy} className="w-full">
        ورود
      </Button>

      <p className="text-center text-[11px] text-dim">
        {secondsLeft > 0 ? (
          <>
            اعتبار کد: <span className="num">{formatNumber(secondsLeft)}</span> ثانیه
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPhase('phone')}
            className="text-brand-500 transition hover:underline"
          >
            کد منقضی شد — درخواست کد جدید
          </button>
        )}
      </p>
    </form>
  );
}

function ErrorNote({ message, className }: { message: string; className?: string }) {
  return (
    <p
      className={cx(
        'animate-[rise_.3s_ease-out_both] rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500',
        className,
      )}
    >
      {message}
    </p>
  );
}

export function AuthSplash() {
  return (
    <div className="relative grid min-h-dvh place-items-center">
      <Aurora />
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={30} className="animate-spin text-brand-500" />
        <p className="text-xs text-dim">در حال بررسی نشست…</p>
      </div>
    </div>
  );
}
