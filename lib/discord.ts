import nacl from "tweetnacl";

export const DISCORD_MESSAGE_LIMIT = 2_000;
export const DISCORD_REQUEST_TOLERANCE_MS = 5 * 60 * 1_000;

export const DiscordInteractionType = {
  Ping: 1,
  ApplicationCommand: 2,
} as const;

export const DiscordInteractionResponseType = {
  Pong: 1,
  ChannelMessageWithSource: 4,
  DeferredChannelMessageWithSource: 5,
} as const;

type DiscordCommandOption = {
  name: string;
  type: number;
  value?: string;
};

type DiscordUser = {
  username?: string;
  global_name?: string | null;
};

export type DiscordInteraction = {
  id: string;
  type: number;
  token: string;
  application_id: string;
  guild_id?: string | null;
  data?: {
    name?: string;
    options?: DiscordCommandOption[];
  };
  member?: {
    user?: DiscordUser;
  };
  user?: DiscordUser;
};

export type DiscordInteractionWebhookContext = {
  applicationId: string;
  interactionToken: string;
};

export function verifyDiscordRequest(options: {
  rawBody: string;
  signature: string | null;
  timestamp: string | null;
  publicKey: string;
  now?: number;
}): boolean {
  const { rawBody, signature, timestamp, publicKey, now = Date.now() } = options;

  if (!signature || !timestamp) {
    return false;
  }

  const unixTimestamp = Number(timestamp);
  if (!Number.isFinite(unixTimestamp)) {
    return false;
  }

  const requestAgeMs = Math.abs(now - unixTimestamp * 1_000);
  if (requestAgeMs > DISCORD_REQUEST_TOLERANCE_MS) {
    return false;
  }

  try {
    const publicKeyBytes = Buffer.from(publicKey, "hex");
    const signatureBytes = Buffer.from(signature, "hex");
    const payload = new TextEncoder().encode(timestamp + rawBody);

    return nacl.sign.detached.verify(payload, signatureBytes, publicKeyBytes);
  } catch {
    return false;
  }
}

export function extractAiPrompt(interaction: DiscordInteraction): string | null {
  const promptOption = interaction.data?.options?.find(
    (option) => option.name === "prompt" && typeof option.value === "string",
  );

  const prompt = promptOption?.value?.trim();
  return prompt ? prompt : null;
}

export function getRequesterName(interaction: DiscordInteraction): string {
  return (
    interaction.member?.user?.global_name ||
    interaction.member?.user?.username ||
    interaction.user?.global_name ||
    interaction.user?.username ||
    "Discord user"
  );
}

export function chunkDiscordMessage(
  content: string,
  maxLength = DISCORD_MESSAGE_LIMIT,
): string[] {
  const normalized = content.trim();
  if (normalized.length <= maxLength) {
    return [normalized];
  }

  const chunks: string[] = [];
  let cursor = 0;

  while (cursor < normalized.length) {
    const remaining = normalized.length - cursor;
    if (remaining <= maxLength) {
      chunks.push(normalized.slice(cursor).trim());
      break;
    }

    const slice = normalized.slice(cursor, cursor + maxLength);
    const breakpoints = [slice.lastIndexOf("\n"), slice.lastIndexOf(" ")];
    const breakpoint = Math.max(...breakpoints);
    const end = breakpoint > maxLength * 0.6 ? cursor + breakpoint : cursor + maxLength;

    chunks.push(normalized.slice(cursor, end).trim());
    cursor = end;

    while (normalized[cursor] === " " || normalized[cursor] === "\n") {
      cursor += 1;
    }
  }

  return chunks.filter(Boolean);
}
