import { Sparkles } from 'lucide-react';
import { WorkspaceSwitcher } from '../WorkspaceSwitcher';
import { Link } from '../../router/Link';
import { matchPath, useRouter } from '../../router/routerContext';
import { NAV_ITEMS } from '../../lib/nav';
import { cx } from '../../lib/format';

export function Sidebar() {
  const { path } = useRouter();

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 p-6 lg:flex">
      {/* نشان برند */}
      <Link to="/" className="flex items-center gap-3">
        <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 via-brand-500 to-brand-700 text-white shadow-[0_12px_30px_-10px_rgb(51_100_255/.9)]">
          <Sparkles size={19} />
        </span>
        <span>
          <span className="block text-lg leading-tight font-extrabold">اندوخته</span>
          <span className="block text-[11px] text-dim">مدیریت هوشمند مالی</span>
        </span>
      </Link>

      <WorkspaceSwitcher />

      <nav className="flex flex-col gap-1.5">
        {NAV_ITEMS.map((item, index) => {
          const active = matchPath(path, item.to, item.to === '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              exact={item.to === '/'}
              style={{ animationDelay: `${index * 55}ms` }}
              className={cx(
                'group relative flex animate-[slide-in-x_.5s_ease-out_both] items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-all duration-300',
                active
                  ? 'text-[var(--text-strong)]'
                  : 'text-dim hover:bg-slate-500/8 hover:text-[var(--text-strong)] dark:hover:bg-white/6',
              )}
            >
              {active && (
                <>
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `linear-gradient(to left, rgb(${item.rgb} / .18), rgb(${item.rgb} / .04))`,
                      boxShadow: `inset 0 0 0 1px rgb(${item.rgb} / .28)`,
                    }}
                  />
                  <span
                    aria-hidden
                    className="absolute top-1/2 right-0 h-6 w-1 -translate-y-1/2 rounded-full"
                    style={{ background: `rgb(${item.rgb})`, boxShadow: `0 0 14px rgb(${item.rgb})` }}
                  />
                </>
              )}
              <Icon
                size={18}
                className="relative transition-transform duration-300 group-hover:scale-110"
                style={active ? { color: `rgb(${item.rgb})` } : undefined}
              />
              <span className="relative">{item.label}</span>
              {item.soon && (
                <span className="relative mr-auto rounded-full bg-slate-500/15 px-2 py-0.5 text-[9px] text-dim">
                  به‌زودی
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="glass-soft mt-auto rounded-3xl p-4">
        <p className="text-xs font-semibold">فضای کاری جداگانه</p>
        <p className="mt-1 text-[11px] leading-relaxed text-dim">
          داده‌های هر فضای کاری کاملاً مستقل است. با سوییچ بالا می‌توانید بین حساب شخصی و
          کسب‌وکار جابه‌جا شوید.
        </p>
      </div>
    </aside>
  );
}
