import { Plus } from 'lucide-react';
import { Link } from '../../router/Link';
import { matchPath, useRouter } from '../../router/routerContext';
import { NAV_ITEMS } from '../../lib/nav';
import { cx } from '../../lib/format';
import { haptic } from '../../hooks/useMediaQuery';

interface BottomNavProps {
  onQuickAdd: () => void;
}

export function BottomNav({ onQuickAdd }: BottomNavProps) {
  const { path } = useRouter();
  const items = NAV_ITEMS.slice(0, 5);
  const left = items.slice(0, 2);
  const right = items.slice(2);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => {
    const active = matchPath(path, item.to, item.to === '/');
    const Icon = item.icon;
    return (
      <Link
        key={item.to}
        to={item.to}
        exact={item.to === '/'}
        onClick={() => haptic(10)}
        className={cx(
          'relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors duration-300',
          active ? 'text-[var(--text-strong)]' : 'text-dim',
        )}
      >
        <span className="relative grid h-8 w-12 place-items-center">
          {active && (
            <span
              aria-hidden
              className="absolute inset-0 rounded-2xl"
              style={{ background: `rgb(${item.rgb} / .16)` }}
            />
          )}
          <Icon
            size={19}
            className="relative transition-transform duration-300"
            style={{
              color: active ? `rgb(${item.rgb})` : undefined,
              transform: active ? 'translateY(-1px) scale(1.08)' : undefined,
            }}
          />
        </span>
        {item.label}
      </Link>
    );
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="glass mx-3 mb-3 flex items-center rounded-3xl px-2 py-1 shadow-[0_-8px_40px_-12px_rgb(2_6_23/.35)]">
        {left.map(renderItem)}

        <button
          onClick={() => {
            haptic([12, 30, 12]);
            onQuickAdd();
          }}
          aria-label="ثبت تراکنش جدید"
          className="relative mx-1 grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-[0_14px_30px_-10px_rgb(51_100_255/.95)] transition-transform duration-300 active:scale-90"
        >
          <span
            aria-hidden
            className="absolute inset-0 animate-[pulse-ring_2.6s_ease-out_infinite] rounded-2xl bg-brand-500/40"
          />
          <Plus size={22} className="relative" />
        </button>

        {right.map(renderItem)}
      </div>
    </nav>
  );
}
