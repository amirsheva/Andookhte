import { createContext, useContext } from 'react';
import type { CreateDebtInput, Debt, UpdateDebtInput } from '../api';

export interface DebtsContextValue {
  debts: Debt[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addDebt: (input: CreateDebtInput) => Promise<void>;
  updateDebt: (id: string, input: UpdateDebtInput) => Promise<void>;
  removeDebt: (id: string) => Promise<void>;
  extendDebt: (id: string, additionalCount: number) => Promise<void>;
  rescheduleDebt: (id: string, newFirstDueDateUtc: string) => Promise<void>;
  updateInstallment: (installmentId: string, amount: number, dueDateUtc?: string) => Promise<void>;
  payInstallment: (installmentId: string, accountId: string, paidAtUtc?: string) => Promise<void>;
  revertInstallment: (installmentId: string) => Promise<void>;
}

export const DebtsContext = createContext<DebtsContextValue | null>(null);

export const useDebts = (): DebtsContextValue => {
  const ctx = useContext(DebtsContext);
  if (!ctx) throw new Error('useDebts باید داخل DebtsProvider استفاده شود');
  return ctx;
};
