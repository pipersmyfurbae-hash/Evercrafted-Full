# WreathStudio — Product Requirements Document
**Version:** 1.0  
**Status:** Ready for Development  
**Product:** WreathStudio — AI-Powered Wreath Prompt Composer  
**Owner:** Evercrafted Platform

---

## 1. Product Overview

### What It Does
WreathStudio is a SaaS tool that converts structured wreath blueprint inputs — shape, season, florals, emotion, prompt target — into production-ready Midjourney prompt strings. Users configure their design via a form-driven interface rather than hand-writing prompts, then copy a fully parameterized Midjourney string to their clipboard in under 60 seconds.

### The Problem It Solves
Wreath designers and Etsy sellers lose 20–40 minutes per product session crafting Midjourney prompts from scratch. They either under-specify (generic outputs that don't match their designs) or over-specify (bloated strings with conflicting instructions). WreathStudio eliminates both failure modes through structured inputs and a deterministic prompt assembly engine.

### Who It's For
- **Primary:** Faux floral wreath sellers on Etsy and Shopify (20–1,000+ listings)
- **Secondary:** Floral studio owners producing seasonal collections
- **Tertiary:** Workshop instructors and wreath design educators

---

## 2. Core User Flow

```
1. Landing page → "Start free trial" → App shell loads
2. Configure Blueprint Structure: shape, season, focal flowers, greenery, ribbon, accents
3. Configure Emotion + Target: mood, palette, prompt target, door color, aspect ratio
4. Set Midjourney Controls: fidelity slider, --stylize, --chaos, --sw
5. Click "Generate prompt" → prompt assembles and renders in output panel
6. Copy to clipboard → paste into Midjourney
7. Optional: Remix variant | AI Enhance | Save to history
8. Prompt history available for recall and reuse
```

---

## 3. Tier Feature Matrix

| Feature | Bloom (Free) | Craft ($19/mo) | Studio ($49/mo) | Atelier ($99/mo) |
|---|---|---|---|---|
| Prompt generation | 25/mo | 300/mo | Unlimited | Unlimited |
| Prompt targets | 3 (Hero, Studio, Lifestyle) | All 6 | All 6 | All 6 |
| Fidelity control | Basic (0/50/100) | Full slider | Full slider | Full slider |
| --stylize control | ✓ | ✓ | ✓ | ✓ |
| --chaos control | — | ✓ | ✓ | ✓ |
| --sw (style weight) | — | ✓ | ✓ | ✓ |
| Remix variant | — | ✓ | ✓ | ✓ |
| AI enhance | — | ✓ (10/mo) | ✓ (50/mo) | ✓ Unlimited |
| Prompt history | 5 saved | Unlimited | Unlimited | Unlimited |
| Blueprint library | — | — | ✓ | ✓ |
| Lighting profiles | — | ✓ | ✓ | ✓ |
| Style presets | — | — | ✓ | ✓ |
| Batch generation | — | — | ✓ (10/batch) | ✓ (50/batch) |
| Team seats | 1 | 1 | 3 | 10 |
| Priority support | — | — | ✓ | ✓ |
| White-label export | — | — | — | ✓ |

---

## 4. Prompt Assembly Engine

### 4.1 Input Fields

**Blueprint Structure**
- `shape` (chip select): full round, asymmetrical, oval, grapevine, open minimal
- `season` (chip select): spring, summer, fall, winter
- `focal` (text): free-entry, e.g. "ivory peonies, dusty blue hydrangeas"
- `greenery` (text): free-entry, e.g. "soft sage eucalyptus"
- `ribbon` (text): free-entry, e.g. "wide navy velvet ribbon, long trailing tails"
- `accents` (text, optional): free-entry, e.g. "pinecones, brass bells"

**Emotion + Target**
- `emotion` (chip select): calm and welcoming | joyful and celebratory | cozy and inviting | dramatic and bold | romantic and soft | fresh and airy
- `palette` (text): free-entry
- `target` (chip select): hero | studio | lifestyle | closeup | editorial | experimental
- `door` (chip select): dark navy | classic white | charcoal | forest green | warm gray
- `ar` (chip select): 1:1 | 2:3 | 3:4 | 4:5 | 16:9

**Midjourney Controls**
- `fidelity` (range 0–100, default 75): maps to fidelity language in prompt
- `stylize` (range 50–750, step 10, default 180): maps to `--s`
- `chaos` (range 0–50, step 1, default 5): maps to `--chaos`
- `sw` (range 0–300, step 10, default 100): maps to `--sw`

### 4.2 Emotion-to-Lighting Map

```js
const EMOTION_MAP = {
  'calm and welcoming':      'soft, serene, gentle, low contrast',
  'joyful and celebratory':  'bright, lively, cheerful, vivid',
  'cozy and inviting':       'warm, inviting, soft amber shadows',
  'dramatic and bold':       'high contrast, bold focal points, dramatic light and shadow',
  'romantic and soft':       'dreamy, delicate, rose-tinted diffused light',
  'fresh and airy':          'clean, crisp, open, breezy natural light'
}
```

### 4.3 Fidelity-to-Language Map

```js
fidelity > 70  → "must follow these exact material and structural details"
fidelity > 40  → "allow tasteful variations in secondary blooms and foliage"
fidelity ≤ 40  → "allow creative interpretation inspired by the color story and emotion"
```

### 4.4 Target-to-Template Map

**hero:** `a {shape} faux {season} floral wreath on a {door} front door, made of {focal} with {green} and {ribbon}{acc}{remix}, {fidelity_phrase}, styled as premium catalog product photography, {mood} mood, soft natural window light, straight-on angle, shallow depth of field, ultra-detailed, hyper-realistic, professional product photography`

**studio:** `a single {shape} faux {season} floral wreath on a neutral studio backdrop, composed of {focal}, {green}, {ribbon}{acc}{remix}, {fidelity_phrase}, clean minimalist e-commerce product photography, evenly lit, soft shadows, high-end commercial still life, hyper-realistic`

**lifestyle:** `a cozy front porch scene featuring a faux {season} wreath on a {door} front door, made of {focal}, {green}, {ribbon}{acc}{remix}, {fidelity_phrase}, {mood} atmosphere, warm inviting lighting, slight angle, shallow depth of field, realistic home decor photography`

**closeup:** `extreme close-up of a faux floral wreath section, showing {focal} and {green} with {ribbon}{remix}, focus on realistic petal texture and color gradients in a {palette} palette, soft diffused side light, macro still life photography, bokeh background, ultra sharp detail, photorealistic`

**editorial:** `editorial home decor photography of a {shape} faux {season} wreath on a {door} surface, made of {focal}, {green}, {ribbon}{acc}{remix}, {fidelity_phrase}, {palette} color story, {mood} mood, architectural photography lighting, magazine quality`

**experimental:** `concept art of a {emotion}-inspired faux floral wreath, abstract arrangement of {focal} and {palette} palette swirling around an invisible {shape} circle, {green} textures{remix}, dreamy atmosphere, painterly digital art, intricate detail`

### 4.5 Parameter Suffix Rules

- All targets except experimental append: `--sref {user_ref_url} --sw {sw} --ar {ar} --s {stylize} --chaos {chaos} --v 6.1 --style raw --q 1 --no text, watermark, logo, frame, people, hands`
- Experimental appends: `--ar {ar} --s {stylize} --v 6.1 --no frame, watermark, text`

---

## 5. Data Model

### 5.1 Supabase Tables

```sql
-- Users + profile
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id),
  email       TEXT NOT NULL,
  tier        TEXT NOT NULL DEFAULT 'bloom',
  prompt_count INT NOT NULL DEFAULT 0,
  prompt_reset TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Prompt history
CREATE TABLE prompt_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  label       TEXT NOT NULL,
  prompt_text TEXT NOT NULL,
  target      TEXT,
  season      TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Blueprint library (Studio+)
CREATE TABLE blueprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  inputs      JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Lighting profiles (Craft+)
CREATE TABLE lighting_profiles (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sref_url    TEXT NOT NULL,
  sw_default  INT DEFAULT 100,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe subscriptions
CREATE TABLE subscriptions (
  id                TEXT PRIMARY KEY,  -- Stripe subscription ID
  user_id           UUID REFERENCES profiles(id),
  tier              TEXT NOT NULL,
  status            TEXT NOT NULL,
  current_period_end TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
```

### 5.2 Row Level Security

```sql
ALTER TABLE prompt_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own history" ON prompt_history
  FOR ALL USING (auth.uid() = user_id);

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own blueprints" ON blueprints
  FOR ALL USING (auth.uid() = user_id);
```

---

## 6. API Routes

| Route | Method | Auth | Tier | Description |
|---|---|---|---|---|
| `/api/auth/callback` | GET | — | — | Supabase OAuth callback |
| `/api/prompt/generate` | POST | Required | Bloom+ | Assemble prompt from inputs |
| `/api/prompt/ai-enhance` | POST | Required | Craft+ | Call Claude API to enhance prompt |
| `/api/history` | GET | Required | Bloom+ | Fetch user's prompt history |
| `/api/history` | POST | Required | Bloom+ | Save prompt to history |
| `/api/blueprints` | GET | Required | Studio+ | Fetch saved blueprints |
| `/api/blueprints` | POST | Required | Studio+ | Save blueprint |
| `/api/lighting` | GET | Required | Craft+ | Fetch lighting profiles |
| `/api/lighting` | POST | Required | Craft+ | Save lighting profile |
| `/api/stripe/checkout` | POST | Required | — | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | — (sig) | — | Handle Stripe events |
| `/api/stripe/portal` | POST | Required | — | Open billing portal |

---

## 7. AI Integration — Claude API

### 7.1 Trigger
"AI Enhance" button — available Craft+ tier, deducts from monthly AI budget.

### 7.2 System Prompt
```
You are a Midjourney prompt specialist for faux floral wreath product photography. 
Take the given Midjourney prompt and enhance it with:
- More specific lighting direction (quality, source, angle)
- Additional surface or material texture detail
- Richer atmosphere descriptors that match the emotional tone
Keep all existing --parameters (--ar, --s, --chaos, --sw, --v, --style, --q, --no) exactly unchanged.
Return ONLY the enhanced prompt string. No preamble, no explanation.
```

### 7.3 Input/Output
- Input: current assembled prompt string
- Output: enhanced prompt string, parameters preserved
- Max tokens: 600
- Model: `claude-sonnet-4-20250514`

---

## 8. Next.js File Scaffold

```
wreathstudio/
├── app/
│   ├── page.tsx                    ← Landing page
│   ├── app/
│   │   └── page.tsx                ← App shell (auth-gated)
│   ├── api/
│   │   ├── prompt/
│   │   │   ├── generate/route.ts   ← Prompt assembly (server-side)
│   │   │   └── ai-enhance/route.ts ← Claude API proxy
│   │   ├── history/route.ts
│   │   ├── blueprints/route.ts
│   │   ├── lighting/route.ts
│   │   └── stripe/
│   │       ├── checkout/route.ts
│   │       ├── webhook/route.ts
│   │       └── portal/route.ts
│   └── auth/callback/route.ts
├── components/
│   ├── ui/
│   │   ├── TierGate.tsx            ← Blur overlay + upgrade CTA
│   │   ├── ChipSelect.tsx          ← Multi-chip selector
│   │   ├── SliderField.tsx         ← Range slider with value display
│   │   └── PromptOutput.tsx        ← Output panel + actions
│   ├── composer/
│   │   ├── BlueprintPanel.tsx
│   │   ├── EmotionPanel.tsx
│   │   ├── MJControlsPanel.tsx
│   │   └── HistoryPanel.tsx
│   └── layout/
│       ├── AppShell.tsx
│       ├── Sidebar.tsx
│       └── TopNav.tsx
├── lib/
│   ├── tier.ts                     ← TIER_RANK, canAccess(), labels, colors
│   ├── claude.ts                   ← Typed Claude wrapper
│   ├── prompt-engine.ts            ← Prompt assembly logic (pure functions)
│   ├── supabase.ts                 ← Client + server Supabase instances
│   └── stripe.ts                  ← Stripe client setup
├── hooks/
│   ├── useTier.ts
│   ├── usePromptHistory.ts
│   └── useBlueprintLibrary.ts
├── supabase/
│   └── migrations/
│       └── 001_init.sql
└── .env.local.example
```

---

## 9. Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_BLOOM=price_xxx
STRIPE_PRICE_CRAFT=price_xxx
STRIPE_PRICE_STUDIO=price_xxx
STRIPE_PRICE_ATELIER=price_xxx

# Anthropic — SERVER-SIDE ONLY. NEVER prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY=

# App
NEXT_PUBLIC_APP_URL=https://app.wreathstudio.com
```

---

## 10. Deployment Checklist

- [ ] Supabase project created, migrations run
- [ ] RLS policies verified (history + blueprints)
- [ ] Stripe products + price IDs created for all 4 tiers
- [ ] Stripe webhook endpoint registered → `/api/stripe/webhook`
- [ ] ANTHROPIC_API_KEY confirmed server-side only
- [ ] Vercel project created, env vars set
- [ ] Custom domain configured
- [ ] Auth redirect URLs set in Supabase dashboard
- [ ] Smoke test: free signup → generate 1 prompt → upgrade → generate premium feature
- [ ] Stripe test mode: complete checkout, verify tier upgrade in profiles table

---

## 11. Known Limitations & Future Work

| Item | Priority | Notes |
|---|---|---|
| `--sref` requires user to supply their own URL | High | Consider a curated lighting reference library in-app |
| Prompt history is text-only (no input state save) | Medium | Blueprint library feature restores this for Studio+ |
| No real-time Midjourney API integration | Low | Midjourney API is waitlisted; monitor for availability |
| Mobile sidebar hidden on small screens | Medium | Add mobile drawer nav |
| No undo/redo on form state | Low | Nice-to-have for v2 |
| Batch generation UI not spec'd | Medium | Studio+ feature — needs separate PRD section |
