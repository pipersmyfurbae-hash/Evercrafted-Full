# Memory-to-Masterpiece Studio — Developer Spec
## Evercrafted | Atelier Tier App

---

## 1. What This App Does

The Memory-to-Masterpiece Studio transforms a client's written memory or emotional intent into a fully manufactured wreath blueprint. The user writes a paragraph about a person, moment, or feeling. The AI extracts emotional scores, assigns design glyphs, generates a floral recipe, and produces a polar-coordinate blueprint canvas — all the way to a production-ready Midjourney render prompt and optional PDF Build Guide.

It is the primary Atelier-tier product: the full pipeline from raw human language to a manufacturable, emotionally resonant wreath design.

---

## 2. User Flow

1. **Land on Step 1 (Memory Input)** — user authenticates, Supabase returns their tier
2. **Enter memory text** + occasion, wreath size, density, composition style, location, budget
3. **Click "Translate Memory"** — calls `/api/claude` (server-side) with the Emotion Analyzer system prompt → returns `{ emotions[], glyphs[], story }`
4. **Step 2 (Emotion Map)** — view emotional chips, glyphs, design story; confirm or revise
5. **Click "Generate Blueprint"** — calls `/api/claude` with Blueprint Composition system prompt → returns `{ blueprintIntent, floralRecipe[], genomeString }`
6. **Step 3 (Blueprint)** — view intent table, recipe table; genome string shown (Atelier) or blurred (lower tiers)
7. **Step 4 (Canvas)** — 600×600 polar-coordinate canvas renders placements by role using golden-angle algorithm; optical balance quadrant meters; aesthetic score
8. **Click "Generate MJ Prompt"** — calls `/api/claude` with Prompt Compiler system prompt → returns Midjourney string (Studio+)
9. **Step 5 (MJ Prompt)** — copy prompt to clipboard (Studio+); step 6 (Build Guide PDF) available to Atelier only
10. **Save Blueprint** — `POST /api/blueprints` persists `BlueprintLayout` JSON + `FloralRecipeDraft` to Supabase

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|---|---|---|---|
| Memory input + emotion analysis | ✓ | ✓ | ✓ | ✓ |
| View emotion profile & glyphs | ✓ | ✓ | ✓ | ✓ |
| Blueprint intent table | ✓ | ✓ | ✓ | ✓ |
| Floral recipe draft | — | ✓ | ✓ | ✓ |
| Blueprint canvas (polar preview) | — | ✓ | ✓ | ✓ |
| Midjourney render prompt | — | — | ✓ | ✓ |
| WGS Genome string | — | — | — | ✓ |
| Build Guide PDF export | — | — | — | ✓ |
| AI Florist live chat | — | — | — | ✓ |
| Save & version blueprints | — | — | ✓ | ✓ |
| Genome mutate / breed | — | — | — | ✓ |

**Gating rule:** locked features render with `backdrop-filter: blur(6px)` overlay + upgrade CTA. Never `display:none`.

---

## 4. AI Integration Details

### 4a. Emotion Analyzer (Step 1 → Step 2)
- **Required tier:** Bloom+
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 800
- **System prompt role:** Parse memory text → extract emotions (label, intensity 0–1), glyphs, and design story
- **Input format:** Raw memory text string
- **Output format (JSON):**
```json
{
  "emotions": [{"label": "string", "intensity": 0.0}],
  "glyphs": ["string"],
  "story": "string"
}
```
- **Glyph vocabulary:** `quiet_strength`, `grief`, `threshold`, `circle_of_life`, `journey`, `veil`, `warmth`, `nostalgia`, `celebration`, `rootedness`

### 4b. Blueprint Composer (Step 2 → Step 3)
- **Required tier:** Craft+
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1200
- **System prompt role:** Given emotions + glyphs + wreath params → produce `BlueprintIntent` + `FloralRecipeDraft` + genome string
- **Output format (JSON):**
```json
{
  "blueprintIntent": {
    "wreathDiameterIn": 24,
    "compositionStyle": "crescent",
    "focalArcStart": 220,
    "focalArcEnd": 320,
    "symmetryMode": "bilateral",
    "density": "medium",
    "targetPieces": { "focal":[8,11], "secondary":[12,16], "filler":[12,18], "greenery":[22,28] }
  },
  "floralRecipe": [
    { "role": "focal|secondary|filler|greenery|line", "name": "string", "pieces": 0, "emotionSource": "string" }
  ],
  "genomeString": "string"
}
```

### 4c. Midjourney Prompt Compiler (Step 4 → Step 5)
- **Required tier:** Studio+
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 600
- **Output:** Raw Midjourney prompt string
- **Style DNA rules (always enforce):**
  - 24-inch asymmetric form
  - 3–5 focal clusters
  - Warm directional light (upper-left)
  - Shallow depth of field
  - Editorial product photography on neutral linen
  - `--ar 1:1 --stylize 750 --v 6.1`
  - **NEVER include:** cherry blossoms, pussy willow, twig-based blossoms

---

## 5. Data Model

### `profiles` table
```sql
id uuid PRIMARY KEY REFERENCES auth.users(id),
email text,
tier text DEFAULT 'bloom' CHECK (tier IN ('bloom','craft','studio','atelier')),
stripe_customer_id text,
stripe_subscription_id text,
created_at timestamptz DEFAULT now()
```

### `blueprints` table
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
owner_uid uuid REFERENCES profiles(id) ON DELETE CASCADE,
title text,
memory_text text,
emotions jsonb,          -- EmotionScore[]
glyphs text[],
story text,
blueprint_intent jsonb,  -- BlueprintIntent
floral_recipe jsonb,     -- FloralRecipeItem[]
genome_string text,
mj_prompt text,
aesthetic_score integer,
schema_version text DEFAULT '1.0',
created_at timestamptz DEFAULT now(),
updated_at timestamptz DEFAULT now()
```

### RLS Policies
```sql
-- profiles: users read/update their own row
CREATE POLICY "self_rw" ON profiles
  FOR ALL USING (auth.uid() = id);

-- blueprints: users CRUD their own rows only
CREATE POLICY "owner_rw" ON blueprints
  FOR ALL USING (auth.uid() = owner_uid);
```

---

## 6. API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/claude` | POST | Required + tier check | Server-side Anthropic proxy; enforces tier before calling Claude |
| `/api/blueprints` | GET | Required | List user's saved blueprints |
| `/api/blueprints` | POST | Required | Save a new blueprint |
| `/api/blueprints/[id]` | GET | Required | Fetch one blueprint |
| `/api/blueprints/[id]` | PATCH | Required | Update title, notes |
| `/api/blueprints/[id]` | DELETE | Required | Delete blueprint |
| `/api/stripe/checkout` | POST | Required | Create Stripe checkout session |
| `/api/stripe/webhook` | POST | Stripe sig | Handle subscription events; update profiles.tier |
| `/api/stripe/portal` | POST | Required | Open Stripe customer portal |

### `/api/claude` — Tier Enforcement Pattern
```typescript
// app/api/claude/route.ts
export async function POST(req: Request) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { messages, systemPrompt, requiredTier, maxTokens } = await req.json();
  const profile = await supabase.from('profiles').select('tier').eq('id', session.user.id).single();
  
  if (TIER_RANK[profile.tier] < TIER_RANK[requiredTier]) {
    return Response.json({ error: 'Tier insufficient', requiredTier }, { status: 403 });
  }
  
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens ?? 1000,
    system: systemPrompt,
    messages
  });
  
  return Response.json(response);
}
```

---

## 7. Component Map

```
app/
  (auth)/
    login/page.tsx              → Supabase Auth UI
  studio/
    page.tsx                    → Shell: PipelineNav + Panel router
    components/
      PipelineNav.tsx           → Step stepper with tier-aware locking
      Panel0_MemoryInput.tsx    → Form: memory text + context fields
      Panel1_EmotionMap.tsx     → EmotionChips + GlyphPills + StoryBlock
      Panel2_Blueprint.tsx      → IntentTable + RecipeTable + GenomeCard
      Panel3_Canvas.tsx         → BlueprintCanvas (canvas element) + BalanceMeter
      Panel4_MJPrompt.tsx       → PromptOutput + CopyButton (Studio+)
      Panel5_BuildGuide.tsx     → PDF export trigger (Atelier)
      TierGate.tsx              → Blur overlay + upgrade CTA
      BlueprintCanvas.tsx       → Wreath polar-coordinate renderer
lib/
  tier.ts                       → TIER_RANK, canAccess(), TIER_LABELS
  claude.ts                     → callClaude() wrapper (calls /api/claude)
  blueprint.ts                  → generateCanvasElements() placement math
hooks/
  useTier.ts                    → reads tier from Supabase session
  useBlueprint.ts               → save/load/update blueprint state
```

---

## 8. Canvas Placement Implementation Notes

```typescript
// lib/blueprint.ts — Placement math for canvas renderer

const CANVAS_PX = 440; // production: 600
const PX_PER_IN = CANVAS_PX / 24; // scales to wreath diameter
const cx = CANVAS_PX / 2;
const cy = CANVAS_PX / 2;

// Golden angle distribution (greenery + filler)
function goldenAnglePlacement(count: number, role: FflgaRole): PlacementPoint[] {
  const ringR = role === 'greenery' ? outerR - 15 : midR;
  return Array.from({ length: count }, (_, k) => {
    const angleDeg = (k * 137.5) % 360;
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = ringR + (Math.random() * 20 - 10);
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad), rotationDeg: angleDeg + 90 };
  });
}

// Crescent focal cluster (220°–320°)
function focalCrescent(count: number): PlacementPoint[] {
  const arcStart = 220; const arcEnd = 320;
  const step = (arcEnd - arcStart) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const angleDeg = arcStart + i * step + (Math.random() * 8 - 4);
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = outerR - 22;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad), rotationDeg: angleDeg + 90 };
  });
}
```

---

## 9. Deployment Checklist

```
[ ] 1. Supabase
        - Create project
        - Run supabase/migrations/001_init.sql
        - Enable Row Level Security on profiles + blueprints tables
        - Copy NEXT_PUBLIC_SUPABASE_URL + keys to .env.local

[ ] 2. Stripe
        - Create products: Bloom / Craft / Studio / Atelier
        - Copy price IDs to STRIPE_PRICE_BLOOM/CRAFT/STUDIO/ATELIER
        - Set up webhook → /api/stripe/webhook
        - Copy STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET

[ ] 3. Anthropic
        - Copy ANTHROPIC_API_KEY to .env.local
        - NEVER expose as NEXT_PUBLIC_* variable

[ ] 4. Vercel
        - Connect GitHub repo
        - Add all env vars from .env.local.example
        - Deploy
        - Verify /api/claude returns 401 without auth
        - Verify tier gating returns 403 for correct tier mismatches

[ ] 5. E2E Tests
        - Bloom user: emotion analysis works, blueprint blurred
        - Craft user: blueprint visible, MJ prompt blurred
        - Studio user: MJ prompt visible, genome blurred
        - Atelier user: all features accessible
        - Stripe webhook: subscription upgrade reflects in profiles.tier immediately
```

---

## 10. Known Limitations / Future Work

- **Canvas is 2D preview only** — does not account for z-index layering depth; needs layered canvas or React-Konva upgrade for true 3D preview
- **Floral selection uses AI names** — not matched to real SKU inventory; wire to `inventory-intelligence-engine` skill to filter to user's actual stock
- **Genome string is AI-generated** — not yet validated against the canonical WGS spec; needs `wreath-genome-system` skill integration for Encode/Decode/Mutate/Breed operations
- **PDF Build Guide** — not yet implemented; requires `builder-instructions-generator` skill + PDF generation (WeasyPrint or Puppeteer)
- **Aesthetic score** — currently random; Phase 9 replaces with GNN-based `AestheticScores` model
- **Multi-provider Memory engine** — currently single prompt; `MemoryToMasterpieceProvider` registry pattern supports multiple engines but only one is wired
- **No offline support** — all AI calls are synchronous; add optimistic UI + background job queue for production reliability
