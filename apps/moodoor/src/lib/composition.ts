/**
 * Deterministic composition engine — ported VERBATIM from the legacy Express
 * `server.js` (FORMULA_ARCS / SLOT_TEMPLATES / ZS / BU / runSlotFill, L89-192).
 *
 * Cardinal rule: AI interprets emotion; geometry is deterministic. This file is
 * the geometry. It must stay byte-for-byte equivalent to the legacy engine so a
 * blueprint produced here is identical to one produced by the old generator.
 * Do not "improve" the algorithm here without porting the change back to server.js.
 */

export type Role =
  | "structural"
  | "focal"
  | "secondary"
  | "bridge"
  | "greenery"
  | "accent"
  | "texture"
  | "filler";

export interface InventoryItem {
  id: string;
  name: string;
  color: string;
  role: Role;
  pass: number;
  ep: string;
  es: string;
  blend: string;
  behavior: string;
  movement: string;
  finish: string;
  palette: string;
  contrast: string;
  intensity: [number, number];
}

export interface SlotTemplate {
  role: Role;
  tier: string;
}

export interface FilledSlot extends SlotTemplate {
  item: InventoryItem | null;
  stemCount: number;
}

export interface ArcConfig {
  s: number;
  e: number;
}

export interface Blueprint {
  formula: string;
  slots: FilledSlot[];
  totalStems: number;
  arcConfig: ArcConfig;
}

// ── INVENTORY (exact from server.js) ───────────────────────────────────────────
export const INVENTORY: InventoryItem[] = [
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

// ── SLOT TEMPLATES (exact from server.js) ──────────────────────────────────────
export const SLOT_TEMPLATES: Record<string, SlotTemplate[]> = {
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

// ── FORMULA ARCS (exact from server.js) ────────────────────────────────────────
export const FORMULA_ARCS: Record<string, ArcConfig> = {
  Crescent: { s: 210, e: 330 },
  "Side Sweep": { s: 240, e: 360 },
  "Bottom Heavy": { s: 150, e: 330 },
  "Diagonal Flow": { s: 225, e: 405 },
  "Focal Burst": { s: 270, e: 420 },
  "Garden Scatter": { s: 0, e: 360 },
  "Wild Asymmetry": { s: 180, e: 315 },
  "Half Ring": { s: 180, e: 360 },
  "Spiral Flow": { s: 240, e: 420 },
};

export const CANONICAL_FORMULAS = Object.keys(FORMULA_ARCS);

// ── Zone size ratios by role (percentage of 90-stem budget) ────────────────────
export const ZS: Record<string, number> = {
  structural: 0.2,
  focal: 0.25,
  secondary: 0.2,
  bridge: 0.1,
  greenery: 0.1,
  accent: 0.05,
  texture: 0.05,
  filler: 0.05,
};

// ── Stems per placement unit by behavior ───────────────────────────────────────
export const BU: Record<string, number> = {
  heavy: 5,
  mid: 3,
  light: 2,
  wispy: 1.5,
  architectural: 7,
  sweeping: 2,
  weeping: 2,
  reaching: 1.5,
  still: 3,
};

export interface PoemEmotions {
  structural?: string;
  secondary?: string;
  undertone?: string;
}

// ── SLOT FILL (exact logic from server.js) ─────────────────────────────────────
export function runSlotFill(
  emotions: string[],
  formula: string,
  intensity: number,
  poemEmotions?: PoemEmotions
): FilledSlot[] {
  const pe = poemEmotions || {};
  const tierEmotionMap: Record<string, string[]> = {
    Foundation: pe.structural ? [pe.structural.toLowerCase(), ...emotions] : emotions,
    Secondary: pe.secondary ? [pe.secondary.toLowerCase(), ...emotions] : emotions,
    Bridge: pe.secondary ? [pe.secondary.toLowerCase(), ...emotions] : emotions,
    Greenery: emotions,
    Accent: pe.undertone ? [pe.undertone.toLowerCase(), ...emotions] : emotions,
    Texture: pe.undertone ? [pe.undertone.toLowerCase(), ...emotions] : emotions,
  };
  const slots = SLOT_TEMPLATES[formula] || SLOT_TEMPLATES["Crescent"];
  const emotionTags = emotions.map((e) => e.toLowerCase().trim());
  const usedPerTier: Record<string, { archetypes: Set<string>; emotions: Set<string>; finishes: Set<string> }> = {};
  const filled: FilledSlot[] = [];

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
    const scored = candidates
      .map((c) => {
        const ce = [c.ep, c.es, c.blend].filter(Boolean).map((x) => x.toLowerCase());
        const emotMatch = ce.filter((e) => tierTags.includes(e)).length;
        const poemBonus =
          pe.structural && slot.tier === "Foundation" && ce.includes(pe.structural.toLowerCase())
            ? 3
            : pe.secondary && (slot.tier === "Secondary" || slot.tier === "Bridge") && ce.includes(pe.secondary.toLowerCase())
            ? 2
            : pe.undertone && (slot.tier === "Texture" || slot.tier === "Accent") && ce.includes(pe.undertone.toLowerCase())
            ? 2
            : 0;
        const archOk = !u.archetypes.has(c.movement) ? 1 : 0;
        const emotOk = !ce.some((e) => u.emotions.has(e)) ? 2 : 0;
        const finOk = !u.finishes.has(c.finish) ? 1 : 0;
        return { item: c, score: emotMatch * 3 + poemBonus + archOk * 2 + emotOk + finOk };
      })
      .sort((a, b) => b.score - a.score);

    let chosen: InventoryItem | null = null;
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

/** Convenience wrapper producing the stored blueprint shape. */
export function buildBlueprint(
  emotions: string[],
  formula: string,
  intensity: number,
  poemEmotions?: PoemEmotions
): Blueprint {
  const slots = runSlotFill(emotions, formula, intensity, poemEmotions);
  const totalStems = slots.reduce((sum, s) => sum + s.stemCount, 0);
  const arcConfig = FORMULA_ARCS[formula] || FORMULA_ARCS["Crescent"];
  return { formula, slots, totalStems, arcConfig };
}
