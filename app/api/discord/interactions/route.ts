import { start } from "workflow/api";

import {
  DiscordInteractionResponseType,
  DiscordInteractionType,
  extractAiPrompt,
  getRequesterName,
  type DiscordInteraction,
  verifyDiscordRequest,
} from "@/lib/discord";
import { getDiscordInteractionEnv } from "@/lib/env";
import { discordAiResponseWorkflow } from "@/workflows/discord-ai-response";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const env = getDiscordInteractionEnv();
  const rawBody = await request.text();

  const isValidRequest = verifyDiscordRequest({
    rawBody,
    signature: request.headers.get("X-Signature-Ed25519"),
    timestamp: request.headers.get("X-Signature-Timestamp"),
    publicKey: env.DISCORD_PUBLIC_KEY,
  });

  if (!isValidRequest) {
    return new Response("Invalid request signature.", { status: 401 });
  }

  const interaction = JSON.parse(rawBody) as DiscordInteraction;

  if (interaction.type === DiscordInteractionType.Ping) {
    return Response.json({
      type: DiscordInteractionResponseType.Pong,
    });
  }

  if (
    interaction.type !== DiscordInteractionType.ApplicationCommand ||
    interaction.data?.name !== "ai"
  ) {
    return Response.json({
      type: DiscordInteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "Only the `/ai` slash command is supported by this endpoint.",
      },
    });
  }

  const prompt = extractAiPrompt(interaction);
  if (!prompt) {
    return Response.json({
      type: DiscordInteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "The `/ai` command requires a non-empty `prompt` value.",
      },
    });
  }

  try {
    await start(discordAiResponseWorkflow, [
      {
        applicationId: interaction.application_id,
        interactionToken: interaction.token,
        prompt,
        requesterName: getRequesterName(interaction),
      },
    ]);
  } catch {
    return Response.json({
      type: DiscordInteractionResponseType.ChannelMessageWithSource,
      data: {
        content: "The bot could not start the workflow for that `/ai` request.",
      },
    });
  }

  return Response.json({
    type: DiscordInteractionResponseType.DeferredChannelMessageWithSource,
  });
}
