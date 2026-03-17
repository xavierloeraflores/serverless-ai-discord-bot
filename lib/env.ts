import { z } from "zod";

export const DEFAULT_AI_SYSTEM_PROMPT =
  "You are a concise Discord assistant. Answer clearly, be helpful, and format for chat readability.";

const nonEmptyString = z.string().trim().min(1);
const optionalTrimmedString = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  nonEmptyString.optional(),
);
const optionalPositiveInteger = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }

    if (typeof value === "number") {
      return value;
    }

    return Number(value);
  },
  z.number().int().positive().max(4096).default(512),
);

const interactionEnvSchema = z.object({
  DISCORD_PUBLIC_KEY: nonEmptyString,
});

const workflowEnvSchema = z.object({
  DISCORD_APPLICATION_ID: nonEmptyString,
  AWS_REGION: nonEmptyString,
  AWS_ACCESS_KEY_ID: nonEmptyString,
  AWS_SECRET_ACCESS_KEY: nonEmptyString,
  AWS_SESSION_TOKEN: optionalTrimmedString,
  BEDROCK_MODEL_ID: nonEmptyString,
  AI_SYSTEM_PROMPT: optionalTrimmedString.default(DEFAULT_AI_SYSTEM_PROMPT),
  AI_MAX_OUTPUT_TOKENS: optionalPositiveInteger,
});

const commandSyncEnvSchema = z.object({
  DISCORD_APPLICATION_ID: nonEmptyString,
  DISCORD_BOT_TOKEN: nonEmptyString,
  DISCORD_GUILD_ID: nonEmptyString,
});

export type DiscordInteractionEnv = z.infer<typeof interactionEnvSchema>;
export type DiscordWorkflowEnv = z.infer<typeof workflowEnvSchema>;
export type DiscordCommandSyncEnv = z.infer<typeof commandSyncEnvSchema>;

export function getDiscordInteractionEnv(
  env: NodeJS.ProcessEnv = process.env,
): DiscordInteractionEnv {
  return interactionEnvSchema.parse(env);
}

export function getDiscordWorkflowEnv(
  env: NodeJS.ProcessEnv = process.env,
): DiscordWorkflowEnv {
  return workflowEnvSchema.parse(env);
}

export function getDiscordCommandSyncEnv(
  env: NodeJS.ProcessEnv = process.env,
): DiscordCommandSyncEnv {
  return commandSyncEnvSchema.parse(env);
}
