// ════════════════════════════════════════════════════════════
// EVERCRAFTED — Memory-to-Masterpiece Studio
// Next.js Production Scaffold
// ════════════════════════════════════════════════════════════
//
// FILE TREE:
//   app/api/claude/route.ts
//   app/api/blueprints/route.ts
//   app/api/blueprints/[id]/route.ts
//   app/api/stripe/checkout/route.ts
//   app/api/stripe/webhook/route.ts
//   lib/tier.ts
//   lib/claude.ts
//   lib/supabase.ts
//   components/ui/TierGate.tsx
//   hooks/useTier.ts
//   hooks/useBlueprint.ts
//   supabase/migrations/001_init.sql
//   .env.local.example
// ════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────
// FILE: .env.local.example
// ─────────────────────────────────────────────────────────────
/*
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

# Anthropic — NEVER expose as NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...

# App
NEXT_PUBLIC_APP_URL=https://studio.evercrafted.com
*/


// ─────────────────────────────────────────────────────────────
// FILE: supabase/migrations/001_init.sql
// ─────────────────────────────────────────────────────────────
/*
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- PROFILES
CREATE TABLE profiles (
  id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                 text,
  tier                  text NOT NULL DEFAULT 'bloom'
                          CHECK (tier IN ('bloom','craft','studio','atelier')),
  stripe_customer_id    text,
  stripe_subscription_id text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_self_rw" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();


-- BLUEPRINTS
CREATE TABLE blueprints (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title             text,
  memory_text       text,
  occasion          text,
  emotions          jsonb,
  glyphs            text[],
  story             text,
  blueprint_intent  jsonb,
  floral_recipe     jsonb,
  genome_string     text,
  mj_prompt         text,
  aesthetic_score   integer,
  schema_version    text NOT NULL DEFAULT '1.0',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "blueprint_owner_rw" ON blueprints
  FOR ALL
  USING (auth.uid() = owner_uid)
  WITH CHECK (auth.uid() = owner_uid);

CREATE INDEX idx_blueprints_owner ON blueprints(owner_uid);
*/


// ─────────────────────────────────────────────────────────────
// FILE: lib/tier.ts
// ─────────────────────────────────────────────────────────────
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

export const STRIPE_PRICE_IDS: Record<Tier, string> = {
  bloom:   process.env.STRIPE_PRICE_BLOOM   ?? '',
  craft:   process.env.STRIPE_PRICE_CRAFT   ?? '',
  studio:  process.env.STRIPE_PRICE_STUDIO  ?? '',
  atelier: process.env.STRIPE_PRICE_ATELIER ?? '',
};

export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}


// ─────────────────────────────────────────────────────────────
// FILE: lib/claude.ts
// ─────────────────────────────────────────────────────────────
import Anthropic from '@anthropic-ai/sdk';
import type { Tier } from './tier';

// Server-side only — never import this in client components
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ClaudeCallOptions {
  messages: Anthropic.MessageParam[];
  systemPrompt: string;
  requiredTier?: Tier;
  maxTokens?: number;
}

export const SYSTEM_PROMPTS = {
  emotionAnalyzer: `You are the Memory-to-Masterpiece AI for Evercrafted, an emotional wreath design platform.
Analyze the user's memory text and extract:
1. 3-5 primary emotions with intensity (0–1)
2. 3-5 design glyphs from: quiet_strength, grief, threshold, circle_of_life, journey, veil, warmth, nostalgia, celebration, rootedness
3. A brief poetic design story (2–3 sentences, first-person plural "we", evocative)
Respond ONLY with valid JSON, no markdown fences:
{"emotions":[{"label":"string","intensity":0.0}],"glyphs":["string"],"story":"string"}`,

  blueprintComposer: `You are the Blueprint Composition Engine for Evercrafted.
Generate a BlueprintIntent and FloralRecipeDraft for the provided wreath parameters and emotional data.
Suggest realistic faux floral names (dahlias, eucalyptus, cotton stems, etc.) matching the emotional palette.
Include 2 focal, 2 secondary, 3 filler, 2 greenery entries. Use the WGS genome format: EC-{size}{style}-{density}-{emotion codes}-F:{skus}-S:{skus}-FL:{skus}-GR:{skus}
Respond ONLY with valid JSON, no markdown fences.`,

  promptCompiler: `You are the Evercrafted Prompt Compiler. Generate a single production-ready Midjourney render prompt.
STYLE DNA (enforce always):
- 24-inch asymmetric form, 3–5 tight floral clusters
- Warm directional light upper-left, shallow depth of field
- Photorealistic faux florals, editorial product photography, neutral linen surface
- Append: --ar 1:1 --stylize 750 --v 6.1
FORBIDDEN: cherry blossoms, pussy willow, twig-based blossoms
Respond with ONLY the raw prompt string.`,
};

export async function callClaudeServer(options: ClaudeCallOptions): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: options.maxTokens ?? 1000,
    system: options.systemPrompt,
    messages: options.messages,
  });
  return response.content
    .filter(b => b.type === 'text')
    .map(b => (b as Anthropic.TextBlock).text)
    .join('\n');
}


// ─────────────────────────────────────────────────────────────
// FILE: lib/supabase.ts
// ─────────────────────────────────────────────────────────────
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name, value, options) { cookieStore.set({ name, value, ...options }); },
        remove(name, options) { cookieStore.set({ name, value: '', ...options }); },
      },
    }
  );
}

// Service-role client for webhook / admin use only
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);


// ─────────────────────────────────────────────────────────────
// FILE: app/api/claude/route.ts
// ─────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { callClaudeServer, SYSTEM_PROMPTS } from '@/lib/claude';
import { canAccess, TIER_RANK } from '@/lib/tier';
import type { Tier } from '@/lib/tier';

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { messages, promptKey, requiredTier, maxTokens } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    promptKey: keyof typeof SYSTEM_PROMPTS;
    requiredTier: Tier;
    maxTokens?: number;
  };

  const { data: profile } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', session.user.id)
    .single();

  if (!profile || !canAccess(profile.tier as Tier, requiredTier)) {
    return NextResponse.json(
      { error: 'Tier insufficient', requiredTier, userTier: profile?.tier },
      { status: 403 }
    );
  }

  const systemPrompt = SYSTEM_PROMPTS[promptKey];
  if (!systemPrompt) {
    return NextResponse.json({ error: 'Unknown prompt key' }, { status: 400 });
  }

  const result = await callClaudeServer({ messages, systemPrompt, maxTokens });
  return NextResponse.json({ result });
}


// ─────────────────────────────────────────────────────────────
// FILE: app/api/blueprints/route.ts
// ─────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('blueprints')
    .select('id, title, memory_text, created_at, aesthetic_score, genome_string')
    .eq('owner_uid', session.user.id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ blueprints: data });
}

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();

  const { data, error } = await supabase
    .from('blueprints')
    .insert({ ...body, owner_uid: session.user.id })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}


// ─────────────────────────────────────────────────────────────
// FILE: app/api/stripe/webhook/route.ts
// ─────────────────────────────────────────────────────────────
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '@/lib/supabase';
import { STRIPE_PRICE_IDS } from '@/lib/tier';
import type { Tier } from '@/lib/tier';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_TIER = Object.fromEntries(
  (Object.entries(STRIPE_PRICE_IDS) as [Tier, string][]).map(([t, p]) => [p, t])
) as Record<string, Tier>;

export async function POST(req: Request) {
  const payload = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  if (event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.created') {
    const sub = event.data.object as Stripe.Subscription;
    const priceId = sub.items.data[0]?.price.id;
    const tier = PRICE_TO_TIER[priceId] ?? 'bloom';

    await supabaseAdmin
      .from('profiles')
      .update({ tier, stripe_subscription_id: sub.id })
      .eq('stripe_customer_id', sub.customer as string);
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    await supabaseAdmin
      .from('profiles')
      .update({ tier: 'bloom', stripe_subscription_id: null })
      .eq('stripe_customer_id', sub.customer as string);
  }

  return NextResponse.json({ received: true });
}


// ─────────────────────────────────────────────────────────────
// FILE: components/ui/TierGate.tsx
// ─────────────────────────────────────────────────────────────
'use client';

import { useTier } from '@/hooks/useTier';
import { canAccess } from '@/lib/tier';
import type { Tier } from '@/lib/tier';

interface TierGateProps {
  requiredTier: Tier;
  children: React.ReactNode;
  upgradeMessage?: string;
}

export function TierGate({ requiredTier, children, upgradeMessage }: TierGateProps) {
  const { tier } = useTier();
  const unlocked = tier ? canAccess(tier, requiredTier) : false;

  return (
    <div style={{ position: 'relative' }}>
      {children}
      {/* Always render children — blur overlay when locked, never display:none */}
      {!unlocked && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            background: 'rgba(249,247,244,0.75)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: 'var(--ec-white)',
              border: '1px solid var(--ec-border)',
              padding: '28px 36px',
              textAlign: 'center',
              maxWidth: 340,
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 12 }}>🔒</div>
            <div
              style={{
                fontFamily: 'Cormorant Garamond, serif',
                fontSize: 20,
                fontWeight: 400,
                marginBottom: 8,
              }}
            >
              {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)} Feature
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 12,
                color: 'var(--ec-ink)',
                lineHeight: 1.65,
                marginBottom: 20,
              }}
            >
              {upgradeMessage ?? `This feature requires the ${requiredTier} plan or higher.`}
            </div>
            <button
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                background: 'var(--ec-black)',
                color: 'var(--ec-off-white)',
                border: 'none',
                padding: '12px 28px',
                cursor: 'pointer',
              }}
              onClick={() => window.location.href = '/upgrade'}
            >
              Upgrade to {requiredTier.charAt(0).toUpperCase() + requiredTier.slice(1)}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─────────────────────────────────────────────────────────────
// FILE: hooks/useTier.ts
// ─────────────────────────────────────────────────────────────
'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Tier } from '@/lib/tier';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function useTier() {
  const [tier, setTier] = useState<Tier | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data } = await supabase
        .from('profiles')
        .select('tier')
        .eq('id', session.user.id)
        .single();

      setTier((data?.tier as Tier) ?? 'bloom');
      setLoading(false);
    }
    load();
  }, []);

  return { tier, loading };
}


// ─────────────────────────────────────────────────────────────
// FILE: hooks/useBlueprint.ts
// ─────────────────────────────────────────────────────────────
'use client';

import { useState } from 'react';

export interface BlueprintState {
  memoryText: string;
  occasion: string;
  wreathSize: number;
  density: 'light' | 'medium' | 'lush';
  compositionStyle: 'full' | 'crescent' | 'sideCluster';
  emotions: { label: string; intensity: number }[];
  glyphs: string[];
  story: string;
  blueprintIntent: Record<string, unknown> | null;
  floralRecipe: { role: string; name: string; pieces: number; emotionSource: string }[];
  genomeString: string;
  mjPrompt: string;
  aestheticScore: number | null;
  savedId: string | null;
}

const INITIAL: BlueprintState = {
  memoryText: '',
  occasion: '',
  wreathSize: 24,
  density: 'medium',
  compositionStyle: 'crescent',
  emotions: [],
  glyphs: [],
  story: '',
  blueprintIntent: null,
  floralRecipe: [],
  genomeString: '',
  mjPrompt: '',
  aestheticScore: null,
  savedId: null,
};

export function useBlueprint() {
  const [state, setState] = useState<BlueprintState>(INITIAL);
  const [saving, setSaving] = useState(false);

  function update(partial: Partial<BlueprintState>) {
    setState(s => ({ ...s, ...partial }));
  }

  function reset() {
    setState(INITIAL);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/blueprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: state.memoryText.slice(0, 60) + '…',
          memory_text: state.memoryText,
          occasion: state.occasion,
          emotions: state.emotions,
          glyphs: state.glyphs,
          story: state.story,
          blueprint_intent: state.blueprintIntent,
          floral_recipe: state.floralRecipe,
          genome_string: state.genomeString,
          mj_prompt: state.mjPrompt,
          aesthetic_score: state.aestheticScore,
        }),
      });
      const { id } = await res.json();
      update({ savedId: id });
    } finally {
      setSaving(false);
    }
  }

  return { state, update, reset, save, saving };
}
