# Flower Perception Engine — Developer Spec
**Version:** 1.0 | **Tier:** Studio (batch: Atelier) | **App ID:** `flower-perception-engine`

---

## 1. What This App Does

The Flower Perception Engine lets a user upload a photo of any flower or floral arrangement and receive back structured emotional + botanical intelligence. The AI analyzes the image for color profile, shape, texture, and structural density, then maps those visual features to an emotional profile (e.g., "Peace: 0.82, Nostalgia: 0.64"). The user can fine-tune emotion intensities via sliders, then trigger a second AI call that converts the perception object directly into a Evercrafted wreath blueprint — the same canonical blueprint format used by every other pipeline entry point (Memory Weaver, Inventory Weaver, etc.).

The app functions as a parallel entry point into the Evercrafted design pipeline. It does **not** create a separate tool; it feeds the same canonical blueprint object and shares the same render pipeline.

---

## 2. User Flow

1. User logs in and navigates to **Flower Perception Engine** (Studio+ required)
2. **Screen 1 — Capture:** User selects single image mode (or batch, if Atelier) and uploads a floral photo via drag-drop or file picker
3. **Screen 2 — Processing:** Image is sent to `/api/perception` (server-side proxy). Animated step progress plays while Claude Vision API runs
4. **Screen 3 — Results:** Canonical Perception Object is displayed — emotional profile bars, visual breakdown pills, color swatches, generated tags. Perception ID is shown and persisted to Supabase
5. **Screen 4 — Adjust (optional):** User drags sliders to modify emotion intensity scores. Adjustments are saved to `flower_tag_learning` table and patched back into the perception object
6. **Screen 5 — Generate:** Summary of perception data displayed. User clicks "Build My Wreath"
7. **Screen 6 — Output:** Blueprint JSON displayed with SVG layout preview. User can copy JSON or download PDF (PDF connects to Blueprint PDF skill). "New Scan" resets flow

---

## 3. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---------|-------|-------|--------|---------|
| Single image analysis | ✗ | ✗ | ✓ | ✓ |
| Emotion profile display | ✗ | ✗ | ✓ | ✓ |
| Emotion intensity sliders | ✗ | ✗ | ✓ | ✓ |
| Blueprint generation from perception | ✗ | ✗ | ✓ | ✓ |
| SVG layout preview | ✗ | ✗ | ✓ | ✓ |
| Blueprint JSON export | ✗ | ✗ | ✓ | ✓ |
| PDF download | ✗ | ✗ | ✓ | ✓ |
| Perception history | ✗ | ✓ | ✓ | ✓ |
| Batch analysis (100+ images) | ✗ | ✗ | ✗ | ✓ |
| Inventory auto-tagging | ✗ | ✗ | ✗ | ✓ |
| Marketplace intelligence feed | ✗ | ✗ | ✗ | ✓ |

---

## 4. AI Integration

### Call 1 — Flower Vision Analysis
- **Required tier:** Studio
- **Endpoint:** `/api/perception` → `action: "analyze"`
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1200
- **Input:** `imageBase64` (string), `mediaType` (e.g. `image/jpeg`)
- **Output:** Full `PerceptionObject` (see TypeScript types in `lib/claude.ts`)
- **System prompt:** See `lib/claude.ts → PERCEPTION_SYSTEM_PROMPT`
- **Response format:** JSON only — no markdown, no backticks
- **Error handling:** If JSON.parse fails, return 500 with raw text for debugging

### Call 2 — Blueprint Generation
- **Required tier:** Studio
- **Endpoint:** `/api/perception` → `action: "to-blueprint"`
- **Model:** `claude-sonnet-4-20250514`
- **Max tokens:** 1000
- **Input:** Extracted fields from PerceptionObject (emotions, colors, shape, density, spatial injection)
- **Output:** `BlueprintObject` with `origin: "image_perception"` and `source_perception_id`
- **System prompt:** See `lib/claude.ts → BLUEPRINT_SYSTEM_PROMPT`

---

## 5. Data Model

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | References auth.users |
| email | text | |
| tier | text | bloom / craft / studio / atelier |
| stripe_customer_id | text | Nullable until subscribed |
| created_at | timestamptz | |

### `flower_perceptions`
| Column | Type | Notes |
|--------|------|-------|
| id | text (PK) | perc_XXXXXXXXX |
| user_id | uuid (FK) | references profiles |
| image_url | text | Nullable (base64 not stored) |
| emotional_profile | jsonb | Full EmotionalProfile object |
| visual_features | jsonb | Full VisualFeatures object |
| tags | jsonb | emotion_tags, color_tags, style_tags |
| confidence_score | float | 0.0–1.0 |
| created_at | timestamptz | |

**RLS:** Users read/insert/delete own rows only.

### `flower_tag_learning`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| perception_id | text (FK) | references flower_perceptions |
| user_id | uuid (FK) | |
| user_adjustments | jsonb | `{ emotionName: adjustedScore }` |
| created_at | timestamptz | |

**RLS:** Users manage own rows only.

### `inventory_emotional_tags` (Atelier only)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| sku | text | Unique per user |
| emotion_tags | jsonb | Array of emotion label strings |
| visual_signature | jsonb | Summary visual features |
| perception_id | text (FK, nullable) | Source perception |

**RLS:** Users manage own rows only.

### `perception_blueprints`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK) | |
| perception_id | text (FK) | |
| blueprint_id | text | bp_XXXXXXXX |
| blueprint_data | jsonb | Full BlueprintObject |
| created_at | timestamptz | |

---

## 6. API Routes

| Route | Method | Auth | Tier | Description |
|-------|--------|------|------|-------------|
| `/api/perception` | POST | ✓ | Studio | `action:"analyze"` — runs vision analysis, persists perception |
| `/api/perception` | POST | ✓ | Studio | `action:"to-blueprint"` — generates blueprint from perception |
| `/api/perception` | GET | ✓ | Craft+ | `?id=perc_XXX` — retrieve saved perception by ID |
| `/api/perception/batch` | POST | ✓ | Atelier | Batch analyze up to 100 images (future) |
| `/api/webhooks/stripe` | POST | ✗ | — | Stripe webhook → update profiles.tier |

---

## 7. Component Map

| Component | File | Renders |
|-----------|------|---------|
| `PerceptionCapture` | `components/perception/PerceptionCapture.tsx` | Screen 1 — upload zone, mode toggle |
| `PerceptionProcessing` | `components/perception/PerceptionProcessing.tsx` | Screen 2 — animated scan + step progress |
| `PerceptionResults` | `components/perception/PerceptionResults.tsx` | Screen 3 — emotion bars, visual pills, swatches, tags |
| `PerceptionAdjust` | `components/perception/PerceptionAdjust.tsx` | Screen 4 — emotion sliders, batch lock overlay |
| `PerceptionGenerate` | `components/perception/PerceptionGenerate.tsx` | Screen 5 — summary + Build CTA |
| `PerceptionOutput` | `components/perception/PerceptionOutput.tsx` | Screen 6 — SVG wreath, blueprint JSON, export |
| `WreathSVG` | `components/shared/WreathSVG.tsx` | SVG layout from cluster placement data |
| `TierGate` | `components/ui/TierGate.tsx` | Blur overlay + upgrade CTA for locked features |
| `StepIndicator` | `components/ui/StepIndicator.tsx` | 6-dot navigation strip |

---

## 8. Deployment Checklist

### Supabase
- [ ] Create new Supabase project
- [ ] Run `supabase/migrations/001_flower_perception_engine.sql`
- [ ] Confirm RLS is enabled on all 4 tables
- [ ] Test auth trigger: create user → verify profile row created with `tier: "bloom"`
- [ ] Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` to `.env.local`

### Stripe
- [ ] Create 4 products (Bloom, Craft, Studio, Atelier) with monthly prices
- [ ] Copy price IDs → `STRIPE_PRICE_BLOOM/CRAFT/STUDIO/ATELIER`
- [ ] Set up webhook → `/api/webhooks/stripe` for `customer.subscription.updated` event
- [ ] Webhook handler must update `profiles.tier` on subscription change
- [ ] Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

### Vercel
- [ ] Connect GitHub repo to Vercel project
- [ ] Add all env vars from `.env.local.example` to Vercel Environment Variables
- [ ] Confirm `ANTHROPIC_API_KEY` is NOT prefixed with `NEXT_PUBLIC_`
- [ ] Deploy and test full 6-screen flow end-to-end
- [ ] Test tier gates: log in as bloom user → confirm Studio features show locked overlay

### Smoke Tests
- [ ] Upload a flower image → perception object returns valid JSON
- [ ] Confidence score renders on results screen
- [ ] Emotion sliders save adjustments correctly
- [ ] Blueprint generates and SVG renders from cluster data
- [ ] Copy JSON button works
- [ ] Batch section shows Atelier lock overlay for Studio user
- [ ] `/api/perception` returns 401 for unauthenticated requests
- [ ] `/api/perception` returns 403 for Bloom/Craft user attempting analyze

---

## 9. Known Limitations / Future Work

- **Image storage:** Base64 is not persisted — only metadata. For history/gallery feature, add Supabase Storage bucket and upload image before analysis
- **Batch processing:** Atelier batch mode is UI-gated but API route is not yet implemented. Build as a queue job (Supabase Edge Function + pgQueue) to avoid timeout on 100+ images
- **Marketplace intelligence:** `inventory_emotional_tags` table is ready but the marketplace query layer (WHERE emotion_tags && ARRAY[...]) is not yet wired to blueprint selection
- **Self-improving database:** `flower_tag_learning` captures adjustments but no training loop exists yet — future: aggregate adjustments to improve base emotion mappings
- **PDF export:** `downloadPdf()` is stubbed — wire to Blueprint PDF skill when available
- **Mobile camera:** File picker works on mobile but a native camera capture flow (PWA or React Native) would improve the "scan in the field" use case
