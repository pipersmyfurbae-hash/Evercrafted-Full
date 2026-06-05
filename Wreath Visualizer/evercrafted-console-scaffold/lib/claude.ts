// lib/claude.ts
// Typed client-side wrapper for all Evercrafted Console Claude API calls.
// All requests proxy through /api/claude — the real API key never touches the client.

import { Tier } from "./tier";

const API_ROUTE = "/api/claude";

interface ClaudeRequestBase {
  module: string;        // console module id, matched against MODULE_TIERS server-side
  systemPrompt: string;
  messages: { role: "user" | "assistant"; content: string }[];
  maxTokens?: number;
}

interface ClaudeStreamRequest extends ClaudeRequestBase {
  stream: true;
  onChunk: (text: string, delta: string) => void;
}

interface ClaudeJSONRequest extends ClaudeRequestBase {
  stream?: false;
}

type ClaudeRequest = ClaudeStreamRequest | ClaudeJSONRequest;

/**
 * Get auth token from localStorage (set by Supabase auth).
 * In production, use the Supabase client session directly.
 */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  // Supabase stores the session in localStorage under this key pattern
  const keys = Object.keys(localStorage).filter((k) =>
    k.startsWith("sb-") && k.endsWith("-auth-token")
  );
  if (!keys.length) return null;
  try {
    const session = JSON.parse(localStorage.getItem(keys[0]) || "{}");
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/**
 * Main Claude call — handles both streaming and JSON modes.
 * Returns full response text for JSON mode.
 * Calls onChunk progressively for stream mode.
 */
export async function callClaude(req: ClaudeRequest): Promise<string> {
  const token = getAuthToken();
  if (!token) throw new Error("Not authenticated");

  const response = await fetch(API_ROUTE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      module: req.module,
      systemPrompt: req.systemPrompt,
      messages: req.messages,
      maxTokens: req.maxTokens ?? 1024,
      stream: req.stream ?? false,
    }),
  });

  // Handle tier errors gracefully
  if (response.status === 403) {
    const err = await response.json();
    throw new TierError(err.required as Tier, err.current as Tier, err.message);
  }

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.status}`);
  }

  if (req.stream && "onChunk" in req) {
    // SSE streaming
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = decoder.decode(value).split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") break;
        try {
          const { text } = JSON.parse(data);
          fullText += text;
          req.onChunk(fullText, text);
        } catch { /* ignore parse errors */ }
      }
    }
    return fullText;
  } else {
    const data = await response.json();
    return data.text ?? "";
  }
}

/**
 * Convenience wrapper for JSON-response modules (Design Drop, Evaluator, etc.)
 * Strips markdown fences and parses JSON automatically.
 */
export async function callClaudeJSON<T = Record<string, unknown>>(
  req: ClaudeJSONRequest
): Promise<T> {
  const text = await callClaude(req);
  const clean = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(clean) as T;
}

/**
 * Custom error thrown when user's tier is insufficient.
 * Caught by TierGate component to show upgrade prompt.
 */
export class TierError extends Error {
  constructor(
    public readonly required: Tier,
    public readonly current: Tier,
    message: string
  ) {
    super(message);
    this.name = "TierError";
  }
}

// ─────────────────────────────────────────
// PRE-BUILT SYSTEM PROMPTS FOR EACH MODULE
// (baked in here so they never need to be
//  shipped in client component props)
// ─────────────────────────────────────────

export const SYSTEM_PROMPTS = {
  memory_weaver: (season: string, formulas: string) =>
    `You are the Evercrafted Memory Weaver. Rules:
1. Use ONLY the client's exact words. Do not invent details.
2. Season is MANDATORY: ${season}. Never override this.
3. Translate specific flowers, colors, and places directly into the design.
4. 2-3 sentences max. Then: FORMULA: [one of: ${formulas}]`,

  design_drop: (formula: string, season: string) =>
    `You are Evercrafted's luxury content writer.
Season: ${season}. Formula: ${formula}.
Rules: editorial voice, gender-neutral language, season must be visually anchored in the MJ prompt.
Respond with valid JSON only: {shopify_title, shopify_desc, instagram, mj_prompt, build_summary}`,

  blueprint_chat: (formula: string) =>
    `You are the Evercrafted Blueprint AI assistant — a master florist and design expert.
Current blueprint formula: ${formula || "not set"}.
Expert, warm, concise responses about wreath design and blueprint refinement. 2-3 sentences max.`,

  inventory_ai: (inventoryContext: string, formulas: string) =>
    `You are the Evercrafted Inventory AI.
Inventory:\n${inventoryContext}
Formulas: ${formulas}
Direct, expert, practical. 3 sentences max.`,

  evaluator: (formula: string, emotion: string, style: string) =>
    `You are the Evercrafted Blueprint Evaluator.
Score and critique: ${formula} + ${emotion} + ${style} against EC_CANON_V1.
2-3 sentence expert brand critique. Be direct.`,

  build_sheet: (formula: string, size: string, skill: string, emotion: string) =>
    `You are an Evercrafted production expert.
Write a concise numbered build guide (6-8 steps) for a ${size} ${formula} wreath,
${emotion} style, ${skill} skill level. Practical and clear.`,

  launch_planner: (dropName: string, formula: string) =>
    `You are an Evercrafted drop launch strategist.
Drop: "${dropName}", Formula: ${formula}.
Create a 4-week pre-launch plan with Shopify, Instagram, and email tasks. Numbered format.`,

  order_studio: (season: string) =>
    `You are Evercrafted's order system. Season: ${season}.
Write a warm 3-sentence client brief: recommended formula, palette note, lead time.
Gender-neutral. No filler.`,

  shopify: (formula: string, emotion: string, size: string, season: string) =>
    `You are Evercrafted's Shopify product writer. Season: ${season}.
Write: TITLE, SHORT_DESCRIPTION (1 sentence), LONG_DESCRIPTION (3 paragraphs), TAGS (10).
Premium, editorial, gender-neutral. Season must be reflected in all copy.`,

  email_draft: () =>
    `You are Evercrafted's client communications manager.
Write a warm, professional 2-paragraph client email. Gender-neutral. No filler.`,
} as const;
