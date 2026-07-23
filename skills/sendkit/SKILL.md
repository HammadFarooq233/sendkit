---
name: sendkit
description: Send plain-text Discord messages through SendKit — via its MCP `discord` tool (local or remote) or via the `sendkit` CLI. Use this skill whenever the user asks to send, post, publish, relay, announce, alert, or notify a Discord channel, including short requests such as "drop this in #alerts" or "ping the team," even when they do not name SendKit. Trigger for actionable delivery through SendKit, Discord, a webhook, or a channel post; do not trigger for drafting, rewriting, previewing, scheduling, editing, deleting, or discussing a message without sending it now.
compatibility: Requires either the SendKit MCP `discord` tool (commonly surfaced by MCP clients as `sendkit_discord`) or the `sendkit` CLI on `PATH` (from the `@hammad-farooq/sendkit-cli` npm package).
---

# SendKit

SendKit posts plain-text Discord messages to webhooks through one of three surfaces, all backed by the same `@hammad-farooq/sendkit-core` library:

- **Local MCP** (`@hammad-farooq/sendkit-mcp`) — stdio MCP server, tool `discord`. Caller supplies `webhookUrl`.
- **Remote MCP** (`sendkit-remote-mcp`) — HTTP MCP behind Clerk auth, tool `discord`. Webhook is derived from the request path; the tool accepts only `message` and optional `wait`.
- **CLI** (`@hammad-farooq/sendkit-cli`, the `sendkit` binary) — `sendkit discord "<message>"`. Reads the webhook from `~/.config/sendkit/config.json` (mode `0600`) saved via `sendkit init`.

Use this skill even when an MCP tool is already exposed, because the SendKit contract is not obvious from the tool's metadata: messages are plain text only, Discord enforces a 2,000-character limit, `wait` only changes whether a message ID comes back, sending has no retry or idempotency, and every successful call is an immediate external side effect.

Treat every tool call as an external side effect: a successful call publishes immediately, and an uncertain retry can create a duplicate.

## Determine intent

Distinguish delivery from composition before using the tool:

- If the user explicitly asks to send, post, publish, relay, announce, alert, or notify, treat that request as approval to send. Do not add a redundant confirmation.
- If the user asks to draft, compose, rewrite, preview, or show a possible message, return the text without calling SendKit.
- If delivery intent, message content, or destination is genuinely ambiguous, ask one concise clarifying question before sending.
- If the requested message includes unresolved placeholders or facts that cannot be inferred safely, resolve them before sending.

## Prepare the message

Send the exact text the user approved or requested.

- Preserve intentional formatting, links, mentions, and line breaks.
- Send plain text only. SendKit currently does not support embeds, attachments, files, components, reactions, threads, edits, or deletions.
- Keep the message non-empty and at most 2,000 characters. SendKit validates non-empty text, but Discord enforces the length limit.
- If the message exceeds 2,000 characters, do not silently truncate or split it. Ask whether to shorten it or send it as multiple messages because splitting causes multiple external side effects.
- Do not embellish, add signatures, or alter wording unless the user asked for editorial judgment.

## Resolve the webhook

A Discord webhook URL is a credential because possession grants permission to post.

- Use a webhook supplied by the user or an already configured, trusted SendKit integration.
- **Local MCP tool** (`discord`): pass the full `webhookUrl` argument on every call. The local server does not read `DISCORD_WEBHOOK_URL` from the environment; it must come from the caller.
- **Remote MCP tool** (`discord`): the integration derives the webhook from its endpoint; its input contains only `message` and optional `wait`. You do not pass the URL.
- **CLI** (`sendkit`): the webhook is read from `~/.config/sendkit/config.json`, written by `sendkit init --discord-webhook-url <url>`. The file is created with mode `0600`, so only one URL is stored per machine. If the user wants to target a new webhook, they must run `sendkit init` again — that is itself an external side effect, so confirm before running it.
- If the active tool requires `webhookUrl` and none is available, ask the user to provide one. Do not invent a URL or broadly search source files, shell history, logs, or environment files for credentials.
- Never repeat, log, commit, or include the webhook URL in the final response. The local and remote MCP servers return it in both human-readable tool content and structured output; ignore or redact those fields and report only the safe confirmation described below. The CLI prints JSON to stdout that includes the URL — parse, do not echo.

## Send with the tool

Pick the surface based on what is available and on the destination:

- **Local MCP** is the right choice when you have multiple destinations and the webhook URL per call, or when no auth flow is wired up. The tool is registered as `discord`; MCP clients such as opencode commonly expose it as `sendkit_discord` via a server-prefix convention.
- **Remote MCP** is the right choice when a hosted, Clerk-authenticated endpoint is already configured for the destination channel.
- **CLI** is the right choice when neither MCP surface is available, or when the user wants a one-shot send against a webhook they have already configured once with `sendkit init`.

Local MCP contract:

| Input        | Required | Meaning                                           |
| ------------ | -------- | ------------------------------------------------- |
| `webhookUrl` | Yes      | Full Discord webhook URL; keep secret.            |
| `message`    | Yes      | Non-empty plain-text Discord message.             |
| `wait`       | No       | Ask Discord to return the created message object. |

Remote MCP contract:

| Input     | Required | Meaning                                           |
| --------- | -------- | ------------------------------------------------- |
| `message` | Yes      | Non-empty plain-text Discord message.             |
| `wait`    | No       | Ask Discord to return the created message object. |

CLI contract:

```
sendkit init --discord-webhook-url <url>   # one-time, writes ~/.config/sendkit/config.json (mode 0600)
sendkit discord "<message>"                # reads the saved URL and posts
sendkit discord "<message>" --wait         # equivalent of wait=true
```

`wait` semantics are the same across all three surfaces:

- Omit it or use `false` for ordinary delivery. Discord normally returns `204 No Content`, so a successful result without `messageId` is expected.
- Use `true` only when the user needs a message ID or explicit creation response.
- Do not treat `wait` as confirmation, idempotency, retry, or rate-limit handling; it only changes Discord's response body.

Call the chosen surface exactly once after the inputs are ready. Do not send a test message to validate a webhook unless the user explicitly requests that external action.

## Report the result

On success, respond concisely with `Sent to Discord.` Include the message ID only when `wait` was true and the user actually asked for it. Do not echo the webhook URL or unnecessarily repeat the full message.

A missing `messageId` does not mean failure when `wait` was false. Trust the successful tool or command result.

## Handle failures safely

SendKit has no client-defined timeout, automatic retry, rate-limit backoff, or idempotency key.

- Do not automatically retry any failed or interrupted send. A network error, timeout, or `5xx` can be ambiguous: Discord may have accepted the message even though the response was lost.
- Explain ambiguous outcomes and recommend checking the Discord channel before resending.
- For `400`, verify message length and payload content, then obtain approval before a corrected send.
- For `401`, `403`, or `404`, report that the webhook is invalid, unauthorized, revoked, or deleted without revealing it.
- For `429`, report the rate limit rather than retrying blindly.
- Resend only when the user explicitly asks after understanding the duplicate risk.

## Respect current scope

SendKit sends one text message to one Discord webhook per call. It does not choose channels by name, fan out across webhooks, schedule messages, verify channel membership, inspect Discord history, or undo a send. State these limitations directly rather than simulating unsupported behavior.
