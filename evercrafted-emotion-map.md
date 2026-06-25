# Evercrafted Canonical Emotion Map

**Single source of truth** for emotion → composition + palette. Lives in `engine.js` (`EMOTION_MAP`); the LLM emotion layer and the deterministic engine both reference it.

## The Cardinal-Rule split (non-negotiable)

- **LLM layer** returns **emotion tags + intensity weights (0.0–1.0) only** — never angles, radii, colors, or species. Its vocabulary comes from `emotionTags()`.
- **Deterministic engine** maps each tag → `dir` → **formula** → compass arc, and pulls the brand color + approved species. An emotion resolves to a **composition**, never a single point.

Convention is **compass** (0°=12 o'clock, clockwise) and the palette is the **muted memorial-luxury** brand set — deliberately NOT the math/CCW convention or saturated web primaries of external polar mappers.

## Canonical table

| Emotion | Brand color | Intensity zone | Direction | Lead formula | Compass placement | Approved species |
|---|---|---|---|---|---|---|
| **Peace** | `#8aaa8a` | inner · grounding/private | still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock | Weeping Silver Eucalyptus, Sweeping White Magnolia |
| **Trust** | `#6b7c5c` | inner · grounding/private | still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock | Matte Sage Seeded Eucalyptus, Olive Branch ~ |
| **Joy** | `#b89a5c` | inner · grounding/private | expansive | focal-burst | upper expansive cascade · 11–1 o'clock | Champagne-Dusted Faux Fern, Champagne Metallic Grass |
| **Anticipation** | `#a06040` | inner · grounding/private | traveling | side-sweep | trailing diagonal pull · 9 → 1 o'clock | Champagne Metallic Grass, Dried Wheat Sheaf ~ |
| **Sadness** | `#607888` | inner · grounding/private | draping | crescent | lower-left draping sweep · 7–9 o'clock | Matte Charcoal Manzanita Branch |
| **Grief** | `#485060` | inner · grounding/private | draping | crescent | lower-left draping sweep · 7–9 o'clock | Bare Black Architectural Branch, Deep Burgundy Velvet Rose, Stark White Bleached Branch |
| **Fear** | `#3a5242` | inner · grounding/private | contained | wild-asymmetry | contained structural tension · 8–11 o'clock | High-Gloss Black Magnolia Leaf |
| **Anger** | `#8a3030` | inner · grounding/private | contained | wild-asymmetry | contained structural tension · 8–11 o'clock | Deep Burgundy Velvet Rose, Dark Plum Scabiosa ~ |
| **Nostalgia** | `#9a8ab0` | outer · ambient/reaching | draping | crescent | lower-left draping sweep · 7–9 o'clock | Dusty Mauve Peony |
| **Melancholy** | `#7080a0` | outer · ambient/reaching | traveling | side-sweep | trailing diagonal pull · 9 → 1 o'clock | Charcoal Thistle Head |
| **Reverence** | `#6a5a78` | outer · ambient/reaching | still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock | Sweeping White Magnolia, Dried Lavender Bundle ~ |
| **Awe** | `#4a5a7a` | outer · ambient/reaching | traveling | side-sweep | trailing diagonal pull · 9 → 1 o'clock | Matte Silver-Leaf Spray, Blue Thistle ~ |
| **Romance** | `#a07080` | outer · ambient/reaching | still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock | Dusty Mauve Peony, Dusty Rose Garden Rose ~ |
| **Hope** | `#7a9a7a` | outer · ambient/reaching | expansive | focal-burst | upper expansive cascade · 11–1 o'clock | Luminous Ivory Ranunculus, Pale Champagne Berry Cluster |
| **Reflective** | `#8a9aaa` | outer · ambient/reaching | still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock | Matte Silver-Leaf Spray |
| **Longing** | `#7878a0` | outer · ambient/reaching | traveling | side-sweep | trailing diagonal pull · 9 → 1 o'clock | Dried Pampas Whisp |

_Species marked `~` are suggested (brand-appropriate) where the live inventory has no tag yet._

## Direction → geometry (how a tag becomes an arc)

| Direction | Formula | Compass region |
|---|---|---|
| still | half-ring | lower hemisphere, even & grounded · 4–8 o'clock |
| draping | crescent | lower-left draping sweep · 7–9 o'clock |
| traveling | side-sweep | trailing diagonal pull · 9 → 1 o'clock |
| expansive | focal-burst | upper expansive cascade · 11–1 o'clock |
| contained | wild-asymmetry | contained structural tension · 8–11 o'clock |

## Intensity → radius (the `zone` field)

Salvaged from the polar-mapper spec, mapped onto the engine's radius zones:

- **inner** (0–~40% of r_work): foundational, grounding, private core emotions — seated toward the heart of the band.
- **outer** (~60–100%, toward the silhouette boundary): fleeting, ambient, atmospheric or aspirational emotions — reaching outward.

Intensity *weight* additionally drives the engine's drama/density (low → airy, high → lush), not a literal pixel radius.

## Blended emotions

When a narrative blends two emotions, weight their directions proportionally to choose (or interpolate between) lead formulas, and blend their brand colors for the palette — the engine handles the geometry deterministically from the weighted tags.

## What this corrects from the external polar-mapper spec

1. **Convention** — compass (0°=12 o'clock, cw), not math/CCW from 3 o'clock.
2. **Palette** — muted brand hexes, not `#FFD700`/`#FF0000`/etc.
3. **Species** — approved silk botanicals, not sunflowers/marigolds/red roses.
4. **Authority** — emotion → *formula/composition* via the deterministic engine, not the LLM emitting coordinates (Cardinal Rule).
