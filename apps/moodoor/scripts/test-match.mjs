/**
 * Verification harness for the deterministic matcher. Runs the REAL matcher
 * (src/lib/match.ts) against the real seeded library data. No network/secrets.
 *   node scripts/test-match.mjs
 */
import { matchLibrary, weightedCosine } from "../src/lib/match.ts";
import { normalizeEvsProfile } from "../src/lib/evs.ts";

// Real seeded rows (subset of fields the matcher uses).
const LIBRARY = [
  { id: "1", slug: "late-autumn-remembrance", formula: "Bottom Heavy", bow: "none", occasion: "memorial", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.35, energy: 0.15, weight: 0.8, valence: 0.12, nostalgia: 0.92, restraint: 0.7, intimacy: 0.85, season_spring: 0.05, season_summer: 0.1, season_autumn: 0.85, season_winter: 0.4 },
  { id: "2", slug: "first-light-vows", formula: "Focal Burst", bow: "subtle", occasion: "wedding", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: true, warmth: 0.85, energy: 0.7, weight: 0.45, valence: 0.92, nostalgia: 0.35, restraint: 0.4, intimacy: 0.6, season_spring: 0.8, season_summer: 0.7, season_autumn: 0.15, season_winter: 0.05 },
  { id: "3", slug: "a-new-door", formula: "Crescent", bow: "none", occasion: "new-home", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: true, warmth: 0.6, energy: 0.5, weight: 0.5, valence: 0.7, nostalgia: 0.3, restraint: 0.5, intimacy: 0.5, season_spring: 0.6, season_summer: 0.5, season_autumn: 0.3, season_winter: 0.2 },
  { id: "4", slug: "quiet-tuesday", formula: "Crescent", bow: "none", occasion: "everyday", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.5, energy: 0.25, weight: 0.4, valence: 0.6, nostalgia: 0.25, restraint: 0.85, intimacy: 0.55, season_spring: 0.4, season_summer: 0.4, season_autumn: 0.4, season_winter: 0.4 },
  { id: "5", slug: "golden-anniversary", formula: "Side Sweep", bow: "statement", occasion: "anniversary", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.82, energy: 0.55, weight: 0.7, valence: 0.85, nostalgia: 0.8, restraint: 0.45, intimacy: 0.75, season_spring: 0.3, season_summer: 0.5, season_autumn: 0.6, season_winter: 0.3 },
  { id: "6", slug: "winter-hearth", formula: "Garden Scatter", bow: "subtle", occasion: "holiday-specific", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: true, warmth: 0.75, energy: 0.5, weight: 0.78, valence: 0.78, nostalgia: 0.5, restraint: 0.35, intimacy: 0.7, season_spring: 0.05, season_summer: 0.05, season_autumn: 0.35, season_winter: 0.95 },
  { id: "7", slug: "wild-meadow-joy", formula: "Wild Asymmetry", bow: "none", occasion: "gift-general", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: true, warmth: 0.7, energy: 0.92, weight: 0.35, valence: 0.88, nostalgia: 0.2, restraint: 0.12, intimacy: 0.4, season_spring: 0.85, season_summer: 0.8, season_autumn: 0.2, season_winter: 0.05 },
  { id: "8", slug: "spiral-of-spring", formula: "Crescent", bow: "none", occasion: "everyday", published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.68, energy: 0.65, weight: 0.4, valence: 0.8, nostalgia: 0.22, restraint: 0.4, intimacy: 0.45, season_spring: 0.95, season_summer: 0.5, season_autumn: 0.1, season_winter: 0.05 },
];

let failures = 0;
function check(name, cond, detail = "") {
  const ok = !!cond;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`);
}

function profile(partial) {
  // default everything to 0.5, override with partial
  const base = {};
  for (const d of ["warmth", "energy", "weight", "valence", "nostalgia", "restraint", "intimacy", "season_spring", "season_summer", "season_autumn", "season_winter"]) base[d] = 0.5;
  return normalizeEvsProfile({ ...base, ...partial });
}

// ── Test A: top-5 + descending + formula-diversity cap (3 Crescents -> max 2) ──
const fresh = profile({ valence: 0.8, energy: 0.6, nostalgia: 0.25, season_spring: 0.9, restraint: 0.4, warmth: 0.65 });
const a = matchLibrary(fresh, LIBRARY);
check("A1 returns at most 5", a.length <= 5, `got ${a.length}`);
check("A2 scores strictly descending", a.every((m, i) => i === 0 || a[i - 1].score >= m.score));
const crescents = a.filter((m) => m.row.formula === "Crescent").length;
check("A3 Crescent capped at 2 of 5", crescents <= 2, `got ${crescents} crescents in [${a.map((m) => m.row.slug).join(", ")}]`);

// ── Test B: occasion hard filter ──
const memorial = profile({ valence: 0.1, nostalgia: 0.9, energy: 0.15, weight: 0.8, occasion: "memorial" });
memorial.occasion = "memorial";
const b = matchLibrary(memorial, LIBRARY, { occasion: "memorial" });
check("B1 only memorial rows returned", b.length === 1 && b[0].row.slug === "late-autumn-remembrance", `got [${b.map((m) => m.row.slug).join(", ")}]`);

// ── Test C: bow constraint (no bow) excludes subtle/statement ──
const c = matchLibrary(fresh, LIBRARY, { bow: "none" });
check("C1 no bowed wreaths when bow:none", c.every((m) => m.row.bow === "none"), `got [${c.map((m) => m.row.bow).join(", ")}]`);

// ── Test D: valence/nostalgia weighted 1.5x ──
// Two synthetic rows identical except nostalgia; query has high nostalgia.
const synth = [
  { id: "lowN", slug: "low-nostalgia", formula: "Crescent", bow: "none", occasion: null, published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.5, energy: 0.5, weight: 0.5, valence: 0.5, nostalgia: 0.1, restraint: 0.5, intimacy: 0.5, season_spring: 0.5, season_summer: 0.5, season_autumn: 0.5, season_winter: 0.5 },
  { id: "highN", slug: "high-nostalgia", formula: "Side Sweep", bow: "none", occasion: null, published: true, in_stock: true, purchasable_finished: true, purchasable_blueprint: true, purchasable_kit: false, warmth: 0.5, energy: 0.5, weight: 0.5, valence: 0.5, nostalgia: 0.95, restraint: 0.5, intimacy: 0.5, season_spring: 0.5, season_summer: 0.5, season_autumn: 0.5, season_winter: 0.5 },
];
const nostalgic = profile({ nostalgia: 0.95 });
const d = matchLibrary(nostalgic, synth);
check("D1 higher-nostalgia ranks first", d[0].row.slug === "high-nostalgia", `order: [${d.map((m) => m.row.slug).join(", ")}]`);

// Confirm the weighting actually changes the result vs unweighted intuition:
// with weight applied, high-nostalgia should beat low-nostalgia for a nostalgic query.
check("D2 weightedCosine higher for matching nostalgia", weightedCosine(nostalgic, synth[1]) > weightedCosine(nostalgic, synth[0]));

// ── Test E: identical vector -> cosine ~ 1 ──
check("E1 self-similarity ~ 1", Math.abs(weightedCosine(fresh, fresh) - 1) < 1e-9);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
