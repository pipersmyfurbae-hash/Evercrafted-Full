import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// TIER_RANK — matches lib/tier.ts
const TIER_RANK: Record<string, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

// Which console modules require which tier
const MODULE_TIER_REQUIREMENTS: Record<string, string> = {
  // P1 — Bloom
  dashboard: "bloom",
  formula: "bloom",
  emotion: "bloom",
  // P2 — Craft
  blueprint: "craft",
  dna: "craft",
  placement: "craft",
  inventory: "craft",
  // P3–P4 — Studio
  abc: "studio",
  genome: "studio",
  output: "studio",
  api_center: "studio",
  schema: "studio",
  arch: "studio",
  analytics: "studio",
  library: "studio",
  pricing: "craft",
  tracker: "craft",
  // P5–P10 — Atelier (AI)
  memory_weaver: "atelier",
  design_drop: "atelier",
  blueprint_chat: "atelier",
  inventory_ai: "atelier",
  evaluator: "atelier",
  build_sheet: "atelier",
  launch_planner: "atelier",
  order_studio: "atelier",
  shopify: "atelier",
  integrations: "atelier",
};

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate user via Supabase session cookie
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    // 2. Fetch user's tier from profiles table
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier")
      .eq("id", user.id)
      .single();

    const userTier = profile?.tier ?? "bloom";
    const userTierRank = TIER_RANK[userTier] ?? 1;

    // 3. Parse request body
    const body = await req.json();
    const {
      module,        // which console module is calling (e.g. "memory_weaver")
      systemPrompt,  // system prompt from the module
      messages,      // message array [{ role, content }]
      maxTokens = 1024,
      stream = false,
    } = body;

    // 4. Check tier access for this module
    const requiredTier = MODULE_TIER_REQUIREMENTS[module] ?? "atelier";
    const requiredRank = TIER_RANK[requiredTier] ?? 4;

    if (userTierRank < requiredRank) {
      return NextResponse.json(
        {
          error: "tier_required",
          required: requiredTier,
          current: userTier,
          message: `This module requires ${requiredTier} tier or higher.`,
        },
        { status: 403 }
      );
    }

    // 5. Call Anthropic — ANTHROPIC_API_KEY never leaves server
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!,
    });

    if (stream) {
      // Streaming response for Memory Weaver, Build Sheet, etc.
      const stream = await anthropic.messages.stream({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });

      return new Response(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } else {
      // Standard JSON response for Design Drop, Evaluator, etc.
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: maxTokens,
        system: systemPrompt,
        messages,
      });

      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { type: "text"; text: string }).text)
        .join("\n");

      return NextResponse.json({ text });
    }
  } catch (err) {
    console.error("[/api/claude] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
