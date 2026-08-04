import { createContext, useContext } from 'react';
import type {
  Account,
  CreateAccountInput,
  CreateTransactionInput,
  Transaction,
  UpdateAccountInput,
  UpdateTransactionInput,
} from '../api';

export interface FinanceContextValue {
  accounts: Account[];
  transactions: Transaction[];
  loading: boolean;
  /** در حال دریافت صفحهٔ بعدی تراکنش‌ها */
  loadingMore: boolean;
  /** شمار کل تراکنش‌های موجود روی سرور، نه تعداد بارگذاری‌شده */
  totalTransactions: number;
  hasMore: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  addTransaction: (input: CreateTransactionInput) => Promise<void>;
  editTransaction: (id: string, input: UpdateTransactionInput) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  transfer: (input: {
    amount: number;
    sourceAccountId: string;
    destinationAccountId: string;
    description?: string;
  }) => Promise<void>;

  addAccount: (input: CreateAccountInput) => Promise<void>;
  editAccount: (id: string, input: UpdateAccountInput) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;

  accountById: (id?: string) => Account | undefined;
}

export const FinanceContext = createContext<FinanceContextValue | null>(null);

export const useFinance = (): FinanceContextValue => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance باید داخل FinanceProvider استفاده شود');
  return ctx;
};
