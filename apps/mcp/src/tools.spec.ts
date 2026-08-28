import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools } from './tools';
import { FinanceClient } from './finance-client';

describe('MCP Tools', () => {
  let server: McpServer;
  let client: FinanceClient;

  beforeEach(() => {
    server = new McpServer({ name: 'financehub-test', version: '0.1.0' });
    client = {
      getOverview: vi.fn(),
      listAccounts: vi.fn(),
      createTransaction: vi.fn(),
      listTransactions: vi.fn(),
      getCashFlow: vi.fn(),
      getCategoryBreakdown: vi.fn(),
    } as unknown as FinanceClient;
  });

  it('registers all core tools on server instance without error', () => {
    expect(() => registerTools(server, client)).not.toThrow();
  });
});
