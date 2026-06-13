# Next.js Production Scaffold — Prompt Engine

## File Tree

```
evercrafted-prompt-engine/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── api/
│       └── claude/
│           └── route.ts          ← Server-side proxy (auth + tier check)
├── components/
│   ├── ui/
│   │   ├── TierGate.tsx          ← Blur overlay + upgrade CTA
│   │   └── ScoreGrid.tsx         ← 7-dimension score display
│   ├── PromptBuilder.tsx         ← Main build UI
│   ├── PromptDebugger.tsx        ← Iterate/debug UI
│   └── PromptHistory.tsx         ← Session history
├── hooks/
│   └── useTier.ts                ← Reads tier from Supabase session
├── lib/
│   ├── tier.ts                   ← Tier logic
│   ├── claude.ts                 ← Typed Claude wrapper
│   └── prompts.ts                ← System prompts for each mode
├── supabase/
│   └── migrations/
│       └── 001_init.sql          ← Schema + RLS
└── .env.local.example
```

---

## app/api/claude/route.ts

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { TIER_RANK, canAccess } from '@/lib/tier';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  // 1. Auth check
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const token = authHeader.split(' ')[1];

  // 2. Verify session + get tier from Supabase
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  const userTier = profile?.tier || 'bloom';

  // 3. Parse request body
  const body = await req.json();
  const { mode, messages, systemPrompt, requiredTier = 'bloom' } = body;

  // 4. Tier gate
  if (!canAccess(userTier, requiredTier)) {
    return NextResponse.json(
      { error: `This feature requires ${requiredTier} tier or higher.` },
      { status: 403 }
    );
  }

  // 5. Call Claude
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages,
    });
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    // 6. Log usage
    await supabase.from('prompt_history').insert({
      user_id: user.id,
      mode,
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
    });

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
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

// Feature gates for Prompt Engine
export const PROMPT_ENGINE_GATES = {
  buildPrompt:    'bloom',    // All tiers
  debugPrompt:    'craft',    // Craft+
  scoreAnalyze:   'studio',   // Studio+
  batchVariations:'atelier',  // Atelier only
  saveHistory:    'craft',    // Craft+
} as const;
```

---

## lib/claude.ts

```typescript
import { MJ_BUILD_SYSTEM_PROMPT, MJ_DEBUG_SYSTEM_PROMPT } from './prompts';

interface ClaudeRequest {
  mode: 'build' | 'debug' | 'score' | 'batch';
  messages: { role: 'user' | 'assistant'; content: string }[];
  sessionToken: string;
}

interface ClaudeResponse {
  text: string;
  error?: string;
}

export async function callPromptEngine(req: ClaudeRequest): Promise<ClaudeResponse> {
  const systemPrompt = req.mode === 'debug' ? MJ_DEBUG_SYSTEM_PROMPT : MJ_BUILD_SYSTEM_PROMPT;
  const requiredTier = req.mode === 'batch' ? 'atelier'
    : req.mode === 'score' ? 'studio'
    : req.mode === 'debug' ? 'craft'
    : 'bloom';

  const res = await fetch('/api/claude', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${req.sessionToken}`,
    },
    body: JSON.stringify({
      mode: req.mode,
      messages: req.messages,
      systemPrompt,
      requiredTier,
    }),
  });

  const data = await res.json();
  if (!res.ok) return { text: '', error: data.error };
  return { text: data.text };
}
```

---

## lib/prompts.ts

```typescript
export const MJ_BUILD_SYSTEM_PROMPT = `You are a Midjourney V7 expert prompt engineer.
Transform user image descriptions into production-ready V7 prompts.

OUTPUT: Respond ONLY with valid JSON:
{
  "paste_prompt": "full paste-ready prompt with params",
  "machine_breakdown": "labeled token breakdown",
  "scores": { "subject":N, "lighting":N, "color":N, "mood":N, "composition":N, "material":N, "spatial":N },
  "score_notes": { "subject":"note", ... },
  "gaps": ["dim names below 7"],
  "iteration_notes": "2-3 sentences on what to try if output misses"
}

RULES:
- Subject first — never open with style or adjectives
- --style raw for all photorealism/product work
- Prose prompt max 75 words
- Use --no for exclusions
- Evercrafted wreaths: always include "complete absence of plastic sheen, soft matte petals, gallery-quality product documentation, not illustration"`;

export const MJ_DEBUG_SYSTEM_PROMPT = `You are a Midjourney V7 expert who diagnoses and fixes failing prompts.

FAILURE MODE CODES: FM-01 through FM-16, EC-01 through EC-06 (Evercrafted-specific).

OUTPUT: Respond ONLY with valid JSON:
{
  "failure_modes": ["FM codes"],
  "root_cause": "explanation",
  "fixed_prompt": "rewritten paste-ready prompt with params",
  "changes_made": ["list of changes"]
}`;
```

---

## components/ui/TierGate.tsx

```typescript
'use client';
import { canAccess, TIER_LABELS, type Tier } from '@/lib/tier';

interface TierGateProps {
  userTier: Tier;
  requiredTier: Tier;
  children: React.ReactNode;
}

export function TierGate({ userTier, requiredTier, children }: TierGateProps) {
  if (canAccess(userTier, requiredTier)) return <>{children}</>;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', userSelect: 'none' }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'rgba(249,247,244,0.85)',
        backdropFilter: 'blur(2px)',
        borderRadius: 6,
        gap: 8,
      }}>
        <span style={{ fontSize: 24 }}>🔒</span>
        <p style={{ fontSize: 13, fontWeight: 500, color: '#2E2E2E' }}>
          Requires {TIER_LABELS[requiredTier]} tier
        </p>
        <a
          href="/upgrade"
          style={{
            fontSize: 12, color: '#4A6741',
            border: '1px solid #4A6741',
            borderRadius: 20, padding: '4px 16px',
            textDecoration: 'none', fontWeight: 500,
          }}
        >
          Upgrade
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
import { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Tier } from '@/lib/tier';

export function useTier() {
  const [tier, setTier] = useState<Tier>('bloom');
  const [loading, setLoading] = useState(true);
  const supabase = createClientComponentClient();

  useEffect(() => {
    async function fetchTier() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }
      const { data } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', session.user.id)
        .single();
      if (data?.tier) setTier(data.tier as Tier);
      setLoading(false);
    }
    fetchTier();
  }, []);

  return { tier, loading };
}
```

---

## supabase/migrations/001_init.sql

```sql
-- Profiles table (extends Supabase auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  tier text not null default 'bloom' check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Prompt history
create table public.prompt_history (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  mode text not null check (mode in ('build','debug','score','batch')),
  brief text,
  paste_prompt text,
  scores jsonb,
  input_tokens int,
  output_tokens int,
  created_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;
alter table public.prompt_history enable row level security;

create policy "Users read own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users read own history"
  on public.prompt_history for select using (auth.uid() = user_id);

create policy "Users insert own history"
  on public.prompt_history for insert with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

---

## .env.local.example

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # Server-side only

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# Anthropic — NEVER use NEXT_PUBLIC_ prefix — server-side only
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```
