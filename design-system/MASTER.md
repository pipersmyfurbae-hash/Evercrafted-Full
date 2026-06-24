# Evercrafted — Design System (MASTER)

The single source of truth for the Evercrafted look. Anchored on the homepage
brand; structured with UI/UX Pro Max rules (type scale, 8px rhythm, WCAG
contrast, component discipline). Every page should resolve to these tokens.

> Aesthetic: **Editorial botanical** — warm paper neutrals, sage green, muted
> gold, a serif display voice. Calm, premium, handcrafted. Not glassy, not neon,
> not corporate-blue.

---

## 1. Color tokens

```css
/* Neutrals (paper) */
--white:#FFFFFF;  --off-white:#F9F7F4;  --paper:#F2EFE9;  --warm:#EDE8E0;
/* Ink */
--black:#1A1A1A;  --charcoal:#2E2E2E;  --ink:#4A4A4A;  --muted:#787878;  --faint:#A8A8A8;
/* Sage green (primary brand) */
--green:#4A6741;  --green-l:#6B8F67;  --green-pale:#EEF2ED;  --green-dim:rgba(74,103,65,.10);
/* Gold (accent — use sparingly, ~10%) */
--gold:#9A7A40;  --gold-l:#C4A06A;  --gold-pale:#F5EFE4;  --gold-dim:rgba(154,122,64,.10);
/* Lines */
--border:#E4DFD8;  --border-dark:#CCC7BE;
```

**60-30-10:** 60% paper neutrals · 30% ink + sage · 10% gold accent.
**Contrast (verified):** ink `#4A4A4A` and darker on paper ≥ 4.5:1 (body OK).
`--muted #787878` on `--off-white` ≈ 4.6:1 — OK for secondary, not for body.
`--faint #A8A8A8` is decorative only (captions/dividers), never body text.
Footer: `--black` bg with white at .55–.6 opacity for links/body.

**Brand accent rule:** nav logo "crafted" = **green**; footer brand "crafted" = **gold** (`--gold-l`). Keep this split.

---

## 2. Typography

| Role | Font | Notes |
|---|---|---|
| Display / headings | **Cormorant Garamond** (serif) | weights 400–600; the brand voice |
| Body / UI | **Jost** (sans) | weights 300–600; 16px base, line-height 1.6 |
| Rare flourish | Dancing Script | one-off accents only, never UI |

**Type scale (px):** 12 · 14 · 16 · 18 · 24 · 32 · 48 · 64
- Body 16 / line-height 1.6 · small 14 · caption 12 (uppercase, letter-spacing .12em for overlines)
- H1 clamp(2.5rem,6vw,4rem) serif 400 · H2 clamp(1.8rem,4vw,2.6rem) · H3 1.5rem
- Measure: 60–75 chars (`max-width:~65ch` on long text)

Load: `Cormorant+Garamond:wght@400;500;600` + `Jost:wght@300;400;500;600`.

---

## 3. Spacing, radius, shadow, motion

- **Spacing** — 4/8px rhythm: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96. Section vertical rhythm 48/72/96.
- **Container** — `max-width:1200px`, horizontal pad `clamp(16px,4vw,48px)`.
- **Radius** — `--rsm:6px` (cards/inputs), pills `100px` (buttons/chips), 50% (florals/avatars).
- **Shadow** — sm `0 1px 4px /.06` · md `0 4px 20px /.08` · lg `0 12px 48px /.10` · hero `0 24px 80px /.12`.
- **Motion** — standard `220ms ease`; micro-interactions 150–300ms; respect `prefers-reduced-motion`.

---

## 4. Components

**Buttons**
- Primary: green pill — `background:var(--green)` · white text · `padding:12px 26px` · radius 100px · hover `--green` darken + `translateY(-1px)` + shadow-md.
- Secondary: outline pill — transparent · `1px solid var(--green)` · green text · hover green-pale fill.
- Min target 44×44px. `cursor:pointer`. Visible focus ring (2px green).

**Cards** — `background:var(--white)` · `1px solid var(--border)` · radius 6px · shadow-sm · hover shadow-md + border-dark. Pad 24–32px.

**Nav** — paper `--off-white` bar, `1px solid var(--border)` bottom, serif logo (green accent), Jost links `--muted`→`--green`, one green pill CTA ("Join waitlist").

**Footer** — `--black` bg, gold brand accent, 4-col (brand · Product · Tools · Company), white links at .55 opacity → white. Shared via `evercrafted-nav.js`.

**Inputs** — `--white` bg, `1px solid var(--border)`, radius 6px, 14–16px text, visible label above (never placeholder-only), focus border `--green`, error text below field in `--gold`/danger.

**Chips/badges** — pill, `--green-pale`/`--gold-pale` bg with matching text.

---

## 5. Anti-patterns (avoid)

- Emoji as structural icons → use SVG (Lucide/Heroicons), single stroke family.
- Per-page invented token names (`--gp`, `--gd`, `--mu`…) → resolve to the tokens above.
- Gray-on-gray body text (`--faint` as body).
- Gold as a large fill (it's a 10% accent).
- Glassy/neon/heavy-gradient effects — off-brand.
- Random shadow/radius/spacing values outside the scales here.
- Two competing navs or footers on one page (the shared chrome guards this).

---

## 6. Adoption status

- ✅ Shared nav + footer (`evercrafted-nav.js`) — matches these tokens.
- ✅ Homepage (`marketing-site`) — canonical source.
- ⏳ Marketing pages (how-it-works, pricing, about, try) — align token names → MASTER.
- ⏳ Tool pages (memory-scene, studio, catalogue, designs, inventory-dashboard, floral-tagger, build-view, commercial-creator) — adopt `evercrafted-theme.css`.

Implementation tokens live in `evercrafted-theme.css` (import to adopt).
