import { useEffect, useRef, useState } from 'react';
import { LogOut, MonitorSmartphone, UserCog, Users } from 'lucide-react';
import { WORKSPACE_ROLE_LABEL, WorkspaceRole } from '../api';
import { useRouter } from '../router/routerContext';
import { useAuth, hasRole } from '../store/authContext';
import { cx } from '../lib/format';
import { haptic } from '../hooks/useMediaQuery';
import { MembersModal } from './MembersModal';

/** حرف نخست نام برای آواتار متنی. */
const initials = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 1);
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`;
};

export function UserMenu() {
  const { user, activeWorkspace, logout } = useAuth();
  const { navigate } = useRouter();
  const [open, setOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
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

  if (!user) return null;

  const canManageMembers = hasRole(activeWorkspace?.role, WorkspaceRole.Admin);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => {
          haptic(8);
          setOpen((value) => !value);
        }}
        aria-label="منوی کاربر"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-sm font-bold text-white shadow-[0_10px_26px_-12px_rgb(51_100_255/.95)] transition hover:scale-105 active:scale-95"
      >
        {initials(user.displayName)}
      </button>

      {open && (
        <div className="glass absolute top-full left-0 z-50 mt-2 w-60 animate-[rise_.3s_cubic-bezier(.16,1,.3,1)_both] overflow-hidden rounded-3xl p-2">
          <div className="border-b border-slate-500/10 px-3 pt-2 pb-3">
            <p className="truncate text-sm font-semibold">{user.displayName}</p>
            <p className="num mt-0.5 truncate text-[11px] text-dim" dir="ltr">
              {user.email ?? user.phoneNumber ?? '—'}
            </p>
            {activeWorkspace && (
              <p className="mt-2 inline-block rounded-full bg-brand-500/12 px-2.5 py-1 text-[10px] text-brand-500">
                {WORKSPACE_ROLE_LABEL[activeWorkspace.role] ?? '—'} در {activeWorkspace.name}
              </p>
            )}
          </div>

          <MenuItem
            icon={<UserCog size={15} />}
            label="پروفایل و تنظیمات"
            onClick={() => {
              setOpen(false);
              navigate('/profile');
            }}
          />

          {canManageMembers && (
            <MenuItem
              icon={<Users size={15} />}
              label="اعضای فضای کاری"
              onClick={() => {
                setOpen(false);
                setMembersOpen(true);
              }}
            />
          )}

          <MenuItem
            icon={<LogOut size={15} />}
            label="خروج"
            tone="danger"
            onClick={() => void logout(false)}
          />

          <MenuItem
            icon={<MonitorSmartphone size={15} />}
            label="خروج از همهٔ دستگاه‌ها"
            tone="danger"
            onClick={() => void logout(true)}
          />
        </div>
      )}

      <MembersModal open={membersOpen} onClose={() => setMembersOpen(false)} />
    </div>
  );
}

function MenuItem({
  icon, label, onClick, tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'flex w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-right text-xs transition',
        tone === 'danger'
          ? 'text-rose-500 hover:bg-rose-500/10'
          : 'text-dim hover:bg-slate-500/8 hover:text-[var(--text-strong)] dark:hover:bg-white/6',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
