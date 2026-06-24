import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// app/api/stripe/webhook/route.ts
// Handles Stripe subscription events and updates user tier in Supabase.

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10",
});

// Maps Stripe price IDs to Evercrafted tiers
const PRICE_TO_TIER: Record<string, string> = {
  [process.env.STRIPE_PRICE_BLOOM!]:   "bloom",
  [process.env.STRIPE_PRICE_CRAFT!]:   "craft",
  [process.env.STRIPE_PRICE_STUDIO!]:  "studio",
  [process.env.STRIPE_PRICE_ATELIER!]: "atelier",
};

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id;
      const newTier = PRICE_TO_TIER[priceId] ?? "bloom";
      const customerId = sub.customer as string;

      await supabase
        .from("profiles")
        .update({ tier: newTier })
        .eq("stripe_customer_id", customerId);

      console.log(`[stripe/webhook] Tier updated to ${newTier} for customer ${customerId}`);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = sub.customer as string;

      // Downgrade to bloom on cancellation
      await supabase
        .from("profiles")
        .update({ tier: "bloom" })
        .eq("stripe_customer_id", customerId);

      console.log(`[stripe/webhook] Subscription cancelled — downgraded to bloom for ${customerId}`);
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession;
      const customerId = session.customer as string;
      const userId = session.metadata?.supabase_user_id;

      if (userId && customerId) {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: customerId })
          .eq("id", userId);
      }
      break;
    }

    default:
      // Unhandled event type — log and ignore
      console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
