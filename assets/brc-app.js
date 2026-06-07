/* Generated from the BRC-3.0 prototype by scripts/build-brc.js, then hand-patched.
   MANUAL PATCH (realism fidelity): the Editorial + Blend-Boost passes now call
   /api/realism with mode "flux-dev" (low-strength img2img, server-clamped ≤0.35)
   instead of "kontext", so the realism pass preserves the exact composition
   (it can no longer drop/rearrange blooms) and only retextures. */
"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function _regenerator() { var e, t, r = "function" == typeof Symbol ? Symbol : {}, n = r.iterator || "@@iterator", o = r.toStringTag || "@@toStringTag"; function i(r, n, o, i) { var c = n && n.prototype instanceof Generator ? n : Generator, u = Object.create(c.prototype); return _regeneratorDefine2(u, "_invoke", function (r, n, o) { var i, c, u, f = 0, p = o || [], y = !1, G = { p: 0, n: 0, v: e, a: d, f: d.bind(e, 4), d: function d(t, r) { return i = t, c = 0, u = e, G.n = r, a; } }; function d(r, n) { for (c = r, u = n, t = 0; !y && f && !o && t < p.length; t++) { var o, i = p[t], d = G.p, l = i[2]; r > 3 ? (o = l === n) && (u = i[(c = i[4]) ? 5 : (c = 3, 3)], i[4] = i[5] = e) : i[0] <= d && ((o = r < 2 && d < i[1]) ? (c = 0, G.v = n, G.n = i[1]) : d < l && (o = r < 3 || i[0] > n || n > l) && (i[4] = r, i[5] = n, G.n = l, c = 0)); } if (o || r > 1) return a; throw y = !0, n; } return function (o, p, l) { if (f > 1) throw TypeError("Generator is already running"); for (y && 1 === p && d(p, l), c = p, u = l; (t = c < 2 ? e : u) || !y;) { i || (c ? c < 3 ? (c > 1 && (G.n = -1), d(c, u)) : G.n = u : G.v = u); try { if (f = 2, i) { if (c || (o = "next"), t = i[o]) { if (!(t = t.call(i, u))) throw TypeError("iterator result is not an object"); if (!t.done) return t; u = t.value, c < 2 && (c = 0); } else 1 === c && (t = i.return) && t.call(i), c < 2 && (u = TypeError("The iterator does not provide a '" + o + "' method"), c = 1); i = e; } else if ((t = (y = G.n < 0) ? u : r.call(n, G)) !== a) break; } catch (t) { i = e, c = 1, u = t; } finally { f = 1; } } return { value: t, done: y }; }; }(r, o, i), !0), u; } var a = {}; function Generator() {} function GeneratorFunction() {} function GeneratorFunctionPrototype() {} t = Object.getPrototypeOf; var c = [][n] ? t(t([][n]())) : (_regeneratorDefine2(t = {}, n, function () { return this; }), t), u = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(c); function f(e) { return Object.setPrototypeOf ? Object.setPrototypeOf(e, GeneratorFunctionPrototype) : (e.__proto__ = GeneratorFunctionPrototype, _regeneratorDefine2(e, o, "GeneratorFunction")), e.prototype = Object.create(u), e; } return GeneratorFunction.prototype = GeneratorFunctionPrototype, _regeneratorDefine2(u, "constructor", GeneratorFunctionPrototype), _regeneratorDefine2(GeneratorFunctionPrototype, "constructor", GeneratorFunction), GeneratorFunction.displayName = "GeneratorFunction", _regeneratorDefine2(GeneratorFunctionPrototype, o, "GeneratorFunction"), _regeneratorDefine2(u), _regeneratorDefine2(u, o, "Generator"), _regeneratorDefine2(u, n, function () { return this; }), _regeneratorDefine2(u, "toString", function () { return "[object Generator]"; }), (_regenerator = function _regenerator() { return { w: i, m: f }; })(); }
function _regeneratorDefine2(e, r, n, t) { var i = Object.defineProperty; try { i({}, "", {}); } catch (e) { i = 0; } _regeneratorDefine2 = function _regeneratorDefine(e, r, n, t) { function o(r, n) { _regeneratorDefine2(e, r, function (e) { return this._invoke(r, n, e); }); } r ? i ? i(e, r, { value: n, enumerable: !t, configurable: !t, writable: !t }) : e[r] = n : (o("next", 0), o("throw", 1), o("return", 2)); }, _regeneratorDefine2(e, r, n, t); }
function _slicedToArray(r, e) { return _arrayWithHoles(r) || _iterableToArrayLimit(r, e) || _unsupportedIterableToArray(r, e) || _nonIterableRest(); }
function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }
function _unsupportedIterableToArray(r, a) { if (r) { if ("string" == typeof r) return _arrayLikeToArray(r, a); var t = {}.toString.call(r).slice(8, -1); return "Object" === t && r.constructor && (t = r.constructor.name), "Map" === t || "Set" === t ? Array.from(r) : "Arguments" === t || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t) ? _arrayLikeToArray(r, a) : void 0; } }
function _arrayLikeToArray(r, a) { (null == a || a > r.length) && (a = r.length); for (var e = 0, n = Array(a); e < a; e++) n[e] = r[e]; return n; }
function _iterableToArrayLimit(r, l) { var t = null == r ? null : "undefined" != typeof Symbol && r[Symbol.iterator] || r["@@iterator"]; if (null != t) { var e, n, i, u, a = [], f = !0, o = !1; try { if (i = (t = t.call(r)).next, 0 === l) { if (Object(t) !== t) return; f = !1; } else for (; !(f = (e = i.call(t)).done) && (a.push(e.value), a.length !== l); f = !0); } catch (r) { o = !0, n = r; } finally { try { if (!f && null != t.return && (u = t.return(), Object(u) !== u)) return; } finally { if (o) throw n; } } return a; } }
function _arrayWithHoles(r) { if (Array.isArray(r)) return r; }
function asyncGeneratorStep(n, t, e, r, o, a, c) { try { var i = n[a](c), u = i.value; } catch (n) { return void e(n); } i.done ? t(u) : Promise.resolve(u).then(r, o); }
function _asyncToGenerator(n) { return function () { var t = this, e = arguments; return new Promise(function (r, o) { var a = n.apply(t, e); function _next(n) { asyncGeneratorStep(a, r, o, _next, _throw, "next", n); } function _throw(n) { asyncGeneratorStep(a, r, o, _next, _throw, "throw", n); } _next(void 0); }); }; }
var _React = React,
  useState = _React.useState,
  useEffect = _React.useEffect,
  useRef = _React.useRef,
  useMemo = _React.useMemo,
  useCallback = _React.useCallback;
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0;
    a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var rrange = function rrange(rng, a, b) {
  return a + rng() * (b - a);
};
var D2R = Math.PI / 180;
var normDeg = function normDeg(d) {
  return (d % 360 + 360) % 360;
};
function inArc(angle, from, to) {
  var a = normDeg(angle),
    f = normDeg(from),
    t = normDeg(to);
  return f <= t ? a >= f && a <= t : a >= f || a <= t;
}
function polarToXY(cx, cy, angleDeg, radiusPx) {
  return {
    x: cx + radiusPx * Math.cos(angleDeg * D2R),
    y: cy - radiusPx * Math.sin(angleDeg * D2R)
  };
}
function drawHydrangea(ctx, rng, size) {
  var R = size / 2;
  for (var i = 0; i < 54; i++) {
    var rr = Math.sqrt(rng()) * R * 0.92,
      aa = rng() * Math.PI * 2;
    var fx = Math.cos(aa) * rr,
      fy = Math.sin(aa) * rr * 0.94;
    var fr = R * rrange(rng, 0.13, 0.19);
    var mix = rrange(rng, 0, 1) * 0.5 + rr / R * 0.5;
    var c = [205 - mix * 24, 218 - mix * 20, 236 - mix * 12];
    ctx.save();
    ctx.translate(fx, fy);
    ctx.rotate(rng() * Math.PI);
    for (var p = 0; p < 4; p++) {
      ctx.rotate(Math.PI / 2);
      var g = ctx.createRadialGradient(0, -fr * 0.55, 0, 0, -fr * 0.55, fr * 0.8);
      g.addColorStop(0, "rgb(" + (c[0] + 18) + "," + (c[1] + 14) + "," + (c[2] + 10) + ")");
      g.addColorStop(1, "rgb(" + (c[0] - 14) + "," + (c[1] - 10) + "," + (c[2] - 4) + ")");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, -fr * 0.55, fr * 0.46, fr * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(122,144,178,0.9)";
    ctx.beginPath();
    ctx.arc(0, 0, fr * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
function drawRanunculus(ctx, rng, size) {
  var R = size / 2;
  for (var L = 8; L >= 1; L--) {
    var lr = R * (L / 8),
      petals = 6 + L * 2,
      tone = 1 - L / 8;
    var base = [243 - tone * 6, 238 - tone * 4, 226 + tone * 14];
    var rot = rng() * Math.PI * 2;
    for (var p = 0; p < petals; p++) {
      var pa = rot + p / petals * Math.PI * 2;
      ctx.save();
      ctx.translate(Math.cos(pa) * lr * 0.55, Math.sin(pa) * lr * 0.55);
      ctx.rotate(pa + Math.PI / 2);
      var g = ctx.createLinearGradient(0, -lr * 0.5, 0, lr * 0.3);
      g.addColorStop(0, "rgb(" + base[0] + "," + base[1] + "," + base[2] + ")");
      g.addColorStop(1, "rgba(" + (base[0] - 26) + "," + (base[1] - 26) + "," + (base[2] - 28) + ",0.95)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, lr * 0.42, lr * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(170,158,134,0.25)";
      ctx.lineWidth = size * 0.006;
      ctx.stroke();
      ctx.restore();
    }
  }
  ctx.fillStyle = "#cfd3b4";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#9aa36f";
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.035, 0, Math.PI * 2);
  ctx.fill();
}
function drawLisianthus(ctx, rng, size) {
  var R = size / 2,
    rot = rng() * Math.PI * 2;
  for (var p = 0; p < 6; p++) {
    ctx.save();
    ctx.rotate(rot + p / 6 * Math.PI * 2 + rrange(rng, -0.1, 0.1));
    var g = ctx.createLinearGradient(0, 0, R, 0);
    g.addColorStop(0, "#f8f5ee");
    g.addColorStop(0.7, "#f2ecdf");
    g.addColorStop(1, "#e6dcc9");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(R * 0.08, 0);
    ctx.bezierCurveTo(R * 0.35, -R * 0.5, R * 0.95, -R * 0.42, R * 0.98, -R * 0.04);
    ctx.bezierCurveTo(R * 1.0, R * 0.3, R * 0.5, R * 0.5, R * 0.08, R * 0.12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(180,168,140,0.3)";
    ctx.lineWidth = size * 0.007;
    ctx.stroke();
    ctx.restore();
  }
  for (var s = 0; s < 7; s++) {
    var sa = rng() * Math.PI * 2,
      sr = rng() * R * 0.12;
    ctx.fillStyle = s % 2 ? "#d6cf9a" : "#b8bd86";
    ctx.beginPath();
    ctx.arc(Math.cos(sa) * sr, Math.sin(sa) * sr, R * 0.045, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawWaxflower(ctx, rng, size) {
  var R = size / 2;
  for (var b = 0; b < 6; b++) {
    var ba = rng() * Math.PI * 2,
      br = rng() * R * 0.8;
    var bx = Math.cos(ba) * br,
      by = Math.sin(ba) * br;
    ctx.strokeStyle = "rgba(110,122,92,0.8)";
    ctx.lineWidth = size * 0.018;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(bx, by);
    ctx.stroke();
    var fr = R * rrange(rng, 0.18, 0.24);
    for (var p = 0; p < 5; p++) {
      var pa = p / 5 * Math.PI * 2 + rng();
      ctx.fillStyle = "#faf8f2";
      ctx.beginPath();
      ctx.ellipse(bx + Math.cos(pa) * fr * 0.5, by + Math.sin(pa) * fr * 0.5, fr * 0.34, fr * 0.42, pa, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#c8b98f";
    ctx.beginPath();
    ctx.arc(bx, by, fr * 0.16, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawFoliageSprig(ctx, rng, size) {
  var len = size,
    bend = rrange(rng, -0.25, 0.25);
  ctx.strokeStyle = "#56603f";
  ctx.lineWidth = size * 0.016;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, len * bend, len, len * bend * 1.6);
  ctx.stroke();
  for (var i = 1; i <= 9; i++) {
    var t = i / 10,
      sx = len * t;
    var sy = len * bend * (2 * t * (1 - t)) * 1.6 + len * bend * 1.6 * t * t;
    var side = i % 2 ? 1 : -1;
    var la = bend * 1.2 + side * rrange(rng, 0.7, 1.05);
    var ll = size * rrange(rng, 0.16, 0.24) * (1 - t * 0.35);
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(la);
    var g = ctx.createLinearGradient(0, 0, ll, 0);
    g.addColorStop(0, "#4A6741");
    g.addColorStop(1, "#7a9468");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(ll * 0.5, 0, ll * 0.5, ll * 0.21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(235,240,228,0.35)";
    ctx.lineWidth = size * 0.006;
    ctx.beginPath();
    ctx.moveTo(ll * 0.08, 0);
    ctx.lineTo(ll * 0.92, 0);
    ctx.stroke();
    ctx.restore();
  }
}
function drawEucalyptus(ctx, rng, size) {
  var len = size,
    bend = rrange(rng, -0.2, 0.2);
  ctx.strokeStyle = "#7d8a72";
  ctx.lineWidth = size * 0.013;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(len * 0.5, len * bend, len, len * bend * 1.5);
  ctx.stroke();
  for (var i = 1; i <= 8; i++) {
    var t = i / 9,
      sx = len * t;
    var sy = len * bend * (2 * t * (1 - t)) * 1.6 + len * bend * 1.5 * t * t;
    var side = i % 2 ? 1 : -1;
    var cr = size * rrange(rng, 0.07, 0.105) * (1 - t * 0.25);
    var cx2 = sx + side * cr * 1.1 * Math.abs(Math.sin(t * 4 + bend));
    var cy2 = sy + side * cr * 1.3;
    var g = ctx.createRadialGradient(cx2 - cr * 0.3, cy2 - cr * 0.3, 0, cx2, cy2, cr);
    g.addColorStop(0, "#b9c9b4");
    g.addColorStop(1, "#94aa92");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx2, cy2, cr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(120,138,118,0.5)";
    ctx.lineWidth = size * 0.004;
    ctx.stroke();
  }
}
var PLACEHOLDERS = {
  "PH-HYD-BLUE": {
    name: "Powder Blue Hydrangea",
    layer_class: "focal",
    real_width_in: 4.5,
    rotation_mode: "camera_facing",
    draw: drawHydrangea
  },
  "PH-RAN-WHITE": {
    name: "White Ranunculus",
    layer_class: "secondary",
    real_width_in: 2.4,
    rotation_mode: "camera_facing",
    draw: drawRanunculus
  },
  "PH-LIS-IVORY": {
    name: "Pale Lisianthus",
    layer_class: "secondary",
    real_width_in: 2.8,
    rotation_mode: "camera_facing",
    draw: drawLisianthus
  },
  "PH-WAX-WHITE": {
    name: "White Wax Flower",
    layer_class: "filler",
    real_width_in: 1.6,
    rotation_mode: "camera_facing",
    draw: drawWaxflower
  },
  "PH-FOL-SAGE": {
    name: "Sage Foliage Sprig",
    layer_class: "foliage",
    real_width_in: 7.5,
    rotation_mode: "tangent",
    draw: drawFoliageSprig
  },
  "PH-FOL-EUC": {
    name: "Silver Eucalyptus",
    layer_class: "foliage",
    real_width_in: 6.5,
    rotation_mode: "tangent",
    draw: drawEucalyptus
  }
};
var LAYER_ORDER = ["base", "foliage", "filler", "secondary", "focal"];
var ORIENTS = [{
  id: "none",
  label: "As uploaded",
  deg: 0
}, {
  id: "cw90",
  label: "Rotate 90° CW",
  deg: 90
}, {
  id: "r180",
  label: "Rotate 180°",
  deg: 180
}, {
  id: "ccw90",
  label: "Rotate 90° CCW",
  deg: 270
}];
var STEM_NO_BLOCK = "--no vase, bouquet, multiple stems, second flower, hands, table, surface, " + "background texture, cast shadow, drop shadow, fresh flowers, dew, water droplets, " + "wilting, plastic shine, glossy petals, craft-store quality, hobby-store styling, " + "text, watermark, frame, border";
function stemPrompt(sku) {
  var ph = PLACEHOLDERS[sku];
  var name = ph ? ph.name : "[describe your stem — species, color]";
  var isFoliage = ph ? ph.rotation_mode === "tangent" : false;
  if (isFoliage) {
    return "Single faux " + name + " greenery spray, isolated on pure white seamless background, " + "professional catalog cutout photography, laid horizontally with stem base at the left edge and leaf tips extending right, " + "entire spray visible including wired stem end, matte fabric leaves with realistic vein texture and structured leaf memory, " + "flexible wired stem with floral tape wrap, soft even diffused studio lighting, completely shadowless, " + "luxury faux botanical quality, premium silk greenery, no plastic shine " + "--ar 3:2 --style raw --stylize 90 " + STEM_NO_BLOCK;
  }
  return "Single faux silk " + name + " stem, isolated on pure white seamless background, " + "professional catalog cutout photography, bloom facing the camera directly, " + "entire stem visible from bloom head down to wire stem end, " + "matte silk petals with structured petal memory and visible fabric weave texture, " + "realistic wired stem wrapped in green floral tape, soft even diffused studio lighting, completely shadowless, " + "luxury faux botanical quality, premium artificial flower, no plastic shine " + "--ar 2:3 --style raw --stylize 90 " + STEM_NO_BLOCK;
}
function drawGrapevine(ctx, cx, cy, rInner, rOuter, seed) {
  var rng = mulberry32(seed * 7919 + 13);
  var mid = (rInner + rOuter) / 2,
    band = (rOuter - rInner) / 2;
  var browns = ["#6b5138", "#54402c", "#7d6244", "#5e4a33", "#866a48", "#49382a"];
  for (var i = 0; i < 190; i++) {
    var r = mid + rrange(rng, -band, band) * rrange(rng, 0.4, 1);
    var start = rng() * 360,
      span = rrange(rng, 35, 150);
    var wob = rrange(rng, -band * 0.35, band * 0.35);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rng() * 0.06 - 0.03);
    ctx.strokeStyle = browns[Math.floor(rng() * browns.length)];
    ctx.globalAlpha = rrange(rng, 0.35, 0.8);
    ctx.lineWidth = rrange(rng, 2.2, 5.5);
    ctx.beginPath();
    ctx.ellipse(0, 0, r + wob, r - wob, 0, -start * D2R, -(start + span) * D2R, true);
    ctx.stroke();
    ctx.restore();
  }
  for (var k = 0; k < 26; k++) {
    var ka = rng() * 360,
      kr = mid + rrange(rng, -band, band) * 0.8;
    var p = polarToXY(cx, cy, ka, kr);
    ctx.fillStyle = browns[Math.floor(rng() * browns.length)];
    ctx.globalAlpha = rrange(rng, 0.35, 0.65);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, rrange(rng, 2.5, 6), rrange(rng, 1.5, 3.5), rng() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}
var SAMPLE_BLUEPRINT = {
  blueprint_id: "EC_WR_V2_4217",
  formula: "Crescent",
  seed: 42,
  emotional_tags: ["airy", "calm", "fresh"],
  canvas: {
    type: "polar",
    diameter_in: 24
  },
  silence_arcs: [{
    from_deg: 82,
    to_deg: 168
  }],
  foliage_sweeps: [{
    sweep_id: "F1",
    item_id: "PH-FOL-SAGE",
    arc_from: 188,
    arc_to: 425,
    step_deg: 14,
    radius_norm: 0.8,
    flow: "cw"
  }, {
    sweep_id: "F2",
    item_id: "PH-FOL-EUC",
    arc_from: 215,
    arc_to: 400,
    step_deg: 22,
    radius_norm: 0.76,
    flow: "cw"
  }],
  clusters: [{
    cluster_id: "C1",
    type: "focal",
    angle_deg: 305,
    radius_norm: 0.78,
    stems: [{
      item_id: "PH-HYD-BLUE",
      qty: 1
    }]
  }, {
    cluster_id: "C2",
    type: "secondary",
    angle_deg: 332,
    radius_norm: 0.80,
    stems: [{
      item_id: "PH-RAN-WHITE",
      qty: 3
    }]
  }, {
    cluster_id: "C3",
    type: "secondary",
    angle_deg: 276,
    radius_norm: 0.80,
    stems: [{
      item_id: "PH-LIS-IVORY",
      qty: 2
    }]
  }, {
    cluster_id: "C4",
    type: "secondary",
    angle_deg: 244,
    radius_norm: 0.78,
    stems: [{
      item_id: "PH-RAN-WHITE",
      qty: 2
    }]
  }, {
    cluster_id: "C5",
    type: "accent",
    angle_deg: 355,
    radius_norm: 0.82,
    stems: [{
      item_id: "PH-LIS-IVORY",
      qty: 1
    }]
  }, {
    cluster_id: "C6",
    type: "filler",
    angle_deg: 318,
    radius_norm: 0.84,
    stems: [{
      item_id: "PH-WAX-WHITE",
      qty: 3
    }]
  }, {
    cluster_id: "C7",
    type: "filler",
    angle_deg: 222,
    radius_norm: 0.80,
    stems: [{
      item_id: "PH-WAX-WHITE",
      qty: 2
    }]
  }, {
    cluster_id: "C8",
    type: "filler",
    angle_deg: 18,
    radius_norm: 0.80,
    stems: [{
      item_id: "PH-WAX-WHITE",
      qty: 2
    }]
  }]
};
var DEFAULT_ED_PROMPT = "Transform this faux botanical wreath composite into a photorealistic premium product photograph of a single handcrafted wreath. " + "STRICT PRESERVATION: keep the exact same number of flowers and greenery sprays, the exact same species, shapes, and colors, " + "in their exact same locations. Do not simplify, remove, replace, or redesign any element. Do not invent new flower types. " + "INTEGRATION (the only changes allowed): blend the existing elements where they already touch \u2014 tuck bloom bases into the " + "greenery beneath them, let existing leaves overlap neighboring flower edges, weave existing stems into the grapevine base, " + "and add deep insertion shadows where stems enter the arrangement. " + "Remove any white glow or halo around the elements. Soft natural daylight from upper left, matte silk petal texture, " + "dimensional layering. Premium e-commerce editorial photography, clean white background, no plastic shine.";
function idbOpen() {
  return new Promise(function (res, rej) {
    rej(new Error('persistence disabled — assets are session-only per Evercrafted data policy'));
    return;
    var r = {
      onupgradeneeded: null,
      onsuccess: null,
      onerror: null
    };
    r.onupgradeneeded = function () {
      r.result.createObjectStore("kv");
    };
    r.onsuccess = function () {
      return res(r.result);
    };
    r.onerror = function () {
      return rej(r.error);
    };
  });
}
function idbSet(_x, _x2) {
  return _idbSet.apply(this, arguments);
}
function _idbSet() {
  _idbSet = _asyncToGenerator(_regenerator().m(function _callee3(key, val) {
    var db;
    return _regenerator().w(function (_context3) {
      while (1) switch (_context3.n) {
        case 0:
          _context3.n = 1;
          return idbOpen();
        case 1:
          db = _context3.v;
          return _context3.a(2, new Promise(function (res, rej) {
            var tx = db.transaction("kv", "readwrite");
            tx.objectStore("kv").put(val, key);
            tx.oncomplete = function () {
              return res();
            };
            tx.onerror = function () {
              return rej(tx.error);
            };
          }));
      }
    }, _callee3);
  }));
  return _idbSet.apply(this, arguments);
}
function idbGet(_x3) {
  return _idbGet.apply(this, arguments);
}
function _idbGet() {
  _idbGet = _asyncToGenerator(_regenerator().m(function _callee4(key) {
    var db;
    return _regenerator().w(function (_context4) {
      while (1) switch (_context4.n) {
        case 0:
          _context4.n = 1;
          return idbOpen();
        case 1:
          db = _context4.v;
          return _context4.a(2, new Promise(function (res, rej) {
            var tx = db.transaction("kv", "readonly");
            var q = tx.objectStore("kv").get(key);
            q.onsuccess = function () {
              return res(q.result);
            };
            q.onerror = function () {
              return rej(q.error);
            };
          }));
      }
    }, _callee4);
  }));
  return _idbGet.apply(this, arguments);
}
function prepareImage(img, orientDeg, stripWhite) {
  var rot = orientDeg % 360;
  var swap = rot === 90 || rot === 270;
  var w = swap ? img.naturalHeight : img.naturalWidth;
  var h = swap ? img.naturalWidth : img.naturalHeight;
  var cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  var ctx = cv.getContext("2d");
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(rot * D2R);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
  ctx.restore();
  if (stripWhite) {
    var id = ctx.getImageData(0, 0, w, h);
    var d = id.data;
    for (var i = 0; i < d.length; i += 4) {
      var lum = Math.min(d[i], d[i + 1], d[i + 2]);
      if (lum > 248) d[i + 3] = 0;else if (lum > 232) d[i + 3] = Math.min(d[i + 3], Math.round((248 - lum) / 16 * 255));
    }
    for (var pass = 0; pass < 2; pass++) {
      var kill = [];
      for (var y = 1; y < h - 1; y++) {
        for (var x = 1; x < w - 1; x++) {
          var _i = (y * w + x) * 4 + 3;
          if (d[_i] > 0 && d[_i] < 230) {
            if (d[_i - 4] === 0 || d[_i + 4] === 0 || d[_i - w * 4] === 0 || d[_i + w * 4] === 0) kill.push(_i);
          }
        }
      }
      for (var _i2 = 0, _kill = kill; _i2 < _kill.length; _i2++) {
        var _i3 = _kill[_i2];
        d[_i3] = 0;
      }
    }
    ctx.putImageData(id, 0, 0);
  }
  return cv;
}
function makeSilhouette(sourceCanvas) {
  var cv = document.createElement("canvas");
  cv.width = sourceCanvas.width;
  cv.height = sourceCanvas.height;
  var ctx = cv.getContext("2d");
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgb(48,42,32)";
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
function makeProceduralSilhouette(ph) {
  var cam = ph.rotation_mode === "camera_facing";
  var cv = document.createElement("canvas");
  cv.width = cam ? 360 : 420;
  cv.height = cam ? 360 : 260;
  var ctx = cv.getContext("2d");
  ctx.save();
  if (cam) ctx.translate(180, 180);else ctx.translate(30, 130);
  ph.draw(ctx, mulberry32(777), 320);
  ctx.restore();
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = "rgb(48,42,32)";
  ctx.fillRect(0, 0, cv.width, cv.height);
  return cv;
}
function buildInstances(bp, opts) {
  var canvasPx = opts.canvasPx,
    jitter = opts.jitter,
    globalScale = opts.globalScale,
    resolve = opts.resolve,
    nesting = opts.nesting,
    canopy = opts.canopy;
  var cx = canvasPx / 2,
    cy = canvasPx / 2;
  var fieldIn = bp.canvas.diameter_in + 5;
  var pxPerIn = canvasPx / fieldIn;
  var wreathRadiusPx = bp.canvas.diameter_in / 2 * pxPerIn;
  var silence = bp.silence_arcs || [];
  var instances = [],
    rejected = [];
  var idx = 0;
  var inSilence = function inSilence(a) {
    return silence.some(function (s) {
      return inArc(a, s.from_deg, s.to_deg);
    });
  };
  var canopyPct = typeof canopy === "number" ? canopy : 0;
  var density = Math.max(0.3, opts.foliageDensity || 1);
  var flarePct = typeof opts.outerFlare === "number" ? opts.outerFlare : 0;
  (bp.foliage_sweeps || []).forEach(function (sw) {
    var res = resolve(sw.item_id);
    if (!res) {
      rejected.push({
        reason: "unresolved_sku",
        id: sw.item_id
      });
      return;
    }
    var step = sw.step_deg / density;
    for (var a = sw.arc_from; a <= sw.arc_to; a += step) {
      var rng = mulberry32(bp.seed * 9973 + idx * 271 + 7);
      var ang = normDeg(a + rrange(rng, -1, 1) * step * 0.35 * jitter);
      if (inSilence(ang)) {
        rejected.push({
          reason: "silence_arc",
          id: sw.sweep_id
        });
        idx++;
        continue;
      }
      var frng = mulberry32(bp.seed * 9973 + idx * 271 + 47);
      var flared = frng() < flarePct;
      var rad = void 0,
        rotation = void 0;
      if (flared) {
        rad = rrange(frng, 0.86, 0.97);
        rotation = -(ang * D2R) + rrange(frng, -0.3, 0.3);
      } else {
        rad = sw.radius_norm + rrange(rng, -0.045, 0.045) * jitter;
        var tangent = -(ang * D2R) + (sw.flow === "cw" ? Math.PI / 2 : -Math.PI / 2);
        rotation = tangent + rrange(rng, -0.3, 0.3) * jitter;
      }
      var pos = polarToXY(cx, cy, ang, rad * wreathRadiusPx);
      instances.push({
        idx: idx,
        item_id: sw.item_id,
        res: res,
        x: pos.x,
        y: pos.y,
        rotation: rotation,
        sizePx: res.real_width_in * pxPerIn * globalScale * rrange(rng, 0.85, 1.12) * (flared ? 0.85 : 1),
        mirror: rng() > 0.5,
        layer: res.layer_class,
        seedLocal: bp.seed * 9973 + idx * 271,
        canopy: !flared && mulberry32(bp.seed * 9973 + idx * 271 + 31)() < canopyPct
      });
      idx++;
    }
  });
  var collarSku = (bp.foliage_sweeps || []).map(function (s) {
    return s.item_id;
  }).find(function (s) {
    return resolve(s);
  });
  var collarRes = collarSku ? resolve(collarSku) : null;
  (bp.clusters || []).forEach(function (cl, ci) {
    if (nesting && collarRes && cl.type !== "filler") {
      var collarCount = density < 0.65 ? 1 : 2;
      for (var k = 0; k < collarCount; k++) {
        var crng = mulberry32(bp.seed * 6131 + ci * 97 + k * 17 + 5);
        var cang = normDeg(cl.angle_deg + (k === 0 ? -1 : 1) * rrange(crng, 7, 15));
        if (!inSilence(cang)) {
          var crad = cl.radius_norm - 0.015 + rrange(crng, -0.02, 0.02);
          var cpos = polarToXY(cx, cy, cang, crad * wreathRadiusPx);
          var ctan = -(cang * D2R) + (k === 0 ? -Math.PI / 2 : Math.PI / 2);
          instances.push({
            idx: idx,
            item_id: collarSku,
            res: collarRes,
            x: cpos.x,
            y: cpos.y,
            rotation: ctan + rrange(crng, -0.35, 0.35),
            sizePx: collarRes.real_width_in * pxPerIn * globalScale * rrange(crng, 0.7, 0.9),
            mirror: crng() > 0.5,
            layer: "foliage",
            seedLocal: bp.seed * 6131 + ci * 97 + k * 17,
            canopy: false
          });
          idx++;
        }
      }
    }
    cl.stems.forEach(function (stem) {
      var res = resolve(stem.item_id);
      if (!res) {
        rejected.push({
          reason: "unresolved_sku",
          id: stem.item_id
        });
        return;
      }
      for (var q = 0; q < stem.qty; q++) {
        var rng = mulberry32(bp.seed * 9973 + idx * 271 + 7);
        var spread = stem.qty > 1 ? (q - (stem.qty - 1) / 2) * rrange(rng, 8, 13) : 0;
        var ang = normDeg(cl.angle_deg + spread + rrange(rng, -3, 3) * jitter);
        if (inSilence(ang)) {
          rejected.push({
            reason: "silence_arc",
            id: cl.cluster_id
          });
          idx++;
          continue;
        }
        var pullIn = nesting && res.rotation_mode === "camera_facing" ? 0.965 : 1;
        var rad = (cl.radius_norm + rrange(rng, -0.05, 0.05) * jitter) * pullIn;
        var pos = polarToXY(cx, cy, ang, rad * wreathRadiusPx);
        instances.push({
          idx: idx,
          item_id: stem.item_id,
          res: res,
          x: pos.x,
          y: pos.y,
          rotation: res.rotation_mode === "camera_facing" ? rrange(rng, -0.26, 0.26) : -(ang * D2R) + Math.PI / 2,
          sizePx: res.real_width_in * pxPerIn * globalScale * rrange(rng, 0.92, 1.08),
          mirror: rng() > 0.5 && res.rotation_mode === "camera_facing",
          layer: res.layer_class,
          seedLocal: bp.seed * 9973 + idx * 271,
          canopy: false
        });
        idx++;
      }
    });
  });
  instances.sort(function (a, b) {
    return LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer) || a.idx - b.idx;
  });
  return {
    instances: instances,
    rejected: rejected,
    pxPerIn: pxPerIn,
    wreathRadiusPx: wreathRadiusPx,
    cx: cx,
    cy: cy
  };
}
function drawInstance(ctx, inst, mode) {
  var res = inst.res;
  if (res.kind === "image") {
    var src = mode === "sil" ? res.silhouette : res.prepared;
    if (!src) return;
    var W = inst.sizePx;
    var H = W * (res.prepared.height / res.prepared.width);
    ctx.drawImage(src, -res.anchor.x * W, -res.anchor.y * H, W, H);
  } else {
    if (mode === "sil") {
      var sil = res.silhouette;
      var cam = res.rotation_mode === "camera_facing";
      var sf = inst.sizePx / 320;
      if (cam) ctx.drawImage(sil, -180 * sf, -180 * sf, 360 * sf, 360 * sf);else ctx.drawImage(sil, -30 * sf, -130 * sf, 420 * sf, 260 * sf);
    } else {
      res.draw(ctx, mulberry32(inst.seedLocal + 3), inst.sizePx);
    }
  }
}
function renderComposite(canvas, bp, opts) {
  var layersOn = opts.layersOn,
    showOverlay = opts.showOverlay,
    showShadows = opts.showShadows,
    jitter = opts.jitter,
    globalScale = opts.globalScale,
    lightAngle = opts.lightAngle,
    resolve = opts.resolve,
    sizePx = opts.sizePx,
    nesting = opts.nesting,
    canopy = opts.canopy,
    foliageDensity = opts.foliageDensity,
    outerFlare = opts.outerFlare;
  var SZ = sizePx || 1400;
  canvas.width = SZ;
  canvas.height = SZ;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#FCFBF8";
  ctx.fillRect(0, 0, SZ, SZ);
  var built = buildInstances(bp, {
    canvasPx: SZ,
    jitter: jitter,
    globalScale: globalScale,
    resolve: resolve,
    nesting: nesting,
    canopy: canopy,
    foliageDensity: foliageDensity,
    outerFlare: outerFlare
  });
  var instances = built.instances,
    rejected = built.rejected,
    pxPerIn = built.pxPerIn,
    wreathRadiusPx = built.wreathRadiusPx,
    cx = built.cx,
    cy = built.cy;
  if (layersOn.base) drawGrapevine(ctx, cx, cy, wreathRadiusPx * 0.62, wreathRadiusPx * 0.96, bp.seed);
  var rad = lightAngle * D2R;
  var shx = -Math.cos(rad),
    shy = Math.sin(rad);
  instances.forEach(function (inst) {
    if (!layersOn[inst.layer]) return;
    if (showShadows) {
      ctx.save();
      ctx.translate(inst.x + shx * inst.sizePx * 0.09, inst.y + shy * inst.sizePx * 0.09);
      ctx.rotate(inst.rotation);
      if (inst.mirror) ctx.scale(-1, 1);
      ctx.filter = "blur(" + Math.max(4, SZ * 0.006) + "px)";
      ctx.globalAlpha = 0.18;
      drawInstance(ctx, inst, "sil");
      ctx.restore();
      ctx.save();
      ctx.translate(inst.x + shx * inst.sizePx * 0.018, inst.y + shy * inst.sizePx * 0.018);
      ctx.rotate(inst.rotation);
      if (inst.mirror) ctx.scale(-1, 1);
      ctx.filter = "blur(" + Math.max(2, SZ * 0.0024) + "px)";
      ctx.globalAlpha = 0.13;
      drawInstance(ctx, inst, "sil");
      ctx.restore();
      ctx.filter = "none";
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.translate(inst.x, inst.y);
    ctx.rotate(inst.rotation);
    if (inst.mirror) ctx.scale(-1, 1);
    drawInstance(ctx, inst, "asset");
    ctx.restore();
  });
  instances.forEach(function (inst) {
    if (!inst.canopy || !layersOn[inst.layer]) return;
    ctx.save();
    ctx.translate(inst.x, inst.y);
    ctx.rotate(inst.rotation);
    if (inst.mirror) ctx.scale(-1, 1);
    drawInstance(ctx, inst, "asset");
    ctx.restore();
  });
  if (showOverlay) {
    ctx.save();
    ctx.strokeStyle = "rgba(74,103,65,0.30)";
    ctx.setLineDash([5, 7]);
    ctx.lineWidth = SZ * 0.0009 + 0.6;
    [0.4, 0.62, 0.8, 0.96].forEach(function (r) {
      ctx.beginPath();
      ctx.arc(cx, cy, wreathRadiusPx * r, 0, Math.PI * 2);
      ctx.stroke();
    });
    for (var a = 0; a < 360; a += 30) {
      var p1 = polarToXY(cx, cy, a, wreathRadiusPx * 0.3);
      var p2 = polarToXY(cx, cy, a, wreathRadiusPx * 1.02);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    (bp.silence_arcs || []).forEach(function (s) {
      ctx.fillStyle = "rgba(176,121,63,0.10)";
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, wreathRadiusPx * 1.02, -s.from_deg * D2R, -s.to_deg * D2R, true);
      ctx.closePath();
      ctx.fill();
    });
    (bp.clusters || []).forEach(function (cl) {
      var p = polarToXY(cx, cy, cl.angle_deg, cl.radius_norm * wreathRadiusPx);
      ctx.strokeStyle = "rgba(46,63,42,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(46,63,42,0.9)";
      ctx.font = "600 " + SZ * 0.0128 + "px Georgia, serif";
      ctx.fillText(cl.cluster_id + " · " + cl.angle_deg + "°", p.x + 14, p.y - 10);
    });
    ctx.restore();
  }
  var itemCounts = {};
  instances.forEach(function (inst) {
    var nm = inst.res && (inst.res.name || PLACEHOLDERS[inst.item_id] && PLACEHOLDERS[inst.item_id].name) || inst.item_id;
    itemCounts[nm] = (itemCounts[nm] || 0) + 1;
  });
  return {
    count: instances.length,
    rejected: rejected,
    pxPerIn: pxPerIn,
    itemCounts: itemCounts
  };
}
function AnchorPicker(_ref) {
  var asset = _ref.asset,
    onSet = _ref.onSet;
  var ref = useRef(null);
  useEffect(function () {
    var cv = ref.current;
    if (!cv || !asset.prepared) return;
    var sc = Math.min(1, 240 / asset.prepared.width);
    cv.width = asset.prepared.width * sc;
    cv.height = asset.prepared.height * sc;
    var ctx = cv.getContext("2d");
    ctx.fillStyle = "#EFEDE6";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(asset.prepared, 0, 0, cv.width, cv.height);
    var ax = asset.anchor.x * cv.width,
      ay = asset.anchor.y * cv.height;
    ctx.strokeStyle = "#B0793F";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ax, ay, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - 13, ay);
    ctx.lineTo(ax + 13, ay);
    ctx.moveTo(ax, ay - 13);
    ctx.lineTo(ax, ay + 13);
    ctx.stroke();
  }, [asset]);
  var click = function click(e) {
    var rect = ref.current.getBoundingClientRect();
    onSet({
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height))
    });
  };
  return React.createElement("div", null, React.createElement("canvas", {
    ref: ref,
    onClick: click,
    style: {
      cursor: "crosshair",
      borderRadius: 4,
      display: "block",
      maxWidth: "100%"
    }
  }), React.createElement("div", {
    style: S.hint
  }, "Click the stem insertion point \u2014 it becomes the rotation origin."));
}
var __uid = 1;
function BRCApp() {
  var canvasRef = useRef(null);
  var fileRef = useRef(null);
  var manifestRef = useRef(null);
  var _useState = useState(42),
    _useState2 = _slicedToArray(_useState, 2),
    seed = _useState2[0],
    setSeed = _useState2[1];
  var _useState3 = useState(0.7),
    _useState4 = _slicedToArray(_useState3, 2),
    jitter = _useState4[0],
    setJitter = _useState4[1];
  var _useState5 = useState(1.0),
    _useState6 = _slicedToArray(_useState5, 2),
    globalScale = _useState6[0],
    setGlobalScale = _useState6[1];
  var _useState7 = useState(135),
    _useState8 = _slicedToArray(_useState7, 2),
    lightAngle = _useState8[0],
    setLightAngle = _useState8[1];
  var _useState9 = useState(true),
    _useState0 = _slicedToArray(_useState9, 2),
    nesting = _useState0[0],
    setNesting = _useState0[1];
  var _useState1 = useState(0.3),
    _useState10 = _slicedToArray(_useState1, 2),
    canopyPct = _useState10[0],
    setCanopyPct = _useState10[1];
  var _useState11 = useState(1.0),
    _useState12 = _slicedToArray(_useState11, 2),
    foliageDensity = _useState12[0],
    setFoliageDensity = _useState12[1];
  var _useState13 = useState(0.25),
    _useState14 = _slicedToArray(_useState13, 2),
    outerFlare = _useState14[0],
    setOuterFlare = _useState14[1];
  var _useState15 = useState(false),
    _useState16 = _slicedToArray(_useState15, 2),
    showOverlay = _useState16[0],
    setShowOverlay = _useState16[1];
  var _useState17 = useState(true),
    _useState18 = _slicedToArray(_useState17, 2),
    showShadows = _useState18[0],
    setShowShadows = _useState18[1];
  var _useState19 = useState({
      base: true,
      foliage: true,
      filler: true,
      secondary: true,
      focal: true
    }),
    _useState20 = _slicedToArray(_useState19, 2),
    layersOn = _useState20[0],
    setLayersOn = _useState20[1];
  var _useState21 = useState(JSON.stringify(SAMPLE_BLUEPRINT, null, 2)),
    _useState22 = _slicedToArray(_useState21, 2),
    jsonText = _useState22[0],
    setJsonText = _useState22[1];
  var _useState23 = useState(SAMPLE_BLUEPRINT),
    _useState24 = _slicedToArray(_useState23, 2),
    blueprint = _useState24[0],
    setBlueprint = _useState24[1];
  var _useState25 = useState(null),
    _useState26 = _slicedToArray(_useState25, 2),
    jsonError = _useState26[0],
    setJsonError = _useState26[1];
  var _useState27 = useState({
      count: 0,
      rejected: [],
      pxPerIn: 0
    }),
    _useState28 = _slicedToArray(_useState27, 2),
    stats = _useState28[0],
    setStats = _useState28[1];
  var _useState29 = useState(false),
    _useState30 = _slicedToArray(_useState29, 2),
    showJson = _useState30[0],
    setShowJson = _useState30[1];
  var _useState31 = useState([]),
    _useState32 = _slicedToArray(_useState31, 2),
    assets = _useState32[0],
    setAssets = _useState32[1];
  var _useState33 = useState(null),
    _useState34 = _slicedToArray(_useState33, 2),
    openAsset = _useState34[0],
    setOpenAsset = _useState34[1];
  var _useState35 = useState(false),
    _useState36 = _slicedToArray(_useState35, 2),
    busy = _useState36[0],
    setBusy = _useState36[1];
  var _useState37 = useState(false),
    _useState38 = _slicedToArray(_useState37, 2),
    showKit = _useState38[0],
    setShowKit = _useState38[1];
  var _useState39 = useState(null),
    _useState40 = _slicedToArray(_useState39, 2),
    copiedSku = _useState40[0],
    setCopiedSku = _useState40[1];
  var copyPrompt = function copyPrompt(sku) {
    var text = stemPrompt(sku);
    var done = function done() {
      setCopiedSku(sku);
      setTimeout(function () {
        return setCopiedSku(null);
      }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        window.prompt("Copy the prompt:", text);
      });
    } else {
      window.prompt("Copy the prompt:", text);
    }
  };
  var _useState41 = useState(DEFAULT_ED_PROMPT),
    _useState42 = _slicedToArray(_useState41, 2),
    edPrompt = _useState42[0],
    setEdPrompt = _useState42[1];
  var _useState43 = useState(false),
    _useState44 = _slicedToArray(_useState43, 2),
    edBusy = _useState44[0],
    setEdBusy = _useState44[1];
  var _useState45 = useState(null),
    _useState46 = _slicedToArray(_useState45, 2),
    edError = _useState46[0],
    setEdError = _useState46[1];
  var _useState47 = useState(null),
    _useState48 = _slicedToArray(_useState47, 2),
    edResult = _useState48[0],
    setEdResult = _useState48[1];
  var bp = useMemo(function () {
    return Object.assign({}, blueprint, {
      seed: seed
    });
  }, [blueprint, seed]);
  var blueprintSkus = useMemo(function () {
    var s = new Set();
    (bp.foliage_sweeps || []).forEach(function (f) {
      return s.add(f.item_id);
    });
    (bp.clusters || []).forEach(function (c) {
      return c.stems.forEach(function (st) {
        return s.add(st.item_id);
      });
    });
    return Array.from(s);
  }, [bp]);
  var phSil = useMemo(function () {
    var m = {};
    Object.entries(PLACEHOLDERS).forEach(function (_ref2) {
      var _ref3 = _slicedToArray(_ref2, 2),
        k = _ref3[0],
        ph = _ref3[1];
      m[k] = makeProceduralSilhouette(ph);
    });
    return m;
  }, []);
  var resolve = useCallback(function (sku) {
    var up = assets.find(function (a) {
      return a.sku === sku && a.prepared;
    });
    if (up) {
      return {
        kind: "image",
        prepared: up.prepared,
        silhouette: up.silhouette,
        anchor: up.anchor,
        real_width_in: up.real_width_in,
        layer_class: up.layer_class,
        rotation_mode: up.rotation_mode,
        name: up.name
      };
    }
    var ph = PLACEHOLDERS[sku];
    if (ph) return Object.assign({
      kind: "proc",
      silhouette: phSil[sku]
    }, ph);
    return null;
  }, [assets, phSil]);
  useEffect(function () {
    if (!canvasRef.current) return;
    var result = renderComposite(canvasRef.current, bp, {
      layersOn: layersOn,
      showOverlay: showOverlay,
      showShadows: showShadows,
      jitter: jitter,
      globalScale: globalScale,
      lightAngle: lightAngle,
      resolve: resolve,
      sizePx: 1400,
      nesting: nesting,
      canopy: canopyPct,
      foliageDensity: foliageDensity,
      outerFlare: outerFlare
    });
    setStats(result);
  }, [bp, layersOn, showOverlay, showShadows, jitter, globalScale, lightAngle, resolve, nesting, canopyPct, foliageDensity, outerFlare]);
  var rebuildAsset = function rebuildAsset(rec) {
    var img = new Image();
    img.onload = function () {
      var o = ORIENTS.find(function (x) {
        return x.id === rec.orient;
      });
      var prepared = prepareImage(img, o ? o.deg : 0, rec.stripWhite);
      var silhouette = makeSilhouette(prepared);
      setAssets(function (prev) {
        return prev.map(function (a) {
          return a.id === rec.id ? Object.assign({}, a, rec, {
            prepared: prepared,
            silhouette: silhouette
          }) : a;
        });
      });
    };
    img.src = rec.dataUrl;
  };
  var onFiles = function onFiles(e) {
    var files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    var remaining = files.length;
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        var id = __uid++;
        var img = new Image();
        img.onload = function () {
          var prepared = prepareImage(img, 0, true);
          var silhouette = makeSilhouette(prepared);
          var unmapped = blueprintSkus.find(function (s) {
            return !assets.some(function (a) {
              return a.sku === s;
            });
          });
          setAssets(function (prev) {
            return prev.concat([{
              id: id,
              sku: unmapped || "EC-NEW-" + id,
              name: file.name.replace(/\.[^.]+$/, ""),
              dataUrl: reader.result,
              real_width_in: 3.0,
              layer_class: "secondary",
              rotation_mode: "camera_facing",
              orient: "none",
              stripWhite: true,
              anchor: {
                x: 0.5,
                y: 0.5
              },
              prepared: prepared,
              silhouette: silhouette
            }]);
          });
          remaining--;
          if (remaining <= 0) setBusy(false);
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  var updateAsset = function updateAsset(id, patch, reprepare) {
    setAssets(function (prev) {
      var next = prev.map(function (a) {
        return a.id === id ? Object.assign({}, a, patch) : a;
      });
      if (reprepare) {
        var rec = next.find(function (a) {
          return a.id === id;
        });
        if (rec) setTimeout(function () {
          return rebuildAsset(rec);
        }, 0);
      }
      return next;
    });
  };
  var removeAsset = function removeAsset(id) {
    return setAssets(function (prev) {
      return prev.filter(function (a) {
        return a.id !== id;
      });
    });
  };
  var exportManifest = function exportManifest() {
    var out = {
      version: "BRC-3.0",
      exported: new Date().toISOString(),
      assets: assets.map(function (a) {
        return {
          sku: a.sku,
          name: a.name,
          real_width_in: a.real_width_in,
          layer_class: a.layer_class,
          rotation_mode: a.rotation_mode,
          orient: a.orient,
          strip_white: a.stripWhite,
          anchor_point: a.anchor,
          image_dataurl: a.dataUrl
        };
      })
    };
    var blob = new Blob([JSON.stringify(out)], {
      type: "application/json"
    });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "evercrafted-asset-manifest.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  var loadAssetRecord = function loadAssetRecord(rec) {
    var id = __uid++;
    var img = new Image();
    img.onload = function () {
      var o = ORIENTS.find(function (x) {
        return x.id === rec.orient;
      });
      var prepared = prepareImage(img, o ? o.deg : 0, rec.strip_white !== false);
      var silhouette = makeSilhouette(prepared);
      setAssets(function (prev) {
        return prev.concat([{
          id: id,
          sku: rec.sku,
          name: rec.name,
          dataUrl: rec.image_dataurl,
          real_width_in: rec.real_width_in != null ? rec.real_width_in : 3,
          layer_class: rec.layer_class || "secondary",
          rotation_mode: rec.rotation_mode || "camera_facing",
          orient: rec.orient || "none",
          stripWhite: rec.strip_white !== false,
          anchor: rec.anchor_point || {
            x: 0.5,
            y: 0.5
          },
          prepared: prepared,
          silhouette: silhouette
        }]);
      });
    };
    img.src = rec.image_dataurl;
  };
  var importManifest = function importManifest(e) {
    var file = e.target.files && e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        (data.assets || []).forEach(loadAssetRecord);
      } catch (err) {
        alert("Manifest could not be read: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  var restoredRef = useRef(false);
  useEffect(function () {
    if (restoredRef.current) return;
    restoredRef.current = true;
    idbGet("assets").then(function (list) {
      if (Array.isArray(list) && list.length) list.forEach(loadAssetRecord);
    }).catch(function () {});
  }, []);
  useEffect(function () {
    if (!restoredRef.current) return;
    var t = setTimeout(function () {
      var out = assets.map(function (a) {
        return {
          sku: a.sku,
          name: a.name,
          real_width_in: a.real_width_in,
          layer_class: a.layer_class,
          rotation_mode: a.rotation_mode,
          orient: a.orient,
          strip_white: a.stripWhite,
          anchor_point: a.anchor,
          image_dataurl: a.dataUrl
        };
      });
      idbSet("assets", out).catch(function () {});
    }, 800);
    return function () {
      return clearTimeout(t);
    };
  }, [assets]);
  var applyJson = useCallback(function () {
    try {
      var parsed = JSON.parse(jsonText);
      if (!parsed.canvas || !parsed.canvas.diameter_in) throw new Error("canvas.diameter_in is required");
      setBlueprint(parsed);
      if (typeof parsed.seed === "number") setSeed(parsed.seed);
      setJsonError(null);
    } catch (e2) {
      setJsonError(e2.message);
    }
  }, [jsonText]);
  var exportPNG = useCallback(function () {
    var off = document.createElement("canvas");
    renderComposite(off, bp, {
      layersOn: layersOn,
      showOverlay: false,
      showShadows: showShadows,
      jitter: jitter,
      globalScale: globalScale,
      lightAngle: lightAngle,
      resolve: resolve,
      sizePx: 3000,
      nesting: nesting,
      canopy: canopyPct,
      foliageDensity: foliageDensity,
      outerFlare: outerFlare
    });
    var a = document.createElement("a");
    a.href = off.toDataURL("image/png");
    a.download = (bp.blueprint_id || "EC_WR") + "_seed" + seed + "_proof_3000.png";
    a.click();
  }, [bp, layersOn, showShadows, jitter, globalScale, lightAngle, resolve, seed, nesting, canopyPct, foliageDensity, outerFlare]);
  var runEditorial = useCallback(_asyncToGenerator(_regenerator().m(function _callee() {
    var off, renderResult, proofDataUrl, counts, lock, r, data, _t;
    return _regenerator().w(function (_context) {
      while (1) switch (_context.p = _context.n) {
        case 0:
          setEdBusy(true);
          setEdError(null);
          setEdResult(null);
          _context.p = 1;
          off = document.createElement("canvas");
          renderResult = renderComposite(off, bp, {
            layersOn: layersOn,
            showOverlay: false,
            showShadows: showShadows,
            jitter: jitter,
            globalScale: globalScale,
            lightAngle: lightAngle,
            resolve: resolve,
            sizePx: 1408,
            nesting: nesting,
            canopy: canopyPct,
            foliageDensity: foliageDensity,
            outerFlare: outerFlare
          });
          proofDataUrl = off.toDataURL("image/jpeg", 0.92);
          counts = renderResult.itemCounts || {};
          lock = Object.keys(counts).length ? "INVENTORY LOCK \u2014 this wreath contains exactly: " + Object.entries(counts).map(function (_ref5) {
            var _ref6 = _slicedToArray(_ref5, 2),
              n = _ref6[0],
              c = _ref6[1];
            return c + "\xD7 " + n;
          }).join(", ") + ". Every one of these must appear in the output, unchanged in species and color. No other flowers or plants may be added. " + "The greenery must keep its full visible volume, leaf density, and leaf shape \u2014 do not thin, sparse, miniaturize, or convert the foliage into a different greenery species. " + "The base is a natural brown grapevine wreath \u2014 render it as woven woody grapevine branches, not wire. " : "";
          _context.n = 2;
          return fetch("/api/realism", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              image: proofDataUrl,
              prompt: lock + edPrompt,
              mode: "flux-dev",
              strength: 0.3
            })
          });
        case 2:
          r = _context.v;
          _context.n = 3;
          return r.json();
        case 3:
          data = _context.v;
          if (r.ok) {
            _context.n = 4;
            break;
          }
          throw new Error(data && data.error || "Proxy returned " + r.status);
        case 4:
          if (data.output) {
            _context.n = 5;
            break;
          }
          throw new Error("Proxy returned no output image");
        case 5:
          setEdResult({
            url: data.output,
            proofDataUrl: proofDataUrl,
            lock: lock
          });
          _context.n = 7;
          break;
        case 6:
          _context.p = 6;
          _t = _context.v;
          setEdError(_t.message || "Editorial pass failed");
        case 7:
          _context.p = 7;
          setEdBusy(false);
          return _context.f(7);
        case 8:
          return _context.a(2);
      }
    }, _callee, null, [[1, 6, 7, 8]]);
  })), [edPrompt, bp, layersOn, showShadows, jitter, globalScale, lightAngle, resolve, nesting, canopyPct, foliageDensity, outerFlare]);
  var BOOST_PROMPT = "Deepen the physical integration of this wreath photograph. STRICT PRESERVATION: same number of flowers and greenery, " + "same species, same colors, same locations \u2014 do not simplify, remove, or replace anything. " + "Only deepen what exists: arch existing leaves further over flower edges, sink blooms further into the foliage, " + "strengthen insertion shadows and depth layering. Photorealistic, matte silk texture, soft daylight from upper left, " + "clean white background.";
  var runBoost = useCallback(_asyncToGenerator(_regenerator().m(function _callee2() {
    var imgResp, blob, dataUrl, r, data, _t2;
    return _regenerator().w(function (_context2) {
      while (1) switch (_context2.p = _context2.n) {
        case 0:
          if (edResult) {
            _context2.n = 1;
            break;
          }
          return _context2.a(2);
        case 1:
          setEdBusy(true);
          setEdError(null);
          _context2.p = 2;
          _context2.n = 3;
          return fetch(edResult.url);
        case 3:
          imgResp = _context2.v;
          _context2.n = 4;
          return imgResp.blob();
        case 4:
          blob = _context2.v;
          _context2.n = 5;
          return new Promise(function (res, rej) {
            var fr = new FileReader();
            fr.onload = function () {
              return res(fr.result);
            };
            fr.onerror = function () {
              return rej(new Error("Could not read Editorial image"));
            };
            fr.readAsDataURL(blob);
          });
        case 5:
          dataUrl = _context2.v;
          _context2.n = 6;
          return fetch("/api/realism", {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              image: dataUrl,
              prompt: (edResult.lock || "") + BOOST_PROMPT,
              mode: "flux-dev",
              strength: 0.22
            })
          });
        case 6:
          r = _context2.v;
          _context2.n = 7;
          return r.json();
        case 7:
          data = _context2.v;
          if (r.ok) {
            _context2.n = 8;
            break;
          }
          throw new Error(data && data.error || "Proxy returned " + r.status);
        case 8:
          if (data.output) {
            _context2.n = 9;
            break;
          }
          throw new Error("Proxy returned no output image");
        case 9:
          setEdResult({
            url: data.output,
            proofDataUrl: edResult.proofDataUrl,
            lock: edResult.lock
          });
          _context2.n = 11;
          break;
        case 10:
          _context2.p = 10;
          _t2 = _context2.v;
          setEdError(_t2.message || "Blend boost failed");
        case 11:
          _context2.p = 11;
          setEdBusy(false);
          return _context2.f(11);
        case 12:
          return _context2.a(2);
      }
    }, _callee2, null, [[2, 10, 11, 12]]);
  })), [edResult]);
  var mappedCount = blueprintSkus.filter(function (s) {
    return assets.some(function (a) {
      return a.sku === s && a.prepared;
    });
  }).length;
  var silenceRejects = stats.rejected.filter(function (r) {
    return r.reason === "silence_arc";
  }).length;
  var skuRejects = stats.rejected.filter(function (r) {
    return r.reason === "unresolved_sku";
  }).length;
  return React.createElement("div", {
    style: S.app
  }, React.createElement("header", {
    style: S.header
  }, React.createElement("div", null, React.createElement("div", {
    style: S.brand
  }, "Evercrafted"), React.createElement("h1", {
    style: S.title
  }, "Blueprint-to-Render Compositor")), React.createElement("div", {
    style: S.headerMeta
  }, React.createElement("span", {
    style: S.badge
  }, "BRC-3.0 \xB7 Hosted"), React.createElement("span", {
    style: S.badgeOutline
  }, "Proof + Editorial"))), React.createElement("div", {
    style: S.main
  }, React.createElement("div", {
    style: S.canvasWrap
  }, React.createElement("canvas", {
    ref: canvasRef,
    style: S.canvas
  }), React.createElement("div", {
    style: S.canvasFooter
  }, React.createElement("span", null, bp.blueprint_id, " \xB7 ", bp.formula, " \xB7 ", bp.canvas ? bp.canvas.diameter_in : "", "\u2033 form"), React.createElement("span", null, stats.pxPerIn.toFixed(1), " px/in \xB7 seed ", seed, " \xB7 ", mappedCount, "/", blueprintSkus.length, " SKUs live"))), React.createElement("aside", {
    style: S.panel
  }, React.createElement("div", {
    style: S.section
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Seed"), React.createElement("div", {
    style: S.row
  }, React.createElement("input", {
    type: "number",
    value: seed,
    onChange: function onChange(e) {
      return setSeed(parseInt(e.target.value || "0", 10));
    },
    style: S.input
  }), React.createElement("button", {
    onClick: function onClick() {
      return setSeed(Math.floor(Math.random() * 99999));
    },
    style: S.btnGhost
  }, "Reroll"))), React.createElement("div", {
    style: S.section
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Organic Variance \u2014 ", Math.round(jitter * 100), "%"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "1",
    step: "0.05",
    value: jitter,
    onChange: function onChange(e) {
      return setJitter(parseFloat(e.target.value));
    },
    style: S.slider
  }), React.createElement("div", {
    style: S.sectionLabel
  }, "True-Scale Multiplier \u2014 ", globalScale.toFixed(2), "\xD7"), React.createElement("input", {
    type: "range",
    min: "0.8",
    max: "1.25",
    step: "0.01",
    value: globalScale,
    onChange: function onChange(e) {
      return setGlobalScale(parseFloat(e.target.value));
    },
    style: S.slider
  }), React.createElement("div", {
    style: S.sectionLabel
  }, "Key Light \u2014 ", lightAngle, "\xB0"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "360",
    step: "5",
    value: lightAngle,
    onChange: function onChange(e) {
      return setLightAngle(parseInt(e.target.value, 10));
    },
    style: S.slider
  })), React.createElement("div", {
    style: S.section
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Nesting \u2014 built, not placed"), React.createElement("label", {
    style: S.check
  }, React.createElement("input", {
    type: "checkbox",
    checked: nesting,
    onChange: function onChange() {
      return setNesting(function (v) {
        return !v;
      });
    }
  }), React.createElement("span", null, "Foliage collars under blooms")), React.createElement("div", {
    style: S.sectionLabel
  }, "Canopy Overlap \u2014 ", Math.round(canopyPct * 100), "%"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "0.5",
    step: "0.05",
    value: canopyPct,
    onChange: function onChange(e) {
      return setCanopyPct(parseFloat(e.target.value));
    },
    style: S.slider
  }), React.createElement("div", {
    style: S.sectionLabel
  }, "Foliage Density \u2014 ", Math.round(foliageDensity * 100), "%"), React.createElement("input", {
    type: "range",
    min: "0.3",
    max: "1.6",
    step: "0.05",
    value: foliageDensity,
    onChange: function onChange(e) {
      return setFoliageDensity(parseFloat(e.target.value));
    },
    style: S.slider
  }), React.createElement("div", {
    style: S.sectionLabel
  }, "Outer Flare \u2014 ", Math.round(outerFlare * 100), "%"), React.createElement("input", {
    type: "range",
    min: "0",
    max: "0.6",
    step: "0.05",
    value: outerFlare,
    onChange: function onChange(e) {
      return setOuterFlare(parseFloat(e.target.value));
    },
    style: S.slider
  }), React.createElement("div", {
    style: S.hint
  }, "Collars bed every bloom in greenery; canopy redraws a seeded share of foliage OVER flower edges so the Proof interlaces before the AI ever sees it.")), React.createElement("div", {
    style: S.section
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Z-Stack Layers"), LAYER_ORDER.map(function (L) {
    return React.createElement("label", {
      key: L,
      style: S.check
    }, React.createElement("input", {
      type: "checkbox",
      checked: layersOn[L],
      onChange: function onChange() {
        return setLayersOn(function (p) {
          return Object.assign({}, p, _defineProperty({}, L, !p[L]));
        });
      }
    }), React.createElement("span", {
      style: {
        textTransform: "capitalize"
      }
    }, L));
  }), React.createElement("label", {
    style: S.check
  }, React.createElement("input", {
    type: "checkbox",
    checked: showShadows,
    onChange: function onChange() {
      return setShowShadows(function (v) {
        return !v;
      });
    }
  }), React.createElement("span", null, "Silhouette shadows")), React.createElement("label", {
    style: S.check
  }, React.createElement("input", {
    type: "checkbox",
    checked: showOverlay,
    onChange: function onChange() {
      return setShowOverlay(function (v) {
        return !v;
      });
    }
  }), React.createElement("span", null, "Blueprint overlay"))), React.createElement("div", {
    style: S.section
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Engine Report"), React.createElement("div", {
    style: S.stat
  }, React.createElement("span", null, "Instances placed"), React.createElement("b", null, stats.count)), React.createElement("div", {
    style: S.stat
  }, React.createElement("span", null, "Silence-arc enforced"), React.createElement("b", null, silenceRejects)), React.createElement("div", {
    style: S.stat
  }, React.createElement("span", null, "Real assets live"), React.createElement("b", null, mappedCount, " / ", blueprintSkus.length)), React.createElement("div", {
    style: S.stat
  }, React.createElement("span", null, "Unresolved SKUs"), React.createElement("b", {
    style: {
      color: skuRejects ? "#a8502e" : undefined
    }
  }, skuRejects))), React.createElement("button", {
    onClick: exportPNG,
    style: S.btnPrimary
  }, "Export Proof PNG \xB7 3000px"), React.createElement("button", {
    onClick: function onClick() {
      return setShowJson(function (v) {
        return !v;
      });
    },
    style: S.btnGhostWide
  }, showJson ? "Hide" : "Edit", " Blueprint JSON"))), showJson && React.createElement("div", {
    style: S.jsonWrap
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Blueprint JSON \u2014 EC_WR_V2"), React.createElement("textarea", {
    value: jsonText,
    onChange: function onChange(e) {
      return setJsonText(e.target.value);
    },
    spellCheck: false,
    style: S.textarea
  }), React.createElement("div", {
    style: S.row
  }, React.createElement("button", {
    onClick: applyJson,
    style: S.btnPrimary
  }, "Apply Blueprint"), jsonError && React.createElement("span", {
    style: S.error
  }, "\u26A0 ", jsonError))), React.createElement("div", {
    style: S.editorialWrap
  }, React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Editorial Mode \u2014 the only AI touchpoint"), React.createElement("div", {
    style: S.hint
  }, "Connected automatically to this project's own /api/realism endpoint \u2014 same server, no configuration. The pass may heal seams, unify lighting, and add photographic texture. It is instructed to move nothing. You are the QA gate.")), React.createElement("div", {
    style: S.editorialGrid
  }, React.createElement("div", null, React.createElement("label", {
    style: S.fieldLabel
  }, "Realism instruction (preservation language locked in by default)", React.createElement("textarea", {
    value: edPrompt,
    onChange: function onChange(e) {
      return setEdPrompt(e.target.value);
    },
    style: Object.assign({}, S.textarea, {
      height: 150,
      marginBottom: 0
    }),
    spellCheck: false
  })), React.createElement("div", {
    style: Object.assign({}, S.row, {
      marginTop: 12
    })
  }, React.createElement("button", {
    onClick: runEditorial,
    disabled: edBusy,
    style: S.btnPrimary
  }, edBusy ? "Rendering Editorial…" : "Run Editorial Pass"), edError && React.createElement("span", {
    style: S.error
  }, "\u26A0 ", edError))), edResult && React.createElement("div", {
    style: S.compareWrap
  }, React.createElement("div", {
    style: S.compareCol
  }, React.createElement("div", {
    style: S.compareLabel
  }, "Proof \u2014 structural truth"), React.createElement("img", {
    src: edResult.proofDataUrl,
    alt: "Proof render",
    style: S.compareImg
  })), React.createElement("div", {
    style: S.compareCol
  }, React.createElement("div", {
    style: S.compareLabel
  }, "Editorial \u2014 realism pass"), React.createElement("img", {
    src: edResult.url,
    alt: "Editorial render",
    style: S.compareImg
  }), React.createElement("div", {
    style: S.qaBox
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "QA before accepting"), React.createElement("div", {
    style: S.hint
  }, "Same stem count? Same species and colors? Silence arc still bare? Nothing added or moved? If anything drifted, reject \u2014 the Proof is always the source of truth."), React.createElement("div", {
    style: Object.assign({}, S.row, {
      marginTop: 10
    })
  }, React.createElement("a", {
    href: edResult.url,
    target: "_blank",
    rel: "noreferrer",
    style: Object.assign({}, S.btnPrimary, {
      textDecoration: "none",
      display: "inline-block"
    })
  }, "Accept \xB7 Open Full Size"), React.createElement("button", {
    onClick: runBoost,
    disabled: edBusy,
    style: S.btnGhost
  }, edBusy ? "Boosting…" : "Blend Boost — weave deeper"), React.createElement("button", {
    onClick: function onClick() {
      return setEdResult(null);
    },
    style: S.btnDanger
  }, "Reject \u2014 keep Proof"))))))), React.createElement("div", {
    style: S.libraryWrap
  }, React.createElement("div", {
    style: S.libraryHeader
  }, React.createElement("div", null, React.createElement("div", {
    style: S.sectionLabel
  }, "Asset Library \u2014 your real stems"), React.createElement("div", {
    style: S.hint
  }, "Upload cutout PNGs (white backgrounds are stripped automatically). Tag SKU, true width, layer, and anchor. Your library now saves itself in this browser and survives reloads \\u2014 the manifest export is your backup and your transfer between devices.")), React.createElement("div", {
    style: S.row
  }, React.createElement("button", {
    onClick: function onClick() {
      return fileRef.current && fileRef.current.click();
    },
    style: S.btnPrimary
  }, busy ? "Loading…" : "Upload Cutouts"), React.createElement("button", {
    onClick: exportManifest,
    style: S.btnGhost,
    disabled: !assets.length
  }, "Export Manifest"), React.createElement("button", {
    onClick: function onClick() {
      return manifestRef.current && manifestRef.current.click();
    },
    style: S.btnGhost
  }, "Import Manifest"), React.createElement("button", {
    onClick: function onClick() {
      return setShowKit(function (v) {
        return !v;
      });
    },
    style: S.btnGhost
  }, showKit ? "Hide" : "Stem", " Prompt Kit")), React.createElement("input", {
    ref: fileRef,
    type: "file",
    accept: "image/png,image/webp,image/jpeg",
    multiple: true,
    style: {
      display: "none"
    },
    onChange: onFiles
  }), React.createElement("input", {
    ref: manifestRef,
    type: "file",
    accept: "application/json",
    style: {
      display: "none"
    },
    onChange: importManifest
  })), showKit && React.createElement("div", {
    style: S.kitWrap
  }, React.createElement("div", {
    style: S.sectionLabel
  }, "Stem Prompt Kit \u2014 generate cutouts for every slot"), React.createElement("div", {
    style: S.hint
  }, "Paste each prompt into Midjourney, pick the cleanest result, upscale, and upload it here \u2014 the white background strips automatically. Foliage prompts come out pre-oriented (base left, tips right) so they import tangent-ready with Orientation: As uploaded."), blueprintSkus.map(function (sku) {
    return React.createElement("div", {
      key: sku,
      style: S.kitRow
    }, React.createElement("div", {
      style: S.kitHead
    }, React.createElement("span", {
      style: S.kitName
    }, sku, PLACEHOLDERS[sku] ? " — " + PLACEHOLDERS[sku].name : ""), React.createElement("button", {
      onClick: function onClick() {
        return copyPrompt(sku);
      },
      style: S.btnGhost
    }, copiedSku === sku ? "Copied ✓" : "Copy Prompt")), React.createElement("div", {
      style: S.kitPrompt
    }, stemPrompt(sku)));
  })), !assets.length && React.createElement("div", {
    style: S.empty
  }, "No real assets yet \u2014 rendering on procedural placeholders. Upload cutouts and assign them to blueprint SKUs (", blueprintSkus.join(" · "), ")."), React.createElement("div", {
    style: S.assetGrid
  }, assets.map(function (a) {
    return React.createElement("div", {
      key: a.id,
      style: S.assetCard
    }, React.createElement("div", {
      style: S.assetThumbWrap
    }, a.prepared && React.createElement("img", {
      src: a.prepared.toDataURL(),
      alt: a.name,
      style: S.assetThumb
    })), React.createElement("div", {
      style: S.assetFields
    }, React.createElement("label", {
      style: S.fieldLabel
    }, "SKU mapping", React.createElement("select", {
      value: blueprintSkus.includes(a.sku) ? a.sku : "__custom",
      onChange: function onChange(e) {
        var v = e.target.value;
        if (v === "__custom") return;
        var slot = PLACEHOLDERS[v];
        if (slot) {
          updateAsset(a.id, {
            sku: v,
            real_width_in: slot.real_width_in,
            layer_class: slot.layer_class,
            rotation_mode: slot.rotation_mode
          });
        } else {
          updateAsset(a.id, {
            sku: v
          });
        }
      },
      style: S.select
    }, blueprintSkus.map(function (s) {
      return React.createElement("option", {
        key: s,
        value: s
      }, s, PLACEHOLDERS[s] ? " — " + PLACEHOLDERS[s].name : "");
    }), React.createElement("option", {
      value: "__custom"
    }, "custom\u2026"))), PLACEHOLDERS[a.sku] && React.createElement("div", {
      style: S.hint
    }, "Slot defaults applied: ", PLACEHOLDERS[a.sku].real_width_in, "\u2033 \xB7 ", PLACEHOLDERS[a.sku].layer_class, " \xB7 ", PLACEHOLDERS[a.sku].rotation_mode.replace("_", " "), ". Adjust only if your stem differs."), !blueprintSkus.includes(a.sku) && React.createElement("label", {
      style: S.fieldLabel
    }, "Custom SKU", React.createElement("input", {
      value: a.sku,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          sku: e.target.value
        });
      },
      style: S.input
    })), React.createElement("label", {
      style: S.fieldLabel
    }, "True width (inches)", React.createElement("input", {
      type: "number",
      step: "0.1",
      min: "0.5",
      value: a.real_width_in,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          real_width_in: parseFloat(e.target.value || "1")
        });
      },
      style: S.input
    })), React.createElement("label", {
      style: S.fieldLabel
    }, "Layer", React.createElement("select", {
      value: a.layer_class,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          layer_class: e.target.value
        });
      },
      style: S.select
    }, LAYER_ORDER.filter(function (l) {
      return l !== "base";
    }).map(function (l) {
      return React.createElement("option", {
        key: l,
        value: l
      }, l);
    }))), React.createElement("label", {
      style: S.fieldLabel
    }, "Rotation", React.createElement("select", {
      value: a.rotation_mode,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          rotation_mode: e.target.value
        });
      },
      style: S.select
    }, React.createElement("option", {
      value: "camera_facing"
    }, "camera facing"), React.createElement("option", {
      value: "tangent"
    }, "tangent (foliage)"))), React.createElement("label", {
      style: S.fieldLabel
    }, "Orientation", React.createElement("select", {
      value: a.orient,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          orient: e.target.value
        }, true);
      },
      style: S.select
    }, ORIENTS.map(function (o) {
      return React.createElement("option", {
        key: o.id,
        value: o.id
      }, o.label);
    }))), React.createElement("label", {
      style: Object.assign({}, S.check, {
        fontSize: 12.5
      })
    }, React.createElement("input", {
      type: "checkbox",
      checked: a.stripWhite,
      onChange: function onChange(e) {
        return updateAsset(a.id, {
          stripWhite: e.target.checked
        }, true);
      }
    }), React.createElement("span", null, "Strip white background")), a.rotation_mode === "tangent" && React.createElement("div", {
      style: S.hint
    }, "Tangent stems must grow toward the RIGHT after orientation."), React.createElement("div", {
      style: S.row
    }, React.createElement("button", {
      onClick: function onClick() {
        return setOpenAsset(openAsset === a.id ? null : a.id);
      },
      style: S.btnGhost
    }, openAsset === a.id ? "Close anchor" : "Set anchor"), React.createElement("button", {
      onClick: function onClick() {
        return removeAsset(a.id);
      },
      style: S.btnDanger
    }, "Remove")), openAsset === a.id && a.prepared && React.createElement(AnchorPicker, {
      asset: a,
      onSet: function onSet(anchor) {
        return updateAsset(a.id, {
          anchor: anchor
        });
      }
    })));
  }))), React.createElement("footer", {
    style: S.footer
  }, "AI interprets \xB7 geometry places. The Proof render is permanently authoritative \u2014 Editorial output that adds, removes, or moves any element fails QA by definition. Keys live server-side only."));
}
var S = {
  app: {
    minHeight: "100vh",
    background: "#F9F7F4",
    color: "#26241F",
    fontFamily: "'Inter', sans-serif",
    padding: "28px clamp(16px,4vw,56px) 48px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    borderBottom: "1px solid rgba(74,103,65,0.22)",
    paddingBottom: 18,
    marginBottom: 26,
    flexWrap: "wrap",
    gap: 12
  },
  brand: {
    fontFamily: "'Italiana', Georgia, serif",
    fontSize: 15,
    letterSpacing: "0.34em",
    textTransform: "uppercase",
    color: "#4A6741",
    fontWeight: 600
  },
  title: {
    fontFamily: "'Italiana', Georgia, serif",
    fontWeight: 500,
    fontSize: "clamp(28px,4vw,42px)",
    margin: "4px 0 0",
    lineHeight: 1.05,
    color: "#2E3F2A"
  },
  headerMeta: {
    display: "flex",
    gap: 10,
    alignItems: "center"
  },
  badge: {
    background: "#4A6741",
    color: "#F9F7F4",
    fontSize: 11,
    letterSpacing: "0.12em",
    padding: "6px 12px",
    borderRadius: 999,
    fontWeight: 500
  },
  badgeOutline: {
    border: "1px solid #B0793F",
    color: "#B0793F",
    fontSize: 11,
    letterSpacing: "0.12em",
    padding: "5px 12px",
    borderRadius: 999,
    fontWeight: 500
  },
  main: {
    display: "flex",
    gap: 26,
    alignItems: "flex-start",
    flexWrap: "wrap"
  },
  canvasWrap: {
    flex: "1 1 520px",
    minWidth: 320
  },
  canvas: {
    width: "100%",
    aspectRatio: "1/1",
    borderRadius: 4,
    display: "block",
    boxShadow: "0 24px 60px -28px rgba(46,63,42,0.35), 0 2px 8px rgba(46,63,42,0.08)",
    background: "#FCFBF8"
  },
  canvasFooter: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 11.5,
    color: "rgba(38,36,31,0.55)",
    marginTop: 10,
    letterSpacing: "0.04em",
    flexWrap: "wrap",
    gap: 6
  },
  panel: {
    flex: "0 0 300px",
    display: "flex",
    flexDirection: "column",
    gap: 18,
    minWidth: 270
  },
  section: {
    background: "#FFFFFF",
    border: "1px solid rgba(74,103,65,0.14)",
    borderRadius: 6,
    padding: "16px 18px"
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "#4A6741",
    fontWeight: 600,
    marginBottom: 10
  },
  row: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap"
  },
  input: {
    padding: "8px 11px",
    border: "1px solid rgba(74,103,65,0.3)",
    borderRadius: 4,
    fontSize: 13.5,
    fontFamily: "'Inter', sans-serif",
    background: "#FCFBF8",
    color: "#26241F",
    width: "100%",
    boxSizing: "border-box"
  },
  select: {
    padding: "8px 11px",
    border: "1px solid rgba(74,103,65,0.3)",
    borderRadius: 4,
    fontSize: 13.5,
    fontFamily: "'Inter', sans-serif",
    background: "#FCFBF8",
    color: "#26241F",
    width: "100%",
    boxSizing: "border-box"
  },
  slider: {
    width: "100%",
    margin: "2px 0 14px"
  },
  check: {
    display: "flex",
    gap: 9,
    alignItems: "center",
    fontSize: 13.5,
    padding: "5px 0",
    cursor: "pointer"
  },
  stat: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "5px 0",
    borderBottom: "1px dashed rgba(74,103,65,0.12)"
  },
  hint: {
    fontSize: 11.5,
    color: "rgba(38,36,31,0.5)",
    marginTop: 8,
    lineHeight: 1.5
  },
  btnPrimary: {
    background: "#2E3F2A",
    color: "#F9F7F4",
    border: "none",
    borderRadius: 4,
    padding: "12px 18px",
    fontSize: 12.5,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif"
  },
  btnGhost: {
    background: "transparent",
    color: "#4A6741",
    border: "1px solid rgba(74,103,65,0.4)",
    borderRadius: 4,
    padding: "9px 14px",
    fontSize: 12.5,
    cursor: "pointer",
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif"
  },
  btnGhostWide: {
    background: "transparent",
    color: "#4A6741",
    border: "1px solid rgba(74,103,65,0.4)",
    borderRadius: 4,
    padding: "12px 18px",
    fontSize: 12.5,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    cursor: "pointer",
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif"
  },
  btnDanger: {
    background: "transparent",
    color: "#a8502e",
    border: "1px solid rgba(168,80,46,0.4)",
    borderRadius: 4,
    padding: "9px 14px",
    fontSize: 12.5,
    cursor: "pointer",
    fontWeight: 500,
    fontFamily: "'Inter', sans-serif"
  },
  jsonWrap: {
    marginTop: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(74,103,65,0.14)",
    borderRadius: 6,
    padding: "16px 18px"
  },
  textarea: {
    width: "100%",
    height: 320,
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 12,
    border: "1px solid rgba(74,103,65,0.25)",
    borderRadius: 4,
    padding: 14,
    background: "#FCFBF8",
    color: "#26241F",
    marginBottom: 12,
    resize: "vertical",
    boxSizing: "border-box"
  },
  error: {
    color: "#a8502e",
    fontSize: 12.5
  },
  editorialWrap: {
    marginTop: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(176,121,63,0.35)",
    borderRadius: 6,
    padding: "18px 20px"
  },
  editorialGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 18
  },
  compareWrap: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 18
  },
  compareCol: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  compareLabel: {
    fontSize: 11,
    letterSpacing: "0.16em",
    textTransform: "uppercase",
    color: "rgba(38,36,31,0.6)",
    fontWeight: 600
  },
  compareImg: {
    width: "100%",
    borderRadius: 4,
    border: "1px solid rgba(74,103,65,0.18)",
    background: "#FCFBF8"
  },
  qaBox: {
    border: "1px dashed rgba(176,121,63,0.45)",
    borderRadius: 6,
    padding: "12px 14px",
    marginTop: 4
  },
  libraryWrap: {
    marginTop: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(74,103,65,0.14)",
    borderRadius: 6,
    padding: "18px 20px"
  },
  libraryHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
    flexWrap: "wrap",
    marginBottom: 14
  },
  empty: {
    padding: "26px 20px",
    textAlign: "center",
    fontSize: 13.5,
    color: "rgba(38,36,31,0.55)",
    border: "1.5px dashed rgba(74,103,65,0.3)",
    borderRadius: 6,
    lineHeight: 1.6
  },
  assetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 16
  },
  assetCard: {
    border: "1px solid rgba(74,103,65,0.16)",
    borderRadius: 6,
    overflow: "hidden",
    background: "#FCFBF8"
  },
  assetThumbWrap: {
    height: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "repeating-conic-gradient(#EFEDE6 0% 25%, #F8F6F1 0% 50%) 0 0 / 18px 18px",
    borderBottom: "1px solid rgba(74,103,65,0.12)"
  },
  assetThumb: {
    maxHeight: 140,
    maxWidth: "92%",
    objectFit: "contain"
  },
  assetFields: {
    padding: "12px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "rgba(38,36,31,0.55)",
    display: "flex",
    flexDirection: "column",
    gap: 4,
    fontWeight: 500
  },
  kitWrap: {
    border: "1px dashed rgba(74,103,65,0.35)",
    borderRadius: 6,
    padding: "14px 16px",
    marginBottom: 16,
    background: "#FCFBF8"
  },
  kitRow: {
    borderTop: "1px solid rgba(74,103,65,0.12)",
    padding: "12px 0"
  },
  kitHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
    flexWrap: "wrap"
  },
  kitName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#2E3F2A"
  },
  kitPrompt: {
    fontFamily: "ui-monospace, Menlo, monospace",
    fontSize: 11.5,
    lineHeight: 1.55,
    color: "rgba(38,36,31,0.75)",
    background: "#FFFFFF",
    border: "1px solid rgba(74,103,65,0.15)",
    borderRadius: 4,
    padding: "10px 12px",
    userSelect: "all",
    wordBreak: "break-word"
  },
  footer: {
    marginTop: 30,
    fontSize: 12,
    color: "rgba(38,36,31,0.5)",
    lineHeight: 1.6,
    borderTop: "1px solid rgba(74,103,65,0.16)",
    paddingTop: 16,
    maxWidth: 760
  }
};
ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(BRCApp, null));