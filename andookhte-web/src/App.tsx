import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Router } from './router/Router';
import { useRouter } from './router/routerContext';
import { ThemeProvider } from './store/ThemeProvider';
import { ToastProvider } from './store/ToastProvider';
import { AuthProvider } from './store/AuthProvider';
import { useAuth } from './store/authContext';
import { FinanceProvider } from './store/FinanceProvider';
import { useFinance } from './store/financeContext';
import { Aurora } from './components/Aurora';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { TopBar } from './components/layout/TopBar';
import { Modal } from './components/ui/Modal';
import { TransactionForm } from './components/TransactionForm';
import { Dashboard } from './pages/Dashboard';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Analytics } from './pages/Analytics';
import { Profile } from './pages/Profile';
import { AuthSplash, Login } from './pages/Login';
import { GlassCard } from './components/ui/GlassCard';
import { Button } from './components/ui/Button';
import { Link } from './router/Link';

function NotFound() {
  return (
    <GlassCard className="py-20 text-center">
      <p className="num text-5xl font-extrabold text-dim">۴۰۴</p>
      <p className="mt-3 text-sm text-dim">صفحه‌ای که دنبالش بودید پیدا نشد.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>بازگشت به داشبورد</Button>
      </Link>
    </GlassCard>
  );
}

function Routes() {
  const { path } = useRouter();

  const page =
    path === '/' ? <Dashboard />
    : path.startsWith('/accounts') ? <Accounts />
    : path.startsWith('/transactions') ? <Transactions />
    : path.startsWith('/analytics') ? <Analytics />
    : path.startsWith('/profile') ? <Profile />
    : <NotFound />;

  return (
    <div key={path} className="animate-[page-in_.45s_cubic-bezier(.16,1,.3,1)_both]">
      {page}
    </div>
  );
}

function ErrorBanner() {
  const { error, refresh } = useFinance();
  if (!error) return null;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl bg-rose-500/10 px-4 py-3 text-xs text-rose-500">
      <AlertTriangle size={16} className="shrink-0" />
      <span className="flex-1">{error}</span>
      <button onClick={() => void refresh()} className="font-semibold underline underline-offset-4">
        تلاش دوباره
      </button>
    </div>
  );
}

function Shell() {
  const { refresh, loading } = useFinance();
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  return (
    <div className="flex min-h-dvh">
      <Aurora />
      <Sidebar />

      <main className="min-w-0 flex-1 px-4 pb-28 sm:px-6 lg:pb-10">
        <TopBar
          onQuickAdd={() => setQuickAddOpen(true)}
          onRefresh={() => void refresh()}
          refreshing={loading}
        />
        <ErrorBanner />
        <Routes />
      </main>

      <BottomNav onQuickAdd={() => setQuickAddOpen(true)} />

      <Modal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        title="ثبت تراکنش"
        description="درآمد، هزینه یا انتقال بین حساب‌ها"
      >
        <TransactionForm onDone={() => setQuickAddOpen(false)} />
      </Modal>
    </div>
  );
}

/** تا وقتی کاربر وارد نشده، هیچ صفحه‌ای از اپ رندر نمی‌شود. */
function Gate() {
  const { status } = useAuth();

  if (status === 'loading') return <AuthSplash />;
  if (status === 'anonymous') return <Login />;

  return (
    <FinanceProvider>
      <Shell />
    </FinanceProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AuthProvider>
            <Gate />
          </AuthProvider>
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
}
