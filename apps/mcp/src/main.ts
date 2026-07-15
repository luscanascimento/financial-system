import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { loadConfig } from './config';
import { createServer } from './server';

/**
 * Entry point for the FinanceHub MCP server. Speaks the Model Context Protocol
 * over stdio, so it is launched by an MCP client (Claude Desktop, Claude Code,
 * etc.). All diagnostics go to stderr — stdout is reserved for the JSON-RPC
 * protocol stream.
 */
async function main(): Promise<void> {
  const config = loadConfig();
  const server = createServer(config);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `[financehub-mcp] ready — API ${config.apiBaseUrl}` +
      (config.accessToken ? ' (token auth)' : ` (login as ${config.email})`),
  );
}

main().catch((error: unknown) => {
  console.error('[financehub-mcp] fatal:', error);
  process.exit(1);
});
