/**
 * Seed generator. Computes real blueprints with the ported deterministic engine
 * and emits idempotent INSERT SQL for 8 curated library entries (≥4 formulas,
 * with Crescent repeated to exercise the matcher's formula-diversity cap).
 *
 * Usage:  node scripts/gen-seed.mjs > supabase/seed.sql
 *
 * This mirrors src/lib/composition.ts. Kept as a standalone .mjs so it runs under
 * plain node with zero build step; if the engine in composition.ts changes, update
 * both (they must stay identical — geometry is deterministic).
 */

// ── composition engine (mirror of src/lib/composition.ts) ──────────────────────
const INVENTORY = [
  { id: "INV-001", name: "Ivory Garden Rose", color: "#e8e0d0", role: "focal", pass: 1, ep: "joy", es: "trust", blend: "romance", behavior: "mid", movement: "still", finish: "satin", palette: "neutral-light", contrast: "unified", intensity: [1, 2] },
  { id: "INV-002", name: "Dusty Mauve Peony", color: "#c4a0a0", role: "focal", pass: 1, ep: "sadness", es: "trust", blend: "nostalgia", behavior: "heavy", movement: "still", finish: "matte", palette: "neutral-mid", contrast: "unified", intensity: [1, 2] },
  { id: "INV-003", name: "Slate Hydrangea", color: "#8090a8", role: "secondary", pass: 2, ep: "sadness", es: "surprise", blend: "melancholy", behavior: "mid", movement: "still", finish: "matte", palette: "neutral-mid", contrast: "unified", intensity: [1, 2] },
  { id: "INV-004", name: "Dusty Lavender Bundle", color: "#9a8ab0", role: "texture", pass: 2, ep: "sadness", es: "trust", blend: "nostalgia", behavior: "light", movement: "still", finish: "raw", palette: "neutral-mid", contrast: "unified", intensity: [1, 2] },
  { id: "INV-005", name: "Copper Beech Stem", color: "#8c4a2a", role: "bridge", pass: 1, ep: "anticipation", es: "fear", blend: "awe", behavior: "mid", movement: "reaching", finish: "matte", palette: "neutral-dark", contrast: "unified", intensity: [2, 3] },
  { id: "INV-006", name: "Sage Eucalyptus", color: "#7a9070", role: "greenery", pass: 2, ep: "trust", es: "joy", blend: "romance", behavior: "light", movement: "sweeping", finish: "matte", palette: "botanical-green", contrast: "unified", intensity: [1, 1] },
  { id: "INV-007", name: "Silver Brunia Berry", color: "#b8c0c8", role: "accent", pass: 2, ep: "surprise", es: "sadness", blend: "melancholy", behavior: "wispy", movement: "still", finish: "metallic", palette: "silver", contrast: "unified", intensity: [1, 2] },
  { id: "INV-008", name: "Dried Thistle Head", color: "#7a7890", role: "texture", pass: 2, ep: "sadness", es: "disgust", blend: "remorse", behavior: "light", movement: "still", finish: "raw", palette: "neutral-dark", contrast: "unified", intensity: [1, 2] },
  { id: "INV-009", name: "Black Fritillaria", color: "#3a3048", role: "accent", pass: 1, ep: "fear", es: "sadness", blend: "awe", behavior: "wispy", movement: "reaching", finish: "matte", palette: "neutral-dark", contrast: "stark", intensity: [2, 3] },
  { id: "INV-010", name: "Golden Solidago", color: "#c4a040", role: "filler", pass: 2, ep: "joy", es: "anticipation", blend: "optimism", behavior: "wispy", movement: "reaching", finish: "metallic", palette: "champagne", contrast: "unified", intensity: [1, 2] },
  { id: "INV-011", name: "Preserved Olive Branch", color: "#808860", role: "greenery", pass: 2, ep: "trust", es: "joy", blend: "romance", behavior: "light", movement: "sweeping", finish: "matte", palette: "botanical-green", contrast: "unified", intensity: [1, 1] },
  { id: "INV-012", name: "Burgundy Velvet Rose", color: "#6a2838", role: "focal", pass: 1, ep: "anger", es: "trust", blend: "reverence", behavior: "heavy", movement: "still", finish: "satin", palette: "neutral-dark", contrast: "unified", intensity: [2, 3] },
  { id: "INV-013", name: "Pale Ranunculus", color: "#e8d8c8", role: "secondary", pass: 2, ep: "joy", es: "surprise", blend: "optimism", behavior: "mid", movement: "still", finish: "satin", palette: "neutral-light", contrast: "unified", intensity: [1, 2] },
  { id: "INV-014", name: "Dried Pampas Grass", color: "#c8b890", role: "texture", pass: 2, ep: "anticipation", es: "sadness", blend: "melancholy", behavior: "wispy", movement: "weeping", finish: "raw", palette: "champagne", contrast: "unified", intensity: [1, 2] },
  { id: "INV-015", name: "Matte Charcoal Branch", color: "#3a3832", role: "structural", pass: 1, ep: "sadness", es: "grief", blend: "", behavior: "heavy", movement: "architectural", finish: "matte", palette: "neutral-dark", contrast: "stark", intensity: [2, 3] },
  { id: "INV-016", name: "Weeping Silver Eucalyptus", color: "#8a9a8a", role: "structural", pass: 1, ep: "peace", es: "reflective", blend: "", behavior: "mid", movement: "weeping", finish: "matte", palette: "neutral-light", contrast: "unified", intensity: [1, 2] },
  { id: "INV-017", name: "Champagne Fern", color: "#c8b87a", role: "structural", pass: 1, ep: "joy", es: "hope", blend: "", behavior: "mid", movement: "reaching", finish: "metallic", palette: "champagne", contrast: "unified", intensity: [1, 2] },
  { id: "INV-018", name: "Bare Black Branch", color: "#1e1c18", role: "structural", pass: 1, ep: "grief", es: "sadness", blend: "", behavior: "heavy", movement: "architectural", finish: "gloss", palette: "neutral-dark", contrast: "stark", intensity: [3, 3] },
  { id: "INV-019", name: "White Magnolia Spray", color: "#e8e4dc", role: "structural", pass: 1, ep: "peace", es: "trust", blend: "", behavior: "mid", movement: "sweeping", finish: "matte", palette: "neutral-light", contrast: "unified", intensity: [1, 1] },
  { id: "INV-020", name: "Champagne Berry Cluster", color: "#d4c090", role: "accent", pass: 2, ep: "hope", es: "joy", blend: "", behavior: "wispy", movement: "still", finish: "metallic", palette: "champagne", contrast: "unified", intensity: [1, 2] },
];

const SLOT_TEMPLATES = {
  Crescent: [{ role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "greenery", tier: "Greenery" }, { role: "accent", tier: "Accent" }, { role: "texture", tier: "Texture" }],
  "Side Sweep": [{ role: "structural", tier: "Foundation" }, { role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "greenery", tier: "Greenery" }, { role: "texture", tier: "Texture" }, { role: "accent", tier: "Accent" }],
  "Bottom Heavy": [{ role: "structural", tier: "Foundation" }, { role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "greenery", tier: "Greenery" }, { role: "texture", tier: "Texture" }],
  "Diagonal Flow": [{ role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "bridge", tier: "Bridge" }, { role: "accent", tier: "Accent" }, { role: "greenery", tier: "Greenery" }],
  "Focal Burst": [{ role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "bridge", tier: "Bridge" }, { role: "greenery", tier: "Greenery" }, { role: "texture", tier: "Texture" }, { role: "accent", tier: "Accent" }],
  "Garden Scatter": [{ role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "texture", tier: "Texture" }, { role: "texture", tier: "Texture" }, { role: "greenery", tier: "Greenery" }, { role: "greenery", tier: "Greenery" }, { role: "accent", tier: "Accent" }],
  "Wild Asymmetry": [{ role: "structural", tier: "Foundation" }, { role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "bridge", tier: "Bridge" }, { role: "texture", tier: "Texture" }, { role: "accent", tier: "Accent" }, { role: "greenery", tier: "Greenery" }],
  "Half Ring": [{ role: "structural", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "bridge", tier: "Bridge" }, { role: "greenery", tier: "Greenery" }, { role: "texture", tier: "Texture" }],
  "Spiral Flow": [{ role: "focal", tier: "Foundation" }, { role: "focal", tier: "Foundation" }, { role: "secondary", tier: "Secondary" }, { role: "secondary", tier: "Secondary" }, { role: "bridge", tier: "Bridge" }, { role: "greenery", tier: "Greenery" }, { role: "accent", tier: "Accent" }],
};

const FORMULA_ARCS = {
  Crescent: { s: 210, e: 330 }, "Side Sweep": { s: 240, e: 360 }, "Bottom Heavy": { s: 150, e: 330 },
  "Diagonal Flow": { s: 225, e: 405 }, "Focal Burst": { s: 270, e: 420 }, "Garden Scatter": { s: 0, e: 360 },
  "Wild Asymmetry": { s: 180, e: 315 }, "Half Ring": { s: 180, e: 360 }, "Spiral Flow": { s: 240, e: 420 },
};

const ZS = { structural: 0.2, focal: 0.25, secondary: 0.2, bridge: 0.1, greenery: 0.1, accent: 0.05, texture: 0.05, filler: 0.05 };
const BU = { heavy: 5, mid: 3, light: 2, wispy: 1.5, architectural: 7, sweeping: 2, weeping: 2, reaching: 1.5, still: 3 };

function runSlotFill(emotions, formula, intensity, poemEmotions) {
  const pe = poemEmotions || {};
  const tierEmotionMap = {
    Foundation: pe.structural ? [pe.structural.toLowerCase(), ...emotions] : emotions,
    Secondary: pe.secondary ? [pe.secondary.toLowerCase(), ...emotions] : emotions,
    Bridge: pe.secondary ? [pe.secondary.toLowerCase(), ...emotions] : emotions,
    Greenery: emotions,
    Accent: pe.undertone ? [pe.undertone.toLowerCase(), ...emotions] : emotions,
    Texture: pe.undertone ? [pe.undertone.toLowerCase(), ...emotions] : emotions,
  };
  const slots = SLOT_TEMPLATES[formula] || SLOT_TEMPLATES["Crescent"];
  const emotionTags = emotions.map((e) => e.toLowerCase().trim());
  const usedPerTier = {};
  const filled = [];
  for (const slot of slots) {
    const tier = slot.tier;
    if (!usedPerTier[tier]) usedPerTier[tier] = { archetypes: new Set(), emotions: new Set(), finishes: new Set() };
    const u = usedPerTier[tier];
    const candidates = INVENTORY.filter((i) => {
      if (i.role !== slot.role) return false;
      if (i.intensity[0] > intensity + 1 || i.intensity[1] < Math.max(1, intensity - 1)) return false;
      return true;
    });
    const tierTags = tierEmotionMap[slot.tier] || emotionTags;
    const scored = candidates.map((c) => {
      const ce = [c.ep, c.es, c.blend].filter(Boolean).map((x) => x.toLowerCase());
      const emotMatch = ce.filter((e) => tierTags.includes(e)).length;
      const poemBonus =
        pe.structural && slot.tier === "Foundation" && ce.includes(pe.structural.toLowerCase()) ? 3 :
        pe.secondary && (slot.tier === "Secondary" || slot.tier === "Bridge") && ce.includes(pe.secondary.toLowerCase()) ? 2 :
        pe.undertone && (slot.tier === "Texture" || slot.tier === "Accent") && ce.includes(pe.undertone.toLowerCase()) ? 2 : 0;
      const archOk = !u.archetypes.has(c.movement) ? 1 : 0;
      const emotOk = !ce.some((e) => u.emotions.has(e)) ? 2 : 0;
      const finOk = !u.finishes.has(c.finish) ? 1 : 0;
      return { item: c, score: emotMatch * 3 + poemBonus + archOk * 2 + emotOk + finOk };
    }).sort((a, b) => b.score - a.score);
    let chosen = null;
    for (const { item } of scored) {
      const ce = [item.ep, item.es, item.blend].filter(Boolean).map((x) => x.toLowerCase());
      if (!u.archetypes.has(item.movement) && !ce.some((e) => u.emotions.has(e))) {
        chosen = item;
        u.archetypes.add(item.movement);
        ce.forEach((e) => u.emotions.add(e));
        u.finishes.add(item.finish);
        break;
      }
    }
    if (!chosen && candidates.length) chosen = candidates[0];
    const slotCount = Math.max(1, slots.filter((s) => s.role === slot.role).length);
    const budget = 90;
    const zb = Math.round((budget * (ZS[slot.role] || 0.1)) / slotCount);
    const sc = Math.max(1, Math.round(zb / (BU[chosen ? chosen.behavior : "mid"] || 2.5)));
    filled.push({ ...slot, item: chosen, stemCount: sc });
  }
  return filled;
}

function buildBlueprint(emotions, formula, intensity, poemEmotions) {
  const slots = runSlotFill(emotions, formula, intensity, poemEmotions);
  const totalStems = slots.reduce((sum, s) => sum + s.stemCount, 0);
  const arcConfig = FORMULA_ARCS[formula] || FORMULA_ARCS["Crescent"];
  return { formula, slots, totalStems, arcConfig };
}

// ── 8 curated seed entries ─────────────────────────────────────────────────────
// Crescent appears 3x (entries 3, 4, 8) so a balanced query exercises the cap.
const HEROES = ["/seed/wreath-a.png", "/seed/wreath-b.png", "/seed/wreath-c.png"];

const WREATHS = [
  {
    slug: "late-autumn-remembrance", title: "Late Autumn Remembrance",
    story: "For the garden that is gone and the hands that tended it. Muted plums and slate, weighted low, the way grief settles.",
    formula: "Bottom Heavy", emotions: ["grief", "nostalgia", "peace"], intensity: 2,
    poem: { structural: "grief", secondary: "nostalgia", undertone: "peace" },
    evs: { warmth: 0.35, energy: 0.15, weight: 0.8, valence: 0.12, nostalgia: 0.92, restraint: 0.7, intimacy: 0.85, season_spring: 0.05, season_summer: 0.1, season_autumn: 0.85, season_winter: 0.4 },
    occasion: "memorial", palette: "neutral-dark", bow: "none", leads: ["Dusty Mauve Peony", "Slate Hydrangea", "Dried Thistle Head"],
    finished: 38500, blueprint_p: 3900, kit: false,
  },
  {
    slug: "first-light-vows", title: "First Light Vows",
    story: "The hush before the aisle. Ivory and blush opening toward the light — joy that still remembers how rare it is.",
    formula: "Focal Burst", emotions: ["joy", "trust", "hope"], intensity: 1,
    poem: { structural: "joy", secondary: "trust", undertone: "hope" },
    evs: { warmth: 0.85, energy: 0.7, weight: 0.45, valence: 0.92, nostalgia: 0.35, restraint: 0.4, intimacy: 0.6, season_spring: 0.8, season_summer: 0.7, season_autumn: 0.15, season_winter: 0.05 },
    occasion: "wedding", palette: "neutral-light", bow: "subtle", leads: ["Ivory Garden Rose", "Pale Ranunculus", "Sage Eucalyptus"],
    finished: 42500, blueprint_p: 4900, kit: true,
  },
  {
    slug: "a-new-door", title: "A New Door",
    story: "Keys still cold in the hand. Balanced greens and warm neutrals for the threshold of a life just beginning.",
    formula: "Crescent", emotions: ["hope", "trust", "joy"], intensity: 1,
    poem: { structural: "hope", secondary: "trust", undertone: "joy" },
    evs: { warmth: 0.6, energy: 0.5, weight: 0.5, valence: 0.7, nostalgia: 0.3, restraint: 0.5, intimacy: 0.5, season_spring: 0.6, season_summer: 0.5, season_autumn: 0.3, season_winter: 0.2 },
    occasion: "new-home", palette: "botanical-green", bow: "none", leads: ["White Magnolia Spray", "Ivory Garden Rose", "Preserved Olive Branch"],
    finished: 28500, blueprint_p: 2900, kit: true,
  },
  {
    slug: "quiet-tuesday", title: "Quiet Tuesday",
    story: "No occasion at all — just morning light and a clean composed line. The calm of an ordinary, well-loved day.",
    formula: "Crescent", emotions: ["peace", "trust"], intensity: 1,
    poem: { structural: "peace", secondary: "trust", undertone: "hope" },
    evs: { warmth: 0.5, energy: 0.25, weight: 0.4, valence: 0.6, nostalgia: 0.25, restraint: 0.85, intimacy: 0.55, season_spring: 0.4, season_summer: 0.4, season_autumn: 0.4, season_winter: 0.4 },
    occasion: "everyday", palette: "neutral-light", bow: "none", leads: ["Weeping Silver Eucalyptus", "Pale Ranunculus", "Sage Eucalyptus"],
    finished: 21500, blueprint_p: 2400, kit: false,
  },
  {
    slug: "golden-anniversary", title: "Golden Anniversary",
    story: "Fifty years, swept to one warm side. Champagne and burgundy with a statement ribbon — abundance that earned its weight.",
    formula: "Side Sweep", emotions: ["joy", "reverence", "nostalgia"], intensity: 2,
    poem: { structural: "joy", secondary: "reverence", undertone: "nostalgia" },
    evs: { warmth: 0.82, energy: 0.55, weight: 0.7, valence: 0.85, nostalgia: 0.8, restraint: 0.45, intimacy: 0.75, season_spring: 0.3, season_summer: 0.5, season_autumn: 0.6, season_winter: 0.3 },
    occasion: "anniversary", palette: "champagne", bow: "statement", leads: ["Burgundy Velvet Rose", "Champagne Fern", "Champagne Berry Cluster"],
    finished: 44500, blueprint_p: 4900, kit: false,
  },
  {
    slug: "winter-hearth", title: "Winter Hearth",
    story: "Scattered abundance for the season of gathering in. Deep greens and silver, grounded and glowing by firelight.",
    formula: "Garden Scatter", emotions: ["joy", "peace", "hope"], intensity: 2,
    poem: { structural: "joy", secondary: "peace", undertone: "hope" },
    evs: { warmth: 0.75, energy: 0.5, weight: 0.78, valence: 0.78, nostalgia: 0.5, restraint: 0.35, intimacy: 0.7, season_spring: 0.05, season_summer: 0.05, season_autumn: 0.35, season_winter: 0.95 },
    occasion: "holiday-specific", palette: "botanical-green", bow: "subtle", leads: ["Preserved Olive Branch", "Silver Brunia Berry", "Ivory Garden Rose"],
    finished: 36500, blueprint_p: 3900, kit: true,
  },
  {
    slug: "wild-meadow-joy", title: "Wild Meadow Joy",
    story: "Untamed and reaching, all energy and air. A gift for someone who has never once colored inside the lines.",
    formula: "Wild Asymmetry", emotions: ["joy", "anticipation", "surprise"], intensity: 1,
    poem: { structural: "joy", secondary: "anticipation", undertone: "surprise" },
    evs: { warmth: 0.7, energy: 0.92, weight: 0.35, valence: 0.88, nostalgia: 0.2, restraint: 0.12, intimacy: 0.4, season_spring: 0.85, season_summer: 0.8, season_autumn: 0.2, season_winter: 0.05 },
    occasion: "gift-general", palette: "champagne", bow: "none", leads: ["Golden Solidago", "Pale Ranunculus", "Sage Eucalyptus"],
    finished: 31500, blueprint_p: 3400, kit: true,
  },
  {
    slug: "spiral-of-spring", title: "Spiral of Spring",
    story: "A turning, opening line — the first warm week when everything decides to begin again at once.",
    formula: "Crescent", emotions: ["hope", "joy", "anticipation"], intensity: 1,
    poem: { structural: "hope", secondary: "joy", undertone: "anticipation" },
    evs: { warmth: 0.68, energy: 0.65, weight: 0.4, valence: 0.8, nostalgia: 0.22, restraint: 0.4, intimacy: 0.45, season_spring: 0.95, season_summer: 0.5, season_autumn: 0.1, season_winter: 0.05 },
    occasion: "everyday", palette: "neutral-light", bow: "none", leads: ["Champagne Fern", "Ivory Garden Rose", "Preserved Olive Branch"],
    finished: 24500, blueprint_p: 2400, kit: false,
  },
];

function sqlStr(s) {
  return "'" + String(s).replace(/'/g, "''") + "'";
}
function sqlJson(obj) {
  return "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";
}

// Slim the embedded item down to what the storefront/SVG needs (keeps the stored
// blueprint compact while preserving color/role for rendering).
function slimBlueprint(bp) {
  return {
    formula: bp.formula,
    slots: bp.slots.map((s) => ({
      role: s.role,
      tier: s.tier,
      item: s.item
        ? { id: s.item.id, name: s.item.name, color: s.item.color, role: s.item.role, behavior: s.item.behavior, movement: s.item.movement, finish: s.item.finish }
        : null,
      stemCount: s.stemCount,
    })),
    totalStems: bp.totalStems,
    arcConfig: bp.arcConfig,
  };
}

const rows = WREATHS.map((w, i) => {
  const bp = slimBlueprint(buildBlueprint(w.emotions, w.formula, w.intensity, w.poem));
  const e = w.evs;
  const hero = HEROES[i % HEROES.length];
  const cols = [
    sqlStr(w.slug), sqlStr(w.title), sqlStr(w.story), sqlStr(hero), sqlStr(hero), sqlJson(bp),
    sqlStr("WGS-" + w.slug), "0.9",
    e.warmth, e.energy, e.weight, e.valence, e.nostalgia, e.restraint, e.intimacy,
    e.season_spring, e.season_summer, e.season_autumn, e.season_winter,
    sqlStr(w.occasion), sqlStr(w.palette), sqlStr(w.formula), sqlStr(w.bow), sqlJson(w.leads),
    "true", "true", w.kit ? "true" : "false",
    w.finished, w.blueprint_p, w.kit ? Math.round(w.finished * 0.6) : "null",
    "true", "true",
  ];
  return "  (" + cols.join(", ") + ")";
});

const header = `-- Generated by scripts/gen-seed.mjs — do not edit by hand. Idempotent on slug.
insert into public.library (
  slug, title, story_copy, hero_image_url, thumb_image_url, blueprint,
  genome, bsre_score,
  warmth, energy, weight, valence, nostalgia, restraint, intimacy,
  season_spring, season_summer, season_autumn, season_winter,
  occasion, palette_family, formula, bow, botanical_leads,
  purchasable_finished, purchasable_blueprint, purchasable_kit,
  price_finished_cents, price_blueprint_cents, price_kit_cents,
  published, in_stock
) values`;

process.stdout.write(header + "\n" + rows.join(",\n") + "\non conflict (slug) do nothing;\n");
