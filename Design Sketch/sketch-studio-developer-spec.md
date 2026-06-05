# Design Sketch Studio — Developer Spec
**Evercrafted Platform · Studio Tier App**
Version 1.0 · April 2026

---

## 1. What This App Does

Design Sketch Studio is an interactive wreath layout visualization tool. It displays
six curated wreath styles as animated technical sketches — showing element type,
placement position, directional layering guides, and build specifications. Users can
filter by style category, redraw individual canvases with positional variation, and
run sequential or full-redraw animations. Craft+ users can save sketches to a personal
library. Atelier users unlock AI-generated design notes and AI-powered custom layout
generation.

---

## 2. User Flow

1. User lands on `/studio/sketch` — sees app header with tier badge
2. Filter bar defaults to "All Styles" — six design cards render in a grid
3. Each card shows: animated wreath canvas → spec bar → design note
4. User clicks a style filter → grid reflows to matching cards only
5. User clicks ↻ on any card → that card's elements redraw with positional jitter
6. User clicks "Redraw All" → all six canvases redraw simultaneously
7. User clicks "Sequential Draw" → cards animate one after another (400ms apart)
8. **(Craft+)** User clicks ↓ Save on a card → modal prompts for name → saved to library
9. **(Atelier)** User clicks "Generate Note" → AI writes custom editorial note for that design
10. **(Atelier)** User clicks "Custom Layout" → inputs style intent + preferences → AI returns new placement JSON → canvas renders it

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|:---:|:---:|:---:|:---:|
| View all 6 design sketches | ✓ | ✓ | ✓ | ✓ |
| Filter by style category | ✓ | ✓ | ✓ | ✓ |
| Redraw / animate canvases | ✓ | ✓ | ✓ | ✓ |
| Read design notes | ✓ | ✓ | ✓ | ✓ |
| Save sketches to library | — | ✓ | ✓ | ✓ |
| Export sketch as PNG | — | ✓ | ✓ | ✓ |
| Export as Blueprint JSON | — | — | ✓ | ✓ |
| AI-generated design note | — | — | — | ✓ |
| AI custom layout generator | — | — | — | ✓ |

---

## 4. AI Integration

### 4a. Generate Design Note
- **Required tier:** Atelier
- **Trigger:** "Generate Note" button on any card
- **Input:** `{ styleName: string, elements: { type, count }[] }`
- **System prompt:**
  ```
  You are the Evercrafted design voice — a master florist who writes about wreath
  design with editorial precision and warmth. Never use generic phrasing. Speak about
  the botanical elements as if you hand-selected them. Output plain text only — no
  markdown, no headers.
  ```
- **User prompt:** `Write a 2–3 sentence editorial design note for a "{styleName}" wreath with these elements: {elementSummary}. Voice: warm, knowledgeable florist.`
- **Output:** Plain text string → replaces card's existing design note
- **Max tokens:** 256
- **API route:** `POST /api/claude` with `requiredTier: "atelier"`

### 4b. Generate Custom Layout
- **Required tier:** Atelier
- **Trigger:** "Custom Layout" panel — user submits style intent + optional preferences
- **Input:** `{ styleIntent: string, preferences: { primaryFloral?, season?, mood? } }`
- **System prompt:**
  ```
  You are a wreath blueprint engine for Evercrafted. You output valid JSON placement
  arrays for the Design Sketch Studio canvas. Follow FFLGA classification and polar
  coordinate principles. Output JSON only — no prose, no markdown fences.
  ```
- **Output:** JSON array in `wreathDesigns` element format → fed to `createSketchElements()`
- **Validation:** Parse JSON, verify x/y in range 13–88, verify types are valid
- **Max tokens:** 512
- **API route:** `POST /api/claude` with `requiredTier: "atelier"`

---

## 5. Data Model

### `profiles` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | References `auth.users(id)` |
| `email` | text | |
| `full_name` | text | |
| `tier` | text | `bloom\|craft\|studio\|atelier`, default `bloom` |
| `stripe_customer_id` | text | Set by Stripe webhook |
| `stripe_subscription_id` | text | Set by Stripe webhook |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

**RLS:** User can SELECT/UPDATE own row only.

---

### `saved_sketches` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | References `profiles(id)` |
| `name` | text | User-provided label |
| `style` | text | e.g. "Victorian", "Custom" |
| `elements` | jsonb | Full element placement array |
| `specs` | jsonb | `{ diameter, style, balance, element_count }` |
| `note` | text | Design note |
| `is_ai_note` | boolean | True if Claude-generated |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | Auto-updated via trigger |

**RLS:** User can SELECT/INSERT/UPDATE/DELETE own rows only.

---

### `ai_generations` table
| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | |
| `action` | text | `generate_note` or `generate_layout` |
| `input_hash` | text | SHA-256 of input (for dedup/analytics) |
| `tokens_used` | integer | |
| `created_at` | timestamptz | |

**RLS:** User can SELECT own rows. INSERT is service-role only.

---

## 6. API Routes

| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/claude` | POST | Bearer token (Supabase JWT) | Proxies to Anthropic after verifying auth + tier |
| `/api/sketches` | GET | Bearer token | Returns user's saved sketch library |
| `/api/sketches` | POST | Bearer token (Craft+) | Saves a new sketch |
| `/api/sketches/[id]` | PUT | Bearer token | Updates an existing saved sketch |
| `/api/sketches/[id]` | DELETE | Bearer token | Deletes a saved sketch |
| `/api/stripe/webhook` | POST | Stripe signature | Updates `profiles.tier` on subscription events |

---

## 7. Component Map

```
app/studio/sketch/page.tsx
  ├── AppHeader (ec-app-header, tier badge, logout)
  ├── HeroStrip (title, global controls)
  ├── FilterBar (style filter buttons)
  └── DesignsGrid
        └── DesignCard (× 6 default + dynamic)
              ├── DesignCardHeader (title, subtitle, icon buttons)
              ├── WreathCanvas (wreath-sketch, base ring, SVG guides, elements)
              ├── SpecsBar (diameter, elements, style, balance)
              ├── DesignNote (editorial text)
              └── TierGate (wraps AI actions — Atelier only)
                    ├── GenerateNoteButton
                    └── CustomLayoutPanel

components/ui/TierGate.tsx   — blur overlay + upgrade CTA
hooks/useTier.ts             — reads tier from Supabase session
lib/tier.ts                  — TIER_RANK, canAccess(), labels, colors
lib/claude.ts                — generateDesignNote(), generateCustomLayout()
app/api/claude/route.ts      — server proxy (auth + tier enforcement)
app/api/sketches/route.ts    — CRUD for saved sketch library
app/api/stripe/webhook/route.ts — tier sync from Stripe
```

---

## 8. Deployment Checklist

### Supabase
- [ ] Create new Supabase project
- [ ] Run `supabase/migrations/001_init.sql` in SQL editor
- [ ] Confirm `profiles` trigger fires on new user (test via Auth → Add User)
- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel
- [ ] Set `SUPABASE_SERVICE_ROLE_KEY` in Vercel (server-side only, no NEXT_PUBLIC_)
- [ ] Enable Email auth provider in Supabase Auth settings

### Stripe
- [ ] Create 4 products in Stripe (Bloom, Craft, Studio, Atelier) with monthly prices
- [ ] Copy price IDs to `STRIPE_PRICE_*` env vars
- [ ] Create webhook endpoint pointing to `{NEXT_PUBLIC_APP_URL}/api/stripe/webhook`
- [ ] Subscribe webhook to: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

### Anthropic
- [ ] Generate API key at console.anthropic.com
- [ ] Set `ANTHROPIC_API_KEY` in Vercel (server-only, never NEXT_PUBLIC_)
- [ ] Confirm `/api/claude` route blocks unauthenticated requests in test

### Vercel
- [ ] Connect GitHub repo to Vercel project
- [ ] Set all env vars from `.env.local.example` in Vercel Environment Variables
- [ ] Set `NEXT_PUBLIC_APP_URL` to production domain
- [ ] Deploy and verify: auth flow → tier gate → AI generation → save sketch

---

## 9. Known Limitations / Future Work

- **PNG export** (Craft+): `html2canvas` or `canvas` serialization of the wreath sketch — not yet implemented. The wreath canvas uses CSS-positioned divs, not a `<canvas>` element; a DOM-to-canvas library will be needed.
- **Blueprint JSON export** (Studio+): the current element format is close to Evercrafted's `EC_CANON_V1` but not identical — a transform function mapping `sketch elements → blueprint JSON` is needed.
- **Saved sketch library UI**: the save/load flow is specced but the library page (`/studio/sketch/library`) is not scaffolded here.
- **AI rate limiting**: `ai_generations` table is seeded for analytics but a hard per-user daily cap is not enforced yet — add a count check in `/api/claude/route.ts`.
- **Canvas animation on re-render**: in Next.js, triggering the CSS `@keyframes sketchAppear` requires removing and re-adding elements (same approach as the HTML prototype). Consider using Framer Motion for cleaner animation lifecycle management.
- **Offline / SSR**: the canvas JS runs client-side only — ensure `WreathCanvas` is wrapped in a `"use client"` directive and sketch elements are initialized in `useEffect`.
