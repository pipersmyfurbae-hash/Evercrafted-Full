// app/api/perception/route.ts
// Server-side proxy — verifies auth + tier before calling Claude Vision API
// ANTHROPIC_API_KEY is server-side only. Never expose client-side.

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { canAccess, TIER_RANK } from "@/lib/tier";
import { analyzeFlowerImage, generateBlueprintFromPerception } from "@/lib/claude";

export async function POST(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  // Auth check
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Tier check
  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", session.user.id)
    .single();

  const userTier = profile?.tier ?? "bloom";
  if (!canAccess(userTier, "studio")) {
    return NextResponse.json(
      { error: "Studio tier required for Flower Perception Engine" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const { action, imageBase64, mediaType, perceptionData } = body;

  try {
    if (action === "analyze") {
      if (!imageBase64 || !mediaType) {
        return NextResponse.json({ error: "imageBase64 and mediaType required" }, { status: 400 });
      }

      // Batch mode requires Atelier
      if (body.mode === "batch" && !canAccess(userTier, "atelier")) {
        return NextResponse.json({ error: "Atelier tier required for batch mode" }, { status: 403 });
      }

      const perceptionObject = await analyzeFlowerImage(imageBase64, mediaType);
      const perceptionId = "perc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 9).toUpperCase();

      // Persist to Supabase
      await supabase.from("flower_perceptions").insert({
        id: perceptionId,
        user_id: session.user.id,
        image_url: body.imageUrl ?? null,
        emotional_profile: perceptionObject.emotional_profile,
        visual_features: perceptionObject.visual_features,
        tags: perceptionObject.tags,
        confidence_score: perceptionObject.confidence_score,
      });

      return NextResponse.json({ perceptionId, perceptionObject });
    }

    if (action === "to-blueprint") {
      if (!perceptionData) {
        return NextResponse.json({ error: "perceptionData required" }, { status: 400 });
      }

      const blueprint = await generateBlueprintFromPerception(perceptionData, body.perceptionId);

      // Persist blueprint reference
      await supabase.from("perception_blueprints").insert({
        user_id: session.user.id,
        perception_id: body.perceptionId,
        blueprint_id: blueprint.blueprint_id,
        blueprint_data: blueprint,
      });

      return NextResponse.json({ blueprint });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  } catch (err: any) {
    console.error("[perception/route]", err);
    return NextResponse.json({ error: err.message ?? "Internal error" }, { status: 500 });
  }
}

// GET — retrieve a saved perception by ID
export async function GET(req: NextRequest) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { data, error } = await supabase
    .from("flower_perceptions")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
