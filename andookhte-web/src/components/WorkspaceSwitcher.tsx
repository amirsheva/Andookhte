import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Briefcase, Check, ChevronDown, Plus, User } from 'lucide-react';
import { WORKSPACE_ROLE_LABEL, WorkspaceType, readErrorMessage } from '../api';
import { useAuth } from '../store/authContext';
import { cx } from '../lib/format';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { SelectField, TextField } from './ui/Field';
import { haptic } from '../hooks/useMediaQuery';

export function WorkspaceSwitcher({ className }: { className?: string }) {
  const { workspaces, activeWorkspace, switchWorkspace } = useAuth();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!activeWorkspace) return null;

  const ActiveIcon = activeWorkspace.type === WorkspaceType.Business ? Briefcase : User;

  return (
    <div ref={wrapRef} className={cx('relative', className)}>
      <button
        onClick={() => {
          haptic(8);
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="glass-soft flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-right transition hover:scale-[1.02] active:scale-[0.98]"
      >
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-xl"
          style={{ background: 'rgb(51 100 255 / .16)' }}
        >
          <ActiveIcon size={15} className="text-brand-500" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold">{activeWorkspace.name}</span>
          <span className="block text-[10px] text-dim">
            {WORKSPACE_ROLE_LABEL[activeWorkspace.role] ?? '—'}
          </span>
        </span>
        <ChevronDown
          size={15}
          className="shrink-0 text-dim transition-transform duration-300"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="glass absolute top-full right-0 left-0 z-50 mt-2 animate-[rise_.3s_cubic-bezier(.16,1,.3,1)_both] overflow-hidden rounded-3xl p-2"
        >
          <p className="px-3 py-2 text-[10px] text-dim">فضاهای کاری شما</p>

          {workspaces.map((workspace) => {
            const Icon = workspace.type === WorkspaceType.Business ? Briefcase : User;
            const active = workspace.id === activeWorkspace.id;
            return (
              <button
                key={workspace.id}
                role="option"
                aria-selected={active}
                onClick={() => {
                  switchWorkspace(workspace.id);
                  setOpen(false);
                  haptic(12);
                }}
                className={cx(
                  'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-right transition',
                  active ? 'bg-brand-500/12' : 'hover:bg-slate-500/8 dark:hover:bg-white/6',
                )}
              >
                <Icon size={15} className={active ? 'text-brand-500' : 'text-dim'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{workspace.name}</span>
                  <span className="block text-[10px] text-dim">
                    {WORKSPACE_ROLE_LABEL[workspace.role] ?? '—'}
                  </span>
                </span>
                {active && <Check size={14} className="shrink-0 text-brand-500" />}
              </button>
            );
          })}

          <button
            onClick={() => {
              setOpen(false);
              setCreating(true);
            }}
            className="mt-1 flex w-full items-center gap-2.5 rounded-2xl border-t border-slate-500/10 px-3 py-2.5 text-right text-xs text-brand-500 transition hover:bg-brand-500/8"
          >
            <Plus size={15} />
            فضای کاری جدید
          </button>
        </div>
      )}

      <CreateWorkspaceModal open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

function CreateWorkspaceModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { createWorkspace } = useAuth();
  const [name, setName] = useState('');
  const [type, setType] = useState<number>(WorkspaceType.Business);
  const [currency, setCurrency] = useState('IRR');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!name.trim()) return setError('نام فضای کاری را وارد کنید.');

    setBusy(true);
    try {
      await createWorkspace({ name: name.trim(), type, currencyCode: currency });
      setName('');
      onClose();
    } catch (err) {
      setError(readErrorMessage(err, 'ساخت فضای کاری با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="فضای کاری جدید"
      description="داده‌های هر فضای کاری کاملاً جدا از بقیه نگهداری می‌شود."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="نام"
          placeholder="مثلاً فروشگاه مرکزی"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />

        <SelectField
          label="نوع"
          value={type}
          onChange={(event) => setType(Number(event.target.value))}
        >
          <option value={WorkspaceType.Business}>کسب‌وکار</option>
          <option value={WorkspaceType.Personal}>شخصی</option>
        </SelectField>

        <SelectField
          label="واحد پول"
          value={currency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          <option value="IRR">ریال</option>
          <option value="IRT">تومان</option>
          <option value="USD">دلار</option>
          <option value="EUR">یورو</option>
        </SelectField>

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

        <Button type="submit" size="lg" loading={busy} className="w-full">
          <Plus size={17} />
          ساختن
        </Button>
      </form>
    </Modal>
  );
}
