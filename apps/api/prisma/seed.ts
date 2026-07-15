import { randomUUID } from 'node:crypto';

import { type AccountType, type FlowType, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

/**
 * Idempotent database seed. Provisions a verified demo user with a realistic
 * financial dataset — default categories, a set of accounts, a couple of months
 * of transactions, a budget and a savings goal — so the app is explorable
 * immediately after `docker compose up`. Run with `pnpm db:seed`.
 *
 * Login: demo@financehub.dev / Password123!
 */
const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@financehub.dev';
const DEMO_PASSWORD = 'Password123!';

interface DefaultCategory {
  name: string;
  type: FlowType;
  color: string;
  icon: string;
}

const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Salary', type: 'INCOME', color: '#2e7d32', icon: 'payments' },
  { name: 'Freelance', type: 'INCOME', color: '#43a047', icon: 'work' },
  {
    name: 'Investments',
    type: 'INCOME',
    color: '#66bb6a',
    icon: 'trending_up',
  },
  { name: 'Gifts', type: 'INCOME', color: '#81c784', icon: 'redeem' },
  { name: 'Housing', type: 'EXPENSE', color: '#c62828', icon: 'home' },
  {
    name: 'Groceries',
    type: 'EXPENSE',
    color: '#ef6c00',
    icon: 'shopping_cart',
  },
  {
    name: 'Transport',
    type: 'EXPENSE',
    color: '#1565c0',
    icon: 'directions_car',
  },
  { name: 'Dining', type: 'EXPENSE', color: '#ad1457', icon: 'restaurant' },
  { name: 'Utilities', type: 'EXPENSE', color: '#00838f', icon: 'bolt' },
  { name: 'Health', type: 'EXPENSE', color: '#6a1b9a', icon: 'favorite' },
  { name: 'Entertainment', type: 'EXPENSE', color: '#4527a0', icon: 'movie' },
  { name: 'Shopping', type: 'EXPENSE', color: '#d84315', icon: 'shopping_bag' },
];

async function main(): Promise<void> {
  const passwordHash = await argon2.hash(DEMO_PASSWORD);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: {
      email: DEMO_EMAIL,
      displayName: 'Demo User',
      emailVerified: true,
      passwordHash,
    },
  });

  // Categories — created once, then reused by id.
  const categoriesByName = new Map<string, string>();
  for (const def of DEFAULT_CATEGORIES) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: def.name,
        type: def.type,
        parentId: null,
      },
    });
    const category =
      existing ??
      (await prisma.category.create({
        data: {
          userId: user.id,
          name: def.name,
          type: def.type,
          color: def.color,
          icon: def.icon,
          system: true,
        },
      }));
    categoriesByName.set(def.name, category.id);
  }

  // Accounts.
  const accounts: Array<{
    name: string;
    type: AccountType;
    initialBalanceMinor: number;
    creditLimitMinor?: number;
    institution: string;
    color: string;
    icon: string;
  }> = [
    {
      name: 'Everyday Checking',
      type: 'CHECKING',
      initialBalanceMinor: 350_000,
      institution: 'FinanceHub Bank',
      color: '#1565c0',
      icon: 'account_balance',
    },
    {
      name: 'Emergency Savings',
      type: 'SAVINGS',
      initialBalanceMinor: 1_200_000,
      institution: 'FinanceHub Bank',
      color: '#2e7d32',
      icon: 'savings',
    },
    {
      name: 'Rewards Credit Card',
      type: 'CREDIT_CARD',
      initialBalanceMinor: 0,
      creditLimitMinor: 500_000,
      institution: 'FinanceHub Bank',
      color: '#c62828',
      icon: 'credit_card',
    },
    {
      name: 'Cash Wallet',
      type: 'CASH',
      initialBalanceMinor: 20_000,
      institution: 'Cash',
      color: '#6a1b9a',
      icon: 'wallet',
    },
  ];

  const accountIds = new Map<string, string>();
  for (const def of accounts) {
    const existing = await prisma.account.findFirst({
      where: { userId: user.id, name: def.name },
    });
    const account =
      existing ??
      (await prisma.account.create({
        data: {
          userId: user.id,
          name: def.name,
          type: def.type,
          currency: 'USD',
          initialBalanceMinor: def.initialBalanceMinor,
          balanceMinor: def.initialBalanceMinor,
          creditLimitMinor: def.creditLimitMinor ?? null,
          institution: def.institution,
          color: def.color,
          icon: def.icon,
        },
      }));
    accountIds.set(def.name, account.id);
  }

  // Transactions — a repeatable two-month sample, keyed so re-seeding is idempotent.
  const now = new Date();

  const sample: Array<{
    account: string;
    category: string;
    type: FlowType;
    amountMinor: number;
    description: string;
    monthsAgo: number;
    day: number;
  }> = [
    {
      account: 'Everyday Checking',
      category: 'Salary',
      type: 'INCOME',
      amountMinor: 520_000,
      description: 'Monthly salary',
      monthsAgo: 1,
      day: 1,
    },
    {
      account: 'Everyday Checking',
      category: 'Salary',
      type: 'INCOME',
      amountMinor: 520_000,
      description: 'Monthly salary',
      monthsAgo: 0,
      day: 1,
    },
    {
      account: 'Everyday Checking',
      category: 'Housing',
      type: 'EXPENSE',
      amountMinor: 180_000,
      description: 'Rent',
      monthsAgo: 1,
      day: 5,
    },
    {
      account: 'Everyday Checking',
      category: 'Housing',
      type: 'EXPENSE',
      amountMinor: 180_000,
      description: 'Rent',
      monthsAgo: 0,
      day: 5,
    },
    {
      account: 'Rewards Credit Card',
      category: 'Groceries',
      type: 'EXPENSE',
      amountMinor: 42_350,
      description: 'Supermarket',
      monthsAgo: 1,
      day: 8,
    },
    {
      account: 'Rewards Credit Card',
      category: 'Groceries',
      type: 'EXPENSE',
      amountMinor: 38_990,
      description: 'Supermarket',
      monthsAgo: 0,
      day: 9,
    },
    {
      account: 'Rewards Credit Card',
      category: 'Dining',
      type: 'EXPENSE',
      amountMinor: 12_500,
      description: 'Restaurant',
      monthsAgo: 0,
      day: 12,
    },
    {
      account: 'Everyday Checking',
      category: 'Utilities',
      type: 'EXPENSE',
      amountMinor: 15_800,
      description: 'Electricity & water',
      monthsAgo: 0,
      day: 14,
    },
    {
      account: 'Rewards Credit Card',
      category: 'Transport',
      type: 'EXPENSE',
      amountMinor: 9_900,
      description: 'Fuel',
      monthsAgo: 0,
      day: 15,
    },
    {
      account: 'Rewards Credit Card',
      category: 'Entertainment',
      type: 'EXPENSE',
      amountMinor: 5_499,
      description: 'Streaming subscriptions',
      monthsAgo: 0,
      day: 16,
    },
  ];

  for (const t of sample) {
    const accountId = accountIds.get(t.account)!;
    const categoryId = categoriesByName.get(t.category)!;
    const date = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - t.monthsAgo, t.day),
    );
    const marker = `[seed:${t.description}:${t.monthsAgo}:${t.amountMinor}]`;
    const existing = await prisma.transaction.findFirst({
      where: { userId: user.id, notes: marker },
    });
    if (existing) {
      continue;
    }
    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId: user.id,
          accountId,
          categoryId,
          type: t.type,
          amountMinor: t.amountMinor,
          description: t.description,
          notes: marker,
          date,
        },
      });
      const delta = t.type === 'INCOME' ? t.amountMinor : -t.amountMinor;
      await tx.account.update({
        where: { id: accountId },
        data: { balanceMinor: { increment: delta } },
      });
    });
  }

  // A monthly grocery budget.
  const groceriesId = categoriesByName.get('Groceries')!;
  const existingBudget = await prisma.budget.findFirst({
    where: { userId: user.id, categoryId: groceriesId, period: 'MONTHLY' },
  });
  if (!existingBudget) {
    await prisma.budget.create({
      data: {
        userId: user.id,
        categoryId: groceriesId,
        name: 'Monthly Groceries',
        amountMinor: 60_000,
        period: 'MONTHLY',
        startDate: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
        ),
      },
    });
  }

  // A savings goal linked to the savings account.
  const savingsId = accountIds.get('Emergency Savings')!;
  const existingGoal = await prisma.goal.findFirst({
    where: { userId: user.id, name: 'Emergency Fund' },
  });
  if (!existingGoal) {
    await prisma.goal.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        name: 'Emergency Fund',
        targetAmountMinor: 3_000_000,
        currentAmountMinor: 1_200_000,
        currency: 'USD',
        accountId: savingsId,
        color: '#2e7d32',
        icon: 'savings',
        contributions: {
          create: {
            amountMinor: 1_200_000,
            date: new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
            ),
            note: 'Initial funding',
          },
        },
      },
    });
  }

  console.log(`Seeded demo user ${user.email} (${user.id})`);
  console.log(`  password: ${DEMO_PASSWORD}`);
  console.log(
    `  ${DEFAULT_CATEGORIES.length} categories, ${accounts.length} accounts, ` +
      `${sample.length} sample transactions, 1 budget, 1 goal`,
  );
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
