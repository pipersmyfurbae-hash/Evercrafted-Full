# Evercrafted System Console — Developer Spec
**Version:** 1.0 | **EC_CANON_V1** | **Last updated:** April 2026

---

## 1. What This App Does

The Evercrafted System Console is a full-stack internal design and production platform for wreath makers. It combines two modes in a single interface:

- **Client Mode** — a 7-step linear wizard that takes a customer's memory or story and produces a wreath blueprint, multi-channel content (Shopify, Instagram, Midjourney), and a customer order brief. Designed to be used during or after a client consultation.
- **Studio Mode** — a 27-panel internal console covering the full production pipeline: formula exploration, DNA registry, blueprint generation, ABC mutation lab, inventory management, AI content tools, order tracking, drop analytics, and third-party integrations.

The platform enforces a 4-tier subscription model (Bloom → Craft → Studio → Atelier) with server-side tier verification on every AI call.

---

## 2. User Flow

### Client Mode (Craft tier minimum)
1. User logs in → redirected to console at `/console`
2. Toggle set to **Client Mode** (default for Craft users)
3. **Step 1 — Memory:** Enter customer name, story, season, color instinct
4. **Step 2 — Occasion & Size:** Select occasion chip, size card (18/20/24"), budget tier
5. **Step 3 — Formula:** Select composition formula, emotional style, design language
6. **Step 4 — Weave:** Click "Weave Blueprint" → pipeline runs → AI interprets story → EC_CANON_V1 blueprint compiled
7. **Step 5 — Blueprint:** Review blueprint JSON, scores, meta
8. **Step 6 — Content:** AI auto-generates Shopify title/desc, Instagram caption, Midjourney prompt, build summary
9. **Step 7 — Order:** Review quote and AI brief → click "Save to Tracker" → order written to `orders` table

### Studio Mode (Bloom tier minimum, features gate per tier)
1. User toggles to **Studio Mode**
2. Sidebar nav selects any of 27 panels across P1–P10
3. Tier-gated panels show blur overlay + upgrade CTA for insufficient tiers
4. AI modules (P5–P10) call `/api/claude` → server verifies Atelier tier → calls Anthropic
5. Orders, blueprints, drops, and inventory persist to Supabase in real time

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|:---:|:---:|:---:|:---:|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Formula Explorer | ✓ | ✓ | ✓ | ✓ |
| Emotion Space | ✓ | ✓ | ✓ | ✓ |
| Blueprint Inspector | — | ✓ | ✓ | ✓ |
| DNA Registry | — | ✓ | ✓ | ✓ |
| Placement Debugger | — | ✓ | ✓ | ✓ |
| Inventory Analyzer | — | ✓ | ✓ | ✓ |
| Wholesale Calculator | — | ✓ | ✓ | ✓ |
| Order Tracker | — | ✓ | ✓ | ✓ |
| **Client Mode Wizard** | — | ✓ | ✓ | ✓ |
| ABC Lab | — | — | ✓ | ✓ |
| Genome Dashboard | — | — | ✓ | ✓ |
| Output Studio | — | — | ✓ | ✓ |
| API Center | — | — | ✓ | ✓ |
| Drop Analytics | — | — | ✓ | ✓ |
| Blueprint Library | — | — | ✓ | ✓ |
| **Memory Weaver (AI)** | — | — | — | ✓ |
| **Design Drop (AI)** | — | — | — | ✓ |
| **Blueprint Chat (AI)** | — | — | — | ✓ |
| **Inventory AI** | — | — | — | ✓ |
| **Blueprint Evaluator (AI)** | — | — | — | ✓ |
| **Build Sheet Generator (AI)** | — | — | — | ✓ |
| **Drop Launch Planner (AI)** | — | — | — | ✓ |
| **Order Studio (AI)** | — | — | — | ✓ |
| **Shopify Publisher (AI)** | — | — | — | ✓ |
| **Gmail + Calendar (MCP)** | — | — | — | ✓ |

---

## 4. AI Integration Details

### Required tier
All AI modules require **Atelier**. Server-side enforcement in `/api/claude/route.ts` — any request from a lower tier returns HTTP 403 with `{ error: "tier_required", required: "atelier", current: <user_tier> }`.

### Model
`claude-sonnet-4-20250514` for all modules.

### Critical rule — season anchor
The Memory Weaver and all content-generating modules MUST inject season into system prompts. The season-to-visual lookup table in `lib/claude.ts` → `SYSTEM_PROMPTS` maps each season to concrete visual descriptors that anchor the Midjourney prompt output. This is non-negotiable — it was the root cause of v1 rendering failures (summer stories producing gothic autumn wreaths).

### Module system prompts (see `lib/claude.ts → SYSTEM_PROMPTS`)

| Module | Key rule |
|---|---|
| `memory_weaver` | Use client's exact words only. Season is mandatory and non-overridable. |
| `design_drop` | Season must be visually anchored in MJ prompt. JSON only response. |
| `blueprint_chat` | 2-3 sentences max. Expert, warm voice. |
| `inventory_ai` | Full 15-SKU inventory context always injected. |
| `evaluator` | 5 dimensions. Direct critique. Overall score. |
| `build_sheet` | 6-8 numbered steps. Practical. Skill-level aware. |
| `launch_planner` | 4-week numbered plan. Shopify + Instagram + email. |
| `order_studio` | 3-sentence brief. Formula + palette + lead time. Gender-neutral. |
| `shopify` | Season in all copy. TITLE + SHORT + LONG + TAGS format. |

### Streaming vs JSON
- **Streaming:** Memory Weaver, Build Sheet, Blueprint Chat, Launch Planner, Order Studio, Email Draft
- **JSON:** Design Drop, Evaluator, Shopify Publisher

---

## 5. Data Model

### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | References `auth.users` |
| email | text | From auth |
| display_name | text | |
| tier | text | bloom/craft/studio/atelier |
| stripe_customer_id | text | Set on first Stripe checkout |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated |

### `blueprints`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK | |
| name | text | User-assigned |
| formula | text | EC_CANON_V1 formula name |
| emotion_quadrant | text | |
| style_signature | text | |
| season | text | **Required** — anchors all rendering |
| size | text | 18"/20"/24" |
| ec_certified | boolean | |
| blueprint_json | jsonb | Full EC_CANON_V1 object |
| tags | text[] | |
| source | text | manual/memory_weaver/abc_lab/imported |

### `orders`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_number | text UNIQUE | EC-001, EC-002, etc. |
| customer_name | text | |
| memory_text | text | Client's original story |
| season | text | **Required** |
| size | text | |
| formula | text | |
| blueprint_id | uuid FK | Optional — links to blueprints table |
| quote_total | numeric | |
| status | text | Received/Build/Quality Check/Shipped |
| ai_brief | text | AI-generated customer brief |

### `drops`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| formula | text | |
| units_sold | int | |
| retail_price | numeric | |
| cogs_per_unit | numeric | |
| revenue | numeric | Generated — `units_sold * retail_price` |
| margin_pct | numeric | Generated — auto-calculated |

### `inventory`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| role | text | focal/supporting/filler/greenery |
| stock_count | int | |
| formula_compat | text[] | Array of compatible formula names |

**RLS:** All tables have Row Level Security enabled. Users can only read/write their own rows (`auth.uid() = user_id`).

---

## 6. API Routes

| Route | Method | Auth | Tier | Description |
|---|---|---|---|---|
| `/api/claude` | POST | Required | Per module | Server-side Claude proxy. Verifies tier before calling Anthropic. Supports streaming + JSON modes. |
| `/api/stripe/webhook` | POST | Stripe sig | N/A | Handles subscription events. Updates `profiles.tier`. |
| `/api/stripe/checkout` | POST | Required | Any | Creates Stripe checkout session for tier upgrade. |
| `/api/blueprints` | GET/POST | Required | Craft+ | List and save blueprints. |
| `/api/orders` | GET/POST | Required | Craft+ | List and create orders. |
| `/api/orders/[id]` | PATCH | Required | Craft+ | Update order status (kanban moves). |
| `/api/drops` | GET/POST | Required | Studio+ | Drop performance CRUD. |
| `/api/inventory` | GET/POST/PATCH | Required | Craft+ | Inventory CRUD. |

---

## 7. Component Map

```
app/
  console/
    page.tsx                    ← Mode toggle, loads ClientMode or StudioMode
    ClientMode.tsx              ← 7-step wizard, reads clientOrder state
    StudioMode.tsx              ← Sidebar + 27 panel router
    panels/
      p1/Dashboard.tsx
      p1/FormulaExplorer.tsx
      p1/EmotionSpace.tsx
      p1/BlueprintInspector.tsx
      p2/DNARegistry.tsx
      p2/PlacementDebugger.tsx
      p2/InventoryAnalyzer.tsx
      p3/ABCLab.tsx
      p3/GenomeDashboard.tsx
      p3/OutputStudio.tsx
      p4/APICenter.tsx
      p4/SchemaRegistry.tsx
      p4/ArchitectureMap.tsx
      p5/MemoryWeaver.tsx        ← Atelier + streaming
      p5/DesignDrop.tsx          ← Atelier + JSON
      p5/BlueprintChat.tsx       ← Atelier + streaming
      p6/InventoryAI.tsx         ← Atelier + streaming
      p6/BlueprintEvaluator.tsx  ← Atelier + streaming
      p7/BuildSheetGenerator.tsx ← Atelier + streaming
      p7/WholesaleCalculator.tsx ← Craft
      p7/LaunchPlanner.tsx       ← Atelier + streaming
      p8/OrderStudio.tsx         ← Atelier + streaming
      p8/OrderTracker.tsx        ← Craft (reads orders table)
      p9/DropPerformance.tsx     ← Studio
      p9/BlueprintLibrary.tsx    ← Studio
      p10/GmailCalendar.tsx      ← Atelier + MCP
      p10/ShopifyPublisher.tsx   ← Atelier + streaming

components/
  ui/
    TierGate.tsx                ← Blur overlay + upgrade CTA
    TierBadge.tsx               ← Colored pill badge
    BotanicalDivider.tsx        ← ✦ divider with leaf SVG
    ECSpinner.tsx               ← On-brand loading spinner
    Chip.tsx                    ← Selectable chip button
    StepCard.tsx                ← Client Mode step wrapper

hooks/
  useTier.ts                    ← Reads tier from Supabase session
  useBlueprints.ts              ← CRUD blueprints table
  useOrders.ts                  ← CRUD orders table
  useInventory.ts               ← CRUD inventory table
  useDrops.ts                   ← CRUD drops table

lib/
  tier.ts                       ← TIER_RANK, canAccess, MODULE_TIERS
  claude.ts                     ← callClaude, callClaudeJSON, SYSTEM_PROMPTS
```

---

## 8. Deployment Checklist

### Supabase
- [ ] Create new Supabase project
- [ ] Run `supabase db push` to apply `001_init.sql`
- [ ] Enable Email auth in Authentication settings
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL` and both keys to `.env.local`
- [ ] Test RLS: confirm users can only see their own data
- [ ] Enable Realtime on `orders` table (for live kanban updates)

### Stripe
- [ ] Create 4 recurring products (Bloom/Craft/Studio/Atelier) with monthly prices
- [ ] Copy all 4 Price IDs to `.env.local`
- [ ] Create webhook endpoint pointing to `https://yourdomain.com/api/stripe/webhook`
- [ ] Subscribe to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `checkout.session.completed`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

### Anthropic
- [ ] Generate API key at console.anthropic.com
- [ ] Add to `.env.local` as `ANTHROPIC_API_KEY` — **never** `NEXT_PUBLIC_`
- [ ] Confirm key is used only in `app/api/claude/route.ts`
- [ ] Set usage limits/alerts in Anthropic dashboard

### Vercel
- [ ] Connect GitHub repo to Vercel
- [ ] Add all `.env.local` variables to Vercel project settings
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Deploy — confirm `/api/claude` returns 401 without auth header
- [ ] Confirm `/api/stripe/webhook` returns 200 with valid Stripe signature
- [ ] Run full Client Mode wizard end-to-end in production
- [ ] Test tier gating: Bloom user attempting to access Atelier module → 403

---

## 9. Known Limitations / Future Work

| Item | Priority | Notes |
|---|---|---|
| **Season override in all AI modules** | High | Currently only enforced in Client Mode. Studio Mode Memory Weaver and Design Drop need the same season injection. |
| **Real inventory sync** | High | Inventory table exists but Studio Mode currently reads from hardcoded JS array. Wire to Supabase. |
| **MCP Gmail/Calendar** | Medium | Requires user to connect their own Google account. Currently a preview — not production-ready. |
| **ABC Lab persistence** | Medium | Genome evolution session state is in-memory only. Add `blueprints` table writes after each mutation. |
| **Blueprint scoring is deterministic fake** | Medium | Blueprint scores (emotion fit, DNA cohesion etc.) are currently `Math.random()`. Replace with real AI evaluation call. |
| **Realtime kanban** | Low | Order Tracker kanban updates require page refresh. Enable Supabase Realtime on `orders` table. |
| **Mobile responsive** | Low | Studio Mode sidebar collapses poorly on mobile. Client Mode wizard is fine. |
| **Multi-user / team** | Future | Currently single-user. Add `team_id` FK to all tables + team management for studio owners with multiple users. |
