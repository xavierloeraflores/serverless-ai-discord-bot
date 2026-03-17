import { createBedrockAnthropic } from "@ai-sdk/amazon-bedrock/anthropic";
import { generateText } from "ai";
import { FatalError, RetryableError } from "workflow";

import {
    chunkDiscordMessage,
    type DiscordInteractionWebhookContext,
} from "@/lib/discord";
import {
    editOriginalDiscordResponse,
    sendDiscordFollowup,
} from "@/lib/discord-rest";
import { getDiscordWorkflowEnv } from "@/lib/env";

export type DiscordAiWorkflowPayload = DiscordInteractionWebhookContext & {
    prompt: string;
    requesterName: string;
};

export async function discordAiResponseWorkflow(
    payload: DiscordAiWorkflowPayload,
): Promise<void> {
    "use workflow";

    try {
        const responseText = await generateDiscordCompletion(payload);
        await publishDiscordChunks(payload, responseText);
    } catch (error) {
        await publishDiscordFailure(payload, toUserFacingErrorMessage(error));
    }
}

export async function generateDiscordCompletion(
    payload: Pick<DiscordAiWorkflowPayload, "prompt" | "requesterName">,
): Promise<string> {
    "use step";

    const env = getDiscordWorkflowEnv();
    const provider = createBedrockAnthropic({
        region: env.AWS_REGION,
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN,
    });

    try {
        const result = await generateText({
            model: provider.languageModel(env.BEDROCK_MODEL_ID),
            system: env.AI_SYSTEM_PROMPT,
            prompt: `User: ${payload.requesterName}\nPrompt: ${payload.prompt}`,
            maxOutputTokens: env.AI_MAX_OUTPUT_TOKENS,
        });

        const text = result.text.trim();
        if (!text) {
            throw new FatalError("Bedrock returned an empty response.");
        }

        return text;
    } catch (error) {
        throw classifyModelError(error);
    }
}

generateDiscordCompletion.maxRetries = 4;

export async function publishDiscordChunks(
    context: DiscordInteractionWebhookContext,
    content: string,
): Promise<void> {
    "use step";

    const [firstChunk, ...followups] = chunkDiscordMessage(content);

    await editOriginalDiscordResponse(context, firstChunk);

    for (const followup of followups) {
        await sendDiscordFollowup(context, followup);
    }
}

publishDiscordChunks.maxRetries = 4;

export async function publishDiscordFailure(
    context: DiscordInteractionWebhookContext,
    message: string,
): Promise<void> {
    "use step";

    await editOriginalDiscordResponse(context, message);
}

publishDiscordFailure.maxRetries = 2;

export function classifyModelError(error: unknown): Error {
    if (error instanceof FatalError || error instanceof RetryableError) {
        return error;
    }

    const errorName = getErrorName(error);
    const statusCode = getStatusCode(error);
    const message = getErrorMessage(error);

    if (
        statusCode === 429 ||
        statusCode === 500 ||
        statusCode === 502 ||
        statusCode === 503 ||
        statusCode === 504 ||
        /(throttl|timeout|temporar|service unavailable|rate limit|overloaded)/i.test(
            message,
        ) ||
        /(ThrottlingException|ModelNotReadyException|ServiceUnavailableException)/.test(
            errorName,
        )
    ) {
        return new RetryableError(
            message || "Bedrock request should be retried.",
            {
                retryAfter: statusCode === 429 ? "30s" : "15s",
            },
        );
    }

    if (
        statusCode === 400 ||
        statusCode === 401 ||
        statusCode === 403 ||
        statusCode === 404 ||
        /(credential|access.?key|secret.?access.?key|signature|authentication|validation|not authorized)/i.test(
            message,
        ) ||
        /(AccessDeniedException|ValidationException|UnrecognizedClientException)/.test(
            errorName,
        )
    ) {
        return new FatalError(
            message || "Bedrock request is permanently invalid.",
        );
    }

    return error instanceof Error ? error : new Error("Unknown Bedrock error");
}

export function toUserFacingErrorMessage(error: unknown): string {
    if (error instanceof RetryableError) {
        return "The AI service is busy right now. Please try `/ai` again in a minute.";
    }

    const message = getErrorMessage(error);
    if (
        /(credential|access.?key|secret.?access.?key|authentication|signature)/i.test(
            message,
        )
    ) {
        return "The bot is misconfigured for Bedrock right now. Update the AWS environment variables and try again.";
    }

    return "I couldn't complete that `/ai` request. Please try again shortly.";
}

function getErrorName(error: unknown): string {
    if (
        error &&
        typeof error === "object" &&
        "name" in error &&
        typeof error.name === "string"
    ) {
        return error.name;
    }

    return "";
}

function getStatusCode(error: unknown): number | undefined {
    if (error && typeof error === "object") {
        if ("statusCode" in error && typeof error.statusCode === "number") {
            return error.statusCode;
        }

        if ("status" in error && typeof error.status === "number") {
            return error.status;
        }

        if (
            "cause" in error &&
            error.cause &&
            typeof error.cause === "object" &&
            "$metadata" in error.cause &&
            error.cause.$metadata &&
            typeof error.cause.$metadata === "object" &&
            "httpStatusCode" in error.cause.$metadata &&
            typeof error.cause.$metadata.httpStatusCode === "number"
        ) {
            return error.cause.$metadata.httpStatusCode;
        }
    }

    return undefined;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === "string") {
        return error;
    }

    return "Unexpected Bedrock error.";
}
