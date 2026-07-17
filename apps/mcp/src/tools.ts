import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  formatMoney,
  majorToMinor,
  minorToMajor,
} from '@financehub/shared-utils';
import { z } from 'zod';

import { FinanceApiError, FinanceClient } from './finance-client';

const FLOW_TYPE = z.enum(['INCOME', 'EXPENSE']);
const ACCOUNT_TYPE = z.enum([
  'CHECKING',
  'SAVINGS',
  'CREDIT_CARD',
  'CASH',
  'WALLET',
  'INVESTMENT',
]);

// Bounded free-text fragments so tool arguments can't be arbitrarily large.
const DATE_STR = z.string().max(40);
const SEARCH_STR = z.string().max(100);
const DESCRIPTION_STR = z.string().min(1).max(200);
const NOTES_STR = z.string().max(2000);
// Major-unit amount cap (mirrors the API's signed-32-bit minor-unit column).
const AMOUNT_MAJOR = z.number().positive().max(21_474_836);

/** Wraps a value as a pretty-printed text tool result. */
function ok(data: unknown): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

/** Runs a handler, converting API/other errors into an MCP error result. */
async function guard(
  run: () => Promise<CallToolResult>,
): Promise<CallToolResult> {
  try {
    return await run();
  } catch (error) {
    const message =
      error instanceof FinanceApiError
        ? `FinanceHub API error (${error.status}): ${error.message}`
        : error instanceof Error
          ? error.message
          : String(error);
    return { content: [{ type: 'text', text: message }], isError: true };
  }
}

/**
 * Registers every FinanceHub tool on the MCP server. Amounts are exchanged with
 * the AI in **major units** (e.g. dollars) for ergonomics and converted to the
 * API's integer minor units at the boundary.
 */
export function registerTools(server: McpServer, client: FinanceClient): void {
  server.registerTool(
    'finance_overview',
    {
      title: 'Financial overview',
      description:
        'Headline KPIs: total balance, net worth, and this month income/expense/net.',
      inputSchema: {},
    },
    () =>
      guard(async () => {
        const o = await client.getOverview();
        return ok({
          currency: o.currency,
          totalBalance: formatMoney(o.totalBalanceMinor, o.currency),
          netWorth: formatMoney(o.netWorth.netWorthMinor, o.currency),
          monthIncome: formatMoney(o.monthIncomeMinor, o.currency),
          monthExpense: formatMoney(o.monthExpenseMinor, o.currency),
          monthNet: formatMoney(o.monthNetMinor, o.currency),
          accounts: o.accountsCount,
          transactions: o.transactionsCount,
        });
      }),
  );

  server.registerTool(
    'list_accounts',
    {
      title: 'List accounts',
      description: 'List the user accounts with balances.',
      inputSchema: { includeArchived: z.boolean().optional() },
    },
    ({ includeArchived }) =>
      guard(async () => {
        const accounts = await client.listAccounts(includeArchived ?? false);
        return ok(
          accounts.map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            currency: a.currency,
            balance: formatMoney(a.balanceMinor, a.currency),
            institution: a.institution,
          })),
        );
      }),
  );

  server.registerTool(
    'create_account',
    {
      title: 'Create account',
      description:
        'Open a new account with an opening balance (in major units).',
      inputSchema: {
        name: z.string().min(1).max(120),
        type: ACCOUNT_TYPE,
        initialBalanceMajor: z.number().min(-21_474_836).max(21_474_836),
        currency: z.string().length(3).optional(),
        institution: z.string().max(120).optional(),
      },
    },
    ({ name, type, initialBalanceMajor, currency, institution }) =>
      guard(async () => {
        const account = await client.createAccount({
          name,
          type,
          initialBalanceMinor: majorToMinor(initialBalanceMajor),
          currency: currency ?? 'USD',
          institution,
        });
        return ok({ id: account.id, name: account.name, created: true });
      }),
  );

  server.registerTool(
    'list_categories',
    {
      title: 'List categories',
      description: 'List income/expense categories (filter by type).',
      inputSchema: { type: FLOW_TYPE.optional() },
    },
    ({ type }) =>
      guard(async () => {
        const categories = await client.listCategories(type);
        return ok(
          categories.map((c) => ({ id: c.id, name: c.name, type: c.type })),
        );
      }),
  );

  server.registerTool(
    'list_transactions',
    {
      title: 'List transactions',
      description:
        'List transactions with optional filters (account, category, type, date range, search) and pagination.',
      inputSchema: {
        accountId: z.string().uuid().optional(),
        categoryId: z.string().uuid().optional(),
        type: FLOW_TYPE.optional(),
        from: DATE_STR.optional(),
        to: DATE_STR.optional(),
        search: SEARCH_STR.optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      },
    },
    (filters) =>
      guard(async () => {
        const page = await client.listTransactions(filters);
        return ok({
          meta: page.meta,
          items: page.items.map((t) => ({
            id: t.id,
            date: t.date,
            description: t.description,
            type: t.type,
            amount: minorToMajor(t.amountMinor),
            accountId: t.accountId,
            categoryId: t.categoryId,
          })),
        });
      }),
  );

  server.registerTool(
    'create_transaction',
    {
      title: 'Create transaction',
      description:
        'Record an income or expense. Amount is in major units; the account balance is updated automatically.',
      inputSchema: {
        accountId: z.string().uuid(),
        type: FLOW_TYPE,
        amountMajor: AMOUNT_MAJOR,
        description: DESCRIPTION_STR,
        date: DATE_STR.optional(),
        categoryId: z.string().uuid().optional(),
        notes: NOTES_STR.optional(),
      },
    },
    ({ accountId, type, amountMajor, description, date, categoryId, notes }) =>
      guard(async () => {
        const tx = await client.createTransaction({
          accountId,
          type,
          amountMinor: majorToMinor(amountMajor),
          description,
          date: date ?? new Date().toISOString(),
          categoryId,
          notes,
        });
        return ok({ id: tx.id, description: tx.description, created: true });
      }),
  );

  server.registerTool(
    'list_budgets',
    {
      title: 'List budgets',
      description:
        'List budgets with current-period spend and remaining amount.',
      inputSchema: {},
    },
    () =>
      guard(async () => {
        const budgets = await client.listBudgets();
        return ok(
          budgets.map((b) => ({
            id: b.id,
            name: b.name,
            period: b.period,
            periodStart: b.periodStart,
            periodEnd: b.periodEnd,
            amount: minorToMajor(b.amountMinor),
            spent: minorToMajor(b.spentMinor),
            remaining: minorToMajor(b.remainingMinor),
            share: `${Math.round(b.ratio * 100)}%`,
            categoryId: b.categoryId,
          })),
        );
      }),
  );

  server.registerTool(
    'list_goals',
    {
      title: 'List savings goals',
      description: 'List savings goals with progress toward their targets.',
      inputSchema: {},
    },
    () =>
      guard(async () => {
        const goals = await client.listGoals();
        return ok(
          goals.items.map((g) => ({
            id: g.id,
            name: g.name,
            status: g.status,
            current: formatMoney(g.currentAmountMinor, g.currency),
            target: formatMoney(g.targetAmountMinor, g.currency),
          })),
        );
      }),
  );

  server.registerTool(
    'cash_flow',
    {
      title: 'Cash flow',
      description: 'Income vs. expense totals over the trailing N months.',
      inputSchema: { months: z.number().int().min(1).max(24).optional() },
    },
    ({ months }) =>
      guard(async () => {
        const points = await client.getCashFlow(months ?? 6);
        return ok(
          points.map((p) => ({
            period: p.period,
            income: minorToMajor(p.incomeMinor),
            expense: minorToMajor(p.expenseMinor),
            net: minorToMajor(p.netMinor),
          })),
        );
      }),
  );

  server.registerTool(
    'category_breakdown',
    {
      title: 'Category breakdown',
      description: 'Spend or income grouped by category for a period.',
      inputSchema: {
        type: FLOW_TYPE.optional(),
        from: DATE_STR.optional(),
        to: DATE_STR.optional(),
      },
    },
    ({ type, from, to }) =>
      guard(async () => {
        const items = await client.getCategoryBreakdown({ type, from, to });
        return ok(
          items.map((i) => ({
            category: i.categoryName,
            type: i.type,
            amount: minorToMajor(i.amountMinor),
            share: `${Math.round(i.ratio * 100)}%`,
          })),
        );
      }),
  );
}
