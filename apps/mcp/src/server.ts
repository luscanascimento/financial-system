import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { McpConfig } from './config';
import { FinanceClient } from './finance-client';
import { registerTools } from './tools';

/**
 * Builds the FinanceHub MCP server: an {@link McpServer} exposing the finance
 * tools, backed by a {@link FinanceClient} bound to the given configuration.
 */
export function createServer(config: McpConfig): McpServer {
  const server = new McpServer({
    name: 'financehub',
    version: '0.1.0',
  });

  const client = new FinanceClient(config);
  registerTools(server, client);

  return server;
}
