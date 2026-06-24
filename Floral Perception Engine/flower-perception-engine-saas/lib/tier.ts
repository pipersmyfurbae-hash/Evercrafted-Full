// lib/tier.ts
// Single source of truth for tier logic across the Evercrafted platform.

export type Tier = "bloom" | "craft" | "studio" | "atelier";

export const TIER_RANK: Record<Tier, number> = {
  bloom: 1,
  craft: 2,
  studio: 3,
  atelier: 4,
};

export function canAccess(userTier: Tier | string, requiredTier: Tier): boolean {
  return (TIER_RANK[userTier as Tier] ?? 0) >= TIER_RANK[requiredTier];
}

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

// Flower Perception Engine feature gates
export const FPE_TIER_GATES = {
  singleAnalysis: "studio"  as Tier,
  emotionAdjust:  "studio"  as Tier,
  batchAnalysis:  "atelier" as Tier,
  inventoryTags:  "atelier" as Tier,
  blueprintGen:   "studio"  as Tier,
  exportPdf:      "studio"  as Tier,
  historyAccess:  "craft"   as Tier,
} as const;
