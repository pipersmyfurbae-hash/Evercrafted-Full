/**
 * Evercrafted — SINGLE SOURCE OF TRUTH
 * =====================================
 * The tagging vocabulary, the normaliser, and the selection engine all live
 * here, once. Imported by the Node server, the batch tagger, and the browser
 * engines (memory-scene, v2) so the rules can never drift between them.
 *
 *   Node:    const EC = require('./evercrafted-schema.js');
 *   Browser: <script src="evercrafted-schema.js"></script>  -> window.EC_SCHEMA
 *
 * If you change a vocabulary value or an engine constant, change it HERE and
 * nowhere else.
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.EC_SCHEMA = factory();
})(typeof self !== 'undefined' ? self : this, function () {

  // ── Controlled vocabulary (every tag must be one of these) ──────────────────
  const VOCAB = {
    roles:      ['focal', 'secondary', 'greenery', 'accent', 'structural', 'texture', 'bridge'],
    behaviors:  ['heavy', 'mid', 'light', 'wispy'],
    movements:  ['weeping', 'reaching', 'sweeping', 'architectural', 'cascading', 'still'],
    finishes:   ['matte', 'satin', 'metallic', 'raw', 'gloss'],
    palettes:   ['neutral-light', 'neutral-mid', 'neutral-dark', 'botanical-green', 'champagne', 'silver'],
    emotions:   ['nostalgia', 'grief', 'sadness', 'peace', 'joy', 'longing', 'warmth', 'trust', 'awe', 'tenderness', 'melancholy', 'reverence', 'anticipation'],
  };

  // ── Physical realism: yield, unit size, stem length ────────────────────────
  // A stem/spray usually yields MORE THAN ONE placeable floral or sprig. These
  // drive (A) stem-count math and (B) how many units the visualizer places,
  // true-to-scale. Explicit tagged values win; otherwise we derive a default.
  const DEFAULT_BLOOM = { heavy: 4.5, mid: 2.5, light: 1.5, wispy: 0.9 }; // inches — diameter of one placed unit
  const DEFAULT_STEM  = { heavy: 28,  mid: 22,  light: 18,  wispy: 24 };  // inches — full stem/spray length
  function defaultYield(role, beh) {
    const base = { focal: 1, secondary: 3, greenery: 4, accent: 6, structural: 1, texture: 5, bridge: 2, filler: 6 }[role] || 3;
    const mod  = beh === 'wispy' ? 2 : beh === 'light' ? 1.4 : beh === 'heavy' ? 0.7 : 1;
    return Math.max(1, Math.round(base * mod));
  }
  function defaultUnit(role) {
    return role === 'greenery' ? 'sprig'
      : (role === 'focal' || role === 'secondary' || role === 'bridge') ? 'bloom'
      : (role === 'texture' || role === 'accent') ? 'cluster' : 'sprig';
  }
  // Resolve {yield, bloomSize (in), stemLength (in), unit} for any item — explicit or derived.
  function unitSpec(item) {
    const it = item || {};
    const role = it.role || 'secondary', beh = it.behavior || 'mid';
    return {
      yield:      (+it.yield > 0)      ? Math.round(+it.yield) : defaultYield(role, beh),
      bloomSize:  (+it.bloomSize > 0)  ? +it.bloomSize         : (DEFAULT_BLOOM[beh] || 2.5),
      stemLength: (+it.stemLength > 0) ? +it.stemLength        : (DEFAULT_STEM[beh] || 22),
      unit:       ['bloom', 'sprig', 'cluster', 'segment'].includes(it.unit) ? it.unit : defaultUnit(role),
    };
  }

  // ── Tag normaliser — coerces any AI output into the controlled vocabulary ────
  function normalizeTag(t) {
    t = t || {};
    const hex = (t.colorHex || '').toString().trim();
    const validHex = /^#?[0-9a-fA-F]{6}$/.test(hex);
    const role     = VOCAB.roles.includes(t.role)         ? t.role     : 'secondary';
    const behavior = VOCAB.behaviors.includes(t.behavior) ? t.behavior : 'mid';
    const spec = unitSpec({ role, behavior, yield: t.yield, bloomSize: t.bloomSize, stemLength: t.stemLength, unit: t.unit });
    return {
      name:      typeof t.name === 'string' ? t.name.slice(0, 120) : '',
      role,
      pass:      t.pass === 1 ? 1 : 2,
      behavior,
      movement:  VOCAB.movements.includes(t.movement) ? t.movement : 'still',
      finish:    VOCAB.finishes.includes(t.finish)    ? t.finish   : 'matte',
      palette:   VOCAB.palettes.includes(t.palette)   ? t.palette  : 'neutral-mid',
      ep:        VOCAB.emotions.includes(t.ep)        ? t.ep       : 'trust',
      es:        VOCAB.emotions.includes(t.es)        ? t.es       : '',
      intensity: Array.isArray(t.intensity) && t.intensity.length === 2
                   ? [Math.min(3, Math.max(1, parseInt(t.intensity[0]) || 1)), Math.min(3, Math.max(1, parseInt(t.intensity[1]) || 2))]
                   : [1, 2],
      stemLength: spec.stemLength,
      bloomSize:  spec.bloomSize,
      yield:      spec.yield,
      unit:       spec.unit,
      assetPrompt: typeof t.assetPrompt === 'string' ? t.assetPrompt.slice(0, 500) : '',
      colorName: typeof t.colorName === 'string' ? t.colorName.slice(0, 40) : '',
      colorHex:  validHex ? (hex.startsWith('#') ? hex : '#' + hex) : '',
      confidence: (t.confidence && typeof t.confidence === 'object') ? t.confidence : undefined,
    };
  }

  // ── Engine constants (CANONICAL — these are the live memory-scene values) ────
  const BUDGET = 90; // total stem budget at 22"
  const ZS = { // zone size ratios by role (share of the budget)
    structural: 0.25, focal: 0.25, secondary: 0.20, bridge: 0.10,
    greenery: 0.12, accent: 0.08, texture: 0.10, filler: 0.05,
  };
  const BU = { heavy: 3.5, mid: 2.5, light: 1.5, wispy: 0.8 }; // (legacy) stems per unit, kept for back-compat

  // ── Real-wreath COUNT model (calibrated to maker field studies) ──────────────
  // Counts are a DENSITY LAW, not a per-size table: stems-to-buy per inch of the
  // COVERED arc. Covered length L = π · D · coverage, and coverage comes from the
  // formula's own arc span (e.g. Crescent 120° = 33%, Bottom Heavy 180° = 50%,
  // Garden Scatter 360° = full round). Validated to reproduce maker count tables
  // across 16"–26" wreaths. THIS is where the studies live — change a count here
  // and nowhere else.
  const STEM_DENSITY = { focal: 0.11, secondary: 0.24, bridge: 0.12, greenery: 0.29, accent: 0.17, texture: 0.16, structural: 0.06, filler: 0.17 };
  // how many visible placed units one bought stem becomes on the wreath
  // (greenery/texture get cut into several sprigs; blooms are placed ~1:1)
  const PLACE_YIELD = { focal: 1, secondary: 1, bridge: 1, greenery: 2, accent: 1, texture: 2, structural: 1, filler: 2 };
  // coverage fraction of the ring from a formula's arc (asym 25–72%, full = 100%)
  function coverageFor(formula) {
    const a = FORMULA_ARCS[formula] || FORMULA_ARCS['Crescent'];
    const span = (((a.e - a.s) + 360) % 360) || 360;
    return span >= 359 ? 1 : Math.max(0.25, Math.min(0.72, span / 360));
  }

  const SLOT_TEMPLATES = {
    'Crescent':[{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'greenery',tier:'Greenery'},{role:'accent',tier:'Accent'},{role:'texture',tier:'Texture'}],
    'Side Sweep':[{role:'structural',tier:'Foundation'},{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'greenery',tier:'Greenery'},{role:'texture',tier:'Texture'},{role:'accent',tier:'Accent'}],
    'Bottom Heavy':[{role:'structural',tier:'Foundation'},{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'greenery',tier:'Greenery'},{role:'texture',tier:'Texture'}],
    'Diagonal Flow':[{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'bridge',tier:'Bridge'},{role:'accent',tier:'Accent'},{role:'greenery',tier:'Greenery'}],
    'Focal Burst':[{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'bridge',tier:'Bridge'},{role:'greenery',tier:'Greenery'},{role:'texture',tier:'Texture'},{role:'accent',tier:'Accent'}],
    'Garden Scatter':[{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'texture',tier:'Texture'},{role:'texture',tier:'Texture'},{role:'greenery',tier:'Greenery'},{role:'greenery',tier:'Greenery'},{role:'accent',tier:'Accent'}],
    'Wild Asymmetry':[{role:'structural',tier:'Foundation'},{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'bridge',tier:'Bridge'},{role:'texture',tier:'Texture'},{role:'accent',tier:'Accent'},{role:'greenery',tier:'Greenery'}],
    'Half Ring':[{role:'structural',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'bridge',tier:'Bridge'},{role:'greenery',tier:'Greenery'},{role:'texture',tier:'Texture'}],
    'Spiral Flow':[{role:'focal',tier:'Foundation'},{role:'focal',tier:'Foundation'},{role:'secondary',tier:'Secondary'},{role:'secondary',tier:'Secondary'},{role:'bridge',tier:'Bridge'},{role:'greenery',tier:'Greenery'},{role:'accent',tier:'Accent'}],
  };

  const FORMULA_ARCS = {
    'Crescent':{s:210,e:330},'Side Sweep':{s:240,e:360},'Bottom Heavy':{s:150,e:330},
    'Diagonal Flow':{s:225,e:405},'Focal Burst':{s:270,e:420},'Garden Scatter':{s:0,e:360},
    'Wild Asymmetry':{s:180,e:315},'Half Ring':{s:180,e:360},'Spiral Flow':{s:240,e:420},
  };

  // ── THE SELECTION ENGINE (single source of truth) ───────────────────────────
  // Slot-fill driven by role slots, poem-emotion tiers, and a variety gate that
  // prevents the same movement or emotion repeating within a tier. NOT a global
  // score ranking — that would converge on the same florals every time.
  function runSlotFill(inventory, emotions, formula, intensity, poemEmotions, wreathDiam) {
    const pe = poemEmotions || {};
    const diam = (+wreathDiam > 0) ? +wreathDiam : 22;
    const coverage = coverageFor(formula);
    const coveredLen = Math.PI * diam * coverage; // inches of ring actually dressed
    const tierEmotionMap = {
      'Foundation': pe.structural ? [pe.structural.toLowerCase(), ...emotions] : emotions,
      'Secondary':  pe.secondary  ? [pe.secondary.toLowerCase(),  ...emotions] : emotions,
      'Bridge':     pe.secondary  ? [pe.secondary.toLowerCase(),  ...emotions] : emotions,
      'Greenery':   emotions,
      'Accent':     pe.undertone  ? [pe.undertone.toLowerCase(),  ...emotions] : emotions,
      'Texture':    pe.undertone  ? [pe.undertone.toLowerCase(),  ...emotions] : emotions,
    };
    const slots = SLOT_TEMPLATES[formula] || SLOT_TEMPLATES['Crescent'];
    const emotionTags = emotions.map(e => e.toLowerCase().trim());
    const usedPerTier = {};
    const filled = [];

    for (const slot of slots) {
      const tier = slot.tier;
      if (!usedPerTier[tier]) usedPerTier[tier] = { archetypes: new Set(), emotions: new Set(), finishes: new Set() };
      const u = usedPerTier[tier];
      const candidates = inventory.filter(i => {
        if (i.role !== slot.role) return false;
        if (i.intensity[0] > intensity + 1 || i.intensity[1] < Math.max(1, intensity - 1)) return false;
        return true;
      });

      const tierTags = tierEmotionMap[slot.tier] || emotionTags;
      const scored = candidates.map(c => {
        const ce = [c.ep, c.es, c.blend].filter(Boolean).map(x => x.toLowerCase());
        const emotMatch = ce.filter(e => tierTags.includes(e)).length;
        const poemBonus = (pe.structural && slot.tier === 'Foundation' && ce.includes(pe.structural.toLowerCase())) ? 3 :
                          (pe.secondary  && (slot.tier === 'Secondary' || slot.tier === 'Bridge') && ce.includes(pe.secondary.toLowerCase())) ? 2 :
                          (pe.undertone  && (slot.tier === 'Texture' || slot.tier === 'Accent') && ce.includes(pe.undertone.toLowerCase())) ? 2 : 0;
        const archOk = !u.archetypes.has(c.movement) ? 1 : 0;
        const emotOk = !ce.some(e => u.emotions.has(e)) ? 2 : 0;
        const finOk = !u.finishes.has(c.finish) ? 1 : 0;
        return { item: c, score: emotMatch * 3 + poemBonus + archOk * 2 + emotOk + finOk };
      }).sort((a, b) => b.score - a.score);

      let chosen = null;
      for (const { item } of scored) {
        const ce = [item.ep, item.es, item.blend].filter(Boolean).map(x => x.toLowerCase());
        if (!u.archetypes.has(item.movement) && !ce.some(e => u.emotions.has(e))) {
          chosen = item;
          u.archetypes.add(item.movement);
          ce.forEach(e => u.emotions.add(e));
          u.finishes.add(item.finish);
          break;
        }
      }
      if (!chosen && candidates.length) chosen = candidates[0];

      const roleSlots = Math.max(1, slots.filter(s => s.role === slot.role).length);
      const spec = unitSpec(chosen);
      // COUNTS from the calibrated density law: total stems for this role across the
      // covered arc, split over its slots; placed units add the cut-into-sprigs factor.
      const roleStems = Math.max(roleSlots, Math.round((STEM_DENSITY[slot.role] || 0.12) * coveredLen));
      const stemCount = Math.max(1, Math.round(roleStems / roleSlots));               // stems to BUY for this slot
      const floralUnits = Math.max(1, Math.min(14, stemCount * (PLACE_YIELD[slot.role] || 1))); // units to PLACE
      filled.push({ ...slot, item: chosen, floralUnits, stemCount, bloomSize: spec.bloomSize, yield: spec.yield, unit: spec.unit });
    }
    return filled;
  }

  // ── THE PLACEMENT ENGINE (single source of truth) ───────────────────────────
  // Where every floral physically goes on the ring. Computed ONCE here, then
  // consumed by BOTH the blueprint dot-map (memory-scene) and the layered build
  // view — so the coordinates can never drift between the two. No live
  // Math.random(): positions are seeded by slot/unit index, so a design looks
  // identical every time it is rendered.
  //
  // Real-wreath model encoded here:
  //   • Coverage arc — partial (asymmetric, bare base shows) or full 360° round.
  //   • Anchor — one dominant focal MASS off-centre at a rule-of-thirds point.
  //   • Counterweight — a lighter diagonal focal cluster, ONLY when there is
  //     enough focal inventory (≥2 focal slots). Anchor required, counter optional.
  //   • Greenery/structural — laid as a continuous base spine along the whole arc,
  //     the connective layer, not a counted point.
  //   • Secondary/bridge — fan out from the anchor toward the counterweight.
  //   • Accent/texture/filler — tucked into the gaps across the floral region.
  //   • True-to-scale — unit size = bloom diameter ÷ wreath diameter.
  const ROLE_BAND   = { greenery:0.82, structural:0.72, focal:0.56, secondary:0.60, bridge:0.50, accent:0.66, texture:0.62, filler:0.62 }; // radius (fraction of ring) the role sits at
  const ROLE_Z      = { structural:2, greenery:4, bridge:5, secondary:6, texture:7, focal:8, accent:9, filler:6 };                          // paint / stacking order
  const ROLE_SPREAD = { greenery:15, structural:13, focal:8,  secondary:12, bridge:12, accent:17, texture:17, filler:19 };                  // cluster tightness (deg)
  const BEH_SIZE    = { heavy:1.25, mid:1, light:0.82, wispy:0.64 };

  function placeSlots(filledSlots, formula, opts) {
    opts = opts || {};
    const wreathDiam = (+opts.wreathDiam > 0) ? +opts.wreathDiam : 22;
    const arc = FORMULA_ARCS[formula] || FORMULA_ARCS['Crescent'];
    const s = arc.s;
    const span = (((arc.e - arc.s) + 360) % 360) || 360;
    const full = span >= 359; // balanced round vs asymmetric partial

    const slots = (filledSlots || []).filter(sl => sl && (sl.item || sl.role));
    const focalSlots   = slots.filter(sl => sl.role === 'focal');
    const counterweight = !full && focalSlots.length >= 2;          // counter optional
    const anchorDeg = full ? s : s + span * 0.38;                   // rule-of-thirds, blooms stay central
    const counterDeg = counterweight ? s + span * 0.70 : null;      // diagonal counter, still inside central band

    const roleTotal = {}, roleSeen = {};
    slots.forEach(sl => { roleTotal[sl.role] = (roleTotal[sl.role] || 0) + 1; });
    const seeded = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

    const units = [];
    let focalIdx = 0;
    slots.forEach((sl, si) => {
      const role = sl.role || 'secondary';
      const idx = roleSeen[role] || 0; roleSeen[role] = idx + 1;
      const n = roleTotal[role] || 1;

      // assign this slot's centre angle by its compositional job
      let centerDeg;
      if (full) {
        centerDeg = s + span * ((idx + 0.5) / n);                              // balanced ring
      } else if (role === 'greenery' || role === 'structural') {
        centerDeg = s + span * ((idx + 0.5) / n);                              // base spine, whole arc
      } else if (role === 'focal') {
        centerDeg = (counterDeg != null && focalIdx >= Math.ceil(focalSlots.length / 2)) ? counterDeg : anchorDeg;
        focalIdx++;
      } else if (role === 'secondary' || role === 'bridge') {
        const t = n > 1 ? idx / (n - 1) : 0.5;
        const lo = anchorDeg - span * 0.10;
        const hi = (counterDeg != null) ? counterDeg : anchorDeg + span * 0.18;
        centerDeg = lo + (hi - lo) * t;                                        // fan anchor→counter
      } else {
        const lo = anchorDeg - span * 0.16;
        const hi = (counterDeg != null) ? counterDeg + span * 0.10 : anchorDeg + span * 0.28;
        centerDeg = lo + (hi - lo) * ((idx + 0.5) / n);                        // fill the gaps
      }

      const band = ROLE_BAND[role] || 0.6;
      const spreadDeg = ROLE_SPREAD[role] || 12;
      const unitCount = Math.max(1, Math.min(16, Math.round(sl.floralUnits || 1)));
      const spec = unitSpec(sl);
      const bloom = (+sl.bloomSize > 0) ? +sl.bloomSize : spec.bloomSize;
      let sizeFrac = (bloom / wreathDiam) * (BEH_SIZE[sl.behavior] || 1) * 1.25;
      sizeFrac = Math.max(0.045, Math.min(0.32, sizeFrac));
      const z = ROLE_Z[role] || 6;
      const wfac = Math.min(2.2, 0.6 + unitCount * 0.18); // more units → wider cluster

      for (let u = 0; u < unitCount; u++) {
        const deg = centerDeg + (seeded(si * 97 + u * 13 + 1) - 0.5) * spreadDeg * wfac;
        const r   = Math.max(0.18, Math.min(0.96, band + (seeded(si * 53 + u * 29 + 7) - 0.5) * 0.16));
        const rad = (deg - 90) * Math.PI / 180;
        units.push({
          slotIndex: si, role, z, deg, r,
          x: Math.cos(rad) * r, y: Math.sin(rad) * r,
          sizeFrac, rot: (seeded(si * 31 + u * 7) - 0.5) * 28,
          name:      (sl.item && sl.item.name) || sl.name || '',
          colorHex:  sl.colorHex || (sl.item && (sl.item.color || sl.item.colorHex)) || '',
          palette:   sl.palette  || (sl.item && sl.item.palette)  || 'neutral-mid',
          behavior:  sl.behavior || (sl.item && sl.item.behavior) || 'mid',
          movement:  sl.movement || (sl.item && sl.item.movement) || 'still',
          ep:        sl.ep       || (sl.item && sl.item.ep)       || '',
          assetUrl:  sl.assetUrl || (sl.item && sl.item.assetUrl) || '',
          stemCount: sl.stemCount || 1,
        });
      }
    });

    units.sort((a, b) => a.z - b.z); // paint base layers first
    return { units, arc: { s, e: arc.e, span, full }, anchorDeg, counterDeg };
  }

  return { VOCAB, normalizeTag, unitSpec, BUDGET, ZS, BU, SLOT_TEMPLATES, FORMULA_ARCS, runSlotFill,
           STEM_DENSITY, PLACE_YIELD, coverageFor, ROLE_BAND, ROLE_Z, placeSlots };
});
