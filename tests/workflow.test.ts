import { FatalError, RetryableError } from "workflow";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  generateText: vi.fn(),
  createBedrockAnthropic: vi.fn(() => vi.fn((modelId: string) => ({ modelId }))),
  editOriginalDiscordResponse: vi.fn(),
  sendDiscordFollowup: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: mocks.generateText,
}));

vi.mock("@ai-sdk/amazon-bedrock/anthropic", () => ({
  createBedrockAnthropic: mocks.createBedrockAnthropic,
}));

vi.mock("@/lib/discord-rest", () => ({
  editOriginalDiscordResponse: mocks.editOriginalDiscordResponse,
  sendDiscordFollowup: mocks.sendDiscordFollowup,
}));

import {
  classifyModelError,
  discordAiResponseWorkflow,
  publishDiscordChunks,
} from "@/workflows/discord-ai-response";

describe("discord AI workflow", () => {
  beforeEach(() => {
    process.env.DISCORD_APPLICATION_ID = "app-123";
    process.env.AWS_REGION = "us-east-1";
    process.env.AWS_ACCESS_KEY_ID = "access";
    process.env.AWS_SECRET_ACCESS_KEY = "secret";
    process.env.BEDROCK_MODEL_ID = "anthropic.claude-3-7-sonnet-20250219-v1:0";
    delete process.env.AWS_SESSION_TOKEN;
    delete process.env.AI_SYSTEM_PROMPT;
    delete process.env.AI_MAX_OUTPUT_TOKENS;
  });

  it("publishes a successful AI response to Discord", async () => {
    mocks.generateText.mockResolvedValue({
      text: "Discord workflows let HTTP bots stay serverless.",
    });

    await discordAiResponseWorkflow({
      applicationId: "app-123",
      interactionToken: "token-123",
      prompt: "Explain workflows",
      requesterName: "Xavier",
    });

    expect(mocks.generateText).toHaveBeenCalledTimes(1);
    expect(mocks.editOriginalDiscordResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: "app-123",
        interactionToken: "token-123",
      }),
      "Discord workflows let HTTP bots stay serverless.",
    );
    expect(mocks.sendDiscordFollowup).not.toHaveBeenCalled();
  });

  it("splits long responses into followups", async () => {
    await publishDiscordChunks(
      {
        applicationId: "app-123",
        interactionToken: "token-123",
      },
      "A".repeat(2_500),
    );

    expect(mocks.editOriginalDiscordResponse).toHaveBeenCalledTimes(1);
    expect(mocks.sendDiscordFollowup).toHaveBeenCalledTimes(1);
  });

  it("classifies transient model errors as retryable", () => {
    const error = classifyModelError({
      name: "ThrottlingException",
      message: "Rate limit exceeded",
      statusCode: 429,
    });

    expect(error).toBeInstanceOf(RetryableError);
  });

  it("classifies credential errors as fatal", () => {
    const error = classifyModelError({
      name: "AccessDeniedException",
      message: "AWS credential signature failed",
      statusCode: 403,
    });

    expect(error).toBeInstanceOf(FatalError);
  });
});
