# Motion Engine — Next.js Production Scaffold
# Evercrafted App No. 12 | Atelier Tier
# ─────────────────────────────────────────────────

## FILE TREE

```
evercrafted/
├── app/
│   ├── app/
│   │   └── motion-engine/
│   │       └── page.tsx
│   └── api/
│       └── motion/
│           ├── emotion-detect/
│           │   └── route.ts
│           ├── brief/
│           │   └── route.ts
│           └── configs/
│               ├── route.ts
│               └── [id]/
│                   └── route.ts
├── components/
│   └── ui/
│       └── TierGate.tsx
├── hooks/
│   └── useTier.ts
├── lib/
│   ├── tier.ts
│   └── claude.ts
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_motion_engine.sql
└── .env.local.example
```

---

## lib/tier.ts

```typescript
// lib/tier.ts
// Tier system shared across all Evercrafted apps

export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier'

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
}

export const TIER_LABELS: Record<Tier, string> = {
  bloom: 'Bloom',
  craft: 'Craft',
  studio: 'Studio',
  atelier: 'Atelier',
}

export const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  bloom:   { bg: '#EEF2ED', text: '#4A6741' },
  craft:   { bg: '#EEF4F9', text: '#4A6785' },
  studio:  { bg: '#F5EEF4', text: '#7A4A85' },
  atelier: { bg: '#1A1A1A', text: '#F2EFE9' },
}

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier]
}

// Convenience helpers
export const isAtelier = (t: Tier) => t === 'atelier'
export const isStudioPlus = (t: Tier) => TIER_RANK[t] >= TIER_RANK['studio']
export const isCraftPlus = (t: Tier) => TIER_RANK[t] >= TIER_RANK['craft']
```

---

## lib/claude.ts

```typescript
// lib/claude.ts
// Typed Claude API wrapper — server-side only

import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!, // Never NEXT_PUBLIC_
})

const MODEL = 'claude-sonnet-4-20250514'

export interface EmotionDetectResult {
  emotion: string
  motionProfile: 'whisper' | 'breeze' | 'statement'
  motionType: 'sway' | 'rotation' | 'pulse'
  intensity: number
  rationale: string
}

export interface MotionBriefResult {
  emotionMapping: string
  recommendedProfile: 'whisper' | 'breeze' | 'statement'
  recommendedType: 'sway' | 'rotation' | 'pulse'
  intensity: number
  socialUse: string
  etsyUse: string
  shotList: string[]
}

const EMOTION_DETECT_SYSTEM = `You are Evercrafted's emotion-to-motion mapper. Given an emotion description, output ONLY valid JSON with no preamble, no markdown, no backticks:
{
  "emotion": "single word emotion tag",
  "motionProfile": "whisper|breeze|statement",
  "motionType": "sway|rotation|pulse",
  "intensity": number between 10 and 90,
  "rationale": "one sentence"
}
Rules:
- calm/soft/minimal → whisper (intensity 20–40)
- balanced/romantic/natural → breeze (intensity 45–65)
- dramatic/energetic/bold → statement (intensity 70–90)
- sway = default motion type
- pulse = soft romantic designs
- rotation = bold/dramatic statement pieces`

const MOTION_BRIEF_SYSTEM = `You are Evercrafted's Motion Director. Given a wreath design description or blueprint, produce a motion brief. Respond ONLY with valid JSON, no markdown, no backticks:
{
  "emotionMapping": "2-sentence emotion analysis of the design",
  "recommendedProfile": "whisper|breeze|statement",
  "recommendedType": "sway|rotation|pulse",
  "intensity": number between 10 and 90,
  "socialUse": "one sentence about best social platform and format",
  "etsyUse": "one sentence about Etsy listing application",
  "shotList": ["shot 1 description", "shot 2 description", "shot 3 description"]
}`

function parseJSON<T>(raw: string): T {
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean) as T
}

export async function detectEmotion(emotionText: string): Promise<EmotionDetectResult> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: EMOTION_DETECT_SYSTEM,
    messages: [{ role: 'user', content: `Emotion input: "${emotionText}"` }],
  })
  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
  return parseJSON<EmotionDetectResult>(raw)
}

export async function generateMotionBrief(design: string): Promise<MotionBriefResult> {
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: MOTION_BRIEF_SYSTEM,
    messages: [{ role: 'user', content: `Design: ${design}` }],
  })
  const raw = msg.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
  return parseJSON<MotionBriefResult>(raw)
}
```

---

## app/api/motion/emotion-detect/route.ts

```typescript
// app/api/motion/emotion-detect/route.ts
// Atelier-gated endpoint — maps emotion text to motion profile

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { canAccess, Tier } from '@/lib/tier'
import { detectEmotion } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tier check — Atelier only
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccess(profile.tier as Tier, 'atelier')) {
    return NextResponse.json(
      { error: 'Atelier subscription required for AI features.' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { emotion } = body

  if (!emotion || typeof emotion !== 'string') {
    return NextResponse.json({ error: 'emotion field required' }, { status: 400 })
  }

  try {
    const result = await detectEmotion(emotion)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[motion/emotion-detect]', err)
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 })
  }
}
```

---

## app/api/motion/brief/route.ts

```typescript
// app/api/motion/brief/route.ts
// Atelier-gated — generates full motion brief from blueprint/design description

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { canAccess, Tier } from '@/lib/tier'
import { generateMotionBrief } from '@/lib/claude'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profile || !canAccess(profile.tier as Tier, 'atelier')) {
    return NextResponse.json(
      { error: 'Atelier subscription required for motion briefs.' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { design } = body

  if (!design || typeof design !== 'string') {
    return NextResponse.json({ error: 'design field required' }, { status: 400 })
  }

  try {
    const brief = await generateMotionBrief(design)
    return NextResponse.json(brief)
  } catch (err) {
    console.error('[motion/brief]', err)
    return NextResponse.json({ error: 'Brief generation failed' }, { status: 500 })
  }
}
```

---

## app/api/motion/configs/route.ts

```typescript
// app/api/motion/configs/route.ts
// Studio+ gated — save and list motion configs

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { canAccess, Tier } from '@/lib/tier'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  if (!profile || !canAccess(profile.tier as Tier, 'studio')) {
    return NextResponse.json({ error: 'Studio+ required' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('motion_configs')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('tier').eq('id', user.id).single()
  if (!profile || !canAccess(profile.tier as Tier, 'studio')) {
    return NextResponse.json({ error: 'Studio+ required' }, { status: 403 })
  }

  const body = await req.json()
  const { motion_type, motion_profile, intensity, duration_seconds, fps, background, blueprint_id, config_json, brief_json } = body

  const { data, error } = await supabase
    .from('motion_configs')
    .insert({
      user_id: user.id,
      motion_type,
      motion_profile,
      intensity,
      duration_seconds: duration_seconds ?? 10,
      fps: fps ?? 30,
      background: background ?? '#F9F7F4',
      blueprint_id: blueprint_id ?? null,
      config_json: config_json ?? {},
      brief_json: brief_json ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
```

---

## components/ui/TierGate.tsx

```tsx
// components/ui/TierGate.tsx
// Renders children with blur overlay + upgrade CTA if user tier insufficient

'use client'

import { canAccess, TIER_LABELS, Tier } from '@/lib/tier'

interface TierGateProps {
  userTier: Tier
  requiredTier: Tier
  children: React.ReactNode
  featureName?: string
}

export function TierGate({ userTier, requiredTier, children, featureName }: TierGateProps) {
  const hasAccess = canAccess(userTier, requiredTier)

  if (hasAccess) return <>{children}</>

  return (
    <div style={{ position: 'relative' }}>
      {/* Show the feature — never hide it */}
      <div
        style={{
          pointerEvents: 'none',
          filter: 'blur(4px)',
          opacity: 0.4,
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        {children}
      </div>

      {/* Upgrade overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(249,247,244,0.7)',
          backdropFilter: 'blur(2px)',
          borderRadius: '14px',
        }}
      >
        <div
          style={{
            background: '#fff',
            border: '1.5px solid #D0D0D0',
            borderRadius: '14px',
            padding: '24px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
            maxWidth: '280px',
          }}
        >
          <div
            style={{
              fontFamily: "'Dancing Script', cursive",
              fontSize: '1.1rem',
              color: '#4A6741',
              marginBottom: '8px',
            }}
          >
            {TIER_LABELS[requiredTier]} Feature
          </div>
          {featureName && (
            <p style={{ fontSize: '0.875rem', color: '#4A4A4A', marginBottom: '4px', fontWeight: 600 }}>
              {featureName}
            </p>
          )}
          <p style={{ fontSize: '0.8125rem', color: '#787878', marginBottom: '16px' }}>
            Upgrade to {TIER_LABELS[requiredTier]} to unlock this feature.
          </p>
          <a
            href="/pricing"
            style={{
              display: 'inline-block',
              background: '#1A1A1A',
              color: '#fff',
              padding: '9px 20px',
              borderRadius: '8px',
              fontSize: '0.8125rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Upgrade Plan →
          </a>
        </div>
      </div>
    </div>
  )
}
```

---

## hooks/useTier.ts

```typescript
// hooks/useTier.ts
// Reads current user tier from Supabase session

'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Tier } from '@/lib/tier'

export function useTier() {
  const [tier, setTier] = useState<Tier>('bloom')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', user.id)
        .single()

      if (profile?.tier) setTier(profile.tier as Tier)
      setLoading(false)
    }
    load()
  }, [])

  return { tier, loading }
}
```

---

## supabase/migrations/001_init.sql

```sql
-- 001_init.sql
-- Profiles table — shared across all Evercrafted apps

create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  tier          text not null default 'bloom'
                  check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);
```

---

## supabase/migrations/002_motion_engine.sql

```sql
-- 002_motion_engine.sql
-- Motion Engine — motion_configs table

create table if not exists public.motion_configs (
  id                uuid default gen_random_uuid() primary key,
  user_id           uuid references auth.users(id) on delete cascade not null,
  blueprint_id      uuid references public.blueprints(id) on delete set null,
  motion_type       text not null check (motion_type in ('sway','rotation','pulse')),
  motion_profile    text not null check (motion_profile in ('whisper','breeze','statement')),
  intensity         integer not null check (intensity between 10 and 90),
  duration_seconds  integer not null default 10,
  fps               integer not null default 30,
  background        text not null default '#F9F7F4',
  render_url        text,
  config_json       jsonb not null default '{}',
  brief_json        jsonb,
  created_at        timestamptz default now() not null
);

-- Index for user lookups
create index motion_configs_user_id_idx on public.motion_configs(user_id);
create index motion_configs_blueprint_id_idx on public.motion_configs(blueprint_id);

-- RLS
alter table public.motion_configs enable row level security;

create policy "Users can view own motion configs"
  on public.motion_configs for select
  using (auth.uid() = user_id);

create policy "Users can insert own motion configs"
  on public.motion_configs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own motion configs"
  on public.motion_configs for update
  using (auth.uid() = user_id);

create policy "Users can delete own motion configs"
  on public.motion_configs for delete
  using (auth.uid() = user_id);
```

---

## .env.local.example

```bash
# ─── Supabase ───────────────────────────────────────────────────────────────
# Your Supabase project URL (safe to expose client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co

# Supabase anon key (safe to expose client-side)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase service role key — SERVER-SIDE ONLY, never NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ─── Stripe ─────────────────────────────────────────────────────────────────
# Stripe secret key — SERVER-SIDE ONLY
STRIPE_SECRET_KEY=sk_live_...

# Stripe webhook signing secret (from dashboard → webhooks)
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs for each tier (from Stripe dashboard → Products)
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# ─── Anthropic ──────────────────────────────────────────────────────────────
# Claude API key — SERVER-SIDE ONLY, NEVER add NEXT_PUBLIC_ prefix
ANTHROPIC_API_KEY=sk-ant-...

# ─── App ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://evercrafted.com
```
