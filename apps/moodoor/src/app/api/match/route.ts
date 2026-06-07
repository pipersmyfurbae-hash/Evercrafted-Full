/**
 * POST /api/match — given an EVS profile (+ optional constraints), return the
 * top-5 curated wreaths by weighted cosine, and log the query for analytics.
 *
 * Deterministic: Claude is not called here. The matcher is pure maths; this route
 * just loads the published library (service role), runs it, and logs the result.
 */
import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseServer } from "@/lib/supabase-server";
import { matchLibrary } from "@/lib/match";
import { EVS_DIMENSIONS, normalizeEvsProfile, type MatchConstraints } from "@/lib/evs";
import type { LibraryRow } from "@/lib/library";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { evs?: Record<string, unknown>; constraints?: MatchConstraints; memory?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.evs) {
    return NextResponse.json({ success: false, error: "evs profile is required" }, { status: 400 });
  }
  const profile = normalizeEvsProfile(body.evs);
  const constraints: MatchConstraints = body.constraints || {};

  let supabase;
  try {
    supabase = supabaseServer();
  } catch (err) {
    const message = err instanceof Error ? err.message : "supabase not configured";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const { data, error } = await supabase.from("library").select("*").eq("published", true);
  if (error) {
    console.error("[/api/match] library load", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 502 });
  }

  const rows = (data || []) as unknown as LibraryRow[];
  const matches = matchLibrary(profile, rows, constraints);

  // Log the query for the production-steering analytics loop. Store a hash of the
  // memory rather than the raw text (PII-light).
  const queryVector: Record<string, number> = {};
  for (const d of EVS_DIMENSIONS) queryVector[d] = profile[d];
  const returnedMatches = matches.map((m) => ({ library_id: m.row.id, score: m.score, formula: m.row.formula }));
  const topScore = matches.length ? matches[0].score : null;
  const memoryHash = body.memory ? createHash("sha256").update(String(body.memory)).digest("hex") : null;

  let matchQueryId: string | null = null;
  const { data: logged, error: logErr } = await supabase
    .from("match_queries")
    .insert({
      memory_text_hash: memoryHash,
      query_vector: queryVector,
      query_categoricals: {
        occasion: profile.occasion,
        bow: profile.bow,
        constraints,
      },
      returned_matches: returnedMatches,
      top_score: topScore,
    })
    .select("id")
    .single();
  if (logErr) console.error("[/api/match] log", logErr.message);
  else matchQueryId = (logged as { id: string }).id;

  // Return the public-facing fields for the reveal.
  const results = matches.map((m) => ({
    id: m.row.id,
    slug: m.row.slug,
    title: m.row.title,
    story_copy: m.row.story_copy,
    hero_image_url: m.row.hero_image_url,
    thumb_image_url: m.row.thumb_image_url,
    blueprint: m.row.blueprint,
    formula: m.row.formula,
    bow: m.row.bow,
    occasion: m.row.occasion,
    botanical_leads: m.row.botanical_leads,
    price_finished_cents: m.row.price_finished_cents,
    price_blueprint_cents: m.row.price_blueprint_cents,
    score: Number(m.score.toFixed(4)),
  }));

  return NextResponse.json({ success: true, matchQueryId, count: results.length, matches: results });
}
