import { Plus, RefreshCw, Sparkles } from 'lucide-react';
import { ThemeToggle } from '../ThemeToggle';
import { UserMenu } from '../UserMenu';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';
import { Button } from '../ui/Button';
import { Link } from '../../router/Link';
import { useRouter } from '../../router/routerContext';
import { findNavItem } from '../../lib/nav';
import { cx } from '../../lib/format';

interface TopBarProps {
  onQuickAdd: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export function TopBar({ onQuickAdd, onRefresh, refreshing = false }: TopBarProps) {
  const { path } = useRouter();
  const current = findNavItem(path);

  return (
    <header className="sticky top-0 z-40 -mx-4 mb-6 px-4 pt-4 pb-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
      <div className="flex items-center gap-3">
        {/* برند در موبایل */}
        <Link to="/" className="flex items-center gap-2.5 lg:hidden">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-[0_10px_24px_-10px_rgb(51_100_255/.9)]">
            <Sparkles size={17} />
          </span>
          <span className="text-base font-extrabold">اندوخته</span>
        </Link>

        {/* عنوان صفحه در دسکتاپ */}
        <div className="hidden lg:block">
          <h1 className="text-xl font-extrabold">{current?.label ?? 'اندوخته'}</h1>
          <p className="mt-0.5 text-[11px] text-dim">
            {new Intl.DateTimeFormat('fa-IR', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            }).format(new Date())}
          </p>
        </div>

        <div className="mr-auto flex items-center gap-2">
          {/* سوییچ فضای کاری در موبایل اینجاست؛ در دسکتاپ داخل سایدبار قرار دارد */}
          <WorkspaceSwitcher className="w-40 lg:hidden" />

          <button
            onClick={onRefresh}
            aria-label="بارگذاری مجدد"
            className="glass-soft grid h-11 w-11 place-items-center rounded-2xl text-dim transition hover:scale-105 hover:text-[var(--text-strong)] active:scale-95"
          >
            <RefreshCw size={17} className={cx(refreshing && 'animate-spin')} />
          </button>
          <ThemeToggle />
          <Button onClick={onQuickAdd} className="hidden sm:inline-flex">
            <Plus size={17} />
            تراکنش جدید
          </Button>
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
