# Constants Registry — every threshold in one place, with provenance

Single lookup for all R1–R18 magic numbers, tagged by how trustworthy each is.
Read this with `adaptations-log.md` before any re-tuning pass.

**Provenance legend**
- `measured` — read off an upload at runtime (objective; no tuning needed).
- `derived` — falls out of geometry/math (e.g. `dpi` from `r_work`); not a free parameter.
- `source` — taken from research as-is and not yet contested.
- `harmonized` — chosen by us when sources conflicted; plausible, **not validated**.
- `calibrated` — confirmed against the approval corpus. **(none yet — that's the goal.)**

> Anything tagged `harmonized` is an educated guess pending the corpus. Treat its
> precision as directional, not literal.

## Geometry & conventions
| Constant | Value | Prov |
|---|---|---|
| Angle convention | compass, 0°=12 o'clock, CW | source |
| `r_work(D)` | `D/2 − baseWidth/2` | derived |
| baseWidth 16/22/24/26 | 3 / 4 / 4.5 / 5 in | source |
| `dpi(D)` | `360/(2π·r_work)` | derived |
| RNG | mulberry32 | source |

## R1 coverage classes
| Constant | Value | Prov |
|---|---|---|
| minimal / classic / lush bands | 25–35 / 33–60 / 55–75 % | harmonized |
| warn margin | ±6 pts | harmonized |
| twin primary-span shrink | ×0.82 | harmonized |

## R2 nesting / greenery
| central-50% mass | ≥60% pass · ≥45% warn (twin 45/30) | harmonized |
| greenery taper | 8–12° beyond mass | source |
| R2.1 facings flow/out/breaker/in/counter/diag | 40/15/17/12/8/10 % | harmonized |
| silhouette-breaker seat | 0.6–1.9" beyond outer edge | harmonized |

## R4 dual accounting (yields)
| euc / sage | 3 | source |
| wax / cream-berry | 1.5 | source |
| everything else | 1 | source |
| sanity anchor | ~35 purchase ≈ 55–60 placements (24" lush) | harmonized |

## R5 / R6 / R7 roles, footprints, spacing
| role ratio focal:sec:fill:green | 1 : 2–2.5 : 3 : 2–2.5 | source |
| footprints focal/sec/fill/green | 3.5 / 2.5 / 1.5 / 2.5 in | harmonized |
| bloom stacking | 1.3–1.8× | harmonized |
| total stacking min/classic/lush | 1.2–1.6 / 1.7–2.3 / 2.2–3.0× | harmonized |
| adjacent gap | ≥0.7× mean footprint | harmonized |
| tight-pair tolerance | 0 pass · ≤2 warn | harmonized |

## R8 size bands (purchase stems) — see table in rules-r1-r9.md (`source` shape, `harmonized` exact counts)

## R9 generator
| anchors 7:30 / 4:30 / 10:00 | 225 / 135 / 300° | source |
| drama t low/med/high | .25 / .5 / .8 | harmonized |
| weight pole t | 0.7 | harmonized |
| bundle spacing | 2.25" | harmonized |
| twin split | 71/29 | harmonized |
| twin minor span | max(22°, 0.4·primary) | harmonized |
| adjust loop | ≤3 iters, ±0.08 gate | harmonized |
| echo cone | 25° @ center+180° (±12° jitter) | harmonized |

## R10 weight & asymmetry
| weight model | 0.4·size + 0.3·contrast + 0.3·sat | harmonized |
| roleFactor focal/sec/fill/green | 1.0 / 0.6 / 0.35 / 0.25 | harmonized |
| size normalizer | /7" | harmonized |
| ivory reference | 0.93 luminance | source |
| asym band | 0.40–0.80 pass · 0.32–0.88 warn | harmonized |
| centroid coherence | angle within 45% extent of arc center | harmonized |

## R12 cluster patch
| angular bias | u³ | harmonized |
| reject-resample radius | 0.65–0.8× footprint | harmonized |
| radial: focal / navy-tuck | r_work−0.5±0.2 / r_work−1.2 | harmonized |
| head excursions in/out | 14% (−2.0–3.4") / 12% (+2.0–3.4") | harmonized |

## R13 diagonal
| diag axes | {45,135,225,315}° | source |
| commitment | ≥0.25 pass · ≥0.15 warn | harmonized |
| drift | ≤35% pass · ≤60% warn | harmonized |

## R14 Pareto
| genomes | 120 | harmonized |
| meta-seed | mulberry32(seed·31+7) | source |
| objectives ceiling | 7 (hard) | harmonized |
| front cap | 12 | harmonized |
| nesting target / stacking target | 65 / class-band midpoint | harmonized |

## R15 texture
| coarseness per material | 0.20–0.80 | source |
| texW | 0.5·coarse + 0.5·complexity, roleTex 1/.7/.6/.4 | harmonized |
| complexity measure | mean local-luminance-gradient ×4, clamp 0–1 | measured |
| field samples | 120 (3°) | harmonized |
| compression | 1 − e^(−1.1·raw) | harmonized |
| peak | ≤0.85 pass · ≤0.93 warn | harmonized |
| evenness CV | ≤45% pass · ≤65% warn | harmonized |
| alternation run | 0 / 1 / 2+ = pass/warn/flag | harmonized |

## R16 color
| classifier | sat<0.15 neutral · 331–70° warm · else cool | source (corrected) |
| hue measure | sat-weighted circular mean | measured |
| concentration | radiusNorm ≤0.60 | harmonized |
| pair separation | ≤0.80 (warn only) | harmonized |
| accent separation | ≥30° | source |

## R17 depth
| layers back/mid/front | euc·sage / hydr·tulip·wax·berry / ranunc·peony | source |
| cluster merge | local-max ≥0.35, within 25° | harmonized |
| window | 14° × 0.18 radial-norm | harmonized |
| compression k back/mid/front | 0.9 / 1.1 / 1.5 (×2.2) | harmonized |
| target shares | .40 / .35 / .25 | source |
| overcrowd | (maxLayer−0.85)/0.15 | harmonized (rescaled) |
| q | 0.4·presence + 0.5·balance − 0.3·overcrowd | harmonized |
| avg q / variance | ≥0.60 / ≤0.040 pass | harmonized |

## R18 negative space
| totalPositive | 0.4·dB + 0.35·dM + 0.25·dF | harmonized |
| negScore | 0.6·(1−pos) + 0.4·midGap | harmonized |
| hollow | dB>0.45 ∧ dF>0.45 ∧ dM<0.2 | harmonized |
| rest-centroid weight | 1 − e^(−1.5·neg), neg≥0.35, Σw>0.5 | harmonized |
| counterweight opposition | ≥120° pass · ≥85° warn | harmonized |

## Bloom-true rendering
| bloomFrac | clamp(wMax/max(hC,wMax), 0.25, 1) | measured |
| display square | min(size/bloomFrac, size×3) | derived |
| per-material bf/bcy defaults | see rules-r15-r18.md | source |

---
**Tally:** the overwhelming majority are `harmonized` (guesses) or `measured`/`derived`
(safe). **Zero are `calibrated` yet.** The single highest-leverage project for this
engine is converting `harmonized → calibrated` from real approve/reject data.
