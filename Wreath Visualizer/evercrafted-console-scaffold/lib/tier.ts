// lib/tier.ts
// Single source of truth for tier logic across the entire Evercrafted Console

export type Tier = "bloom" | "craft" | "studio" | "atelier";

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

export const TIER_LABELS: Record<Tier, string> = {
  bloom: "Bloom",
  craft: "Craft",
  studio: "Studio",
  atelier: "Atelier",
};

export const TIER_COLORS: Record<Tier, { bg: string; text: string }> = {
  bloom:   { bg: "#EEF2ED", text: "#4A6741" },
  craft:   { bg: "#EEF4F9", text: "#4A6785" },
  studio:  { bg: "#F5EEF4", text: "#7A4A85" },
  atelier: { bg: "#1A1A1A", text: "#F2EFE9" },
};

export const TIER_PRICES: Record<Tier, string> = {
  bloom:   "$19/mo",
  craft:   "$39/mo",
  studio:  "$79/mo",
  atelier: "$149/mo",
};

/**
 * Returns true if the user's tier meets or exceeds the required tier.
 */
export function canAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_RANK[userTier] >= TIER_RANK[requiredTier];
}

/**
 * Maps each console module to its minimum required tier.
 * Used by both the API route (server-side enforcement) and
 * TierGate component (client-side UX gating).
 */
export const MODULE_TIERS: Record<string, Tier> = {
  // Phase 1 — Bloom
  dashboard:        "bloom",
  formula:          "bloom",
  emotion:          "bloom",
  // Phase 2 — Craft
  blueprint:        "craft",
  dna:              "craft",
  placement:        "craft",
  inventory:        "craft",
  pricing:          "craft",
  tracker:          "craft",
  // Phase 3–4 — Studio
  abc:              "studio",
  genome:           "studio",
  output:           "studio",
  api_center:       "studio",
  schema:           "studio",
  arch:             "studio",
  analytics:        "studio",
  library:          "studio",
  // Client Mode — Craft
  client_mode:      "craft",
  // Phase 5–10 — Atelier (all AI modules)
  memory_weaver:    "atelier",
  design_drop:      "atelier",
  blueprint_chat:   "atelier",
  inventory_ai:     "atelier",
  evaluator:        "atelier",
  build_sheet:      "atelier",
  launch_planner:   "atelier",
  order_studio:     "atelier",
  shopify:          "atelier",
  integrations:     "atelier",
};

/**
 * Returns the upgrade message for a given required tier.
 */
export function upgradeMessage(required: Tier): string {
  return `This feature requires ${TIER_LABELS[required]} (${TIER_PRICES[required]}) or higher.`;
}
