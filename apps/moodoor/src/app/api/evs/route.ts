/**
 * POST /api/evs — translate a customer memory into an EVS-1.0 profile.
 *
 * Cardinal rule enforced here: Claude interprets EMOTION ONLY. It never sees the
 * library, never returns coordinates/angles/stem positions, and never picks a
 * product. Mirrors the legacy /api/scene contract: strict JSON, validate, retry once.
 */
import { NextResponse } from "next/server";
import { callClaude, parseJSON, sanitizeInput } from "@/lib/claude";
import {
  EVS_DIMENSIONS,
  EVS_DIMENSION_MEANINGS,
  OCCASIONS,
  BOW_OPTIONS,
  isValidEvsRaw,
  normalizeEvsProfile,
} from "@/lib/evs";
import { CANONICAL_FORMULAS } from "@/lib/composition";

export const runtime = "nodejs";

const SYSTEM =
  "You are Evercrafted's Emotional Vector engine. Return ONLY valid JSON. " +
  "No markdown, no backticks. Start with { end with }.";

function buildPrompt(memory: string, constraints: string): string {
  const dimLines = EVS_DIMENSIONS.map((d) => `  "${d}": <0.00-1.00>,  // ${EVS_DIMENSION_MEANINGS[d]}`).join("\n");
  return `A person has shared a memory or feeling. Translate it into an Emotional Vector Schema (EVS-1.0) profile that captures the EMOTIONAL TRUTH of the memory — not the literal objects in it.

MEMORY: "${memory}"
${constraints ? `STATED CONSTRAINTS: ${constraints}\n` : ""}
Technique: read the memory, then re-read it as if it were someone else's writing. Ask what the feeling actually IS underneath the words — a memory of peace often holds longing; a memory of joy often holds grief for what has passed. Score that true feeling.

CRITICAL RULES:
- You translate FEELING only. Do NOT output coordinates, angles, polar positions, stem counts, slot placements, or any geometry.
- Do NOT pick or name a specific product, design, or wreath.
- Every continuous dimension must be a number from 0.00 to 1.00.
- The four seasonal scores are INDEPENDENT (a memory can be 0.7 autumn and 0.3 winter at once).
- "formula" is only a soft HINT; leave it null if unsure — the matching system decides the final geometry.
- Set "occasion" to null unless the memory clearly implies one.

Return ONLY this JSON shape:
{
${dimLines}
  "occasion": one of ${JSON.stringify(OCCASIONS)} or null,
  "palette_family": "2-4 colour words from the feeling" or null,
  "formula": one of ${JSON.stringify(CANONICAL_FORMULAS)} or null,
  "bow": one of ${JSON.stringify(BOW_OPTIONS)} or null,
  "botanical_leads": ["2-3 botanical species that fit the feeling"]
}`;
}

export async function POST(req: Request) {
  let body: { memory?: unknown; constraints?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }

  const memory = sanitizeInput(body.memory);
  if (!memory) {
    return NextResponse.json({ success: false, error: "memory is required" }, { status: 400 });
  }
  const constraints = sanitizeInput(body.constraints);

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  const prompt = buildPrompt(memory, constraints);

  try {
    let raw: Record<string, unknown>;
    try {
      raw = parseJSON(await callClaude({ system: SYSTEM, prompt, maxTokens: 1024 }));
      if (!isValidEvsRaw(raw)) throw new Error("missing/invalid EVS dimensions");
    } catch {
      raw = parseJSON(await callClaude({ system: SYSTEM, prompt, maxTokens: 1024 }));
      if (!isValidEvsRaw(raw)) throw new Error("missing/invalid EVS dimensions after retry");
    }
    const evs = normalizeEvsProfile(raw);
    return NextResponse.json({ success: true, evs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    console.error("[/api/evs]", message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
