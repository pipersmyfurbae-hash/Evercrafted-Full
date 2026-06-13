# Evercrafted — Prompt Engine App
## Developer Spec v1.0

---

## 1. What This App Does

The Prompt Engine takes a designer's emotional intent and style direction as input, then generates a full **creative collection package** — wreath render prompts, environment scene prompts, element-level breakdown prompts, alternate variations, and marketing copy — all in a single AI-powered run.

It is the content production layer of the Evercrafted platform: one input, one coherent creative drop.

---

## 2. User Flow

1. User lands on `/generate`
2. Enters emotion/mood (required), selects style + optional season
3. Toggles which sections to include (environment, elements, variations, copy)
4. Optionally adds inventory notes
5. Clicks **Generate Collection**
6. Loading state cycles through status messages while Claude API runs
7. Output dashboard renders with:
   - Collection header (title, headline, subheadline, CTA)
   - Wreath prompt (copyable)
   - Environment prompt (if toggled)
   - Element breakdown cards (if toggled)
   - Alternate variation prompt cards (if toggled)
8. User copies individual prompts OR exports full JSON OR downloads ZIP (Atelier only)
9. User clicks "New Collection" to reset

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|---|---|---|---|
| Generate wreath prompt | — | — | ✓ | ✓ |
| Environment scene | — | — | ✓ | ✓ |
| Element breakdown | — | — | ✓ | ✓ |
| Alt variations | — | — | — | ✓ |
| Marketing copy | — | — | — | ✓ |
| Export JSON | — | — | ✓ | ✓ |
| Save to collection library | — | — | — | ✓ |
| Download ZIP bundle | — | — | — | ✓ |
| Inventory-aware generation | — | — | — | ✓ |

**This app is Atelier-tier.** Studio users can access core generation (wreath + environment + elements) but see lock overlays on variations, copy, ZIP export.

---

## 4. AI Integration

**Required tier:** Studio (core), Atelier (full)

**Model:** `claude-sonnet-4-20250514`

**API Route:** `POST /api/prompt-engine/generate`

**System Prompt (abbreviated):**
```
You are the Evercrafted Prompt Engine — an AI specializing in generating cinematic, 
emotionally resonant prompt sets for luxury faux botanical wreath designs.

WREATH_STYLE_DNA (canonical — always apply):
- 24-inch asymmetrical form
- 3–5 distinct clusters with deliberate negative space
- Soft directional daylight or warm ambient light
- Photorealistic render, ultra-detail, editorial quality
- NO cherry blossoms, pussy willow, or twig-based blossom florals

PROMPT STACKING SYSTEM:
Each prompt = BASE STYLE LOCK + EMOTION LAYER + STRUCTURE LAYER + SCENE LAYER

Return ONLY a valid JSON object (no markdown, no preamble).
```

**Input format:**
```json
{
  "emotion": "calm and peaceful",
  "style": "luxury",
  "season": "autumn",
  "inventory": "silk ranunculus, dried pampas",
  "include_environment": true,
  "include_elements": true,
  "include_variations": true,
  "include_copy": true
}
```

**Output format:**
```json
{
  "title": "Still Morning",
  "headline": "Quiet is the room that knows itself.",
  "subheadline": "A collection built from exhale.",
  "cta": "Build This Drop",
  "prompts": {
    "wreath": "...",
    "environment": "...",
    "detail_elements": [
      { "type": "focal", "prompt": "..." },
      { "type": "greenery", "prompt": "..." },
      { "type": "texture", "prompt": "..." },
      { "type": "accent", "prompt": "..." }
    ],
    "alt_variations": [
      { "label": "Winter Shift", "shift": "palette cools, structure tightens", "prompt": "..." },
      { "label": "Maximalist Edit", "shift": "density increases, drama added", "prompt": "..." }
    ]
  }
}
```

**Max tokens:** 2000 (keep response under API limits)

---

## 5. Data Model

### `collections` table
```sql
CREATE TABLE collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT,
  headline TEXT,
  subheadline TEXT,
  cta TEXT,
  emotion TEXT,
  style TEXT,
  season TEXT,
  inventory_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON collections FOR ALL USING (auth.uid() = user_id);
```

### `prompts` table
```sql
CREATE TABLE prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections ON DELETE CASCADE,
  type TEXT CHECK (type IN ('wreath','environment','element','variation')),
  subtype TEXT, -- e.g. 'focal', 'greenery', or variation label
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_via_collection" ON prompts FOR ALL
  USING (collection_id IN (SELECT id FROM collections WHERE user_id = auth.uid()));
```

### `images` table (future phase)
```sql
CREATE TABLE images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id UUID REFERENCES collections ON DELETE CASCADE,
  prompt_id UUID REFERENCES prompts,
  url TEXT,
  type TEXT CHECK (type IN ('hero','environment','detail')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 6. API Routes

| Route | Method | Auth Required | Tier | Description |
|---|---|---|---|---|
| `/api/prompt-engine/generate` | POST | Yes | Studio+ | Generate full prompt set |
| `/api/prompt-engine/collections` | GET | Yes | Studio+ | List saved collections |
| `/api/prompt-engine/collections/:id` | GET | Yes | Studio+ | Get single collection |
| `/api/prompt-engine/collections/:id` | DELETE | Yes | Studio+ | Delete collection |
| `/api/prompt-engine/export/:id` | GET | Yes | Atelier | Export collection as JSON |
| `/api/prompt-engine/bundle/:id` | GET | Yes | Atelier | Download ZIP bundle |

---

## 7. Component Map

```
/app/prompt-engine/
  page.tsx                    → Shell: header + tab routing
  /generate/page.tsx          → PromptForm + loading + CollectionOutput

/components/prompt-engine/
  PromptForm.tsx              → All input fields + toggles + submit
  LoadingState.tsx            → Spinner + cycling status messages
  CollectionOutput.tsx        → Full output dashboard wrapper
  CollectionHeader.tsx        → Title / headline / subheadline / CTA pill
  PromptCard.tsx              → Single copyable prompt with type badge
  ElementGrid.tsx             → 3-col grid of ElementChip components
  ElementChip.tsx             → Individual element breakdown card
  VariationGrid.tsx           → 2-col grid of variation PromptCards
  ExportBar.tsx               → Copy all / JSON export / ZIP (Atelier lock)

/components/ui/
  TierGate.tsx                → Blur overlay + upgrade CTA for locked features
```

---

## 8. Next.js Scaffold File Tree

```
evercrafted/
├── app/
│   ├── api/
│   │   └── prompt-engine/
│   │       └── generate/route.ts        ← Server-side Claude proxy
│   └── prompt-engine/
│       └── page.tsx
├── components/
│   ├── prompt-engine/                   ← All components above
│   └── ui/TierGate.tsx
├── lib/
│   ├── tier.ts                          ← TIER_RANK, canAccess(), labels
│   ├── claude.ts                        ← Typed Claude wrapper
│   └── prompt-engine/
│       └── system-prompt.ts            ← Canonical system prompt + DNA
├── hooks/
│   └── useTier.ts                       ← Reads tier from Supabase session
├── supabase/
│   └── migrations/
│       ├── 001_init.sql                 ← profiles + RLS
│       └── 002_prompt_engine.sql       ← collections + prompts + images
└── .env.local.example
```

---

## 9. `app/api/prompt-engine/generate/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { canAccess } from '@/lib/tier'
import { PROMPT_ENGINE_SYSTEM } from '@/lib/prompt-engine/system-prompt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', session.user.id)
    .single()

  if (!canAccess(profile?.tier, 'studio')) {
    return NextResponse.json({ error: 'Studio tier required' }, { status: 403 })
  }

  const body = await request.json()
  const { emotion, style, season, inventory, include_environment,
          include_elements, include_variations, include_copy } = body

  // Atelier-only features
  const allowVariations = canAccess(profile.tier, 'atelier') && include_variations
  const allowCopy = canAccess(profile.tier, 'atelier') && include_copy

  const userMsg = `Generate a complete Evercrafted prompt collection for:
Emotion/Mood: ${emotion}
Style: ${style}
${season ? `Season: ${season}` : ''}
${inventory ? `Inventory notes: ${inventory}` : ''}

Include: environment: ${include_environment}, elements: ${include_elements}, 
variations: ${allowVariations}, copy: ${allowCopy}`

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: PROMPT_ENGINE_SYSTEM,
    messages: [{ role: 'user', content: userMsg }]
  })

  const raw = message.content
    .filter(b => b.type === 'text')
    .map(b => b.text).join('')

  const collection = JSON.parse(raw.replace(/```json|```/g, '').trim())

  // Persist to Supabase
  const { data: saved } = await supabase
    .from('collections')
    .insert({ user_id: session.user.id, emotion, style, season, ...collection })
    .select().single()

  return NextResponse.json({ collection, id: saved.id })
}
```

---

## 10. `.env.local.example`

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# Anthropic — NEVER use NEXT_PUBLIC_ prefix
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://evercrafted.com
```

---

## 11. Deployment Checklist

- [ ] Supabase project created
- [ ] Run `001_init.sql` (profiles + RLS)
- [ ] Run `002_prompt_engine.sql` (collections + prompts + images)
- [ ] Stripe products created for all 4 tiers with correct price IDs
- [ ] Stripe webhook configured for `customer.subscription.updated`
- [ ] Webhook handler updates `profiles.tier` on subscription change
- [ ] `ANTHROPIC_API_KEY` set in Vercel environment variables (production + preview)
- [ ] API key confirmed server-side only (not in any `NEXT_PUBLIC_` var)
- [ ] Deploy to Vercel
- [ ] Test full flow: generate → save → export → tier gate on ZIP

---

## 12. MVP Phase Plan (per PRD)

| Week | Deliverable |
|---|---|
| 1 | HTML prototype live, prompt generator working with Claude API |
| 2 | Next.js scaffold with `/api/prompt-engine/generate` route + Supabase save |
| 3 | Environment + element + variation sections wired; tier gating on variations/ZIP |
| 4 | Export features, collection save/view library, UI polish, deploy |

---

## 13. Known Limitations / Future Work

- **No image API connected** — prototype generates prompts only. Image pipeline (OpenAI DALL·E or Midjourney automation) is Phase 2.
- **ZIP export** — requires storing generated images in Supabase Storage; deferred to Phase 2.
- **Collection library** — `/collections` list view not in MVP scope.
- **Inventory-aware generation** — currently free-text; future phase adds SKU lookup from inventory database.
- **Blueprint pipeline connection** — collections should eventually link back to blueprint JSON and WGS genome strings; tracked as future integration point.
- **Midjourney vs OpenAI** — OpenAI DALL·E 3 recommended for MVP (direct API); Midjourney requires Discord automation workaround and is Phase 3.
