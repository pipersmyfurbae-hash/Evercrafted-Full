/**
 * POST /api/stripe/webhook — verify Stripe events and mark fulfillment.
 * Phase 1 logs the completed checkout (signature-verified). Order/fulfillment
 * tables are a later phase; for now this proves the webhook + signature path.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return NextResponse.json({ error: "stripe webhook not configured" }, { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return NextResponse.json({ error: "missing stripe-signature" }, { status: 400 });

  const stripe = new Stripe(stripeKey);
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "signature verification failed";
    console.error("[/api/stripe/webhook] verify", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("[/api/stripe/webhook] checkout complete", session.metadata?.slug, session.metadata?.path);
    // TODO (later phase): write an orders row / trigger fulfillment + digital delivery.
  }

  return NextResponse.json({ received: true });
}
