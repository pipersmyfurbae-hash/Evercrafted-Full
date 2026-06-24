/* Golden-master test for engine.js — locks R1-R18 behavior on fixed seeds.
   No test framework: run with `node engine.test.js`.
   First run writes engine.golden.json (the baseline — commit it).
   Later runs compare and FAIL on any drift, so a threshold/geometry change
   can't silently re-grade every layout. Update the baseline deliberately:
   `node engine.test.js --update` (only when a change is intended). */
const fs = require('fs');
const E = require('./engine.js');
const SNAP = './engine.golden.json';

// Fixed cases — deterministic (mulberry32 seeded). C24PE-RE is the calibration reference.
const CASES = [
  { name: 'C24PE-RE canonical (24" lush crescent, 7:30)', p: { D: 24, style: 'lush', drama: 'med', seed: 42, anchor: '7:30 classic', asym: 0.6, formula: 'crescent' } },
  { name: 'minimal side-sweep (22", 10:00 swag)',        p: { D: 22, style: 'minimal', drama: 'low', seed: 7, anchor: '10:00 swag', asym: 0.45, formula: 'crescent' } },
  { name: 'twin cluster (24" lush)',                     p: { D: 24, style: 'lush', drama: 'med', seed: 123, anchor: '7:30 classic', asym: 0.7, formula: 'twin' } },
  { name: 'high drama (26", 4:30 lower-right)',          p: { D: 26, style: 'lush', drama: 'high', seed: 99, anchor: '4:30 lower-right', asym: 0.55, formula: 'crescent' } },
];

const r4 = (x) => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x);
function snapshot(p) {
  const lay = E.generateLayout(p);
  const v = E.computeValidation(lay, {});
  const tok = E.compositionTokens(v, lay);
  return {
    layout: {
      formula: lay.formula,
      layerCounts: lay.layers.map((l) => [l.component, l.positions.length]),
      coverageTarget: lay.meta.coverageTarget, bundles: lay.meta.bundles,
      pole: r4(lay.meta.pole), purchaseStems: lay.meta.purchaseStems,
      adjustIterations: lay.meta.adjustIterations,
      clusters: lay.meta.clusters,
    },
    validation: {
      coverage: r4(v.coverage), centralFrac: r4(v.centralFrac),
      stackBloom: r4(v.stackBloom), stackTotal: r4(v.stackTotal),
      asymScore: r4(v.asymScore), axisBalance: r4(v.axisBalance), driftRatio: r4(v.driftRatio),
      tightPairs: v.tightPairs, texMax: r4(v.texMax), texAvg: r4(v.texAvg), texCV: r4(v.texCV),
      texRuns: v.texRuns, depthAvg: r4(v.depthAvg), depthVar: r4(v.depthVar),
      hollowCount: v.hollowCount, accentSep: r4(v.accentSep),
      placements: v.placements, purchase: v.purchase,
      checks: v.checks.map((c) => [c.label, c.status]),  // the verdicts — the thing that must not drift
    },
    tokens: tok,
  };
}

const current = {};
CASES.forEach((c) => { current[c.name] = snapshot(c.p); });

const update = process.argv.includes('--update');
if (update || !fs.existsSync(SNAP)) {
  fs.writeFileSync(SNAP, JSON.stringify(current, null, 2));
  console.log(`${update ? 'UPDATED' : 'WROTE'} baseline → ${SNAP} (${CASES.length} cases)`);
  process.exit(0);
}

const golden = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
let fails = 0;
for (const c of CASES) {
  const a = JSON.stringify(golden[c.name]); const b = JSON.stringify(current[c.name]);
  if (a === b) { console.log(`  ✓ ${c.name}`); continue; }
  fails++; console.log(`  ✗ ${c.name} — DRIFT`);
  // pinpoint the first differing top-level section
  const g = golden[c.name] || {}, n = current[c.name] || {};
  for (const k of new Set([...Object.keys(g), ...Object.keys(n)])) {
    if (JSON.stringify(g[k]) !== JSON.stringify(n[k])) console.log(`      ↳ ${k} changed`);
  }
}
if (fails) { console.error(`\nFAIL: ${fails}/${CASES.length} cases drifted. If intended, re-run with --update.`); process.exit(1); }
console.log(`\nPASS: ${CASES.length}/${CASES.length} golden cases stable.`);
