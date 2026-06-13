/* Build the Academy Builder into a self-hosted, pre-transpiled page for the
   Express/HTML stack. Vendors React UMD + transpiles the JSX (no runtime Babel,
   no external CDN). Re-run: `npm run build:academy`. The Next.js scaffold in
   Academy/ remains the eventual production-grade home; this gets it live now. */
const fs = require('fs');
const path = require('path');
const babel = require('@babel/standalone');

let j = fs.readFileSync('Academy/wreath-academy-builder.jsx', 'utf8');

// transforms: UMD globals + secure proxy + brand font
const lit = [
  ['import { useState } from "react";', 'const { useState } = React;'],
  ['export default function WreathAcademyBuilder() {', 'function WreathAcademyBuilder() {'],
  [`const SERIF = "'Cormorant Garamond', Georgia, serif";`, `const SERIF = "'Italiana', Georgia, serif";`],
];
for (const [f, r] of lit) { if (!j.includes(f)) throw new Error('miss lit: ' + f.slice(0, 40)); j = j.replace(f, r); }

const newCall = [
  'const callClaude = async (userContent, systemPrompt) => {',
  '  const res = await fetch("/api/ai-generate", {',
  '    method: "POST", headers: { "Content-Type": "application/json" },',
  '    body: JSON.stringify({ system: systemPrompt, content: userContent, max_tokens: 1500 }),',
  '  });',
  '  const data = await res.json();',
  '  if (!data.success) throw new Error(data.error || "generation failed");',
  '  return JSON.parse((data.text || "").replace(/```json|```/g, "").trim());',
  '};',
].join('\n');
const re = /const callClaude = async \(userContent, systemPrompt\) => \{[\s\S]*?\n\};/;
if (!re.test(j)) throw new Error('miss callClaude'); j = j.replace(re, newCall);
if (j.includes('api.anthropic.com')) throw new Error('client anthropic still present');

// pre-transpile JSX -> plain JS (React.createElement); modern syntax passes through
const code = babel.transform(j, { presets: ['react'] }).code;
const app = code + '\nReactDOM.createRoot(document.getElementById("root")).render(React.createElement(WreathAcademyBuilder));\n';
fs.writeFileSync('assets/academy-app.js', app);

// vendor React UMD (served + committed; no node_modules at runtime)
fs.copyFileSync('node_modules/react/umd/react.production.min.js', 'assets/react.production.min.js');
fs.copyFileSync('node_modules/react-dom/umd/react-dom.production.min.js', 'assets/react-dom.production.min.js');

const html = [
  '<!DOCTYPE html><html lang="en"><head>',
  '<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">',
  '<title>Wreath Academy Builder — Evercrafted</title>',
  '<link href="https://fonts.googleapis.com/css2?family=Italiana&family=Dancing+Script:wght@600&family=Jost:wght@300;400;500;600&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">',
  '<script src="/assets/react.production.min.js"></script>',
  '<script src="/assets/react-dom.production.min.js"></script>',
  '</head><body>',
  '<div id="root"></div>',
  '<script src="/assets/academy-app.js"></script>',
  '<script src="/evercrafted-tier-gate.js"></script>',
  '<script>ECGate.require({pack:"grow",title:"Wreath Academy Builder",description:"Turn a design you have made into a sellable course — curriculum, lessons, video scripts, and the listing."});</script>',
  '</body></html>',
].join('\n');
fs.writeFileSync('evercrafted-academy.html', html);
console.log('built: academy-app.js', (app.length/1024|0)+'KB', '| vendor react umd | html', (html.length)+'b');
