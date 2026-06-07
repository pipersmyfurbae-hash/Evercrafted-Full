# Moodoor

The curated-match consumer storefront for Evercrafted. A customer enters a memory;
Claude translates it into an **Emotional Vector Schema (EVS-1.0)** profile (emotion
only — never geometry); a deterministic matcher returns the 3–5 curated wreaths whose
EVS profiles resonate most. Each match shows an SVG blueprint preview that reveals the
full hero render, with purchase paths via Stripe.

> Cardinal rule: **AI interprets emotion; geometry is deterministic.** Claude never
> sees the library and never picks a winner.

## Stack

- Next.js (App Router, TypeScript) · `@supabase/supabase-js` · `stripe` · `@anthropic-ai/sdk`
- Supabase project `qybnmlqesnbmgxayhllf` — tables `library` (curated wreaths) and
  `match_queries` (analytics). Migration: `supabase/migrations/0001_library_and_match_queries.sql`.

## Setup

```bash
cd apps/moodoor
cp .env.local.example .env.local   # fill in the keys below
npm install
npm run dev                        # http://localhost:3000
```

Required env (`.env.local`):

| var | purpose |
| --- | --- |
| `ANTHROPIC_API_KEY` | EVS translation (server only) |
| `EVS_MODEL` | defaults to `claude-sonnet-4-6` |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public library reads |
| `SUPABASE_SERVICE_ROLE_KEY` | server-side library read + `match_queries` writes |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | checkout |
| `NEXT_PUBLIC_SITE_URL` | Stripe redirect base |

## Architecture

- `src/lib/composition.ts` — deterministic blueprint engine, **ported verbatim** from
  the legacy `server.js` (`FORMULA_ARCS` / `SLOT_TEMPLATES` / `ZS` / `BU` / `runSlotFill`).
- `src/lib/claude.ts` — `callClaude` / `parseJSON` / `sanitizeInput`, ported from `server.js`.
- `src/lib/evs.ts` — EVS-1.0 schema (11 continuous dims + categoricals, weights, validation).
- `src/lib/match.ts` — hard filters → weighted cosine (valence/nostalgia ×1.5) → top-5 with
  a formula-diversity cap (any formula ≤ 2 of 5). **In-app cosine**, not pgvector (library is
  small; dims are stored as numeric columns so pgvector is a purely additive migration later).
- API routes: `POST /api/evs` (memory → EVS), `POST /api/match` (EVS → matches + log),
  `POST /api/feedback`, `POST /api/checkout`, `POST /api/stripe/webhook`.
- Pages: `/` intake → `/matches` reveal → `/wreath/[slug]` hero + purchase.

## Data: migration + seed

```bash
# migration is in supabase/migrations/0001_*.sql (already applied to the live project)
node scripts/gen-seed.mjs > supabase/seed.sql   # regenerate seed from the engine
# apply supabase/seed.sql to the project (idempotent on slug)
```

The seed inserts 8 published wreaths spanning 6 formulas and 7 occasions (Crescent ×3 to
exercise the diversity cap). Hero images are the repo render PNGs under `public/seed/`.

## Verification

```bash
npm run build                                   # type-check + build all routes
node --import ./scripts/loader.mjs scripts/test-match.mjs   # matcher unit checks vs real data
```

End-to-end (with `.env.local` filled):

- `curl -X POST localhost:3000/api/evs -d '{"memory":"my grandmother'\''s garden in late autumn"}'`
  → 11 numeric dims in [0,1] + categoricals, **no coordinates**.
- Intake → matches → wreath → Stripe Checkout (test card `4242 4242 4242 4242`) → `/checkout/success`.
- `stripe listen --forward-to localhost:3000/api/stripe/webhook` to verify the signed webhook.
