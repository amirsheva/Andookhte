import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  debtsApi, readErrorMessage, type CreateDebtInput, type Debt, type UpdateDebtInput,
} from '../api';
import { useAuth } from './authContext';
import { useFinance } from './financeContext';
import { DebtsContext } from './debtsContext';

export function DebtsProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useAuth();
  // پرداخت یک قسط، تراکنش واقعی می‌سازد و موجودی حساب را عوض می‌کند؛ باید
  // FinanceProvider هم پس از آن رفرش شود، وگرنه موجودی در صفحهٔ حساب‌ها قدیمی می‌ماند.
  const { refresh: refreshFinance } = useFinance();
  const workspaceId = activeWorkspace?.id ?? null;

  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setDebts(await debtsApi.list());
      setError(null);
    } catch (err) {
      setError(readErrorMessage(err, 'دریافت بدهی/طلب با خطا مواجه شد.'));
      setDebts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  useEffect(() => {
    if (!workspaceId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [workspaceId, load]);

  const addDebt = useCallback(
    async (input: CreateDebtInput) => {
      await debtsApi.create(input);
      await refresh();
    },
    [refresh],
  );

  const updateDebt = useCallback(
    async (id: string, input: UpdateDebtInput) => {
      await debtsApi.update(id, input);
      await refresh();
    },
    [refresh],
  );

  const removeDebt = useCallback(
    async (id: string) => {
      await debtsApi.remove(id);
      await refresh();
    },
    [refresh],
  );

  const extendDebt = useCallback(
    async (id: string, additionalCount: number) => {
      await debtsApi.extend(id, additionalCount);
      await refresh();
    },
    [refresh],
  );

  const rescheduleDebt = useCallback(
    async (id: string, newFirstDueDateUtc: string) => {
      await debtsApi.reschedule(id, newFirstDueDateUtc);
      await refresh();
    },
    [refresh],
  );

  const updateInstallment = useCallback(
    async (installmentId: string, amount: number, dueDateUtc?: string) => {
      await debtsApi.updateInstallment(installmentId, amount, dueDateUtc);
      await refresh();
    },
    [refresh],
  );

  const payInstallment = useCallback(
    async (installmentId: string, accountId: string, paidAtUtc?: string) => {
      await debtsApi.payInstallment(installmentId, accountId, paidAtUtc);
      await Promise.all([refresh(), refreshFinance()]);
    },
    [refresh, refreshFinance],
  );

  const revertInstallment = useCallback(
    async (installmentId: string) => {
      await debtsApi.revertInstallment(installmentId);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      debts, loading, error, refresh, addDebt, updateDebt, removeDebt,
      extendDebt, rescheduleDebt, updateInstallment, payInstallment, revertInstallment,
    }),
    [
      debts, loading, error, refresh, addDebt, updateDebt, removeDebt,
      extendDebt, rescheduleDebt, updateInstallment, payInstallment, revertInstallment,
    ],
  );

  return <DebtsContext.Provider value={value}>{children}</DebtsContext.Provider>;
}
