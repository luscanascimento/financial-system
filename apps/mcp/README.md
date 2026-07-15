# FinanceHub MCP Server

A [Model Context Protocol](https://modelcontextprotocol.io) server that exposes
FinanceHub to AI assistants (Claude Desktop, Claude Code, Cursor, …). It speaks
MCP over **stdio** and calls the FinanceHub REST API on the user's behalf, so
every operation respects the same authentication and business rules as the app.

## Tools

| Tool                 | Description                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `finance_overview`   | Headline KPIs: total balance, net worth, month income/expense/net |
| `list_accounts`      | Accounts with balances (`includeArchived?`)                       |
| `create_account`     | Open an account (opening balance in major units)                  |
| `list_categories`    | Income/expense categories (`type?`)                               |
| `list_transactions`  | Transactions with filters + pagination                            |
| `create_transaction` | Record income/expense (amount in major units)                     |
| `list_budgets`       | Budgets with current-period spend/remaining                       |
| `list_goals`         | Savings goals with progress                                       |
| `cash_flow`          | Income vs. expense over the trailing N months                     |
| `category_breakdown` | Spend/income grouped by category                                  |

Amounts are exchanged with the AI in **major units** (e.g. dollars) for
ergonomics and converted to the API's integer minor units at the boundary.

## Configuration

Set via environment variables (see the repo `.env.example`):

| Variable                  | Default                     | Purpose                                                |
| ------------------------- | --------------------------- | ------------------------------------------------------ |
| `FINANCEHUB_API_URL`      | `http://localhost:3000/api` | API base URL (with prefix)                             |
| `FINANCEHUB_EMAIL`        | –                           | Login email (the seeded demo is `demo@financehub.dev`) |
| `FINANCEHUB_PASSWORD`     | –                           | Login password (the seeded demo is `Password123!`)     |
| `FINANCEHUB_ACCESS_TOKEN` | –                           | Pre-issued bearer token (skips login)                  |

Provide either `FINANCEHUB_ACCESS_TOKEN` **or** the email/password pair — with
neither, the tools return a clear "no credentials configured" error.

The API must be running (`docker compose up`, or `npx nx serve api`) and seeded
(`pnpm db:seed`) for the tools to return data. Accounts with MFA enabled aren't
supported by the login flow — use a non-MFA account or an access token.

## Build & run

```bash
npx nx build mcp                 # bundles to dist/apps/mcp/main.cjs
node dist/apps/mcp/main.cjs      # run the server (stdio)
```

## Register with an MCP client

**Claude Code** (`.mcp.json` in the project, or `claude mcp add`):

```json
{
  "mcpServers": {
    "financehub": {
      "command": "node",
      "args": ["dist/apps/mcp/main.cjs"],
      "env": {
        "FINANCEHUB_API_URL": "http://localhost:3000/api",
        "FINANCEHUB_EMAIL": "demo@financehub.dev",
        "FINANCEHUB_PASSWORD": "Password123!"
      }
    }
  }
}
```

**Claude Desktop** (`claude_desktop_config.json`): same `mcpServers` block, using
absolute paths for `command`/`args`.

Once connected, ask things like _“What's my financial overview?”_, _“List my
accounts”_, or _“Add a $12.50 expense for coffee to my checking account.”_
