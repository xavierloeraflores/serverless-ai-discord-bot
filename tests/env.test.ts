import { describe, expect, it } from "vitest";

import {
  DEFAULT_AI_SYSTEM_PROMPT,
  getDiscordInteractionEnv,
  getDiscordWorkflowEnv,
} from "@/lib/env";

describe("env helpers", () => {
  it("parses workflow env and applies defaults", () => {
    const env = getDiscordWorkflowEnv({
      DISCORD_APPLICATION_ID: "123",
      AWS_REGION: "us-east-1",
      AWS_ACCESS_KEY_ID: "key",
      AWS_SECRET_ACCESS_KEY: "secret",
      BEDROCK_MODEL_ID: "anthropic.claude-3-7-sonnet-20250219-v1:0",
    });

    expect(env.AI_SYSTEM_PROMPT).toBe(DEFAULT_AI_SYSTEM_PROMPT);
    expect(env.AI_MAX_OUTPUT_TOKENS).toBe(512);
  });

  it("fails fast on missing required env vars", () => {
    expect(() => getDiscordInteractionEnv({})).toThrow();
  });
});
