import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { homedir } from "node:os";
import { z } from "zod";

export const configPath = join(homedir(), ".config", "sendkit", "config.json");

const cliConfigSchema = z.object({
  discordWebhookUrl: z.string().min(1).url().optional(),
});

const discordWebhookUrlSchema = z
  .string()
  .min(1, "Discord webhook URL is required")
  .url("Discord webhook URL must be a valid URL");

export function writeDiscordWebhookUrl(webhookUrl: string) {
  const parsedWebhookUrl = discordWebhookUrlSchema.parse(webhookUrl);

  mkdirSync(dirname(configPath), { recursive: true });
  writeFileSync(
    configPath,
    `${JSON.stringify({ discordWebhookUrl: parsedWebhookUrl }, null, 2)}\n`,
    {
      mode: 0o600,
    },
  );
}

export function getDiscordWebhookUrl() {
  if (!existsSync(configPath)) {
    throw new Error(
      "Discord webhook URL is required. Run `sendkit init --discord-webhook-url <webhookUrl>`.",
    );
  }

  const config = cliConfigSchema.parse(
    JSON.parse(readFileSync(configPath, "utf8")),
  );
  const webhookUrl = config.discordWebhookUrl;

  if (!webhookUrl) {
    throw new Error(
      "Discord webhook URL is required. Run `sendkit init --discord-webhook-url <webhookUrl>`.",
    );
  }

  return webhookUrl;
}
