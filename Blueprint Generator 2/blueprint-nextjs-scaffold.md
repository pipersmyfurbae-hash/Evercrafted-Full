# Evercrafted Blueprint Generator — Next.js SaaS Scaffold
## File Tree + Full Code

---

## Directory Structure

```
evercrafted-blueprint/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    ← marketing landing page redirect
│   ├── app/
│   │   └── blueprint/
│   │       └── page.tsx            ← main app page (auth-gated)
│   └── api/
│       ├── claude/
│       │   └── route.ts            ← server-side Claude proxy
│       ├── blueprints/
│       │   └── route.ts            ← CRUD for saved blueprints
│       └── stripe/
│           ├── checkout/
│           │   └── route.ts
│           └── webhook/
│               └── route.ts
├── components/
│   └── ui/
│       ├── TierGate.tsx
│       ├── Toast.tsx
│       └── BlueprintApp.tsx        ← main app component
├── hooks/
│   └── useTier.ts
├── lib/
│   ├── tier.ts
│   ├── claude.ts
│   └── supabase.ts
├── supabase/
│   └── migrations/
│       └── 001_init.sql
├── .env.local.example
└── package.json
```

---

## FILE: .env.local.example

```env
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

# Anthropic — NEVER expose client-side
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## FILE: lib/tier.ts

```typescript
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export const TIER_RANK: Record<Tier, number> = {
  bloom:   1,
  craft:   2,
  studio:  3,
  atelier: 4,
};

export const TIER_LABELS: Record<Tier, string> = {
  bloom:   'Bloom',
  craft:   'Craft',
  studio:  'Studio',
  atelier: 'Atelier',
};

export const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  bloom:   { bg: '#EEF2ED', text: '#4A6741' },
  craft:   { bg: '#EEF4F9', text: '#4A6785' },
  studio:  { bg: '#F5EEF4', text: '#7A4A85' },
  atelier: { bg: '#1A1A1A', text: '#F2EFE9' },
};

export const TIER_PRICES: Record<Tier, string> = {
  bloom:   process.env.STRIPE_PRICE_BLOOM   || '',
  craft:   process.env.STRIPE_PRICE_CRAFT   || '',
  studio:  process.env.STRIPE_PRICE_STUDIO  || '',
  atelier: process.env.STRIPE_PRICE_ATELIER || '',
};

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}
```

---

## FILE: lib/claude.ts

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // server-side only
});

export interface BlueprintRequest {
  description: string;
}

export interface BlueprintResponse {
  diameter: number;
  base: 'grapevine' | 'pine';
  focal_count: number;
  filler_count: number;
  accent_count: number;
  placement: 'golden' | 'radial' | 'cluster';
  floral_suggestions: Array<{
    type: 'focal' | 'filler' | 'accent';
    name: string;
    color: string;
    count: number;
  }>;
  emotion_tags: string[];
  design_notes: string;
}

const BLUEPRINT_SYSTEM_PROMPT = `You are the Evercrafted Blueprint Engine. Given a wreath description, return a JSON blueprint with:
- diameter (inches, integer 8-48)
- base (grapevine|pine)
- focal_count (1-9)
- filler_count (1-20)
- accent_count (0-12)
- placement (golden|radial|cluster)
- floral_suggestions: array of { type (focal|filler|accent), name, color, count }
- emotion_tags: array of emotion strings (max 4)
- design_notes: one paragraph plain English description

Rules:
- Cherry blossoms, pussy willow, and twig-based blossom florals are permanently prohibited
- All storytelling uses gender-neutral language
- Respond ONLY with valid JSON. No markdown, no explanation, no code fences.`;

const SUGGEST_SYSTEM_PROMPT = `You are a professional faux floral designer specializing in wreaths. 
Suggest 5-8 specific faux floral elements. Return a JSON array of { name, type (focal|filler|accent), color, why (one sentence) }.
Prohibited: cherry blossoms, pussy willow, twig-based blossom florals.
JSON only, no markdown.`;

export async function generateBlueprint(description: string): Promise<BlueprintResponse> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Design a wreath blueprint for: "${description}"` }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  return JSON.parse(text.replace(/```json|```/g, '').trim()) as BlueprintResponse;
}

export async function suggestElements(description: string) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 800,
    system: SUGGEST_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Suggest floral elements for: "${description}"` }],
  });

  const text = response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('');

  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
```

---

## FILE: app/api/claude/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccess } from '@/lib/tier';
import { generateBlueprint, suggestElements } from '@/lib/claude';
import type { Tier } from '@/lib/tier';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Tier check — Claude API requires Atelier
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = (profile?.tier || 'bloom') as Tier;
  if (!canAccess(userTier, 'atelier')) {
    return NextResponse.json({ error: 'Atelier tier required' }, { status: 403 });
  }

  const body = await req.json();
  const { action, description } = body;

  try {
    if (action === 'generate_blueprint') {
      const result = await generateBlueprint(description);
      return NextResponse.json({ ok: true, data: result });
    }
    if (action === 'suggest_elements') {
      const result = await suggestElements(description);
      return NextResponse.json({ ok: true, data: result });
    }
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('[claude/route]', err);
    return NextResponse.json({ error: 'Claude API error' }, { status: 500 });
  }
}
```

---

## FILE: app/api/blueprints/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { canAccess } from '@/lib/tier';
import type { Tier } from '@/lib/tier';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getUser(req: NextRequest) {
  const token = req.headers.get('Authorization')?.split(' ')[1];
  if (!token) return null;
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// GET /api/blueprints — list user's blueprints
export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('blueprints')
    .select('id, name, created_at, data')
    .eq('owner_uid', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, blueprints: data });
}

// POST /api/blueprints — save new blueprint
export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Craft+ required for cloud save
  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single();
  if (!canAccess((profile?.tier || 'bloom') as Tier, 'craft')) {
    return NextResponse.json({ error: 'Craft tier required' }, { status: 403 });
  }

  const body = await req.json();
  const { name, data } = body;

  const { data: saved, error } = await supabase
    .from('blueprints')
    .insert({ owner_uid: user.id, name, data })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, blueprint: saved });
}
```

---

## FILE: supabase/migrations/001_init.sql

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (synced from auth.users via trigger)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  tier         TEXT NOT NULL DEFAULT 'bloom'
                 CHECK (tier IN ('bloom','craft','studio','atelier')),
  stripe_id    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Blueprints table
CREATE TABLE blueprints (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_uid    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Untitled Blueprint',
  data         JSONB NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX blueprints_owner_idx ON blueprints(owner_uid);
CREATE INDEX blueprints_created_idx ON blueprints(created_at DESC);

-- RLS
ALTER TABLE profiles   ENABLE ROW LEVEL SECURITY;
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update their own
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

-- Blueprints: users can CRUD their own only
CREATE POLICY "blueprints_own" ON blueprints
  FOR ALL USING (owner_uid = auth.uid());

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER blueprints_updated_at
  BEFORE UPDATE ON blueprints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## FILE: hooks/useTier.ts

```typescript
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Tier } from '@/lib/tier';

export function useTier() {
  const [tier, setTier] = useState<Tier>('bloom');
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single();

      if (data?.tier) setTier(data.tier as Tier);
      setLoading(false);
    }
    load();
  }, [supabase]);

  return { tier, loading };
}
```

---

## FILE: components/ui/TierGate.tsx

```typescript
import { canAccess, TIER_LABELS } from '@/lib/tier';
import type { Tier } from '@/lib/tier';

interface TierGateProps {
  userTier: Tier;
  requiredTier: Tier;
  children: React.ReactNode;
  featureName: string;
  featureDesc?: string;
}

export function TierGate({
  userTier, requiredTier, children, featureName, featureDesc
}: TierGateProps) {
  if (canAccess(userTier, requiredTier)) return <>{children}</>;

  return (
    <div style={{ position: 'relative', minHeight: '200px' }}>
      {/* Blurred preview — always visible, never display:none */}
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none', opacity: 0.5 }}>
        {children}
      </div>
      {/* Lock overlay */}
      <div style={{
        position: 'absolute', inset: 0, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(249,247,244,0.9)', backdropFilter: 'blur(4px)',
      }}>
        <div style={{
          background: '#fff', border: '1px solid #E8E8E8',
          padding: '28px 32px', textAlign: 'center', maxWidth: '300px',
          boxShadow: '0 4px 24px rgba(0,0,0,.08)',
        }}>
          <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>✦</div>
          <div style={{ fontFamily: 'Dancing Script', fontSize: '1.1rem', color: '#4A6741' }}>
            {TIER_LABELS[requiredTier]} Feature
          </div>
          <div style={{ fontFamily: 'Cormorant Garamond', fontSize: '1.05rem', margin: '8px 0 6px' }}>
            {featureName}
          </div>
          {featureDesc && (
            <div style={{ fontSize: '.75rem', color: '#4A4A4A', lineHeight: 1.6, marginBottom: '18px' }}>
              {featureDesc}
            </div>
          )}
          <a
            href="/pricing"
            style={{
              display: 'inline-block', background: '#1A1A1A', color: '#fff',
              padding: '10px 22px', fontSize: '.7rem', fontWeight: 500,
              letterSpacing: '.08em', textTransform: 'uppercase', textDecoration: 'none',
            }}
          >
            Upgrade to {TIER_LABELS[requiredTier]}
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

## FILE: package.json (key deps)

```json
{
  "name": "evercrafted-blueprint",
  "version": "1.0.0",
  "dependencies": {
    "next": "14.x",
    "react": "18.x",
    "react-dom": "18.x",
    "@anthropic-ai/sdk": "^0.20.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "stripe": "^14.0.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  }
}
```
