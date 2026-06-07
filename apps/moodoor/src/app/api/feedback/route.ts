/**
 * POST /api/feedback — record the one-tap "did this feel like your memory?" signal
 * against a logged match query. Server-only write (match_queries has no public RLS).
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { matchQueryId?: string; feltRight?: boolean; matchId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.matchQueryId || typeof body.feltRight !== "boolean") {
    return NextResponse.json({ success: false, error: "matchQueryId and feltRight are required" }, { status: 400 });
  }

  let supabase;
  try {
    supabase = supabaseServer();
  } catch (err) {
    const message = err instanceof Error ? err.message : "supabase not configured";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const { error } = await supabase
    .from("match_queries")
    .update({ felt_right: body.feltRight, feedback_match_id: body.matchId ?? null })
    .eq("id", body.matchQueryId);

  if (error) {
    console.error("[/api/feedback]", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
