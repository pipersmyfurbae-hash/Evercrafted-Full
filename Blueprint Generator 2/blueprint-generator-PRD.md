# Blueprint Generator — Product Requirements Document
## Evercrafted Platform · Studio Tier App

**Version:** 1.0  
**Date:** April 2026  
**Owner:** Bret Michael Baden  
**Status:** Production-ready scaffold  

---

## 1. Product Overview

### What It Does
Blueprint Generator converts wreath design intent (size, base type, element counts, placement preference, and an optional emotion/memory input) into a mathematically precise, printable wreath blueprint. Output includes a polar-coordinate SVG placement diagram, a per-element coordinate table, engine quality scores, and (on higher tiers) a Midjourney render prompt and AI-generated blueprint from plain-English description.

### Core Problem Solved
Wreath designers — from hobbyists to professional floral studios — lack a systematic way to plan element placement before building. They either guess visually (leading to imbalanced designs, wasted materials) or sketch manually (time-consuming, not reproducible). Blueprint Generator gives them a production-grade, printable build plan in under 5 seconds.

### Target Users

| Persona | Tier | Use Case |
|---------|------|----------|
| Hobbyist crafter | Bloom | Learn balanced composition; first wreath blueprint |
| Active Etsy seller | Craft | Fast build guides, PDF exports, consistent quality |
| Floral studio professional | Studio | MJ prompts for client mockups, genome encoding |
| Design agency / power user | Atelier | AI generation, full pipeline, marketplace publishing |

---

## 2. User Flow

1. **Land on app** — authenticated user arrives at Blueprint Generator (post-login redirect or direct URL `/app/blueprint`)
2. **Select size** — choose Small (10"), Medium (16"), Large (24"), or Custom (input diameter + depth)
3. **Choose base** — Grapevine or Pine/Wire; each has different density implications
4. **Set element counts** — adjust Focal (1–9), Filler/Greenery (1–20), Accent (0–12) via ± counters
5. **Select placement algorithm** — Golden Angle Spiral (default), Uniform Radial, or Cluster Grouping
6. **Optionally enter emotion/memory** — plain text field; used in engine scoring and MJ prompt
7. **Click Generate Blueprint** — triggers the client-side placement engine; renders SVG + coordinate table + engine results instantly
8. **Name and save** — enter blueprint name; save locally (Bloom) or to cloud (Craft+)
9. **Export** — PDF print (all tiers), copy MJ prompt (Studio+), export WGS genome string (Atelier)
10. **AI generation** (Atelier only) — enter wreath description → AI returns JSON blueprint → auto-applied to state → regenerate

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|:-----:|:-----:|:------:|:-------:|
| Polar coordinate engine | ✓ | ✓ | ✓ | ✓ |
| SVG placement diagram | ✓ | ✓ | ✓ | ✓ |
| 3 placement algorithms | ✓ | ✓ | ✓ | ✓ |
| Engine quality scores | ✓ | ✓ | ✓ | ✓ |
| Coordinate table (r, θ, x, y) | — | ✓ | ✓ | ✓ |
| Custom size input | — | ✓ | ✓ | ✓ |
| PDF builder guide export | — | ✓ | ✓ | ✓ |
| Cloud save / sync | — | ✓ | ✓ | ✓ |
| Saved presets library | — | ✓ | ✓ | ✓ |
| Midjourney render prompt | — | — | ✓ | ✓ |
| WGS genome encoding | — | — | ✓ | ✓ |
| Blueprint scoring engine | — | — | ✓ | ✓ |
| Etsy listing generator | — | — | ✓ | ✓ |
| AI blueprint from description | — | — | — | ✓ |
| AI element suggestions | — | — | — | ✓ |
| Blueprint reverse engineer | — | — | — | ✓ |
| Emotion tagger | — | — | — | ✓ |
| Marketplace publishing | — | — | — | ✓ |
| API access | — | — | — | ✓ |

**Pricing:**
- Bloom: Free
- Craft: $9/month
- Studio: $29/month
- Atelier: $79/month

---

## 4. Placement Engine Specification

### Algorithms

#### Golden Angle Spiral (default)
- Angle increment: `137.507764°` (the golden angle)
- Distribution: `theta = (i * GOLDEN_ANGLE) % 360`
- Result: maximally even, non-repeating — most natural-looking
- Best for: organic, asymmetrical designs

#### Uniform Radial
- Distribution: equal angular spacing per type group
- Focal offset: 0°, Filler offset: 15°, Accent offset: 30°
- Radius jitter: alternating ±20% of ring range
- Best for: geometric, symmetrical, formal designs

#### Cluster Grouping
- Cluster anchor points: 8 cardinal + diagonal points (0°, 45°, 90°… 315°)
- Spread: ±22° around each anchor
- Groups of 3 elements per cluster
- Best for: traditional, classic wreath styles

### Radius Ring Assignment

| Element Type | Inner (rMin) | Outer (rMax) |
|---|---|---|
| Focal flowers | 50% of outerR | 80% of outerR |
| Filler/greenery | 30% of outerR | 95% of outerR |
| Accent elements | 20% of outerR | 88% of outerR |

Where `outerR = (diameter/2) * 0.88`

### Engine Scoring
Three quality metrics (0–100%):
- **Emotion Fit** — alignment of design with emotion input (simulated; AI-calculated in Atelier)
- **DNA Cohesion** — internal consistency of element ratios
- **Brand Fit** — alignment with Evercrafted aesthetic standards

---

## 5. Data Model

### `profiles` table
```sql
id           uuid PRIMARY KEY REFERENCES auth.users
email        text NOT NULL
tier         text NOT NULL DEFAULT 'bloom' -- bloom|craft|studio|atelier
stripe_id    text
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()
```

### `blueprints` table
```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
owner_uid    uuid NOT NULL REFERENCES profiles(id)
name         text NOT NULL DEFAULT 'Untitled Blueprint'
data         jsonb NOT NULL
  -- { state: {...}, placements: [...], scores: {...}, wgs_genome: string }
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()
```

### RLS Policies
```sql
-- Users can only read/write their own blueprints
CREATE POLICY "own blueprints" ON blueprints
  USING (owner_uid = auth.uid());
```

### `blueprint_data` JSON structure
```json
{
  "state": {
    "diameter": 16,
    "base": "grapevine",
    "focal": 3,
    "filler": 8,
    "accent": 5,
    "placement": "golden"
  },
  "placements": [
    { "type": "focal", "idx": 0, "r": 5.23, "theta": 137.5 },
    ...
  ],
  "scores": {
    "emotion_fit": 0.84,
    "dna_cohesion": 0.91,
    "brand_alignment": 0.87
  },
  "wgs_genome": "16|GV|F3|L8|A5|GLD|...",
  "mj_prompt": "/imagine ...",
  "emotion_input": "cozy autumn morning",
  "created_at": "2026-04-07T12:00:00Z"
}
```

---

## 6. API Routes

| Route | Method | Auth | Tier | Description |
|-------|--------|------|------|-------------|
| `/api/blueprints` | GET | Required | Craft+ | List user's saved blueprints |
| `/api/blueprints` | POST | Required | Craft+ | Save a new blueprint |
| `/api/blueprints/:id` | GET | Required | Craft+ | Fetch single blueprint |
| `/api/blueprints/:id` | PUT | Required | Craft+ | Update a blueprint |
| `/api/blueprints/:id` | DELETE | Required | Craft+ | Delete a blueprint |
| `/api/claude` | POST | Required | Atelier | Proxied Claude API call (AI generation) |
| `/api/uploads` | POST | Required | Craft+ | Upload reference image |
| `/api/stripe/checkout` | POST | Required | Any | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Stripe sig | — | Stripe webhook handler (tier sync) |
| `/api/genome/encode` | POST | Required | Studio+ | Encode blueprint → WGS genome string |
| `/api/genome/decode` | POST | Required | Studio+ | Decode WGS genome → blueprint |

---

## 7. Component Map

```
app/blueprint/page.tsx
├── AppHeader (wordmark, app name, tier badge, tier switcher [dev])
├── AppShell (two-panel grid)
│   ├── ControlsPanel
│   │   ├── SizeSelector (grid of 4 size buttons + custom input)
│   │   ├── BaseToggle (grapevine | pine)
│   │   ├── ElementCounters (focal, filler, accent ± counters)
│   │   ├── PlacementRadio (golden | radial | cluster)
│   │   ├── EngineInput (emotion/memory text field)
│   │   ├── GenerateButton
│   │   └── SavedList (preset blueprints)
│   └── PreviewPanel
│       ├── EngineResultsCard (live scores + element counts)
│       ├── BlueprintNameRow (editable name, Save, PDF buttons)
│       ├── DiagramCard (SVG + legend + stats row)
│       ├── CoordinateTable (Craft+ — TierGate wraps)
│       ├── MidJourneyCard (Studio+ — TierGate wraps)
│       └── AIBlueprintCard (Atelier — TierGate wraps)
├── TierGate (blur overlay + upgrade CTA)
└── Toast (notification)
```

---

## 8. AI Integration Details

### Trigger
Atelier tier only. User clicks "Generate from description" or "Suggest elements" in the AI Blueprint card.

### System Prompt (Blueprint Generation)
```
You are the Evercrafted Blueprint Engine. Given a wreath description, return a JSON blueprint with:
- diameter (inches, integer), base (grapevine|pine), focal_count (1-9), filler_count (1-20), accent_count (0-12), placement (golden|radial|cluster)
- floral_suggestions: array of { type (focal|filler|accent), name, color, count }
- emotion_tags: array of emotion strings (max 4)
- design_notes: one paragraph plain English description of the design intent

Respond ONLY with valid JSON. No markdown, no explanation, no code fences.
```

### System Prompt (Element Suggestions)
```
You are a professional faux floral designer. Suggest 5-8 specific faux floral elements suitable for a wreath matching the user's description. Return a JSON array of { name, type (focal|filler|accent), color, why (one sentence) }. JSON only, no markdown.
```

### Model
`claude-sonnet-4-20250514` via server-side proxy at `/api/claude`

### Key: Server-side only
`ANTHROPIC_API_KEY` must NEVER be exposed client-side. All Claude calls route through `/api/claude/route.ts` which validates session + tier before forwarding.

---

## 9. Deployment Checklist

### Supabase
- [ ] Create new project
- [ ] Run `supabase/migrations/001_init.sql`
- [ ] Enable Email auth provider
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`
- [ ] Copy `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- [ ] Test RLS policies with test user

### Stripe
- [ ] Create products for Bloom, Craft, Studio, Atelier
- [ ] Create monthly prices for each product
- [ ] Copy price IDs to `.env.local` as `STRIPE_PRICE_BLOOM`, etc.
- [ ] Set up webhook endpoint → `/api/stripe/webhook`
- [ ] Copy `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`

### Anthropic
- [ ] Create API key at console.anthropic.com
- [ ] Copy to `ANTHROPIC_API_KEY` — **never NEXT_PUBLIC_**
- [ ] Set usage limits on the key

### Vercel
- [ ] Import repo
- [ ] Add all env vars to Vercel project settings
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Deploy and run smoke test
- [ ] Verify `/api/claude` returns 401 for unauthenticated requests
- [ ] Verify `/api/claude` returns 403 for sub-Atelier tiers

### Post-deploy smoke tests
- [ ] Bloom user: SVG renders, coordinate table locked
- [ ] Craft user: Coordinate table visible, MJ prompt locked
- [ ] Studio user: MJ prompt visible, AI card locked
- [ ] Atelier user: AI generation works end-to-end
- [ ] Stripe checkout → tier upgrade → feature unlock

---

## 10. Known Limitations & Future Work

**Current limitations:**
- Placement engine is purely client-side (deterministic math). No ML model for quality scoring yet — scores are simulated except in Atelier AI path.
- No real-time collaboration (no shared blueprint URLs yet)
- Image upload to cloud (`/api/uploads`) is scaffolded but S3/Supabase Storage integration not wired
- WGS genome encoding/decoding is a stub — full 15-field pipe-delimited spec pending

**Future work (ordered by priority):**
1. Wire WGS genome encode/decode to full 15-field spec
2. S3 integration for reference image uploads
3. Shareable blueprint URLs (public read, owner write)
4. Blueprint versioning / history
5. Real emotion-fit scoring using Claude API in Studio tier
6. Marketplace publishing flow (Atelier → public listing)
7. Mobile app (React Native shell wrapping the web app)
8. Bulk blueprint generation (CSV input → batch output)
9. Integration with Evercrafted Inventory Weaver (map florals to SKUs)
