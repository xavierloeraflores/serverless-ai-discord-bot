# Discord `/ai` Bot on Next.js

This project is a serverless Discord slash-command bot built on the Next.js App Router. Discord sends signed HTTP interactions to a route handler, the app defers within Discord's 3 second deadline, and a Vercel Workflow run completes the Anthropic on Bedrock call before patching the original response.

## What it does

- Exposes one guild-scoped slash command: `/ai prompt:<text>`
- Uses Discord's HTTP interactions flow instead of a websocket gateway connection
- Defers the interaction immediately, then finishes the LLM call in Workflow
- Calls Anthropic models through Amazon Bedrock with AWS credentials from env vars
- Replaces the default Next.js homepage with a usage and configuration landing page

## Required environment variables

Copy `.env.example` into your local environment and populate the values below.

### Discord

- `DISCORD_PUBLIC_KEY`: Discord application public key used to verify incoming signatures
- `DISCORD_APPLICATION_ID`: Discord application ID used for interaction followups and command sync
- `DISCORD_BOT_TOKEN`: Bot token used by `npm run discord:sync`
- `DISCORD_GUILD_ID`: Guild ID where the `/ai` command should be registered

### Bedrock

- `AWS_REGION`: AWS region hosting the Bedrock model
- `AWS_ACCESS_KEY_ID`: AWS access key for SigV4 auth
- `AWS_SECRET_ACCESS_KEY`: AWS secret key for SigV4 auth
- `AWS_SESSION_TOKEN`: Optional temporary session token
- `BEDROCK_MODEL_ID`: Anthropic Bedrock model ID, for example `anthropic.claude-3-7-sonnet-20250219-v1:0`

### Optional tuning

- `AI_SYSTEM_PROMPT`: Override the default Discord-oriented system prompt
- `AI_MAX_OUTPUT_TOKENS`: Override the default max output token count (`512`)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Add your env vars.

3. Register the slash command into your target guild:

   ```bash
   npm run discord:sync
   ```

4. Start the app:

   ```bash
   npm run dev
   ```

5. Expose your local server to Discord with a tunnel if you need to test live interaction callbacks locally.

## Discord setup

1. Create a Discord application and bot in the Discord developer portal.
2. Copy the application public key, application ID, bot token, and target guild ID into your env vars.
3. Point Discord's interactions endpoint at:

   ```text
   https://<your-domain>/api/discord/interactions
   ```

4. Run `npm run discord:sync` after any slash-command schema changes.

## Workflow notes

- The route handler only verifies the request, extracts the prompt, starts the workflow, and returns a deferred interaction response.
- The workflow calls Bedrock, edits the original Discord message, and sends followups when the LLM output is longer than 2000 characters.
- Transient Discord or Bedrock failures are retried inside Workflow steps.
- Fatal configuration errors are surfaced back into the deferred Discord response so the user sees a final result instead of a hanging loading state.

## Validation

Run the local checks with:

```bash
npm run lint
npm test
npm run build
```

## Deployment

- Deploy the project to Vercel.
- Add the same environment variables in the Vercel project settings.
- Configure Discord's interactions URL to the deployed `/api/discord/interactions` route.
- Re-run `npm run discord:sync` if you need to repoint the bot at a different guild.

## Reference docs

- [Discord receiving and responding](https://docs.discord.com/developers/interactions/receiving-and-responding)
- [Discord application commands](https://docs.discord.com/developers/interactions/application-commands)
- [Vercel Workflow](https://vercel.com/docs/workflow/)
- [Workflow DevKit for Next.js](https://useworkflow.dev/docs/getting-started/next)
- [Anthropic on Amazon Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-on-amazon-bedrock)
- [AI SDK Amazon Bedrock provider](https://ai-sdk.dev/providers/ai-sdk-providers/amazon-bedrock)
