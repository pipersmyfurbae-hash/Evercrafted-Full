# Parametric Lab — Developer Spec
## Evercrafted SaaS Platform

**Spec version:** 1.0  
**App ID:** parametric-lab  
**Tier:** Craft (base) · Studio (advanced exports)  
**Price:** $9.95/mo  
**Trial:** 14 days free

---

## 1. What This App Does

Parametric Lab generates wreath shape structures from mood parameters. Users select a shape family (Round, Crescent, Trailing, Loose, Figure-eight), adjust four parameters (Density, Structure, Scale, Asymmetry), preview the shape on a live canvas, then optionally run an AI interpretation that returns a full emotional blueprint with element counts, palette direction, composition scores, and a WGS-compatible output.

The app bridges the gap between client intent ("I want something crescent-shaped but not too formal") and a buildable structural blueprint. It is the entry point to the Layout Studio workflow.

---

## 2. User Flow

1. User logs in via Supabase Auth (email/password or magic link)
2. App shell loads with sidebar nav — Parametric Lab selected by default
3. User selects a shape family from the 5-shape grid
4. User adjusts 4 sliders (Density, Structure, Scale, Asymmetry)
5. Canvas updates live with the shape preview (requestAnimationFrame)
6. User optionally types a shape description into the AI input field
7. App calls `/api/claude` → Claude API → returns JSON blueprint
8. Blueprint renders in result card with emotion quadrant, formula, element counts, scores
9. User can: Save Shape (local session), Export SVG (client-side), Send to Layout Studio (deep link)
10. Studio-tier users can additionally Export Blueprint JSON (full WGS genome + placement data)
11. History table tracks all generated shapes in the session

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| Shape families (all 5) | ✓ | ✓ | ✓ | ✓ |
| Mood sliders (4 params) | ✓ | ✓ | ✓ | ✓ |
| Live canvas preview | ✓ | ✓ | ✓ | ✓ |
| SVG export | — | ✓ | ✓ | ✓ |
| AI Blueprint Interpretation | — | ✓ | ✓ | ✓ |
| Save to Library | — | ✓ | ✓ | ✓ |
| Export to Layout Studio | — | ✓ | ✓ | ✓ |
| Blueprint JSON export | — | — | ✓ | ✓ |
| WGS genome string output | — | — | ✓ | ✓ |
| Batch shape generation | — | — | — | ✓ |
| Client-facing share links | — | — | — | ✓ |

---

## 4. AI Integration

**Required tier:** Craft+

**Model:** `claude-sonnet-4-20250514`

**Endpoint:** POST `/api/claude` (server-side proxy — API key NEVER client-side)

**System prompt:**
```
You are the Evercrafted Parametric Blueprint Engine. Given a wreath shape/mood description, 
return ONLY valid JSON with this exact structure — no markdown, no explanation, no preamble:
{
  "emotion": {
    "quadrant": "string (Serene | Joyful | Dramatic | Earthy | Ethereal)",
    "formula": "short poetic formula e.g. 'stillness × air'",
    "emotional_tone": "1-sentence tone description",
    "density": "Airy | Balanced | Lush",
    "silence_arc_deg": number between 30 and 180,
    "palette_direction": "e.g. 'Pale sage, cream, ivory'"
  },
  "blueprint": {
    "blueprint_id": "PL-XXXX (4 random digits)",
    "composition": { "zone_count": number 2-5 },
    "elements": [
      {"role":"focal","count":number},
      {"role":"supporting","count":number},
      {"role":"filler","count":number},
      {"role":"greenery","count":number}
    ],
    "scores": {
      "emotion_fit": number 0.7-1.0,
      "dna_cohesion": number 0.7-1.0,
      "brand_alignment": number 0.8-1.0
    }
  },
  "interpretation": "2-sentence plain English interpretation"
}
```

**Input:** User's plain-language shape description (max 500 chars)

**Output:** JSON parsed client-side into result card UI

**Max tokens:** 600 (response is compact JSON only)

---

## 5. Data Model

### Supabase Tables

```sql
-- profiles (created on auth.users insert via trigger)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'bloom' CHECK (tier IN ('bloom','craft','studio','atelier')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- saved_shapes
CREATE TABLE saved_shapes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shape_family TEXT NOT NULL CHECK (shape_family IN ('round','crescent','trailing','loose','figure-eight')),
  density INT NOT NULL CHECK (density BETWEEN 1 AND 10),
  structure INT NOT NULL CHECK (structure BETWEEN 1 AND 10),
  scale INT NOT NULL CHECK (scale BETWEEN 1 AND 10),
  asymmetry INT NOT NULL CHECK (asymmetry BETWEEN 1 AND 10),
  ai_blueprint JSONB,          -- full Claude response if interpreted
  svg_data TEXT,               -- exported SVG string
  wgs_genome TEXT,             -- Studio+ only
  blueprint_id TEXT,           -- e.g. PL-4821
  name TEXT,                   -- user-given name
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their profile"
  ON profiles FOR ALL USING (auth.uid() = id);

ALTER TABLE saved_shapes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their shapes"
  ON saved_shapes FOR ALL USING (auth.uid() = user_id);
```

---

## 6. API Routes

| Route | Method | Auth Required | Tier | Description |
|-------|--------|---------------|------|-------------|
| `/api/claude` | POST | ✓ | craft+ | Proxy to Anthropic API — validates tier, forwards message, returns JSON |
| `/api/shapes` | GET | ✓ | craft+ | Fetch user's saved shapes from Supabase |
| `/api/shapes` | POST | ✓ | craft+ | Save a shape to library |
| `/api/shapes/[id]` | DELETE | ✓ | craft+ | Delete a saved shape |
| `/api/shapes/[id]/export` | GET | ✓ | studio+ | Export full blueprint JSON with WGS genome |
| `/api/webhooks/stripe` | POST | — (raw body) | — | Handle Stripe subscription events, update tier in profiles |

---

## 7. File Tree & Component Map

```
evercrafted/
├── app/
│   ├── layout.tsx                    # Root layout — fonts, metadata, Supabase provider
│   ├── page.tsx                      # Marketing site (or redirect to /app)
│   ├── app/
│   │   ├── layout.tsx                # App shell — sidebar + topbar + auth guard
│   │   ├── parametric-lab/
│   │   │   └── page.tsx              # Main app page — imports all lab components
│   │   └── layout-studio/
│   │       └── page.tsx              # Layout Studio (separate app)
│   └── api/
│       ├── claude/route.ts           # Server-side Claude proxy
│       ├── shapes/route.ts           # CRUD for saved shapes
│       ├── shapes/[id]/route.ts      # Single shape ops
│       ├── shapes/[id]/export/route.ts  # JSON/genome export (Studio+)
│       └── webhooks/stripe/route.ts  # Stripe webhook handler
├── components/
│   ├── lab/
│   │   ├── ShapeSelector.tsx         # 5-shape grid with SVG previews
│   │   ├── MoodSliders.tsx           # 4 range sliders with live values
│   │   ├── ShapeCanvas.tsx           # Canvas drawing engine (useEffect + requestAnimationFrame)
│   │   ├── AIInterpreter.tsx         # Input + Claude call + result card
│   │   ├── ExportPanel.tsx           # SVG / Layout Studio / JSON export cards
│   │   └── ShapeHistory.tsx          # Session history table
│   ├── shell/
│   │   ├── AppTopbar.tsx             # Wordmark + app name + tier badge + user
│   │   ├── AppSidebar.tsx            # Nav + upgrade card
│   │   └── UpgradePrompt.tsx         # Reusable upgrade CTA
│   └── ui/
│       ├── TierGate.tsx              # Blur overlay + upgrade CTA if tier insufficient
│       ├── Toast.tsx                 # Toast notification
│       └── Panel.tsx                 # Reusable panel wrapper
├── lib/
│   ├── tier.ts                       # TIER_RANK, canAccess(), TIER_LABELS, TIER_COLORS
│   ├── claude.ts                     # Typed Claude wrapper with lab system prompt
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client
│   │   └── server.ts                 # Server Supabase client (cookies)
│   └── canvas/
│       └── drawShape.ts              # Pure function: (shape, params, ctx) => void
├── hooks/
│   ├── useTier.ts                    # Reads tier from Supabase session
│   ├── useShapeCanvas.ts             # Manages canvas ref + redraw on param changes
│   └── useSavedShapes.ts             # Fetch/save/delete shapes via API
├── supabase/
│   └── migrations/
│       └── 001_init.sql              # Full schema above
└── .env.local.example
```

---

## 8. Key File Implementations

### `app/api/claude/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { TIER_RANK } from '@/lib/tier';

export async function POST(req: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('tier').eq('id', user.id).single();
  if (!profile || TIER_RANK[profile.tier] < TIER_RANK['craft'])
    return NextResponse.json({ error: 'Craft tier required' }, { status: 403 });

  const { messages, systemPrompt } = await req.json();

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  });

  const data = await response.json();
  return NextResponse.json(data);
}
```

### `lib/tier.ts`
```typescript
export const TIER_RANK: Record<string, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

export function canAccess(userTier: string, requiredTier: string): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export const TIER_LABELS: Record<string, string> = {
  bloom: 'Bloom',
  craft: 'Craft',
  studio: 'Studio',
  atelier: 'Atelier',
};

export const TIER_COLORS: Record<string, { bg: string; color: string }> = {
  bloom:   { bg: '#EEF2ED', color: '#4A6741' },
  craft:   { bg: '#EEF4F9', color: '#4A6785' },
  studio:  { bg: '#F5EEF4', color: '#7A4A85' },
  atelier: { bg: '#1A1A1A', color: '#F2EFE9' },
};
```

### `components/ui/TierGate.tsx`
```typescript
import { canAccess } from '@/lib/tier';
import { useTier } from '@/hooks/useTier';

interface TierGateProps {
  required: string;
  children: React.ReactNode;
}

export function TierGate({ required, children }: TierGateProps) {
  const { tier } = useTier();
  const allowed = canAccess(tier, required);

  return (
    <div style={{ position: 'relative' }}>
      {children}
      {!allowed && (
        <div className="tier-gate-overlay">
          <span className="tg-icon">⚿</span>
          <span className="tg-label">Requires {required.charAt(0).toUpperCase() + required.slice(1)}</span>
          <button className="tg-btn" onClick={() => window.location.href = '/pricing'}>
            Upgrade →
          </button>
        </div>
      )}
    </div>
  );
}
```

### `.env.local.example`
```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# Anthropic — SERVER SIDE ONLY, NEVER NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## 9. Deployment Checklist

### Supabase
- [ ] Run `001_init.sql` migration
- [ ] Enable RLS on all tables
- [ ] Set up auth.users trigger → profiles insert
- [ ] Enable email auth (+ magic link optional)
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to Vercel

### Stripe
- [ ] Create products: Bloom, Craft, Studio, Atelier
- [ ] Create monthly price for each product
- [ ] Add webhook endpoint: `https://app.evercrafted.com/api/webhooks/stripe`
- [ ] Subscribe to events: `customer.subscription.created`, `updated`, `deleted`
- [ ] Copy all Stripe env vars to Vercel

### Anthropic
- [ ] Create API key in Anthropic console
- [ ] Add `ANTHROPIC_API_KEY` to Vercel (server-side only)
- [ ] Verify key is NEVER in any `NEXT_PUBLIC_` variable

### Vercel
- [ ] Connect GitHub repo
- [ ] Set all env vars from `.env.local.example`
- [ ] Set framework: Next.js
- [ ] Deploy and verify `/api/claude` route works end-to-end
- [ ] Verify tier gating blocks Bloom users from AI calls
- [ ] Test Stripe webhook updates tier in Supabase

---

## 10. Known Limitations & Future Work

**Current limitations:**
- Canvas export is client-side SVG serialization only — no server-side rasterization
- AI interpretation is single-turn — no follow-up refinement
- Session history is in-memory only (not persisted to Supabase in current spec)
- WGS genome string generation for Studio tier is stubbed — requires `wreath-genome-system` skill integration

**Recommended next work:**
1. Connect saved shapes to Supabase (persist session history)
2. Integrate `wreath-genome-system` skill output as Studio export format
3. Add "Send to Layout Studio" deep-link with shape params encoded in URL
4. Add shape thumbnail generation (small canvas → base64 → stored in saved_shapes)
5. Build batch generation (Atelier tier) — generate 3–5 variations from one description
6. Add share links for client-facing blueprint previews (Atelier tier)
