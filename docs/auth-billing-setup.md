# Auth + Billing — go-live setup

The login → account → Stripe-checkout spine is wired. Accounts and entitlements
persist in **Supabase** (never localStorage — only the session token lives
client-side, which is the credential itself). To switch billing on, set these
env vars on the server (Vercel project settings):

## Required env vars

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Already in use for the waitlist. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server reads `profiles.tier` + `owned_packs`, and the webhook writes grants. |
| `STRIPE_SECRET_KEY` | Activates `/api/checkout` + `/api/stripe/webhook`. Until set, both return 503 and the account page shows "Billing isn't switched on yet." |
| `STRIPE_WEBHOOK_SECRET` | From the Stripe webhook endpoint; verifies `/api/stripe/webhook` signatures. |
| `STRIPE_PRICE_OPS` | Stripe Price ID (recurring/monthly) for the **ops** pack ($12/mo). |
| `STRIPE_PRICE_SELL` | Price ID for **sell** ($15/mo). |
| `STRIPE_PRICE_GROW` | Price ID for **grow** ($19/mo). |
| `STRIPE_PRICE_PRO` | Price ID for **pro** tools ($8/mo). |
| `PUBLIC_URL` *(optional)* | Fallback origin for Stripe success/cancel URLs if the request has no `Origin` header. |

The publishable Supabase key + URL are baked into `evercrafted-auth.js` (safe to
ship — it's the anon/publishable key, RLS-guarded).

## Supabase tables (already created)

- `profiles` — `id` (= auth user), `tier` (default `bloom`), auto-created by a
  trigger on signup.
- `owned_packs` — `user_id`, `pack`, `source` (`stripe` | `dev`), unique on
  `(user_id, pack)`. RLS lets a user read their own rows; the service role
  (server) writes them.

## Stripe wiring

1. Create 4 monthly recurring Products/Prices; put the Price IDs in the env vars above.
2. Add a webhook endpoint → `https://<host>/api/stripe/webhook`, subscribed to
   `checkout.session.completed` and `customer.subscription.deleted`.
3. Put its signing secret in `STRIPE_WEBHOOK_SECRET`.

Flow: account page → `POST /api/checkout` (Bearer session) → Stripe Checkout →
on success Stripe fires `checkout.session.completed` → webhook upserts
`owned_packs` → `/api/entitlements` now returns the pack → the app gate unlocks.

## Testing before Stripe (dev grant)

`POST /api/dev-grant` with header `x-admin-token: $ADMIN_TOKEN` and body
`{ "user_id": "...", "pack": "sell" }` grants a pack without payment, so the
gate/account flow can be exercised end to end. Set `ADMIN_TOKEN` to enable it.
