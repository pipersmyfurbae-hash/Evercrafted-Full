# Deploying Moodoor to Vercel

Moodoor lives in `apps/moodoor` inside this repo. Deploy that subdirectory as its
own Vercel project (the repo root is the legacy Express app — don't deploy that).

## One-time setup

1. **vercel.com → Add New → Project** → import `pipersmyfurbae-hash/Evercrafted-Full`.
2. **Root Directory: `apps/moodoor`** (this is the important one — it points Vercel at
   the Next.js app, not the legacy `server.js`). Framework auto-detects as Next.js.
3. Add the environment variables below.
4. **Deploy.** You'll get a URL like `https://moodoor-xxxx.vercel.app`.

## Environment variables

Minimum to try the full flow (intake → match → checkout):

| Name | Value | Secret? |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | from console.anthropic.com | secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role | secret |
| `STRIPE_SECRET_KEY` | Stripe (Test mode) → API keys → Secret key (`sk_test_…`) | secret |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://qybnmlqesnbmgxayhllf.supabase.co` | public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_ujWoFN8yhSJtAuSm2t4TiA_vcVtzKJF` | public |

Optional (add later):

| Name | Why |
| --- | --- |
| `EVS_MODEL` | override the Claude model (defaults to `claude-sonnet-4-6`) |
| `NEXT_PUBLIC_SITE_URL` | only if you want to force a canonical domain for Stripe redirects; otherwise the app auto-detects the live domain |
| `STRIPE_WEBHOOK_SECRET` | needed only for the `/api/stripe/webhook` fulfillment hook, not to complete checkout |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | reserved for client-side Stripe; not used by the current redirect checkout |

## After it's live

- Open the URL, share a memory, confirm you get 3–5 matches and can click into a wreath.
- Test checkout with Stripe test card `4242 4242 4242 4242`, any future expiry/CVC.
- To enable order/webhook handling later: Stripe → Developers → Webhooks → add endpoint
  `https://<your-domain>/api/stripe/webhook`, copy its `whsec_…` into `STRIPE_WEBHOOK_SECRET`.

## Notes

- The database (Supabase project `qybnmlqesnbmgxayhllf`) already has the `library` table,
  RLS policies, and 8 seeded wreaths — no DB steps needed at deploy time.
- Every push to the branch redeploys automatically once the Vercel project is connected.
