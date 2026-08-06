import axios, { type AxiosError } from 'axios';
import { authStorage, notifySessionExpired } from './lib/authStorage';

declare module 'axios' {
  export interface AxiosRequestConfig {
    /** جلوگیری از حلقهٔ بی‌پایان تمدید توکن */
    _retried?: boolean;
    /** برای درخواست‌هایی مثل خروج که نباید تمدید را فعال کنند */
    _skipAuthRefresh?: boolean;
  }
}

export const API_BASE_URL: string =
  (import.meta.env?.VITE_API_BASE_URL as string | undefined) ?? 'https://localhost:7101/api';

export const http = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

/* ————————————————— انواع داده ————————————————— */

export const TransactionType = {
  Income: 1,
  Expense: 2,
  Transfer: 3,
} as const;

export const AccountType = {
  Bank: 1,
  Cash: 2,
  Gold: 3,
  Crypto: 4,
  SavingsFund: 5,
  Currency: 6,
} as const;

export const ACCOUNT_TYPE_LABEL: Record<number, string> = {
  1: 'حساب بانکی',
  2: 'نقدی',
  3: 'طلا',
  4: 'رمزارز',
  5: 'صندوق پس‌انداز',
  6: 'ارز',
};

export const WorkspaceRole = {
  Viewer: 1,
  Accountant: 2,
  Admin: 3,
  Owner: 4,
} as const;
export type WorkspaceRoleValue = (typeof WorkspaceRole)[keyof typeof WorkspaceRole];

export const WORKSPACE_ROLE_LABEL: Record<number, string> = {
  1: 'بیننده',
  2: 'حسابدار',
  3: 'مدیر',
  4: 'مالک',
};

export const WorkspaceType = { Personal: 1, Business: 2 } as const;

export interface AuthUser {
  id: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  isEmailConfirmed: boolean;
  isPhoneConfirmed: boolean;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  type: number;
  currencyCode: string;
  role: number;
  isOwner: boolean;
  memberCount?: number;
}

export interface AuthResult {
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
}

export interface MeResult {
  user: AuthUser;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId?: string | null;
  activeRole?: number | null;
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  displayName: string;
  email?: string | null;
  phoneNumber?: string | null;
  role: number;
  isOwner: boolean;
  joinedAtUtc: string;
}

export interface Account {
  id: string;
  title: string;
  type: number;
  currentBalance: number;
  currencyCode: string;
  cardNumber?: string;
  bankName?: string;
  iban?: string;
  /** شمار تراکنش‌های وابسته — حسابی که تراکنش دارد قابل حذف نیست. */
  transactionCount: number;
  note?: string;
  goldWeightGrams?: number;
  goldPurity?: number;
  goldItemType?: string;
  cryptoSymbol?: string;
  manualRateIrr?: number;
}

export interface Transaction {
  id: string;
  type: number;
  amount: number;
  category?: string;
  description?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  occurredAt?: string;
}

export interface CreateTransactionInput {
  type: number;
  amount: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
  category: string;
  description: string;
  occurredAtUtc?: string;
}

export interface CreateAccountInput {
  title: string;
  type: number;
  initialBalance: number;
  currencyCode: string;
  cardNumber?: string;
  iban?: string;
  bankName?: string;
  note?: string;
  goldWeightGrams?: number;
  goldPurity?: number;
  goldItemType?: string;
  cryptoSymbol?: string;
  manualRateIrr?: number;
}

/**
 * موجودی عمداً قابل ویرایش نیست. موجودی حاصل تراکنش‌هاست و تغییر دستی آن
 * باعث می‌شود مجموع تراکنش‌ها با موجودی نخواند.
 */
export interface UpdateAccountInput {
  title: string;
  type: number;
  currencyCode: string;
  cardNumber?: string;
  iban?: string;
  bankName?: string;
  note?: string;
  goldWeightGrams?: number;
  goldPurity?: number;
  goldItemType?: string;
  cryptoSymbol?: string;
  manualRateIrr?: number;
}

export interface UpdateTransactionInput {
  type: number;
  amount: number;
  sourceAccountId?: string;
  destinationAccountId?: string;
  category: string;
  description: string;
  occurredAtUtc?: string;
}

export interface OtpChallenge {
  receiver: string;
  expiresInSeconds: number;
  developmentCode?: string | null;
}

/* ————————————————— اینترسپتورها ————————————————— */

http.interceptors.request.use((config) => {
  const token = authStorage.accessToken;
  if (token) config.headers.set('Authorization', `Bearer ${token}`);

  const workspaceId = authStorage.workspaceId;
  if (workspaceId) config.headers.set('X-Workspace-Id', workspaceId);

  return config;
});

/**
 * تمدید توکن به‌صورت تک‌پروازه: اگر چند درخواست هم‌زمان ۴۰۱ بگیرند،
 * فقط یک بار refresh صدا زده می‌شود و بقیه منتظر همان نتیجه می‌مانند.
 */
let refreshInFlight: Promise<string | null> | null = null;

const runRefresh = async (): Promise<string | null> => {
  const refreshToken = authStorage.refreshToken;
  if (!refreshToken) return null;

  try {
    const response = await axios.post<AuthResult>(
      `${API_BASE_URL}/Auth/refresh`,
      { refreshToken },
      { timeout: 15000 },
    );
    authStorage.setTokens(response.data.accessToken, response.data.refreshToken);
    return response.data.accessToken;
  } catch {
    authStorage.clear();
    return null;
  }
};

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const config = error.config;

    if (error.response?.status !== 401 || !config || config._retried || config._skipAuthRefresh) {
      return Promise.reject(error);
    }

    config._retried = true;

    refreshInFlight ??= runRefresh().finally(() => {
      refreshInFlight = null;
    });

    const token = await refreshInFlight;

    if (!token) {
      notifySessionExpired();
      return Promise.reject(error);
    }

    config.headers.set('Authorization', `Bearer ${token}`);
    return http(config);
  },
);

/** پیام خطای خواناى فارسی از پاسخ سرور. */
export const readErrorMessage = (error: unknown, fallback = 'خطای غیرمنتظره‌ای رخ داد.'): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
    if (!error.response) return 'ارتباط با سرور برقرار نشد. اتصال شبکه را بررسی کنید.';
  }
  return fallback;
};

/* ————————————————— نرمال‌سازی ————————————————— */

const PLACEHOLDER =
  /^(string\d*|str|test\d*|sample|example|foo|bar|dummy|todo|n\/?a|null|undefined|none|unknown|x+|[-._،؛]+|\?+|0+)$/i;

const clean = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const text = value.trim();
  if (!text || PLACEHOLDER.test(text)) return undefined;
  return text;
};

const firstClean = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const result = clean(value);
    if (result) return result;
  }
  return undefined;
};

const pickArray = (payload: unknown): Record<string, unknown>[] => {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    for (const key of ['data', 'items', 'result', 'value', 'records']) {
      if (Array.isArray(record[key])) return record[key] as Record<string, unknown>[];
    }
  }
  return [];
};

const normalizeAccount = (raw: Record<string, unknown>): Account => ({
  id: String(raw.id ?? ''),
  title: firstClean(raw.title, raw.name) ?? 'حساب بدون عنوان',
  type: Number(raw.type ?? AccountType.Bank),
  currentBalance: Number(raw.currentBalance ?? raw.balance ?? 0),
  currencyCode: firstClean(raw.currencyCode, raw.currency) ?? 'IRR',
  cardNumber: firstClean(raw.cardNumber),
  bankName: firstClean(raw.bankName),
  iban: firstClean(raw.iban, raw.IBAN),
  transactionCount: Number(raw.transactionCount ?? 0),
  note: firstClean(raw.note),
  goldWeightGrams: raw.goldWeightGrams != null ? Number(raw.goldWeightGrams) : undefined,
  goldPurity: raw.goldPurity != null ? Number(raw.goldPurity) : undefined,
  goldItemType: firstClean(raw.goldItemType),
  cryptoSymbol: firstClean(raw.cryptoSymbol),
  manualRateIrr: raw.manualRateIrr != null ? Number(raw.manualRateIrr) : undefined,
});

const normalizeTransaction = (raw: Record<string, unknown>): Transaction => ({
  id: String(raw.id ?? ''),
  type: Number(raw.type ?? TransactionType.Expense),
  amount: Number(raw.amount ?? 0),
  category: firstClean(raw.category),
  description: firstClean(raw.description),
  sourceAccountId: (raw.sourceAccountId ?? undefined) as string | undefined,
  destinationAccountId: (raw.destinationAccountId ?? undefined) as string | undefined,
  occurredAt: (raw.occurredAtUtc ?? raw.occurredAt ?? raw.createdAtUtc ?? undefined) as string | undefined,
});

/* ————————————————— احراز هویت ————————————————— */

export const authApi = {
  register: async (input: {
    email: string;
    password: string;
    displayName: string;
    phoneNumber?: string;
  }): Promise<AuthResult> => (await http.post<AuthResult>('/Auth/register', input)).data,

  login: async (input: { email: string; password: string }): Promise<AuthResult> =>
    (await http.post<AuthResult>('/Auth/login', input)).data,

  requestOtp: async (phoneNumber: string) =>
    (
      await http.post<{ receiver: string; expiresInSeconds: number; developmentCode?: string | null }>(
        '/Auth/otp/request',
        { phoneNumber },
      )
    ).data,

  verifyOtp: async (input: { phoneNumber: string; code: string; displayName?: string }): Promise<AuthResult> =>
    (await http.post<AuthResult>('/Auth/otp/verify', input)).data,

  me: async (): Promise<MeResult> => (await http.get<MeResult>('/Auth/me')).data,

  logout: async (allDevices = false): Promise<void> => {
    const refreshToken = authStorage.refreshToken;
    try {
      await http.post('/Auth/logout', { refreshToken, allDevices }, { _skipAuthRefresh: true });
    } catch {
      // خروج سمت کاربر نباید به خطای سرور وابسته باشد
    }
  },

  forgotPassword: async (identifier: string): Promise<OtpChallenge> =>
    (await http.post<OtpChallenge>('/Auth/password/forgot', { identifier })).data,

  resetPassword: async (input: {
    identifier: string;
    code: string;
    newPassword: string;
  }): Promise<AuthResult> => (await http.post<AuthResult>('/Auth/password/reset', input)).data,
};

/* ————————————————— پروفایل ————————————————— */

export const ContactChannel = { Phone: 1, Email: 2 } as const;

export const profileApi = {
  update: async (input: {
    displayName: string;
    email?: string | null;
    phoneNumber?: string | null;
  }): Promise<AuthUser> => (await http.put<AuthUser>('/Profile', input)).data,

  /** پاسخ شامل توکن تازه است، چون تغییر رمز همهٔ نشست‌های قبلی را باطل می‌کند. */
  changePassword: async (input: {
    currentPassword?: string | null;
    newPassword: string;
  }): Promise<AuthResult> => (await http.put<AuthResult>('/Profile/password', input)).data,

  sendVerification: async (channel: number): Promise<OtpChallenge> =>
    (await http.post<OtpChallenge>('/Profile/verify/send', { channel })).data,

  confirmVerification: async (channel: number, code: string): Promise<AuthUser> =>
    (await http.post<AuthUser>('/Profile/verify/confirm', { channel, code })).data,
};

/* ————————————————— کلیدهای API (برای اتوماسیون‌هایی مثل شورتکات آیفون) ————————————————— */

export interface ApiKeySummary {
  id: string;
  label: string;
  lastFour: string;
  createdAtUtc: string;
  lastUsedAtUtc?: string | null;
  isRevoked: boolean;
}

export interface CreatedApiKey {
  id: string;
  label: string;
  rawKey: string;
  createdAtUtc: string;
}

export const apiKeysApi = {
  list: async (): Promise<ApiKeySummary[]> => (await http.get<ApiKeySummary[]>('/ApiKeys')).data,

  create: async (label: string): Promise<CreatedApiKey> =>
    (await http.post<CreatedApiKey>('/ApiKeys', { label })).data,

  revoke: async (id: string): Promise<void> => {
    await http.delete(`/ApiKeys/${id}`);
  },
};

/* ————————————————— فضای کاری ————————————————— */

export const workspaceApi = {
  list: async (): Promise<WorkspaceSummary[]> =>
    (await http.get<WorkspaceSummary[]>('/Workspaces')).data,

  create: async (input: { name: string; type: number; currencyCode?: string }): Promise<WorkspaceSummary> =>
    (await http.post<WorkspaceSummary>('/Workspaces', input)).data,

  rename: async (name: string): Promise<void> => {
    await http.put('/Workspaces', { name });
  },

  members: async (): Promise<WorkspaceMember[]> =>
    (await http.get<WorkspaceMember[]>('/Workspaces/members')).data,

  addMember: async (input: { identifier: string; role: number }): Promise<WorkspaceMember> =>
    (await http.post<WorkspaceMember>('/Workspaces/members', input)).data,

  updateMemberRole: async (memberId: string, role: number): Promise<void> => {
    await http.put(`/Workspaces/members/${memberId}/role`, { role });
  },

  removeMember: async (memberId: string): Promise<void> => {
    await http.delete(`/Workspaces/members/${memberId}`);
  },
};

/* ————————————————— مالی ————————————————— */

export const getAccounts = async (): Promise<Account[]> => {
  const res = await http.get('/Accounts');
  return pickArray(res.data).map(normalizeAccount);
};

export const createAccount = async (data: CreateAccountInput) =>
  (await http.post('/Accounts', data)).data;

export const updateAccount = async (id: string, data: UpdateAccountInput) =>
  (await http.put(`/Accounts/${id}`, data)).data;

export const deleteAccount = async (id: string) => {
  await http.delete(`/Accounts/${id}`);
};

/** پاسخ صفحه‌بندی‌شده؛ <c>total</c> شمار کل ردیف‌هاست نه اندازهٔ صفحه. */
export interface TransactionPage {
  items: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export const getTransactionPage = async (
  page = 1,
  pageSize = 100,
): Promise<TransactionPage> => {
  const res = await http.get('/Transactions', { params: { page, pageSize } });
  const payload = (res.data ?? {}) as Record<string, unknown>;

  const items = pickArray(payload.items ?? payload).map(normalizeTransaction);
  const total = Number(payload.total ?? items.length);
  const size = Number(payload.pageSize ?? pageSize);
  const current = Number(payload.page ?? page);

  return {
    items,
    total,
    page: current,
    pageSize: size,
    // اگر سرور hasMore نفرستاد، از روی شمارش محاسبه می‌شود
    hasMore: typeof payload.hasMore === 'boolean' ? payload.hasMore : current * size < total,
  };
};

export const createTransaction = async (data: CreateTransactionInput) =>
  (await http.post('/Transactions', data)).data;

export const updateTransaction = async (id: string, data: UpdateTransactionInput) =>
  (await http.put(`/Transactions/${id}`, data)).data;

export const deleteTransaction = async (id: string) => {
  await http.delete(`/Transactions/${id}`);
};

export interface BulkRowResult {
  /** برای حذف دسته‌جمعی برابر شناسهٔ تراکنش، برای ورودی اکسل برابر شمارهٔ ردیف در فایل */
  key: string | number;
  succeeded: boolean;
  error?: string | null;
}

export interface BulkOperationResult {
  succeededCount: number;
  failedCount: number;
  rows: BulkRowResult[];
}

export const bulkDeleteTransactions = async (ids: string[]): Promise<BulkOperationResult> => {
  const res = await http.post('/Transactions/bulk-delete', { ids });
  const payload = res.data as { succeededCount: number; failedCount: number; rows: { id: string; succeeded: boolean; error?: string | null }[] };
  return {
    succeededCount: payload.succeededCount,
    failedCount: payload.failedCount,
    rows: payload.rows.map((r) => ({ key: r.id, succeeded: r.succeeded, error: r.error })),
  };
};

/** فایل اکسل را به‌صورت Blob برمی‌گرداند تا کلاینت خودش دانلودش کند. */
export const exportTransactionsExcel = async (): Promise<Blob> => {
  const res = await http.get('/Transactions/export', { responseType: 'blob' });
  return res.data as Blob;
};

export const importTransactionsExcel = async (file: File): Promise<BulkOperationResult> => {
  const form = new FormData();
  form.append('file', file);
  const res = await http.post('/Transactions/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  const payload = res.data as { succeededCount: number; failedCount: number; rows: { rowNumber: number; succeeded: boolean; error?: string | null }[] };
  return {
    succeededCount: payload.succeededCount,
    failedCount: payload.failedCount,
    rows: payload.rows.map((r) => ({ key: r.rowNumber, succeeded: r.succeeded, error: r.error })),
  };
};

/* ————————————————— بدهی و طلب ————————————————— */

export const DebtDirection = { Payable: 1, Receivable: 2 } as const;
export const DEBT_DIRECTION_LABEL: Record<number, string> = {
  1: 'بدهی من',
  2: 'طلب من',
};

export const DebtRecurrenceType = { OneTime: 1, Installment: 2, Monthly: 3 } as const;
export const DEBT_RECURRENCE_LABEL: Record<number, string> = {
  1: 'یک‌باره',
  2: 'اقساط ثابت',
  3: 'ماهیانه بازگشتی',
};

export const InstallmentStatus = { Pending: 1, Paid: 2 } as const;

export interface Installment {
  id: string;
  sequenceNumber: number;
  dueDateUtc: string;
  amount: number;
  status: number;
  paidAtUtc?: string | null;
  paidTransactionId?: string | null;
}

export interface Debt {
  id: string;
  title: string;
  direction: number;
  recurrenceType: number;
  counterpartyName?: string | null;
  note?: string | null;
  installments: Installment[];
}

export interface CreateDebtInput {
  title: string;
  direction: number;
  recurrenceType: number;
  firstDueDateUtc: string;
  amount: number;
  occurrenceCount?: number;
  counterpartyName?: string;
  note?: string;
  /** برای وامی که از قبل شروع شده — این تعداد قسط اول «پرداخت‌شده» ثبت می‌شود. */
  alreadyPaidCount?: number;
}

export interface UpdateDebtInput {
  title: string;
  counterpartyName?: string;
  note?: string;
}

export const debtsApi = {
  list: async (): Promise<Debt[]> => (await http.get<Debt[]>('/Debts')).data,

  create: async (input: CreateDebtInput): Promise<{ id: string }> =>
    (await http.post('/Debts', input)).data,

  update: async (id: string, input: UpdateDebtInput) => (await http.put(`/Debts/${id}`, input)).data,

  remove: async (id: string) => {
    await http.delete(`/Debts/${id}`);
  },

  extend: async (id: string, additionalCount: number) =>
    (await http.post(`/Debts/${id}/extend`, { additionalCount })).data,

  reschedule: async (id: string, newFirstDueDateUtc: string) =>
    (await http.post(`/Debts/${id}/reschedule`, { newFirstDueDateUtc })).data,

  updateInstallment: async (installmentId: string, amount: number, dueDateUtc?: string) =>
    (await http.put(`/Debts/installments/${installmentId}`, { amount, dueDateUtc })).data,

  payInstallment: async (installmentId: string, accountId: string, paidAtUtc?: string) =>
    (await http.post(`/Debts/installments/${installmentId}/pay`, { accountId, paidAtUtc })).data,

  revertInstallment: async (installmentId: string) =>
    (await http.post(`/Debts/installments/${installmentId}/revert`)).data,
};
