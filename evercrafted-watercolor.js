/* Evercrafted Watercolor Renderer — deterministic painterly render of an
   engine.js layout (or any {layers:[{component, positions:[{angle,radius,size,tip}]}]}).
   No AI, no DOM deps beyond a <canvas>. Same blueprint + seed = same painting.
   Browser global: window.EvercraftedWatercolor.render(canvas, layout, opts).
   Needs window.EvercraftedEngine (toCart, SLOT_MAP, mulberry32). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.EvercraftedWatercolor = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const CC = 260; // engine toCart center

  const hexToRgb = h => { h = ('' + h).replace('#', ''); return { R: parseInt(h.substr(0, 2), 16), G: parseInt(h.substr(2, 2), 16), B: parseInt(h.substr(4, 2), 16) }; };
  const lum = h => { const { R, G, B } = hexToRgb(h); return (0.299 * R + 0.587 * G + 0.114 * B) / 255; };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const jit = (rng, a) => (rng() * 2 - 1) * a;
  const sat = (hex, f) => { const { R, G, B } = hexToRgb(hex); const L = 0.299 * R + 0.587 * G + 0.114 * B; return { R: clamp(Math.round(L + (R - L) * f), 0, 255), G: clamp(Math.round(L + (G - L) * f), 0, 255), B: clamp(Math.round(L + (B - L) * f), 0, 255) }; };
  const lighten = (R, G, B, a) => `rgb(${Math.round(R + (255 - R) * a)},${Math.round(G + (255 - G) * a)},${Math.round(B + (255 - B) * a)})`;
  const darken = (R, G, B, f) => `rgb(${Math.round(R * f)},${Math.round(G * f)},${Math.round(B * f)})`;

  function blobPath(ctx, x, y, r, rng, n) {
    const pts = [];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; const rad = r * (0.82 + 0.34 * rng()); pts.push([x + Math.cos(a) * rad, y + Math.sin(a) * rad]); }
    ctx.beginPath();
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const c = pts[i], nx = pts[(i + 1) % n]; ctx.quadraticCurveTo(c[0], c[1], (c[0] + nx[0]) / 2, (c[1] + nx[1]) / 2); }
    ctx.closePath();
  }
  function petalEllipse(ctx, cx, cy, ang, len, wid, fill) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.beginPath(); ctx.ellipse(0, len * 0.5, wid, len * 0.55, 0, 0, 7); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }
  function leafBlade(ctx, cx, cy, ang, len, wid, fill) { ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(wid, len * 0.5, 0, len); ctx.quadraticCurveTo(-wid, len * 0.5, 0, 0); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.restore(); }

  // ── colored bloom (peony/tulip/ranunculus etc.) — opaque luminous body + pooling + petals
  function coloredBloom(ctx, x, y, r, hex, rng, role) {
    const { R, G, B } = sat(hex, 1.4);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.12; blobPath(ctx, x + r * 0.12, y + r * 0.20, r * 0.98, rng, 12); ctx.fillStyle = 'rgb(126,116,126)'; ctx.fill();
    ctx.globalAlpha = 0.10; blobPath(ctx, x + jit(rng, r * 0.1), y + jit(rng, r * 0.1), r * 1.16, rng, 10); ctx.fillStyle = darken(R, G, B, 0.95); ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.92;
    blobPath(ctx, x, y, r, rng, 13);
    const g = ctx.createRadialGradient(x - r * 0.26, y - r * 0.30, r * 0.08, x, y, r * 1.05);
    g.addColorStop(0, lighten(R, G, B, 0.45)); g.addColorStop(0.55, `rgb(${R},${G},${B})`); g.addColorStop(1, darken(R, G, B, 0.7));
    ctx.fillStyle = g; ctx.fill();
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.ellipse(x + r * 0.08, y + r * 0.42, r * 0.72, r * 0.42, 0, 0, 7); ctx.fillStyle = darken(R, G, B, 0.62); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    // layered ruffled petals (more for focal = hero)
    const rings = role === 'focal' ? [[0.92, 10], [0.6, 9], [0.32, 7]] : [[0.84, 7], [0.46, 6]];
    rings.forEach(([rr, n], ri) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ri * 0.5 + jit(rng, 0.16); const pr = r * rr;
        ctx.globalAlpha = 0.42 + 0.18 * rng();
        petalEllipse(ctx, x + Math.cos(a) * pr * 0.5, y + Math.sin(a) * pr * 0.5, a + Math.PI / 2, pr * 0.5, pr * 0.26, ri === 0 ? `rgb(${R},${G},${B})` : lighten(R, G, B, 0.18 + 0.12 * ri));
      }
    });
    ctx.globalAlpha = 0.3; ctx.fillStyle = darken(R, G, B, 0.5); blobPath(ctx, x, y, r * 0.16, rng, 8); ctx.fill();
    ctx.globalAlpha = 1;
  }
  // ── light cream bloom — modeled by warm shadow so it reads as a flower
  function lightBloom(ctx, x, y, r, hex, rng, role) {
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.13; blobPath(ctx, x + r * 0.14, y + r * 0.22, r * 0.97, rng, 12); ctx.fillStyle = 'rgb(150,146,150)'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.95; blobPath(ctx, x, y, r, rng, 13);
    const g = ctx.createRadialGradient(x - r * 0.25, y - r * 0.28, r * 0.1, x, y, r); g.addColorStop(0, '#fffdf7'); g.addColorStop(0.7, '#f3ead7'); g.addColorStop(1, '#e6d6bd'); ctx.fillStyle = g; ctx.fill();
    const rings = role === 'focal' ? [[0.9, 10], [0.58, 9], [0.3, 7]] : [[0.82, 7], [0.44, 6]];
    rings.forEach(([rr, n], ri) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + ri * 0.5 + jit(rng, 0.16); const pr = r * rr;
        ctx.globalAlpha = 0.5; ctx.globalCompositeOperation = 'source-over';
        petalEllipse(ctx, x + Math.cos(a) * pr * 0.5, y + Math.sin(a) * pr * 0.5, a + Math.PI / 2, pr * 0.5, pr * 0.27, ['#fffdf8', '#f6efe0', '#ece0cb'][ri] || '#f3ead7');
        ctx.globalAlpha = 0.13; ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = 'rgb(196,182,160)'; ctx.lineWidth = 0.8; ctx.stroke();
      }
    });
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.32; ctx.beginPath(); ctx.arc(x, y, r * 0.16, 0, 7); ctx.fillStyle = 'rgb(216,196,150)'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  function bloom(ctx, x, y, r, hex, rng, role) { (lum(hex) > 0.78 ? lightBloom : coloredBloom)(ctx, x, y, r, hex, rng, role); }

  // ── berries — tight cluster of small shiny spheres (breaks the "row of balls")
  function berryCluster(ctx, x, y, r, hex, rng) {
    const { R, G, B } = sat(hex, 1.45); const n = 4 + Math.floor(rng() * 4);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.12; ctx.beginPath(); ctx.ellipse(x + r * 0.1, y + r * 0.2, r * 0.95, r * 0.8, 0, 0, 7); ctx.fillStyle = 'rgb(120,110,120)'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + jit(rng, 0.5); const d = r * (0.3 + 0.32 * rng()); const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d; const br = r * (0.34 + 0.13 * rng());
      ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(bx, by, br, 0, 7);
      const g = ctx.createRadialGradient(bx - br * 0.3, by - br * 0.3, br * 0.1, bx, by, br); g.addColorStop(0, lighten(R, G, B, 0.5)); g.addColorStop(1, darken(R, G, B, 0.68)); ctx.fillStyle = g; ctx.fill();
      ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(bx - br * 0.32, by - br * 0.34, br * 0.18, 0, 7); ctx.fillStyle = '#fffaf2'; ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── hydrangea — dome of tiny 4-petal florets
  function floretDome(ctx, x, y, r, hex, rng) {
    const { R, G, B } = sat(hex, 1.28);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.12; blobPath(ctx, x + r * 0.1, y + r * 0.18, r, rng, 12); ctx.fillStyle = 'rgb(124,118,116)'; ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    const n = 11 + Math.floor(rng() * 6);
    for (let i = 0; i < n; i++) {
      const a = rng() * Math.PI * 2; const d = r * 0.82 * Math.sqrt(rng()); const fx = x + Math.cos(a) * d, fy = y + Math.sin(a) * d; const fr = r * (0.2 + 0.08 * rng());
      const sh = 0.82 + 0.34 * rng(); const fill = `rgb(${clamp(Math.round(R * sh), 0, 255)},${clamp(Math.round(G * sh), 0, 255)},${clamp(Math.round(B * sh), 0, 255)})`;
      ctx.globalAlpha = 0.92; for (let p = 0; p < 4; p++) petalEllipse(ctx, fx, fy, p * Math.PI / 2 + rng() * 0.2, fr, fr * 0.5, fill);
      ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(fx, fy, fr * 0.2, 0, 7); ctx.fillStyle = darken(R, G, B, 0.58); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── wax flower — tiny spray of dots on short stems
  function waxSpray(ctx, x, y, r, hex, rng) {
    const { R, G, B } = sat(hex, 1.2); const n = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + jit(rng, 0.3); const d = r * (0.4 + 0.5 * rng()); const dx = x + Math.cos(a) * d, dy = y + Math.sin(a) * d;
      ctx.globalAlpha = 0.45; ctx.strokeStyle = darken(R, G, B, 0.6); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(dx, dy); ctx.stroke();
      ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(dx, dy, r * 0.2, 0, 7); ctx.fillStyle = lighten(R, G, B, 0.3); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // ── greenery — curved stem with rounded leaf pairs
  function leafSpray(ctx, x, y, len, angDeg, hex, rng) {
    const { R, G, B } = sat(hex, 1.3);
    ctx.save(); ctx.translate(x, y); ctx.rotate((angDeg - 90) * Math.PI / 180); ctx.globalCompositeOperation = 'multiply';
    const stemL = len * 1.05; const segs = 4 + Math.floor(rng() * 3);
    ctx.globalAlpha = 0.4; ctx.strokeStyle = darken(R, G, B, 0.55); ctx.lineWidth = Math.max(0.6, len * 0.022); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(stemL * 0.5, len * 0.12, stemL, 0); ctx.stroke();
    for (let i = 1; i <= segs; i++) {
      const t = i / (segs + 1); const lx = stemL * t; const ly = len * 0.12 * Math.sin(t * Math.PI); const lr = len * (0.3 - 0.13 * t);
      [-1, 1].forEach(side => { ctx.globalAlpha = 0.45 + 0.22 * rng(); leafBlade(ctx, lx, ly, side * Math.PI / 3, lr, lr * 0.5, darken(R, G, B, 0.92)); });
    }
    // a couple tip leaves
    ctx.globalAlpha = 0.5; leafBlade(ctx, stemL, 0, 0, len * 0.16, len * 0.08, darken(R, G, B, 0.95));
    ctx.restore(); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  }

  function paper(ctx, W, rng) {
    const g = ctx.createLinearGradient(0, 0, W, W); g.addColorStop(0, '#f8f4ec'); g.addColorStop(1, '#f0ebdf'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
    for (let i = 0; i < 3000; i++) { const x = rng() * W, y = rng() * W; ctx.globalAlpha = 0.015 + 0.03 * rng(); ctx.fillStyle = rng() > 0.5 ? '#d6cdba' : '#fffaf0'; ctx.fillRect(x, y, 1.2, 1.2); }
    ctx.globalAlpha = 1;
  }
  function vignette(ctx, W) { const g = ctx.createRadialGradient(W / 2, W / 2, W * 0.32, W / 2, W / 2, W * 0.72); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(70,58,40,0.11)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, W); }
  function vineRing(ctx, E, layout, rng) {
    const rs = []; layout.layers.forEach(l => { const s = E.SLOT_MAP[l.component]; if (!s || s.role === 'base') return; l.positions.forEach(p => rs.push(p.radius)); });
    rs.sort((a, b) => a - b); const rVine = rs.length ? rs[Math.floor(rs.length * 0.5)] : 200;
    ctx.save(); ctx.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 120; i++) {
      const rad = (i / 120 * 360 - 90) * Math.PI / 180; const rr = rVine + jit(rng, 11);
      const cx = CC + Math.cos(rad) * rr, cy = CC + Math.sin(rad) * rr; const tx = -Math.sin(rad), ty = Math.cos(rad); const len = 6 + rng() * 12;
      ctx.globalAlpha = 0.05 + 0.10 * rng(); ctx.strokeStyle = rng() > 0.5 ? '#8a6a4f' : '#6e5440'; ctx.lineWidth = 1 + rng() * 2.2;
      ctx.beginPath(); ctx.moveTo(cx - tx * len / 2 + jit(rng, 2), cy - ty * len / 2 + jit(rng, 2)); ctx.quadraticCurveTo(cx + jit(rng, 3), cy + jit(rng, 3), cx + tx * len / 2, cy + ty * len / 2); ctx.stroke();
    }
    ctx.restore();
  }

  function drawElement(ctx, slot, x, y, r, p, rng, colorFor) {
    const role = slot.role; const key = slot.key;
    const hex = (colorFor && colorFor(key, role, slot.tint)) || slot.tint;
    if (key === 'burlap') { ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.22; blobPath(ctx, x, y, r * 0.7, rng, 9); ctx.fillStyle = hex; ctx.fill(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return; }
    if (role === 'greenery') return leafSpray(ctx, x, y, r * 2.0, (p.tip !== undefined ? p.tip : p.angle), hex, rng);
    if (key === 'hydrangea') return floretDome(ctx, x, y, r, hex, rng);
    if (key === 'berryNavy' || key === 'berryCream') return berryCluster(ctx, x, y, r, hex, rng);
    if (key === 'waxFlower') return waxSpray(ctx, x, y, r, hex, rng);
    bloom(ctx, x, y, role === 'focal' ? r * 1.14 : r, hex, rng, role);
  }

  // render(canvas, layout, opts) — opts: { seed, logical (default 560), colorFor(key,role,defaultTint)->hex }
  function render(canvas, layout, opts) {
    const E = (typeof self !== 'undefined' ? self : this).EvercraftedEngine || (typeof window !== 'undefined' && window.EvercraftedEngine);
    if (!E || !layout) return;
    const o = opts || {}; const Wl = o.logical || 560; const DPR = o.dpr || 2; const seed = o.seed || 42;
    canvas.width = Wl * DPR; canvas.height = Wl * DPR;
    const ctx = canvas.getContext('2d'); ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const rng = E.mulberry32(seed * 7 + 13);
    paper(ctx, Wl, rng);
    const FIT = Wl / 520 * 0.92, OFF = (Wl - 520 * FIT) / 2;
    ctx.save(); ctx.translate(OFF, OFF); ctx.scale(FIT, FIT);
    vineRing(ctx, E, layout, rng);
    layout.layers.forEach(layer => {
      const slot = E.SLOT_MAP[layer.component]; if (!slot || slot.role === 'base') return;
      layer.positions.forEach(p => { const pt = E.toCart(p.angle, p.radius); drawElement(ctx, slot, pt.x, pt.y, p.size * 0.5, p, rng, o.colorFor); });
    });
    ctx.restore();
    vignette(ctx, Wl);
  }

  return { render };
});
