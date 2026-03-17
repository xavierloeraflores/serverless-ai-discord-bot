import { z } from "zod";

const envSchema = z.object({
  DISCORD_APPLICATION_ID: z.string().trim().min(1),
  DISCORD_BOT_TOKEN: z.string().trim().min(1),
  DISCORD_GUILD_ID: z.string().trim().min(1),
});

const env = envSchema.parse(process.env);

const commands = [
  {
    name: "ai",
    description: "Ask Claude on Bedrock for a Discord-ready answer.",
    type: 1,
    options: [
      {
        type: 3,
        name: "prompt",
        description: "What should the bot respond to?",
        required: true,
        max_length: 4000,
      },
    ],
  },
];

const response = await fetch(
  `https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.DISCORD_GUILD_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  },
);

if (!response.ok) {
  const responseText = await response.text().catch(() => "");
  throw new Error(
    `Failed to sync Discord slash commands: ${response.status}${responseText ? ` ${responseText}` : ""}`,
  );
}

const registeredCommands = await response.json();
console.log(
  `Synced ${registeredCommands.length} guild command(s) to ${env.DISCORD_GUILD_ID}: ${registeredCommands.map((command) => command.name).join(", ")}`,
);
