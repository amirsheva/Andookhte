import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { ActionMenu } from './ui/ActionMenu';
import { TransactionType, type Transaction } from '../api';
import { getCategory } from '../lib/categories';
import { useFinance } from '../store/financeContext';
import { cx, formatNumber, formatTime, relativeDay } from '../lib/format';

interface TransactionRowProps {
  transaction: Transaction;
  index?: number;
  showAccount?: boolean;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

export function TransactionRow({
  transaction,
  index = 0,
  showAccount = true,
  onEdit,
  onDelete,
}: TransactionRowProps) {
  const { accountById } = useFinance();
  const meta = getCategory(transaction.category);
  const Icon = meta.icon;

  const isIncome = transaction.type === TransactionType.Income;
  const isTransfer = transaction.type === TransactionType.Transfer;

  const sign = isTransfer ? '' : isIncome ? '+' : '−';
  const amountClass = isTransfer
    ? 'text-[var(--text-strong)]'
    : isIncome
      ? 'text-emerald-500 glow-mint'
      : 'text-rose-500 glow-rose';

  const DirectionIcon = isTransfer ? ArrowLeftRight : isIncome ? ArrowDownLeft : ArrowUpRight;

  const account = accountById(
    isIncome || isTransfer ? transaction.destinationAccountId : transaction.sourceAccountId,
  );

  return (
    <div
      style={{ animationDelay: `${Math.min(index, 12) * 45}ms` }}
      className="group flex animate-[rise_.55s_cubic-bezier(.16,1,.3,1)_both] items-center gap-3.5 rounded-3xl px-3 py-3 transition-colors duration-300 hover:bg-slate-500/6 dark:hover:bg-white/5 sm:px-4"
    >
      <span
        className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 group-hover:scale-110"
        style={{ background: `rgb(${meta.rgb} / .14)`, boxShadow: `inset 0 0 0 1px rgb(${meta.rgb} / .22)` }}
      >
        <Icon size={18} style={{ color: `rgb(${meta.rgb})` }} />
        <span
          className="absolute -bottom-1 -left-1 grid h-5 w-5 place-items-center rounded-full text-[9px]"
          style={{
            background: isTransfer ? 'rgb(51 100 255)' : isIncome ? 'rgb(16 185 129)' : 'rgb(244 63 94)',
            color: '#fff',
          }}
        >
          <DirectionIcon size={11} />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">
          {transaction.description?.trim() || meta.label}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-dim">
          <span>{meta.label}</span>
          <span aria-hidden>·</span>
          <span>{relativeDay(transaction.occurredAt)}</span>
          {formatTime(transaction.occurredAt) && (
            <>
              <span aria-hidden>·</span>
              <span className="num">{formatTime(transaction.occurredAt)}</span>
            </>
          )}
          {showAccount && account && (
            <>
              <span aria-hidden className="hidden sm:inline">·</span>
              <span className="hidden truncate sm:inline">{account.title}</span>
            </>
          )}
        </p>
      </div>

      <p className={cx('num shrink-0 text-sm font-bold whitespace-nowrap sm:text-base', amountClass)}>
        {sign} {formatNumber(transaction.amount)}
      </p>

      {(onEdit || onDelete) && (
        <ActionMenu
          label={`عملیات ${transaction.description ?? meta.label}`}
          className="shrink-0"
          items={[
            ...(onEdit
              ? [{
                  key: 'edit',
                  label: 'ویرایش',
                  icon: <Pencil size={14} />,
                  onSelect: () => onEdit(transaction),
                }]
              : []),
            ...(onDelete
              ? [{
                  key: 'delete',
                  label: 'حذف',
                  icon: <Trash2 size={14} />,
                  tone: 'danger' as const,
                  onSelect: () => onDelete(transaction),
                }]
              : []),
          ]}
        />
      )}
    </div>
  );
}
