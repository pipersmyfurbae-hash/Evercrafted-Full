/**
 * POST /api/checkout — create a Stripe Checkout session for a library wreath.
 * Phase 1 supports the "finished" purchase path; "blueprint" and "kit" are wired
 * through the same shape for later phases. Prices are read server-side from the
 * library row (never trust client-sent amounts).
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabase-server";
import type { LibraryRow } from "@/lib/library";

export const runtime = "nodejs";

type Path = "finished" | "blueprint" | "kit";

const PRICE_COL: Record<Path, keyof LibraryRow> = {
  finished: "price_finished_cents",
  blueprint: "price_blueprint_cents",
  kit: "price_kit_cents",
};
const PURCHASABLE_COL: Record<Path, keyof LibraryRow> = {
  finished: "purchasable_finished",
  blueprint: "purchasable_blueprint",
  kit: "purchasable_kit",
};
const LABEL: Record<Path, string> = {
  finished: "Finished wreath",
  blueprint: "Digital blueprint",
  kit: "DIY kit",
};

export async function POST(req: Request) {
  let body: { slug?: string; path?: Path };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "invalid JSON body" }, { status: 400 });
  }

  const path: Path = body.path === "blueprint" || body.path === "kit" ? body.path : "finished";
  if (!body.slug) {
    return NextResponse.json({ success: false, error: "slug is required" }, { status: 400 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ success: false, error: "STRIPE_SECRET_KEY is not configured" }, { status: 500 });
  }

  let supabase;
  try {
    supabase = supabaseServer();
  } catch (err) {
    const message = err instanceof Error ? err.message : "supabase not configured";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("library")
    .select("*")
    .eq("slug", body.slug)
    .eq("published", true)
    .single();
  if (error || !data) {
    return NextResponse.json({ success: false, error: "wreath not found" }, { status: 404 });
  }
  const row = data as unknown as LibraryRow;

  if (!row[PURCHASABLE_COL[path]]) {
    return NextResponse.json({ success: false, error: `${LABEL[path]} not available for this wreath` }, { status: 400 });
  }
  const amount = row[PRICE_COL[path]] as number | null;
  if (!amount || amount <= 0) {
    return NextResponse.json({ success: false, error: "price not set" }, { status: 400 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amount,
            product_data: {
              name: `${row.title} — ${LABEL[path]}`,
              description: row.story_copy ?? undefined,
            },
          },
        },
      ],
      metadata: { slug: row.slug, library_id: row.id, path },
      success_url: `${site}/checkout/success?wreath=${row.slug}`,
      cancel_url: `${site}/checkout/cancel?wreath=${row.slug}`,
    });
    return NextResponse.json({ success: true, url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "stripe error";
    console.error("[/api/checkout]", message);
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
