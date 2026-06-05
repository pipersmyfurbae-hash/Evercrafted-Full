# Placement Engine Convergence — `evercrafted-schema.js` → PIE (R1–R18)

How the shipped placement code relates to the Placement Intelligence Engine canon,
and a phased plan to converge them. Status as of this review.

## TL;DR

`evercrafted-schema.js` is effectively **"R-rules v0": a generator without a validator.**
It already encodes a real subset of the canon, but it (a) has no scoring/validation
layer at all, (b) uses a few formulas that conflict with PIE, and (c) diverges on
several constants. The marketing-site blueprint visuals are driven by this simpler
model, so they under-represent the actual intelligence described in the skill.

## What the shipped engine already does (maps to canon)

| schema.js | Canon | Notes |
|---|---|---|
| `coverageFor(formula)` (arc fraction 0.25–1.0) | **R1** coverage | Fraction only — no minimal/classic/lush *class bands* or pass/warn/flag. |
| `STEM_DENSITY` + `PLACE_YIELD` (greenery/texture/filler ×2) | **R4** dual accounting | Right idea (placements vs purchase), different yields (canon: euc 3 · sage 3 · wax 1.5). |
| `SLOT_TEMPLATES` role mixes | **R5** role ratio bands | Per-formula templates ≈ the ratio intuition; no R8 size-banded counts. |
| `ROLE_BAND` (radial seat) | **R12** radial bands | Coarser; canon bands are per-role inch offsets off `r_work`. |
| `ROLE_Z` paint order | **R17** depth layers | Stacking order only; no depth *quality* metric. |
| `ROLE_SPREAD` cluster deg | **R12** cluster span | Degrees direct; canon derives from footprints via `dpi`. |
| counter at `s + span*0.70` | **R9.2/R9.3** pole @ t=0.7 + counterweight | Already pole-biased — good. |
| `seeded()` sin-hash | **R9** seeded determinism | Deterministic but NOT mulberry32 (not the canonical RNG). |
| `WREATH_SIZES` rOuter/rInner/`rWork` | **Conventions** r_work | `rWork=(rOuter+rInner)/2`; canon `r_work=D/2 − baseWidth/2`. Reconcile. |

## Gaps (in canon, absent in code)

- **No validation layer whatsoever.** None of R10 (centroid/asymmetry), R13 (diagonal
  commitment/drift), R15 (texture field), R16 (color centroids), R17 (depth quality),
  R18 (negative space) exist. The engine generates but never scores or advises.
- **No R1 class bands / pass-warn-flag** verdicts.
- **No R8 size-scaled purchase-stem bands** (16/22/24/26 tables).
- **No R2.1 greenery silhouette-breakers / taper**, no **bloom-true rendering** (R15-tail).
- **No R9 generator genome** export (seed, coverage, bundles, cluster clock/span, asym).

## Conflicts (must resolve, not just add)

1. **`quadrantFor()` vs R3.** The canon *explicitly rejects* quadrant balance for
   asymmetric layouts (it's symmetric-ring thinking; a crescent fails vertical balance
   by design). Any quadrant logic must be converted to within-arc / centroid form.
2. **RNG.** sin-hash → **mulberry32** so layouts are portable & reproducible across the
   skill, the visualizer, and the schema identically.
3. **`r_work` definition** differs (midline vs `D/2 − baseWidth/2`). Pick the canon's;
   re-derive `ROLE_BAND` offsets from it.
4. **Yield factors** (R4) differ — adopt canon per-material yields.

## Phased convergence plan

> **Status:** the engine is now extracted to `engine.js` (pure/headless, UMD, served at
> `/engine.js`) with a golden-master test (`npm test`) and `roleMap` parameterization —
> see `docs/skills/engine-README.md`. `schema.js` convergence can now happen against
> this shared module rather than a second implementation.

**Phase 0 — Align conventions (low risk, no behavior change).**
Swap `seeded()` → mulberry32; adopt canon `r_work`; adopt R4 yields; delete/convert
`quadrantFor`. Re-baseline the marketing visuals against the new seeds.

**Phase 1 — Port the validators (read-only).**
Implement R10 centroid+asym, R13 diagonal, R15 texture field, R16 color, R17 depth,
R18 negative-space as a `validate(layout)` module returning per-rule pass/warn/flag +
R10.2 studio notes. No change to generation — just scoring. This is where the IP
becomes visible (and where the marketing "blueprint/build view" can show real metrics).

**Phase 2 — Upgrade the generator to the R9 pipeline.**
Class-band coverage (R1), R8 size bands, R9.2 pole, R9.5 twin cluster, R12 cluster-patch
with reject-resample + head excursions, R2.1 greenery facings, R9.3 score-gated adjust
loop. Export the R9 genome on every build.

**Phase 3 — Explore + calibrate.**
R14 Pareto explorer; feed the approval corpus (see feedback loop) back into the
"harmonized → calibrated" threshold pass.

## Single-source-of-truth note

The skill says: when skill and `EvercraftedLayoutVisualizer.jsx` disagree, the artifact
wins. That makes the JSX the behavioral SoT and the skill a spec mirror. Recommend the
shared geometry (R-rules) live in **one JS module imported by both `schema.js` and the
visualizer**, with the skill generated/checked against it — so the three never drift.
