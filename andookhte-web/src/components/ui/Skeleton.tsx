import { cx } from '../../lib/format';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx(
        'animate-shimmer rounded-2xl bg-[length:200%_100%]',
        'bg-gradient-to-l from-slate-500/10 via-slate-500/25 to-slate-500/10',
        'dark:from-white/5 dark:via-white/15 dark:to-white/5',
        className,
      )}
    />
  );
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cx('glass rounded-4xl p-6', className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-9 w-44" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton key={index} className="h-3" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 rounded-3xl px-4 py-3.5">
      <Skeleton className="h-11 w-11 rounded-2xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
  );
}
