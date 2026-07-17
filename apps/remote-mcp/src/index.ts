import type { Context } from "hono";
import { Hono } from "hono";
import { createClerkClient } from "@clerk/backend";
import { generateClerkProtectedResourceMetadata } from "@clerk/mcp-tools/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  discordRemoteMessageInputSchema,
  sendDiscordMessage,
  type DiscordRemoteMessageInput,
} from "@hammad-farooq/sendkit-core";

function createServer(webhookUrl: string) {
  const server = new McpServer({
    name: "sendkit-remote",
    version: "0.0.0",
  });

  server.registerTool(
    "discord",
    {
      title: "Discord",
      description: "Send a Discord message.",
      inputSchema: discordRemoteMessageInputSchema.shape,
    },
    async (input: DiscordRemoteMessageInput) => {
      const result = await sendDiscordMessage({
        ...input,
        webhookUrl,
      });

      return {
        content: [
          {
            type: "text",
            text: `Sent Discord message ${result.messageId ?? "(no id)"} to webhook ${result.webhookUrl}`,
          },
        ],
        structuredContent: result,
      };
    },
  );

  return server;
}

function protectedResourceMetadataUrl(c: Context, webhookToken: string) {
  return new URL(
    `/.well-known/oauth-protected-resource/${c.req.param("webhookId")}/${webhookToken}/mcp`,
    c.req.url,
  ).toString();
}

function unauthorizedMcpResponse(c: Context, webhookToken: string) {
  c.header(
    "WWW-Authenticate",
    `Bearer resource_metadata="${protectedResourceMetadataUrl(c, webhookToken)}"`,
  );

  return c.json({ error: "Unauthorized" }, 401);
}

const app = new Hono();

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkPublishableKey) {
  throw new Error("CLERK_PUBLISHABLE_KEY environment variable is required");
}

if (!clerkSecretKey) {
  throw new Error("CLERK_SECRET_KEY environment variable is required");
}

const clerkClient = createClerkClient({
  publishableKey: clerkPublishableKey,
  secretKey: clerkSecretKey,
});

app.get(
  "/.well-known/oauth-protected-resource/:webhookId/:webhookToken/mcp",
  (c) => {
    return c.json(
      generateClerkProtectedResourceMetadata({
        publishableKey: clerkPublishableKey,
        resourceUrl: new URL(
          `/${c.req.param("webhookId")}/${c.req.param("webhookToken")}/mcp`,
          c.req.url,
        ).toString(),
      }),
    );
  },
);

app.post("/:webhookId/:webhookToken/mcp", async (c) => {
  const webhookId = c.req.param("webhookId");
  const webhookToken = c.req.param("webhookToken");

  if (!c.req.header("authorization")?.startsWith("Bearer ")) {
    return unauthorizedMcpResponse(c, webhookToken);
  }

  try {
    const requestState = await clerkClient.authenticateRequest(c.req.raw, {
      acceptsToken: "oauth_token",
    });

    if (!requestState.isAuthenticated) {
      return unauthorizedMcpResponse(c, webhookToken);
    }
  } catch {
    return unauthorizedMcpResponse(c, webhookToken);
  }

  const webhookUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}`;
  const server = createServer(webhookUrl);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(c.req.raw);
  } finally {
    await server.close();
  }
});

app.notFound((c) => {
  return c.json({ error: "Not found" }, 404);
});

const port = Number(process.env.PORT ?? 3000);

export default {
  port,
  fetch: (req: Request) => {
    const url = new URL(req.url);
    url.protocol = req.headers.get("x-forwarded-proto") ?? url.protocol;
    url.host = req.headers.get("x-forwarded-host") ?? url.host;

    return app.fetch(new Request(url, req));
  },
};
