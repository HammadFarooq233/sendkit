import { Command } from "commander";
import { sendDiscordMessage } from "@hammad-farooq/sendkit-core";
import {
  configPath,
  getDiscordWebhookUrl,
  writeDiscordWebhookUrl,
} from "./config";

const program = new Command();

program.name("sendkit").description("SendKit CLI backed by sendkit-core");

program
  .command("init")
  .description("Configure SendKit CLI local settings")
  .requiredOption("--discord-webhook-url <webhookUrl>", "Discord webhook URL")
  .action(async (options: { discordWebhookUrl: string }) => {
    writeDiscordWebhookUrl(options.discordWebhookUrl);
    console.log(`Saved SendKit CLI config to ${configPath}`);
  });

// Discord webhook sender with validation
program
  .command("discord")
  .description("Send a Discord message via a saved Discord webhook URL")
  .argument("<message>", "Message text to send")
  .option("-w, --wait", "Request Discord to return the created message object")
  .action(async (message: string, options: { wait?: boolean }) => {
    const webhookUrl = getDiscordWebhookUrl();

    const result = await sendDiscordMessage({
      webhookUrl,
      message,
      wait: !!options.wait,
    });

    console.log(JSON.stringify(result, null, 2));
  });

await program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
