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

  // ── Emotion bridge: our 13 emotions → (valence, arousal) ────────────────────
  // The console runs on a 2D valence/arousal model + 4 quadrants; our product
  // runs on these 13 discrete emotions. This ONE table reconciles them, so the
  // quadrant logic, design-trait derivation, and DNA can all sit on top of our
  // real emotion vocabulary with no drift. Values in [-1, 1]:
  //   valence  = unpleasant (−) … pleasant (+)
  //   arousal  = calm/subdued (−) … energised (+)
  const EMOTION_VA = {
    nostalgia:    [ 0.20, -0.20],  grief:     [-0.80, -0.20],  sadness:      [-0.60, -0.40],
    peace:        [ 0.60, -0.70],  joy:       [ 0.90,  0.60],  longing:      [-0.20,  0.10],
    warmth:       [ 0.70, -0.20],  trust:     [ 0.55, -0.35],  awe:          [ 0.50,  0.70],
    tenderness:   [ 0.70, -0.40],  melancholy:[-0.50, -0.50],  reverence:    [ 0.30, -0.30],
    anticipation: [ 0.40,  0.55],
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

  // ── Real-world geometry, from the wreath-fundamentals skill ──────────────────
  // Nominal size = outer diameter (inches). Radii reproduce the skill's tables so
  // blueprints come out in real inches (a 24" gives r_work = 9.75", r_outer = 12").
  const WREATH_SIZES = {
    12: { rOuter: 6,  rInner: 3.5 },
    18: { rOuter: 9,  rInner: 5.5 },
    22: { rOuter: 11, rInner: 6.75 },
    24: { rOuter: 12, rInner: 7.5 },
  };
  function wreathRadii(diam) {
    diam = (+diam > 0) ? +diam : 22;
    let rOuter, rInner;
    if (WREATH_SIZES[diam]) { rOuter = WREATH_SIZES[diam].rOuter; rInner = WREATH_SIZES[diam].rInner; }
    else { rOuter = diam / 2; rInner = Math.max(2, rOuter - diam * 0.1875); }
    const baseWidth = rOuter - rInner;
    return { diam, rOuter, rInner, baseWidth,
             rWork: (rOuter + rInner) / 2,                 // default placement radius
             rAccent: rOuter - baseWidth * 0.12,           // protruding / outer
             rBase: rInner + baseWidth * 0.22 };           // tucked / inner
  }

  // Rule of odds — snap a cluster's bloom count to an odd number (3, 5, 7…).
  function toOdd(n) { n = Math.max(1, Math.round(n)); return n % 2 ? n : (n - 1 >= 1 ? n - 1 : n + 1); }
  // θ (clockwise from 12) → "h:mm" clock position.
  function degToClock(deg) {
    const t = (((+deg % 360) + 360) % 360) / 360 * 720;     // minutes on a 12h face
    let h = Math.floor(t / 60) % 12; if (h === 0) h = 12;
    const m = Math.round(t % 60);
    return m === 60 ? `${(h % 12) + 1}:00` : `${h}:${String(m).padStart(2, '0')}`;
  }

  // ── Seasonal styles (from the seasonal-styles skill) — selection + Stylist ───
  const SEASONS = {
    spring:     { palette: ['blush', 'lavender', 'mint', 'butter yellow', 'white'], base: 'grapevine',
                  elements: ['ranunculus', 'peony', 'tulip', 'daffodil', 'pussy willow', "lamb's ear", 'moss'],
                  focalAngles: [60, 180, 300], flow: 'clockwise',
                  note: 'Abundant but light. Keep outer elements loose and slightly protruding to suggest growth; avoid dense packing.' },
    summer:     { palette: ['coral', 'fuchsia', 'sunshine yellow', 'bright white', 'tropical green'], base: 'grapevine',
                  elements: ['sunflower', 'zinnia', 'dahlia', 'black-eyed susan', 'lavender', 'rosemary'],
                  focalAngles: [60, 180, 300], flow: 'balanced',
                  note: 'Bold high-contrast combinations. More is more; face focal blooms outward for impact.' },
    fall:       { palette: ['burnt orange', 'rust', 'deep burgundy', 'mustard', 'chocolate brown'], base: 'grapevine',
                  elements: ['wheat', 'mini pumpkin', 'maple leaf', 'acorn', 'pine cone', 'mum', 'marigold', 'cinnamon stick'],
                  focalAngles: [45, 135, 225, 315], flow: 'balanced',
                  note: 'Texture variety is key — combine smooth, rough, soft and linear. Or mass on the bottom half for a crescent.' },
    winter:     { palette: ['deep green', 'red', 'gold', 'silver', 'frosted white', 'champagne'], base: 'pine',
                  elements: ['holly berry', 'magnolia leaf', 'ornament', 'cinnamon stick', 'star anise', 'dried orange', 'pine cone'],
                  focalAngles: [180], flow: 'counterclockwise',
                  note: 'Carries the most visual weight. Use outer/protruding placements freely.' },
    valentines: { palette: ['red', 'pink', 'blush', 'white', 'deep burgundy'], base: 'grapevine',
                  elements: ['rose', 'peony', 'ranunculus', "baby's breath"],
                  focalAngles: [180], flow: 'balanced',
                  note: 'Keep it simple — 3 focal roses + filler. Overloading loses the romantic softness.' },
    easter:     { palette: ['pastel pink', 'pastel blue', 'pastel yellow', 'pastel green'], base: 'grapevine',
                  elements: ['speckled egg', 'tulip', 'forsythia'],
                  focalAngles: [45, 135, 225, 315], flow: 'balanced',
                  note: 'Optional color zoning — one pastel hue per quadrant for a modern rainbow effect.' },
  };

  // ── Construction (from the construction skill) — feeds the build guide ────────
  const CONSTRUCTION = {
    buildSequence: ['Base prep — clean, shape, add hanging loop',
                    'Greenery layer — fill gaps, establish base texture',
                    'Filler / secondary elements — medium, distributed evenly',
                    'Focal flowers — largest, placed last for visibility',
                    'Accents — berries, cones, small ornaments',
                    'Finishing — check from a distance, fill thin spots, secure ends'],
    insertionDepthIn: 1.5,
    stemAngleNote: 'Insert toward wreath center (θ + 180°) at a slight inward angle.',
    attachment: { // by element kind → method
      bloom: 'Direct insertion into base; 1.5" minimum depth, wired stem reinforced at the vine join',
      sprig: 'Direct insertion, counterclockwise lean to follow flow',
      cluster: 'Floral pick wrapped with tape, inserted center-pointing',
      heavy: 'Floral wire (22–24 gauge) looped through base and twisted behind',
      dried: 'Dip stem end in white glue, dry 10 min, then insert (prevents crumbling)',
    },
    fixes: { flat: 'Vary r values — some at r_inner, some at r_outer',
             bare: 'Add filler greenery to fill gaps LAST',
             lopsided: 'Counterbalance a heavy cluster with another ~180° opposite',
             falling: 'Re-insert deeper at an inward angle; add wire backup' },
  };

  function seasonFor(input) {
    const s = String(input || '').toLowerCase();
    return SEASONS[s] || (s.includes('spring') ? SEASONS.spring : s.includes('summer') ? SEASONS.summer
      : s.includes('fall') || s.includes('autumn') ? SEASONS.fall : s.includes('winter') || s.includes('christmas') ? SEASONS.winter
      : s.includes('valentine') ? SEASONS.valentines : s.includes('easter') ? SEASONS.easter : null);
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
  function runSlotFill(inventory, emotions, formula, intensity, poemEmotions, wreathDiam, coverageOverride) {
    const pe = poemEmotions || {};
    const diam = (+wreathDiam > 0) ? +wreathDiam : 22;
    // coverage normally comes from the formula's arc; an emotion-derived override
    // (from deriveDesignParams) can take its place to drive counts off feeling.
    const coverage = (+coverageOverride > 0 && +coverageOverride <= 1) ? +coverageOverride : coverageFor(formula);
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
      // COUNTS from the calibrated density law. Greenery/structural form a near-full
      // base spine (≥80% of the ring), while blooms stay within the floral arc — the
      // skill's "greenery runs the full arc, blooms concentrate" rule.
      const isBase = (slot.role === 'greenery' || slot.role === 'structural');
      const lenForRole = Math.PI * diam * (isBase ? (coverage >= 1 ? 1 : Math.max(coverage, 0.80)) : coverage);
      const roleStems = Math.max(roleSlots, Math.round((STEM_DENSITY[slot.role] || 0.12) * lenForRole));
      const stemCount = Math.max(1, Math.round(roleStems / roleSlots));               // stems to BUY for this slot
      let floralUnits = Math.max(1, Math.min(14, stemCount * (PLACE_YIELD[slot.role] || 1))); // units to PLACE
      // rule of odds: bloom clusters read more natural at 3 / 5 / 7
      if (slot.role === 'focal' || slot.role === 'secondary') floralUnits = toOdd(floralUnits);
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
  // radius each role sits at, as a fraction of the OUTER radius. Elements live in
  // the ring annulus (~0.6–1.0), per real working radii: accents protrude near the
  // outer edge, focal/secondary on the work radius, base/structural tucked inner.
  const ROLE_BAND   = { greenery:0.80, structural:0.66, focal:0.78, secondary:0.77, bridge:0.72, accent:0.90, texture:0.74, filler:0.73 };
  const ROLE_Z      = { structural:2, greenery:4, bridge:5, secondary:6, texture:7, focal:8, accent:9, filler:6 };                          // paint / stacking order
  const ROLE_SPREAD = { greenery:15, structural:13, focal:22, secondary:18, bridge:16, accent:17, texture:17, filler:19 };                  // cluster tightness (deg) — focal/secondary spread per skill (~18–28°)
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
    const geom = wreathRadii(wreathDiam);                         // real-inch radii for this size
    // directional stem lean (rhythm): clockwise / counterclockwise / balanced
    const flowBias = opts.flow === 'clockwise' ? 8 : opts.flow === 'counterclockwise' ? -8 : 0;

    // Greenery/structural form a near-full base spine (≥80% of the ring); blooms
    // stay in the floral arc. The bare "breathing point" sits opposite the mass.
    const greenerySpan = full ? 360 : Math.max(span, 360 * 0.80);
    const gapSpan = 360 - greenerySpan;
    const gapCenter = (((anchorDeg + 180) % 360) + 360) % 360;
    const greeneryStart = gapCenter + gapSpan / 2;
    const baseSlotCount = Math.max(1, slots.filter(sl => sl.role === 'greenery' || sl.role === 'structural').length);
    let baseSeen = 0;

    const units = [];
    let focalIdx = 0;
    slots.forEach((sl, si) => {
      const role = sl.role || 'secondary';
      const idx = roleSeen[role] || 0; roleSeen[role] = idx + 1;
      const n = roleTotal[role] || 1;

      // assign this slot's centre angle by its compositional job
      let centerDeg;
      if (full) {
        // RADIAL SYMMETRY: focal points at equal intervals from the bottom (1→180°,
        // 3→60/180/300° triangle, 4→cross), secondary offset between them, rest even.
        if (role === 'focal') {
          const nF = Math.max(1, focalSlots.length);
          centerDeg = 180 + focalIdx * (360 / nF);
          focalIdx++;
        } else if (role === 'secondary' || role === 'bridge') {
          const nF = Math.max(1, focalSlots.length);
          centerDeg = 180 + (360 / (2 * nF)) + idx * (360 / n);
        } else {
          centerDeg = (idx + 0.5) * (360 / n);
        }
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
      const isBaseSpine = !full && (role === 'greenery' || role === 'structural');
      const isCluster   = !full && (role === 'focal' || role === 'secondary' || role === 'bridge');
      const baseOrder = isBaseSpine ? baseSeen++ : 0;

      for (let u = 0; u < unitCount; u++) {
        let deg;
        if (isBaseSpine) {
          // spread evenly across the wide greenery arc (phase-shifted per base slot)
          deg = greeneryStart + greenerySpan * ((u + (baseOrder + 0.5) / baseSlotCount) / unitCount)
                + (seeded(si * 97 + u * 13 + 1) - 0.5) * 6;
        } else if (isCluster) {
          // deterministic fan so a cluster of N always spreads (no stacking)
          const fan = unitCount > 1 ? ((u / (unitCount - 1)) - 0.5) * spreadDeg * wfac : 0;
          deg = centerDeg + fan + (seeded(si * 97 + u * 13 + 1) - 0.5) * spreadDeg * 0.35;
        } else {
          deg = centerDeg + (seeded(si * 97 + u * 13 + 1) - 0.5) * spreadDeg * wfac;
        }
        const r   = Math.max(0.58, Math.min(0.98, band + (seeded(si * 53 + u * 29 + 7) - 0.5) * 0.12));
        const rad = (deg - 90) * Math.PI / 180;
        const rOuterFrac = geom.rOuter; // r is a fraction of outer; multiply for real inches
        units.push({
          slotIndex: si, role, z, deg, r,
          x: Math.cos(rad) * r, y: Math.sin(rad) * r,
          rIn: Math.round(r * rOuterFrac * 100) / 100,           // real-inch radial distance
          clock: degToClock(deg),                                // "h:mm" position
          stemAngle: Math.round((deg + 180) % 360),              // insert toward centre (θ+180)
          sizeFrac, rot: (seeded(si * 31 + u * 7) - 0.5) * 28 + flowBias,
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
    // the intentional bare ring (exposed vine) — the breathing point opposite the mass
    const exposed = full ? null : {
      start: Math.round(((((gapCenter - gapSpan / 2) % 360) + 360) % 360)),
      end:   Math.round(((((gapCenter + gapSpan / 2) % 360) + 360) % 360)),
      span:  Math.round(gapSpan),
    };
    return { units, arc: { s, e: arc.e, span, full }, exposed, anchorDeg, counterDeg, geometry: geom };
  }

  // ── THE BLUEPRINT COMPILER (deterministic) ──────────────────────────────────
  // runSlotFill + placeSlots → a complete, reproducible build document: the JSON
  // blueprint, per-layer placement table (real inches + clock + stem angle),
  // cluster summary, stem proportions, build order, and the structured facts the
  // Stylist agent turns into prose + a Midjourney prompt. No language here.
  const ROLE_LAYER  = { structural: 'base', greenery: 'base', focal: 'focal', secondary: 'support', bridge: 'support', texture: 'filler', filler: 'filler', accent: 'accent' };
  const LAYER_ORDER = ['base', 'support', 'focal', 'filler', 'accent'];
  const LAYER_LABEL = { base: 'Base foliage', support: 'Supporting florals', focal: 'Focal florals', filler: 'Fillers', accent: 'Accents' };
  function _meanAngle(degs) {
    let x = 0, y = 0; degs.forEach(d => { const r = d * Math.PI / 180; x += Math.cos(r); y += Math.sin(r); });
    return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
  }

  function compileBlueprint(filledSlots, formula, opts) {
    opts = opts || {};
    const diam = (+opts.wreathDiam > 0) ? +opts.wreathDiam : 22;
    const slots = (filledSlots || []).filter(s => s && s.item);
    const seasonObj = opts.season ? seasonFor(opts.season) : null;
    const flow = opts.flow || (seasonObj && seasonObj.flow) || 'balanced';
    const placed = placeSlots(slots, formula, { wreathDiam: diam, flow });
    const geom = placed.geometry;
    const emotions = Array.isArray(opts.emotions) ? opts.emotions : (opts.emotions ? [opts.emotions] : []);
    const dp = emotions.length ? deriveDesignParams(emotions) : null;

    const bySlot = {};
    placed.units.forEach(u => { (bySlot[u.slotIndex] = bySlot[u.slotIndex] || []).push(u); });

    // cluster summary (focal first, then supporting)
    const clusters = [];
    slots.forEach((sl, i) => {
      if (sl.role !== 'focal' && sl.role !== 'secondary') return;
      const us = bySlot[i] || []; if (!us.length) return;
      const degs = us.map(u => u.deg);
      const center = _meanAngle(degs);
      clusters.push({ role: sl.role, element: (sl.item && sl.item.name) || '', count: us.length,
        r: Math.round((us.reduce((a, u) => a + u.rIn, 0) / us.length) * 100) / 100,
        theta: Math.round(center), clock: degToClock(center),
        spread_deg: Math.max(0, Math.round(Math.max(...degs) - Math.min(...degs))), bloom_in: sl.bloomSize });
    });
    clusters.sort((a, b) => (a.role === 'focal' ? 0 : 1) - (b.role === 'focal' ? 0 : 1));
    clusters.forEach((c, i) => { c.id = (c.role === 'focal' ? 'F' : 'S') + (i + 1); });

    // placement table, ordered by build layer then angle
    const rows = placed.units.map(u => ({
      element: (slots[u.slotIndex] && slots[u.slotIndex].item) ? slots[u.slotIndex].item.name : u.role,
      role: u.role, layer: ROLE_LAYER[u.role] || 'filler',
      r: u.rIn, theta: Math.round(u.deg), clock: u.clock, stem_angle: u.stemAngle }));
    rows.sort((a, b) => (LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer)) || (a.theta - b.theta));
    rows.forEach((r, i) => { r.n = i + 1; });

    const total = placed.units.length;
    const byLayer = {}; placed.units.forEach(u => { const L = ROLE_LAYER[u.role] || 'filler'; byLayer[L] = (byLayer[L] || 0) + 1; });
    const stemsTotal = slots.reduce((a, s) => a + (s.stemCount || 0), 0);
    const proportions = LAYER_ORDER.map(L => ({ layer: LAYER_LABEL[L], units: byLayer[L] || 0, share: total ? Math.round((byLayer[L] || 0) / total * 100) : 0 }));
    const coverage = placed.arc.full ? 1 : Math.round(placed.arc.span / 360 * 100) / 100;

    const id = 'EC-' + String(formula || '').replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase() + diam + '-' +
               Math.random().toString(36).slice(2, 6).toUpperCase();

    const blueprint = {
      blueprint_id: id, schema: 'EC_CANON_v1', wreath_size_in: diam,
      base: { type: (seasonObj && seasonObj.base) || 'grapevine', r_outer: geom.rOuter, r_inner: geom.rInner,
        base_width: geom.baseWidth, exposed_vine_arc_deg: placed.exposed ? [placed.exposed.start, placed.exposed.end] : null },
      composition: { formula, coverage, flow },
      emotion_profile: dp ? { valence: dp.valence, arousal: dp.arousal, quadrant: dp.quadrant, emotions } : { emotions },
      focal_clusters: clusters,
      layers: LAYER_ORDER.map(L => LAYER_LABEL[L]),
    };

    return {
      blueprint, geometry: geom, exposed: placed.exposed, clusters, placement: rows, proportions,
      counts: { units: total, stems: stemsTotal, byLayer }, buildOrder: CONSTRUCTION.buildSequence.slice(),
      season: seasonObj, designParams: dp, flow,
      // structured facts for the Stylist agent (prose + Midjourney prompt)
      renderFacts: {
        size_in: diam, formula, coverage, quadrant: dp && dp.quadrant, emotions, season: opts.season || null,
        palette: seasonObj ? seasonObj.palette : null, base: (seasonObj && seasonObj.base) || 'grapevine',
        exposed_arc_deg: placed.exposed ? [placed.exposed.start, placed.exposed.end] : null,
        focal_clusters: clusters.map(c => `${c.count}× ${c.element} at ${c.clock}`),
        elements_by_clock: rows.filter(r => r.layer === 'focal' || r.layer === 'support' || r.layer === 'accent')
          .map(r => `${r.element} (${r.layer}) at ${r.clock}`),
        greenery: rows.filter(r => r.layer === 'base').map(r => r.element).filter((v, i, a) => a.indexOf(v) === i),
      },
    };
  }

  // ── THE EMOTION BRIDGE (single source of truth) ─────────────────────────────
  // "AI interprets, geometry places." The AI yields emotions; these pure,
  // deterministic functions turn emotion → design parameters → a suggested
  // formula. No randomness. This is the keystone the drama slider, the DNA
  // readout, the Evaluator, and the memory pipeline all hang from.
  const _clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const _r2 = v => Math.round(v * 100) / 100;

  function quadrantFor(v, a) {
    return v >= 0 && a >= 0 ? 'Festive & Bright'
         : v <  0 && a >= 0 ? 'Dramatic Tension'
         : v >= 0 && a <  0 ? 'Cozy & Calm'
         :                     'Vintage Melancholy';
  }

  // Accepts an emotions array, a comma/slash string, or an {ep, es, blend} object.
  // The primary emotion is weighted higher than secondaries.
  function emotionToVA(emotions) {
    let list = [];
    if (Array.isArray(emotions)) list = emotions;
    else if (typeof emotions === 'string') list = emotions.split(/[,/]/);
    else if (emotions && typeof emotions === 'object') list = [emotions.ep, emotions.es, emotions.blend];
    list = list.filter(Boolean).map(e => String(e).toLowerCase().trim());
    let sv = 0, sa = 0, w = 0;
    list.forEach((e, i) => {
      const va = EMOTION_VA[e];
      if (!va) return;
      const wt = i === 0 ? 1 : 0.6;
      sv += va[0] * wt; sa += va[1] * wt; w += wt;
    });
    const valence = w ? sv / w : 0, arousal = w ? sa / w : 0;
    return { valence, arousal, quadrant: quadrantFor(valence, arousal) };
  }

  // Suggest one of our canonical formulas from derived design params.
  function _formulaFromParams(p) {
    if (p.symmetry >= 0.72) return 'Garden Scatter';                 // balanced / radial
    if (p.quadrant === 'Festive & Bright')  return p.coverage > 0.6 ? 'Bottom Heavy' : 'Focal Burst';
    if (p.quadrant === 'Cozy & Calm')       return p.coverage < 0.45 ? 'Crescent' : 'Side Sweep';
    if (p.quadrant === 'Dramatic Tension')  return 'Wild Asymmetry';
    return 'Bottom Heavy';                                           // Vintage Melancholy: grounded, weeping
  }

  // emotion (or VA) → the design knobs our engine actually uses. This is the
  // console's deriveCanonDNA, retargeted to OUR parameters (coverage, density,
  // spread, symmetry, ratios) instead of the mock DNA fields.
  function deriveDesignParams(input, opts) {
    opts = opts || {};
    const va = (input && typeof input === 'object' && 'valence' in input) ? input : emotionToVA(input);
    const v = _clamp(va.valence, -1, 1), a = _clamp(va.arousal, -1, 1);
    const absA = Math.abs(a);
    const dist = Math.min(1, Math.hypot(v, a) / Math.SQRT2);
    const quadrant = va.quadrant || quadrantFor(v, a);

    const density       = _r2(_clamp(0.35 + absA * 0.50 + (v > 0 ? v * 0.12 : 0), 0.30, 0.95));
    const negativeSpace = _r2(_clamp(absA * 0.35 + (v < 0 ? -v * 0.35 : 0), 0, 0.70));
    const coverage      = _r2(_clamp(0.70 - negativeSpace * 0.55, 0.28, 0.78));
    // asymmetric is the house style; only abundant/positive-energetic designs
    // approach radial symmetry (Garden Scatter). Negative space pulls it down.
    const symmetry      = _r2(_clamp(0.35 + (v > 0 ? v * 0.25 : 0) + (a > 0 ? a * 0.15 : 0) - negativeSpace * 0.30, 0, 1));
    const spreadDeg     = Math.round(_clamp(40 + v * 30 + a * 10, 15, 90));
    const greeneryRatio = _r2(_clamp(0.30 + dist * 0.25 + (v < 0 ? 0.08 : 0), 0.30, 0.70));
    const focalRatio    = _r2(_clamp(0.32 - density * 0.22, 0.10, 0.30));
    const focalDepth    = _r2(_clamp(0.40 + density * 0.50, 0.40, 0.95));
    const styleSignature = quadrant === 'Festive & Bright' ? 'abundant'
                         : quadrant === 'Cozy & Calm'      ? 'minimal'
                         : quadrant === 'Dramatic Tension' ? 'editorial' : 'memorial';
    const cp = (opts.colorPref || '').toLowerCase();
    const colorBias = cp.includes('warm') ? 'warm' : cp.includes('cool') ? 'cool'
                    : (cp.includes('split') || cp.includes('contrast')) ? 'split'
                    : v > 0.2 ? 'warm' : v < -0.2 ? 'cool' : 'neutral';
    const greeneryDirection = v > 0.2 ? 'outward' : v < -0.2 ? 'inward' : 'balanced';

    const params = { valence: _r2(v), arousal: _r2(a), quadrant, distance: _r2(dist),
      coverage, density, negativeSpace, symmetry, spreadDeg, greeneryRatio, focalRatio,
      focalDepth, styleSignature, colorBias, greeneryDirection };
    params.formula = _formulaFromParams(params);
    return params;
  }

  // Public: emotion(s) → suggested canonical formula.
  function suggestFormula(emotions) { return deriveDesignParams(emotions).formula; }

  return { EC_CANON: 'v1', VOCAB, EMOTION_VA, normalizeTag, unitSpec, BUDGET, ZS, BU,
           SLOT_TEMPLATES, FORMULA_ARCS, runSlotFill, STEM_DENSITY, PLACE_YIELD, coverageFor,
           ROLE_BAND, ROLE_Z, placeSlots, quadrantFor, emotionToVA, deriveDesignParams, suggestFormula,
           WREATH_SIZES, wreathRadii, toOdd, degToClock, SEASONS, seasonFor, CONSTRUCTION, compileBlueprint };
});
