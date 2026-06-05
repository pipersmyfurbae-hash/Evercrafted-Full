# Wreath Ecosystem Canon — Developer Spec
## Next.js SaaS Scaffold · Supabase · Stripe · Vercel

**Version:** 1.0  
**Tier:** Atelier  
**App ID:** `evercrafted-wreath-canon`

---

## 1. What This App Does

The Wreath Ecosystem Canon is a 10-module AI-powered SaaS platform that transforms client memories into emotionally resonant, mathematically structured, manufacturable wreath blueprints.

A client provides a memory or emotional narrative. The platform runs it through a pipeline of AI and deterministic modules — emotion scoring, floral selection, polar coordinate placement, symmetry enforcement, aesthetic scoring — and produces a manufacturing-ready BlueprintJSON and a Story/Recipe/Blueprint PDF ready for client delivery.

The platform serves three user types:
- **Wreath designers** using the Studio Mode app to generate client blueprints
- **AI developers** extending the platform via the plugin architecture
- **Florist studios** managing inventory, client files, and production exports

---

## 2. User Flow

1. User registers → Supabase Auth email/password
2. User selects or is assigned a subscription tier (Bloom / Craft / Studio / Atelier)
3. User creates a new client design project
4. User inputs a client memory in Module 01 (Memory-to-Masterpiece AI)
5. AI returns EmotionScore[], active glyphs, and a BlueprintIntent object
6. User reviews emotion chord → Module 02 generates FloralRecipeDraft + palette
7. User adjusts floral recipe if needed → Module 03 runs placement engine
8. Canvas renders polar coordinate layout with FFLGA layers
9. Module 09 (Symmetry Engine) runs automatic balance enforcement
10. Module 10 scores the design → returns fitness score + improvement list
11. User approves design → Module 05 exports BlueprintJSON
12. Module 07 generates Story/Recipe/Blueprint PDF
13. PDF is stored in Supabase Storage and delivered to client

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| Module 01 — Memory intake | ✓ | ✓ | ✓ | ✓ |
| Stem count calculator | ✓ | ✓ | ✓ | ✓ |
| FFLGA classification guide | ✓ | ✓ | ✓ | ✓ |
| Module 02 — Emotion mapper | — | ✓ | ✓ | ✓ |
| Module 03 — Visualizer canvas | — | ✓ (basic) | ✓ | ✓ |
| Module 04 — AI Florist Assistant | — | ✓ | ✓ | ✓ |
| Inventory tracker | — | ✓ | ✓ | ✓ |
| Module 05 — Blueprint JSON export | — | — | ✓ | ✓ |
| Module 07 — Build Guide PDF | — | — | ✓ | ✓ |
| Module 08 — Design Studio (drag-drop) | — | — | ✓ | ✓ |
| WGS Genome encode/decode | — | — | ✓ | ✓ |
| Module 06 — Floral Photo Analyzer | — | — | — | ✓ |
| Module 09 — Symmetry Engine | — | — | — | ✓ |
| Module 10 — Aesthetic Scoring Engine | — | — | — | ✓ |
| Plugin registry access | — | — | — | ✓ |
| API + webhook access | — | — | — | ✓ |
| Unlimited projects | — | — | ✓ | ✓ |
| Priority support | — | — | — | ✓ |

---

## 4. AI Integration Details

### Required Tier
- Module 01 (Memory → Intent): Bloom+
- Module 02 (Emotion Mapper): Craft+
- Module 04 (AI Florist): Craft+
- Module 07 (PDF narrative generation): Studio+
- Module 10 (Aesthetic scoring with AI suggestions): Atelier only

### System Prompts

#### Module 01 — Memory-to-Masterpiece AI
```
You are the Memory-to-Masterpiece AI for Evercrafted. 
Extract structured BlueprintIntent from client memory.
Return: EmotionScore[] (top 3–4, weighted to 100%), 
active glyphs from the Fauxever Memories Lexicon 
(quiet_strength / grief / threshold / circle_of_life / journey),
palette intent (60/30/10 split), and a full BlueprintIntent object
including form, focal arc, density, and season anchor.
Output as structured JSON only.
```

#### Module 02 — Emotional Floral Mapper
```
You are the Emotional Floral Mapper for Evercrafted.
Map an EmotionScore array and active glyphs to a FloralRecipeDraft.
Use the non-scoring tier-bucket system:
- Hard filter: role + color band + floriography/emotion tag + style tag
- Tier A = 3/3 rules match, B = 2/3, C = 1/3
- Apply diversity constraints: enforce minSkus and maxSkus per role
Do NOT use numeric scoring — it causes repetition.
Return FloralRecipeDraft with sku + estimatedPieces per FFLGA role.
```

#### Module 04 — AI Florist Assistant
```
You are the AI Florist Assistant for Evercrafted.
Speak fluently in floriography, FFLGA classification, 
polar coordinate placement, and the Evercrafted blueprint pipeline.
Answer questions about why specific florals were chosen, 
their symbolic meaning, their z-index placement, 
and how they serve the client's emotional intent.
Keep answers to 150–200 words. Be warm and authoritative.
```

### Input/Output Format
All AI calls go through `/api/claude` (server-side proxy).  
Input: `{ messages: Message[], skillContext: SkillContext, tier: Tier }`  
Output: `{ content: string, tokensUsed: number }`

---

## 5. Data Model

### `profiles` table
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  display_name TEXT,
  tier TEXT NOT NULL DEFAULT 'bloom' 
    CHECK (tier IN ('bloom','craft','studio','atelier')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
```

### `projects` table
```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  client_name TEXT,
  memory_text TEXT,
  blueprint_intent JSONB,
  floral_recipe JSONB,
  blueprint_layout JSONB,
  genome_string TEXT,
  fitness_score NUMERIC(4,2),
  status TEXT DEFAULT 'draft' 
    CHECK (status IN ('draft','in_progress','approved','exported')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own projects" ON projects 
  USING (auth.uid() = owner_uid);
```

### `inventory_items` table
```sql
CREATE TABLE inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_uid UUID NOT NULL REFERENCES profiles(id),
  sku TEXT NOT NULL,
  display_name TEXT NOT NULL,
  fflga_role TEXT NOT NULL 
    CHECK (fflga_role IN ('focal','filler','line','greenery','accent')),
  color_family TEXT,
  emotion_tags TEXT[],
  head_size_cm NUMERIC(4,1),
  style_tags TEXT[],
  in_stock BOOLEAN DEFAULT TRUE,
  supplier TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own inventory" ON inventory_items 
  USING (auth.uid() = owner_uid);
```

### `exports` table
```sql
CREATE TABLE exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  export_type TEXT CHECK (export_type IN ('json','pdf','genome')),
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own exports" ON exports
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE owner_uid = auth.uid())
  );
```

---

## 6. API Routes

| Route | Method | Auth | Tier | Description |
|-------|--------|------|------|-------------|
| `/api/claude` | POST | Required | Varies | Server-side Claude proxy — validates tier before calling |
| `/api/projects` | GET | Required | Bloom+ | List user projects |
| `/api/projects` | POST | Required | Bloom+ | Create new project |
| `/api/projects/[id]` | GET | Required | Bloom+ | Get project detail |
| `/api/projects/[id]` | PATCH | Required | Bloom+ | Update project |
| `/api/projects/[id]/blueprint` | POST | Required | Studio+ | Generate final BlueprintJSON |
| `/api/projects/[id]/export/pdf` | POST | Required | Studio+ | Generate Build Guide PDF |
| `/api/projects/[id]/export/genome` | POST | Required | Studio+ | Encode WGS genome string |
| `/api/inventory` | GET | Required | Craft+ | List inventory items |
| `/api/inventory` | POST | Required | Craft+ | Add inventory item |
| `/api/stripe/webhook` | POST | None | — | Handle Stripe subscription events |
| `/api/stripe/portal` | POST | Required | Any | Create Stripe customer portal session |

---

## 7. Component Map

```
app/
├── (auth)/
│   ├── login/page.tsx          → LoginForm component
│   └── register/page.tsx       → RegisterForm component
├── (app)/
│   ├── layout.tsx              → AppShell (sidebar + header)
│   ├── dashboard/page.tsx      → ProjectList + NewProjectButton
│   ├── projects/[id]/
│   │   ├── page.tsx            → ProjectWorkspace
│   │   ├── memory/page.tsx     → MemoryIntakePanel (Module 01)
│   │   ├── emotions/page.tsx   → EmotionMapperPanel (Module 02)
│   │   ├── blueprint/page.tsx  → BlueprintStudio (Modules 03–05)
│   │   └── export/page.tsx     → ExportPanel (Modules 07)
│   ├── inventory/page.tsx      → InventoryTable + ImportCSV
│   └── settings/page.tsx       → ProfileSettings + BillingPortal
components/
├── ui/
│   ├── TierGate.tsx            → Blur overlay + upgrade CTA
│   ├── TierBadge.tsx           → Tier pill badge
│   └── AIOutput.tsx            → Streaming AI output renderer
├── canvas/
│   ├── WreathCanvas.tsx        → 600×600 polar coordinate canvas
│   ├── FocalCluster.tsx        → Cluster placement plugin
│   └── GoldenAngleLayer.tsx    → Greenery distribution layer
├── modules/
│   ├── MemoryIntake.tsx        → Module 01
│   ├── EmotionMapper.tsx       → Module 02
│   ├── FloristChat.tsx         → Module 04 chat UI
│   └── ScoringPanel.tsx        → Module 10 fitness display
```

---

## 8. File Tree (Next.js Scaffold)

```
evercrafted-canon/
├── app/
│   ├── api/
│   │   ├── claude/route.ts
│   │   ├── projects/route.ts
│   │   ├── projects/[id]/route.ts
│   │   ├── projects/[id]/blueprint/route.ts
│   │   ├── projects/[id]/export/pdf/route.ts
│   │   ├── inventory/route.ts
│   │   └── stripe/webhook/route.ts
│   ├── (auth)/login/page.tsx
│   ├── (auth)/register/page.tsx
│   ├── (app)/layout.tsx
│   ├── (app)/dashboard/page.tsx
│   ├── (app)/projects/[id]/page.tsx
│   └── globals.css
├── components/
│   ├── ui/ (TierGate, TierBadge, AIOutput)
│   ├── canvas/ (WreathCanvas, plugins)
│   └── modules/ (all 10 module UIs)
├── lib/
│   ├── tier.ts
│   ├── claude.ts
│   ├── blueprint.ts    ← generateBlueprint(intent, recipe)
│   ├── genome.ts       ← WGS encode/decode
│   └── supabase.ts
├── hooks/
│   ├── useTier.ts
│   ├── useProject.ts
│   └── useCanvas.ts
├── supabase/
│   └── migrations/
│       ├── 001_init.sql
│       ├── 002_projects.sql
│       ├── 003_inventory.sql
│       └── 004_exports.sql
├── .env.local.example
├── next.config.ts
└── package.json
```

---

## 9. Key Source Files

### `lib/tier.ts`
```typescript
export type Tier = 'bloom' | 'craft' | 'studio' | 'atelier';

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1, craft: 2, studio: 3, atelier: 4
};

export const TIER_LABELS: Record<Tier, string> = {
  bloom: 'Bloom', craft: 'Craft', studio: 'Studio', atelier: 'Atelier'
};

export const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  bloom:   { bg: '#EEF2ED', text: '#4A6741' },
  craft:   { bg: '#EEF4F9', text: '#4A6785' },
  studio:  { bg: '#F5EEF4', text: '#7A4A85' },
  atelier: { bg: '#1A1A1A', text: '#F2EFE9' },
};

export function canAccess(userTier: Tier, required: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[required];
}
```

### `app/api/claude/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { canAccess, type Tier } from '@/lib/tier';

const client = new Anthropic(); // uses ANTHROPIC_API_KEY from env

export async function POST(req: NextRequest) {
  const { messages, systemPrompt, requiredTier, maxTokens = 1000 } = await req.json();

  // Verify auth
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const { data: { user } } = await supabase.auth.getUser(token ?? '');
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify tier
  const { data: profile } = await supabase
    .from('profiles').select('tier').eq('id', user.id).single();
  if (!profile || !canAccess(profile.tier as Tier, requiredTier)) {
    return NextResponse.json({ error: 'Tier insufficient' }, { status: 403 });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  });

  return NextResponse.json({
    content: response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('\n'),
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  });
}
```

### `lib/blueprint.ts` (core loop — start here)
```typescript
import type { BlueprintIntent, FloralRecipeDraft, BlueprintLayout, Cluster } from './types';

const GOLDEN_ANGLE = 137.5;
const CANVAS_SIZE = 600;
const PX_PER_IN = 25;

export function generateBlueprint(
  intent: BlueprintIntent,
  recipe: FloralRecipeDraft
): BlueprintLayout {
  const sizeIn = intent.sizeInches;
  const outerR = (sizeIn / 2) * PX_PER_IN;
  const innerR = outerR * 0.58;

  const clusters: Cluster[] = [];

  // 1. Greenery base — golden angle distribution
  const greeneryCount = recipe.greenery.estimatedPieces;
  for (let k = 0; k < greeneryCount; k++) {
    const theta = (k * GOLDEN_ANGLE) % 360;
    const rNorm = 0.55 + Math.random() * 0.35;
    clusters.push({
      role: 'greenery',
      theta,
      rNorm,
      rotationDeg: theta + 90,
      sku: recipe.greenery.skus[k % recipe.greenery.skus.length],
      count: 1,
    });
  }

  // 2. Focal arc (crescent: 220–320° = 4–8 o'clock)
  const arcStart = intent.form === 'crescent' ? 220 : 0;
  const arcSpan = intent.form === 'crescent' ? 100 : 360;
  const focalCount = recipe.focal.estimatedPieces;
  for (let i = 0; i < focalCount; i++) {
    const theta = arcStart + (i / Math.max(1, focalCount - 1)) * arcSpan;
    clusters.push({
      role: 'focal',
      theta,
      rNorm: 0.82 + (Math.random() - 0.5) * 0.08,
      rotationDeg: theta + 90,
      sku: recipe.focal.skus[i % recipe.focal.skus.length],
      count: 1,
    });
  }

  // 3. Secondary and filler — spread around focal arc ± buffer
  // ... (same pattern, wider spread)

  return {
    intentId: intent.id,
    canvasSize: CANVAS_SIZE,
    pxPerIn: PX_PER_IN,
    outerRadius: outerR,
    innerRadius: innerR,
    clusters,
    symmetryMode: intent.symmetryMode,
    createdAt: new Date().toISOString(),
  };
}
```

### `components/ui/TierGate.tsx`
```typescript
import { canAccess, type Tier } from '@/lib/tier';
import { useTier } from '@/hooks/useTier';

interface TierGateProps {
  required: Tier;
  children: React.ReactNode;
}

export function TierGate({ required, children }: TierGateProps) {
  const { tier } = useTier();

  if (canAccess(tier, required)) return <>{children}</>;

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ filter: 'blur(4px)', pointerEvents: 'none', opacity: 0.4 }}>
        {children}
      </div>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 12,
        background: 'rgba(249,247,244,0.88)', backdropFilter: 'blur(2px)',
      }}>
        <span style={{ fontSize: 28 }}>🔒</span>
        <p style={{ fontSize: 13, fontWeight: 600 }}>
          {required.charAt(0).toUpperCase() + required.slice(1)} tier required
        </p>
        <a href="/settings/billing" style={{
          background: '#4A6741', color: '#fff',
          padding: '9px 20px', borderRadius: 24, fontSize: 13, fontWeight: 600,
          textDecoration: 'none',
        }}>
          Upgrade
        </a>
      </div>
    </div>
  );
}
```

---

## 10. Environment Variables

```bash
# .env.local.example

# Supabase (public — safe for client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (server-only — never expose)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Anthropic (server-only — NEVER prefix with NEXT_PUBLIC_)
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BLOOM=price_...
STRIPE_PRICE_CRAFT=price_...
STRIPE_PRICE_STUDIO=price_...
STRIPE_PRICE_ATELIER=price_...

# App
NEXT_PUBLIC_APP_URL=https://app.evercrafted.com
```

---

## 11. Deployment Checklist

### Supabase
- [ ] Create project, copy URL + anon key + service role key
- [ ] Run all 4 migration files in order
- [ ] Enable Row Level Security on all tables (verify policies)
- [ ] Enable Supabase Auth → Email provider
- [ ] Configure email templates (confirm email, password reset)
- [ ] Create Storage bucket: `exports` (private, authenticated read)
- [ ] Add CORS origin: `https://app.evercrafted.com`

### Stripe
- [ ] Create products: Bloom / Craft / Studio / Atelier
- [ ] Set monthly price for each, copy price IDs to env
- [ ] Configure webhook endpoint: `https://app.evercrafted.com/api/stripe/webhook`
- [ ] Subscribe to events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- [ ] Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
- [ ] Verify tier update fires correctly on subscription status change

### Vercel
- [ ] Connect GitHub repo
- [ ] Add all environment variables (never commit `.env.local`)
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Enable Vercel Edge Config for feature flags (optional)
- [ ] Run production build check: `npm run build`
- [ ] Verify `/api/claude` returns 401 without auth token

### Testing Before Launch
- [ ] Full pipeline run: memory → PDF on Atelier tier
- [ ] Tier gate test: Studio user cannot access Atelier-only endpoints
- [ ] Stripe webhook test: subscription upgrade correctly updates `profiles.tier`
- [ ] PDF export writes to Supabase Storage and returns signed URL
- [ ] `generateBlueprint(intent, recipe)` runs without error on all 4 form types
- [ ] Canvas renders correctly on 600×600 at 25px/in scale

---

## 12. Known Limitations / Future Work

| Item | Status | Notes |
|------|--------|-------|
| Module 10 — GNN scoring | Spec only | Rule-based fallback for Phase 1; full GNN in Phase 9 roadmap |
| Module 06 — Photo Analyzer | Atelier only | Vision API calls; rate-limit carefully |
| PDF generation | Server-side only | Use Puppeteer or Playwright on Vercel Serverless |
| Plugin registry | Atelier tier | Define WreathElementPlugin interface before opening to 3rd parties |
| Genome breeding/mutation | Studio+ | `breedGenomes(g1, g2)` function not yet scaffolded |
| Floral Photo Analyzer caching | Not implemented | Cache extracted FloralElement by image hash to reduce costs |
| Multi-user studio (collaborative) | Phase 10+ | Requires operational transform or CRDT for concurrent canvas edits |
| Offline mode | Not planned | PWA cache for inventory; blueprint generation requires network |

---

## 13. Core TypeScript Types Reference

```typescript
// BlueprintIntent — output of Module 01
interface BlueprintIntent {
  id: string;
  sizeInches: 18 | 24 | 30 | 36;
  form: 'crescent' | 'full_round' | 'cascading' | 'top_heavy';
  density: 'light' | 'medium' | 'lush';
  season: 'spring' | 'summer' | 'fall' | 'winter' | 'evergreen';
  symmetryMode: 'bilateral' | 'radial' | 'organic';
  emotionChord: EmotionScore[];
  glyphs: Glyph[];
  paletteIntent: PaletteIntent;
  focalArcDeg: [number, number]; // [startDeg, endDeg]
  notes?: string;
}

// FloralRecipeDraft — output of Module 02
interface FloralRecipeDraft {
  focal:     { skus: string[]; estimatedPieces: number; emotionRationale: string };
  secondary: { skus: string[]; estimatedPieces: number; emotionRationale: string };
  filler:    { skus: string[]; estimatedPieces: number; emotionRationale: string };
  greenery:  { skus: string[]; estimatedPieces: number; emotionRationale: string };
  line:      { skus: string[]; estimatedPieces: number; emotionRationale: string };
}

// Cluster — atomic placement unit
interface Cluster {
  role: 'focal' | 'secondary' | 'filler' | 'greenery' | 'line' | 'accent';
  theta: number;        // 0–360 degrees
  rNorm: number;        // 0–1 normalized radius
  rotationDeg: number;  // theta + 90 (stem perpendicular rule)
  sku: string;
  count: number;
  zIndex?: 1 | 2 | 3;
}

// WreathElementPlugin — plugin contract
interface WreathElementPlugin {
  id: string;
  meta: { displayName: string; category: string; version: string };
  element: WreathElementProps;
  render: (ctx: CanvasRenderingContext2D, props: WreathElementRenderProps) => void;
  hitTest?: (x: number, y: number, props: WreathElementRenderProps) => boolean;
  serializeData?: (props: WreathElementRenderProps) => Record<string, unknown>;
  deserializeData?: (data: Record<string, unknown>) => Partial<WreathElementRenderProps>;
  Inspector?: React.ComponentType<InspectorProps>;
}
```

---

*This spec is a complete handoff document. A developer who has never seen the Evercrafted skill ecosystem should be able to bootstrap this application from scratch using only this document, the .env.local.example, and the Supabase migration files.*

*Do not change the BlueprintIntent or Cluster interfaces lightly — they are the shared contract between all 10 modules.*
