# Evercrafted — Blueprint Generator SaaS Scaffold
## Next.js + Supabase + Stripe + Vercel

---

## File Tree

```
evercrafted-blueprint/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                        ← Marketing/redirect
│   ├── auth/
│   │   ├── login/page.tsx
│   │   └── callback/route.ts
│   ├── dashboard/
│   │   └── page.tsx                    ← App shell
│   └── api/
│       ├── claude/route.ts             ← AI proxy (server-side only)
│       ├── blueprints/route.ts         ← Save / list blueprints
│       └── stripe/
│           ├── checkout/route.ts
│           └── webhook/route.ts
├── components/
│   ├── ui/
│   │   ├── TierGate.tsx
│   │   └── Toast.tsx
│   ├── blueprint/
│   │   ├── BlueprintControls.tsx
│   │   ├── BlueprintDiagram.tsx
│   │   ├── PlacementTable.tsx
│   │   └── AIBlueprintPanel.tsx
│   └── layout/
│       ├── AppNav.tsx
│       └── Sidebar.tsx
├── hooks/
│   ├── useTier.ts
│   ├── useBlueprint.ts
│   └── useToast.ts
├── lib/
│   ├── tier.ts
│   ├── claude.ts
│   ├── supabase.ts
│   └── blueprint-engine.ts
├── supabase/
│   └── migrations/
│       ├── 001_profiles.sql
│       └── 002_blueprints.sql
├── styles/
│   └── globals.css
├── .env.local.example
├── next.config.ts
└── package.json
```

---

## Core Files

### `.env.local.example`
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic — NEVER expose client-side
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_bloom_id
STRIPE_PRICE_CRAFT=price_craft_id
STRIPE_PRICE_STUDIO=price_studio_id
STRIPE_PRICE_ATELIER=price_atelier_id

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

### `lib/tier.ts`
```typescript
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

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

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

// Blueprint Generator requires Studio+
export const BLUEPRINT_REQUIRED_TIER: Tier = 'studio';
// AI generation requires Atelier
export const AI_REQUIRED_TIER: Tier = 'atelier';
```

---

### `lib/claude.ts`
```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!, // server-side only
});

export const BLUEPRINT_SYSTEM_PROMPT = `You are the Evercrafted Blueprint Engine — an expert AI for wreath design.
Given a plain-English wreath description, return ONLY a JSON object (no markdown, no preamble):

{
  "size": <number inches>,
  "base": "grapevine" | "pine",
  "focal": { "count": <1-9>, "suggestions": ["flower1", "flower2"] },
  "filler": { "count": <1-20>, "suggestions": ["greenery1", "greenery2"] },
  "accent": { "count": <0-12>, "suggestions": ["accent1", "accent2"] },
  "placement": "golden" | "radial" | "cluster",
  "emotion": "<2-3 word emotional intent>",
  "midjourney_note": "<one-line Midjourney prompt tip>",
  "scores": {
    "emotion_fit": <0.0-1.0>,
    "dna_cohesion": <0.0-1.0>,
    "brand_alignment": <0.0-1.0>
  }
}

Rules:
- Never suggest cherry blossoms, pussy willow, or twig-based blossom florals
- Match element counts to wreath size (small=8-12 stems, medium=14-20, large=20-28)
- All recommendations must be buildable with faux florals`;

export interface BlueprintAIResult {
  size: number;
  base: 'grapevine' | 'pine';
  focal: { count: number; suggestions: string[] };
  filler: { count: number; suggestions: string[] };
  accent: { count: number; suggestions: string[] };
  placement: 'golden' | 'radial' | 'cluster';
  emotion: string;
  midjourney_note: string;
  scores: {
    emotion_fit: number;
    dna_cohesion: number;
    brand_alignment: number;
  };
}

export async function generateBlueprintFromDescription(
  description: string
): Promise<BlueprintAIResult> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: description }],
  });

  const text = message.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean) as BlueprintAIResult;
}
```

---

### `app/api/claude/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { canAccess, AI_REQUIRED_TIER } from '@/lib/tier';
import { generateBlueprintFromDescription } from '@/lib/claude';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Tier check
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (!profile || !canAccess(profile.tier, AI_REQUIRED_TIER)) {
    return NextResponse.json(
      { error: 'Upgrade to Atelier to use AI blueprint generation' },
      { status: 403 }
    );
  }

  // 3. Generate
  const { description } = await req.json();
  if (!description?.trim()) {
    return NextResponse.json({ error: 'Description required' }, { status: 400 });
  }

  try {
    const result = await generateBlueprintFromDescription(description);
    return NextResponse.json({ ok: true, blueprint: result });
  } catch (err) {
    console.error('Claude API error:', err);
    return NextResponse.json({ error: 'AI generation failed' }, { status: 500 });
  }
}
```

---

### `app/api/blueprints/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { canAccess, BLUEPRINT_REQUIRED_TIER } from '@/lib/tier';

// GET /api/blueprints — list user's blueprints
export async function GET(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('blueprints')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, blueprints: data });
}

// POST /api/blueprints — save a blueprint
export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('tier').eq('id', user.id).single();

  if (!profile || !canAccess(profile.tier, BLUEPRINT_REQUIRED_TIER)) {
    return NextResponse.json({ error: 'Upgrade to Studio to save blueprints' }, { status: 403 });
  }

  const { name, data: blueprintData } = await req.json();
  const { data, error } = await supabase
    .from('blueprints')
    .insert({ user_id: user.id, name, data: blueprintData })
    .select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, blueprint: data });
}
```

---

### `supabase/migrations/001_profiles.sql`
```sql
create table public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  email       text not null,
  tier        text not null default 'bloom'
                check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

### `supabase/migrations/002_blueprints.sql`
```sql
create table public.blueprints (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references public.profiles(id) on delete cascade not null,
  name        text not null default 'Untitled Blueprint',
  data        jsonb not null default '{}',
  genome      text,                     -- WGS genome string if generated
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- RLS
alter table public.blueprints enable row level security;

create policy "Users can CRUD own blueprints"
  on public.blueprints for all
  using (auth.uid() = user_id);

-- Index for fast lookup
create index blueprints_user_id_idx on public.blueprints(user_id);
```

---

### `components/ui/TierGate.tsx`
```tsx
'use client';
import { Tier, TIER_LABELS, canAccess } from '@/lib/tier';
import { useTier } from '@/hooks/useTier';

interface TierGateProps {
  required: Tier;
  children: React.ReactNode;
}

export function TierGate({ required, children }: TierGateProps) {
  const { tier } = useTier();

  if (canAccess(tier, required)) return <>{children}</>;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div className="tier-lock-overlay">
        <div className="lock-card">
          <div className="lock-icon">✦</div>
          <span className="lock-script">{TIER_LABELS[required]} only</span>
          <p>Upgrade to {TIER_LABELS[required]} to unlock this feature.</p>
          <a href="/pricing" className="lock-btn">
            Upgrade →
          </a>
        </div>
      </div>
    </div>
  );
}
```

---

### `hooks/useTier.ts`
```typescript
'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import { Tier } from '@/lib/tier';

export function useTier() {
  const [tier, setTier] = useState<Tier>('bloom');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('profiles')
      .select('tier')
      .single()
      .then(({ data }) => {
        if (data?.tier) setTier(data.tier as Tier);
        setLoading(false);
      });
  }, []);

  return { tier, loading };
}
```

---

### `lib/blueprint-engine.ts`
```typescript
export const GOLDEN_ANGLE = 137.507764;

export interface BlueprintState {
  diameter: number;
  base: 'grapevine' | 'pine';
  focal: number;
  filler: number;
  accent: number;
  placement: 'golden' | 'radial' | 'cluster';
}

export interface Placement {
  type: 'focal' | 'filler' | 'accent';
  idx: number;
  r: number;
  theta: number;
}

export function generatePlacements(state: BlueprintState): Placement[] {
  const R = state.diameter / 2;
  const outerR = R * 0.88;
  const total = state.focal + state.filler + state.accent;
  const elements: Array<{ type: 'focal' | 'filler' | 'accent'; idx: number }> = [];

  for (let i = 0; i < state.focal; i++)  elements.push({ type: 'focal', idx: i });
  for (let i = 0; i < state.filler; i++) elements.push({ type: 'filler', idx: i });
  for (let i = 0; i < state.accent; i++) elements.push({ type: 'accent', idx: i });

  const ringMap = {
    focal:  { rMin: outerR * 0.50, rMax: outerR * 0.80 },
    filler: { rMin: outerR * 0.30, rMax: outerR * 0.95 },
    accent: { rMin: outerR * 0.20, rMax: outerR * 0.88 },
  };

  const placements: Placement[] = [];

  if (state.placement === 'golden') {
    elements.forEach((el, i) => {
      const ring = ringMap[el.type];
      const t = i / Math.max(total - 1, 1);
      const r = ring.rMin + (ring.rMax - ring.rMin) * (el.type === 'filler' ? t : 0.5 + t * 0.15);
      const theta = (i * GOLDEN_ANGLE) % 360;
      placements.push({ ...el, r, theta });
    });
  }
  // radial + cluster patterns follow same logic as blueprint-app.html
  // (omitted for brevity — copy from lib source)

  return placements;
}

export function densityLabel(total: number): string {
  if (total < 10) return 'Light';
  if (total < 18) return 'Moderate';
  if (total < 26) return 'Full';
  return 'Dense';
}
```

---

## Deployment Checklist

```
[ ] 1. Create Supabase project
[ ] 2. Run migrations: 001_profiles.sql → 002_blueprints.sql
[ ] 3. Enable Supabase Auth (email + Google)
[ ] 4. Create Stripe products: Bloom / Craft / Studio / Atelier
[ ] 5. Copy Stripe price IDs to .env
[ ] 6. Set up Stripe webhook → /api/stripe/webhook
[ ] 7. Deploy to Vercel: connect GitHub repo
[ ] 8. Add all env vars to Vercel dashboard
[ ] 9. Set NEXT_PUBLIC_APP_URL to production URL
[ ] 10. Test: signup → profile created → tier gating → AI generation (Atelier)
```

---

## Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| View placement diagram | ✓ | ✓ | ✓ | ✓ |
| Preset designs (3) | ✓ | ✓ | ✓ | ✓ |
| Custom element counts | — | ✓ | ✓ | ✓ |
| Placement algorithms | — | ✓ | ✓ | ✓ |
| Save blueprints (cloud) | — | — | ✓ | ✓ |
| Unlimited saved blueprints | — | — | — | ✓ |
| AI blueprint from description | — | — | — | ✓ |
| AI element suggestions | — | — | — | ✓ |
| Export to PDF | — | ✓ | ✓ | ✓ |
| Midjourney prompt export | — | — | ✓ | ✓ |
| WGS genome string | — | — | ✓ | ✓ |

---

## Notes

- **ANTHROPIC_API_KEY** is server-side only. The `/api/claude` route acts as proxy.
- Stripe webhook updates `profiles.tier` when a subscription activates/cancels.
- `TierGate` component blurs content + shows upgrade CTA — never `display:none`.
- Genome string (WGS) generation integrates with the `wreath-genome-system` skill.
