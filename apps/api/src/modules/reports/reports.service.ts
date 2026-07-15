import { Injectable } from '@nestjs/common';
import type {
  CashFlowPoint,
  CategoryBreakdownItem,
  FinancialOverview,
  FlowType,
  NetWorthSummary,
} from '@financehub/shared-types';
import {
  lastMonths,
  startOfMonth,
  startOfNextMonth,
} from '@financehub/shared-utils';
import type { Account } from '@prisma/client';

import { CategoryBreakdownQueryDto } from './dto/category-breakdown-query.dto';
import { ReportsRepository } from './reports.repository';

const DEFAULT_CURRENCY = 'USD';
const DEFAULT_CASH_FLOW_MONTHS = 6;

/**
 * Read-only analytics over the user's accounts and transactions. Produces the
 * dashboard/report contracts in `@financehub/shared-types`; all queries are
 * scoped to the requesting user.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly reports: ReportsRepository) {}

  /** Headline KPIs for the dashboard overview. */
  async getOverview(userId: string): Promise<FinancialOverview> {
    const accounts = await this.reports.findAccounts(userId);
    const currency = dominantCurrency(accounts);

    const totalBalanceMinor = accounts
      .filter((account) => account.currency === currency)
      .reduce((sum, account) => sum + account.balanceMinor, 0);

    const netWorthByCurrency = summarizeNetWorth(accounts);
    const netWorth =
      netWorthByCurrency.find((entry) => entry.currency === currency) ??
      emptyNetWorth(currency);

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = startOfNextMonth(now);
    const [{ incomeMinor, expenseMinor }, accountsCount, transactionsCount] =
      await Promise.all([
        this.reports.sumFlowsInRange(userId, monthStart, monthEnd),
        this.reports.countAccounts(userId),
        this.reports.countTransactions(userId),
      ]);

    return {
      currency,
      totalBalanceMinor,
      netWorth,
      monthIncomeMinor: incomeMinor,
      monthExpenseMinor: expenseMinor,
      monthNetMinor: incomeMinor - expenseMinor,
      accountsCount,
      transactionsCount,
    };
  }

  /** Net-worth snapshot grouped by currency. */
  async getNetWorth(userId: string): Promise<NetWorthSummary[]> {
    const accounts = await this.reports.findAccounts(userId);
    return summarizeNetWorth(accounts);
  }

  /** Income vs. expense over the last `months` calendar months, oldest first. */
  async getCashFlow(
    userId: string,
    months = DEFAULT_CASH_FLOW_MONTHS,
  ): Promise<CashFlowPoint[]> {
    const ranges = lastMonths(months);
    return Promise.all(
      ranges.map(async ({ start, end }) => {
        const { incomeMinor, expenseMinor } =
          await this.reports.sumFlowsInRange(userId, start, end);
        return {
          period: start.toISOString(),
          incomeMinor,
          expenseMinor,
          netMinor: incomeMinor - expenseMinor,
        };
      }),
    );
  }

  /** Spend (or income) grouped by category, with each category's share ratio. */
  async getCategoryBreakdown(
    userId: string,
    query: CategoryBreakdownQueryDto,
  ): Promise<CategoryBreakdownItem[]> {
    const type: FlowType = query.type ?? 'EXPENSE';
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    const grouped = await this.reports.sumByCategory(userId, type, from, to);
    const total = grouped.reduce((sum, row) => sum + row.amountMinor, 0);

    const categoryIds = grouped
      .map((row) => row.categoryId)
      .filter((id): id is string => id !== null);
    const meta = await this.reports.findCategoryMeta(userId, categoryIds);

    return grouped
      .map((row) => {
        const info = row.categoryId ? meta.get(row.categoryId) : undefined;
        return {
          categoryId: row.categoryId,
          categoryName: info?.name ?? 'Uncategorized',
          color: info?.color ?? null,
          type,
          amountMinor: row.amountMinor,
          ratio: total > 0 ? row.amountMinor / total : 0,
        };
      })
      .sort((a, b) => b.amountMinor - a.amountMinor);
  }
}

/**
 * The currency owned by the most accounts, falling back to `USD` when the user
 * has no accounts. Ties resolve to the first currency encountered.
 */
function dominantCurrency(accounts: Account[]): string {
  if (accounts.length === 0) {
    return DEFAULT_CURRENCY;
  }
  const counts = new Map<string, number>();
  for (const account of accounts) {
    counts.set(account.currency, (counts.get(account.currency) ?? 0) + 1);
  }
  let winner = DEFAULT_CURRENCY;
  let best = -1;
  for (const [currency, count] of counts) {
    if (count > best) {
      winner = currency;
      best = count;
    }
  }
  return winner;
}

/**
 * Groups accounts by currency and derives assets (positive balances) and
 * liabilities (absolute value of negative balances) per currency.
 */
function summarizeNetWorth(accounts: Account[]): NetWorthSummary[] {
  const byCurrency = new Map<string, NetWorthSummary>();
  for (const account of accounts) {
    const entry =
      byCurrency.get(account.currency) ?? emptyNetWorth(account.currency);
    if (account.balanceMinor >= 0) {
      entry.assetsMinor += account.balanceMinor;
    } else {
      entry.liabilitiesMinor += Math.abs(account.balanceMinor);
    }
    entry.netWorthMinor = entry.assetsMinor - entry.liabilitiesMinor;
    byCurrency.set(account.currency, entry);
  }
  return [...byCurrency.values()];
}

function emptyNetWorth(currency: string): NetWorthSummary {
  return { currency, assetsMinor: 0, liabilitiesMinor: 0, netWorthMinor: 0 };
}
