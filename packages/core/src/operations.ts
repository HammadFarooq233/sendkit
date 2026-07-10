import {
  discordMessageInputSchema,
  discordSendMessageRequestSchema,
  discordSendMessageResponseSchema,
  discordMessageOutputSchema,
  type DiscordMessageInput,
  type DiscordSendMessageResponse,
  type DiscordMessageOutput,
} from "./schemas";

export async function sendDiscordMessage(
  input: DiscordMessageInput,
): Promise<DiscordMessageOutput> {
  const parsedInput = discordMessageInputSchema.parse(input);

  const requestBody = discordSendMessageRequestSchema.parse({
    content: parsedInput.message,
  });

  // If caller requested `wait`, ask Discord to return the created message
  let url = parsedInput.webhookUrl;
  if (parsedInput.wait) {
    url += url.includes("?") ? "&wait=true" : "?wait=true";
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  // Discord webhooks may return 204 No Content or a message JSON when
  // `wait=true` is used. Attempt to parse JSON only when there is a body.
  let data: DiscordSendMessageResponse | null = null;
  if (response.status !== 204) {
    try {
      const json = await response.json();
      data = discordSendMessageResponseSchema.parse(json);
    } catch {
      // ignore parse errors
    }
  }

  if (!response.ok) {
    const text = data ? JSON.stringify(data).slice(0, 500) : await response.text();
    throw new Error(
      `Discord webhook request failed: ${response.status} ${response.statusText} - ${text}`,
    );
  }

  return discordMessageOutputSchema.parse({
    ok: true,
    webhookUrl: parsedInput.webhookUrl,
    messageId: data?.id ?? undefined,
  });
}
