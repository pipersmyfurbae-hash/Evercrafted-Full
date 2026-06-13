# `engine.js` — the shared placement engine (R1–R18)

The PIE canon, **extracted verbatim** from `EvercraftedLayoutVisualizer.jsx` into a
pure, headless module so the visualizer, the marketing build-view, the API, and
`evercrafted-schema.js` can all import the **same** engine. This is now the single
source of truth; the visualizer's inline copy should be replaced by an import.

## What's in it
Constants (SLOTS, COVERAGE_CLASSES, SIZE_TABLE, BASE_WIDTHS, ARC_ANCHORS, K_LAYER…),
`mulberry32`, `generateLayout` (R9 pipeline), `computeValidation` (R1–R18 + R10.2
studio notes), `compositionTokens` (R11), and `toCart`/`placementTransform`.
No React, no DOM. UMD: `require('./engine.js')` in Node, `window.EvercraftedEngine`
(or a bundler `import`) in the browser. Served at `/engine.js`.

## Tests — the safety net
```
npm test            # runs engine.test.js against engine.golden.json
node engine.test.js --update   # ONLY when a behavior change is intended
```
Golden-master snapshots four fixed seeds (incl. the **C24PE-RE** reference) — every
generated metric and **every pass/warn/flag verdict**. A threshold or geometry change
that re-grades any layout fails the test instead of slipping through silently.

## Recipe parameterization (`roleMap`)
`generateLayout` now takes an optional `roleMap` so it runs on any palette / a maker's
tagged inventory instead of the hardcoded reference recipe. Defaults reproduce the
canonical layout exactly (golden-stable). Materials must exist in `SLOTS`.
```js
const E = require('./engine.js');
const layout = E.generateLayout({
  D: 24, style: 'lush', drama: 'med', seed: 42, anchor: '7:30 classic', asym: 0.6,
  formula: 'crescent',
  roleMap: { focal: 'ranunculus', secDirMauve: 'tulipWhite', fillCore: 'berryCream' } // all-white
});
const v = E.computeValidation(layout, {}); // same validators, any palette
```
Buckets: `focal · secRound · secDirWhite · secDirMauve · fillCore · fillTaper ·
fillTail · greenMain · greenExt`. Geometry (counts/angles/radii) is seed-driven and
unchanged by remapping — only *which* material fills each bucket changes.

## Point the visualizer at it (delete the inline copy)
At the top of `EvercraftedLayoutVisualizer.jsx`, replace the inline constants +
`generateLayout`/`computeValidation`/`compositionTokens`/`toCart`/`placementTransform`
(the pure block, ~lines 2–1008) with:
```js
import Engine from './engine.js';
const {
  SLOTS, SLOT_MAP, COVERAGE_CLASSES, ARC_ANCHORS, LAYOUTS, degToClock, clamp,
  generateLayout, computeValidation, compositionTokens, toCart, placementTransform,
} = Engine;
```
Keep the browser-only `analyzeImage` (canvas/Image) and the React components as-is.

## Capture layout votes (calibration corpus)
The genome needed to reproduce a layout is already on `layout.meta` (seed + params).
When the build-view shows a real placement, POST a thumb to the feedback endpoint we
built — this is the `kind:'layout'` signal that turns `harmonized` thresholds into
`calibrated` ones:
```js
fetch('/api/layout-feedback', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    vote,                       // 'up' | 'down'
    kind: 'layout',
    seed: String(layout.meta.seed),
    genome: JSON.stringify(gen), // the {D,style,drama,seed,anchor,asym,formula,roleMap} you generated with
    scene_title: sceneTitle || '',
    design_id: designId || '',
  }),
});
```

## Watercolor sprites — no engine change
The per-slot image + `bf/bcy` compositing path already places a cutout at the R-rule
coordinate with stem-axis anchoring. Drop the watercolor cutouts into that slot-image
map and the build-view renders in the watercolor house style. The engine doesn't change.
