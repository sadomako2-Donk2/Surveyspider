import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// The one place Phase 2 talks to Claude. Prompts are built on the server by each feature (see prompts.ts),
// so the browser can never send its own instructions or read data it isn't allowed to see.

export const MODEL = "claude-opus-5-5";
export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
export const aiLimitPerHour = () => Number(process.env.AI_REQUESTS_PER_HOUR) || 40;

export type Effort = "low" | "medium" | "high";
export type Turn = { role: "user" | "assistant"; content: string };

export class AiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

let cached: { key: string; base: string | undefined; client: Anthropic } | null = null;
function client() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new AiError(503, "ai_disabled", "AI is not set up on this server yet.");
  const base = process.env.ANTHROPIC_BASE_URL || undefined; // tests point this at a fake server
  if (!cached || cached.key !== key || cached.base !== base)
    cached = { key, base, client: new Anthropic({ apiKey: key, baseURL: base, maxRetries: 2 }) };
  return cached.client;
}

const SYSTEM =
  "You are the AI assistant inside Afrimetrica, a research methods and analytics organisation. " +
  "Follow the instructions in the user's message exactly. Never invent data, figures or quotes.";

/** Sends one request and returns the text. Throws AiError with a message that can be shown to people. */
export async function askClaude(opts: {
  messages: Turn[];
  effort: Effort;
  json?: boolean;
  maxTokens?: number;
}): Promise<{ text: string; truncated: boolean }> {
  const c = client();
  const params = {
    model: MODEL,
    max_tokens: opts.maxTokens ?? 16000,
    output_config: { effort: opts.effort },
    system: SYSTEM + (opts.json ? " Reply with only valid JSON and no other text." : ""),
    messages: opts.messages,
  };
  let msg;
  try {
    try {
      // Server-side refusal fallback is on by default; if this account rejects it, retry once without.
      msg = await c.beta.messages
        .stream({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
        .finalMessage();
    } catch (e) {
      if (e instanceof Anthropic.BadRequestError && /fallback/i.test(String(e.message)))
        msg = await c.messages.stream(params).finalMessage();
      else throw e;
    }
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError)
      throw new AiError(429, "rate_limited", "The AI service is busy. Try again shortly.");
    if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError)
      throw new AiError(
        503,
        "ai_disabled",
        "The server's AI key was not accepted. An administrator needs to check it.",
      );
    if (e instanceof Anthropic.BadRequestError)
      throw new AiError(400, "invalid_request", "The AI request was not accepted.");
    console.error("AI error:", e);
    throw new AiError(502, "upstream_error", "The AI service could not be reached. Try again shortly.");
  }
  if (msg.stop_reason === "refusal") throw new AiError(422, "refused", "Claude declined this request.");
  const blocks: { type: string; text?: string }[] = msg.content;
  const text = blocks
    .map((b) => (b.type === "text" ? (b.text ?? "") : ""))
    .join("")
    .trim();
  if (!text) throw new AiError(502, "empty", "No answer was produced. Try again.");
  return { text, truncated: msg.stop_reason === "max_tokens" };
}

/** Claude is asked for JSON only, but tolerate a code fence or a sentence around it. */
export function parseJsonLoose(text: string): unknown {
  const tries = [text];
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) tries.push(fence[1]);
  const a = text.search(/[[{]/),
    b = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (a >= 0 && b > a) tries.push(text.slice(a, b + 1));
  for (const t of tries)
    try {
      return JSON.parse(t);
    } catch {}
  throw new AiError(502, "invalid_json", "The AI answer couldn't be read. Try again.");
}

export async function askClaudeJson(opts: { prompt: string; effort: Effort; maxTokens?: number }) {
  const { text } = await askClaude({
    messages: [{ role: "user", content: opts.prompt }],
    effort: opts.effort,
    json: true,
    maxTokens: opts.maxTokens,
  });
  return parseJsonLoose(text);
}
