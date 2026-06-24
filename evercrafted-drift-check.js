/**
 * Evercrafted — drift check
 * =========================
 * Audits a tagged catalogue against the single source of truth's vocabulary
 * and flags drift: off-vocabulary values, mass-fallback skews, missing colours.
 *
 *   node evercrafted-drift-check.js [path-to-json]   (default: evercrafted-shop-data.json)
 *
 * Exit code is non-zero if any issues are flagged — handy for CI / pre-deploy.
 */
const fs = require('fs');
const EC = require('./evercrafted-schema.js');

const file = process.argv[2] || './evercrafted-shop-data.json';
let data;
try { data = JSON.parse(fs.readFileSync(file, 'utf8')); }
catch (e) { console.error('Could not read ' + file + ': ' + e.message); process.exit(2); }

const V = EC.VOCAB;
const fields = { role: V.roles, behavior: V.behaviors, movement: V.movements, finish: V.finishes, palette: V.palettes, ep: V.emotions, es: V.emotions };

function dist(field) {
  const c = {};
  data.forEach(x => { const k = String(x[field]); c[k] = (c[k] || 0) + 1; });
  return Object.entries(c).sort((a, b) => b[1] - a[1]);
}

console.log(`\nDrift check — ${file} — ${data.length} items\n${'─'.repeat(60)}`);
let problems = 0;

for (const [f, allowed] of Object.entries(fields)) {
  const d = dist(f);
  console.log(`${f}:  ${d.map(([k, v]) => `${k}=${v}`).join('   ')}`);
  // off-vocabulary values (drift / bad tags)
  const off = d.filter(([k]) => k !== '' && k !== 'undefined' && k !== 'null' && !allowed.includes(k));
  if (off.length) { console.log(`   ⚠ OFF-VOCAB: ${off.map(([k, v]) => `${k}(${v})`).join(', ')}`); problems++; }
  // mass-fallback / skew (one value dominates)
  const [tk, tv] = d[0] || ['', 0];
  if (tv / data.length > 0.65) { console.log(`   ⚠ SKEW: '${tk}' is ${Math.round(tv / data.length * 100)}% of items`); problems++; }
}

const noColor = data.filter(x => !x.colorHex).length;
if (noColor) { console.log(`\n⚠ ${noColor} items (${Math.round(noColor / data.length * 100)}%) missing colorHex`); problems++; }

console.log(`${'─'.repeat(60)}\n${problems ? `⚠ ${problems} potential drift issue(s) flagged above.` : '✓ No drift issues detected.'}\n`);
process.exit(problems ? 1 : 0);
