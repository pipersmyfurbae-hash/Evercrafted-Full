---
name: floral-emotion-tagger
version: 2.0.0
description: "Tag uploaded inventory items with emotion labels based on floral type and color so the Evercrafted blueprint engine can select florals by emotional intent. Use this skill whenever the user wants to tag their inventory with emotions, assign emotional meaning to flowers or materials, prepare inventory for emotion-driven blueprint generation, map florals to feelings, or ask what emotions a flower represents. Also trigger when a user uploads a CSV or inventory list and wants it emotion-tagged, enriched, or prepared for Evercrafted's design engine. This skill is essential anytime the design pipeline needs to know WHAT emotion a floral item carries before placing it in a wreath."
changelog: "v2.0.0 — Introduced EC_EMOTION_VOCAB_V1 canonical closed vocabulary (32 tokens). All emotion_tags[], primary_emotion, and dominant_emotions fields now MUST draw exclusively from this enum. Eliminates free-generation drift and enables reliable blueprint engine matching."
---

# Floral Emotion Tagger

## Purpose
Read a raw inventory (CSV, list, or structured data) and tag each item with emotion labels based on two inputs:
1. **Floral type** — what the flower or material symbolically and psychologically conveys
2. **Color** — how the specific color of that item modifies or reinforces the emotional signal

Output is an emotion-enriched inventory that the Blueprint Composition Engine and Emotion-to-Design Translator can consume directly.

---

## ⚠️ CRITICAL: Canonical Emotion Vocabulary — EC_EMOTION_VOCAB_V1

**ALL emotion output fields must use tokens exclusively from this closed list.**
This applies to: `emotion_tags[]`, `primary_emotion`, `dominant_emotions[]`, and `emotion_gaps[]`.

**Never output a word that is not in this list.** If you cannot find a match, use the closest token and note it in `confidence`. Do not invent synonyms, compound phrases, or free-text emotions.

### EC_EMOTION_VOCAB_V1 — 32 Canonical Tokens

#### Mood Emotions (18 tokens)
| Token | Meaning / Use |
|---|---|
| `calm` | Peaceful stillness, no tension — hydrangea, eucalyptus, moss |
| `nostalgic` | Ache for the past, memory, sentimentality — garden rose, dried grass, peony |
| `romantic` | Love, intimacy, tender desire — rose, peony, ranunculus |
| `tender` | Gentle softness, care, vulnerability — blush florals, cotton stem |
| `joyful` | Bright happiness, delight, celebration — ranunculus, yellow/gold items |
| `elegant` | Refined, poised, sophisticated — ribbon, magnolia, dahlia |
| `mysterious` | Depth, intrigue, the unknown — hellebore, seed pod, deep purple |
| `dramatic` | High contrast, tension, bold presence — foxglove, burgundy dahlia, black accents |
| `grounded` | Earthy, rooted, stable — fern, pinecone, moss, brown/kraft tones |
| `resilient` | Strength through difficulty, endurance — thistle, protea, hellebore |
| `abundant` | Fullness, richness, generosity — berry stem, peony, gold tones |
| `serene` | Deep quiet, undisturbed peace — lavender, white, dusty blue |
| `playful` | Light, fun, unserious — berry stem, bright orange, hot pink |
| `warm` | Comfort, familiarity, welcoming — peach/coral, ivory, cotton stem |
| `melancholic` | Bittersweet, longing, quiet sadness — dusty blue, hellebore, dried grass |
| `bold` | Confident, daring, assertive — protea, deep pink, thistle |
| `whimsical` | Dreamy, imaginative, fairytale — anemone, lavender/lilac, foxglove |
| `luxurious` | Opulent, premium, indulgent — velvet ribbon, deep purple, metallic |

#### Design Intent Tokens (8 tokens)
| Token | Meaning / Use |
|---|---|
| `elevated` | Editorial, refined — used when a floral lifts the design above the everyday |
| `rustic` | Raw, natural, unpolished — twig, dried grass, kraft/brown |
| `structured` | Architectural, intentional form — branch, pinecone, seed pod |
| `organic` | Free-flowing, natural growth feel — fern, moss, eucalyptus |
| `festive` | Celebratory, occasion-specific — ribbon, berry stem, metallic |
| `minimal` | Spare, purposeful restraint — single-stem accents, white/cream, moss |
| `editorial` | High-fashion, styled, intentional — magnolia, dahlia, charcoal/black items |
| `softened` | Emotion is present but muted — dusty/greige tones, dried materials |

#### Seasonal Signals (6 tokens)
| Token | Meaning / Use |
|---|---|
| `renewal` | Spring energy, new beginning — eucalyptus, pale green, blush |
| `bloom` | Peak flowering, fullness of season — peony, ranunculus, garden rose |
| `harvest` | Late season abundance, gathering — berry stem, cotton stem, rust/terracotta |
| `wintry` | Cold stillness, frost, quiet — pinecone, silver/metallic, deep green |
| `autumnal` | Warm decay, rich color, transition — dahlia, rust, dried grass |
| `verdant` | Lush green growth, alive — fern, eucalyptus, deep green |

---

## Input Formats Accepted

- CSV with columns like: `SKU, name, type, color, quantity`
- Plain text list: `"12 stems white peony, 6 stems dusty rose eucalyptus..."`
- JSON inventory array from the Inventory Intelligence Engine output
- Single item queries: `"What emotion does a burgundy dahlia carry?"`

---

## Step-by-Step Process

### Step 1 — Parse the Inventory
Extract each item's:
- `floral_type` (rose, eucalyptus, hydrangea, dahlia, etc.)
- `color` (white, blush, burgundy, sage, dusty blue, etc.)
- `category` (focal / filler / greenery / texture / accent)
- `quantity` if available

If color or type is ambiguous, make a reasonable inference and flag it with `confidence: low`.

### Step 2 — Look Up Floral Type Emotions
Consult the **Floral Emotion Reference Table** below. Each entry maps directly to EC_EMOTION_VOCAB_V1 tokens only. Assign `primary_emotion` and supporting `emotion_tags[]` from this table.

### Step 3 — Apply Color Emotion Modifier
Consult the **Color Emotion Modifier Table** below. Colors amplify, shift, or soften the base emotion. All modifier outputs also map to EC_EMOTION_VOCAB_V1 tokens only.

### Step 4 — Merge and Output
Combine type emotions + color modifier into a final `emotion_tags[]` array. Rules:
- **Minimum 2 tags, maximum 4 tags** per item
- All tags must be valid EC_EMOTION_VOCAB_V1 tokens
- `primary_emotion` must be a single EC_EMOTION_VOCAB_V1 token — the strongest signal
- If a color modifier produces a tag already present from the floral type, skip the duplicate and use the next strongest modifier output

### Step 5 — Summarize the Collection
After tagging all items, output a `collection_emotion_summary`. All fields must use EC_EMOTION_VOCAB_V1 tokens.

---

## Floral Emotion Reference Table
*(All values are EC_EMOTION_VOCAB_V1 tokens)*

| Floral Type | Primary Emotion | emotion_tags[] pool |
|---|---|---|
| Rose | `romantic` | `romantic`, `warm`, `elegant`, `abundant` |
| Peony | `nostalgic` | `nostalgic`, `tender`, `abundant`, `bloom` |
| Hydrangea | `calm` | `calm`, `serene`, `organic`, `softened` |
| Eucalyptus | `calm` | `calm`, `organic`, `renewal`, `verdant` |
| Lavender | `serene` | `serene`, `calm`, `whimsical`, `renewal` |
| Dahlia | `dramatic` | `dramatic`, `elegant`, `bold`, `editorial` |
| Ranunculus | `joyful` | `joyful`, `warm`, `romantic`, `bloom` |
| Anemone | `whimsical` | `whimsical`, `bold`, `organic`, `mysterious` |
| Garden Rose | `nostalgic` | `nostalgic`, `romantic`, `warm`, `elegant` |
| Magnolia | `elevated` | `elevated`, `serene`, `editorial`, `structured` |
| Foxglove | `dramatic` | `dramatic`, `bold`, `whimsical`, `mysterious` |
| Hellebore | `mysterious` | `mysterious`, `melancholic`, `resilient`, `minimal` |
| Protea | `bold` | `bold`, `resilient`, `dramatic`, `editorial` |
| Thistle | `resilient` | `resilient`, `rustic`, `bold`, `grounded` |
| Fern | `organic` | `organic`, `grounded`, `verdant`, `serene` |
| Moss | `grounded` | `grounded`, `minimal`, `serene`, `wintry` |
| Cotton stem | `warm` | `warm`, `tender`, `harvest`, `rustic` |
| Berry stem | `abundant` | `abundant`, `harvest`, `joyful`, `festive` |
| Pinecone | `wintry` | `wintry`, `grounded`, `structured`, `nostalgic` |
| Ribbon / Velvet | `elegant` | `elegant`, `festive`, `luxurious`, `warm` |
| Twig / Branch | `structured` | `structured`, `rustic`, `minimal`, `grounded` |
| Dried grass | `nostalgic` | `nostalgic`, `organic`, `softened`, `autumnal` |
| Seed pod | `mysterious` | `mysterious`, `structured`, `autumnal`, `harvest` |

> If a floral type is not in this table, select the closest analog, map to EC_EMOTION_VOCAB_V1 tokens using botanical/cultural association, and set `source: inferred`.

---

## Color Emotion Modifier Table
*(All modifier outputs are EC_EMOTION_VOCAB_V1 tokens)*

| Color | Adds / Amplifies | Softens / Removes |
|---|---|---|
| White | `serene`, `minimal`, `softened` | removes `dramatic`, `bold` |
| Cream / Ivory | `nostalgic`, `warm`, `elevated` | softens `bold` |
| Blush / Light Pink | `tender`, `romantic`, `renewal` | softens `dramatic` |
| Deep Pink / Hot Pink | `bold`, `playful`, `joyful` | removes `serene`, `melancholic` |
| Burgundy / Wine | `dramatic`, `luxurious`, `melancholic` | removes `joyful`, `playful` |
| Red | `romantic`, `bold`, `festive` | removes `serene`, `minimal` |
| Peach / Coral | `warm`, `joyful`, `bloom` | softens `dramatic`, `mysterious` |
| Orange | `harvest`, `abundant`, `playful` | removes `serene`, `minimal` |
| Yellow / Gold | `joyful`, `abundant`, `festive` | removes `melancholic`, `mysterious` |
| Sage / Soft Green | `calm`, `organic`, `renewal` | softens `dramatic`, `bold` |
| Deep Green | `grounded`, `verdant`, `wintry` | removes `playful`, `joyful` |
| Dusty Blue | `melancholic`, `serene`, `nostalgic` | removes `bold`, `festive` |
| Navy / Deep Blue | `mysterious`, `dramatic`, `elevated` | removes `playful`, `tender` |
| Lavender / Lilac | `whimsical`, `serene`, `renewal` | softens `dramatic`, `bold` |
| Deep Purple / Plum | `luxurious`, `mysterious`, `dramatic` | removes `joyful`, `playful` |
| Charcoal / Black | `editorial`, `dramatic`, `elegant` | removes `tender`, `warm`, `playful` |
| Rust / Terracotta | `harvest`, `autumnal`, `warm` | removes `serene`, `renewal` |
| Taupe / Greige | `softened`, `elevated`, `minimal` | softens all strong emotions |
| Silver / Metallic | `wintry`, `elegant`, `festive` | removes `rustic`, `grounded` |
| Brown / Kraft | `grounded`, `rustic`, `warm` | removes `editorial`, `luxurious` |

---

## Output Format

### Per-Item Tag
```json
{
  "sku": "EC-001",
  "name": "Dusty Blue Hydrangea Stem",
  "floral_type": "hydrangea",
  "color": "dusty blue",
  "category": "focal",
  "quantity": 12,
  "emotion_tags": ["calm", "melancholic", "serene", "nostalgic"],
  "primary_emotion": "calm",
  "color_modifier_applied": ["melancholic", "nostalgic"],
  "confidence": "high",
  "source": "reference_table"
}
```

**Validation note:** Every value in `emotion_tags[]` and `primary_emotion` must appear in EC_EMOTION_VOCAB_V1. The API system prompt must enforce this — see JSON Schema section below.

### Collection Summary
```json
{
  "collection_emotion_summary": {
    "dominant_emotions": ["calm", "nostalgic", "romantic", "warm"],
    "emotional_range": "quiet-to-tender",
    "design_intent_suggestion": "This inventory is best suited for soft, nostalgic, or romantic wreath blueprints.",
    "emotion_gaps": ["dramatic", "bold"],
    "vocab_version": "EC_EMOTION_VOCAB_V1"
  }
}
```

---

## JSON Schema — EC_EMOTION_VOCAB_V1 Enforcement

Use this schema to validate API responses. The `enum` arrays are the authoritative source — any value outside them must be rejected and re-requested.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "EC_EMOTION_VOCAB_V1",
  "definitions": {
    "EmotionToken": {
      "type": "string",
      "enum": [
        "calm", "nostalgic", "romantic", "tender", "joyful",
        "elegant", "mysterious", "dramatic", "grounded", "resilient",
        "abundant", "serene", "playful", "warm", "melancholic",
        "bold", "whimsical", "luxurious",
        "elevated", "rustic", "structured", "organic", "festive",
        "minimal", "editorial", "softened",
        "renewal", "bloom", "harvest", "wintry", "autumnal", "verdant"
      ]
    }
  },
  "type": "object",
  "required": ["name", "floral_type", "color", "category", "emotion_tags", "primary_emotion", "confidence", "source"],
  "properties": {
    "sku":          { "type": ["string", "null"] },
    "name":         { "type": "string" },
    "floral_type":  { "type": "string" },
    "color":        { "type": "string" },
    "category":     { "type": "string", "enum": ["focal", "filler", "greenery", "texture", "accent", "base", "ribbon"] },
    "quantity":     { "type": ["number", "null"] },
    "emotion_tags": {
      "type": "array",
      "minItems": 2,
      "maxItems": 4,
      "items": { "$ref": "#/definitions/EmotionToken" }
    },
    "primary_emotion": { "$ref": "#/definitions/EmotionToken" },
    "color_modifier_applied": {
      "type": "array",
      "items": { "$ref": "#/definitions/EmotionToken" }
    },
    "confidence":   { "type": "string", "enum": ["high", "medium", "low"] },
    "source":       { "type": "string", "enum": ["reference_table", "inferred"] }
  }
}
```

### Collection Summary Schema
```json
{
  "type": "object",
  "required": ["dominant_emotions", "emotional_range", "design_intent_suggestion", "emotion_gaps", "vocab_version"],
  "properties": {
    "dominant_emotions": {
      "type": "array",
      "minItems": 1,
      "maxItems": 5,
      "items": { "$ref": "#/definitions/EmotionToken" }
    },
    "emotional_range":          { "type": "string" },
    "design_intent_suggestion": { "type": "string" },
    "emotion_gaps": {
      "type": "array",
      "items": { "$ref": "#/definitions/EmotionToken" }
    },
    "vocab_version": { "type": "string", "const": "EC_EMOTION_VOCAB_V1" }
  }
}
```

---

## API System Prompt Enforcement Block

When calling the Claude API for emotion tagging, include this in the system prompt to prevent drift:

```
You are the Evercrafted Floral Emotion Tagger.

CRITICAL RULE: You MUST use ONLY the following 32 emotion tokens in all output fields
(emotion_tags[], primary_emotion, dominant_emotions[], emotion_gaps[]).

EC_EMOTION_VOCAB_V1 — the only valid tokens:
calm, nostalgic, romantic, tender, joyful, elegant, mysterious, dramatic,
grounded, resilient, abundant, serene, playful, warm, melancholic, bold,
whimsical, luxurious, elevated, rustic, structured, organic, festive,
minimal, editorial, softened, renewal, bloom, harvest, wintry, autumnal, verdant

Do NOT use any word not in this list — not "warmth", not "cozy", not "quiet beauty",
not "wabi-sabi", not "heartfelt". If your instinct is to write a word not on this list,
find the closest token from the list above and use that instead.

Respond ONLY with valid JSON — no preamble, no markdown, no backticks.
```

---

## Rules

1. **EC_EMOTION_VOCAB_V1 is the only valid vocabulary** — no free-text emotions, ever
2. **Never invent SKUs or quantities** — only tag what exists in the inventory
3. **Always assign at least 2 emotion tags, maximum 4** per item
4. **Flag low-confidence items** — if color or type is unclear, set `confidence: low` and `source: inferred`
5. **No cherry blossoms, pussy willow, or twig-based blossoms** — excluded from Evercrafted canon; do not tag, do not include in output
6. **Be specific with color** — "pink" is not specific enough; infer the shade (blush, hot pink, dusty rose) from context or flag as `confidence: low`
7. **Output per-item tags AND collection summary** — blueprint engine requires both
8. **Always include `vocab_version: "EC_EMOTION_VOCAB_V1"`** in collection summary — enables version tracking if vocab expands in future

---

## Integration Points

- **Feeds into:** Blueprint Composition Engine, Emotion-to-Design Translator
- **Consumed by:** Evercrafted OS when a user selects an emotion or mood for a new wreath design
- **Triggered upstream by:** Inventory uploads, inventory enrichment requests, "build a wreath that feels like X" flows
- **Schema validation:** Run every API response through EC_EMOTION_VOCAB_V1 JSON Schema before passing to Blueprint Engine. If validation fails, re-request with the enforcement block in system prompt.

---

## Example Run

**Input:**
```
12 stems white peony, 6 dusty rose garden rose, 8 sage eucalyptus, 4 burgundy dahlia, 2 ivory ribbon
```

**Output (per-item, abbreviated):**
| Item | emotion_tags | primary_emotion |
|---|---|---|
| White Peony | `tender`, `serene`, `abundant`, `softened` | `tender` |
| Dusty Rose Garden Rose | `nostalgic`, `romantic`, `warm`, `tender` | `nostalgic` |
| Sage Eucalyptus | `calm`, `organic`, `renewal`, `verdant` | `calm` |
| Burgundy Dahlia | `dramatic`, `luxurious`, `melancholic`, `editorial` | `dramatic` |
| Ivory Ribbon | `elegant`, `nostalgic`, `warm`, `elevated` | `elegant` |

**Collection Summary:**
```json
{
  "dominant_emotions": ["calm", "nostalgic", "elegant", "warm"],
  "emotional_range": "quiet-to-romantic",
  "design_intent_suggestion": "Best suited for soft, nostalgic, or romantic wreath blueprints. Strong elevated and organic range. Add a bold or resilient element to introduce contrast.",
  "emotion_gaps": ["dramatic", "bold", "joyful"],
  "vocab_version": "EC_EMOTION_VOCAB_V1"
}
```
