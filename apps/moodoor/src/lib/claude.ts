/**
 * Claude helpers — ported from the legacy Express `server.js` (sanitizeInput
 * L12-32, callClaude L195-204, parseJSON L206-209). Same regexes, same
 * fence-stripping, same call shape. Server-only: the Anthropic key never leaves
 * the route runtime.
 */
import Anthropic from "@anthropic-ai/sdk";

// Current Sonnet. The legacy server.js still uses claude-sonnet-4-20250514
// (being retired); new Moodoor code uses claude-sonnet-4-6.
export const EVS_MODEL = process.env.EVS_MODEL || "claude-sonnet-4-6";

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

// ── Input Sanitization (exact from server.js) ──────────────────────────────────
export function sanitizeInput(text: unknown): string {
  if (!text || typeof text !== "string") return "";
  return text
    // Strip HTML tags
    .replace(/<[^>]*>/g, "")
    // Strip script injections
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    // Strip prompt injection attempts
    .replace(/ignore previous instructions/gi, "")
    .replace(/system prompt/gi, "")
    .replace(/\[INST\]/gi, "")
    .replace(/<<SYS>>/gi, "")
    // Strip SQL injection patterns
    .replace(/('|"|;|--|\bDROP\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/gi, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Limit length
    .slice(0, 2000)
    .trim();
}

// ── Claude helper (exact shape from server.js) ─────────────────────────────────
export async function callClaude({
  system,
  prompt,
  maxTokens,
}: {
  system?: string;
  prompt: string;
  maxTokens: number;
}): Promise<string> {
  const params: Anthropic.MessageCreateParamsNonStreaming = {
    model: EVS_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (system) params.system = system;
  const response = await client().messages.create(params);
  const block = response.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export function parseJSON<T = unknown>(text: string): T {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}
