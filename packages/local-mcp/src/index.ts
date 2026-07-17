import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  discordMessageInputSchema,
  type DiscordMessageInput,
  sendDiscordMessage,
} from "@hammad-farooq/sendkit-core";

const server = new McpServer({
  name: "sendkit-local",
  version: "0.0.0",
});

server.registerTool(
  "discord",
  {
    title: "Discord",
    description: "Send a Discord message.",
    inputSchema: discordMessageInputSchema.shape,
  },
  async (input: DiscordMessageInput) => {
    const result = await sendDiscordMessage({ ...input });

    return {
      content: [
        {
          type: "text",
          text: `Sent Discord message ${result.messageId ?? "(no id)"} via webhook ${result.webhookUrl}`,
        },
      ],
      structuredContent: result,
    };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
