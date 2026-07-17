import type {
  Account,
  AuthResult,
  BudgetProgress,
  CashFlowPoint,
  Category,
  CategoryBreakdownItem,
  FinancialOverview,
  FlowType,
  Goal,
  Paginated,
  Transaction,
} from '@financehub/shared-types';

import type { McpConfig } from './config';

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  type?: FlowType;
  from?: string;
  to?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateTransactionInput {
  accountId: string;
  type: FlowType;
  amountMinor: number;
  description: string;
  date: string;
  categoryId?: string;
  notes?: string;
}

export interface CreateAccountInput {
  name: string;
  type: Account['type'];
  initialBalanceMinor: number;
  currency?: string;
  institution?: string;
}

/** Raised when the API responds with a non-2xx status. */
export class FinanceApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'FinanceApiError';
  }
}

/**
 * Thin HTTP client for the FinanceHub REST API. Manages authentication
 * (login → in-memory access token, transparent re-login on 401) so tool
 * handlers can stay declarative. All requests are scoped to the authenticated
 * user by the API itself.
 */
export class FinanceClient {
  private accessToken?: string;
  /** De-duplicates concurrent logins so a cold start / shared 401 triggers one. */
  private loginPromise?: Promise<void>;

  constructor(private readonly config: McpConfig) {
    this.accessToken = config.accessToken;
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  /** Logs in, coalescing concurrent callers onto a single in-flight request. */
  private login(): Promise<void> {
    if (!this.loginPromise) {
      this.loginPromise = this.doLogin().finally(() => {
        this.loginPromise = undefined;
      });
    }
    return this.loginPromise;
  }

  private async doLogin(): Promise<void> {
    if (!this.config.email || !this.config.password) {
      throw new FinanceApiError(
        401,
        'No credentials configured. Set FINANCEHUB_ACCESS_TOKEN or FINANCEHUB_EMAIL/FINANCEHUB_PASSWORD.',
      );
    }
    const res = await fetch(`${this.config.apiBaseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: this.config.email,
        password: this.config.password,
      }),
      signal: AbortSignal.timeout(this.config.requestTimeoutMs),
    });
    if (!res.ok) {
      throw new FinanceApiError(
        res.status,
        `Login failed (HTTP ${res.status}). Check FINANCEHUB_EMAIL/FINANCEHUB_PASSWORD.`,
      );
    }

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new FinanceApiError(
        res.status,
        'Login response was not valid JSON.',
      );
    }
    if (body && typeof body === 'object' && 'mfaRequired' in body) {
      throw new FinanceApiError(
        401,
        'The account requires MFA, which this MCP server does not support. Use an account without MFA or a FINANCEHUB_ACCESS_TOKEN.',
      );
    }
    const token = (body as Partial<AuthResult>).accessToken;
    if (typeof token !== 'string' || token.length === 0) {
      throw new FinanceApiError(
        res.status,
        'Login response did not include an access token.',
      );
    }
    this.accessToken = token;
  }

  // ─── Core request helper ─────────────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    options: { query?: Record<string, unknown>; body?: unknown } = {},
  ): Promise<T> {
    if (!this.accessToken) {
      await this.login();
    }

    const doFetch = (): Promise<Response> => {
      const url = new URL(`${this.config.apiBaseUrl}${path}`);
      for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
      return fetch(url, {
        method,
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.accessToken}`,
        },
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        // Abort a hung API call so a single stalled request can't wedge the
        // MCP server indefinitely.
        signal: AbortSignal.timeout(this.config.requestTimeoutMs),
      });
    };

    let res = await doFetch();

    // Access tokens are short-lived; on a 401 re-login once and retry.
    if (res.status === 401 && !this.config.accessToken) {
      await this.login();
      res = await doFetch();
    }

    if (!res.ok) {
      const detail = await this.readError(res);
      throw new FinanceApiError(res.status, detail);
    }
    // Tolerate any empty success body (204, or a 200 with no content).
    if (res.status === 204 || res.headers.get('content-length') === '0') {
      return undefined as T;
    }
    try {
      return (await res.json()) as T;
    } catch {
      return undefined as T;
    }
  }

  private async readError(res: Response): Promise<string> {
    try {
      const body = (await res.json()) as { message?: string | string[] };
      const message = Array.isArray(body.message)
        ? body.message.join('; ')
        : body.message;
      return message ?? `HTTP ${res.status}`;
    } catch {
      return `HTTP ${res.status}`;
    }
  }

  // ─── Endpoints ───────────────────────────────────────────────────────────────

  listAccounts(includeArchived = false): Promise<Account[]> {
    return this.request('GET', '/accounts', {
      query: { includeArchived },
    });
  }

  createAccount(input: CreateAccountInput): Promise<Account> {
    return this.request('POST', '/accounts', { body: input });
  }

  listCategories(type?: FlowType): Promise<Category[]> {
    return this.request('GET', '/categories', { query: { type } });
  }

  listTransactions(
    filters: TransactionFilters,
  ): Promise<Paginated<Transaction>> {
    return this.request('GET', '/transactions', { query: { ...filters } });
  }

  createTransaction(input: CreateTransactionInput): Promise<Transaction> {
    return this.request('POST', '/transactions', { body: input });
  }

  listBudgets(): Promise<BudgetProgress[]> {
    return this.request('GET', '/budgets');
  }

  listGoals(): Promise<Paginated<Goal>> {
    return this.request('GET', '/goals');
  }

  getOverview(): Promise<FinancialOverview> {
    return this.request('GET', '/reports/overview');
  }

  getCashFlow(months: number): Promise<CashFlowPoint[]> {
    return this.request('GET', '/reports/cash-flow', { query: { months } });
  }

  getCategoryBreakdown(query: {
    type?: FlowType;
    from?: string;
    to?: string;
  }): Promise<CategoryBreakdownItem[]> {
    return this.request('GET', '/reports/category-breakdown', { query });
  }
}
