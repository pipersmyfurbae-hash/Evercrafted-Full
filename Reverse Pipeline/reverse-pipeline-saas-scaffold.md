# Reverse Pipeline — SaaS Scaffold
## Evercrafted | Next.js 14 + Supabase + Stripe

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Server components, API routes, edge-ready |
| Auth | Supabase Auth | Row-level security, instant user management |
| Database | Supabase Postgres | Blueprint storage, usage tracking |
| Billing | Stripe (Checkout + Webhooks) | Subscription tiers + metered usage |
| AI | Anthropic Claude Vision API | claude-sonnet-4 vision pass |
| Storage | Supabase Storage | User-uploaded wreath images |
| Styling | Tailwind CSS | Evercrafted brand tokens via `tailwind.config` |
| Deploy | Vercel | Edge functions, auto-deploy from GitHub |

---

## Project Structure

```
reverse-pipeline/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx              ← Landing page (website)
│   │   ├── pricing/page.tsx      ← Pricing page
│   │   └── layout.tsx
│   ├── (app)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx          ← Usage overview + recent blueprints
│   │   │   └── layout.tsx        ← App shell sidebar
│   │   ├── analyze/
│   │   │   └── page.tsx          ← Main Reverse Pipeline tool UI
│   │   ├── blueprints/
│   │   │   ├── page.tsx          ← Blueprint library
│   │   │   └── [id]/page.tsx     ← Single blueprint detail
│   │   └── settings/
│   │       ├── page.tsx          ← Account + billing
│   │       └── billing/page.tsx
│   ├── api/
│   │   ├── analyze/route.ts      ← POST: vision analysis + blueprint compile
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts ← Create Stripe checkout session
│   │   │   └── webhook/route.ts  ← Handle subscription events
│   │   └── blueprints/
│   │       ├── route.ts          ← GET list, POST save
│   │       └── [id]/route.ts     ← GET / DELETE single blueprint
│   └── layout.tsx
├── components/
│   ├── analyze/
│   │   ├── UploadZone.tsx        ← Drag-drop image upload
│   │   ├── AnalyzePanel.tsx      ← Left panel (input + config)
│   │   ├── OutputTabs.tsx        ← Right panel (visual/json/prompt tabs)
│   │   ├── BlueprintVisual.tsx   ← Visual summary with stats + BOM table
│   │   ├── ProgressTracker.tsx   ← Analysis progress bar + status
│   │   └── DetectionSummary.tsx  ← Detected elements sidebar cards
│   ├── blueprints/
│   │   ├── BlueprintCard.tsx     ← Library card (thumbnail + metadata)
│   │   ├── BlueprintTable.tsx    ← BOM table with SKU editing
│   │   └── BlueprintExport.tsx   ← Copy / download / share actions
│   ├── billing/
│   │   ├── TierBadge.tsx         ← Current tier display
│   │   ├── UsageBar.tsx          ← Analyses used / limit
│   │   ├── UpgradeModal.tsx      ← Tier upgrade CTA modal
│   │   └── PricingCards.tsx      ← Tier selection cards
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Panel.tsx
│       ├── Badge.tsx
│       └── Topbar.tsx
├── lib/
│   ├── anthropic.ts              ← Anthropic client (server-only)
│   ├── supabase/
│   │   ├── client.ts             ← Browser Supabase client
│   │   ├── server.ts             ← Server Supabase client (cookies)
│   │   └── middleware.ts         ← Session refresh middleware
│   ├── stripe.ts                 ← Stripe client + tier config
│   ├── blueprint.ts              ← Blueprint compile logic (buildBlueprint, buildMJPrompt)
│   └── vision.ts                 ← Vision prompt + JSON extraction
├── hooks/
│   ├── useAnalyze.ts             ← Analysis state machine
│   ├── useBlueprints.ts          ← Blueprint CRUD + SWR caching
│   └── useTier.ts                ← Current user tier + usage
├── middleware.ts                 ← Auth guard + tier gate
├── types/
│   ├── blueprint.ts              ← Blueprint, BOM, Placement types
│   ├── tier.ts                   ← Tier enum + limits
│   └── analysis.ts               ← VisionAnalysis response type
├── supabase/
│   └── migrations/
│       ├── 001_blueprints.sql
│       ├── 002_usage.sql
│       └── 003_subscriptions.sql
└── tailwind.config.ts            ← Evercrafted brand tokens
```

---

## Database Schema

### blueprints
```sql
CREATE TABLE blueprints (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL DEFAULT 'Reverse-Engineered Wreath',
  method       TEXT NOT NULL DEFAULT 'vision-analysis',
  image_url    TEXT,
  blueprint    JSONB NOT NULL,
  analysis     JSONB,
  confidence   FLOAT DEFAULT 0.82,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE blueprints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own blueprints" ON blueprints
  FOR ALL USING (auth.uid() = user_id);
```

### usage
```sql
CREATE TABLE usage (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end   DATE NOT NULL,
  analyses     INT DEFAULT 0,
  UNIQUE(user_id, period_start)
);
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own usage" ON usage
  FOR ALL USING (auth.uid() = user_id);
```

### subscriptions
```sql
CREATE TABLE subscriptions (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_customer_id   TEXT,
  stripe_subscription_id TEXT,
  tier                 TEXT DEFAULT 'bloom' CHECK (tier IN ('bloom','craft','studio','atelier')),
  status               TEXT DEFAULT 'active',
  current_period_end   TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own subscriptions" ON subscriptions
  FOR ALL USING (auth.uid() = user_id);
```

---

## API Route: /api/analyze

```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient } from '@/lib/supabase/server';
import { checkUsageLimit, incrementUsage } from '@/lib/usage';
import { buildBlueprint } from '@/lib/blueprint';
import { VISION_PROMPT } from '@/lib/vision';

export async function POST(req: NextRequest) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Tier gate
  const withinLimit = await checkUsageLimit(user.id);
  if (!withinLimit) {
    return NextResponse.json(
      { error: 'Monthly analysis limit reached. Upgrade to continue.', upgrade: true },
      { status: 429 }
    );
  }

  const { imageBase64, mediaType = 'image/jpeg' } = await req.json();
  if (!imageBase64) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
          { type: 'text', text: VISION_PROMPT }
        ]
      }]
    });

    const rawText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Vision response was not valid JSON');

    const analysis = JSON.parse(jsonMatch[0]);
    const blueprint = buildBlueprint(analysis);

    // Save to Supabase
    const { data: saved } = await supabase
      .from('blueprints')
      .insert({ user_id: user.id, blueprint, analysis, confidence: 0.82 })
      .select()
      .single();

    // Track usage
    await incrementUsage(user.id);

    return NextResponse.json({ blueprint, analysis, id: saved?.id });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
```

---

## Tier System

```typescript
// types/tier.ts
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export const TIER_LIMITS: Record<Tier, { analyses: number; features: string[] }> = {
  bloom: {
    analyses: 5,
    features: ['blueprint_json', 'basic_detection']
  },
  craft: {
    analyses: 50,
    features: ['blueprint_json', 'full_detection', 'mj_prompt', 'polar_placement']
  },
  studio: {
    analyses: 200,
    features: ['blueprint_json', 'full_detection', 'mj_prompt', 'polar_placement',
               'sku_matching', 'scoring', 'etsy_listing', 'team_seats']
  },
  atelier: {
    analyses: Infinity,
    features: ['*'] // all features
  }
};

export const STRIPE_PRICE_IDS: Record<Tier, string> = {
  bloom:   '',  // free
  craft:   process.env.NEXT_PUBLIC_STRIPE_CRAFT_PRICE_ID!,
  studio:  process.env.NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID!,
  atelier: '' // contact sales
};
```

---

## Environment Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

ANTHROPIC_API_KEY=sk-ant-api03-…

STRIPE_SECRET_KEY=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
NEXT_PUBLIC_STRIPE_CRAFT_PRICE_ID=price_…
NEXT_PUBLIC_STRIPE_STUDIO_PRICE_ID=price_…

NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## Tailwind Brand Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./app/**/*.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      colors: {
        'ec-green':       '#4A6741',
        'ec-green-light': '#6B8F67',
        'ec-green-pale':  '#EEF2ED',
        'ec-paper':       '#F2EFE9',
        'ec-off-white':   '#F9F7F4',
        'ec-ink':         '#4A4A4A',
        'ec-charcoal':    '#2E2E2E',
      },
      fontFamily: {
        serif:  ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans:   ['Inter', 'system-ui', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
        mono:   ['"DM Mono"', 'monospace'],
      },
    }
  }
} satisfies Config
```

---

## Deploy Checklist

- [ ] Supabase project created, migrations run
- [ ] Stripe products + prices created (Craft $29, Studio $79)
- [ ] Stripe webhook configured → `/api/stripe/webhook`
- [ ] Anthropic API key in Vercel env
- [ ] Supabase Auth redirect URLs set to production domain
- [ ] Supabase Storage bucket `wreath-images` created (private)
- [ ] RLS policies verified in Supabase dashboard
- [ ] Vercel deploy with all env vars set

---

## Subscription Webhook Events to Handle

| Event | Action |
|---|---|
| `checkout.session.completed` | Upsert subscription row, set tier |
| `customer.subscription.updated` | Update tier + period_end |
| `customer.subscription.deleted` | Downgrade to `bloom` |
| `invoice.payment_failed` | Email user, suspend analyses |

---

## Developer Notes

**API key architecture:** In the MVP HTML, users paste their own API key client-side. The SaaS flips this — API calls run **server-side** via `/api/analyze` using the platform's `ANTHROPIC_API_KEY`. Users never see a key input field.

**Image flow:** Client → FileReader → base64 → POST `/api/analyze` → server calls Anthropic → blueprint returned. Optionally store image in Supabase Storage and save URL to blueprint row for history.

**Usage gating:** `checkUsageLimit()` queries the `usage` table for the current billing period. Stripe webhooks reset the period on renewal. Bloom users get 5 free analyses on a rolling 30-day window.

**Tier gating on frontend:** `useTier()` hook reads from the `subscriptions` table via Supabase realtime. Components conditionally render locked features with `<UpgradeModal />` instead of hiding them entirely — always show what's possible, never hide it.
