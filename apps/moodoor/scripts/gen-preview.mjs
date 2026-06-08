/**
 * Generates two self-contained SVG "screenshots" of Moodoor from the REAL seed
 * data + real blueprint geometry, for previewing without a browser:
 *   - preview-intake.svg   (the memory intake screen)
 *   - preview-matches.svg  (the match-reveal screen with blueprint cards)
 *
 *   node scripts/gen-preview.mjs
 *
 * These mirror the app's brand tokens and the BlueprintSVG math; they are previews,
 * not pixel-exact captures of the running Next pages.
 */
import { writeFileSync } from "node:fs";
import { WREATHS, buildBlueprint, slimBlueprint } from "./gen-seed.mjs";

// ── BlueprintSVG math (mirror of src/components/BlueprintSVG.tsx) ───────────────
const ZS_RADIAL = { structural: -14, focal: -2, secondary: 8, bridge: 4, greenery: 16, accent: 24, texture: 20, filler: 12 };
const ROLE_MARKER = { structural: 9, focal: 11, secondary: 7, bridge: 6, greenery: 5, accent: 4, texture: 4, filler: 4 };

function blueprintSVG(bp, x, y, w, h) {
  const size = 320, cx = size / 2, cy = size / 2, ring = size * 0.34;
  const { s, e } = bp.arcConfig;
  const stems = [];
  for (const slot of bp.slots) {
    const color = slot.item?.color || "#4a6741";
    for (let i = 0; i < slot.stemCount; i++) stems.push({ role: slot.role, color });
  }
  const n = Math.max(1, stems.length);
  const markers = stems.map((stem, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const ang = ((s + (e - s) * t) * Math.PI) / 180;
    const r = ring + (ZS_RADIAL[stem.role] ?? 8);
    return { x: cx + r * Math.cos(ang), y: cy + r * Math.sin(ang), mr: ROLE_MARKER[stem.role] ?? 5, color: stem.color };
  });
  const poly = markers.map((m) => `${m.x.toFixed(1)},${m.y.toFixed(1)}`).join(" ");
  const dots = markers
    .map((m) => `<circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.mr}" fill="${m.color}" opacity="0.92"/><circle cx="${m.x.toFixed(1)}" cy="${m.y.toFixed(1)}" r="${m.mr}" fill="none" stroke="#3a5233" stroke-width="0.5" opacity="0.5"/>`)
    .join("");
  return `<svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${size} ${size}">
    <circle cx="${cx}" cy="${cy}" r="${ring}" fill="none" stroke="#d8d3c8" stroke-width="1" stroke-dasharray="2 4"/>
    <circle cx="${cx}" cy="${cy}" r="${ring + 24}" fill="none" stroke="#e6e2d9" stroke-width="1"/>
    <circle cx="${cx}" cy="${cy}" r="${ring - 18}" fill="none" stroke="#e6e2d9" stroke-width="1"/>
    <polyline points="${poly}" fill="none" stroke="#b9b2a4" stroke-width="0.75"/>
    ${dots}
  </svg>`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const price = (c) => (c ? `$${Math.round(c / 100).toLocaleString("en-US")}` : "");

const FONT_IMPORT = `<style>@import url("https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&amp;family=Dancing+Script:wght@600&amp;family=Inter:wght@300;400;500&amp;display=swap");
    .serif{font-family:'Cormorant Garamond',Georgia,serif}
    .script{font-family:'Dancing Script',cursive;fill:#4a6741}
    .sans{font-family:'Inter',system-ui,sans-serif}
    .muted{fill:#6f6c64}.ink{fill:#2b2b28}.sage{fill:#3a5233}</style>`;

function chip(x, y, label) {
  const w = 14 + label.length * 6.2;
  return `<g><rect x="${x}" y="${y}" width="${w.toFixed(0)}" height="20" rx="10" fill="none" stroke="#e4e0d8"/><text x="${(x + w / 2).toFixed(0)}" y="${y + 14}" class="sans sage" font-size="10" letter-spacing="0.6" text-anchor="middle">${esc(label.toUpperCase())}</text></g>`;
}

// ── Screen 1: intake ────────────────────────────────────────────────────────────
function intakeSVG() {
  const W = 900, H = 620;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${FONT_IMPORT}
  <rect width="${W}" height="${H}" fill="#f9f7f4"/>
  <text x="${W / 2}" y="56" class="serif sage" font-size="30" letter-spacing="5" text-anchor="middle">MOODOOR</text>
  <text x="${W / 2}" y="76" class="sans muted" font-size="12" letter-spacing="1" text-anchor="middle">by Evercrafted</text>
  <line x1="90" y1="104" x2="${W - 90}" y2="104" stroke="#e4e0d8"/>

  <text x="90" y="168" class="script" font-size="30">Tell us the memory.</text>
  <text x="88" y="220" class="serif ink" font-size="42">We&#8217;ll show you the wreath</text>
  <text x="88" y="268" class="serif ink" font-size="42">that holds it.</text>
  <text x="90" y="312" class="sans muted" font-size="15">Every wreath in our collection is handcrafted and curated before it ever meets you.</text>
  <text x="90" y="336" class="sans muted" font-size="15">Share a memory or a feeling, and we&#8217;ll match you to the few that truly resonate.</text>

  <rect x="90" y="364" width="${W - 180}" height="120" rx="3" fill="#ffffff" stroke="#e4e0d8"/>
  <text x="110" y="402" class="serif" font-size="20" fill="#2b2b28">the morning of our wedding, before anyone else was awake</text>
  <text x="110" y="430" class="serif muted" font-size="20" font-style="italic">&#8230;</text>

  ${chip(90, 506, "my grandmother's garden in late autumn")}
  ${chip(370, 506, "the morning we brought the baby home")}

  <rect x="90" y="548" width="190" height="46" rx="2" fill="#4a6741"/>
  <text x="185" y="576" class="sans" font-size="13" letter-spacing="1.2" fill="#f9f7f4" text-anchor="middle">FIND MY WREATH</text>
</svg>`;
}

// ── Screen 2: match reveal ──────────────────────────────────────────────────────
function matchesSVG() {
  const picks = ["first-light-vows", "a-new-door", "golden-anniversary", "winter-hearth"]
    .map((slug) => WREATHS.find((w) => w.slug === slug));

  const W = 1120, cardW = 250, gap = 20;
  const startX = (W - (picks.length * cardW + (picks.length - 1) * gap)) / 2;
  const cardTop = 250, bpH = 250, bodyH = 188, cardH = bpH + bodyH;
  const H = cardTop + cardH + 90;

  const cards = picks
    .map((w, i) => {
      const x = startX + i * (cardW + gap);
      const bp = slimBlueprint(buildBlueprint(w.emotions, w.formula, w.intensity, w.poem));
      const story = w.story.length > 96 ? w.story.slice(0, 94) + "…" : w.story;
      const story1 = story.slice(0, 40);
      const story2 = story.slice(40, 82);
      const story3 = story.slice(82);
      const tags = [w.occasion, w.bow !== "none" ? `${w.bow} bow` : null, w.leads[0]].filter(Boolean).slice(0, 2);
      let tx = x + 18;
      const chips = tags
        .map((t) => {
          const c = chip(tx, cardTop + bpH + 132, t);
          tx += 14 + t.length * 6.2 + 8;
          return c;
        })
        .join("");
      return `<g>
        <rect x="${x}" y="${cardTop}" width="${cardW}" height="${cardH}" rx="4" fill="#ffffff" stroke="#e4e0d8"/>
        <defs><linearGradient id="bpg${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fbfaf7"/><stop offset="1" stop-color="#f3f1ea"/></linearGradient></defs>
        <rect x="${x + 0.5}" y="${cardTop + 0.5}" width="${cardW - 1}" height="${bpH}" fill="url(#bpg${i})"/>
        ${blueprintSVG(bp, x, cardTop, cardW, bpH)}
        <rect x="${x + cardW - 112}" y="${cardTop + bpH - 26}" width="100" height="18" rx="9" fill="#f9f7f4" opacity="0.85"/>
        <text x="${x + cardW - 62}" y="${cardTop + bpH - 13}" class="sans muted" font-size="9" letter-spacing="1" text-anchor="middle">REVEAL THE RENDER &#8594;</text>
        <text x="${x + 20}" y="${cardTop + bpH + 36}" class="serif ink" font-size="22">${esc(w.title)}</text>
        <text x="${x + 20}" y="${cardTop + bpH + 60}" class="sans muted" font-size="11.5">${esc(story1)}</text>
        <text x="${x + 20}" y="${cardTop + bpH + 76}" class="sans muted" font-size="11.5">${esc(story2)}</text>
        <text x="${x + 20}" y="${cardTop + bpH + 92}" class="sans muted" font-size="11.5">${esc(story3)}</text>
        <text x="${x + 20}" y="${cardTop + bpH + 122}" class="serif ink" font-size="19">${price(w.finished)}</text>
        <text x="${x + cardW - 20}" y="${cardTop + bpH + 122}" class="sans muted" font-size="11" text-anchor="end">${esc(w.formula)}</text>
        ${chips}
      </g>`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${FONT_IMPORT}
  <rect width="${W}" height="${H}" fill="#f9f7f4"/>
  <text x="${W / 2}" y="50" class="serif sage" font-size="28" letter-spacing="5" text-anchor="middle">MOODOOR</text>
  <text x="60" y="120" class="script" font-size="24">For the memory you shared</text>
  <text x="58" y="160" class="serif ink" font-size="34">The wreaths that hold it</text>
  <text x="60" y="192" class="serif muted" font-size="17" font-style="italic">&#8220;the morning of our wedding, before anyone else was awake&#8221;</text>
  ${cards}
  <text x="${W / 2}" y="${H - 50}" class="sans muted" font-size="13" text-anchor="middle">Did this feel like your memory?</text>
  <g>
    <rect x="${W / 2 - 150}" y="${H - 38}" width="140" height="38" rx="2" fill="none" stroke="#4a6741"/>
    <text x="${W / 2 - 80}" y="${H - 14}" class="sans sage" font-size="12" letter-spacing="1" text-anchor="middle">YES, EXACTLY</text>
    <rect x="${W / 2 + 10}" y="${H - 38}" width="140" height="38" rx="2" fill="none" stroke="#4a6741"/>
    <text x="${W / 2 + 80}" y="${H - 14}" class="sans sage" font-size="12" letter-spacing="1" text-anchor="middle">NOT QUITE</text>
  </g>
</svg>`;
}

writeFileSync(new URL("../preview-intake.svg", import.meta.url), intakeSVG());
writeFileSync(new URL("../preview-matches.svg", import.meta.url), matchesSVG());
console.log("wrote preview-intake.svg and preview-matches.svg");
