import { FatalError, RetryableError } from "workflow";

import type { DiscordInteractionWebhookContext } from "@/lib/discord";

export type DiscordMessagePayload = {
  content: string;
};

type DiscordApiRequestOptions = {
  method: "PATCH" | "POST";
  path: string;
  body: DiscordMessagePayload;
};

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

export async function editOriginalDiscordResponse(
  context: DiscordInteractionWebhookContext,
  content: string,
): Promise<void> {
  await discordApiRequest(context, {
    method: "PATCH",
    path: `/messages/@original`,
    body: { content },
  });
}

export async function sendDiscordFollowup(
  context: DiscordInteractionWebhookContext,
  content: string,
): Promise<void> {
  await discordApiRequest(context, {
    method: "POST",
    path: "",
    body: { content },
  });
}

async function discordApiRequest(
  context: DiscordInteractionWebhookContext,
  options: DiscordApiRequestOptions,
): Promise<void> {
  const response = await fetch(
    `${DISCORD_API_BASE_URL}/webhooks/${context.applicationId}/${context.interactionToken}${options.path}`,
    {
      method: options.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...options.body,
        allowed_mentions: {
          parse: [],
        },
      }),
    },
  );

  if (response.ok) {
    return;
  }

  const responseText = await response.text().catch(() => "");
  const message = `Discord API ${options.method} ${options.path || "/"} failed with ${response.status}${responseText ? `: ${responseText}` : ""}`;

  if (response.status === 429 || response.status >= 500) {
    throw new RetryableError(message, {
      retryAfter: getRetryAfter(response) ?? "15s",
    });
  }

  throw new FatalError(message);
}

function getRetryAfter(response: Response): number | undefined {
  const retryAfterHeader = response.headers.get("retry-after");
  if (!retryAfterHeader) {
    return undefined;
  }

  const retryAfterSeconds = Number(retryAfterHeader);
  if (!Number.isFinite(retryAfterSeconds)) {
    return undefined;
  }

  return retryAfterSeconds * 1_000;
}
