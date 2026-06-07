/**
 * Emotional Vector Schema (EVS-1.0). The shared spine: every library entry and
 * every customer memory resolves to one of these profiles. Claude produces the
 * profile from natural language (emotion only — never coordinates, never a pick);
 * the deterministic matcher consumes it.
 */

/** The 11 continuous dimensions, in fixed order (the vector axis order). */
export const EVS_DIMENSIONS = [
  "warmth",
  "energy",
  "weight",
  "valence",
  "nostalgia",
  "restraint",
  "intimacy",
  "season_spring",
  "season_summer",
  "season_autumn",
  "season_winter",
] as const;

export type EvsDimension = (typeof EVS_DIMENSIONS)[number];

/** One-line meaning per dimension (also fed to Claude in the EVS prompt). */
export const EVS_DIMENSION_MEANINGS: Record<EvsDimension, string> = {
  warmth: "0 = cool/crisp, 1 = warm/glowing — color temperature of the feeling",
  energy: "0 = still/quiet, 1 = vibrant/alive — kinetic quality of the memory",
  weight: "0 = airy/delicate, 1 = grounded/abundant — density and material presence",
  valence: "0 = grief/ache, 1 = joy/celebration — emotional polarity",
  nostalgia: "0 = present-tense, 1 = deeply remembered — temporal distance",
  restraint: "0 = wild/untamed, 1 = composed/formal — compositional formality",
  intimacy: "0 = public/shared, 1 = private/personal — who the feeling belongs to",
  season_spring: "independent 0-1 affinity for spring",
  season_summer: "independent 0-1 affinity for summer",
  season_autumn: "independent 0-1 affinity for autumn",
  season_winter: "independent 0-1 affinity for winter",
};

/** Dimensions weighted more heavily in cosine — customers feel these most when a match is wrong. */
export const EVS_WEIGHTS: Partial<Record<EvsDimension, number>> = {
  valence: 1.5,
  nostalgia: 1.5,
};

export const OCCASIONS = [
  "memorial",
  "wedding",
  "new-home",
  "anniversary",
  "everyday",
  "holiday-specific",
  "gift-general",
] as const;
export type Occasion = (typeof OCCASIONS)[number];

export const BOW_OPTIONS = ["none", "subtle", "statement"] as const;
export type Bow = (typeof BOW_OPTIONS)[number];

/** Continuous vector: every dimension present. */
export type EvsVector = Record<EvsDimension, number>;

/** Full profile Claude returns: the vector + any stated/inferred categoricals. */
export interface EvsProfile extends EvsVector {
  occasion: Occasion | null;
  palette_family: string | null;
  formula: string | null; // hint only — the matcher decides
  bow: Bow | null;
  botanical_leads: string[];
}

/** Customer-stated hard constraints (separate from Claude's inference). */
export interface MatchConstraints {
  occasion?: Occasion | null;
  bow?: Bow | null;
  intent?: "finished" | "blueprint" | "kit" | null;
}

/** Clamp a number into [0,1]; default to 0.5 if not finite. */
export function clamp01(n: unknown): number {
  const x = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(x)) return 0.5;
  return Math.min(1, Math.max(0, x));
}

/** Validate + normalize a raw object from Claude into an EvsProfile. */
export function normalizeEvsProfile(raw: Record<string, unknown>): EvsProfile {
  const vec = {} as EvsVector;
  for (const dim of EVS_DIMENSIONS) vec[dim] = clamp01(raw[dim]);

  const occasion = OCCASIONS.includes(raw.occasion as Occasion) ? (raw.occasion as Occasion) : null;
  const bow = BOW_OPTIONS.includes(raw.bow as Bow) ? (raw.bow as Bow) : null;
  const leads = Array.isArray(raw.botanical_leads)
    ? (raw.botanical_leads as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 3)
    : [];

  return {
    ...vec,
    occasion,
    palette_family: typeof raw.palette_family === "string" ? raw.palette_family : null,
    formula: typeof raw.formula === "string" ? raw.formula : null,
    bow,
    botanical_leads: leads,
  };
}

/** True only if every continuous dimension is a finite number. */
export function isValidEvsRaw(raw: Record<string, unknown>): boolean {
  return EVS_DIMENSIONS.every((d) => Number.isFinite(Number(raw[d])));
}
