import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FinanceApiError, FinanceClient } from './finance-client';
import type { McpConfig } from './config';

const baseConfig: McpConfig = {
  apiBaseUrl: 'http://localhost:3000/api',
  requestTimeoutMs: 5000,
  accessToken: 'initial-token',
};

describe('FinanceClient', () => {
  let client: FinanceClient;

  beforeEach(() => {
    vi.restoreAllMocks();
    client = new FinanceClient(baseConfig);
  });

  it('makes authenticated GET requests with Bearer token', async () => {
    const mockAccounts = [{ id: 'acc-1', name: 'Checking', balanceMinor: 10000, currency: 'USD' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json', 'content-length': '100' }),
      json: vi.fn().mockResolvedValue(mockAccounts),
    } as any);

    const result = await client.listAccounts(false);
    expect(result).toEqual(mockAccounts);
    expect(global.fetch).toHaveBeenCalledWith(
      new URL('http://localhost:3000/api/accounts?includeArchived=false'),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer initial-token',
        }),
      }),
    );
  });

  it('throws FinanceApiError when server returns non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ message: 'Account not found' }),
    } as any);

    await expect(client.listAccounts()).rejects.toThrow(FinanceApiError);
  });

  it('performs automatic login when email and password are provided without token', async () => {
    const configWithCreds: McpConfig = {
      apiBaseUrl: 'http://localhost:3000/api',
      requestTimeoutMs: 5000,
      email: 'user@example.com',
      password: 'password123',
    };
    const credClient = new FinanceClient(configWithCreds);

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: vi.fn().mockResolvedValue({ accessToken: 'newly-acquired-token' }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json', 'content-length': '50' }),
        json: vi.fn().mockResolvedValue([]),
      } as any);

    await credClient.listAccounts();
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect((global.fetch as any).mock.calls[0][0]).toBe('http://localhost:3000/api/auth/login');
  });

  it('handles 204 no content responses gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: new Headers(),
    } as any);

    const result = await client.createAccount({
      name: 'Wallet',
      type: 'WALLET',
      initialBalanceMinor: 0,
    });
    expect(result).toBeUndefined();
  });
});
