const capabilityCards = [
  {
    title: "Serverless Discord ingress",
    body: "Discord hits a signed HTTP route in Next.js instead of a websocket gateway, which keeps the bot aligned with Vercel's serverless execution model.",
  },
  {
    title: "3-second interaction safety",
    body: "The `/ai` command immediately returns a deferred interaction response so Discord gets an acknowledgement before the LLM work begins.",
  },
  {
    title: "Durable AI completion",
    body: "A Vercel Workflow run calls Anthropic on Amazon Bedrock, then edits the original Discord response after the model finishes.",
  },
];

const setupSteps = [
  "Set the Discord application interaction URL to `/api/discord/interactions` on your deployment.",
  "Populate the Discord and AWS Bedrock environment variables from `.env.example`.",
  "Run `npm run discord:sync` to register the guild-scoped `/ai` command.",
  "Deploy to Vercel and confirm the Workflow run completes and patches the original Discord message.",
];

const envRows = [
  ["DISCORD_PUBLIC_KEY", "Verifies Discord's Ed25519 request signatures."],
  ["DISCORD_APPLICATION_ID", "Used for interaction followups and slash-command sync."],
  ["DISCORD_BOT_TOKEN", "Authorizes the command registration script."],
  ["DISCORD_GUILD_ID", "Restricts `/ai` registration to a single target guild."],
  ["AWS_REGION", "Bedrock region for Anthropic model execution."],
  ["AWS_ACCESS_KEY_ID", "AWS SigV4 access key for Bedrock."],
  ["AWS_SECRET_ACCESS_KEY", "AWS SigV4 secret for Bedrock."],
  ["AWS_SESSION_TOKEN", "Optional session token when using temporary AWS creds."],
  ["BEDROCK_MODEL_ID", "Anthropic model ID, such as `anthropic.claude-3-7-sonnet-20250219-v1:0`."],
  ["AI_SYSTEM_PROMPT", "Optional override for the default Discord-oriented system prompt."],
  ["AI_MAX_OUTPUT_TOKENS", "Optional token ceiling for the model response."],
];

const architectureSteps = [
  "Discord slash command request hits the signed Next.js route handler.",
  "The route validates the signature, extracts `prompt`, and returns a deferred interaction response.",
  "The route starts a Vercel Workflow run with the interaction token and prompt payload.",
  "The workflow calls Anthropic on Bedrock and chunks the final text if Discord needs followup messages.",
  "Discord receives the completed answer by editing `@original` and optionally sending followups.",
];

export default function Home() {
  return (
    <main className="min-h-screen">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-between px-6 py-10 sm:px-10 lg:px-16">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--muted)]">
            Discord Bot Blueprint
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Public replies
            </span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Guild scoped
            </span>
            <span className="rounded-full border border-[var(--border)] px-3 py-1">
              Bedrock + Workflow
            </span>
          </div>
        </div>

        <div className="grid gap-12 py-14 lg:grid-cols-[1.25fr_0.75fr] lg:items-end">
          <div className="space-y-8">
            <div className="space-y-5">
              <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
                Slash command to durable completion
              </p>
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.96] tracking-[-0.04em] text-[var(--foreground)] sm:text-6xl lg:text-7xl">
                Build a serverless Discord bot that answers `/ai` with Anthropic on Bedrock.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[var(--muted)] sm:text-xl">
                This app receives Discord interactions over HTTP, defers inside the
                3-second window, hands the prompt to Vercel Workflow, and posts the
                completed LLM reply back into the original channel.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <a className="primary-link" href="#setup">
                Review setup
              </a>
              <a className="secondary-link" href="#architecture">
                Inspect architecture
              </a>
            </div>
          </div>

          <div className="panel space-y-5">
            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--muted)]">
                Example interaction
              </p>
              <div className="rounded-[1.35rem] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <p className="font-mono text-sm text-[var(--accent-strong)]">
                  /ai prompt:&quot;Summarize why deferred interactions matter for serverless bots.&quot;
                </p>
              </div>
            </div>
            <div className="rounded-[1.35rem] border border-[var(--border)] bg-white/90 p-5 shadow-[0_18px_45px_rgba(16,34,44,0.08)]">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--muted)]">
                Bot reply
              </p>
              <p className="mt-3 text-base leading-7 text-[var(--foreground)]">
                Deferred interactions let the bot acknowledge Discord immediately, then
                finish the Bedrock call in Workflow without missing the platform&apos;s
                response deadline.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-3">
              <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                No gateway
              </div>
              <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                No streaming
              </div>
              <div className="rounded-[1rem] border border-[var(--border)] bg-[var(--surface)] p-4">
                No persistence
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-6 pb-16 sm:px-10 lg:px-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {capabilityCards.map((card) => (
            <article key={card.title} className="panel h-full space-y-4">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
                Capability
              </p>
              <h2 className="text-2xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
                {card.title}
              </h2>
              <p className="text-base leading-7 text-[var(--muted)]">{card.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        id="architecture"
        className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-16 sm:px-10 lg:grid-cols-[0.9fr_1.1fr] lg:px-16"
      >
        <div className="space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
            Architecture
          </p>
          <h2 className="text-4xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
            HTTP in, durable workflow out.
          </h2>
          <p className="max-w-xl text-lg leading-8 text-[var(--muted)]">
            The bot treats Discord as a signed webhook source. The Next.js route only
            verifies, defers, and starts work. The Workflow owns the expensive AI call
            and the final response writeback.
          </p>
        </div>

        <ol className="panel grid gap-4">
          {architectureSteps.map((step, index) => (
            <li
              key={step}
              className="flex items-start gap-4 rounded-[1.15rem] border border-[var(--border)] bg-white/80 p-4"
            >
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-[var(--accent-ink)]">
                {index + 1}
              </span>
              <p className="text-base leading-7 text-[var(--foreground)]">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section
        id="setup"
        className="mx-auto grid w-full max-w-7xl gap-8 px-6 pb-20 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:px-16"
      >
        <div className="panel space-y-5">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
            Setup checklist
          </p>
          <ol className="space-y-4">
            {setupSteps.map((step, index) => (
              <li key={step} className="flex gap-4">
                <span className="text-sm font-semibold text-[var(--accent)]">
                  0{index + 1}
                </span>
                <p className="text-base leading-7 text-[var(--foreground)]">{step}</p>
              </li>
            ))}
          </ol>
          <div className="rounded-[1.15rem] border border-dashed border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="font-mono text-sm leading-7 text-[var(--foreground)]">
              npm install
              <br />
              npm run discord:sync
              <br />
              npm run dev
            </p>
          </div>
        </div>

        <div className="panel space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-medium uppercase tracking-[0.28em] text-[var(--accent)]">
              Environment contract
            </p>
            <p className="text-base leading-7 text-[var(--muted)]">
              Secrets stay in environment variables. The UI documents the contract but
              never renders actual secret values.
            </p>
          </div>

          <div className="overflow-hidden rounded-[1.35rem] border border-[var(--border)]">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-[var(--surface-strong)] text-xs uppercase tracking-[0.24em] text-[var(--muted)]">
                  <th className="px-4 py-4 font-medium">Variable</th>
                  <th className="px-4 py-4 font-medium">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {envRows.map(([key, purpose]) => (
                  <tr key={key} className="border-t border-[var(--border)] align-top">
                    <td className="px-4 py-4 font-mono text-sm text-[var(--foreground)]">
                      {key}
                    </td>
                    <td className="px-4 py-4 text-sm leading-7 text-[var(--muted)]">
                      {purpose}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </main>
  );
}
