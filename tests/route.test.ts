import nacl from "tweetnacl";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("workflow/api", () => ({
  start: vi.fn(),
}));

import { POST } from "@/app/api/discord/interactions/route";
import { start } from "workflow/api";

describe("POST /api/discord/interactions", () => {
  const keyPair = nacl.sign.keyPair();
  const publicKey = Buffer.from(keyPair.publicKey).toString("hex");

  beforeEach(() => {
    process.env.DISCORD_PUBLIC_KEY = publicKey;
  });

  it("returns pong for ping interactions", async () => {
    const response = await POST(createSignedRequest({ type: 1 }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ type: 1 });
  });

  it("defers valid /ai commands and starts the workflow", async () => {
    const response = await POST(
      createSignedRequest({
        type: 2,
        application_id: "app-123",
        token: "interaction-token",
        data: {
          name: "ai",
          options: [{ name: "prompt", type: 3, value: "Explain workflows." }],
        },
        member: {
          user: {
            username: "xavier",
            global_name: "Xavier",
          },
        },
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ type: 5 });
    expect(start).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid signatures", async () => {
    process.env.DISCORD_PUBLIC_KEY = "00";

    const response = await POST(
      new Request("https://example.com/api/discord/interactions", {
        method: "POST",
        headers: {
          "X-Signature-Ed25519": "deadbeef",
          "X-Signature-Timestamp": `${Math.floor(Date.now() / 1_000)}`,
        },
        body: JSON.stringify({ type: 1 }),
      }),
    );

    expect(response.status).toBe(401);
  });

  function createSignedRequest(payload: Record<string, unknown>) {
    const body = JSON.stringify(payload);
    const timestamp = `${Math.floor(Date.now() / 1_000)}`;
    const signature = Buffer.from(
      nacl.sign.detached(new TextEncoder().encode(timestamp + body), keyPair.secretKey),
    ).toString("hex");

    return new Request("https://example.com/api/discord/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature-Ed25519": signature,
        "X-Signature-Timestamp": timestamp,
      },
      body,
    });
  }
});
