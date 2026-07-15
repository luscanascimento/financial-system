/**
 * FinanceHub financial-domain contracts shared by the API and web app.
 *
 * All monetary values are integers in **minor units** (e.g. cents) of the
 * owning entity's currency — never floats. Use `@financehub/shared-utils`'
 * `money` helpers to convert to/from the display representation.
 */

// ─── Enums (mirror the Prisma schema) ────────────────────────────────────────

export type FlowType = 'INCOME' | 'EXPENSE';

export type AccountType =
  'CHECKING' | 'SAVINGS' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'INVESTMENT';

export type TransactionStatus = 'PENDING' | 'CLEARED';

export type BudgetPeriod = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'ARCHIVED';

// ─── Accounts ────────────────────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balanceMinor: number;
  initialBalanceMinor: number;
  creditLimitMinor: number | null;
  institution: string | null;
  color: string | null;
  icon: string | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Categories ──────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  type: FlowType;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  system: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A category with its immediate children resolved (for tree views). */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

// ─── Transactions ────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: FlowType;
  amountMinor: number;
  description: string;
  notes: string | null;
  date: string;
  status: TransactionStatus;
  installmentGroupId: string | null;
  installmentNumber: number | null;
  installmentTotal: number | null;
  recurringTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Query filters accepted by the transactions list endpoint. */
export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: FlowType;
  status?: TransactionStatus;
  from?: string;
  to?: string;
  minAmountMinor?: number;
  maxAmountMinor?: number;
}

// ─── Transfers ───────────────────────────────────────────────────────────────

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  fromAmountMinor: number;
  toAmountMinor: number;
  description: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  categoryId: string | null;
  name: string;
  amountMinor: number;
  period: BudgetPeriod;
  startDate: string;
  rollover: boolean;
  createdAt: string;
  updatedAt: string;
}

/** A budget enriched with the current period's actual spend. */
export interface BudgetProgress extends Budget {
  periodStart: string;
  periodEnd: string;
  spentMinor: number;
  remainingMinor: number;
  /** 0–1 (may exceed 1 when over budget). */
  ratio: number;
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: string;
  name: string;
  targetAmountMinor: number;
  currentAmountMinor: number;
  currency: string;
  targetDate: string | null;
  accountId: string | null;
  color: string | null;
  icon: string | null;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountMinor: number;
  date: string;
  note: string | null;
  createdAt: string;
}

// ─── Recurring transactions ──────────────────────────────────────────────────

export interface RecurringTransaction {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: FlowType;
  amountMinor: number;
  description: string;
  frequency: RecurrenceFrequency;
  interval: number;
  startDate: string;
  nextRunDate: string;
  endDate: string | null;
  active: boolean;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Reports & analytics ─────────────────────────────────────────────────────

/** Aggregate net-worth snapshot across all accounts, grouped by currency. */
export interface NetWorthSummary {
  currency: string;
  assetsMinor: number;
  liabilitiesMinor: number;
  netWorthMinor: number;
}

/** Income vs. expense totals for a single calendar bucket. */
export interface CashFlowPoint {
  /** ISO date of the bucket start (month or day). */
  period: string;
  incomeMinor: number;
  expenseMinor: number;
  netMinor: number;
}

/** Spend (or income) grouped by category for a period. */
export interface CategoryBreakdownItem {
  categoryId: string | null;
  categoryName: string;
  color: string | null;
  type: FlowType;
  amountMinor: number;
  /** Share of the total for this flow type, 0–1. */
  ratio: number;
}

/** Headline KPIs for the dashboard overview. */
export interface FinancialOverview {
  currency: string;
  totalBalanceMinor: number;
  netWorth: NetWorthSummary;
  monthIncomeMinor: number;
  monthExpenseMinor: number;
  monthNetMinor: number;
  accountsCount: number;
  transactionsCount: number;
}
