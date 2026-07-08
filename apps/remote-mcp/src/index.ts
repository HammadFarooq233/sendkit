import { Hono } from "hono";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import {
  discordRemoteMessageInputSchema,
  sendDiscordMessage,
  type DiscordRemoteMessageInput,
} from "sendkit-core";

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

const app = new Hono();

app.post("/:webhookId/:webhookToken/mcp", async (c) => {
  const webhookId = c.req.param("webhookId");
  const webhookToken = c.req.param("webhookToken");
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
  fetch: app.fetch,
};