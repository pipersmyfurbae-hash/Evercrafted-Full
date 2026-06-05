# Marketplace Consolidation Plan — Evercrafted Studio apps

*Audit of the ~44 uploaded app folders → the real product line. June 2026.*

## Executive summary

There are **44 folders, not ~9 apps.** Dispositioned:

- **~10 internal engines** — infrastructure, not sellable (excluded).
- **~18 re-skins / marketing-pages / rebuilds of the CORE product** — these are *one* product (feeling → wreath design), built many times under different names. **Consolidate to one; cut the rest.**
- **~10–12 genuine add-ons** that cluster into **3 packs** (+ a couple Pro tools).
- **1 separate business** (Feel Space — interiors, not wreaths).
- **1 content asset** (Lookbook — editorial, not a tool).

**The headline:** the problem isn't packaging — it's that the core product was rebuilt ~10 times. Consolidate first, then sell **3 packs**, not 44 toggles.

## Method note — the pattern that explains the sprawl

Folders come in **"marketing page + functional app" pairs.** The functional one (has inputs + state + an AI/API call) is the keeper; the 0-input twin is its landing page. Build-state legend used below:

- **APP** — functional (inputs + state/`localStorage` and/or AI call)
- **PAGE** — marketing/shell (≈0 inputs)
- **SCAFFOLD** — has a production Next.js + Supabase + Stripe build (only Academy so far)

> Caveat on every "APP": the functional prototypes call `api.anthropic` **client-side** (exposed key) and are **not wired to the production engine/server**. "Keeper" means *harvest into the Academy scaffold pattern* (server proxy + tier gate + RLS) — not "ship the HTML as-is."

---

## 1. CORE product — consolidate ~10 → one

The "design a wreath from a feeling" studio exists ~10 times. This is **the base product**, not an add-on.

| Folder | Build | Disposition |
|---|---|---|
| **Blooma** | APP — 84KB, 44 btn, 10 inp, Anthropic | **Harvest its UX** into the production studio (best interaction design of the set) |
| **Design Studio WEBSITE** | PAGE — 104KB, polished | **Canonical landing page** for the studio |
| production `memory-scene` + `build-view` (main repo) | APP, engine-wired, server-proxied | **The actual functional core** — already correct; adopt Blooma's UX on top |
| Design Studio App · Wreath Studio Pro · Wreath AI · Wreathly AI · Blueprint Studio · Blooma-twin pages | PAGE/shell/rebrand | **CUT / merge** — duplicate brands of the above |
| Blueprint Library · Blueprint Generator 2 · Wreath Visualizer · Emotion Engine · Moodoor · StyleSync · Quadrat Arc(viz) | feature/iteration | **Fold into core** (saved-blueprints, build-view, intake) — not separate SKUs |

**Action:** pick the production pipeline as the engine, lift Blooma's UX + Design Studio WEBSITE's landing, retire the rest.

## 2. The packs (the real add-ons)

### Pack — Studio / Ops *("run my stock & design within it")*
| App | Build | Verdict |
|---|---|---|
| **Inventory Weaver** | APP — 52KB, 23 btn, 12 inp, localStorage | **KEEPER** (the functional inventory app) |
| Inventory Tracker | PAGE — 72KB, 0 inp | its marketing page → merge |
| **Design With What You Have** | APP — 64KB, 51 btn (inventory-constrained design) | **KEEPER** — distinct, high value (design from *your* stock) |
| Emotional Tagger / Taggr 2 | = production `floral-tagger` | merge into core tagging |

### Pack — Sell / Market *("list, price, sell")*
| App | Build | Verdict |
|---|---|---|
| **Pricing Calculator** | APP — 64KB, 6 inp, margin math | **KEEPER** — strongest standalone |
| **Etsy Listing Builder** | APP — 40KB, Anthropic, 6 inp | **KEEPER** |
| Client Portal | PAGE/shell — dup of Wreath Studio Pro's portal | **conditional** — dedupe; may belong in a Studio/Client pack |
| Lookbook | CONTENT — 0 inp, "updated quarterly" | **reclassify** → free Bloom-tier content (ongoing editorial cost, not a tool) |
| Humanizer | APP — generic, not wreath-specific | **CUT** (off-brand for an AI company) |

### Pack — Grow / Teach *("make money from my knowledge")*
| App | Build | Verdict |
|---|---|---|
| **Academy** | SCAFFOLD — full Next/Supabase/Stripe + PRD | **KEEPER — flagship** (and the build template for all others) |
| **Design Principles Coach** | APP — 40KB, Anthropic, distinct from Academy | **KEEPER** (AI coaches *the maker's* skill) |

### Pro add-ons (à la carte, power users)
- **Prompt Studio** — keeper of the 5-way prompt-engine pile (`Prompt Engine`, `Prompt Engineer`, `Blueprint Prompt Composser`, `EmotionLens` all merge in).
- **Parametric Lab** — parametric shape-from-mood; a *different* generation mode.
- *(Design Sketch — optional sketch mode; fold into core or drop.)*

## 3. Excluded — internal engines (not SKUs)
`The EcoSystem` · `The EcoSystem 2` · `Placement Fundamental Rules Engine` (PIE) · `Quadrat Arc` (QACS geometry) · `Floral Perception Engine` · `Asset Ingester` · `Reverse Pipeline` · `Blueprint Generator - UL` (backend code) · `Blueprint Visulizr` (seasonal demo) · `prototypes` · `design-system`.

## 4. Separate venture
**Feel Space** — "turn feelings into shoppable *spaces*" (interiors). Different market, different business. Spin out or shelve; out of scope here.

---

## 5. Keep / Cut tally

| Disposition | Count | Items |
|---|---|---|
| **CORE** (one product) | 1 | consolidated Studio (Blooma UX + DS-WEBSITE landing + production engine) |
| **PACK keepers** | 6 | Inventory Weaver · Design-With-What-You-Have · Pricing Calculator · Etsy Listing Builder · Academy · Design Principles Coach |
| **Pro add-ons** | 2 | Prompt Studio · Parametric Lab |
| **Conditional** | 1 | Client Portal (dedupe) |
| **Content / Separate** | 2 | Lookbook (free content) · Feel Space (spin out) |
| **Internal engines** | ~11 | excluded |
| **CUT / merged** | ~20 | studio re-skins, dup taggers/inventory pages, prompt dups, Humanizer |

**44 folders → ~9 sellable SKUs across 3 packs + 2 Pro tools, on one core.**

## 6. Pricing model (the decision this forces)

Academy ships with two models at once (tier-bundled *and* $99 lifetime). Resolve it for the whole line:

**Recommended — tiers + monthly add-on packs (hybrid):**
- **Base tiers** (Bloom free / Craft / Studio / Atelier) gate the **CORE** depth (designs per month, render quality, etc.).
- **3 packs as monthly add-ons** on top of *any* tier — Ops, Sell, Grow — so a Craft user can add the Sell pack. This is the "build your business" model, cleanly: **3 decisions, not 44.**
- **Pro tools** (Prompt Studio, Parametric Lab) à la carte for power users.
- **Academy** = anchor of the Grow pack; offer a **$99 lifetime** *only as a founding-launch tactic*, then retire it (lifetime = no recurring revenue, which fights the model).

**Avoid:** per-app à la carte (decision fatigue × 44) and lifetime-only (no MRR).

## 7. Build reality & sequencing

Only **Academy** is production-scaffolded. The other keepers are functional *prototypes* (insecure client-side AI, not engine-wired). So:

1. **Consolidate the core** — pick one Studio, retire the ~9 re-skins. (Biggest clarity win; costs nothing but decisions.)
2. **Port keepers into the Academy scaffold** — its auth + Stripe + tier-gate + RLS is the template. Do the 6 pack keepers one at a time.
3. **Wire each to the production engine/server** (no client-side keys; reuse `/api/*` + the entitlements pattern).
4. **Validate demand** with a "build your stack" page (the 3 packs) against the waitlist *before* building all the billing.

*The blueprint is the source of truth; the apps are how a maker turns it into a business.*
