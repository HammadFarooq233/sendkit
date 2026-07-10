import { z } from "zod";

export const discordMessageInputSchema = z.object({
  webhookUrl: z.string().min(1, "Webhook URL is required").url("Webhook URL must be a valid URL"),
  message: z.string().min(1, "Message is required"),
  // when true, Discord will return the created message object instead of 204
  wait: z.boolean().optional(),
});

export const discordMessageOptionsSchema = discordMessageInputSchema.extend({});

export const discordRemoteMessageInputSchema = discordMessageInputSchema.omit({
  webhookUrl: true,
});

export const discordSendMessageRequestSchema = z.object({
  content: z.string().min(1),
});

export const discordSendMessageResponseSchema = z
  .object({
    // Discord webhooks return the created message object when `wait=true` is
    // specified. Model the minimal message object we need (id) and allow
    // additional fields.
    id: z.string().optional(),
  })
  .or(z.undefined());

export const discordMessageObjectSchema = z.object({ id: z.string() }).passthrough();

export const discordMessageOutputSchema = z.object({
  ok: z.literal(true),
  webhookUrl: z.string(),
  messageId: z.string().optional(),
});

export type DiscordMessageInput = z.infer<typeof discordMessageInputSchema>;
export type DiscordMessageOptions = z.infer<typeof discordMessageOptionsSchema>;
export type DiscordRemoteMessageInput = z.infer<typeof discordRemoteMessageInputSchema>;
export type DiscordSendMessageRequest = z.infer<typeof discordSendMessageRequestSchema>;
export type DiscordSendMessageResponse = z.infer<typeof discordSendMessageResponseSchema>;
export type DiscordMessageOutput = z.infer<typeof discordMessageOutputSchema>;
