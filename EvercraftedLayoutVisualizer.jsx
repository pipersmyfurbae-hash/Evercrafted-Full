import React, { useState, useRef, useMemo } from "react";

// ════════════════════════════════════════════════════════════════════════════
//  EVERCRAFTED STUDIO — Wreath Layout Visualizer  v4
//  v4 adds the Asymmetry Intelligence system (R9.1–9.4, R10, R11):
//   · Visual weight model — (0.4·size + 0.3·contrast + 0.2·saturation) × role,
//     contrast/saturation auto-sampled from uploaded images
//   · Weight centroid (unit-vector sum) + asymmetry score (0.5·offset + 0.5·mag)
//   · Ghost overlays: design arc, weight pole, centroid, balance axis
//   · Generator: arc-center presets, weight-pole bias (t≈0.7), asymmetry dial,
//     score-gated adjustment loop (seeded, ≤3 iterations)
//   · Composition→prompt tokens (geometry generates language, never reverse)
// ════════════════════════════════════════════════════════════════════════════

const C = 260; // canvas center px

// ─── Slot library: role, footprint(in @ r_work), yield, default sat/contrast ─
const SLOTS = [
  { key: "base",       label: "Grapevine Base",      tint: "#8a6a4f", z: 1,  kind: "fixed",       role: "base",      fp: 0,   yield: 1,   sat: 0,    con: 0,    coarse: 0,    cxd: 0,    hued: null, depth: null, bf: 1,    bcy: 0.5  },
  { key: "eucalyptus", label: "Dusty Eucalyptus",    tint: "#9fb3b5", z: 8,  kind: "directional", role: "greenery",  fp: 2.5, yield: 3,   sat: 0.30, con: 0.40, coarse: 0.30, cxd: 0.35, hued: 160, depth: "back", bf: 1, bcy: 0.5 },
  { key: "sage",       label: "Sage Spray",          tint: "#a8b58c", z: 9,  kind: "directional", role: "greenery",  fp: 2.5, yield: 3,   sat: 0.35, con: 0.35, coarse: 0.45, cxd: 0.50, hued: 110, depth: "back", bf: 1, bcy: 0.5 },
  { key: "burlap",     label: "Burlap / Ribbon",     tint: "#c4a982", z: 10, kind: "directional", role: "accent",    fp: 0,   yield: 1,   sat: 0.25, con: 0.30, coarse: 0.50, cxd: 0.50, hued: 35, depth: null, bf: 1, bcy: 0.5 },
  { key: "hydrangea",  label: "Green Hydrangea",     tint: "#b5bd7e", z: 14, kind: "round",       role: "secondary", fp: 3.0, yield: 1,   sat: 0.40, con: 0.35, coarse: 0.80, cxd: 0.70, hued: 90, depth: "mid", bf: 0.8, bcy: 0.35 },
  { key: "tulipWhite", label: "White Tulip",         tint: "#e9e7da", z: 16, kind: "directional", role: "secondary", fp: 2.5, yield: 1,   sat: 0.10, con: 0.20, coarse: 0.20, cxd: 0.25, hued: 60, depth: "mid", bf: 0.45, bcy: 0.22 },
  { key: "tulipMauve", label: "Smoke-Mauve Tulip",   tint: "#a89aa4", z: 16, kind: "directional", role: "secondary", fp: 2.5, yield: 1,   sat: 0.25, con: 0.45, coarse: 0.20, cxd: 0.30, hued: 320, depth: "mid", bf: 0.45, bcy: 0.22 },
  { key: "waxFlower",  label: "Wax Flower Spray",    tint: "#f1e9d6", z: 18, kind: "directional", role: "filler",    fp: 1.5, yield: 1.5, sat: 0.15, con: 0.20, coarse: 0.60, cxd: 0.55, hued: 50, depth: "mid", bf: 0.75, bcy: 0.4 },
  { key: "berryNavy",  label: "Navy Berry",          tint: "#3d4a63", z: 20, kind: "round",       role: "filler",    fp: 1.5, yield: 1,   sat: 0.50, con: 0.85, coarse: 0.75, cxd: 0.50, hued: 225, depth: "mid", bf: 0.7, bcy: 0.3 },
  { key: "berryCream", label: "Cream Berry Spray",   tint: "#d9c9ad", z: 20, kind: "directional", role: "filler",    fp: 1.5, yield: 1.5, sat: 0.30, con: 0.30, coarse: 0.65, cxd: 0.45, hued: 40, depth: "mid", bf: 0.8, bcy: 0.45 },
  { key: "ranunculus", label: "White Ranunculus",    tint: "#efe9d6", z: 22, kind: "round",       role: "secondary", fp: 2.5, yield: 1,   sat: 0.12, con: 0.22, coarse: 0.35, cxd: 0.35, hued: 55, depth: "front", bf: 0.55, bcy: 0.28 },
  { key: "peony",      label: "Cream Peony (Focal)", tint: "#f3eee0", z: 26, kind: "round",       role: "focal",     fp: 3.5, yield: 1,   sat: 0.15, con: 0.25, coarse: 0.25, cxd: 0.30, hued: 55, depth: "front", bf: 0.6, bcy: 0.3 },
];
const SLOT_MAP = Object.fromEntries(SLOTS.map((s) => [s.key, s]));
const ROLE_FACTOR = { focal: 1.0, secondary: 0.6, filler: 0.35, greenery: 0.25 }; // harmonized (latest research doc)
const ROLE_TEX = { focal: 1.0, secondary: 0.7, filler: 0.6, greenery: 0.4 }; // R15
// R16 — greens corrected to COOL (source classifier neutralized 90–180°, wrong for floral theory)
const colorGroupOf = (hue, sat) => (sat < 0.15 || hue == null ? "neutral" : hue >= 331 || hue <= 70 ? "warm" : "cool");
const GROUP_COLORS = { warm: "#b3593f", cool: "#5a7d8c", neutral: "#b8a98c" };

// ─── R1 / R7 / R8 constants ──────────────────────────────────────────────────
const COVERAGE_CLASSES = {
  minimal: { label: "Minimal Modern",     range: [25, 35] },
  classic: { label: "Classic Asymmetric", range: [33, 60] },
  lush:    { label: "Lush Asymmetric",    range: [55, 75] },
};
const TOTAL_STACK_BANDS = { minimal: [1.2, 1.6], classic: [1.7, 2.3], lush: [2.2, 3.0] };
const BLOOM_STACK_BAND = [1.3, 1.8];
const BASE_WIDTHS = { 16: 3, 22: 4, 24: 4.5, 26: 5 };
const SIZE_TABLE = {
  16: { focal: [2, 3], secondary: [4, 7],   filler: [6, 10],  greenery: [5, 9]   },
  22: { focal: [3, 4], secondary: [6, 9],   filler: [8, 12],  greenery: [7, 12]  },
  24: { focal: [3, 5], secondary: [7, 11],  filler: [9, 15],  greenery: [8, 14]  },
  26: { focal: [5, 7], secondary: [10, 14], filler: [14, 20], greenery: [11, 18] },
};
// R9.1 — validated arc-center presets (compass deg, cw from 12)
const ARC_ANCHORS = { "7:30 classic": 225, "4:30 lower-right": 135, "10:00 swag": 300 };
const rWorkIn = (D) => D / 2 - (BASE_WIDTHS[D] || D * 0.1875) / 2;
const degPerInch = (D) => 360 / (2 * Math.PI * rWorkIn(D));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const degToClock = (d) => { const h = Math.round((((d % 360) + 360) % 360) / 30) % 12; return h === 0 ? 12 : h; };

// ─── Direction helpers (compass deg, 0 = 12 o'clock, cw) ────────────────────
const out = (a) => a;
const ccw = (a) => a - 90;
const cw  = (a) => a + 90;

// ─── Static layouts (defined at 24", 20px = 1") ─────────────────────────────
const LAYOUTS = {
  crescent: {
    name: "Crescent · C24PE-RE",
    formula: "Crescent",
    meta: { size: 24, symmetry: "asym", declared: "lush" },
    description: "Reverse-engineered 24\" crescent — flow falls ccw from 10 o'clock through the peony focal at 8, tapering at 5. Exposed vine 12→4.",
    layers: [
      { name: "Grapevine Base", component: "base",
        positions: [{ angle: 0, radius: 0, size: 480 }] },
      { name: "Eucalyptus Band (ccw-dominant, varied facing)", component: "eucalyptus",
        positions: [
          { angle: 300, radius: 195, size: 150, tip: ccw(300) },                  // flow
          { angle: 278, radius: 252, size: 148, tip: out(278), flip: true },      // outward, breaking the ring edge
          { angle: 256, radius: 198, size: 150, tip: ccw(256) + 6 },              // flow
          { angle: 234, radius: 212, size: 145, tip: 234 + 180, flip: true },     // inward, seated outer
          { angle: 212, radius: 192, size: 150, tip: ccw(212) - 5 },              // flow
          { angle: 190, radius: 205, size: 146, tip: cw(190) },                   // counter-flow
          { angle: 168, radius: 250, size: 148, tip: out(168) },                  // outward, breaking the ring edge
          { angle: 150, radius: 196, size: 150, tip: ccw(150), flip: true },      // flow into tail
        ] },
      { name: "Sage Extensions (outward)", component: "sage",
        positions: [
          { angle: 294, radius: 250, size: 105, tip: out(294) },
          { angle: 301, radius: 262, size: 105, tip: out(301) },
          { angle: 287, radius: 244, size: 100, tip: out(287), flip: true },
          { angle: 199, radius: 252, size: 105, tip: out(199) },
          { angle: 207, radius: 260, size: 105, tip: out(207), flip: true },
          { angle: 214, radius: 246, size: 100, tip: out(214) },
        ] },
      { name: "Burlap Wraps (1 + 3)", component: "burlap",
        positions: [
          { angle: 30, radius: 195, size: 95, tip: out(30) },
          { angle: 90, radius: 195, size: 95, tip: out(90) },
        ] },
      { name: "Hydrangea Anchors", component: "hydrangea",
        positions: [
          { angle: 300, radius: 195, size: 115 }, { angle: 312, radius: 172, size: 100 },
          { angle: 180, radius: 195, size: 115 }, { angle: 157, radius: 200, size: 108 },
        ] },
      { name: "White Tulip Runs (radiating)", component: "tulipWhite",
        positions: [
          { angle: 295, radius: 220, size: 64, tip: out(295) - 10 },
          { angle: 303, radius: 200, size: 64, tip: out(303) + 8 },
          { angle: 310, radius: 224, size: 64, tip: out(310) - 6, flip: true },
          { angle: 318, radius: 190, size: 64, tip: out(318) + 10 },
          { angle: 325, radius: 210, size: 64, tip: out(325) - 8 },
          { angle: 288, radius: 180, size: 64, tip: out(288) + 6, flip: true },
          { angle: 330, radius: 186, size: 64, tip: out(330) },
          { angle: 120, radius: 200, size: 64, tip: out(120) - 8 },
          { angle: 127, radius: 220, size: 64, tip: out(127) + 8, flip: true },
          { angle: 134, radius: 190, size: 64, tip: out(134) - 6 },
          { angle: 141, radius: 212, size: 64, tip: out(141) + 8 },
          { angle: 147, radius: 184, size: 64, tip: out(147), flip: true },
        ] },
      { name: "Smoke-Mauve Punctuation", component: "tulipMauve",
        positions: [
          { angle: 270, radius: 190, size: 64, tip: out(270) - 8 },
          { angle: 277, radius: 214, size: 64, tip: out(277) + 8, flip: true },
          { angle: 263, radius: 166, size: 64, tip: out(263) },
          { angle: 183, radius: 174, size: 64, tip: out(183) + 8 },
          { angle: 172, radius: 208, size: 64, tip: out(172) - 8, flip: true },
        ] },
      { name: "Wax Flower Bridge (cw toward 12:30)", component: "waxFlower",
        positions: [
          { angle: 333, radius: 208, size: 56, tip: cw(333) },
          { angle: 346, radius: 202, size: 56, tip: cw(346) },
          { angle: 358, radius: 198, size: 56, tip: cw(358) },
          { angle: 270, radius: 220, size: 52, tip: out(270) },
        ] },
      { name: "Navy Berry Shadows", component: "berryNavy",
        positions: [
          { angle: 296, radius: 170, size: 72 }, { angle: 200, radius: 164, size: 72 },
          { angle: 240, radius: 220, size: 66 },
        ] },
      { name: "Cream Berry Tail (falling)", component: "berryCream",
        positions: [
          { angle: 207, radius: 226, size: 46, tip: 200 },
          { angle: 203, radius: 248, size: 42, tip: 195 },
          { angle: 199, radius: 268, size: 38, tip: 190 },
        ] },
      { name: "Ranunculus Support (7)", component: "ranunculus",
        positions: [
          { angle: 212, radius: 184, size: 84 }, { angle: 218, radius: 156, size: 80 },
          { angle: 224, radius: 196, size: 82 },
        ] },
      { name: "Peony Focal (8, inner)", component: "peony",
        positions: [{ angle: 240, radius: 170, size: 150 }, { angle: 228, radius: 194, size: 84 }] },
    ],
  },

  classicBalanced: {
    name: "Classic Balanced",
    formula: "Classic Balanced",
    meta: { size: 24, symmetry: "full", declared: "classic" },
    description: "Full-ring composition — three focal anchors at 120° intervals, greenery sweeping clockwise.",
    layers: [
      { name: "Grapevine Base", component: "base",
        positions: [{ angle: 0, radius: 0, size: 480 }] },
      { name: "Eucalyptus Foundation (cw-dominant, varied facing)", component: "eucalyptus",
        positions: [
          { angle: 0,   radius: 195, size: 150, tip: cw(0) },                    // flow
          { angle: 45,  radius: 250, size: 148, tip: out(45) },                  // outward, breaking the ring edge
          { angle: 90,  radius: 196, size: 150, tip: cw(90) + 6 },               // flow
          { angle: 135, radius: 210, size: 145, tip: 135 + 180, flip: true },    // inward
          { angle: 180, radius: 194, size: 150, tip: cw(180) },                  // flow
          { angle: 225, radius: 198, size: 148, tip: ccw(225), flip: true },     // counter-flow
          { angle: 270, radius: 184, size: 148, tip: out(270) },                 // outward
          { angle: 315, radius: 195, size: 150, tip: cw(315) - 6 },              // flow
        ] },
      { name: "Sage Interweave", component: "sage",
        positions: [22, 112, 202, 292].map((a, i) => ({ angle: a, radius: 205, size: 100, tip: out(a), flip: i % 2 === 1 })) },
      { name: "Hydrangea Trio", component: "hydrangea",
        positions: [60, 180, 300].map((a) => ({ angle: a, radius: 180, size: 115 })) },
      { name: "White Tulip Counterpoint", component: "tulipWhite",
        positions: [30, 90, 150, 210, 270, 330].map((a, i) => ({ angle: a, radius: 200, size: 64, tip: out(a) + (i % 2 ? 10 : -10) })) },
      { name: "Navy Berry Accents", component: "berryNavy",
        positions: [45, 135, 225, 315].map((a) => ({ angle: a, radius: 170, size: 68 })) },
      { name: "Wax Flower Sparkle", component: "waxFlower",
        positions: [15, 105, 195, 285].map((a) => ({ angle: a, radius: 215, size: 54, tip: out(a) })) },
      { name: "Peony Focal Trio", component: "peony",
        positions: [0, 120, 240].map((a) => ({ angle: a, radius: 178, size: 130 })) },
      { name: "Bow Anchor", component: "burlap",
        positions: [{ angle: 180, radius: 200, size: 120, tip: 0 }] },
    ],
  },

  bottomHeavy: {
    name: "Bottom Heavy",
    formula: "Bottom Heavy",
    meta: { size: 24, symmetry: "asym", declared: "classic" },
    description: "Mass settles at 5–7 o'clock — stems rise away from the center of gravity, mirrored across the 6 o'clock axis.",
    layers: [
      { name: "Grapevine Base", component: "base",
        positions: [{ angle: 0, radius: 0, size: 480 }] },
      { name: "Eucalyptus Settle (mirrored, varied facing)", component: "eucalyptus",
        positions: [
          { angle: 120, radius: 195, size: 150, tip: cw(120) },                  // flow toward 6
          { angle: 142, radius: 250, size: 148, tip: out(142) },                 // outward, breaking the ring edge
          { angle: 164, radius: 196, size: 150, tip: cw(164) },                  // flow
          { angle: 186, radius: 195, size: 150, tip: ccw(186), flip: true },     // flow (mirrored)
          { angle: 208, radius: 211, size: 145, tip: 208 + 180, flip: true },    // inward
          { angle: 230, radius: 194, size: 150, tip: ccw(230), flip: true },     // flow (mirrored)
        ] },
      { name: "Sage Drift", component: "sage",
        positions: [
          { angle: 132, radius: 250, size: 105, tip: out(132) },
          { angle: 228, radius: 250, size: 105, tip: out(228), flip: true },
          { angle: 180, radius: 262, size: 110, tip: 180 },
        ] },
      { name: "Hydrangea Bed", component: "hydrangea",
        positions: [
          { angle: 150, radius: 190, size: 115 }, { angle: 210, radius: 190, size: 115 },
          { angle: 180, radius: 205, size: 108 },
        ] },
      { name: "Tulip Rise", component: "tulipWhite",
        positions: [
          { angle: 135, radius: 215, size: 64, tip: out(135) - 10 },
          { angle: 158, radius: 175, size: 64, tip: out(158) - 20 },
          { angle: 202, radius: 175, size: 64, tip: out(202) + 20, flip: true },
          { angle: 225, radius: 215, size: 64, tip: out(225) + 10, flip: true },
          { angle: 118, radius: 190, size: 64, tip: out(118) - 6 },
          { angle: 242, radius: 190, size: 64, tip: out(242) + 6, flip: true },
        ] },
      { name: "Berry Depth", component: "berryNavy",
        positions: [{ angle: 168, radius: 165, size: 70 }, { angle: 195, radius: 222, size: 66 }] },
      { name: "Cream Berry Trails", component: "berryCream",
        positions: [
          { angle: 138, radius: 240, size: 44, tip: 165 },
          { angle: 222, radius: 240, size: 44, tip: 195, flip: true },
        ] },
      { name: "Ranunculus Cluster", component: "ranunculus",
        positions: [{ angle: 192, radius: 186, size: 82 }, { angle: 170, radius: 200, size: 80 }] },
      { name: "Peony Focal (6)", component: "peony",
        positions: [{ angle: 180, radius: 182, size: 145 }] },
    ],
  },
};

// ─── Seeded RNG ──────────────────────────────────────────────────────────────
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickInBand = ([lo, hi], t) => Math.round(lo + (hi - lo) * t);

// R12b: cubic center-weighted sampling (dense heart, feathered edges)
// constrained by R7 min-spacing via reject-and-resample (seeded, repeatable)
function sampleClusterAngles(rng, center, span, count, minSpacing) {
  const angles = [];
  for (let i = 0; i < count; i++) {
    let a = center, ok = false;
    for (let tries = 0; tries < 12 && !ok; tries++) {
      const u = rng() * 2 - 1;
      a = center + (span / 2) * u * u * u; // cubic falloff
      ok = angles.every((b) => Math.abs(a - b) >= minSpacing);
    }
    if (!ok && angles.length) {
      const nearest = angles.reduce((p, b) => (Math.abs(a - b) < Math.abs(a - p) ? b : p), angles[0]);
      a = nearest + minSpacing * (a >= nearest ? 1 : -1);
    }
    angles.push(a);
  }
  return angles;
}

// ─── R10: visual weight + centroid + asymmetry score ────────────────────────
function visualWeight(slot, sizeIn, attrs) {
  const a = attrs?.[slot.key] || {};
  const sat = a.sat ?? slot.sat;
  const con = a.con ?? slot.con;
  const sizeF = clamp(sizeIn / 7, 0, 1);
  // 0.4 size + 0.3 darkness/contrast + 0.3 saturation (sums to 1.0, harmonized)
  return (0.4 * sizeF + 0.3 * con + 0.3 * sat) * (ROLE_FACTOR[slot.role] || 0);
}
function computeCentroid(items) {
  // radius-weighted (physics center-of-mass) — outer elements pull harder.
  // magnitude is normalized by weighted mean radius so the 0.40–0.80 score
  // band stays calibrated; radiusNorm is the physical offset for the overlay dot.
  let sx = 0, sy = 0, tw = 0, twr = 0;
  items.forEach((it) => {
    const r = (it.angle * Math.PI) / 180;
    const rad = it.radiusNorm ?? 0.8;
    sx += Math.cos(r) * rad * it.weight;
    sy += Math.sin(r) * rad * it.weight;
    tw += it.weight;
    twr += it.weight * rad;
  });
  if (!tw) return null;
  let ang = (Math.atan2(sy, sx) * 180) / Math.PI;
  ang = ((ang % 360) + 360) % 360;
  const physical = Math.sqrt(sx * sx + sy * sy) / tw;
  const meanR = twr / tw || 1;
  return { angle: ang, magnitude: physical / meanR, radiusNorm: physical };
}
const angDist = (a, b) => {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
};

// ─── R9: Bundle-based generator with pole bias + adjustment loop ─────────────
function generateLayout({ D, style, drama, seed, anchor, asym, clusterShift = 0, clusterSpanF = 0.5, formula = "crescent" }) {
  const rng = mulberry32(seed);
  const ppi = 480 / D;
  const rw = rWorkIn(D);
  const dpi = degPerInch(D);
  const t = { low: 0.18, med: 0.5, high: 0.85 }[drama];
  const centerAngle = ARC_ANCHORS[anchor] ?? 225;

  const [cLo, cHi] = COVERAGE_CLASSES[style].range;
  const coverage = cLo + (cHi - cLo) * t;
  const span = ((360 * coverage) / 100) * (formula === "twin" ? 0.82 : 1);
  const a0 = centerAngle - span / 2;
  const a1 = centerAngle + span / 2;
  const pole = a0 + span * 0.7; // R9.2 weight pole

  const band = SIZE_TABLE[D];
  const stems = {
    focal: pickInBand(band.focal, t),
    secondary: pickInBand(band.secondary, t),
    filler: pickInBand(band.filler, t),
    greenery: pickInBand(band.greenery, t),
  };
  const bundles = Math.round((2 * Math.PI * rw * coverage) / 100 / 2.25);

  // R9.5: Twin Cluster allocation — 1.0 : 0.4 weight split (≈71/29 by stems),
  // minor cluster may carry one small focal (it's a declared cluster, R2 holds within it)
  const twin = formula === "twin";
  const splitN = (n, p) => Math.round(n * p);
  const cStems = twin ? {
    focal: clamp(splitN(stems.focal, 0.29), 0, 1),
    secondary: Math.max(1, splitN(stems.secondary, 0.29)),
    filler: Math.max(1, splitN(stems.filler, 0.29)),
    greenery: Math.max(1, splitN(stems.greenery, 0.29)),
  } : null;
  const pStems = twin ? {
    focal: Math.max(1, stems.focal - cStems.focal),
    secondary: stems.secondary - cStems.secondary,
    filler: stems.filler - cStems.filler,
    greenery: stems.greenery - cStems.greenery,
  } : stems;

  const j = (amt) => (rng() - 0.5) * 2 * amt;
  const px = (inches) => inches * ppi;
  const rWorkPx = px(rw);
  const ease = (tt, peak = 0.7) => Math.max(0, 1 - Math.abs(tt - peak) / 0.3); // triangular

  // Greenery: full arc + 10° taper overhang (R2), varied facing —
  // 45% flow · 20% outward · 15% inward · 10% counter-flow · 10% diagonal
  const greeneryTip = (a) => {
    const r = rng();
    if (r < 0.40) return { tip: ccw(a) + j(12), dr: 0 };                 // flow (dominant)
    if (r < 0.55) return { tip: out(a) + j(10), dr: -0.65 };             // outward, seated inner
    if (r < 0.72) return { tip: out(a) + j(12), beyond: true };          // silhouette-breaker, beyond the ring
    if (r < 0.84) return { tip: a + 180 + j(10), dr: 0.75 };             // inward, seated outer
    if (r < 0.92) return { tip: cw(a) + j(12), dr: 0.3 };                // counter-flow
    return { tip: ccw(a) - 45 + j(8), dr: 0 };                            // diagonal
  };
  const gPlace = Math.max(6, Math.round(pStems.greenery * 3 * 0.8));
  const greeneryEuc = [], greenerySage = [];
  for (let i = 0; i < gPlace; i++) {
    const a = a0 - 10 + ((span + 20) * i) / (gPlace - 1) + j(3);
    const facing = greeneryTip(a);
    const pos = {
      angle: a,
      radius: facing.beyond ? px(D / 2 + 0.6 + rng() * 1.3) : rWorkPx + px(facing.dr || 0) + px(j(0.5)),
      size: px(7.2) + j(10),
      tip: facing.tip,
      flip: rng() > 0.5,
      _role: "greenery",
    };
    if (i % 4 === 3) greenerySage.push({ ...pos, radius: px(D / 2 + 0.8) + px(rng() * 0.8), size: px(5), tip: out(a) + j(8) });
    else greeneryEuc.push(pos);
  }

  // ── R12a: cluster-patch model — blooms live in cluster objects ──
  const clusterCenter = clamp(pole + clusterShift, a0 + span * 0.2, a1 - span * 0.1);
  const cSpan = span * clusterSpanF;
  const fpF = 3.5 * dpi;

  // Focals: cubic-sampled in the tight core, spaced ≥ footprint (R6),
  // seated at r_work − 0.5" (R12c tight band)
  const focalAngles = sampleClusterAngles(rng, clusterCenter, Math.max(cSpan * 0.55, pStems.focal * fpF * 1.1), pStems.focal, fpF * 1.05);
  const focals = focalAngles.map((a, i) => ({
    angle: a, radius: rWorkPx - px(0.5) + px(j(0.2)), size: px(6.5) + (i === 0 ? px(0.8) : 0), _role: "focal",
  }));

  // Secondary: cubic-sampled across the patch, woven both sides of r_work (R12c ±1.0")
  const nHyd = Math.round(pStems.secondary * 0.3);
  const nMauve = Math.round(pStems.secondary * 0.15);
  const secCount = pStems.secondary;
  const secAngles = sampleClusterAngles(rng, clusterCenter, cSpan, secCount, 2.5 * dpi * 0.65)
    .map((a) => clamp(a, a0 + span * 0.16, a1 - span * 0.1))
    .map((a) => (focals.some((f) => Math.abs(a - f.angle) < fpF * 0.5) ? a + fpF * 0.6 * (rng() > 0.5 ? 1 : -1) : a));
  // blooms may lean past the outer edge or into the opening — the stem still
  // anchors in the band; only the head travels
  const bloomRadius = (alt) => {
    const rr = rng();
    if (rr < 0.14) return rWorkPx - px(2.0 + rng() * 1.4); // head dips into the opening
    if (rr < 0.26) return rWorkPx + px(2.0 + rng() * 1.4); // head past the outer edge
    return rWorkPx + px(alt * (0.3 + rng() * 0.7));
  };
  const hyd = [], tulW = [], tulM = [];
  secAngles.forEach((a, i) => {
    const alt = i % 2 ? 1 : -1;
    if (hyd.length < nHyd && i % Math.max(2, Math.round(secCount / Math.max(1, nHyd))) === 1) {
      hyd.push({ angle: a, radius: rWorkPx + px(0.5 * alt) + px(j(0.4)), size: px(5.2) + j(8), _role: "secondary" });
    } else if (tulM.length < nMauve && i % 3 === 2) {
      tulM.push({ angle: a, radius: bloomRadius(alt), size: px(3.2), tip: out(a) + j(12), flip: rng() > 0.5, _role: "secondary" });
    } else {
      tulW.push({ angle: a, radius: bloomRadius(alt), size: px(3.2), tip: out(a) + j(12), flip: rng() > 0.5, _role: "secondary" });
    }
  });

  // Filler: navy cubic-sampled on the cluster core (inner shadow, R12c ±1.5" band),
  // wax at taper ends (edges stay foliage-soft), cream tail at the low end
  const nNavy = Math.round(pStems.filler * 0.35);
  const nWax = Math.round(pStems.filler * 1.5 * 0.4);
  const nCream = Math.max(2, Math.round(pStems.filler * 1.5 * 0.25));
  const navy = sampleClusterAngles(rng, clusterCenter, cSpan * 0.45, nNavy, 1.5 * dpi * 0.8).map((a) => ({
    angle: a, radius: rWorkPx - px(1.2) + px(j(0.6)), size: px(3.4), _role: "filler",
  }));
  const wax = Array.from({ length: nWax }, (_, i) => {
    const atStart = i % 2 === 0;
    const base = atStart ? a0 + 4 + i * 5 : a1 - 4 - i * 5;
    return { angle: base + j(3), radius: rWorkPx + px(0.6) + px(j(0.5)), size: px(2.6), tip: (atStart ? cw(base) : ccw(base)) + j(8), _role: "filler" };
  });
  const lowness = (a) => -Math.cos((a * Math.PI) / 180);
  const tailEnd = lowness(a0) > lowness(a1) ? a0 : a1;
  const cream = Array.from({ length: nCream }, (_, i) => ({
    angle: tailEnd + j(4) - i * 3 * (tailEnd === a0 ? -1 : 1),
    radius: px(D / 2 + 0.4 + i * 0.9), size: px(2.2 - i * 0.25), tip: 180 + j(15), _role: "filler",
  }));
  let counterCluster = null;

  // R9.5 + R12d-amended: twin's minor cluster lives on the OPPOSITE diagonal end
  const counterCenter = clusterCenter + 180;
  if (twin) {
    const ccSpan = Math.max(22, cSpan * 0.4);
    const gN = Math.max(3, cStems.greenery * 2);
    for (let i = 0; i < gN; i++) {
      const a = counterCenter - ccSpan / 2 - 8 + ((ccSpan + 16) * i) / Math.max(1, gN - 1) + j(3);
      greeneryEuc.push({ angle: a, radius: rWorkPx + px(j(0.5)), size: px(6.2) + j(8), tip: cw(a) + j(12), flip: rng() > 0.5, _role: "greenery" });
    }
    if (cStems.focal) focals.push({ angle: counterCenter + j(4), radius: rWorkPx - px(0.3) + px(j(0.2)), size: px(5.2), _role: "focal" });
    sampleClusterAngles(rng, counterCenter, ccSpan, cStems.secondary, 2.5 * dpi * 0.65).forEach((a, i) => {
      const alt = i % 2 ? 1 : -1;
      tulW.push({ angle: a, radius: rWorkPx + px(alt * (0.3 + rng() * 0.6)), size: px(3.2), tip: out(a) + j(12), flip: rng() > 0.5, _role: "secondary" });
    });
    sampleClusterAngles(rng, counterCenter, ccSpan * 0.6, Math.max(1, cStems.filler), 1.5 * dpi * 0.8).forEach((a) => {
      navy.push({ angle: a, radius: rWorkPx - px(1.0) + px(j(0.5)), size: px(3.2), _role: "filler" });
    });
    counterCluster = { center: counterCenter, span: ccSpan, members: cStems.focal + cStems.secondary + cStems.filler, minor: true };
  }

  // ── R9.3: score-gated adjustment loop (≤3 iterations, seeded) ──
  const movable = [...focals, ...hyd, ...tulW, ...tulM];
  const allForScore = () => {
    const list = [];
    const push = (arr, slotKey) => arr.forEach((p) => {
      const s = SLOT_MAP[slotKey];
      list.push({ angle: p.angle, radiusNorm: clamp(p.radius / 240, 0, 1.15), weight: visualWeight(s, p.size / ppi, null) });
    });
    push(focals, "peony"); push(hyd, "hydrangea"); push(tulW, "tulipWhite"); push(tulM, "tulipMauve");
    push(navy, "berryNavy"); push(wax, "waxFlower"); push(cream, "berryCream");
    push(greeneryEuc, "eucalyptus"); push(greenerySage, "sage");
    return list;
  };
  const scoreNow = () => {
    const c = computeCentroid(allForScore());
    if (!c) return { score: 0, c: null };
    const normOff = clamp(angDist(c.angle, centerAngle) / (span / 2), 0, 1);
    return { score: 0.5 * normOff + 0.5 * c.magnitude, c };
  };
  const minA = clamp(asym - 0.2, 0.3, 0.9);
  const maxA = clamp(asym + 0.2, 0.3, 0.95);
  let result = scoreNow();
  let iterations = 0;
  for (let k = 0; k < 3; k++) {
    if (result.score >= minA && result.score <= maxA) break;
    iterations++;
    if (result.score < minA) {
      movable.forEach((e) => {
        if (rng() < 0.4) {
          const step = 10 + rng() * 15;
          e.angle += Math.sign(pole - e.angle) * Math.min(step, Math.abs(pole - e.angle));
          if (e.tip !== undefined) e.tip = out(e.angle) + j(10);
        }
      });
    } else if (!twin) {
      // R12d (amended): echo counter-cluster in the AXIS-OPPOSED cone — across
      // the ring (like C24PE-RE's wax bridge + burlap opposing the 7:30 mass),
      // reassigned filler + one secondary, never a focal (R2 holds).
      const echoCenter = counterCenter + j(12);
      const pool = [...wax.slice(0, 2), ...(tulW.length > 2 ? [tulW[tulW.length - 1]] : [])];
      if (pool.length) {
        const ccAngles = sampleClusterAngles(rng, echoCenter, 25, pool.length, 1.5 * dpi * 0.8);
        pool.forEach((e, idx) => {
          e.angle = ccAngles[idx];
          e.radius = rWorkPx + px(j(0.8));
          if (e.tip !== undefined) e.tip = out(e.angle) + j(8);
        });
        counterCluster = { center: echoCenter, span: 25, members: pool.length };
      }
    }
    result = scoreNow();
  }

  const layers = [
    { name: "Grapevine Base", component: "base", positions: [{ angle: 0, radius: 0, size: 480 }] },
    { name: `Eucalyptus Pass (${greeneryEuc.length} sprigs)`, component: "eucalyptus", positions: greeneryEuc },
    { name: `Sage Extensions (${greenerySage.length})`, component: "sage", positions: greenerySage },
    hyd.length && { name: `Hydrangea Mass (${hyd.length})`, component: "hydrangea", positions: hyd },
    tulW.length && { name: `White Tulip Run (${tulW.length})`, component: "tulipWhite", positions: tulW },
    tulM.length && { name: `Mauve Punctuation (${tulM.length})`, component: "tulipMauve", positions: tulM },
    wax.length && { name: `Wax Flower Taper (${wax.length})`, component: "waxFlower", positions: wax },
    navy.length && { name: `Navy Berry Depth (${navy.length})`, component: "berryNavy", positions: navy },
    cream.length && { name: `Cream Berry Tail (${cream.length})`, component: "berryCream", positions: cream },
    { name: `Peony Focal${focals.length > 1 ? "s" : ""} (${focals.length})`, component: "peony", positions: focals },
  ].filter(Boolean);

  return {
    name: `Generated · ${D}" ${twin ? "Twin Cluster" : COVERAGE_CLASSES[style].label}`,
    formula: twin ? "Twin Cluster" : style === "minimal" ? "Side Sweep" : "Crescent",
    meta: {
      size: D, symmetry: "asym", declared: style, generated: true, seed, drama,
      coverageTarget: +coverage.toFixed(1), bundles, purchaseStems: stems,
      pole, anchor, asymTarget: asym, adjustIterations: iterations,
      clusters: [
        { id: "C1", type: "focal", center_deg: +clusterCenter.toFixed(1), span_deg: +cSpan.toFixed(1) },
        ...(counterCluster ? [{ id: "C2", type: counterCluster.minor ? "minor" : "counterweight-echo", center_deg: +((((counterCluster.center % 360) + 360) % 360)).toFixed(1), span_deg: +counterCluster.span.toFixed(1) }] : []),
      ],
    },
    description: `Seed ${seed} · ${coverage.toFixed(0)}% coverage · ${bundles} bundles · cluster at ${degToClock(clusterCenter)} o'clock, span ${Math.round(cSpan)}°${counterCluster ? ` · ${counterCluster.minor ? "minor cluster" : "echo"} at ${degToClock(counterCluster.center)} o'clock` : ""} · asym target ${asym}${iterations ? ` · ${iterations} adjustment pass${iterations > 1 ? "es" : ""}` : ""}.`,
    layers,
  };
}

// ─── Validation engine (R1–R7, R10) ──────────────────────────────────────────
function computeValidation(layout, slotAttrs) {
  const D = layout.meta?.size || 24;
  const dpi = degPerInch(D);
  const ppi = 480 / D;
  const items = [];
  layout.layers.forEach((l) => {
    const s = SLOT_MAP[l.component];
    if (!s || s.role === "base" || s.role === "accent") return;
    l.positions.forEach((p) => {
      const at = slotAttrs?.[s.key] || {};
      const sizeIn = p.size / ppi;
      items.push({
        angle: ((p.angle % 360) + 360) % 360,
        role: s.role,
        fpDeg: s.fp * dpi,
        slot: s.key,
        sizeIn,
        radiusNorm: clamp(p.radius / 240, 0, 1.15),
        weight: visualWeight(s, sizeIn, slotAttrs),
        texW: (0.5 * s.coarse + 0.5 * (at.cx ?? s.cxd)) * clamp(sizeIn / 7, 0, 1) * (ROLE_TEX[s.role] || 0),
        group: colorGroupOf(at.hue !== undefined && at.hue !== null ? at.hue : s.hued, at.sat ?? s.sat),
      });
    });
  });
  if (!items.length) return null;

  // cut circle at largest gap → linearize
  const sorted = [...items].sort((a, b) => a.angle - b.angle);
  let maxGap = -1, cut = 0;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i].angle;
    const b = i === sorted.length - 1 ? sorted[0].angle + 360 : sorted[i + 1].angle;
    if (b - a > maxGap) { maxGap = b - a; cut = a + (b - a) / 2; }
  }
  const lin = items.map((it) => ({ ...it, a: ((it.angle - cut) % 360 + 360) % 360 }));

  const ivs = lin.map((it) => [it.a - it.fpDeg / 2, it.a + it.fpDeg / 2]).sort((x, y) => x[0] - y[0]);
  const merged = [];
  ivs.forEach(([s, e]) => {
    if (merged.length && s <= merged[merged.length - 1][1] + 1) merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    else merged.push([s, e]);
  });
  const coveredDeg = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
  const coverage = (coveredDeg / 360) * 100;

  const ext0 = Math.min(...lin.map((i) => i.a)) - 2;
  const ext1 = Math.max(...lin.map((i) => i.a)) + 2;
  const extLen = Math.min(360, ext1 - ext0);
  const arcStartDeg = ((ext0 + cut) % 360 + 360) % 360;
  const arcEndDeg = ((ext1 + cut) % 360 + 360) % 360;
  const arcCenterDeg = ((ext0 + extLen / 2 + cut) % 360 + 360) % 360;

  const cz0 = ext0 + extLen * 0.25, cz1 = ext1 - extLen * 0.25;
  const blooms = lin.filter((i) => i.role === "focal" || i.role === "secondary");
  const bloomFp = blooms.reduce((a, i) => a + i.fpDeg, 0);
  const bloomCentral = blooms.filter((i) => i.a >= cz0 && i.a <= cz1).reduce((a, i) => a + i.fpDeg, 0);
  const centralFrac = bloomFp ? (bloomCentral / bloomFp) * 100 : 0;

  // R6/R7: same-layer spacing — adjacent bloom-band placements vs footprint requirement
  const bloomSorted = [...blooms].sort((x, y) => x.a - y.a);
  let tightPairs = 0;
  for (let i = 1; i < bloomSorted.length; i++) {
    const gap = bloomSorted[i].a - bloomSorted[i - 1].a;
    if (gap < ((bloomSorted[i].fpDeg + bloomSorted[i - 1].fpDeg) / 2) * 0.7) tightPairs++;
  }

  // R15: texture density field — kernel accumulation + perceptual saturation 1−e^(−kx)
  const NS = 120;
  const texField = [];
  for (let i = 0; i < NS; i++) {
    const sa = i * (360 / NS);
    let raw = 0;
    const rawL = { back: 0, mid: 0, front: 0 };
    items.forEach((it) => {
      const spread = Math.max(it.fpDeg, it.sizeIn * 0.5 * dpi);
      const dd = angDist(sa, it.angle);
      if (dd > spread) return;
      const contrib = it.texW * Math.cos((dd / spread) * (Math.PI / 2)) ** 2;
      raw += contrib;
      const dl = SLOT_MAP[it.slot].depth;
      if (dl) rawL[dl] += contrib;
    });
    // R18: negative space between layers per slice
    const dB = 1 - Math.exp(-1.1 * rawL.back), dM = 1 - Math.exp(-1.1 * rawL.mid), dF = 1 - Math.exp(-1.1 * rawL.front);
    const totalPositive = clamp(0.4 * dB + 0.35 * dM + 0.25 * dF, 0, 1);
    const midGap = clamp((Math.max(0, dB - dM) + Math.max(0, dF - dM)) / 2, 0, 1);
    texField.push({
      angle: sa,
      density: 1 - Math.exp(-1.1 * raw),
      neg: clamp(0.6 * (1 - totalPositive) + 0.4 * midGap, 0, 1),
      hollow: dB > 0.45 && dF > 0.45 && dM < 0.2,
    });
  }
  const inArcSamples = texField.filter((sp) => {
    const aL = ((sp.angle - cut) % 360 + 360) % 360;
    return aL >= ext0 && aL <= ext1;
  });
  const texVals = (inArcSamples.length ? inArcSamples : texField).map((sp) => sp.density);
  const texAvg = texVals.reduce((a, b) => a + b, 0) / texVals.length;
  const texMax = Math.max(...texVals);
  const texCV = texAvg > 0.02 ? Math.sqrt(texVals.reduce((a, b) => a + (b - texAvg) ** 2, 0) / texVals.length) / texAvg : 0;
  const hotSample = texField.reduce((pp, sp) => (sp.density > pp.density ? sp : pp), texField[0]);

  // R18: rest centroid — negative space as a positive-weighted counter-shape.
  // (The source's signed-denominator centroid is numerically unstable: sumW→0
  // explodes. This keeps R10 untouched and measures opposition instead.)
  let restC = null;
  {
    let nx = 0, ny = 0, nw = 0;
    texField.forEach((sp) => {
      if (sp.neg < 0.35) return;
      const w = 1 - Math.exp(-1.5 * sp.neg);
      const r = (sp.angle * Math.PI) / 180;
      nx += w * Math.cos(r); ny += w * Math.sin(r); nw += w;
    });
    if (nw > 0.5) {
      let na = (Math.atan2(ny, nx) * 180) / Math.PI;
      if (na < 0) na += 360;
      restC = { angle: na, mag: Math.hypot(nx, ny) / nw };
    }
  }
  let hollowCount = 0, hollowAngle = null;
  texField.forEach((sp) => {
    if (!sp.hollow) return;
    const aL = ((sp.angle - cut) % 360 + 360) % 360;
    if (aL >= ext0 && aL <= ext1) { hollowCount++; if (hollowAngle === null) hollowAngle = sp.angle; }
  });

  // R15 addition: fine/med/coarse alternation in the bloom band (declared coarseness)
  const texClass = (c) => (c < 0.45 ? 0 : c < 0.65 ? 1 : 2);
  let texRuns = 0, runLen = 1;
  for (let i = 1; i < bloomSorted.length; i++) {
    if (texClass(SLOT_MAP[bloomSorted[i - 1].slot].coarse) === texClass(SLOT_MAP[bloomSorted[i].slot].coarse)) {
      runLen++;
      if (runLen === 3) texRuns++;
    } else runLen = 1;
  }

  // R17: multi-layer depth quality — cluster centers = texture-field peaks (organic, layout-agnostic)
  const rWorkNorm = rWorkIn(D) / (D / 2);
  const depthCenters = [];
  for (let i = 0; i < NS; i++) {
    const d0 = texField[i].density;
    if (d0 < 0.35) continue;
    let isPeak = true;
    for (const off of [-2, -1, 1, 2]) {
      if (texField[(((i + off) % NS) + NS) % NS].density > d0) { isPeak = false; break; }
    }
    if (!isPeak) continue;
    const a = texField[i].angle;
    const near = depthCenters.find((c) => angDist(c.angle, a) < 25);
    if (near) { if (d0 > near.density) { near.angle = a; near.density = d0; } }
    else depthCenters.push({ angle: a, density: d0 });
  }
  const K_LAYER = { back: 0.9, mid: 1.1, front: 1.5 }; // front saturates fastest
  const DEPTH_TARGET = { back: 0.4, mid: 0.35, front: 0.25 };
  const depthClusters = depthCenters.map((c) => {
    const raw = { back: 0, mid: 0, front: 0 };
    items.forEach((it) => {
      const dl = SLOT_MAP[it.slot].depth;
      if (!dl) return;
      const da = angDist(it.angle, c.angle);
      if (da > 14) return;
      const dr = Math.abs(it.radiusNorm - rWorkNorm);
      if (dr > 0.18) return;
      const fall = Math.cos((da / 14) * (Math.PI / 2)) ** 2 * Math.cos((dr / 0.18) * (Math.PI / 2)) ** 2;
      raw[dl] += it.texW * fall;
    });
    const dens = {};
    Object.keys(raw).forEach((dl) => { dens[dl] = 1 - Math.exp(-K_LAYER[dl] * raw[dl] * 2.2); });
    const minL = Math.min(dens.back, dens.mid, dens.front);
    const maxL = Math.max(dens.back, dens.mid, dens.front);
    const sumD = dens.back + dens.mid + dens.front + 1e-6;
    const balance = clamp(1 - (Math.abs(dens.back / sumD - DEPTH_TARGET.back) + Math.abs(dens.mid / sumD - DEPTH_TARGET.mid) + Math.abs(dens.front / sumD - DEPTH_TARGET.front)) / 2, 0, 1);
    // overcrowd rescaled to full effect (source formula capped its own penalty at 0.045)
    const overcrowd = Math.max(0, maxL - 0.85) / 0.15;
    const q = clamp(0.4 * minL + 0.5 * balance - 0.3 * overcrowd, 0, 1);
    return { angle: c.angle, q, mode: maxL > 0.85 ? "over" : minL < 0.12 ? "flat" : "ok" };
  });
  const depthAvg = depthClusters.length ? depthClusters.reduce((a, c) => a + c.q, 0) / depthClusters.length : 0;
  const depthVar = depthClusters.length ? depthClusters.reduce((a, c) => a + (c.q - depthAvg) ** 2, 0) / depthClusters.length : 0;

  const fpSum = (roles) => lin.filter((i) => roles.includes(i.role)).reduce((a, i) => a + i.fpDeg, 0);
  const stackBloom = fpSum(["focal", "secondary", "filler"]) / extLen;
  const stackTotal = fpSum(["focal", "secondary", "filler", "greenery"]) / extLen;

  const placements = {}, purchase = {};
  lin.forEach((i) => {
    placements[i.role] = (placements[i.role] || 0) + 1;
    purchase[i.role] = (purchase[i.role] || 0) + 1 / SLOT_MAP[i.slot].yield;
  });
  Object.keys(purchase).forEach((k) => (purchase[k] = Math.ceil(purchase[k])));

  // R10: centroid + asymmetry score
  const centroid = computeCentroid(items);
  const full = layout.meta?.symmetry === "full";
  let asymScore = null;
  if (centroid && !full) {
    const normOff = clamp(angDist(centroid.angle, arcCenterDeg) / (extLen / 2), 0, 1);
    asymScore = 0.5 * normOff + 0.5 * centroid.magnitude;
  }
  const axisAngle = centroid ? (centroid.angle + 180) % 360 : null;

  // R13: axis projection — commitment to nearest canonical diagonal + lateral drift
  let diagAxis = null, axisBalance = null, driftRatio = null;
  if (centroid && !full) {
    diagAxis = [45, 135, 225, 315].reduce((p, d) => (angDist(centroid.angle, d) < angDist(centroid.angle, p) ? d : p), 45);
    let sA = 0, sP = 0, tw = 0;
    items.forEach((it) => {
      const rel = ((it.angle - diagAxis) * Math.PI) / 180;
      sA += it.weight * it.radiusNorm * Math.cos(rel);
      sP += it.weight * it.radiusNorm * Math.sin(rel);
      tw += it.weight;
    });
    axisBalance = tw ? Math.abs(sA) / tw : 0;
    driftRatio = Math.abs(sA) > 0.02 ? Math.abs(sP) / Math.abs(sA) : 9;
  }

  // R16: per-color-group centroids — same radius-weighted machinery, filtered
  const colorCentroids = {};
  ["warm", "cool", "neutral"].forEach((g) => {
    const sub = items.filter((it) => it.group === g);
    colorCentroids[g] = sub.length >= 2 ? computeCentroid(sub) : null;
  });
  const gk = Object.keys(colorCentroids).filter((g) => colorCentroids[g]);
  const colorPairs = [];
  for (let i = 0; i < gk.length; i++) for (let jj = i + 1; jj < gk.length; jj++) {
    const c1 = colorCentroids[gk[i]], c2 = colorCentroids[gk[jj]];
    const r1 = (c1.angle * Math.PI) / 180, r2 = (c2.angle * Math.PI) / 180;
    colorPairs.push({
      pair: `${gk[i]}↔${gk[jj]}`,
      dist: Math.hypot(c1.radiusNorm * Math.cos(r1) - c2.radiusNorm * Math.cos(r2), c1.radiusNorm * Math.sin(r1) - c2.radiusNorm * Math.sin(r2)),
    });
  }
  // R16 (scoped): accent separation ≥30° — smallest non-neutral group's filler repeats only;
  // clustered dominant colors are intentional and exempt
  let accentSep = null, accentGroup = null;
  const nonNeutral = ["warm", "cool"].filter((g) => items.some((it) => it.group === g && it.role === "filler"));
  if (nonNeutral.length) {
    accentGroup = nonNeutral.reduce((pg, g) =>
      items.filter((it) => it.group === g).length < items.filter((it) => it.group === pg).length ? g : pg, nonNeutral[0]);
    const acc = items.filter((it) => it.group === accentGroup && it.role === "filler").map((it) => it.angle).sort((a, b) => a - b);
    if (acc.length >= 2) {
      accentSep = 360;
      for (let i = 1; i < acc.length; i++) accentSep = Math.min(accentSep, acc[i] - acc[i - 1]);
      accentSep = Math.min(accentSep, 360 - (acc[acc.length - 1] - acc[0]));
    }
  }

  const declared = layout.meta?.declared || "classic";
  const [tLo, tHi] = TOTAL_STACK_BANDS[declared];
  const bands = SIZE_TABLE[D] || SIZE_TABLE[24];
  const inBand = (v, [lo, hi]) => (v >= lo && v <= hi ? "pass" : v >= lo * 0.6 && v <= hi * 1.6 ? "warn" : "flag");
  const status = (ok, near) => (ok ? "pass" : near ? "warn" : "flag");

  const checks = [];
  if (full) {
    checks.push({ label: "Coverage", value: `${coverage.toFixed(0)}% — full-ring composition`, status: "info" });
  } else {
    const [lo, hi] = COVERAGE_CLASSES[declared].range;
    checks.push({
      label: `Coverage (declared ${COVERAGE_CLASSES[declared].label})`,
      value: `${coverage.toFixed(0)}% of ring · band ${lo}–${hi}%`,
      status: status(coverage >= lo && coverage <= hi, coverage >= lo - 8 && coverage <= hi + 8),
    });
  }
  const nestPass = layout.formula === "Twin Cluster" ? 45 : 60;
  checks.push({
    label: "Bloom nesting (R2)",
    value: `${centralFrac.toFixed(0)}% of bloom mass in central 50% · target ≥${nestPass}%${layout.formula === "Twin Cluster" ? " (twin-relaxed)" : ""}`,
    status: status(centralFrac >= nestPass, centralFrac >= nestPass - 15),
  });
  checks.push({
    label: "Same-layer spacing (R6/R7)",
    value: tightPairs === 0 ? "no bloom collisions" : `${tightPairs} tight bloom pair${tightPairs > 1 ? "s" : ""} under footprint spacing`,
    status: tightPairs === 0 ? "pass" : tightPairs <= 2 ? "warn" : "flag",
  });
  if (asymScore !== null) {
    checks.push({
      label: "Asymmetry score (R10)",
      value: `${asymScore.toFixed(2)} · band 0.40–0.80 · centroid at ${degToClock(centroid.angle)} o'clock, mag ${centroid.magnitude.toFixed(2)}`,
      status: status(asymScore >= 0.4 && asymScore <= 0.8, asymScore >= 0.32 && asymScore <= 0.88),
    });
    const cohere = angDist(centroid.angle, arcCenterDeg);
    checks.push({
      label: "Centroid coherence (R10)",
      value: `centroid ${cohere.toFixed(0)}° from arc center · counterweights oppose at ${degToClock(axisAngle)} o'clock`,
      status: cohere <= extLen * 0.45 ? "pass" : "warn",
    });
    checks.push({
      label: "Diagonal commitment (R13)",
      value: `axis ${degToClock(diagAxis)}↔${degToClock(diagAxis + 180)} o'clock · balance ${axisBalance.toFixed(2)} · target ≥0.25`,
      status: status(axisBalance >= 0.25, axisBalance >= 0.15),
    });
    checks.push({
      label: "Lateral drift (R13)",
      value: `${(Math.min(driftRatio, 9) * 100).toFixed(0)}% of axis signal · target ≤35%`,
      status: status(driftRatio <= 0.35, driftRatio <= 0.6),
    });
  } else if (centroid) {
    checks.push({ label: "Balance (symmetric)", value: `centroid magnitude ${centroid.magnitude.toFixed(2)} · near 0 = even ring`, status: centroid.magnitude < 0.18 ? "pass" : "warn" });
  }
  checks.push({
    label: "Bloom-layer stacking (R7)",
    value: `${stackBloom.toFixed(2)}× · band ${BLOOM_STACK_BAND[0]}–${BLOOM_STACK_BAND[1]}×`,
    status: status(stackBloom >= BLOOM_STACK_BAND[0] && stackBloom <= BLOOM_STACK_BAND[1], stackBloom >= 1.0 && stackBloom <= 2.2),
  });
  checks.push({
    label: "Total stacking incl. greenery (R7)",
    value: `${stackTotal.toFixed(2)}× · band ${tLo}–${tHi}×`,
    status: status(stackTotal >= tLo && stackTotal <= tHi, stackTotal >= tLo - 0.4 && stackTotal <= tHi + 0.5),
  });
  checks.push({
    label: "Texture density (R15)",
    value: `peak ${texMax.toFixed(2)} · mean ${texAvg.toFixed(2)} within arc · ceiling 0.85`,
    status: status(texMax <= 0.85, texMax <= 0.93),
  });
  checks.push({
    label: "Texture evenness (R15)",
    value: `${(texCV * 100).toFixed(0)}% variation across arc · calm ≤45%`,
    status: status(texCV <= 0.45, texCV <= 0.65),
  });
  checks.push({
    label: "Texture alternation (R15)",
    value: texRuns === 0 ? "fine/med/coarse alternating cleanly" : `${texRuns} run${texRuns > 1 ? "s" : ""} of 3+ same-texture neighbors`,
    status: texRuns === 0 ? "pass" : texRuns === 1 ? "warn" : "flag",
  });
  checks.push({
    label: "Depth quality (R17)",
    value: depthClusters.length ? `avg ${depthAvg.toFixed(2)} across ${depthClusters.length} cluster${depthClusters.length > 1 ? "s" : ""} · rich ≥0.60` : "no cluster peaks detected",
    status: !depthClusters.length ? "info" : status(depthAvg >= 0.6, depthAvg >= 0.45),
  });
  if (depthClusters.length > 1) {
    checks.push({
      label: "Depth consistency (R17)",
      value: `variance ${depthVar.toFixed(3)} · even ≤0.040`,
      status: status(depthVar <= 0.04, depthVar <= 0.08),
    });
  }
  if (!full && restC && centroid) {
    const opp = angDist(centroid.angle, restC.angle);
    checks.push({
      label: "Negative-space counterweight (R18)",
      value: `rest mass at ${degToClock(restC.angle)} o'clock · opposes floral centroid by ${opp.toFixed(0)}° · target ≥120°`,
      status: status(opp >= 120, opp >= 85),
    });
  }
  checks.push({
    label: "Hollow midspace (R18)",
    value: hollowCount === 0 ? "back and front bridged by mid layer throughout" : `${hollowCount} slice${hollowCount > 1 ? "s" : ""} hollow between layers near ${degToClock(hollowAngle)} o'clock`,
    status: hollowCount === 0 ? "pass" : hollowCount <= 3 ? "warn" : "flag",
  });
  gk.forEach((g) => {
    const c = colorCentroids[g];
    checks.push({
      label: `Color balance · ${g} (R16)`,
      value: `leans ${degToClock(c.angle)} o'clock · ${c.radiusNorm.toFixed(2)} off-center · ceiling 0.60`,
      status: c.radiusNorm <= 0.6 ? "pass" : "warn",
    });
  });
  if (colorPairs.length) {
    const maxPair = colorPairs.reduce((pp, c) => (c.dist > pp.dist ? c : pp), colorPairs[0]);
    checks.push({
      label: "Color group separation (R16)",
      value: `${maxPair.pair} centroids ${maxPair.dist.toFixed(2)} apart · blend ≤0.80 (separation can be intentional)`,
      status: maxPair.dist <= 0.8 ? "pass" : "warn",
    });
  }
  if (accentSep !== null) {
    checks.push({
      label: "Accent separation (R16)",
      value: `min ${accentSep.toFixed(0)}° between ${accentGroup} accents · target ≥30°`,
      status: accentSep >= 30 ? "pass" : "warn",
    });
  }
  ["focal", "secondary", "filler", "greenery"].forEach((r) => {
    const p = purchase[r] || 0;
    checks.push({
      label: `${r[0].toUpperCase() + r.slice(1)} stems (R5, purchase)`,
      value: `${placements[r] || 0} placements ≈ ${p} stems · band ${bands[r][0]}–${bands[r][1]}`,
      status: inBand(p, bands[r]),
    });
  });

  // R10.2: rule-based studio notes (deterministic, never AI-generated)
  const advice = [];
  if (asymScore !== null) {
    if (asymScore < 0.32) advice.push("Weight too evenly spread — push focal/secondary toward the pole or tighten cluster span.");
    if (asymScore > 0.88) advice.push("Strongly lopsided — add an echo accent in the opposed cone across the ring.");
  }
  if (centroid && centroid.magnitude > 0.55 && angDist(centroid.angle, 180) < 45) {
    advice.push("Bottom-heavy — add height or lightness toward 12 (taller spray, wax bridge).");
  }
  if (driftRatio !== null && driftRatio > 0.6) advice.push("Leaning off the diagonal — shift light elements across the axis to re-center the lean.");
  if (tightPairs > 2) advice.push("Crowded bloom band — open spacing or drop one secondary.");
  if (!full && centralFrac < nestPass - 15) advice.push("Blooms bleeding to the arc ends — pull outliers toward the cluster heart.");
  if (texMax > 0.85) advice.push(`Over-busy texture near ${degToClock(hotSample.angle)} o'clock — thin or remove a filler there.`);
  gk.forEach((g) => {
    if (colorCentroids[g].radiusNorm > 0.6) advice.push(`${g[0].toUpperCase() + g.slice(1)} mass strongly off-center — echo a touch opposite or toward center.`);
  });
  if (colorPairs.some((cp) => cp.dist > 0.8)) advice.push("Color groups sit far apart — add small bridging repeats to unify the ring.");
  depthClusters.forEach((c) => {
    if (c.q < 0.45) advice.push(c.mode === "over"
      ? `Cluster at ${degToClock(c.angle)} o'clock over-crowded — move a filler to the back layer or drop a front stem.`
      : `Cluster at ${degToClock(c.angle)} o'clock reads flat — add a back-layer sprig or tuck a filler deeper.`);
  });
  if (hollowCount > 2) advice.push(`Hollow midspace near ${degToClock(hollowAngle)} o'clock — extend mid-layer foliage to bridge back and front.`);
  if (texMax > 0.85 && hotSample.neg < 0.15) advice.push("Focal zone has no breathing room — shift one stem a few degrees to open a micro-gap.");

  return {
    coverage, centralFrac, stackBloom, stackTotal, placements, purchase, checks, D,
    arcStartDeg, arcEndDeg, arcCenterDeg, extLen,
    centroid, asymScore, axisAngle,
    diagAxis, axisBalance, driftRatio, tightPairs, advice,
    texField, texMax, texAvg, texCV, texRuns, hotAngle: hotSample.angle,
    colorCentroids, colorPairs, accentSep, accentGroup,
    depthClusters, depthAvg, depthVar,
    restCentroid: restC, hollowCount, hollowAngle,
  };
}

// ─── R11: composition → prompt tokens (geometry generates language) ─────────
function compositionTokens(v, layout) {
  if (!v) return "";
  const parts = [];
  if (v.centroid) {
    const cl = degToClock(v.centroid.angle);
    const region = cl >= 7 && cl <= 8 ? "lower-left" : cl >= 4 && cl <= 5 ? "lower-right" : cl >= 10 && cl <= 11 ? "upper-left" : cl >= 1 && cl <= 2 ? "upper-right" : cl === 6 ? "bottom" : cl === 12 ? "top" : cl === 9 ? "left" : "right";
    parts.push(`floral mass gathered ${region} around ${cl} o'clock`);
  }
  if (layout.meta?.symmetry !== "full") {
    parts.push(`asymmetric sweep from ${degToClock(v.arcStartDeg)} to ${degToClock(v.arcEndDeg)} o'clock`);
    parts.push(`exposed grapevine arc from ${degToClock(v.arcEndDeg)} to ${degToClock(v.arcStartDeg)} o'clock as intentional negative space`);
  }
  const density = v.stackTotal >= 2.2 ? "lush layered density" : v.stackTotal >= 1.7 ? "balanced handcrafted density" : "airy minimal density";
  parts.push(density);
  if (v.asymScore !== null && v.asymScore !== undefined) {
    parts.push(v.asymScore > 0.6 ? "strong diagonal visual flow" : "gentle off-center composition");
  }
  return parts.join(", ");
}

// ─── Geometry & transforms ───────────────────────────────────────────────────
const toCart = (angle, radius) => {
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: C + radius * Math.cos(rad), y: C + radius * Math.sin(rad) };
};
function placementTransform(slot, pos, pi, adjust, override) {
  let rot;
  if (slot.kind === "fixed") rot = 0;
  else if (slot.kind === "round") rot = ((pi * 37) % 25) - 12;
  else rot = pos.tip !== undefined ? pos.tip : pos.angle;
  const adj = adjust[slot.key] || { rot: 0, flip: false };
  if (slot.kind !== "fixed") rot -= adj.rot;
  if (override) rot += override.dr || 0;
  let flip = !!pos.flip;
  if (adj.flip) flip = !flip;
  if (override?.flip) flip = !flip;
  return { rot, flip };
}

// ─── Image analysis: knockout + weight sampling (R10 inputs) ─────────────────
function analyzeImage(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas");
      cv.width = img.width; cv.height = img.height;
      const ctx = cv.getContext("2d");
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, cv.width, cv.height);
      const d = id.data;
      let satSum = 0, conSum = 0, hx = 0, hy = 0, n = 0;
      const ivoryLum = 0.93;
      const W = cv.width, H = cv.height;
      const lumAt = (idx) => (0.2126 * d[idx] + 0.7152 * d[idx + 1] + 0.0722 * d[idx + 2]) / 255;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const min = Math.min(r, g, b), max = Math.max(r, g, b);
        if (min > 238) { d[i + 3] = 0; continue; }
        if (min > 222) d[i + 3] = Math.round(d[i + 3] * ((238 - min) / 16));
        if (d[i + 3] > 40) {
          const sPx = max > 0 ? (max - min) / max : 0;
          satSum += sPx;
          conSum += Math.abs(lumAt(i) - ivoryLum) / ivoryLum;
          if (max > min) {
            let h;
            if (max === r) h = ((g - b) / (max - min)) % 6;
            else if (max === g) h = (b - r) / (max - min) + 2;
            else h = (r - g) / (max - min) + 4;
            h *= 60; if (h < 0) h += 360;
            const hr = (h * Math.PI) / 180;
            hx += sPx * Math.cos(hr); hy += sPx * Math.sin(hr); // sat-weighted: grey pixels don't vote
          }
          n++;
        }
      }
      // R15: texture complexity — mean local luminance gradient over opaque pixels (stride-sampled)
      let gradSum = 0, gn = 0;
      const xStride = Math.max(1, Math.floor(W / 160)) * 4;
      const yStride = Math.max(1, Math.floor(H / 160));
      for (let y = 0; y < H - 2; y += yStride) {
        for (let x = 0; x < (W - 2) * 4; x += xStride) {
          const idx = y * W * 4 + x;
          if (d[idx + 3] < 40) continue;
          const right = idx + 4, down = idx + W * 4;
          if (d[right + 3] < 40 || d[down + 3] < 40) continue;
          const l0 = lumAt(idx);
          gradSum += Math.abs(l0 - lumAt(right)) + Math.abs(l0 - lumAt(down));
          gn++;
        }
      }
      let hue = null;
      if (hx !== 0 || hy !== 0) {
        hue = (Math.atan2(hy, hx) * 180) / Math.PI;
        if (hue < 0) hue += 360;
      }
      // bloom geometry: widest opaque band ≈ bloom diameter; its center = render anchor
      let topRow = -1, botRow = -1, wMaxPx = 0;
      const rowsWide = [];
      const xScan = Math.max(1, Math.floor(W / 200));
      for (let y = 0; y < H; y += yStride) {
        let minX = -1, maxX = -1;
        for (let x = 0; x < W; x += xScan) {
          const idx = (y * W + x) * 4;
          if (d[idx + 3] > 40) { if (minX < 0) minX = x; maxX = x; }
        }
        if (minX < 0) continue;
        if (topRow < 0) topRow = y;
        botRow = y;
        const wRow = maxX - minX;
        if (wRow > wMaxPx) wMaxPx = wRow;
        rowsWide.push({ y, w: wRow });
      }
      let bloomFrac = 1, bloomCy = 0.5;
      const hC = botRow - topRow;
      if (hC > 0 && wMaxPx > 0) {
        // bloom lives near the tip (top, by convention) — ignore foliage flare below
        const topZone = rowsWide.filter((rw) => rw.y <= topRow + hC * 0.65);
        const wTop = Math.max(...topZone.map((rw) => rw.w), 1);
        wMaxPx = wTop;
        const band = topZone.filter((rw) => rw.w >= wMaxPx * 0.82);
        const bandCy = band.reduce((a, rw) => a + rw.y, 0) / band.length;
        bloomFrac = clamp(wMaxPx / Math.max(hC, wMaxPx), 0.25, 1);
        bloomCy = clamp((bandCy - topRow) / hC, 0.05, 0.95);
      }
      ctx.putImageData(id, 0, 0);
      resolve({
        cut: cv.toDataURL("image/png"),
        sat: n ? clamp(satSum / n, 0, 1) : 0.2,
        con: n ? clamp(conSum / n, 0, 1) : 0.3,
        cx: gn ? clamp((gradSum / gn) * 4, 0, 1) : 0.4,
        hue,
        bloomFrac, bloomCy,
      });
    };
    img.onerror = () => resolve({ cut: dataUrl, sat: 0.2, con: 0.3, cx: 0.4, hue: null, bloomFrac: 1, bloomCy: 0.5 });
    img.src = dataUrl;
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function MiniPreview({ layout }) {
  const S = 0.2;
  return (
    <svg width={110} height={110} viewBox="0 0 110 110">
      <circle cx={55} cy={55} r={48} fill="none" stroke="#d8cfc0" strokeWidth="6" opacity="0.5" />
      {layout.layers.map((l, li) => {
        const s = SLOT_MAP[l.component];
        if (!s || s.role === "base") return null;
        return l.positions.map((p, pi) => {
          const { x, y } = toCart(p.angle, p.radius);
          return <circle key={`${li}-${pi}`} cx={55 + (x - 260) * S} cy={55 + (y - 260) * S} r={clamp(p.size * S * 0.32, 1.5, 7)} fill={s.tint} opacity="0.9" />;
        });
      })}
    </svg>
  );
}

function SlotCard({ slot, image, adjust, onUpload, onClear, onAdjust }) {
  const inputRef = useRef(null);
  const a = adjust || { rot: 0, flip: false };
  return (
    <div style={styles.slotCard}>
      <div style={{ ...styles.slotThumb, borderColor: image ? slot.tint : "#d8cfc0" }}
        onClick={() => inputRef.current?.click()} title={image ? "Replace image" : "Upload image"}>
        {image ? (
          <img src={image} alt={slot.label} style={{ ...styles.slotImg, transform: `rotate(${-a.rot}deg) scaleX(${a.flip ? -1 : 1})` }} />
        ) : (
          <span style={{ ...styles.slotGhostDot, background: slot.tint }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={styles.slotLabel}>{slot.label}</div>
        <div style={styles.slotActions}>
          <button style={styles.linkBtn} onClick={() => inputRef.current?.click()}>{image ? "replace" : "upload"}</button>
          {image && (
            <>
              {slot.kind === "directional" && (
                <button style={styles.linkBtn} title="Rotate source 90° — stem tip should point UP in thumbnail"
                  onClick={() => onAdjust({ ...a, rot: (a.rot + 90) % 360 })}>
                  ⟳{a.rot ? ` ${a.rot}°` : ""}
                </button>
              )}
              <button style={{ ...styles.linkBtn, opacity: a.flip ? 1 : 0.65 }} onClick={() => onAdjust({ ...a, flip: !a.flip })}>mirror</button>
              <button style={{ ...styles.linkBtn, color: "#9a5f4a" }} onClick={onClear}>clear</button>
            </>
          )}
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => onUpload(e.target.files?.[0])} />
    </div>
  );
}

const STATUS_DOT = { pass: "#7c9a5e", warn: "#b08d57", flag: "#9a5f4a", info: "#8b94a8" };

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [images, setImages] = useState({});
  const [slotAttrs, setSlotAttrs] = useState({}); // key → { sat, con } sampled
  const [adjust, setAdjust] = useState({});
  const [overrides, setOverrides] = useState({});
  const [selected, setSelected] = useState(null);
  const [layoutKey, setLayoutKey] = useState("crescent");
  const [genLayout, setGenLayout] = useState(null);
  const [gen, setGen] = useState({ D: 24, style: "lush", drama: "med", seed: 42, anchor: "7:30 classic", asym: 0.6, clusterShift: 0, clusterSpanF: 0.5, formula: "crescent" });
  const [explore, setExplore] = useState(null);
  const [currentLayer, setCurrentLayer] = useState(-1);
  const [showAll, setShowAll] = useState(true);
  const [animating, setAnimating] = useState(false);
  const [knockout, setKnockout] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [showHeat, setShowHeat] = useState(false);
  const [status, setStatus] = useState("");

  const layout = layoutKey === "generated" && genLayout ? genLayout : LAYOUTS[layoutKey] || LAYOUTS.crescent;
  const validation = useMemo(() => computeValidation(layout, slotAttrs), [layout, slotAttrs]);
  const layerVisible = (i) => showAll || i <= currentLayer;
  const imgFor = (key) => {
    const e = images[key];
    if (!e) return null;
    return knockout && e.cut ? e.cut : e.raw;
  };

  const handleUpload = (key) => async (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const raw = e.target.result;
      const { cut, sat, con, cx, hue, bloomFrac, bloomCy } = await analyzeImage(raw);
      setImages((prev) => ({ ...prev, [key]: { raw, cut } }));
      setSlotAttrs((prev) => ({ ...prev, [key]: { sat, con, cx, hue, bloomFrac, bloomCy } })); // weight + texture + color + bloom geometry
    };
    reader.readAsDataURL(file);
  };

  const buildByLayers = () => {
    setAnimating(true); setShowAll(false); setCurrentLayer(-1); setSelected(null);
    let i = -1;
    const tick = setInterval(() => {
      i += 1; setCurrentLayer(i);
      if (i >= layout.layers.length - 1) { clearInterval(tick); setAnimating(false); }
    }, 1100);
  };
  const reset = () => { setShowAll(false); setCurrentLayer(-1); setAnimating(false); setSelected(null); };
  const revealAll = () => { setShowAll(true); setCurrentLayer(layout.layers.length - 1); setAnimating(false); };
  const switchLayout = (k) => { setLayoutKey(k); setOverrides({}); setSelected(null); revealAll(); };
  const runGenerator = () => { setGenLayout(generateLayout(gen)); switchLayout("generated"); };
  // R12e: live regeneration — dragging cluster sliders re-places the design in real time
  const updateGen = (patch) => {
    const next = { ...gen, ...patch };
    setGen(next);
    if (layoutKey === "generated") setGenLayout(generateLayout(next));
  };

  // R14: Pareto explorer — sample 120 seeded genomes, evaluate, non-dominated sort
  const runExplore = () => {
    const meta = mulberry32(gen.seed * 31 + 7);
    const candidates = [];
    for (let k = 0; k < 120; k++) {
      const genome = {
        ...gen,
        seed: Math.floor(meta() * 99991),
        clusterShift: Math.round((meta() * 2 - 1) * 30),
        clusterSpanF: +(0.35 + meta() * 0.35).toFixed(2),
        asym: clamp(+(gen.asym + (meta() * 2 - 1) * 0.15).toFixed(2), 0.3, 0.9),
      };
      const layout = generateLayout(genome);
      const v = computeValidation(layout, slotAttrs);
      if (!v) continue;
      const stackMid = (TOTAL_STACK_BANDS[gen.style][0] + TOTAL_STACK_BANDS[gen.style][1]) / 2;
      candidates.push({
        genome, layout, v,
        obj: [
          v.tightPairs,                                        // spacing quality
          Math.abs((v.asymScore ?? 0) - genome.asym),          // asym fit
          Math.abs(v.centralFrac - 65) / 100,                  // nesting deviation
          Math.abs(v.stackTotal - stackMid),                   // stacking deviation
          Math.min(v.driftRatio ?? 9, 2),                      // lateral drift (R13)
          v.texCV ?? 1,                                        // texture evenness (R15)
          (1 - (v.depthAvg ?? 0)) + (v.depthVar ?? 0),         // depth deficit (R17, combined)
        ],
      });
    }
    const dominates = (a, b) => a.obj.every((x, i) => x <= b.obj[i]) && a.obj.some((x, i) => x < b.obj[i]);
    let front = candidates.filter((c) => !candidates.some((o) => o !== c && dominates(o, c)));
    front.sort((a, b) => a.obj.reduce((s, x) => s + x, 0) - b.obj.reduce((s, x) => s + x, 0));
    if (front.length > 12) front = front.slice(0, 12);
    setExplore(front);
    setStatus(`Pareto front: ${front.length} non-dominated of 120 candidates.`);
    setTimeout(() => setStatus(""), 4000);
  };
  const loadCandidate = (c) => {
    setGen(c.genome);
    setGenLayout(c.layout);
    switchLayout("generated");
  };

  const selOverride = selected ? overrides[selected.id] || { dr: 0, flip: false } : null;
  const setSelOverride = (patch) =>
    setOverrides((prev) => ({ ...prev, [selected.id]: { ...(prev[selected.id] || { dr: 0, flip: false }), ...patch } }));

  // ── PNG export ──
  const exportPNG = async () => {
    setStatus("Rendering export…");
    try {
      const cv = document.createElement("canvas");
      cv.width = 1600; cv.height = 1700;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#f7f4ed"; ctx.fillRect(0, 0, 1600, 1700);
      ctx.fillStyle = "#2e3a2f"; ctx.font = "600 54px Georgia, serif"; ctx.textAlign = "center";
      ctx.fillText("Evercrafted Studio", 800, 96);
      ctx.fillStyle = "#7c6a54"; ctx.font = "30px Georgia, serif";
      ctx.fillText(`${layout.name}  ·  ${layout.formula} formula  ·  ${layout.meta?.size || 24}"`, 800, 142);

      const scale = 1600 / 520, offY = 170;
      const loaded = {};
      await Promise.all(Object.keys(images).map((key) => new Promise((res) => {
        const im = new Image();
        im.onload = () => { loaded[key] = im; res(); };
        im.onerror = () => res();
        im.src = imgFor(key);
      })));

      const flat = [];
      layout.layers.forEach((layer, li) => {
        if (!layerVisible(li)) return;
        const slot = SLOT_MAP[layer.component];
        layer.positions.forEach((pos, pi) => {
          const t = placementTransform(slot, pos, pi, adjust, overrides[`${li}-${pi}`]);
          flat.push({ key: layer.component, pos, ...t, z: slot.z });
        });
      });
      flat.sort((a, b) => a.z - b.z);
      flat.forEach(({ key, pos, rot, flip }) => {
        const im = loaded[key];
        if (!im) return;
        const slot = SLOT_MAP[key];
        const at = slotAttrs[key] || {};
        const isBloom = slot.role === "focal" || slot.role === "secondary" || slot.role === "filler";
        const bf = isBloom ? clamp(at.bloomFrac ?? slot.bf, 0.3, 1) : 1;
        const bcy = isBloom && slot.kind === "directional" ? clamp(at.bloomCy ?? slot.bcy, 0.12, 0.6) : 0.5;
        const maxScale = slot.role === "filler" ? 1.6 : slot.kind === "round" ? 2 : 3;
        const { x, y } = toCart(pos.angle, pos.radius);
        ctx.save();
        ctx.translate(x * scale, y * scale + offY);
        ctx.rotate((rot * Math.PI) / 180);
        if (flip) ctx.scale(-1, 1);
        const s = Math.min((pos.size * scale) / bf, pos.size * scale * maxScale);
        ctx.drawImage(im, -s / 2, -s / 2 + (0.5 - bcy) * s, s, s);
        ctx.restore();
      });

      if (validation) {
        ctx.fillStyle = "#9c8a72"; ctx.font = "italic 24px Georgia, serif";
        const asymTxt = validation.asymScore != null ? ` · asym ${validation.asymScore.toFixed(2)}` : "";
        ctx.fillText(`coverage ${validation.coverage.toFixed(0)}% · nesting ${validation.centralFrac.toFixed(0)}% · stack ${validation.stackTotal.toFixed(1)}×${asymTxt}`, 800, 1668);
      }
      const a = document.createElement("a");
      a.download = `evercrafted-${layoutKey}-layout.png`;
      a.href = cv.toDataURL("image/png", 1.0);
      a.click();
      setStatus("Export downloaded.");
    } catch (err) { setStatus("Export failed — check console."); console.error(err); }
    setTimeout(() => setStatus(""), 3000);
  };

  // ── Blueprint JSON export ──
  const exportBlueprint = () => {
    const D = layout.meta?.size || 24;
    const bp = {
      blueprint_id: `EC_WR_V2_${layoutKey}_${layout.meta?.seed ?? "static"}`,
      formula: layout.formula,
      canvas: { type: "polar", diameter_in: D, px_per_in: +(480 / D).toFixed(2), tip_convention: "compass deg, 0=12 o'clock, cw" },
      coverage_class: layout.meta?.declared,
      symmetry: layout.meta?.symmetry,
      generator: layout.meta?.generated ? {
        seed: layout.meta.seed, drama: layout.meta.drama, anchor: layout.meta.anchor,
        coverage_target_pct: layout.meta.coverageTarget, bundles: layout.meta.bundles,
        weight_pole_deg: +layout.meta.pole.toFixed(1), asym_target: layout.meta.asymTarget,
        adjustment_iterations: layout.meta.adjustIterations,
        clusters: layout.meta.clusters,
      } : undefined,
      asymmetry: validation && validation.centroid ? {
        centroid_angle_deg: +validation.centroid.angle.toFixed(1),
        centroid_magnitude: +validation.centroid.magnitude.toFixed(3),
        centroid_radius_norm: validation.centroid.radiusNorm != null ? +validation.centroid.radiusNorm.toFixed(3) : null,
        asymmetry_score: validation.asymScore != null ? +validation.asymScore.toFixed(3) : null,
        balance_axis_deg: validation.axisAngle != null ? +validation.axisAngle.toFixed(1) : null,
      } : undefined,
      render_tokens: compositionTokens(validation, layout),
      texture_color: validation ? {
        texture_peak: +validation.texMax.toFixed(3),
        texture_evenness_cv: +validation.texCV.toFixed(3),
        texture_runs: validation.texRuns,
        color_centroids: Object.fromEntries(Object.entries(validation.colorCentroids).filter(([, c]) => c).map(([g, c]) => [g, { angle_deg: +c.angle.toFixed(1), offset_norm: +c.radiusNorm.toFixed(3) }])),
        accent_separation_deg: validation.accentSep != null ? +validation.accentSep.toFixed(1) : null,
      } : undefined,
      negative_space: validation && validation.restCentroid ? {
        rest_angle_deg: +validation.restCentroid.angle.toFixed(1),
        rest_magnitude: +validation.restCentroid.mag.toFixed(3),
        hollow_slices: validation.hollowCount,
      } : undefined,
      depth: validation && validation.depthClusters && validation.depthClusters.length ? {
        avg_quality: +validation.depthAvg.toFixed(3),
        variance: +validation.depthVar.toFixed(3),
        clusters: validation.depthClusters.map((c) => ({ angle_deg: +c.angle.toFixed(1), q: +c.q.toFixed(2), mode: c.mode })),
      } : undefined,
      stem_accounting: validation ? { placements: validation.placements, purchase_stems: validation.purchase } : undefined,
      validation: validation ? validation.checks.map((c) => ({ check: c.label, result: c.value, status: c.status })) : undefined,
      layers: layout.layers.map((l, li) => ({
        layer: l.name,
        component: SLOT_MAP[l.component].label,
        role: SLOT_MAP[l.component].role,
        z_index: SLOT_MAP[l.component].z,
        footprint_in: SLOT_MAP[l.component].fp,
        yield_factor: SLOT_MAP[l.component].yield,
        placements: l.positions.map((p, pi) => {
          const o = overrides[`${li}-${pi}`];
          return {
            angle_deg: +((p.angle % 360 + 360) % 360).toFixed(1),
            radius_norm: +(p.radius / 240).toFixed(3),
            size_px: Math.round(p.size),
            tip_deg: p.tip !== undefined ? +(((p.tip % 360) + 360) % 360).toFixed(1) : null,
            mirrored: !!p.flip !== !!o?.flip ? true : undefined,
            nudge_deg: o?.dr || undefined,
          };
        }),
      })),
    };
    const a = document.createElement("a");
    a.download = `evercrafted-${layoutKey}-blueprint.json`;
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(bp, null, 2));
    a.click();
  };

  // ── Texture heatmap overlay (R15) ──
  const renderHeat = () => {
    if (!showHeat || !validation?.texField) return null;
    const segs = validation.texField;
    return (
      <svg width="520" height="520" style={{ position: "absolute", left: 0, top: 0, zIndex: 2, pointerEvents: "none" }}>
        {segs.map((sp, i) => {
          if (i % 2 || sp.density < 0.04) return null;
          const nxt = segs[(i + 2) % segs.length];
          const p1 = toCart(sp.angle, 228);
          const p2 = toCart(nxt.angle, 228);
          return (
            <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
              stroke={sp.density > 0.85 ? "#9a5f4a" : "#b08d57"}
              strokeWidth="9" strokeLinecap="round" opacity={Math.min(0.85, sp.density * 0.85)} />
          );
        })}
        {segs.map((sp, i) => {
          if (i % 2 || sp.neg == null || sp.neg < 0.4) return null;
          const nxt = segs[(i + 2) % segs.length];
          const p1 = toCart(sp.angle, 246);
          const p2 = toCart(nxt.angle, 246);
          return <line key={`n${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#aebdb6" strokeWidth="6" strokeLinecap="round" opacity={sp.neg * 0.55} />;
        })}
      </svg>
    );
  };

  // ── Guide overlay (R10.1) ──
  const renderGuides = () => {
    if (!showGuides || !validation || !validation.centroid) return null;
    const v = validation;
    const arcR = 246;
    const s = toCart(v.arcStartDeg, arcR);
    const e = toCart(v.arcEndDeg, arcR);
    const large = v.extLen > 180 ? 1 : 0;
    const cenPt = toCart(v.centroid.angle, clamp(v.centroid.radiusNorm ?? v.centroid.magnitude, 0, 1) * 240);
    const axA = toCart(v.axisAngle, 244);
    const axB = toCart((v.axisAngle + 180) % 360, 244);
    const pole = layout.meta?.pole != null ? toCart(layout.meta.pole, 258) : null;
    return (
      <svg width="520" height="520" style={{ position: "absolute", left: 0, top: 0, zIndex: 3, pointerEvents: "none", overflow: "visible" }}>
        {layout.meta?.symmetry !== "full" && (
          <path d={`M ${s.x} ${s.y} A ${arcR} ${arcR} 0 ${large} 1 ${e.x} ${e.y}`}
            fill="none" stroke="#b08d57" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
        )}
        <line x1={axA.x} y1={axA.y} x2={axB.x} y2={axB.y} stroke="#8b94a8" strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
        {v.diagAxis != null && (() => {
          const dA = toCart(v.diagAxis, 240);
          const dB = toCart((v.diagAxis + 180) % 360, 240);
          return <line x1={dA.x} y1={dA.y} x2={dB.x} y2={dB.y} stroke="#7c9a5e" strokeWidth="1" strokeDasharray="2 7" opacity="0.5" />;
        })()}
        <circle cx={cenPt.x} cy={cenPt.y} r="6" fill="#b08d57" opacity="0.85" />
        <circle cx={cenPt.x} cy={cenPt.y} r="11" fill="none" stroke="#b08d57" strokeWidth="1" opacity="0.5" />
        {Object.entries(v.colorCentroids || {}).map(([g, c]) => {
          if (!c) return null;
          const pt = toCart(c.angle, clamp(c.radiusNorm, 0, 1) * 240);
          return (
            <g key={g}>
              <line x1={260} y1={260} x2={pt.x} y2={pt.y} stroke={GROUP_COLORS[g]} strokeWidth="1" opacity="0.45" />
              <circle cx={pt.x} cy={pt.y} r="4.5" fill={GROUP_COLORS[g]} opacity="0.9" />
            </g>
          );
        })}
        {(v.depthClusters || []).map((c, i) => {
          const pt = toCart(c.angle, 214);
          return <circle key={`dq${i}`} cx={pt.x} cy={pt.y} r="4" fill={c.q >= 0.6 ? "#7c9a5e" : c.q >= 0.45 ? "#b08d57" : "#9a5f4a"} opacity="0.9" />;
        })}
        {pole && <path d={`M ${pole.x} ${pole.y - 7} L ${pole.x + 6} ${pole.y + 4} L ${pole.x - 6} ${pole.y + 4} Z`} fill="#7c9a5e" opacity="0.8" />}
      </svg>
    );
  };

  // ── Render ──
  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.h1}>Evercrafted Studio</h1>
          <div style={styles.sub}>Wreath Layout Visualizer · {layout.meta?.size || 24}" ring · placement + asymmetry intelligence</div>
        </div>
        <div style={styles.formulaBadge}>{layout.formula}</div>
      </header>

      <div style={styles.body}>
        {/* ── Sidebar ── */}
        <aside style={styles.sidebar}>
          <div style={styles.panelTitle}>Layout</div>
          <select style={styles.select} value={layoutKey} onChange={(e) => switchLayout(e.target.value)}>
            {Object.entries(LAYOUTS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            {genLayout && <option value="generated">{genLayout.name}</option>}
          </select>
          <p style={styles.desc}>{layout.description}</p>

          <div style={styles.genPanel}>
            <div style={{ ...styles.panelTitle, marginBottom: 8 }}>Generate (R9)</div>
            <div style={styles.genRow}>
              <label style={styles.genLabel}>size
                <select style={styles.genSelect} value={gen.D} onChange={(e) => setGen({ ...gen, D: +e.target.value })}>
                  {[16, 22, 24, 26].map((d) => <option key={d} value={d}>{d}"</option>)}
                </select>
              </label>
              <label style={styles.genLabel}>style
                <select style={styles.genSelect} value={gen.style} onChange={(e) => setGen({ ...gen, style: e.target.value })}>
                  <option value="minimal">ring-forward</option>
                  <option value="classic">classic asym</option>
                  <option value="lush">garden-lush</option>
                </select>
              </label>
            </div>
            <div style={styles.genRow}>
              <label style={styles.genLabel}>formula (R9.5)
                <select style={styles.genSelect} value={gen.formula} onChange={(e) => updateGen({ formula: e.target.value })}>
                  <option value="crescent">crescent</option>
                  <option value="twin">twin cluster</option>
                </select>
              </label>
              <label style={styles.genLabel}>anchor (R9.1)
                <select style={styles.genSelect} value={gen.anchor} onChange={(e) => setGen({ ...gen, anchor: e.target.value })}>
                  {Object.keys(ARC_ANCHORS).map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
              </label>
            </div>
            <label style={{ ...styles.genLabel, marginBottom: 8 }}>
              asymmetry · {gen.asym.toFixed(2)} (R9.4)
              <input type="range" min={0.3} max={0.9} step={0.05} value={gen.asym}
                onChange={(e) => updateGen({ asym: +e.target.value })} />
            </label>
            <label style={{ ...styles.genLabel, marginBottom: 8 }}>
              cluster shift · {gen.clusterShift > 0 ? "+" : ""}{gen.clusterShift}° (R12e — drag the cluster)
              <input type="range" min={-40} max={40} step={2} value={gen.clusterShift}
                onChange={(e) => updateGen({ clusterShift: +e.target.value })} />
            </label>
            <label style={{ ...styles.genLabel, marginBottom: 8 }}>
              cluster span · {(gen.clusterSpanF * 100).toFixed(0)}% of arc
              <input type="range" min={0.3} max={0.75} step={0.05} value={gen.clusterSpanF}
                onChange={(e) => updateGen({ clusterSpanF: +e.target.value })} />
            </label>
            <div style={styles.genRow}>
              <label style={styles.genLabel}>drama
                <select style={styles.genSelect} value={gen.drama} onChange={(e) => setGen({ ...gen, drama: e.target.value })}>
                  <option value="low">low</option><option value="med">med</option><option value="high">high</option>
                </select>
              </label>
              <label style={styles.genLabel}>seed
                <input style={{ ...styles.genSelect, width: "100%" }} type="number" value={gen.seed}
                  onChange={(e) => setGen({ ...gen, seed: +e.target.value || 0 })} />
              </label>
              <button style={{ ...styles.btn, alignSelf: "flex-end" }} onClick={() => setGen((g) => ({ ...g, seed: Math.floor(Math.random() * 9999) }))}>🎲</button>
            </div>
            <button style={{ ...styles.btnCopper, width: "100%" }} onClick={runGenerator}>Generate Layout</button>
            <button style={{ ...styles.btn, width: "100%", marginTop: 8 }} onClick={runExplore}>Explore 120 · Pareto Front (R14)</button>
          </div>

          <div style={styles.btnRow}>
            <button style={styles.btnPrimary} onClick={buildByLayers} disabled={animating}>
              {animating ? "Building…" : "Build by Layers"}
            </button>
            <button style={styles.btn} onClick={revealAll}>Show All</button>
            <button style={styles.btn} onClick={reset}>Reset</button>
          </div>
          <div style={styles.btnRow}>
            <button style={styles.btnCopper} onClick={exportPNG}>Export PNG</button>
            <button style={styles.btn} onClick={exportBlueprint}>Blueprint JSON</button>
          </div>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={knockout} onChange={(e) => setKnockout(e.target.checked)} />
            <span>Auto-remove white backgrounds</span>
          </label>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={showGuides} onChange={(e) => setShowGuides(e.target.checked)} />
            <span>Balance guides (arc · centroid · axis · color dots)</span>
          </label>
          <label style={styles.toggleRow}>
            <input type="checkbox" checked={showHeat} onChange={(e) => setShowHeat(e.target.checked)} />
            <span>Texture heat + breath ring (R15/R18)</span>
          </label>
          {status && <div style={styles.status}>{status}</div>}

          {selected && (
            <div style={styles.tunePanel}>
              <div style={{ ...styles.panelTitle, marginBottom: 6 }}>Fine-Tune · {selected.label}</div>
              <label style={styles.tuneLabel}>
                rotation nudge <strong>{selOverride.dr}°</strong>
                <input type="range" min={-180} max={180} step={5} value={selOverride.dr}
                  onChange={(e) => setSelOverride({ dr: +e.target.value })} style={{ width: "100%" }} />
              </label>
              <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
                <button style={styles.btnSmall} onClick={() => setSelOverride({ flip: !selOverride.flip })}>
                  {selOverride.flip ? "un-mirror" : "mirror"}
                </button>
                <button style={styles.btnSmall} onClick={() => setSelOverride({ dr: 0, flip: false })}>reset</button>
                <button style={styles.btnSmall} onClick={() => setSelected(null)}>done</button>
              </div>
            </div>
          )}

          <div style={{ ...styles.panelTitle, marginTop: 22 }}>Build Order</div>
          <div style={styles.layerList}>
            {layout.layers.map((l, i) => (
              <div key={i} style={{
                ...styles.layerRow,
                opacity: layerVisible(i) ? 1 : 0.38,
                borderLeftColor: layerVisible(i) ? SLOT_MAP[l.component].tint : "#d8cfc0",
                background: i === currentLayer && !showAll ? "#efe9db" : "transparent",
              }}>
                <span style={styles.layerNum}>{String(i + 1).padStart(2, "0")}</span>
                <span style={styles.layerName}>{l.name}</span>
                <span style={styles.layerCount}>×{l.positions.length}</span>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Canvas + validation ── */}
        <main style={styles.stage}>
          <div style={styles.canvasWrap}>
            <div style={styles.ringOuter} />
            <div style={styles.ringInner} />
            <div style={styles.ringWork} />
            {["12", "3", "6", "9"].map((t, i) => {
              const p = toCart(i * 90, 264);
              return <span key={t} style={{ ...styles.clockLabel, left: p.x, top: p.y }}>{t}</span>;
            })}
            {renderHeat()}
            {renderGuides()}

            {layout.layers.flatMap((layer, li) => {
              if (!layerVisible(li)) return [];
              const slot = SLOT_MAP[layer.component];
              return layer.positions.map((pos, pi) => ({ layer, li, slot, pos, pi }));
            }).sort((a, b) => a.slot.z - b.slot.z).map(({ layer, li, slot, pos, pi }) => {
              const src = imgFor(layer.component);
              {
                const id = `${li}-${pi}`;
                const { x, y } = toCart(pos.angle, pos.radius);
                const { rot, flip } = placementTransform(slot, pos, pi, adjust, overrides[id]);
                // bloom-true scaling: image is bloom + stem, so scale up until the
                // BLOOM matches pos.size. Stem-axis slide applies ONLY to directional
                // blooms (round blooms have no tip convention — sliding them along
                // jitter displaced heads off their anchors). Fillers cap at 1.6×
                // (small picks; a foliage-heavy photo must not balloon over blooms).
                const at = slotAttrs[slot.key] || {};
                const isBloom = slot.role === "focal" || slot.role === "secondary" || slot.role === "filler";
                const bf = isBloom ? clamp(at.bloomFrac ?? slot.bf, 0.3, 1) : 1;
                const bcy = isBloom && slot.kind === "directional" ? clamp(at.bloomCy ?? slot.bcy, 0.12, 0.6) : 0.5;
                const maxScale = slot.role === "filler" ? 1.6 : slot.kind === "round" ? 2 : 3;
                const disp = Math.min(pos.size / bf, pos.size * maxScale);
                const isSel = selected?.id === id;
                const common = {
                  position: "absolute",
                  left: x - disp / 2, top: y - disp / 2,
                  width: disp, height: disp,
                  zIndex: isSel ? 40 : slot.z,
                  transition: "opacity 600ms ease",
                };
                return src ? (
                  <img key={id} src={src} alt="" onClick={() => setSelected({ id, label: slot.label })}
                    style={{
                      ...common, objectFit: "contain", cursor: "pointer",
                      transform: `rotate(${rot}deg) scaleX(${flip ? -1 : 1}) translateY(${((0.5 - bcy) * 100).toFixed(1)}%)`,
                      outline: isSel ? "2px dashed #b08d57" : "none", outlineOffset: 4,
                      borderRadius: isSel ? "50%" : 0,
                    }} />
                ) : (
                  <div key={id} style={{
                    ...common,
                    left: x - pos.size / 2, top: y - pos.size / 2,
                    width: pos.size, height: pos.size,
                    borderRadius: "50%",
                    border: `1.5px dashed ${slot.tint}`, background: slot.tint + "22",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: Math.max(9, pos.size / 8), color: "#6b5f4d",
                    fontFamily: "Georgia, serif", textAlign: "center",
                  }} title={slot.label}>
                    {pos.size > 56 ? slot.label.split(" ")[0] : ""}
                  </div>
                );
              }
            })}
          </div>

          {validation && (
            <div style={styles.valPanel}>
              <div style={styles.valHeader}>
                <span style={styles.panelTitle}>Placement Validation</span>
                <span style={styles.valMeter}>
                  coverage <strong>{validation.coverage.toFixed(0)}%</strong> · nesting <strong>{validation.centralFrac.toFixed(0)}%</strong> · stack <strong>{validation.stackTotal.toFixed(1)}×</strong>
                  {validation.asymScore != null && <> · asym <strong>{validation.asymScore.toFixed(2)}</strong></>}
                </span>
              </div>
              {validation.checks.map((c, i) => (
                <div key={i} style={styles.valRow}>
                  <span style={{ ...styles.valDot, background: STATUS_DOT[c.status] }} />
                  <span style={styles.valLabel}>{c.label}</span>
                  <span style={styles.valValue}>{c.value}</span>
                </div>
              ))}
              {validation.advice && validation.advice.length > 0 && (
                <div style={styles.adviceBox}>
                  {validation.advice.map((a, i) => <div key={i} style={styles.adviceLine}>✦ {a}</div>)}
                </div>
              )}
              <div style={styles.valNote}>
                The dashed line is the balance axis — where the design would pivot if it were a mobile;
                the copper dot is the weight centroid, the copper arc is the design arc, the faint green
                dashed line is the dominant diagonal (R13), the green marker is the weight pole,
                and the small inner-ring dots grade per-cluster depth (green rich · copper thin · rust flat/over). Soft validators — warnings flag deviation, not failure.
              </div>
              <div style={styles.tokenLine}>render tokens: {compositionTokens(validation, layout)}</div>
            </div>
          )}

          {explore && (
            <div style={styles.galleryPanel}>
              <div style={styles.valHeader}>
                <span style={styles.panelTitle}>Pareto Explorer (R14)</span>
                <button style={styles.btnSmall} onClick={() => setExplore(null)}>close</button>
              </div>
              <div style={styles.galleryGrid}>
                {explore.map((c, i) => (
                  <div key={i} style={styles.galleryCard} onClick={() => loadCandidate(c)} title="Load this layout">
                    <MiniPreview layout={c.layout} />
                    <div style={styles.galleryMeta}>
                      seed {c.genome.seed}<br />
                      asym {c.v.asymScore != null ? c.v.asymScore.toFixed(2) : "—"} · drift {(Math.min(c.v.driftRatio ?? 0, 2) * 100).toFixed(0)}%<br />
                      nest {c.v.centralFrac.toFixed(0)}% · {c.v.tightPairs === 0 ? "clean" : `${c.v.tightPairs} tight`}
                    </div>
                  </div>
                ))}
              </div>
              <div style={styles.valNote}>
                Non-dominated trade-offs from 120 candidates — each card is unbeaten on at least one
                objective (spacing, asym fit, nesting, stacking, drift). Click to load with live sliders.
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── Upload slots ── */}
      <section style={styles.slotSection}>
        <div style={styles.panelTitle}>Floral Component Library</div>
        <div style={styles.slotGrid}>
          {SLOTS.map((s) => (
            <SlotCard key={s.key} slot={s} image={imgFor(s.key)} adjust={adjust[s.key]}
              onUpload={handleUpload(s.key)}
              onAdjust={(a) => setAdjust((prev) => ({ ...prev, [s.key]: a }))}
              onClear={() => setImages((prev) => { const n = { ...prev }; delete n[s.key]; return n; })} />
          ))}
        </div>
        <div style={styles.footerNote}>
          Orient each upload tip-up in its thumbnail (⟳ / mirror). Uploaded photos are sampled for
          saturation and contrast, so the weight centroid reflects your actual materials — navy berries
          pull harder than cream tulips. Click any placed element to fine-tune. Seeds are repeatable.
        </div>
      </section>
    </div>
  );
}

// ─── Styles (Evercrafted brand: aged ivory · forest · copper · slate) ────────
const serif = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
const styles = {
  app: { fontFamily: serif, background: "#f7f4ed", color: "#2e3a2f", minHeight: "100vh", padding: "28px 32px 48px" },
  header: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", borderBottom: "1px solid #d8cfc0", paddingBottom: 16, marginBottom: 24 },
  h1: { fontSize: 34, fontWeight: 600, margin: 0, letterSpacing: "0.5px" },
  sub: { fontSize: 14, color: "#7c6a54", marginTop: 4, fontStyle: "italic" },
  formulaBadge: { border: "1px solid #b08d57", color: "#b08d57", padding: "6px 16px", borderRadius: 999, fontSize: 13, letterSpacing: "2px", textTransform: "uppercase" },
  body: { display: "flex", gap: 28, alignItems: "flex-start", flexWrap: "wrap" },

  sidebar: { width: 320, background: "#fdfbf6", border: "1px solid #e4dccb", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(60,50,30,0.06)" },
  panelTitle: { fontSize: 12, letterSpacing: "2.5px", textTransform: "uppercase", color: "#9c8a72", marginBottom: 10 },
  select: { width: "100%", fontFamily: serif, fontSize: 15, padding: "9px 10px", border: "1px solid #d8cfc0", borderRadius: 8, background: "#fff", color: "#2e3a2f" },
  desc: { fontSize: 13.5, color: "#6b5f4d", lineHeight: 1.5, margin: "10px 0 14px" },

  genPanel: { border: "1px solid #e0d5be", borderRadius: 10, background: "#faf6ec", padding: 12, marginBottom: 14 },
  genRow: { display: "flex", gap: 10, marginBottom: 8 },
  genLabel: { fontSize: 12.5, color: "#6b5f4d", display: "flex", flexDirection: "column", gap: 3, flex: 1 },
  genSelect: { fontFamily: serif, fontSize: 13.5, padding: "5px 6px", border: "1px solid #d8cfc0", borderRadius: 6, background: "#fff", color: "#2e3a2f" },

  btnRow: { display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" },
  btnPrimary: { flex: 1, fontFamily: serif, fontSize: 14, padding: "9px 12px", background: "#2e3a2f", color: "#f3efe4", border: "none", borderRadius: 8, cursor: "pointer" },
  btnCopper: { flex: 1, fontFamily: serif, fontSize: 14, padding: "9px 12px", background: "#b08d57", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" },
  btn: { fontFamily: serif, fontSize: 14, padding: "9px 12px", background: "transparent", color: "#2e3a2f", border: "1px solid #c9bda6", borderRadius: 8, cursor: "pointer" },
  btnSmall: { fontFamily: serif, fontSize: 12.5, padding: "5px 10px", background: "transparent", color: "#2e3a2f", border: "1px solid #c9bda6", borderRadius: 6, cursor: "pointer" },
  toggleRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, color: "#6b5f4d", marginTop: 6 },
  status: { marginTop: 10, fontSize: 13, color: "#b08d57", fontStyle: "italic" },
  tunePanel: { marginTop: 16, padding: 12, border: "1px solid #e0d5be", borderRadius: 10, background: "#faf6ec" },
  tuneLabel: { fontSize: 13, color: "#6b5f4d", display: "block" },
  layerList: { display: "flex", flexDirection: "column", gap: 2 },
  layerRow: { display: "flex", alignItems: "baseline", gap: 8, padding: "5px 8px", borderLeft: "3px solid", borderRadius: "0 6px 6px 0", transition: "opacity 400ms ease" },
  layerNum: { fontSize: 11, color: "#9c8a72", width: 18 },
  layerName: { fontSize: 13.5, flex: 1 },
  layerCount: { fontSize: 11.5, color: "#9c8a72" },

  stage: { flex: 1, minWidth: 560, display: "flex", flexDirection: "column", alignItems: "center" },
  canvasWrap: { position: "relative", width: 520, height: 520, background: "radial-gradient(circle at 50% 42%, #fbf9f2 0%, #f1ecdf 100%)", borderRadius: 20, border: "1px solid #e4dccb", boxShadow: "inset 0 0 60px rgba(120,100,70,0.07)", overflow: "visible" },
  ringOuter: { position: "absolute", left: 20, top: 20, width: 480, height: 480, borderRadius: "50%", border: "1.5px solid #c9bda6", zIndex: 0 },
  ringInner: { position: "absolute", left: 110, top: 110, width: 300, height: 300, borderRadius: "50%", border: "1px solid #d8cfc0", zIndex: 0 },
  ringWork: { position: "absolute", left: 65, top: 65, width: 390, height: 390, borderRadius: "50%", border: "1px dashed #c9bda6", opacity: 0.7, zIndex: 0 },
  clockLabel: { position: "absolute", transform: "translate(-50%, -50%)", fontSize: 12, color: "#9c8a72", zIndex: 2, fontStyle: "italic" },

  valPanel: { marginTop: 18, width: "100%", maxWidth: 560, background: "#fdfbf6", border: "1px solid #e4dccb", borderRadius: 12, padding: "14px 16px" },
  valHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, gap: 12, flexWrap: "wrap" },
  valMeter: { fontSize: 13, color: "#6b5f4d" },
  valRow: { display: "flex", alignItems: "baseline", gap: 8, padding: "3.5px 0", borderTop: "1px solid #f0ead9" },
  valDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0, alignSelf: "center" },
  valLabel: { fontSize: 13, width: 230, color: "#4a4034" },
  valValue: { fontSize: 12.5, color: "#7c6a54", flex: 1 },
  adviceBox: { marginTop: 8, padding: "8px 10px", background: "#f5efe0", border: "1px solid #e0d5be", borderRadius: 8 },
  adviceLine: { fontSize: 12, color: "#6b5f4d", lineHeight: 1.6 },
  valNote: { marginTop: 8, fontSize: 11.5, color: "#9c8a72", fontStyle: "italic", lineHeight: 1.45 },
  tokenLine: { marginTop: 8, fontSize: 11.5, color: "#7c6a54", fontFamily: "monospace", background: "#faf6ec", padding: "6px 8px", borderRadius: 6 },

  galleryPanel: { marginTop: 18, width: "100%", maxWidth: 560, background: "#fdfbf6", border: "1px solid #e4dccb", borderRadius: 12, padding: "14px 16px" },
  galleryGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 10 },
  galleryCard: { border: "1px solid #ece4d3", borderRadius: 10, background: "#fff", padding: 6, cursor: "pointer", textAlign: "center" },
  galleryMeta: { fontSize: 10.5, color: "#7c6a54", lineHeight: 1.5, marginTop: 2 },

  slotSection: { marginTop: 32, background: "#fdfbf6", border: "1px solid #e4dccb", borderRadius: 14, padding: 20 },
  slotGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 },
  slotCard: { display: "flex", gap: 12, alignItems: "center", padding: 10, border: "1px solid #ece4d3", borderRadius: 10, background: "#fff" },
  slotThumb: { width: 56, height: 56, borderRadius: 10, border: "1.5px dashed", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", overflow: "hidden", background: "#faf8f1", flexShrink: 0 },
  slotImg: { width: "100%", height: "100%", objectFit: "contain" },
  slotGhostDot: { width: 18, height: 18, borderRadius: "50%", opacity: 0.7 },
  slotLabel: { fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  slotActions: { display: "flex", gap: 10, marginTop: 2 },
  linkBtn: { fontFamily: serif, fontSize: 12, color: "#b08d57", background: "none", border: "none", padding: 0, cursor: "pointer", textDecoration: "underline" },
  footerNote: { marginTop: 14, fontSize: 12.5, color: "#9c8a72", fontStyle: "italic" },
};
