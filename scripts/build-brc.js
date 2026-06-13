/* Build assets/brc-app.js from the uploaded BRC-3.0 prototype JSX.
   Mirrors the Academy port: extract the <script type="text/babel"> block,
   apply Evercrafted house-rule adaptations, transpile JSX -> plain JS with
   Babel, write the served bundle. No runtime Babel, no CDN. */
const fs = require('fs');
const babel = require('@babel/core');

const SRC = '/root/.claude/uploads/3b5b8842-8a77-5816-a438-b692f987bde4/fe6f0139-index.html';
const OUT = 'assets/brc-app.js';

let html = fs.readFileSync(SRC, 'utf8');
// Pull the single babel script block (the whole app).
const m = html.match(/<script type="text\/babel"[^>]*>([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) { console.error('could not locate the babel script block'); process.exit(1); }
let jsx = m[1];

// ── Adaptation 1: drop client-side persistence (IndexedDB) → session-only.
//    Evercrafted rule: nothing persists client-side; real persistence is Supabase.
//    idbOpen now rejects immediately; idbSet/idbGet callers already .catch() it,
//    so the asset library lives in React state for the session only.
const before1 = jsx;
jsx = jsx.replace(
  'const r = indexedDB.open("brc-compositor", 1);',
  "rej(new Error('persistence disabled — assets are session-only per Evercrafted data policy')); return;\n    const r = { onupgradeneeded: null, onsuccess: null, onerror: null };"
);
if (jsx === before1) { console.error('ADAPT1 (idb) did not match'); process.exit(1); }

// ── Adaptation 2: font — Cormorant Garamond (rejected) → Italiana.
const before2 = jsx;
jsx = jsx.split("'Cormorant Garamond', serif").join("'Italiana', Georgia, serif");
if (jsx === before2) { console.error('ADAPT2 (font) did not match'); process.exit(1); }

// (Adaptation 3 — /api/realism — is already same-origin in the source; no change.)

const out = babel.transform(jsx, {
  presets: [['@babel/preset-react'], ['@babel/preset-env', { targets: { browsers: 'last 2 versions' } }]],
  compact: false,
  comments: false,
}).code;

fs.writeFileSync(OUT, '/* AUTO-GENERATED from BRC-3.0 prototype by scripts/build-brc.js — do not edit by hand. */\n' + out);
console.log('wrote ' + OUT + ' (' + out.length + ' bytes)');
