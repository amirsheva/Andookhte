import { useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  /** عملیات ویرانگر با رنگ هشدار نمایش داده می‌شود */
  destructive?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'تأیید',
  destructive = true,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات با خطا مواجه شد.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-md">
      <div className="space-y-5">
        {description && (
          <div className="flex gap-3 rounded-2xl bg-amber-500/10 px-4 py-3.5 text-xs leading-relaxed text-amber-700 dark:text-amber-400">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <div>{description}</div>
          </div>
        )}

        {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-2.5 text-xs text-rose-500">{error}</p>}

        <div className="flex gap-3">
          <Button variant="soft" className="flex-1" onClick={onClose} disabled={busy}>
            انصراف
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            className="flex-1"
            loading={busy}
            onClick={() => void handleConfirm()}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
