# Evercrafted — Design Principles Coach
## Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** April 2026  
**Tier:** Studio (core) + Atelier (blueprint generation)  
**Status:** Ready for Production Scaffold

---

## 1. Product Overview

### What This App Does

Design Principles Coach is an AI-powered wreath design education and critique tool. It teaches balance, rhythm, focal point theory, and color harmony — with every principle grounded in wreath-specific vocabulary: polar coordinates, stem counts, grapevine vs pine base, clock-position placement.

The app delivers four learning modules (Balance, Rhythm, Focal Points, Color Theory), a real-time AI chat coach, and a Design Score Analyzer that critiques user-described designs across all four principles and returns actionable scores with repair notes.

### Problem It Solves

Wreath makers at the Studio tier understand construction but struggle with *why* a design looks off. Generic design education doesn't translate to polar coordinate placement or stem count ratios. This app bridges that gap — teaching principles in the exact language of wreath making.

### Target User

Studio and Atelier tier subscribers who are actively building wreaths and want to improve compositional quality, troubleshoot design problems, and develop a repeatable design vocabulary.

---

## 2. User Flow

1. User opens the app from their Evercrafted dashboard
2. Sees four module tabs: Balance / Rhythm / Focal Points / Color Theory
3. Selects a module — left panel updates with reference cards, diagrams, and examples
4. Right panel shows AI chat coach pre-loaded with the selected module's system prompt
5. User types a question OR taps a quick-prompt button
6. AI responds with wreath-specific, coordinate-precise guidance
7. User scrolls down to the Design Score Analyzer
8. User describes their current design in natural language
9. Clicks "Score It" — AI returns 4 scores (0–100) with one-sentence repair notes
10. Score cards animate in with color-coded bars (green/amber/red)
11. Atelier users see a fifth section: "Generate Blueprint from Principles" — locked for Studio

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| Reference panels (all 4 modules) | ✗ | ✗ | ✅ | ✅ |
| AI chat coach (module-scoped) | ✗ | ✗ | ✅ | ✅ |
| Quick-prompt buttons | ✗ | ✗ | ✅ | ✅ |
| Polar coordinate diagrams | ✗ | ✗ | ✅ | ✅ |
| Design Score Analyzer (4-axis) | ✗ | ✗ | ✅ | ✅ |
| Score repair notes per axis | ✗ | ✗ | ✅ | ✅ |
| Blueprint generation from principles | ✗ | ✗ | 🔒 | ✅ |
| WGS genome string output | ✗ | ✗ | 🔒 | ✅ |
| QACS placement coordinate export | ✗ | ✗ | 🔒 | ✅ |
| Save & name design critiques | ✗ | ✗ | 🔒 | ✅ |
| Export critique as PDF | ✗ | ✗ | 🔒 | ✅ |

**Locking rule:** All locked features are visible with blur overlay + upgrade CTA. Never use `display:none`.

---

## 4. AI Integration Details

### Chat Coach

**Required tier:** Studio  
**Model:** claude-sonnet-4-20250514  
**Max tokens:** 1000  
**Context:** Full conversation history passed on each call

**System prompts by module:**

```
Balance:
"You are the Evercrafted Design Principles Coach — an expert in wreath balance.
Give specific advice using polar coordinates (degrees), stem counts, and wreath
sizes (12", 18", 24"). Use clock positions or degree angles for all placement
references. Keep responses concise — 2-4 sentences unless detail is requested.
Never suggest cherry blossoms, pussy willow, or twig-based blossom florals. 
Gender-neutral language always."

Rhythm:
"...expert in wreath design rhythm and repetition. Specify angular intervals, stem
counts, and repetition patterns. Use terms: alternation, progression, flow direction..."

Focal Points:
"...expert in focal point design. Give polar coordinates, size ratios, eye-path
guidance. Reference primary vs secondary focal points..."

Color Theory:
"...expert in color theory for floral/wreath design. Apply 60-30-10 rules,
warm/cool balance, seasonal palettes. Reference floral colors by species..."
```

**Input format:** `{ role: "user", content: string }`  
**Output format:** Conversational paragraph, 2–4 sentences typical, wreath-vocabulary anchored

---

### Design Score Analyzer

**Required tier:** Studio  
**Model:** claude-sonnet-4-20250514  
**Max tokens:** 1000  
**Input:** Single user message: `"Score this wreath design: [description]"`

**System prompt:**
```
You are an Evercrafted design critic scoring wreath designs. Return ONLY valid JSON:
{
  "balance": { "score": 0-100, "note": "one sentence repair note" },
  "rhythm":  { "score": 0-100, "note": "one sentence repair note" },
  "focal":   { "score": 0-100, "note": "one sentence repair note" },
  "color":   { "score": 0-100, "note": "one sentence repair note" }
}
Return ONLY the JSON object. No markdown, no preamble.
```

**Output:** JSON parsed to 4 score cards with animated progress bars  
**Color coding:** ≥80 = green (`--ec-green`), 60–79 = amber (`--ec-warning`), <60 = red (`--ec-error`)

---

### Blueprint Generator (Atelier only)

**Required tier:** Atelier  
**Input:** 4 principle selections + size + season + emotion  
**Output:** WGS genome string + QACS JSON + Midjourney prompt starter  
**System prompt:** Inherited from `blueprint-composition-engine` skill

---

## 5. Data Model

### Supabase Tables

#### `design_critiques`
```sql
CREATE TABLE design_critiques (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  description   TEXT NOT NULL,
  score_balance INT CHECK (score_balance BETWEEN 0 AND 100),
  score_rhythm  INT CHECK (score_rhythm BETWEEN 0 AND 100),
  score_focal   INT CHECK (score_focal BETWEEN 0 AND 100),
  score_color   INT CHECK (score_color BETWEEN 0 AND 100),
  notes_balance TEXT,
  notes_rhythm  TEXT,
  notes_focal   TEXT,
  notes_color   TEXT,
  tier_at_time  TEXT NOT NULL DEFAULT 'studio'
);

ALTER TABLE design_critiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own critiques"
  ON design_critiques FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own critiques"
  ON design_critiques FOR INSERT WITH CHECK (auth.uid() = user_id);
```

#### `coach_sessions` (Atelier — chat history persistence)
```sql
CREATE TABLE coach_sessions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  module     TEXT NOT NULL CHECK (module IN ('balance','rhythm','focal','color')),
  messages   JSONB NOT NULL DEFAULT '[]'
);

ALTER TABLE coach_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their sessions"
  ON coach_sessions FOR ALL USING (auth.uid() = user_id);
```

---

## 6. API Routes

| Route | Method | Auth Required | Tier | Description |
|-------|--------|---------------|------|-------------|
| `/api/coach/chat` | POST | Yes | Studio+ | Proxies chat message to Claude, enforces tier |
| `/api/coach/score` | POST | Yes | Studio+ | Runs Design Score critique, returns JSON scores |
| `/api/coach/blueprint` | POST | Yes | Atelier | Generates WGS genome from principles input |
| `/api/critiques` | GET | Yes | Studio+ | Returns user's saved critiques, paginated |
| `/api/critiques/[id]` | GET | Yes | Studio+ | Returns single critique by ID |
| `/api/critiques/[id]` | DELETE | Yes | Studio+ | Deletes critique |

---

## 7. Component Map

```
app/
  (dashboard)/
    coach/
      page.tsx                    ← Main app shell, module tabs, layout
      components/
        ModuleTabs.tsx            ← Tab bar + active module state
        ReferencePanel.tsx        ← Left panel, renders module-specific content
        modules/
          BalanceModule.tsx       ← Principle cards + polar canvas
          RhythmModule.tsx        ← Rhythm cards
          FocalModule.tsx         ← Focal diagram + cards
          ColorModule.tsx         ← Color combos + 60-30-10 cards
        CoachChat.tsx             ← Right panel AI chat, history, quick prompts
        DesignScoreAnalyzer.tsx   ← Textarea + 4 score cards + animate-in
        BlueprintGenerator.tsx    ← Atelier locked section
      hooks/
        useCoachChat.ts           ← Chat history state, send/receive
        useDesignScore.ts         ← Score state + API call
```

---

## 8. Next.js Scaffold File Tree

```
evercrafted-design-coach/
├── app/
│   ├── api/
│   │   ├── coach/
│   │   │   ├── chat/route.ts
│   │   │   ├── score/route.ts
│   │   │   └── blueprint/route.ts
│   │   └── critiques/
│   │       ├── route.ts
│   │       └── [id]/route.ts
│   └── (dashboard)/coach/
│       ├── page.tsx
│       └── components/
├── lib/
│   ├── tier.ts
│   ├── claude.ts
│   └── supabase.ts
├── hooks/
│   ├── useTier.ts
│   ├── useCoachChat.ts
│   └── useDesignScore.ts
├── components/ui/
│   ├── TierGate.tsx
│   └── ScoreCard.tsx
├── supabase/
│   └── migrations/
│       ├── 001_profiles.sql
│       └── 002_coach.sql
└── .env.local.example
```

---

## 9. Key Code: API Route (chat proxy)

```typescript
// app/api/coach/chat/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';

const TIER_RANK = { bloom:1, craft:2, studio:3, atelier:4 } as const;

export async function POST(req: Request) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { data: profile } = await supabase
    .from('profiles').select('tier').eq('id', session.user.id).single();
  
  if (!profile || TIER_RANK[profile.tier as keyof typeof TIER_RANK] < TIER_RANK.studio) {
    return new Response('Studio tier required', { status: 403 });
  }

  const { messages, systemPrompt } = await req.json();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages
  });

  return Response.json({ reply: response.content.filter(b => b.type === 'text').map(b => b.text).join('\n') });
}
```

---

## 10. Environment Variables

```env
# .env.local.example

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# Claude — SERVER SIDE ONLY. Never prefix with NEXT_PUBLIC_
ANTHROPIC_API_KEY=sk-ant-...

NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## 11. Deployment Checklist

- [ ] Supabase: Run `001_profiles.sql` and `002_coach.sql` migrations
- [ ] Supabase: Verify RLS policies on `design_critiques` and `coach_sessions`
- [ ] Supabase: Confirm `profiles.tier` column exists with correct enum values
- [ ] Stripe: Create products for Bloom / Craft / Studio / Atelier
- [ ] Stripe: Set up webhook → `/api/webhooks/stripe` to update `profiles.tier` on subscription events
- [ ] Vercel: Add all env vars (never expose `ANTHROPIC_API_KEY` as `NEXT_PUBLIC_`)
- [ ] Test tier gating: log in as Craft user, confirm chat and score sections are locked
- [ ] Test AI chat: send message from Studio tier user, confirm Claude responds
- [ ] Test Design Score: submit description, confirm JSON parses and cards animate
- [ ] Test mobile: verify 375px layout — single column, tabs wrap, chat scrolls correctly
- [ ] Verify Atelier blueprint section shows lock overlay for Studio users

---

## 12. Known Limitations / Future Work

**Current limitations:**
- Chat history is not persisted across sessions (Studio tier). Atelier adds persistence via `coach_sessions`.
- Polar canvas is static illustration, not interactive.
- Design Score requires descriptive prose — cannot accept images yet.

**Future work (v1.1+):**
- Image upload for Design Score — user photos their wreath, Claude critiques it visually
- Interactive polar placement tool (drag-and-drop cluster positioning)
- Critique history dashboard showing score trends over time
- "Principle of the Week" push notification for Bloom/Craft upsell funnel
- Multi-language support (Spanish, French) for international expansion
