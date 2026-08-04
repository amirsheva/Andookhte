import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Crown, Trash2, UserPlus } from 'lucide-react';
import {
  WORKSPACE_ROLE_LABEL,
  WorkspaceRole,
  readErrorMessage,
  workspaceApi,
  type WorkspaceMember,
} from '../api';
import { useAuth } from '../store/authContext';
import { cx, formatDate } from '../lib/format';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { SelectField, TextField } from './ui/Field';
import { Skeleton } from './ui/Skeleton';

const ASSIGNABLE_ROLES = [
  WorkspaceRole.Viewer,
  WorkspaceRole.Accountant,
  WorkspaceRole.Admin,
];

export function MembersModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeWorkspace, user } = useAuth();
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState<number>(WorkspaceRole.Accountant);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setMembers(await workspaceApi.members());
      setError(null);
    } catch (err) {
      setError(readErrorMessage(err, 'دریافت فهرست اعضا با خطا مواجه شد.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [open, load]);

  const handleAdd = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!identifier.trim()) return setError('ایمیل یا شمارهٔ موبایل عضو را وارد کنید.');

    setBusy(true);
    try {
      await workspaceApi.addMember({ identifier: identifier.trim(), role });
      setIdentifier('');
      await load();
    } catch (err) {
      setError(readErrorMessage(err, 'افزودن عضو با خطا مواجه شد.'));
    } finally {
      setBusy(false);
    }
  };

  const handleRoleChange = async (memberId: string, nextRole: number) => {
    setError(null);
    try {
      await workspaceApi.updateMemberRole(memberId, nextRole);
      await load();
    } catch (err) {
      setError(readErrorMessage(err, 'تغییر نقش با خطا مواجه شد.'));
    }
  };

  const handleRemove = async (memberId: string) => {
    setError(null);
    try {
      await workspaceApi.removeMember(memberId);
      await load();
    } catch (err) {
      setError(readErrorMessage(err, 'حذف عضو با خطا مواجه شد.'));
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title="اعضای فضای کاری"
      description={activeWorkspace?.name}
    >
      <form onSubmit={handleAdd} className="glass-soft mb-5 rounded-3xl p-4">
        <p className="mb-3 text-xs font-semibold">افزودن عضو</p>
        <div className="flex flex-wrap items-end gap-3">
          <TextField
            className="min-w-48 flex-1"
            label="ایمیل یا موبایل"
            placeholder="user@example.com یا 09121234567"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <SelectField
            className="w-40"
            label="نقش"
            value={role}
            onChange={(event) => setRole(Number(event.target.value))}
          >
            {ASSIGNABLE_ROLES.map((value) => (
              <option key={value} value={value}>{WORKSPACE_ROLE_LABEL[value]}</option>
            ))}
          </SelectField>
          <Button type="submit" loading={busy}>
            <UserPlus size={16} />
            افزودن
          </Button>
        </div>
        <p className="mt-2.5 text-[11px] text-dim">
          کاربر باید از قبل در اندوخته ثبت‌نام کرده باشد.
        </p>
      </form>

      {error && (
        <p className="mb-4 rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-3xl" />
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => {
            const isSelf = member.userId === user?.id;
            const locked = member.isOwner || isSelf;

            return (
              <li
                key={member.id}
                className="glass-soft flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {member.displayName}
                    {member.isOwner && <Crown size={13} className="shrink-0 text-amber-500" />}
                    {isSelf && <span className="text-[10px] text-dim">(شما)</span>}
                  </p>
                  <p className="num mt-0.5 truncate text-[11px] text-dim" dir="ltr">
                    {member.email ?? member.phoneNumber ?? '—'}
                  </p>
                </div>

                <span className="text-[10px] text-dim">{formatDate(member.joinedAtUtc)}</span>

                {locked ? (
                  <span
                    className={cx(
                      'rounded-full px-3 py-1.5 text-[11px]',
                      member.isOwner ? 'bg-amber-500/12 text-amber-600' : 'bg-slate-500/12 text-dim',
                    )}
                  >
                    {WORKSPACE_ROLE_LABEL[member.role]}
                  </span>
                ) : (
                  <>
                    <select
                      value={member.role}
                      onChange={(event) => void handleRoleChange(member.id, Number(event.target.value))}
                      className="glass-soft h-9 cursor-pointer rounded-xl px-3 text-xs text-[var(--text-strong)] outline-none"
                    >
                      {ASSIGNABLE_ROLES.map((value) => (
                        <option key={value} value={value}>{WORKSPACE_ROLE_LABEL[value]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => void handleRemove(member.id)}
                      aria-label={`حذف ${member.displayName}`}
                      className="grid h-9 w-9 place-items-center rounded-xl text-dim transition hover:bg-rose-500/10 hover:text-rose-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </>
                )}
              </li>
            );
          })}

          {members.length === 0 && (
            <li className="py-8 text-center text-xs text-dim">هنوز عضوی اضافه نشده است.</li>
          )}
        </ul>
      )}
    </Modal>
  );
}
