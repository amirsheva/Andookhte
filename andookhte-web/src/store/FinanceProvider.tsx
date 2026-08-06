import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  TransactionType,
  bulkDeleteTransactions,
  createAccount,
  createTransaction,
  deleteAccount,
  deleteTransaction,
  getAccounts,
  getTransactionPage,
  importTransactionsExcel,
  readErrorMessage,
  updateAccount,
  updateTransaction,
  type Account,
  type BulkOperationResult,
  type CreateAccountInput,
  type CreateTransactionInput,
  type Transaction,
  type UpdateAccountInput,
  type UpdateTransactionInput,
} from '../api';
import { useAuth } from './authContext';
import { FinanceContext } from './financeContext';

const PAGE_SIZE = 100;

const byNewestFirst = (a: Transaction, b: Transaction) =>
  new Date(b.occurredAt ?? 0).getTime() - new Date(a.occurredAt ?? 0).getTime();

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { activeWorkspace } = useAuth();
  const workspaceId = activeWorkspace?.id ?? null;

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pageRef = useRef(1);

  /** بارگذاری صفحهٔ اول — هیچ setState‌ای پیش از اولین await انجام نمی‌شود. */
  const load = useCallback(async () => {
    try {
      const [accs, page] = await Promise.all([getAccounts(), getTransactionPage(1, PAGE_SIZE)]);

      pageRef.current = page.page;
      setAccounts(accs);
      setTransactions([...page.items].sort(byNewestFirst));
      setTotalTransactions(page.total);
      setHasMore(page.hasMore);
      setError(null);
    } catch (err) {
      setError(readErrorMessage(err, 'دریافت اطلاعات مالی با خطا مواجه شد.'));
      setAccounts([]);
      setTransactions([]);
      setTotalTransactions(0);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;

    setLoadingMore(true);
    try {
      const next = await getTransactionPage(pageRef.current + 1, PAGE_SIZE);
      pageRef.current = next.page;

      // ادغام بر اساس شناسه: اگر بین دو درخواست تراکنشی اضافه شده باشد،
      // ممکن است ردیفی در دو صفحه تکرار شود.
      setTransactions((current) => {
        const seen = new Set(current.map((t) => t.id));
        const merged = [...current, ...next.items.filter((t) => !seen.has(t.id))];
        return merged.sort(byNewestFirst);
      });

      setTotalTransactions(next.total);
      setHasMore(next.hasMore);
    } catch (err) {
      setError(readErrorMessage(err, 'دریافت تراکنش‌های بیشتر با خطا مواجه شد.'));
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore]);

  // با تعویض فضای کاری، داده‌ها از نو خوانده می‌شوند
  useEffect(() => {
    if (!workspaceId) return;
    pageRef.current = 1;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [workspaceId, load]);

  /* ————————————————— تراکنش ————————————————— */

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      await createTransaction({
        ...input,
        occurredAtUtc: input.occurredAtUtc ?? new Date().toISOString(),
      });
      await refresh();
    },
    [refresh],
  );

  const editTransaction = useCallback(
    async (id: string, input: UpdateTransactionInput) => {
      await updateTransaction(id, input);
      await refresh();
    },
    [refresh],
  );

  const removeTransaction = useCallback(
    async (id: string) => {
      await deleteTransaction(id);
      await refresh();
    },
    [refresh],
  );

  const bulkRemoveTransactions = useCallback(
    async (ids: string[]): Promise<BulkOperationResult> => {
      const result = await bulkDeleteTransactions(ids);
      await refresh();
      return result;
    },
    [refresh],
  );

  const importTransactions = useCallback(
    async (file: File): Promise<BulkOperationResult> => {
      const result = await importTransactionsExcel(file);
      await refresh();
      return result;
    },
    [refresh],
  );

  const transfer = useCallback(
    async (input: {
      amount: number;
      sourceAccountId: string;
      destinationAccountId: string;
      description?: string;
    }) =>
      addTransaction({
        type: TransactionType.Transfer,
        amount: input.amount,
        sourceAccountId: input.sourceAccountId,
        destinationAccountId: input.destinationAccountId,
        category: 'transfer',
        description: input.description ?? 'انتقال بین حساب',
      }),
    [addTransaction],
  );

  /* ————————————————— حساب ————————————————— */

  const addAccount = useCallback(
    async (input: CreateAccountInput) => {
      await createAccount(input);
      await refresh();
    },
    [refresh],
  );

  const editAccount = useCallback(
    async (id: string, input: UpdateAccountInput) => {
      await updateAccount(id, input);
      await refresh();
    },
    [refresh],
  );

  const removeAccount = useCallback(
    async (id: string) => {
      await deleteAccount(id);
      await refresh();
    },
    [refresh],
  );

  const accountById = useCallback(
    (id?: string) => (id ? accounts.find((a) => a.id === id) : undefined),
    [accounts],
  );

  const value = useMemo(
    () => ({
      accounts,
      transactions,
      loading,
      loadingMore,
      totalTransactions,
      hasMore,
      error,
      refresh,
      loadMore,
      addTransaction,
      editTransaction,
      removeTransaction,
      bulkRemoveTransactions,
      importTransactions,
      transfer,
      addAccount,
      editAccount,
      removeAccount,
      accountById,
    }),
    [
      accounts, transactions, loading, loadingMore, totalTransactions, hasMore, error,
      refresh, loadMore, addTransaction, editTransaction, removeTransaction,
      bulkRemoveTransactions, importTransactions, transfer,
      addAccount, editAccount, removeAccount, accountById,
    ],
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}
