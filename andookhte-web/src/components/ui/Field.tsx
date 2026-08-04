import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { useId } from 'react';
import { cx } from '../../lib/format';

const BASE =
  'w-full glass-soft rounded-2xl px-4 text-sm text-[var(--text-strong)] placeholder:text-[var(--text-dim)] ' +
  'transition-all duration-300 outline-none focus:border-brand-400/60 focus:bg-white/80 dark:focus:bg-white/10 ' +
  'focus:shadow-[0_0_0_4px_rgb(51_100_255/0.14)]';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
  className?: string;
}

function FieldShell({ label, hint, error, icon, children, htmlFor, className }: FieldShellProps) {
  return (
    <label htmlFor={htmlFor} className={cx('block', className)}>
      {label && (
        <span className="mb-2 block text-xs font-medium text-dim">{label}</span>
      )}
      <span className="relative block">
        {icon && (
          <span className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-dim">
            {icon}
          </span>
        )}
        {children}
      </span>
      {(hint || error) && (
        <span
          className={cx(
            'mt-1.5 block text-[11px]',
            error ? 'text-rose-500' : 'text-dim',
          )}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  suffix?: string;
  className?: string;
}

export function TextField({
  label, hint, error, icon, suffix, className, ...rest
}: TextFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} icon={icon} htmlFor={id} className={className}>
      <input
        id={id}
        className={cx(
          BASE, 'num h-12',
          icon ? 'pr-11' : '',
          suffix ? 'pl-16' : '',
          error && 'border-rose-400/60',
        )}
        {...rest}
      />
      {suffix && (
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs text-dim">
          {suffix}
        </span>
      )}
    </FieldShell>
  );
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  hint?: string;
  error?: string;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function SelectField({
  label, hint, error, icon, className, children, ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <FieldShell label={label} hint={hint} error={error} icon={icon} htmlFor={id} className={className}>
      <select
        id={id}
        className={cx(BASE, 'h-12 appearance-none cursor-pointer', icon ? 'pr-11' : '')}
        {...rest}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-dim">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </span>
    </FieldShell>
  );
}
