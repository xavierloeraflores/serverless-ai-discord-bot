import nacl from "tweetnacl";
import { describe, expect, it } from "vitest";

import {
  chunkDiscordMessage,
  extractAiPrompt,
  verifyDiscordRequest,
  type DiscordInteraction,
} from "@/lib/discord";

describe("discord helpers", () => {
  it("verifies a valid Discord signature", () => {
    const keyPair = nacl.sign.keyPair();
    const rawBody = JSON.stringify({ type: 1 });
    const timestamp = `${Math.floor(Date.now() / 1_000)}`;
    const payload = new TextEncoder().encode(timestamp + rawBody);
    const signature = Buffer.from(
      nacl.sign.detached(payload, keyPair.secretKey),
    ).toString("hex");

    const isValid = verifyDiscordRequest({
      rawBody,
      timestamp,
      signature,
      publicKey: Buffer.from(keyPair.publicKey).toString("hex"),
    });

    expect(isValid).toBe(true);
  });

  it("rejects stale timestamps", () => {
    const isValid = verifyDiscordRequest({
      rawBody: "{}",
      timestamp: "1",
      signature: "deadbeef",
      publicKey: "deadbeef",
      now: Date.now(),
    });

    expect(isValid).toBe(false);
  });

  it("extracts the prompt option", () => {
    const interaction = {
      data: {
        options: [{ name: "prompt", type: 3, value: "hello world" }],
      },
    } as DiscordInteraction;

    expect(extractAiPrompt(interaction)).toBe("hello world");
  });

  it("chunks long content without changing the full text", () => {
    const content = `${"hello ".repeat(350)}trim`;
    const chunks = chunkDiscordMessage(content, 120);

    expect(chunks.every((chunk) => chunk.length <= 120)).toBe(true);
    expect(chunks.join(" ")).toContain("trim");
    expect(chunks.join(" ")).toContain("hello hello");
  });
});
