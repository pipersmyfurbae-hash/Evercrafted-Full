# Floral Emotion Tagger — Next.js Production Scaffold

## File Tree

```
floral-emotion-tagger/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                         ← Redirects to /tagger
│   ├── tagger/
│   │   └── page.tsx                     ← Main app page
│   └── api/
│       ├── claude/
│       │   └── route.ts                 ← Server-side Claude proxy (tier-gated)
│       └── tags/
│           └── route.ts                 ← Save/retrieve tagged inventories
├── components/
│   ├── ui/
│   │   ├── TierGate.tsx                 ← Blur overlay + upgrade CTA
│   │   └── EcButton.tsx                 ← Branded button component
│   ├── tagger/
│   │   ├── InventoryInput.tsx           ← Sidebar input panel
│   │   ├── ItemCard.tsx                 ← Per-item emotion card
│   │   └── CollectionSummary.tsx        ← Bottom summary card
│   └── layout/
│       └── AppShell.tsx                 ← Header + sidebar + main layout
├── hooks/
│   ├── useTier.ts                       ← Reads tier from Supabase session
│   └── useTagger.ts                     ← Tagger state + API calls
├── lib/
│   ├── tier.ts                          ← Tier ranks, canAccess(), labels
│   ├── claude.ts                        ← Typed Claude wrapper + system prompt
│   ├── supabase.ts                      ← Supabase client (browser + server)
│   └── emotion-reference.ts            ← Floral emotion tables (static data)
├── supabase/
│   └── migrations/
│       └── 001_init.sql                 ← profiles + tag_sessions + RLS
├── types/
│   └── tagger.ts                        ← TypeScript interfaces
├── .env.local.example
├── next.config.ts
└── package.json
```

---

## types/tagger.ts

```typescript
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export type EmotionConfidence = 'high' | 'medium' | 'low';

export type FloralCategory = 'focal' | 'filler' | 'greenery' | 'texture' | 'accent';

export interface TaggedItem {
  name: string;
  floral_type: string;
  color: string;
  category: FloralCategory;
  quantity: number | null;
  emotion_tags: string[];
  primary_emotion: string;
  color_modifier: string;
  confidence: EmotionConfidence;
  source?: 'reference_table' | 'inferred';
}

export interface CollectionSummary {
  dominant_emotions: string[];
  emotional_range: string;
  design_intent_suggestion: string;
  emotion_gaps: string[];
  gap_note: string;
}

export interface TaggerResult {
  items: TaggedItem[];
  collection_summary: CollectionSummary;
}

export interface TagSession {
  id: string;
  user_id: string;
  input_text: string;
  result: TaggerResult;
  created_at: string;
  label: string | null;
}

export type InputMode = 'inventory' | 'single';
```

---

## lib/tier.ts

```typescript
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

export const TIER_LABELS: Record<Tier, string> = {
  bloom: 'Bloom',
  craft: 'Craft',
  studio: 'Studio',
  atelier: 'Atelier',
};

export const TIER_COLORS: Record<Tier, { bg: string; color: string }> = {
  bloom:   { bg: '#EEF2ED', color: '#4A6741' },
  craft:   { bg: '#EEF4F9', color: '#4A6785' },
  studio:  { bg: '#F5EEF4', color: '#7A4A85' },
  atelier: { bg: '#1A1A1A', color: '#F2EFE9' },
};

export const TIER_FEATURES: Record<string, Tier> = {
  'single_item_tagging':     'craft',
  'inventory_tagging':       'craft',
  'session_history':         'craft',
  'json_export':             'craft',
  'csv_export':              'studio',
  'bulk_csv_upload':         'studio',
  'blueprint_engine_feed':   'studio',
  'team_inventory_shared':   'atelier',
  'api_access':              'atelier',
};
```

---

## lib/claude.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';
import type { TaggerResult } from '@/types/tagger';

// Server-side only — never expose this client to the browser
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const TAGGER_SYSTEM_PROMPT = `You are the Evercrafted Floral Emotion Tagger. 
Tag floral inventory items with emotion labels based on floral type and color.

RULES:
- Never invent SKUs or quantities — only tag what exists in the input
- Always assign 2–4 emotion_tags per item (cap at 4)
- Flag ambiguous items with confidence: "low"
- No cherry blossoms, pussy willow, or twig-based blossoms (exclude if present)
- Use gender-neutral language

FLORAL EMOTION REFERENCE:
Rose → romance, love, passion, desire, tenderness
Peony → softness, abundance, grace, joy, nostalgia
Hydrangea → calm, serenity, understanding, gratitude, heartfelt
Eucalyptus → clarity, calm, renewal, groundedness
Lavender → peace, healing, rest, spirituality, memory
Dahlia → strength, elegance, dignity, mystery, transformation
Ranunculus → charm, radiance, attraction, delight, warmth
Anemone → anticipation, protection, vulnerability, wildness
Garden Rose → nostalgia, warmth, richness, romance, sentimentality
Magnolia → purity, perseverance, nobility, quiet strength, dignity
Foxglove → intrigue, drama, boldness, unpredictability
Hellebore → mystery, resilience, depth, melancholy, quiet beauty
Protea → courage, transformation, diversity, boldness
Thistle → resilience, independence, pride, ruggedness
Fern → sincerity, naturalness, shelter, groundedness
Moss → quiet, humility, simplicity, stillness
Cotton stem → comfort, home, warmth, simplicity, harvest
Berry stem → abundance, harvest, playfulness, earthiness
Pinecone → stability, winter calm, endurance, nostalgia
Ribbon/Velvet → elegance, luxury, festivity, celebration
Dried grass → quiet nostalgia, organic, freedom, wabi-sabi
Seed pod → mystery, late harvest, texture, intrigue

COLOR MODIFIERS:
White → purity, peace, clarity | Cream/Ivory → warmth, nostalgia, quiet elegance
Blush/Light Pink → tenderness, sweetness, romance | Deep Pink → passion, playfulness
Burgundy → depth, richness, drama, desire | Red → passion, urgency, love, vitality
Peach/Coral → warmth, friendliness, joy | Orange → energy, harvest, vibrancy
Yellow/Gold → joy, hope, abundance | Sage → calm, nature, renewal, healing
Deep Green → groundedness, abundance | Dusty Blue → nostalgia, serenity, longing
Navy → depth, trust, quiet drama | Lavender/Lilac → spirituality, dreaming
Deep Purple/Plum → mystery, luxury, transformation
Charcoal/Black → drama, elegance, power | Rust/Terracotta → earthiness, warmth, harvest
Taupe/Greige → quiet luxury, neutrality | Silver → elegance, cool, winter magic

OUTPUT: Respond ONLY with valid JSON, no markdown fences:
{
  "items": [
    {
      "name": "string",
      "floral_type": "string",
      "color": "string",
      "category": "focal|filler|greenery|texture|accent",
      "quantity": number or null,
      "emotion_tags": ["tag1","tag2","tag3"],
      "primary_emotion": "string",
      "color_modifier": "brief description",
      "confidence": "high|medium|low"
    }
  ],
  "collection_summary": {
    "dominant_emotions": ["e1","e2","e3","e4"],
    "emotional_range": "string",
    "design_intent_suggestion": "1 sentence",
    "emotion_gaps": ["gap1","gap2"],
    "gap_note": "brief recommendation"
  }
}`;

export async function tagInventory(
  input: string,
  mode: 'inventory' | 'single'
): Promise<TaggerResult> {
  const userMessage =
    mode === 'single'
      ? `Tag this single floral item: "${input}"`
      : `Tag this inventory:\n\n${input}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: TAGGER_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const raw = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('\n');

  const cleaned = raw.replace(/```json|```/g, '').trim();
  return JSON.parse(cleaned) as TaggerResult;
}
```

---

## app/api/claude/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { canAccess } from '@/lib/tier';
import { tagInventory } from '@/lib/claude';
import type { Tier, InputMode } from '@/types/tagger';

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();

    // Verify auth
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's tier from profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('tier')
      .eq('id', session.user.id)
      .single();

    const userTier = (profile?.tier ?? 'bloom') as Tier;

    // Tier gate — tagging requires Craft+
    if (!canAccess(userTier, 'craft')) {
      return NextResponse.json(
        { error: 'Tagging requires Craft tier or above.', upgrade_required: 'craft' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { input, mode } = body as { input: string; mode: InputMode };

    if (!input?.trim()) {
      return NextResponse.json({ error: 'Input is required' }, { status: 400 });
    }

    // Bulk CSV upload requires Studio+
    if (mode === 'csv_bulk' && !canAccess(userTier, 'studio')) {
      return NextResponse.json(
        { error: 'Bulk CSV upload requires Studio tier.', upgrade_required: 'studio' },
        { status: 403 }
      );
    }

    const result = await tagInventory(input, mode === 'csv_bulk' ? 'inventory' : mode);

    // Persist session to Supabase
    await supabase.from('tag_sessions').insert({
      user_id: session.user.id,
      input_text: input,
      result,
      label: null,
    });

    return NextResponse.json({ result });
  } catch (err) {
    console.error('[/api/claude] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

## app/api/tags/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(_req: NextRequest) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('tag_sessions')
    .select('id, label, created_at, result->collection_summary')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, label } = await req.json();
  const { error } = await supabase
    .from('tag_sessions')
    .update({ label })
    .eq('id', id)
    .eq('user_id', session.user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
```

---

## components/ui/TierGate.tsx

```typescript
'use client';
import React from 'react';
import { TIER_LABELS } from '@/lib/tier';
import type { Tier } from '@/types/tagger';

interface TierGateProps {
  requiredTier: Tier;
  children: React.ReactNode;
}

export function TierGate({ requiredTier, children }: TierGateProps) {
  return (
    <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden' }}>
      {/* Blurred preview — always rendered, never hidden */}
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.4 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(249,247,244,0.92)',
        border: '1px dashed #D0D0D0',
        borderRadius: 10, gap: 8, padding: 20,
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 24 }}>🔒</span>
        <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 17, color: '#1A1A1A' }}>
          {TIER_LABELS[requiredTier]} Feature
        </div>
        <p style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>
          This feature is available on {TIER_LABELS[requiredTier]} and above.
        </p>
        <a
          href={`/upgrade?to=${requiredTier}`}
          style={{
            padding: '9px 20px', background: '#1A1A1A', color: 'white',
            borderRadius: 6, fontSize: 12, fontWeight: 600,
            textDecoration: 'none', marginTop: 4,
          }}
        >
          Upgrade to {TIER_LABELS[requiredTier]}
        </a>
      </div>
    </div>
  );
}
```

---

## hooks/useTier.ts

```typescript
'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import type { Tier } from '@/types/tagger';

export function useTier() {
  const [tier, setTier] = useState<Tier>('bloom');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('tier')
          .eq('id', session.user.id)
          .single();
        if (data?.tier) setTier(data.tier as Tier);
      }
      setLoading(false);
    });
  }, []);

  return { tier, loading };
}
```

---

## hooks/useTagger.ts

```typescript
'use client';
import { useState } from 'react';
import type { TaggerResult, InputMode } from '@/types/tagger';

export function useTagger() {
  const [result, setResult] = useState<TaggerResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runTag(input: string, mode: InputMode) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setResult(data.result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setResult(null);
    setError(null);
  }

  return { result, loading, error, runTag, clear };
}
```

---

## supabase/migrations/001_init.sql

```sql
-- profiles: one row per user, stores tier
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier        text NOT NULL DEFAULT 'bloom'
              CHECK (tier IN ('bloom','craft','studio','atelier')),
  email       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles: users can read own row"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles: users can update own row"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- tag_sessions: stores each tagging run
CREATE TABLE IF NOT EXISTS public.tag_sessions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  input_text  text NOT NULL,
  result      jsonb NOT NULL,
  label       text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tag_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tag_sessions: users can read own sessions"
  ON public.tag_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tag_sessions: users can insert own sessions"
  ON public.tag_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tag_sessions: users can update own sessions"
  ON public.tag_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "tag_sessions: users can delete own sessions"
  ON public.tag_sessions FOR DELETE USING (auth.uid() = user_id);

-- Index for faster history queries
CREATE INDEX IF NOT EXISTS tag_sessions_user_created
  ON public.tag_sessions(user_id, created_at DESC);
```

---

## .env.local.example

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_bloom_monthly_id
STRIPE_PRICE_CRAFT=price_craft_monthly_id
STRIPE_PRICE_STUDIO=price_studio_monthly_id
STRIPE_PRICE_ATELIER=price_atelier_monthly_id

# Anthropic — SERVER-SIDE ONLY. Never prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## package.json (relevant deps)

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@anthropic-ai/sdk": "^0.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "stripe": "^14.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/react": "^18.0.0",
    "@types/node": "^20.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```
