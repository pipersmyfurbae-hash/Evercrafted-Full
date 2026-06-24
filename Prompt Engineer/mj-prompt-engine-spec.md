# Developer Spec — Evercrafted Prompt Engine

**App:** Prompt Engine  
**Tier:** Atelier (core AI feature); Build mode available Bloom+  
**Version:** 1.0  

---

## 1. What This App Does

Prompt Engine is an AI-powered Midjourney V7 prompt builder and debugger. Users describe an image they want to generate, set parameters (aspect ratio, stylize level, version), and receive a production-ready prompt they can paste directly into Midjourney. The app also scores the generated prompt across 7 quality dimensions and provides iteration guidance if the output doesn't match intent.

A secondary mode lets users paste a failing prompt, describe what's wrong, and receive a failure-mode diagnosis and rewritten fix.

---

## 2. User Flow

1. User lands on app — auth check via Supabase session
2. Tier resolved from `profiles.tier` — gates applied to UI
3. User selects mode: Build / Debug / Score / Batch
4. User enters description (Build) or failing prompt (Debug)
5. User sets parameters: version, AR, style, stylize, quality, genre
6. User clicks "Generate" → POST `/api/claude` with session token
7. Server verifies auth → tier check → calls Anthropic API
8. Response parsed from JSON → rendered in output cards
9. 7-dim score displayed as visual grid with color-coded bars
10. Full prompt available for one-click copy
11. Usage logged to `prompt_history` table
12. Session history available in History tab (Craft+)

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| Build New Prompt | ✓ | ✓ | ✓ | ✓ |
| Parameter controls (AR, style, etc.) | ✓ | ✓ | ✓ | ✓ |
| Debug / Iterate mode | — | ✓ | ✓ | ✓ |
| 7-Dimension Score | — | — | ✓ | ✓ |
| Iteration notes | — | — | ✓ | ✓ |
| Prompt history (session) | — | ✓ | ✓ | ✓ |
| Prompt history (persistent, DB) | — | — | ✓ | ✓ |
| Batch variations (3–5 prompts) | — | — | — | ✓ |
| sref / oref URL inputs | — | — | ✓ | ✓ |

---

## 4. AI Integration Details

### Build mode
- **Required tier:** Bloom
- **Model:** claude-sonnet-4-20250514
- **Max tokens:** 1500
- **System prompt:** See `lib/prompts.ts → MJ_BUILD_SYSTEM_PROMPT`
- **Input format:** `Image description: [brief]\n\nParameter block to use: [params]`
- **Output format:** JSON with keys: `paste_prompt`, `machine_breakdown`, `scores` (7 dims), `score_notes`, `gaps`, `iteration_notes`

### Debug mode
- **Required tier:** Craft
- **Model:** claude-sonnet-4-20250514
- **Max tokens:** 1200
- **System prompt:** See `lib/prompts.ts → MJ_DEBUG_SYSTEM_PROMPT`
- **Input format:** `Failing prompt:\n[prompt]\n\nProblem description:\n[desc]`
- **Output format:** JSON with keys: `failure_modes`, `root_cause`, `fixed_prompt`, `changes_made`

### Score mode (standalone)
- **Required tier:** Studio
- Same model/token budget as Build
- Input: existing prompt text only
- Output: `scores`, `score_notes`, `gaps`, `priority_fix`

### Batch mode
- **Required tier:** Atelier
- Generates 3–5 variations in a single call
- Output: array of `{ label, paste_prompt, scores }` objects

---

## 5. Data Model

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | FK to auth.users |
| tier | text | enum: bloom/craft/studio/atelier |
| stripe_customer_id | text | nullable |
| stripe_subscription_id | text | nullable |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### `prompt_history`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to profiles |
| mode | text | build/debug/score/batch |
| brief | text | user's input description |
| paste_prompt | text | generated prompt output |
| scores | jsonb | 7-dim score object |
| input_tokens | int | for usage tracking |
| output_tokens | int | for usage tracking |
| created_at | timestamptz | auto |

**RLS policies:** Users can only read/write their own rows.

---

## 6. API Routes

| Route | Method | Auth Required | Tier Gate | Description |
|-------|--------|--------------|-----------|-------------|
| `/api/claude` | POST | Yes (Bearer) | Per-mode | Proxies to Anthropic with tier verification |
| `/api/stripe/webhook` | POST | Stripe sig | — | Updates profile.tier on subscription change |
| `/api/stripe/checkout` | POST | Yes | — | Creates Stripe checkout session |

### Stripe webhook handler (key logic)
```typescript
// On checkout.session.completed or customer.subscription.updated:
const tier = getTierFromStripePrice(event.data.object.items[0].price.id);
await supabase.from('profiles')
  .update({ tier, stripe_subscription_id: subscriptionId })
  .eq('stripe_customer_id', customerId);
```

---

## 7. Component Map

| Component | Renders | Consumes |
|-----------|---------|----------|
| `PromptBuilder` | Input zone + param controls | `callPromptEngine()`, `useTier()` |
| `PromptDebugger` | Failing prompt + failure desc | `callPromptEngine()`, `useTier()` |
| `ScoreGrid` | 7-dim visual score bars | Score JSON from API response |
| `PromptHistory` | Session + DB history list | `prompt_history` table via Supabase |
| `TierGate` | Blur overlay + upgrade CTA | `useTier()`, `canAccess()` |
| `ParamControls` | AR / version / style selects | Passed down as props to builder |

---

## 8. Deployment Checklist

### Supabase
- [ ] Create project
- [ ] Run `001_init.sql` migration
- [ ] Enable Email auth (or preferred provider)
- [ ] Copy `SUPABASE_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` to `.env.local`

### Stripe
- [ ] Create product: Evercrafted Subscription
- [ ] Create 4 prices: Bloom / Craft / Studio / Atelier (monthly)
- [ ] Copy price IDs to `.env.local`
- [ ] Set up webhook endpoint → `/api/stripe/webhook`
- [ ] Copy `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### Anthropic
- [ ] Create API key (server-side only)
- [ ] Add as `ANTHROPIC_API_KEY` in `.env.local` — NEVER `NEXT_PUBLIC_`

### Vercel
- [ ] Push repo
- [ ] Add all env vars from `.env.local.example`
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Deploy

### Post-deploy tests
- [ ] Signup → profile auto-created with `tier: bloom`
- [ ] Build mode works at Bloom tier
- [ ] Debug mode blocked at Bloom, available at Craft
- [ ] Score mode blocked at Craft, available at Studio
- [ ] Stripe checkout updates `profiles.tier` correctly
- [ ] `ANTHROPIC_API_KEY` is NOT exposed in browser network tab

---

## 9. Known Limitations & Future Work

**V1 limitations:**
- No persistent prompt history for Bloom tier (session-only)
- Batch mode output not individually copyable per variation
- No image upload for sref/oref (URL-only input)
- Score mode doesn't yet analyze actual MJ output images — scores are prompt-quality estimates

**Planned V2 features:**
- Image upload → oref/sref extraction
- Side-by-side prompt comparison (A/B)
- Prompt templates library (by genre/season)
- MJ output image scoring via Vision API
- Prompt performance tracking (user rates actual MJ outputs → feeds back into scoring model)
- Team/agency accounts with shared prompt library
