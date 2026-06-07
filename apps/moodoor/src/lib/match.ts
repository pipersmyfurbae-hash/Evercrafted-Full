/**
 * Deterministic matching service. AI translated the memory into an EVS profile;
 * here geometry/maths decides — Claude never sees the library and never picks.
 *
 * 1. Hard filters first (published, in-stock, occasion if stated, customer
 *    constraints e.g. bow === "none").
 * 2. Weighted cosine over the 11 continuous dims, valence + nostalgia ×1.5.
 * 3. Top 5 with a formula-diversity cap (any single formula at most 2 of 5).
 */
import { EVS_DIMENSIONS, EVS_WEIGHTS, type EvsProfile, type EvsVector, type MatchConstraints } from "./evs";
import type { LibraryRow } from "./library";

export interface ScoredMatch {
  row: LibraryRow;
  score: number;
}

const FORMULA_CAP = 2;
const TOP_N = 5;

/**
 * Weighted cosine similarity. The weight is applied to each term consistently
 * across the dot product and both norms (equivalent to scaling each axis by
 * sqrt(weight) before a standard cosine), so the result stays in [-1, 1].
 */
export function weightedCosine(a: EvsVector, b: EvsVector): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const dim of EVS_DIMENSIONS) {
    const w = EVS_WEIGHTS[dim] ?? 1;
    const av = a[dim];
    const bv = b[dim];
    dot += w * av * bv;
    na += w * av * av;
    nb += w * bv * bv;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function passesHardFilters(row: LibraryRow, profile: EvsProfile, constraints: MatchConstraints): boolean {
  if (!row.published || !row.in_stock) return false;

  // Occasion: a stated occasion (explicit constraint, or Claude-inferred) is a hard filter.
  const wantOccasion = constraints.occasion ?? profile.occasion ?? null;
  if (wantOccasion && row.occasion !== wantOccasion) return false;

  // Bow constraint (e.g. customer said "no bow").
  if (constraints.bow && row.bow !== constraints.bow) return false;

  // Purchase intent must be available on the row.
  if (constraints.intent === "finished" && !row.purchasable_finished) return false;
  if (constraints.intent === "blueprint" && !row.purchasable_blueprint) return false;
  if (constraints.intent === "kit" && !row.purchasable_kit) return false;

  return true;
}

export function matchLibrary(
  profile: EvsProfile,
  rows: LibraryRow[],
  constraints: MatchConstraints = {}
): ScoredMatch[] {
  const eligible = rows.filter((row) => passesHardFilters(row, profile, constraints));

  const scored: ScoredMatch[] = eligible
    .map((row) => ({ row, score: weightedCosine(profile, row) }))
    .sort((a, b) => b.score - a.score);

  // Greedy top-N with formula-diversity cap.
  const chosen: ScoredMatch[] = [];
  const formulaCounts: Record<string, number> = {};
  for (const m of scored) {
    if (chosen.length >= TOP_N) break;
    const f = m.row.formula;
    if ((formulaCounts[f] || 0) >= FORMULA_CAP) continue;
    formulaCounts[f] = (formulaCounts[f] || 0) + 1;
    chosen.push(m);
  }
  return chosen;
}
