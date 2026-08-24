import { expect, test, type Page } from '@playwright/test';

/**
 * The one journey that has to work: sign in, open an account, spend from it,
 * and see the money move on the dashboard.
 *
 * This exercises the full stack — Angular → NestJS → Prisma `$transaction` →
 * PostgreSQL — and asserts on the *arithmetic*, not just on rendered text. The
 * dashboard's "Total balance" KPI is read before and after so the assertion is
 * a delta, which keeps the spec re-runnable against a database that already
 * has seeded (and previously created) data in it.
 *
 * Requires the stack to be up and seeded:
 *   docker compose up -d && pnpm db:seed
 * Credentials come from the idempotent seed in apps/api/prisma/seed.ts.
 */

const DEMO_EMAIL = process.env['E2E_EMAIL'] ?? 'demo@financehub.dev';
const DEMO_PASSWORD = process.env['E2E_PASSWORD'] ?? 'Password123!';

/** Opening balance for the account this spec creates, in major units. */
const OPENING_MAJOR = 1000;
/** Expense booked against that account, in major units. */
const EXPENSE_MAJOR = 250;

/**
 * Parses a rendered `Intl.NumberFormat` currency string (`$1,234.56`,
 * `-$1,234.56`) back into an integer number of minor units — the same
 * representation the API stores — so amounts can be compared exactly instead
 * of by string matching.
 */
function toMinorUnits(formatted: string): number {
  const digits = formatted.replace(/[^\d.-]/g, '');
  const value = Number.parseFloat(digits);
  expect(
    Number.isNaN(value),
    `expected a currency string, got "${formatted}"`,
  ).toBe(false);
  return Math.round(value * 100);
}

/** Reads a dashboard KPI tile by its label, in minor units. */
async function readKpiMinor(page: Page, label: string): Promise<number> {
  const tile = page.locator('.fh-kpi').filter({ hasText: label });
  await expect(tile).toHaveCount(1);
  return toMinorUnits(await tile.locator('.fh-kpi__value').innerText());
}

/** Picks an option in an Angular Material `<mat-select>` by its visible text. */
async function selectOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole('option', { name: option, exact: true }).click();
  // The overlay animates out; waiting for it keeps the next click from landing
  // on the backdrop instead of the field underneath.
  await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
}

test.describe('money flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByLabel('Email').fill(DEMO_EMAIL);
    await page.getByLabel('Password').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();

    // The auth guard only lets us through once the access token is stored.
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(
      page.getByRole('heading', { name: 'Dashboard' }),
    ).toBeVisible();
  });

  test('a new account and an expense move the dashboard balance', async ({
    page,
  }) => {
    const accountName = `E2E Checking ${Date.now()}`;
    const balanceBefore = await readKpiMinor(page, 'Total balance');

    // --- Create the account -------------------------------------------------
    await page.getByRole('link', { name: 'Accounts' }).click();
    await expect(page).toHaveURL(/\/accounts$/);

    await page.getByRole('button', { name: 'New account' }).click();
    await page.getByLabel('Name').fill(accountName);
    await selectOption(page, 'Type', 'Checking');
    await page.getByLabel('Currency').fill('USD');
    await page.getByLabel('Opening balance').fill(String(OPENING_MAJOR));
    await page.getByRole('button', { name: 'Create account' }).click();

    const card = page
      .locator('.fh-account-card')
      .filter({ hasText: accountName });
    await expect(card).toHaveCount(1);
    await expect(card.locator('.fh-account-card__balance')).toHaveText(
      '$1,000.00',
    );

    // --- Book an expense against it ----------------------------------------
    await page.getByRole('link', { name: 'Transactions' }).click();
    await expect(page).toHaveURL(/\/transactions$/);

    await page.getByRole('button', { name: 'New transaction' }).click();
    const form = page.locator('.fh-form-card').first();
    await selectOption(page, 'Account', accountName);
    await selectOption(page, 'Type', 'Expense');
    await form.getByLabel('Description').fill('E2E rent payment');
    await form.getByLabel('Amount').fill(String(EXPENSE_MAJOR));
    await page.getByRole('button', { name: 'Create transaction' }).click();

    const row = page
      .locator('.fh-tx-table tbody tr')
      .filter({ hasText: 'E2E rent payment' })
      .first();
    await expect(row).toBeVisible();
    // Expenses render signed and negative.
    await expect(row).toContainText('-$250.00');

    // --- The account balance is debited ------------------------------------
    await page.getByRole('link', { name: 'Accounts' }).click();
    await expect(
      page
        .locator('.fh-account-card')
        .filter({ hasText: accountName })
        .locator('.fh-account-card__balance'),
    ).toHaveText('$750.00');

    // --- …and so is the dashboard KPI --------------------------------------
    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    const balanceAfter = await readKpiMinor(page, 'Total balance');
    const expectedDeltaMinor = (OPENING_MAJOR - EXPENSE_MAJOR) * 100;
    expect(balanceAfter - balanceBefore).toBe(expectedDeltaMinor);
  });

  test('the expense lands in this month’s totals', async ({ page }) => {
    const expensesBefore = await readKpiMinor(page, 'Expenses (this month)');
    const netBefore = await readKpiMinor(page, 'Net (this month)');

    await page.getByRole('link', { name: 'Transactions' }).click();
    await page.getByRole('button', { name: 'New transaction' }).click();

    const form = page.locator('.fh-form-card').first();
    // Any seeded account will do here; the assertion is on the month rollup.
    await page.getByLabel('Account', { exact: true }).click();
    await page.getByRole('option').first().click();
    await expect(page.locator('.cdk-overlay-backdrop')).toHaveCount(0);
    await form.getByLabel('Description').fill('E2E monthly rollup check');
    await form.getByLabel('Amount').fill('42.50');
    await page.getByRole('button', { name: 'Create transaction' }).click();

    await expect(
      page
        .locator('.fh-tx-table tbody tr')
        .filter({ hasText: 'E2E monthly rollup check' })
        .first(),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Dashboard' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    // 42.50 spent → expenses up by 4250 minor units, net down by the same.
    expect(await readKpiMinor(page, 'Expenses (this month)')).toBe(
      expensesBefore + 4250,
    );
    expect(await readKpiMinor(page, 'Net (this month)')).toBe(netBefore - 4250);
  });
});
