import { Command } from "commander";
import { sendDiscordMessage } from "sendkit-core";

const program = new Command();

program.name("sendkit").description("SendKit tutorial CLI");

// Discord webhook sender with validation
program
  .command("discord")
  .description("Send a Discord message via webhook URL")
  .argument("<webhookUrl>", "Discord webhook URL")
  .argument("<message>", "Message text to send")
  .option("-w, --wait", "Request Discord to return the created message object")
  .action(async (webhookUrl: string, message: string, options: { wait?: boolean }) => {
    try {
      const result = await sendDiscordMessage({ webhookUrl, message, wait: !!options.wait });
      console.log("Sent Discord message via webhook.");
      if (result.messageId)
        console.log(`Discord message ID: ${result.messageId}`);
    } catch (err: any) {
      console.error("Failed to send Discord message:", err.message ?? err);
      process.exit(1);
    }
  });

program.parseAsync(process.argv);
