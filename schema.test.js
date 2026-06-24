/* Characterization test for evercrafted-schema.js placement — schema powers the
   live product API and had no test net. Locks recipeToSlots→placeSlots output
   (deterministic via the seeded hash) AND the new engine validation bridge.
   Run: `node schema.test.js`   ·   Update deliberately: `node schema.test.js --update`. */
const fs = require('fs');
const EC = require('./evercrafted-schema.js');
const SNAP = './schema.golden.json';

const RECIPES = {
  septemberGarden: [
    { role: 'structural', name: 'Grapevine',      color: { hex: '#9a8466' }, bloom_size_in: 2.0, count: 3,  behavior: 'mid' },
    { role: 'greenery',   name: 'Sage eucalyptus',color: { hex: '#8a9d77' }, bloom_size_in: 2.0, count: 12, behavior: 'light' },
    { role: 'focal',      name: 'Cream rose',     color: { hex: '#efe6d4' }, bloom_size_in: 3.2, count: 5,  behavior: 'heavy' },
    { role: 'secondary',  name: 'Dusty ranunculus',color:{ hex: '#cda99e' }, bloom_size_in: 2.6, count: 4,  behavior: 'mid' },
    { role: 'accent',     name: 'Amber',          color: { hex: '#c4a06a' }, bloom_size_in: 1.0, count: 3,  behavior: 'wispy' },
  ],
  allWhite: [
    { role: 'structural', name: 'Birch',     color: { hex: '#cdbfa6' }, bloom_size_in: 2.0, count: 2,  behavior: 'mid' },
    { role: 'greenery',   name: 'Olive',     color: { hex: '#7e8a6a' }, bloom_size_in: 1.8, count: 10, behavior: 'wispy' },
    { role: 'focal',      name: 'White peony',color:{ hex: '#f3eee0' }, bloom_size_in: 3.5, count: 4,  behavior: 'heavy' },
    { role: 'secondary',  name: 'Ranunculus',color: { hex: '#efe9d6' }, bloom_size_in: 2.4, count: 5,  behavior: 'mid' },
    { role: 'filler',     name: 'Wax flower',color: { hex: '#f1ebdc' }, bloom_size_in: 1.4, count: 4,  behavior: 'light' },
  ],
};
const CASES = [
  { name: 'September Garden · Crescent',      recipe: 'septemberGarden', formula: 'Crescent' },
  { name: 'September Garden · Garden Scatter',recipe: 'septemberGarden', formula: 'Garden Scatter' },
  { name: 'All White · Crescent',             recipe: 'allWhite',        formula: 'Crescent' },
];

const r3 = (x) => (typeof x === 'number' ? Math.round(x * 1e3) / 1e3 : x);
const r4 = (x) => (typeof x === 'number' ? Math.round(x * 1e4) / 1e4 : x);
function snapshot(c) {
  const slots = EC.recipeToSlots(RECIPES[c.recipe]);
  const placed = EC.placeSlots(slots, c.formula, { wreathDiam: 24 });
  const v = EC.validatePlacement(placed, { wreathDiam: 24 });
  return {
    placement: {
      unitCount: placed.units.length,
      arc: { span: placed.arc.span, full: placed.arc.full },
      exposed: placed.exposed,
      units: placed.units.map((u) => [u.role, Math.round(u.deg), r3(u.r), r3(u.sizeFrac)]),
    },
    bridge: v ? {
      coverage: Math.round(v.coverage), centralFrac: Math.round(v.centralFrac),
      asymScore: r4(v.asymScore), stackTotal: r4(v.stackTotal), tightPairs: v.tightPairs,
      checks: v.checks.map((ck) => [ck.label, ck.status]),
    } : null,
  };
}

const current = {};
CASES.forEach((c) => { current[c.name] = snapshot(c); });

const update = process.argv.includes('--update');
if (update || !fs.existsSync(SNAP)) {
  fs.writeFileSync(SNAP, JSON.stringify(current, null, 2));
  console.log(`${update ? 'UPDATED' : 'WROTE'} baseline → ${SNAP} (${CASES.length} cases)`);
  process.exit(0);
}
const golden = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
let fails = 0;
for (const c of CASES) {
  if (JSON.stringify(golden[c.name]) === JSON.stringify(current[c.name])) { console.log(`  ✓ ${c.name}`); continue; }
  fails++; console.log(`  ✗ ${c.name} — DRIFT`);
  const g = golden[c.name] || {}, n = current[c.name] || {};
  for (const k of new Set([...Object.keys(g), ...Object.keys(n)])) {
    if (JSON.stringify(g[k]) !== JSON.stringify(n[k])) console.log(`      ↳ ${k} changed`);
  }
}
if (fails) { console.error(`\nFAIL: ${fails}/${CASES.length} drifted. If intended, re-run with --update.`); process.exit(1); }
console.log(`\nPASS: ${CASES.length}/${CASES.length} schema cases stable.`);
