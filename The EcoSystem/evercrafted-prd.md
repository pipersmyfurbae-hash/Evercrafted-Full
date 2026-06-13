# Evercrafted — Memory-to-Masterpiece Studio
## Product Requirements Document (PRD)
**Version:** 1.0  
**Status:** Pre-launch / Waitlist Active  
**Author:** Bret Michael Baden  
**Last Updated:** April 2026  

---

## 1. Product Overview

### 1.1 What It Is

Evercrafted is a subscription SaaS platform for wreath and floral design artists. Its flagship product — the **Memory-to-Masterpiece Studio** — transforms a client's written memory or emotional intent into a fully manufactured wreath blueprint through a 10-module AI pipeline.

The platform bridges the gap between emotional storytelling and technical production. A client types a paragraph. The platform outputs a polar-coordinate blueprint, a stem-by-stem floral recipe, a buildable WGS genome string, a Midjourney render prompt, and a PDF Build Guide — all traceable back to the original emotion.

### 1.2 The Problem

Wreath and floral designers face three compounding problems:

1. **The translation problem.** Clients communicate in feelings, memories, and vibes. Designers have to interpret these into specific florals, proportions, and placements. This translation is invisible, time-consuming, and often wrong.

2. **The repeatability problem.** Even a design that lands perfectly is nearly impossible to reproduce, scale, or sell as a blueprint. There's no standard format.

3. **The presentation problem.** Without a render, clients can't visualize the finished piece before it's built. Approval rates suffer. Change requests eat margins.

### 1.3 The Solution

Evercrafted encodes the entire design process — emotion mapping, floral selection, placement math, render generation — into a structured, auditable pipeline. Every output is traceable to the emotional source. Every design is exportable as a compact, versioned genome string.

### 1.4 Target Users

| Segment | Description | Primary Need |
|---|---|---|
| **Independent wreath artists** | Sell custom wreaths on Etsy or via commission | Client intake → production-ready blueprint faster |
| **Faux floral studio owners** | Run a workshop or small design studio, multiple clients | Repeatability, genome sharing, inventory alignment |
| **DIY design enthusiasts** | Build wreaths for themselves, gifts, or seasonal décor | Guided design with emotion-first prompting |
| **Floral educators** | Teach wreath design in courses or workshops | Blueprint exports as curriculum artifacts |

---

## 2. Goals and Success Metrics

### 2.1 Business Goals

- Reach 100 paying subscribers within 90 days of public launch
- Achieve 40%+ conversion from waitlist to paid tier
- Establish Studio tier ($49/mo) as the primary revenue driver
- Validate willingness to pay for Atelier AI features before scaling infrastructure costs

### 2.2 Product Goals

- Every user can complete a full Memory → Blueprint cycle in under 10 minutes on first use
- Emotion-to-design translation output feels personalized, not generic, to 80%+ of users
- Blueprint canvas previews are accurate enough to use as client approval materials without modification
- Genome strings are human-readable and copyable — users can share them in DMs or emails

### 2.3 Key Metrics

| Metric | Target | Measurement |
|---|---|---|
| Waitlist → paid conversion | ≥ 40% | Stripe subscription created within 7 days of email invite |
| Time to first blueprint | < 10 min | Time from account creation to first `blueprints` row saved |
| Blueprint save rate | ≥ 60% | % of users who reach Step 4 and save |
| Tier upgrade rate (month 2) | ≥ 20% | Bloom/Craft → Studio/Atelier within 60 days |
| MJ prompt copy rate | ≥ 70% | % of Studio+ users who copy the compiled prompt |
| Churn (month 3) | < 12% | Monthly subscription cancellation rate |

---

## 3. Platform Architecture

### 3.1 The 10-Module Ecosystem

All modules share a single **BlueprintJSON** as the source of truth. No module stores its own state.

| # | Module | Input | Output |
|---|---|---|---|
| 1 | Memory-to-Masterpiece AI | Raw memory text | EmotionScore[], glyphs[], design story, BlueprintIntent |
| 2 | Emotional Floral Mapper | EmotionScore[], BlueprintIntent | FloralRecipeDraft, palette |
| 3 | Anchor Point Visualizer | BlueprintLayout | Polar-coordinate canvas (600×600px) |
| 4 | AI Florist Assistant | Any BlueprintElement | Floriography explanation, emotion rationale |
| 5 | Blueprint JSON Generator | BlueprintLayout | Manufacturing-ready coordinates + metadata JSON |
| 6 | Floral Photo Analyzer | Stock photo URL or upload | FloralElement (size, color, texture) |
| 7 | Wreath Build Guide Creator | BlueprintLayout + FloralRecipeDraft | Narrative PDF: story + recipe + step-by-step build |
| 8 | Design Studio (shell) | All modules | React drag-drop editor, module host |
| 9 | Symmetry Engine | BlueprintLayout | Bilateral/radial balance enforcement |
| 10 | Aesthetic Fitness Evaluator | BlueprintLayout | AestheticScores (0–100), improvement suggestions |

### 3.2 Pipeline Flow

```
MemoryInput
  → [1] EmotionScore[] + glyphs + BlueprintIntent
  → [2] FloralRecipeDraft
  → [3 + 9] BlueprintLayout (placed, balanced)
  → [10] AestheticScores + repaired layout
  → [5] BlueprintJSON export
  → [7] Build Guide PDF
  ↕
  [4] AI Florist explains any element, any time
```

### 3.3 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Backend / API | Next.js API routes (server-side only) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth |
| Payments | Stripe Subscriptions + Webhooks |
| AI | Anthropic API — `claude-sonnet-4-20250514` (server-side only, never client-exposed) |
| Deployment | Vercel |
| Storage | Supabase Storage (blueprint assets, PDF exports) |

---

## 4. Subscription Tiers

### 4.1 Tier Definitions

| Tier | Price (Monthly) | Price (Annual) | Target User |
|---|---|---|---|
| **Bloom** | $12/mo | $10/mo | Learners, occasional designers |
| **Craft** | $29/mo | $23/mo | Active designers, inventory management |
| **Studio** | $49/mo | $39/mo | Working artists, client commissions |
| **Atelier** | $89/mo | $71/mo | Power users, studio owners, AI-forward workflows |

### 4.2 Feature Access Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|---|---|---|---|
| Seasonal lookbooks | ✓ | ✓ | ✓ | ✓ |
| Tutorial guide library | ✓ | ✓ | ✓ | ✓ |
| Emotion vocabulary reference | ✓ | ✓ | ✓ | ✓ |
| Design principles course | ✓ | ✓ | ✓ | ✓ |
| Inventory tracker + FFLGA tagging | — | ✓ | ✓ | ✓ |
| Pricing calculator | — | ✓ | ✓ | ✓ |
| Client intake engine | — | ✓ | ✓ | ✓ |
| Basic blueprint canvas (view only) | — | ✓ | ✓ | ✓ |
| Blueprint generator (full pipeline) | — | — | ✓ | ✓ |
| Midjourney prompt compiler | — | — | ✓ | ✓ |
| Blueprint collection builder | — | — | ✓ | ✓ |
| Save + version blueprints | — | — | ✓ | ✓ |
| AI Florist live assistant | — | — | — | ✓ |
| WGS Genome encode / breed / mutate | — | — | — | ✓ |
| Build Guide PDF export | — | — | — | ✓ |
| Memory-to-Masterpiece full pipeline | — | — | — | ✓ |
| All future apps | — | — | — | ✓ |

**Gating rule (non-negotiable):** Locked features are always visible with a `backdrop-filter: blur(6px)` overlay and upgrade CTA. Never `display:none`. Users must always be able to see what they're missing.

---

## 5. Core User Stories

### 5.1 Atelier — Full Pipeline

**Story:** "As a wreath artist with an Atelier subscription, I want to enter a client's memory and receive a complete blueprint so that I can begin building without any additional design decisions."

**Acceptance Criteria:**
- User can enter free-text memory in 2–3 sentences minimum
- AI returns 3–5 emotions with intensity scores within 10 seconds
- Blueprint intent (size, arc, density, symmetry) is auto-set from emotion data but editable
- Floral recipe shows role, suggested name, piece count, and emotion source for every entry
- Canvas renders placements using polar coordinates within 3 seconds of recipe generation
- WGS genome string is generated and copyable
- Midjourney prompt is compiled from Style DNA + recipe and is ready to paste into MJ without editing
- User can save the blueprint; it appears in their blueprint library

### 5.2 Studio — Blueprint Generation

**Story:** "As a Studio subscriber, I want to generate a wreath blueprint from an emotion brief and see a canvas preview so I can present it to a client for approval."

**Acceptance Criteria:**
- User completes memory input → emotion map → blueprint steps
- Blueprint canvas shows focal, secondary, filler, and greenery placements color-coded by role
- Optical balance quadrant scores are visible
- Aesthetic score (0–100) is shown with a label
- Midjourney prompt is generated and accessible
- Blueprint is saveable; genome string is blurred with Atelier upgrade CTA visible

### 5.3 Craft — Inventory Management

**Story:** "As a Craft subscriber, I want to tag my inventory items with FFLGA roles and emotion tags so the system can suggest appropriate florals when I'm composing a design."

**Acceptance Criteria:**
- User can upload or manually enter inventory items
- Each item can be assigned: role (Focal/Filler/Line/Greenery/Accent), color (HSL), floriography tags, style tags, stock level
- Items are stored and retrievable per user account
- FFLGA classification is suggested by AI, editable by user
- Tagged inventory feeds into blueprint floral selection for Studio+ users

### 5.4 Bloom — Education

**Story:** "As a new designer on the Bloom plan, I want to browse seasonal lookbooks and design guides so I can learn the vocabulary and principles before investing in design tools."

**Acceptance Criteria:**
- Lookbook content is accessible immediately on signup
- Design principle modules are readable and linked to relevant tools visible (but locked) in the platform
- Clear visual hierarchy shows what's available at higher tiers — with upgrade prompts, not restrictions

---

## 6. Functional Requirements

### 6.1 Authentication + Accounts

- Email/password signup via Supabase Auth
- User profile created automatically on signup (`profiles` table trigger)
- Default tier on signup: `bloom`
- Tier is read from `profiles.tier` on every protected route; never from a client-side variable

### 6.2 AI Integration

- **All Anthropic API calls are server-side.** `ANTHROPIC_API_KEY` is never exposed to the client.
- Client calls `/api/claude` with `{ messages, promptKey, requiredTier }`
- Server verifies session, checks `profiles.tier` against `requiredTier` before calling Anthropic
- Three named system prompts are canonical and version-controlled in `lib/claude.ts`:
  - `emotionAnalyzer` — Memory → EmotionScores + glyphs + story
  - `blueprintComposer` — Emotions + params → BlueprintIntent + FloralRecipeDraft + genome
  - `promptCompiler` — Blueprint + recipe → Midjourney string
- Style DNA rules are enforced in `promptCompiler` system prompt. Forbidden: cherry blossoms, pussy willow, twig-based blossoms.
- Model: `claude-sonnet-4-20250514`. Do not use Haiku for blueprint generation — output quality degrades noticeably.

### 6.3 Blueprint Canvas

- Canvas is 440×440px in prototype, 600×600px in production
- Scale: 25px/inch; center: (cx, cy) = (canvas/2, canvas/2)
- Greenery and filler use golden-angle distribution: `angleDeg = (k × 137.5) % 360`
- Focal cluster placement for crescent: arc from 220°–320° (4–8 o'clock), 3–4 cluster groups
- Rotation rule: `rotationDeg = angleDeg + 90` (stems face outward perpendicular to wreath tangent)
- Quadrant optical balance target: focal quadrant 1.2–1.4× average; all others within ±20%
- Layer z-index: greenery=1, filler=2, secondary=2, focal=3

### 6.4 WGS Genome System

- Format: `EC-{size}{style}-{density}-{emotion codes}-F:{skus}-S:{skus}-FL:{skus}-GR:{skus}`
- Example: `EC-24C-MDM-GRF-NOS-WRM-F:BDAHL+AROSE-S:IVROSE+PAMPA-FL:CTTN+DUSTY-GR:SDEUCL+RUSC`
- Genome must be decodable back to a full BlueprintIntent + FloralRecipeDraft
- Mutate: change one segment (palette, density, focal SKU) and re-encode
- Breed: merge two genome strings by taking alternating segments from each parent
- Genome encode/decode/mutate/breed: Atelier only

### 6.5 Data Persistence

Two primary tables (see Developer Spec for full schema):

**`profiles`** — one row per user. Stores tier, Stripe IDs.

**`blueprints`** — one row per saved design. Stores: memory text, emotions JSON, glyphs array, blueprint intent JSON, floral recipe JSON, genome string, MJ prompt, aesthetic score. RLS: users can only read/write their own rows.

### 6.6 Payments (Stripe)

- Four Stripe products, one price per tier per billing period (monthly + annual = 8 price IDs total)
- Checkout: `/api/stripe/checkout` creates a Stripe Checkout session; redirects to Stripe-hosted page
- Webhook: `/api/stripe/webhook` handles `subscription.created`, `subscription.updated`, `subscription.deleted`
- On successful subscription: `profiles.tier` is updated to match the subscribed price ID
- On cancellation: `profiles.tier` reverts to `bloom`
- Stripe signature verification is required on all webhook calls

---

## 7. Non-Functional Requirements

### 7.1 Performance

- AI response time (emotion analysis): < 8 seconds P90
- Canvas render time: < 500ms after recipe is available
- Page load (marketing site): < 2.5s LCP on desktop
- Blueprint save: < 1 second round trip

### 7.2 Security

- `ANTHROPIC_API_KEY` server-side only. Any PR that adds `NEXT_PUBLIC_ANTHROPIC_` is blocked.
- All Supabase queries run through RLS — no service-role client on the frontend
- Stripe webhook endpoint validates `stripe-signature` header before processing
- Session checked on every `/api/*` route before any data access

### 7.3 Accessibility

- Color contrast: all text meets WCAG AA (4.5:1 minimum)
- All interactive elements keyboard accessible
- Blueprint canvas has text-based blueprint summary as accessible fallback
- Locked feature overlays include descriptive `aria-label` on upgrade buttons

### 7.4 Mobile

- Marketing site: responsive at 375px, 640px, 768px, 960px, 1280px
- App studio: minimum usable at 768px; full experience at 1024px+
- Canvas: minimum 320×320px on mobile with pan/zoom gesture support (v2)

---

## 8. Design System

### 8.1 Fonts

| Role | Font | Use |
|---|---|---|
| Display / Heading | Cormorant Garamond | All headings, editorial titles |
| Decorative Accent | Dancing Script | Wordmark, section accents — one per section max |
| Body / UI | Inter | All body copy, labels, buttons |
| Code / Mono | DM Mono | Genome strings, system labels, data values |

### 8.2 Color Tokens (canonical — use always, no raw hex)

```css
--ec-white: #FFFFFF          --ec-green: #4A6741
--ec-off-white: #F9F7F4      --ec-green-light: #6B8F67
--ec-paper: #F2EFE9          --ec-green-pale: #EEF2ED
--ec-black: #1A1A1A          --ec-green-dim: rgba(74,103,65,0.12)
--ec-charcoal: #2E2E2E
--ec-ink: #4A4A4A
```

### 8.3 Tier Colors

| Tier | Background | Text |
|---|---|---|
| Bloom | `#EEF2ED` | `#4A6741` |
| Craft | `#EEF4F9` | `#4A6785` |
| Studio | `#F5EEF4` | `#7A4A85` |
| Atelier | `#1A1A1A` | `#F2EFE9` |

### 8.4 Layout Rules

- Body background: `var(--ec-off-white)` — never dark
- Zero border-radius on interactive elements (buttons, inputs)
- Max content width: 1200px centered
- Section padding: 120px vertical desktop, 64px mobile
- Locked features: blur overlay (`backdrop-filter: blur(6px)`) + upgrade CTA. Never `display:none`

### 8.5 Content Rules

- All copy: gender-neutral language
- Product descriptions: clean, intuitive, elevated voice — not clinical
- No cherry blossoms, pussy willow, or twig-based blossoms in any wreath imagery or prompts
- Botanical SVG accents at section transitions
- Every wreath design has a story ("who lives here?") — fictional is fine

---

## 9. Roadmap

### Phase 1 — Foundation (Weeks 1–4)
**Goal: Core loop working end-to-end.**

- [ ] Next.js project scaffold with Supabase auth
- [ ] `profiles` table + tier system wired
- [ ] `/api/claude` route with tier enforcement
- [ ] Memory input form → Emotion Analyzer → results display
- [ ] Blueprint Composer → recipe + intent display
- [ ] Polar coordinate canvas (basic render)
- [ ] Blueprint save to Supabase
- [ ] Stripe checkout + webhook → tier update
- [ ] Marketing site live with waitlist capture

**Exit criteria:** One real user can go from memory input to saved blueprint and pay for a subscription.

### Phase 2 — Studio Features (Weeks 5–8)
**Goal: Studio tier fully deliverable.**

- [ ] Midjourney Prompt Compiler (server-side, Style DNA enforced)
- [ ] Blueprint collection builder (group + name blueprints)
- [ ] Blueprint versioning (save iterations of the same design)
- [ ] Canvas refinement: cluster rendering, z-index layering, quadrant balance meters
- [ ] Inventory tracker with FFLGA tagging UI
- [ ] Client intake form (standalone shareable link)
- [ ] Blueprint JSON export (downloadable)

**Exit criteria:** Studio subscriber can complete a full client commission cycle without leaving the platform.

### Phase 3 — Atelier Features (Weeks 9–12)
**Goal: Atelier tier fully deliverable.**

- [ ] WGS Genome encode/decode/mutate/breed operations
- [ ] AI Florist live assistant (per-element floriography chat)
- [ ] Build Guide PDF export (WeasyPrint or Puppeteer)
- [ ] Aesthetic Fitness Evaluator (rule-based scoring, Phase 9 GNN replacement)
- [ ] Multi-provider Memory-to-Masterpiece registry UI
- [ ] Genome sharing (public URL → decode on landing)
- [ ] Bloom + Craft content library (lookbooks, tutorials)

**Exit criteria:** Atelier subscriber receives a full client deliverable (PDF Build Guide + MJ render prompt + genome string) from a single memory input, without touching another tool.

### Phase 4 — Scale (Weeks 13–20)
- Marketplace Blueprint Creator (sell locked + shell blueprints)
- Inventory integration with real supplier SKUs
- Blueprint Reverse Engineer (photo → blueprint)
- Mobile-optimized canvas with touch gestures
- Team accounts (studio owner + multiple designers)
- GNN-based Aesthetic Fitness Evaluator
- Analytics dashboard (blueprints created, tier distribution, MJ prompt copy rate)

---

## 10. Out of Scope (v1)

The following are explicitly deferred:

- **Real-time collaboration** — no multi-user editing on a single blueprint
- **Supplier SKU matching** — floral recipe uses suggested names, not live supplier inventory
- **3D canvas rendering** — blueprint canvas is 2D polar preview only
- **Mobile-native app** — web responsive only; no iOS/Android app
- **White-label** — no reseller or agency white-label in v1
- **Public marketplace** — blueprint marketplace is Phase 4
- **Video tutorials** — Bloom content is written/image only in v1

---

## 11. Open Questions

| Question | Owner | Status |
|---|---|---|
| Should Craft users see the full blueprint canvas or a read-only simplified version? | Product | Open |
| Pricing: is $89/mo appropriate for Atelier or should AI call costs push it to $99+? | Business | Open |
| Should the client intake form (shareable link) be a Craft feature or Studio? | Product | Open |
| PDF Build Guide: WeasyPrint (server Python) or Puppeteer (Node headless)? | Engineering | Open |
| Should the genome string be stored as a separate indexed column or inside blueprint JSON? | Engineering | Recommendation: separate column for searchability |
| Will Marketplace blueprints use a separate `marketplace_blueprints` table or flag on existing? | Engineering | Open |
| Founding member discount: 30% lifetime or 30% for first 12 months? | Business | Open |

---

## 12. Appendix

### 12.1 Key Data Types (TypeScript)

```typescript
// Core emotion
interface EmotionScore {
  label: string;        // 'grief' | 'gratitude' | 'nostalgia' | etc.
  intensity01: number;  // 0–1
  valence?: number;
  arousal?: number;
}

// Floral inventory item
interface FloralElement {
  sku: string;
  commonName: string;
  roles: FflgaRole[];       // 'focal' | 'filler' | 'line' | 'greenery' | 'accent'
  hueDeg: number;
  saturation01: number;
  lightness01: number;
  floriographyTags: string[];
  styleTags: string[];
  glyphAffinities?: string[];
}

// Blueprint — the single source of truth
interface BlueprintLayout {
  wreathSpec: { diameterIn: number; pixelsPerInch: number; canvasPx: number };
  intentSnapshot: BlueprintIntent;
  elements: BlueprintElement[];
  balanceDiagnostics?: { quadrantWeights: {...}; status: string };
  schemaVersion: string;
}
```

### 12.2 Glyph Vocabulary

`quiet_strength` · `grief` · `threshold` · `circle_of_life` · `journey` · `veil` · `warmth` · `nostalgia` · `celebration` · `rootedness`

### 12.3 Emotion → Design Mapping (summary)

| Emotion Cluster | Color Direction | Texture | Zone |
|---|---|---|---|
| Grief + quiet strength | Cool greens/blues, low saturation | Matte, frayed | Base + veil |
| Gratitude + warmth | Dusty rose, soft gold, warm neutrals | Velvety, round | Mid ring |
| Nostalgia + peaceful | Muted analogous (blue-green-grey) | Airy, trailing | Even radial |
| Celebration + joy | Warm corals, pinks, yellows | Glossy, full | Focal arc |

### 12.4 Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_BLOOM / CRAFT / STUDIO / ATELIER
ANTHROPIC_API_KEY          ← server-side only, never NEXT_PUBLIC_
NEXT_PUBLIC_APP_URL
```
