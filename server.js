require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3001;
const MODEL = 'claude-sonnet-4-20250514';

// ── Input Sanitization ────────────────────────────────────────────────────────
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // Strip HTML tags
    .replace(/<[^>]*>/g, '')
    // Strip script injections
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Strip prompt injection attempts
    .replace(/ignore previous instructions/gi, '')
    .replace(/system prompt/gi, '')
    .replace(/\[INST\]/gi, '')
    .replace(/<<SYS>>/gi, '')
    // Strip SQL injection patterns
    .replace(/('|"|;|--|\bDROP\b|\bSELECT\b|\bINSERT\b|\bDELETE\b)/gi, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Limit length
    .slice(0, 2000)
    .trim();
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Supabase (waitlist storage) ─────────────────────────────────────────────
// Uses the service role key server-side so inserts bypass RLS. If the env vars
// are not set, /api/waitlist falls back to writing the local waitlist.json file.
let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

// ── CORS ──────────────────────────────────────────────────────────────────────
const EXTRA_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5500',
      'http://localhost:8080',
      'http://127.0.0.1:5500',
      ...EXTRA_ORIGINS,
    ];
    // Allow file:// origins (origin is 'null' as a string) and listed origins
    if (!origin || origin === 'null' || allowed.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
}));
app.use(express.json({ limit: '12mb' })); // headroom for base64 photo uploads to /api/tag

// ── Request logging ───────────────────────────────────────────────────────────
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.path} - ${res.statusCode} - ${Date.now() - start}ms`);
  });
  next();
});

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, service: 'evercrafted-api' }));

// ── Static site (local dev / preview) ─────────────────────────────────────────
// Serves the self-contained .html pages so `node server.js` runs the whole site
// at one origin. On Vercel the static pages are served by the platform instead
// (see vercel.json); these routes only handle requests reaching the function.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'evercrafted-marketing-site.html')));
app.get('/:page.html', (req, res, next) => {
  const file = path.join(__dirname, `${req.params.page}.html`);
  fs.existsSync(file) ? res.sendFile(file) : next();
});

// ── INVENTORY (exact from handoff) ────────────────────────────────────────────
const INVENTORY = [
  {id:'INV-001',name:'Ivory Garden Rose',color:'#e8e0d0',role:'focal',pass:1,ep:'joy',es:'trust',blend:'romance',behavior:'mid',movement:'still',finish:'satin',palette:'neutral-light',contrast:'unified',intensity:[1,2]},
  {id:'INV-002',name:'Dusty Mauve Peony',color:'#c4a0a0',role:'focal',pass:1,ep:'sadness',es:'trust',blend:'nostalgia',behavior:'heavy',movement:'still',finish:'matte',palette:'neutral-mid',contrast:'unified',intensity:[1,2]},
  {id:'INV-003',name:'Slate Hydrangea',color:'#8090a8',role:'secondary',pass:2,ep:'sadness',es:'surprise',blend:'melancholy',behavior:'mid',movement:'still',finish:'matte',palette:'neutral-mid',contrast:'unified',intensity:[1,2]},
  {id:'INV-004',name:'Dusty Lavender Bundle',color:'#9a8ab0',role:'texture',pass:2,ep:'sadness',es:'trust',blend:'nostalgia',behavior:'light',movement:'still',finish:'raw',palette:'neutral-mid',contrast:'unified',intensity:[1,2]},
  {id:'INV-005',name:'Copper Beech Stem',color:'#8c4a2a',role:'bridge',pass:1,ep:'anticipation',es:'fear',blend:'awe',behavior:'mid',movement:'reaching',finish:'matte',palette:'neutral-dark',contrast:'unified',intensity:[2,3]},
  {id:'INV-006',name:'Sage Eucalyptus',color:'#7a9070',role:'greenery',pass:2,ep:'trust',es:'joy',blend:'romance',behavior:'light',movement:'sweeping',finish:'matte',palette:'botanical-green',contrast:'unified',intensity:[1,1]},
  {id:'INV-007',name:'Silver Brunia Berry',color:'#b8c0c8',role:'accent',pass:2,ep:'surprise',es:'sadness',blend:'melancholy',behavior:'wispy',movement:'still',finish:'metallic',palette:'silver',contrast:'unified',intensity:[1,2]},
  {id:'INV-008',name:'Dried Thistle Head',color:'#7a7890',role:'texture',pass:2,ep:'sadness',es:'disgust',blend:'remorse',behavior:'light',movement:'still',finish:'raw',palette:'neutral-dark',contrast:'unified',intensity:[1,2]},
  {id:'INV-009',name:'Black Fritillaria',color:'#3a3048',role:'accent',pass:1,ep:'fear',es:'sadness',blend:'awe',behavior:'wispy',movement:'reaching',finish:'matte',palette:'neutral-dark',contrast:'stark',intensity:[2,3]},
  {id:'INV-010',name:'Golden Solidago',color:'#c4a040',role:'filler',pass:2,ep:'joy',es:'anticipation',blend:'optimism',behavior:'wispy',movement:'reaching',finish:'metallic',palette:'champagne',contrast:'unified',intensity:[1,2]},
  {id:'INV-011',name:'Preserved Olive Branch',color:'#808860',role:'greenery',pass:2,ep:'trust',es:'joy',blend:'romance',behavior:'light',movement:'sweeping',finish:'matte',palette:'botanical-green',contrast:'unified',intensity:[1,1]},
  {id:'INV-012',name:'Burgundy Velvet Rose',color:'#6a2838',role:'focal',pass:1,ep:'anger',es:'trust',blend:'reverence',behavior:'heavy',movement:'still',finish:'satin',palette:'neutral-dark',contrast:'unified',intensity:[2,3]},
  {id:'INV-013',name:'Pale Ranunculus',color:'#e8d8c8',role:'secondary',pass:2,ep:'joy',es:'surprise',blend:'optimism',behavior:'mid',movement:'still',finish:'satin',palette:'neutral-light',contrast:'unified',intensity:[1,2]},
  {id:'INV-014',name:'Dried Pampas Grass',color:'#c8b890',role:'texture',pass:2,ep:'anticipation',es:'sadness',blend:'melancholy',behavior:'wispy',movement:'weeping',finish:'raw',palette:'champagne',contrast:'unified',intensity:[1,2]},
  {id:'INV-015',name:'Matte Charcoal Branch',color:'#3a3832',role:'structural',pass:1,ep:'sadness',es:'grief',blend:'',behavior:'heavy',movement:'architectural',finish:'matte',palette:'neutral-dark',contrast:'stark',intensity:[2,3]},
  {id:'INV-016',name:'Weeping Silver Eucalyptus',color:'#8a9a8a',role:'structural',pass:1,ep:'peace',es:'reflective',blend:'',behavior:'mid',movement:'weeping',finish:'matte',palette:'neutral-light',contrast:'unified',intensity:[1,2]},
  {id:'INV-017',name:'Champagne Fern',color:'#c8b87a',role:'structural',pass:1,ep:'joy',es:'hope',blend:'',behavior:'mid',movement:'reaching',finish:'metallic',palette:'champagne',contrast:'unified',intensity:[1,2]},
  {id:'INV-018',name:'Bare Black Branch',color:'#1e1c18',role:'structural',pass:1,ep:'grief',es:'sadness',blend:'',behavior:'heavy',movement:'architectural',finish:'gloss',palette:'neutral-dark',contrast:'stark',intensity:[3,3]},
  {id:'INV-019',name:'White Magnolia Spray',color:'#e8e4dc',role:'structural',pass:1,ep:'peace',es:'trust',blend:'',behavior:'mid',movement:'sweeping',finish:'matte',palette:'neutral-light',contrast:'unified',intensity:[1,1]},
  {id:'INV-020',name:'Champagne Berry Cluster',color:'#d4c090',role:'accent',pass:2,ep:'hope',es:'joy',blend:'',behavior:'wispy',movement:'still',finish:'metallic',palette:'champagne',contrast:'unified',intensity:[1,2]},
];

// ── SLOT TEMPLATES (exact from handoff) ───────────────────────────────────────
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

// ── FORMULA ARCS (exact from handoff) ─────────────────────────────────────────
const FORMULA_ARCS = {
  'Crescent':{s:210,e:330},'Side Sweep':{s:240,e:360},'Bottom Heavy':{s:150,e:330},
  'Diagonal Flow':{s:225,e:405},'Focal Burst':{s:270,e:420},'Garden Scatter':{s:0,e:360},
  'Wild Asymmetry':{s:180,e:315},'Half Ring':{s:180,e:360},'Spiral Flow':{s:240,e:420},
};

// ── Zone size ratios by role (percentage of 90-stem budget) ───────────────────
const ZS = {
  structural: 0.20,
  focal:      0.25,
  secondary:  0.20,
  bridge:     0.10,
  greenery:   0.10,
  accent:     0.05,
  texture:    0.05,
  filler:     0.05,
};

// ── Stems per placement unit by behavior ─────────────────────────────────────
const BU = {
  heavy:        5,
  mid:          3,
  light:        2,
  wispy:        1.5,
  architectural:7,
  sweeping:     2,
  weeping:      2,
  reaching:     1.5,
  still:        3,
};

// ── SLOT FILL (exact logic from handoff) ─────────────────────────────────────
function runSlotFill(emotions, formula, intensity, poemEmotions) {
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
    const candidates = INVENTORY.filter(i => {
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
    const budget = 90;
    const zb = Math.round(budget * (ZS[slot.role] || 0.10) / slotCount);
    const sc = Math.max(1, Math.round(zb / (BU[chosen ? chosen.behavior : 'mid'] || 2.5)));
    filled.push({ ...slot, item: chosen, stemCount: sc });
  }
  return filled;
}

// ── Claude helper ─────────────────────────────────────────────────────────────
async function callClaude({ system, prompt, maxTokens }) {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  };
  if (system) params.system = system;
  const response = await client.messages.create(params);
  return response.content.find(b => b.type === 'text')?.text ?? '';
}

function parseJSON(text) {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

// ── Tagging vocabulary + normalisation (shared by /api/tag and /api/inventory) ──
const TAG_ROLES     = ['focal','secondary','greenery','accent','structural','texture','bridge'];
const TAG_BEHAVIORS = ['heavy','mid','light','wispy'];
const TAG_MOVEMENTS = ['weeping','reaching','sweeping','architectural','cascading','still'];
const TAG_FINISHES  = ['matte','satin','metallic','raw','gloss'];
const TAG_PALETTES  = ['neutral-light','neutral-mid','neutral-dark','botanical-green','champagne','silver'];
const TAG_EMOTIONS  = ['nostalgia','grief','sadness','peace','joy','longing','warmth','trust','awe','tenderness','melancholy','reverence','anticipation'];

function normalizeTag(t) {
  t = t || {};
  const hex = (t.colorHex || '').toString().trim();
  const validHex = /^#?[0-9a-fA-F]{6}$/.test(hex);
  return {
    name:      typeof t.name === 'string' ? t.name.slice(0, 120) : '',
    role:      TAG_ROLES.includes(t.role)         ? t.role     : 'secondary',
    pass:      t.pass === 1 ? 1 : 2,
    behavior:  TAG_BEHAVIORS.includes(t.behavior) ? t.behavior : 'mid',
    movement:  TAG_MOVEMENTS.includes(t.movement) ? t.movement : 'still',
    finish:    TAG_FINISHES.includes(t.finish)    ? t.finish   : 'matte',
    palette:   TAG_PALETTES.includes(t.palette)   ? t.palette  : 'neutral-mid',
    ep:        TAG_EMOTIONS.includes(t.ep)        ? t.ep       : 'trust',
    es:        TAG_EMOTIONS.includes(t.es)        ? t.es       : '',
    intensity: Array.isArray(t.intensity) && t.intensity.length === 2
                 ? [Math.min(3, Math.max(1, parseInt(t.intensity[0]) || 1)), Math.min(3, Math.max(1, parseInt(t.intensity[1]) || 2))]
                 : [1, 2],
    colorName: typeof t.colorName === 'string' ? t.colorName.slice(0, 40) : '',
    colorHex:  validHex ? (hex.startsWith('#') ? hex : '#' + hex) : '',
    confidence: (t.confidence && typeof t.confidence === 'object') ? t.confidence : undefined,
  };
}

function parseDataUrl(img) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/.exec(img || '');
  if (m) return { media_type: m[1], data: m[2] };
  return { media_type: 'image/jpeg', data: (img || '').replace(/^data:[^,]*,/, '') };
}

const TAG_SCHEMA_GUIDE = `You are tagging a single faux botanical product for the Evercrafted wreath design engine. Read the name, description, and photo (if given) and assign each field from the exact vocabulary below.

ROLE — the job this piece does in a wreath:
  focal=star bloom (peony, rose, dahlia, hydrangea, magnolia) · secondary=supporting bloom/berry cluster · greenery=foliage/eucalyptus/fern/ivy · accent=tiny detail spray or berry pick · structural=branch/twig/willow/manzanita · texture=dried/textural (pampas, cotton, thistle, wheat, pods)
PASS — 1=foundation layer (structural, focal) · 2=detail layer (everything else)
BEHAVIOR — heavy=large 4"+ blooms/branches · mid=medium 2-4" · light=small/delicate · wispy=very fine/airy
MOVEMENT — weeping=droops/cascades down · reaching=grows up/out · sweeping=horizontal lateral flow · architectural=rigid geometric (bare branches) · cascading=falls in clusters · still=compact/rounded/no direction
FINISH — matte=flat no shine · satin=soft sheen · metallic=gold/silver/champagne reflective · raw=natural dried · gloss=high lacquered shine
PALETTE — neutral-light=white/cream/blush · neutral-mid=mauve/dusty rose/sage/tan · neutral-dark=burgundy/navy/charcoal/rust · botanical-green=any true green · champagne=warm gold/amber/wheat · silver=grey/pewter/platinum
EP/ES — primary then secondary emotion from: nostalgia, grief, sadness, peace, joy, longing, warmth, trust, awe, tenderness, melancholy, reverence, anticipation
INTENSITY — [min,max] on 1-3: 1=soft (peace, tenderness) · 2=medium (nostalgia, warmth) · 3=heavy (grief, awe)`;

// ── POST /api/tag — suggest tags for a single item (text and/or photo) ─────────
app.post('/api/tag', async (req, res) => {
  try {
    const name        = sanitizeInput(req.body.name);
    const description = sanitizeInput(req.body.description);
    const image       = typeof req.body.image === 'string' ? req.body.image : '';
    if (!name && !description && !image) {
      return res.status(400).json({ success: false, error: 'Provide a product name, description, or photo' });
    }

    const prompt = `${TAG_SCHEMA_GUIDE}

Tag this single product.
${name ? `Name: ${name}` : ''}
${description ? `Description: ${description.slice(0, 600)}` : ''}
${image ? 'A product photo is attached — study it for form, finish, colour, and movement.' : ''}

Return ONLY one JSON object, no markdown, no backticks (include a short descriptive "name" — generate one from the photo if no name was given):
{"name":"","role":"","pass":1,"behavior":"","movement":"","finish":"","palette":"","ep":"","es":"","intensity":[1,2],"colorName":"","colorHex":"#RRGGBB","confidence":{"name":"high|medium|low","role":"high|medium|low","movement":"high|medium|low","ep":"high|medium|low","finish":"high|medium|low"}}`;

    const content = [{ type: 'text', text: prompt }];
    if (image) {
      const { media_type, data } = parseDataUrl(image);
      content.push({ type: 'image', source: { type: 'base64', media_type, data } });
    }

    const callOnce = async () => {
      const r = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        system: 'You are a floral product tagging engine. Return ONLY a single valid JSON object. No prose, no markdown, no backticks.',
        messages: [{ role: 'user', content }],
      });
      const text = r.content.find(b => b.type === 'text')?.text ?? '';
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) throw new Error('No JSON object in tag response');
      return JSON.parse(m[0]);
    };

    let raw;
    try { raw = await callOnce(); }
    catch { raw = await callOnce(); }

    return res.json({ success: true, data: normalizeTag(raw) });
  } catch (err) {
    console.error('[/api/tag]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/location ────────────────────────────────────────────────────────
app.post('/api/location', async (req, res) => {
  const location = sanitizeInput(req.body.location);
  if (!location || typeof location !== 'string') {
    return res.status(400).json({ success: false, error: 'location is required' });
  }

  const system = 'You are a location intelligence engine. Return ONLY valid JSON.\n         No markdown, no backticks. Start with { end with }.';

  const locationPrompt = `You are a location intelligence engine for an editorial photography and design system. Research the following location and return structured facts that help an editorial photographer choose the most evocative, authentic lifestyle setting for a luxury product shoot. Think beyond doors — consider canals, houseboats, market terraces, clifftops, piazzas, monastery walls, vineyard gates, harbour docks, coastal shingle, fjord edges.

Location: "${location}"

EMOTION EXTRACTION INSTRUCTION:
Write the poem first (inside your JSON). Then re-read it as if you are reading someone else's work. Ask: what emotions does this poem actually carry — not what the memory described, but what the writing itself reveals? A memory of peace often contains longing. A memory of joy often contains grief for what has passed. Extract the structural emotion (heaviest, most present), the secondary emotion (gives the design character), and the undertone (the quiet one underneath). These three drive the floral placement hierarchy.

Return ONLY valid JSON, no markdown, no backticks:
{
  "city": "primary place name",
  "country": "country or region",
  "known_for": ["3-5 things this place is genuinely known for — specific not generic"],
  "architecture": "dominant architectural character — specific materials, details, colours",
  "landscape": "the natural landscape surrounding or defining this place",
  "lifestyle": "how people actually live here — pace, culture, daily rhythm",
  "light_quality": "quality and character of light here — affected by latitude, coast, season",
  "iconic_surfaces": ["4 specific surfaces unique to this place — e.g. painted houseboat window on a canal"],
  "nearby_notable": "one specific street, waterway, or landmark",
  "palette_suggestion": "3-4 colour words from the local landscape and materials",
  "lifestyle_setting_ideas": ["3 specific lifestyle settings — not doors. E.g. houseboat window, canal boat bow, flower market doorway"]
}`;

  const fallback = {
    city: location, country: '', known_for: [location], architecture: 'local',
    landscape: 'natural', lifestyle: 'local', light_quality: 'natural',
    iconic_surfaces: ['local wall','local feature','waterfront','regional facade'],
    nearby_notable: location, palette_suggestion: 'natural tones',
    lifestyle_setting_ideas: ['local wall','interior scene','waterfront'],
  };

  try {
    let data;
    try {
      const raw = await callClaude({ system, prompt: locationPrompt, maxTokens: 1024 });
      data = parseJSON(raw);
    } catch {
      const raw = await callClaude({ system, prompt: locationPrompt, maxTokens: 1024 });
      data = parseJSON(raw);
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/location]', err.message);
    return res.json({ success: false, error: err.message, data: fallback });
  }
});

// ── POST /api/scene ───────────────────────────────────────────────────────────
app.post('/api/scene', async (req, res) => {
  const a = req.body;
  a.memory    = sanitizeInput(a.memory);
  a.season    = sanitizeInput(a.season);
  a.location  = sanitizeInput(a.location);
  a.timeofday = sanitizeInput(a.timeofday);
  a.who       = sanitizeInput(a.who);
  a.sensory   = sanitizeInput(a.sensory);
  a.feeling   = sanitizeInput(a.feeling);

  const buildPrompt = () => {
    let loc_context = '';
    if (a.locationData) {
      const ld = a.locationData;
      loc_context = `
---
LOCATION INTELLIGENCE (researched facts about ${ld.city}):
- Known for: ${Array.isArray(ld.known_for) ? ld.known_for.join(', ') : ld.known_for}
- Architecture: ${ld.architecture}
- Iconic surfaces: ${Array.isArray(ld.iconic_surfaces) ? ld.iconic_surfaces.join(' / ') : ld.iconic_surfaces}
- Suggested settings: ${Array.isArray(ld.lifestyle_setting_ideas) ? ld.lifestyle_setting_ideas.join(' / ') : ld.lifestyle_setting_ideas}
- Local palette: ${ld.palette_suggestion}
- Nearby landmarks: ${ld.nearby_notable}
---`;
    }

    return `You are Evercrafted's Memory Scene engine. A client has shared a memory for a custom faux botanical wreath commission. Read every detail carefully and imagine where this wreath truly belongs in the world of this memory.

INPUTS:
- Memory: "${a.memory}"
- Season: ${a.season}
- Location: ${a.location || 'unspecified'}
- Time of day: ${a.timeofday}
- Who was there: ${a.who}
- Sensory detail: ${a.sensory || 'unspecified'}
- Underlying feeling: ${a.feeling}${loc_context}

CRITICAL — RENDER SETTING RULES:
The wreath does NOT have to be on a door. It should be placed wherever it most naturally belongs in the world of this memory. Think like an editorial photographer choosing the perfect shot. Consider the full range of possibilities:

WATER + CANAL: front window of a houseboat on an Amsterdam canal with reflections on the water below, rope-hung on the bow of a wooden canal boat, dock post of a harbour cottage
COASTAL: shuttered window of a whitewashed Santorini house, bleached cedar shingle wall of a Nantucket home, Cape Cod beach cottage exterior, weathered sea-salt painted wood
INTERIOR LIFESTYLE: above a fireplace mantle, hanging in a sunlit foyer with marble floors, above a linen headboard in a farmhouse bedroom, on a whitewashed staircase wall, above a kitchen dresser with morning light through muslin curtains, beside a reading chair with a cup of tea on the table
GARDEN + OUTDOOR: hung on an old apple tree in a cottage garden, mounted on a weathered potting shed, against a crumbling garden wall with climbing roses
URBAN + ARCHITECTURAL: wrought iron balcony railing in New Orleans, stone archway of an Italian hill village, cast iron gate of a London townhouse garden, tiled Lisbon entrance with azulejo pattern, ornate Parisian window with ironwork
EUROPEAN SPECIFIC: aged metal gate of a Spanish coastal villa, whitewashed alley wall in Andalusia, stone terrace of a Provence farmhouse, wooden balcony of a Swiss alpine chalet

Read the memory and the feeling first. Let the location and emotion guide the setting choice. A canal memory goes on a houseboat window. A warm grandmother memory goes in a sunlit foyer or above a fireplace. A coastal memory goes on weathered shingle or dock. Do not default to a door or a wall — choose the setting that makes the image feel like it was taken in the exact world of this memory.

EMOTION EXTRACTION INSTRUCTION:
Write the poem first (inside your JSON). Then re-read it as if you are reading someone else's work. Ask: what emotions does this poem actually carry — not what the memory described, but what the writing itself reveals? A memory of peace often contains longing. A memory of joy often contains grief for what has passed. Extract the structural emotion (heaviest, most present), the secondary emotion (gives the design character), and the undertone (the quiet one underneath). These three drive the floral placement hierarchy.

Return ONLY valid JSON, no markdown, no backticks:
{
  "scene_title": "short evocative title (5-8 words, no quotes)",
  "poem": "A lyrical, atmospheric piece 150-180 words. Present tense. Inhabit the memory — not describe it. Include the location naturally, the season's sensory texture, the specific detail they gave you, the feeling underneath. Read like the opening of a literary novel. No rhyme. No clichés. End on something quiet and true.",
  "brief": "One paragraph, 60-80 words, written in warm plain language. Describes what the wreath is for and what it should hold. Not a spec — a human description a client would read and say 'yes, that is exactly it.' Start with the feeling, not the flowers.",
  "emotions": ["emotion1","emotion2","emotion3"],
  "dominant_emotion": "single word — the heaviest, most present emotion in the poem",
  "poem_emotions": {
    "structural": "single word — the emotion that anchors the design. This is the heaviest feeling in the poem, the one that holds everything else. It drives the structural and focal layer. Place it deepest in the arc, most present.",
    "secondary": "single word — the emotion that gives the design its character. Lighter than structural but still visible. Drives secondary and bridge florals. Mid-ring placement.",
    "undertone": "single word — the emotion you almost missed. The quiet one underneath. Drives texture and accent choices. Outermost placement, discovered on close inspection."
  },
  "placement_weights": {
    "structural": "heavy — anchors the arc, placed first, most visual mass",
    "secondary": "mid — fills around the focal, supports the narrative",
    "undertone": "light — edge pieces, the feeling at the end of the breath"
  },
  "formula": "one of: Crescent, Side Sweep, Bottom Heavy, Diagonal Flow, Focal Burst, Garden Scatter, Wild Asymmetry, Half Ring, Spiral Flow",
  "formula_reason": "one sentence — why this formula for this feeling. Plain language.",
  "intensity": 1,
  "palette_words": ["word1","word2","word3"],
  "render_setting": "Describe the exact setting you chose and why it belongs to this memory. Be highly specific — name the surface, the surrounding architecture, the light quality, what is visible in soft focus behind the wreath. This should feel like a real place a photographer found, not a prop wall in a studio. Include one detail from the background that ties it to the location.",
  "render_surface": "The specific thing the wreath is on or near — one concise phrase e.g. 'the painted wooden window frame of a houseboat on the Prinsengracht canal' or 'above the stone fireplace of a Provencal farmhouse' or 'the salt-bleached shingle wall of a Nantucket cottage'",
  "render_prompt": "Full Midjourney/Flux render prompt. Open with: Luxury faux botanical wreath, [formula] composition, [render_surface]. Then describe: [season] [time of day] light quality in specific atmospheric terms. Emotional tone: [emotions]. Palette: [palette_words joined naturally]. What is visible in the background — specific to the location and setting. Close with: Premium silk and preserved botanicals, no fresh flowers. Fine art editorial photography, shallow depth of field, [specific light description matching time of day and season]. --ar 4:5 --style raw --q 2",
  "map_query": "city name + country for map embed (e.g. Benidorm Spain). If no location given, use Columbus Ohio"
}`;
  };

  function isValid(data) {
    return data && data.poem && Array.isArray(data.emotions) && data.formula &&
           data.poem_emotions && data.poem_emotions.structural && data.poem_emotions.secondary && data.poem_emotions.undertone;
  }

  try {
    let data;
    try {
      const raw = await callClaude({ prompt: buildPrompt(), maxTokens: 2400 });
      data = parseJSON(raw);
      if (!isValid(data)) throw new Error('Missing required fields');
    } catch {
      const raw = await callClaude({ prompt: buildPrompt(), maxTokens: 2400 });
      data = parseJSON(raw);
      if (!isValid(data)) throw new Error('Missing required fields after retry');
    }
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/scene]', err.message);
    return res.json({ success: false, error: err.message });
  }
});

// ── POST /api/blueprint — deterministic, no AI call ───────────────────────────
app.post('/api/blueprint', (req, res) => {
  try {
    const { emotions, formula, intensity, poem_emotions } = req.body;

    if (!emotions || !Array.isArray(emotions)) {
      return res.status(400).json({ success: false, error: 'emotions array is required' });
    }
    if (!formula) {
      return res.status(400).json({ success: false, error: 'formula is required' });
    }

    const intensityNum = Math.min(3, Math.max(1, parseInt(intensity) || 1));
    const slots = runSlotFill(emotions, formula, intensityNum, poem_emotions);
    const totalStems = slots.reduce((sum, s) => sum + s.stemCount, 0);
    const arcConfig = FORMULA_ARCS[formula] || FORMULA_ARCS['Crescent'];

    return res.json({
      success: true,
      data: { slots, totalStems, arcConfig },
    });
  } catch (err) {
    console.error('[/api/blueprint]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── SHOP DATA (loaded once at startup) ───────────────────────────────────────
const SHOP_DATA = JSON.parse(fs.readFileSync('./evercrafted-shop-data.json', 'utf8'));

// ── Gap scoring helpers ───────────────────────────────────────────────────────

function buildReason(item, slot, filledSlots, poemEmotions) {
  const tierKey = slot.tier === 'Foundation' ? 'structural'
                : slot.tier === 'Secondary' || slot.tier === 'Bridge' ? 'secondary'
                : 'undertone';
  const pe = poemEmotions ? poemEmotions[tierKey] : null;
  const emotionMatch = pe && ([item.ep, item.es].includes(pe));
  const existingArchetypes = filledSlots.filter(s => s.item).map(s => s.item.movement);
  const addsVariety = !existingArchetypes.includes(item.movement);

  let reason = '';
  if (emotionMatch) {
    const layer = slot.tier === 'Foundation' ? 'heart'
                : slot.tier === 'Secondary'  ? 'character'
                : 'quiet undertone';
    reason += `Carries ${pe} — the ${layer} of this design. `;
  }
  if (addsVariety) {
    reason += `Its ${item.movement} movement brings something the composition doesn't have yet.`;
  } else {
    reason += `Works in the ${slot.role} layer without repeating what's already there.`;
  }
  return reason.trim();
}

function scoreShopItem(item, slot, filledSlots, poemEmotions, archetypeCountMap) {
  // Hard exclusions
  if (item.role !== slot.role) return null;
  const filledIds = new Set(filledSlots.filter(s => s.item).map(s => s.item.id));
  if (filledIds.has(item.id)) return null;
  if ((archetypeCountMap[item.movement] || 0) >= 2) return null;

  let score = 0;

  // roleMatch — guaranteed by filter above, add base points
  score += 3;

  // emotionMatch — ep and es against tier emotion tags
  const pe = poemEmotions || {};
  const tierEmotion = slot.tier === 'Foundation' ? pe.structural
                    : (slot.tier === 'Secondary' || slot.tier === 'Bridge') ? pe.secondary
                    : pe.undertone;

  const slotEmotions = [slot.ep, slot.es].filter(Boolean).map(e => e.toLowerCase());
  const itemEmotions = [item.ep, item.es, item.blend].filter(Boolean).map(e => e.toLowerCase());

  // emotion match against slot's own ep/es tags
  itemEmotions.forEach(e => { if (slotEmotions.includes(e)) score += 2; });

  // poemBonus
  if (tierEmotion) {
    const te = tierEmotion.toLowerCase();
    if (slot.tier === 'Foundation' && itemEmotions.includes(te)) score += 3;
    else if ((slot.tier === 'Secondary' || slot.tier === 'Bridge') && itemEmotions.includes(te)) score += 2;
    else if ((slot.tier === 'Texture' || slot.tier === 'Accent') && itemEmotions.includes(te)) score += 1;
  }

  // archetypeCompat — adds variety vs clashes
  const neighborMovements = filledSlots.filter(s => s.item && s.tier === slot.tier).map(s => s.item.movement);
  const CLASHING_PAIRS = { weeping: 'architectural', architectural: 'weeping' };
  if (slot.movement && CLASHING_PAIRS[slot.movement] === item.movement) score -= 3;
  if (!neighborMovements.includes(item.movement)) score += 2;
  else score -= 1;

  // finishHarmony — match finish of existing items in same tier
  const neighborFinishes = filledSlots.filter(s => s.item && s.tier === slot.tier).map(s => s.item.finish);
  if (neighborFinishes.includes(item.finish)) score += 1;

  // paletteCompat — palette field match
  const slotPalette = slot.palette || '';
  if (slotPalette && item.palette === slotPalette) score += 1;

  // emotionRepeat penalty — ep/es already present in same tier
  const tierFilledEmotions = filledSlots
    .filter(s => s.item && s.tier === slot.tier)
    .flatMap(s => [s.item.ep, s.item.es].filter(Boolean).map(e => e.toLowerCase()));
  itemEmotions.forEach(e => { if (tierFilledEmotions.includes(e)) score -= 2; });

  return score;
}

// ── POST /api/gaps ────────────────────────────────────────────────────────────
app.post('/api/gaps', (req, res) => {
  try {
    const { filledSlots, formula, emotions, poemEmotions, clientInventory } = req.body;

    if (!filledSlots || !Array.isArray(filledSlots)) {
      return res.status(400).json({ success: false, error: 'filledSlots array is required' });
    }

    // Build movement archetype count from already-filled slots
    const archetypeCountMap = {};
    filledSlots.forEach(s => {
      if (s.item) {
        const mv = s.item.movement;
        archetypeCountMap[mv] = (archetypeCountMap[mv] || 0) + 1;
      }
    });

    // Identify gap slots (item is null)
    const gapSlots = filledSlots.filter(s => !s.item);

    const gaps = gapSlots.map(slot => {
      const scored = SHOP_DATA
        .map(item => {
          const s = scoreShopItem(item, slot, filledSlots, poemEmotions, archetypeCountMap);
          return s !== null ? { item, score: s } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      const suggestions = scored.map(({ item }) => ({
        id:           item.id,
        sku:          item.sku,
        name:         item.name,
        price:        item.price,
        imageUrl:     item.imageUrl,
        colorName:    item.colorName,
        colorHex:     item.colorHex,
        role:         item.role,
        movement:     item.movement,
        finish:       item.finish,
        ep:           item.ep,
        palette:      item.palette,
        inStock:      item.inStock,
        addToCartUrl: `/shop/${item.sku}`,
        reason:       buildReason(item, slot, filledSlots, poemEmotions),
      }));

      return {
        slot: { role: slot.role, tier: slot.tier },
        suggestions,
      };
    });

    return res.json({
      success: true,
      data: {
        gapCount:    gaps.length,
        fullyFilled: gaps.length === 0,
        gaps,
      },
    });
  } catch (err) {
    console.error('[/api/gaps]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/waitlist ────────────────────────────────────────────────────────
const WAITLIST_PATH = './waitlist.json';

app.post('/api/waitlist', async (req, res) => {
  try {
    const email       = sanitizeInput(req.body.email).slice(0, 254);
    const scene_title = sanitizeInput(req.body.scene_title);
    const memory      = sanitizeInput(req.body.memory);
    const source      = sanitizeInput(req.body.source) || 'try-page';
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email is required' });
    }

    const entry = {
      email:       email.trim().toLowerCase(),
      scene_title: scene_title || '',
      memory:      memory || '',
      source,
    };

    if (supabase) {
      const { error } = await supabase.from('waitlist').insert(entry);
      if (error) throw new Error(error.message);
      console.log(`[/api/waitlist] (supabase) ${entry.email} — ${entry.scene_title}`);
      return res.json({ success: true });
    }

    // Fallback: append to local waitlist.json (local dev only — not durable on Vercel)
    let list = [];
    try { list = JSON.parse(fs.readFileSync(WAITLIST_PATH, 'utf8')); } catch {}
    list.push({ ...entry, timestamp: new Date().toISOString() });
    fs.writeFileSync(WAITLIST_PATH, JSON.stringify(list, null, 2));

    console.log(`[/api/waitlist] (file) ${entry.email} — ${entry.scene_title}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[/api/waitlist]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Inventory (saved tagged items) ────────────────────────────────────────────
const INVENTORY_PATH = './inventory.json';

function inventoryRow(b) {
  const t = normalizeTag(b);
  return {
    owner:           (sanitizeInput(b.owner) || 'default').slice(0, 120),
    name:            sanitizeInput(b.name).slice(0, 160),
    sku:             sanitizeInput(b.sku).slice(0, 80),
    price:           sanitizeInput(String(b.price ?? '')).slice(0, 20),
    image_url:       (typeof b.imageUrl === 'string' ? b.imageUrl : '').slice(0, 2000),
    description:     sanitizeInput(b.description).slice(0, 1000),
    role: t.role, pass: (t.role === 'focal' || t.role === 'structural') ? 1 : 2, behavior: t.behavior, movement: t.movement,
    finish: t.finish, palette: t.palette, ep: t.ep, es: t.es, blend: '',
    intensity: t.intensity, color_name: t.colorName, color_hex: t.colorHex,
    contrast: 'unified',
    in_stock:        b.inStock === false ? false : true,
    stock:           Number.isFinite(+b.stock) ? Math.max(0, parseInt(b.stock)) : 0,
    recommended_qty: Number.isFinite(+b.recommendedQty) ? Math.max(1, parseInt(b.recommendedQty)) : 4,
  };
}

function rowToClient(r) {
  return {
    id: r.id, owner: r.owner, name: r.name, sku: r.sku, price: r.price,
    imageUrl: r.image_url, description: r.description,
    role: r.role, pass: r.pass, behavior: r.behavior, movement: r.movement,
    finish: r.finish, palette: r.palette, ep: r.ep, es: r.es,
    intensity: r.intensity, colorName: r.color_name, colorHex: r.color_hex,
    inStock: r.in_stock, stock: r.stock, recommendedQty: r.recommended_qty,
    createdAt: r.created_at,
  };
}

// Upload a base64 photo to the Supabase Storage bucket, return its public URL
async function uploadInventoryPhoto(imageData, owner) {
  const { media_type, data } = parseDataUrl(imageData);
  const ext = (media_type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${owner}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
  const buf = Buffer.from(data, 'base64');
  const { error } = await supabase.storage.from('inventory-photos').upload(path, buf, { contentType: media_type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from('inventory-photos').getPublicUrl(path).data.publicUrl;
}

// POST /api/inventory — save a tagged item (optionally with a photo to persist)
app.post('/api/inventory', async (req, res) => {
  try {
    if (!sanitizeInput(req.body.name)) {
      return res.status(400).json({ success: false, error: 'name is required' });
    }
    const row = inventoryRow(req.body);
    const imageData = typeof req.body.image === 'string' ? req.body.image : '';

    if (supabase) {
      if (!row.image_url && imageData) {
        try { row.image_url = await uploadInventoryPhoto(imageData, row.owner); }
        catch (e) { console.warn('[/api/inventory] photo upload failed:', e.message); }
      }
      const { data, error } = await supabase.from('inventory').insert(row).select().single();
      if (error) throw new Error(error.message);
      console.log(`[/api/inventory] (supabase) saved ${row.name}`);
      return res.json({ success: true, data: rowToClient(data) });
    }

    // Fallback: append to local inventory.json (local dev only — not durable on Vercel)
    if (!row.image_url && imageData) row.image_url = imageData; // store data URL locally
    const clientRow = rowToClient({
      ...row,
      id: 'inv_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      created_at: new Date().toISOString(),
    });
    let list = [];
    try { list = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')); } catch {}
    list.push(clientRow);
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(list, null, 2));
    console.log(`[/api/inventory] (file) saved ${row.name}`);
    return res.json({ success: true, data: clientRow });
  } catch (err) {
    console.error('[/api/inventory POST]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/inventory/:id — update stock / in-stock flag
app.patch('/api/inventory/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const patch = {};
    if (req.body.stock !== undefined)   patch.stock = Math.max(0, parseInt(req.body.stock) || 0);
    if (req.body.inStock !== undefined) patch.in_stock = !!req.body.inStock;
    if (!Object.keys(patch).length) return res.status(400).json({ success: false, error: 'nothing to update' });

    if (supabase) {
      const { data, error } = await supabase.from('inventory').update(patch).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return res.json({ success: true, data: rowToClient(data) });
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')); } catch {}
    const idx = list.findIndex(x => x.id === id);
    if (idx < 0) return res.status(404).json({ success: false, error: 'not found' });
    if ('stock' in patch)    list[idx].stock = patch.stock;
    if ('in_stock' in patch) list[idx].inStock = patch.in_stock;
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(list, null, 2));
    return res.json({ success: true, data: list[idx] });
  } catch (err) {
    console.error('[/api/inventory PATCH]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/inventory/:id
app.delete('/api/inventory/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (supabase) {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return res.json({ success: true });
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')); } catch {}
    fs.writeFileSync(INVENTORY_PATH, JSON.stringify(list.filter(x => x.id !== id), null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error('[/api/inventory DELETE]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/inventory — list saved items (optionally ?owner=...)
app.get('/api/inventory', async (req, res) => {
  try {
    const owner = sanitizeInput(req.query.owner) || '';
    if (supabase) {
      let q = supabase.from('inventory').select('*').order('created_at', { ascending: false }).limit(1000);
      if (owner) q = q.eq('owner', owner);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return res.json({ success: true, data: (data || []).map(rowToClient) });
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8')); } catch {}
    if (owner) list = list.filter(x => x.owner === owner);
    return res.json({ success: true, data: list.slice().reverse() });
  } catch (err) {
    console.error('[/api/inventory GET]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Evercrafted API running on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('WARNING: ANTHROPIC_API_KEY is not set');
  }
});
