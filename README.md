# SendKit

Send plain-text messages to Discord via webhooks — through a **CLI**, a **local MCP server**, or a **remote MCP server**. All three surfaces are backed by a shared, type-safe core library with Zod validation at every layer.

## Architecture

```
                    ┌──────────────┐
                    │  sendkit-core │  Zod schemas + sendDiscordMessage()
                    └──────┬───────┘
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   ┌──────────────┐ ┌────────────┐ ┌──────────────┐
   │  sendkit-cli  │ │ sendkit-mcp│ │remote-mcp    │
   │  (Commander)  │ │  (stdio)   │ │(Hono + Clerk)│
   └──────────────┘ └────────────┘ └──────────────┘
```

| Surface | Package | Transport | Auth |
| --- | --- | --- | --- |
| CLI | `@hammad-farooq/sendkit-cli` | Terminal | Webhook stored at `~/.config/sendkit/config.json` |
| Local MCP | `@hammad-farooq/sendkit-mcp` | stdio | Caller supplies `webhookUrl` per call |
| Remote MCP | `sendkit-remote-mcp` | HTTP (Hono) | Clerk OAuth tokens |

## Features

- **Type-safe** — all inputs/outputs validated with Zod schemas
- **Three delivery surfaces** — pick the one that fits your workflow
- **Secure credential storage** — CLI writes config files with `0600` permissions
- **`wait` support** — optionally request Discord return the created message object
- **AI agent integration** — MCP servers expose a `discord` tool consumable by any MCP client
- **Docker-ready** — remote MCP ships with a Bun-based Dockerfile

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) ≥ 1.0
- A [Discord webhook URL](https://support.discord.com/hc/en-us/articles/228383668-Intro-to-Webhooks)

### CLI (terminal)

```bash
bun install -g @hammad-farooq/sendkit-cli

sendkit init --discord-webhook-url "https://discord.com/api/webhooks/..."
sendkit discord "Hello from SendKit"
sendkit discord "Hello with message ID" --wait
```

### Local MCP server (AI agents)

```bash
# Run directly
bunx -y @hammad-farooq/sendkit-mcp

# Or add to your MCP client config:
# {
#   "mcp": {
#     "sendkit": {
#       "type": "local",
#       "command": ["bunx", "-y", "@hammad-farooq/sendkit-mcp"]
#     }
#   }
# }
```

The server registers a `discord` tool requiring `webhookUrl`, `message`, and optional `wait`.

### Remote MCP server (HTTP with Clerk auth)

```bash
cp .env.example .env
# Fill in CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY

bun run dev:remote-mcp
# Server starts on http://localhost:3000
# Webhook endpoint: POST /:webhookId/:webhookToken/mcp
```

#### Docker

```bash
docker build -t sendkit-remote-mcp apps/remote-mcp
docker run -p 10000:10000 \
  -e CLERK_PUBLISHABLE_KEY=pk_... \
  -e CLERK_SECRET_KEY=sk_... \
  sendkit-remote-mcp
```

## Packages

### `@hammad-farooq/sendkit-core`

Shared library with Zod schemas and the `sendDiscordMessage()` function. Published on npm.

### `@hammad-farooq/sendkit-cli`

The `sendkit` binary. Stores one webhook URL per machine. Two commands:

```
sendkit init --discord-webhook-url <url>   # Save webhook (writes ~/.config/sendkit/config.json with mode 0600)
sendkit discord "<message>" [--wait]       # Send a message
```

### `@hammad-farooq/sendkit-mcp`

Stdio MCP server. Registers one tool: `discord`. MCP clients typically surface this as `sendkit_discord`.

### `sendkit-remote-mcp`

HTTP MCP server protected by Clerk OAuth. Derives the webhook URL from the request path (`/:webhookId/:webhookToken/mcp`). The tool accepts only `message` and optional `wait` — no webhook URL in the input schema.

## Development

```bash
bun install          # Install all workspace dependencies

# Build
bun run build:core
bun run build:cli
bun run build:local-mcp

# Dev servers
bun run dev:cli           # Run CLI in dev mode
bun run dev:local-mcp     # Run local MCP in dev mode
bun run dev:remote-mcp    # Run remote MCP in dev mode

# Quality
bun run format            # Format with oxfmt
bun run format:check      # Check formatting
bun run lint              # Lint with oxlint
bun run lint:fix          # Lint and auto-fix
bun run typecheck         # TypeScript type checking
```

## Tech Stack

| Layer | Technology |
| --- | --- |
| Runtime | [Bun](https://bun.sh) |
| Language | TypeScript 7 (strict mode, ES2022) |
| Validation | [Zod](https://zod.dev) v4 |
| CLI | [Commander.js](https://github.com/tj/commander.js) v15 |
| MCP | [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk) v1.29 |
| HTTP | [Hono](https://hono.dev) v4 |
| Auth (Remote) | [Clerk](https://clerk.com) |
| Bundler | [tsdown](https://tsdown.dev) |
| Linting | [oxlint](https://oxc.rs) |
| Formatting | [oxfmt](https://oxc.rs) |

## Limitations

- **Plain text only** — no embeds, attachments, files, components, reactions, threads, edits, or deletions
- **2000-character limit** — enforced by Discord; SendKit does not auto-truncate or split
- **No retry/idempotency** — each call is an immediate side effect with no automatic retry or rate-limit backoff
- **Single webhook per call** — no fan-out, channel-name resolution, or scheduling
- **No read capability** — cannot inspect Discord history or verify channel membership

## License

[MIT](LICENSE)
