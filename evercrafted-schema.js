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

  // ── Tag normaliser — coerces any AI output into the controlled vocabulary ────
  function normalizeTag(t) {
    t = t || {};
    const hex = (t.colorHex || '').toString().trim();
    const validHex = /^#?[0-9a-fA-F]{6}$/.test(hex);
    return {
      name:      typeof t.name === 'string' ? t.name.slice(0, 120) : '',
      role:      VOCAB.roles.includes(t.role)         ? t.role     : 'secondary',
      pass:      t.pass === 1 ? 1 : 2,
      behavior:  VOCAB.behaviors.includes(t.behavior) ? t.behavior : 'mid',
      movement:  VOCAB.movements.includes(t.movement) ? t.movement : 'still',
      finish:    VOCAB.finishes.includes(t.finish)    ? t.finish   : 'matte',
      palette:   VOCAB.palettes.includes(t.palette)   ? t.palette  : 'neutral-mid',
      ep:        VOCAB.emotions.includes(t.ep)        ? t.ep       : 'trust',
      es:        VOCAB.emotions.includes(t.es)        ? t.es       : '',
      intensity: Array.isArray(t.intensity) && t.intensity.length === 2
                   ? [Math.min(3, Math.max(1, parseInt(t.intensity[0]) || 1)), Math.min(3, Math.max(1, parseInt(t.intensity[1]) || 2))]
                   : [1, 2],
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
  const BU = { heavy: 3.5, mid: 2.5, light: 1.5, wispy: 0.8 }; // stems consumed per unit, by behavior

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
  function runSlotFill(inventory, emotions, formula, intensity, poemEmotions) {
    const pe = poemEmotions || {};
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

      const slotCount = Math.max(1, slots.filter(s => s.role === slot.role).length);
      const zb = Math.round(BUDGET * (ZS[slot.role] || 0.10) / slotCount);
      const sc = Math.max(1, Math.round(zb / (BU[chosen ? chosen.behavior : 'mid'] || 2.5)));
      filled.push({ ...slot, item: chosen, stemCount: sc });
    }
    return filled;
  }

  return { VOCAB, normalizeTag, BUDGET, ZS, BU, SLOT_TEMPLATES, FORMULA_ARCS, runSlotFill };
});
