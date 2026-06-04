require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');
const EC = require('./evercrafted-schema.js'); // single source of truth: vocab + normaliser + engine

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

// ── Plan limits & usage metering (admin is always exempt) ─────────────────────
// Monthly caps on the paid AI actions, per subscriber tier. Edit freely.
const I = Infinity;
const TIER_LIMITS = {
  bloom:   { designs: 3, renders: 0,  cutouts: 0  },
  craft:   { designs: I, renders: 20, cutouts: 40 },
  studio:  { designs: I, renders: 120, cutouts: 200 },
  atelier: { designs: I, renders: I,  cutouts: I  },
  admin:   { designs: I, renders: I,  cutouts: I  },
};
// Owners listed here (and anyone whose tier is 'admin') are NEVER limited.
// Your tools run as owner 'default', so YOU are unlimited out of the box.
const ADMIN_OWNERS = (process.env.ADMIN_OWNERS || 'default').split(',').map(s => s.trim()).filter(Boolean);
const USAGE_PATH = './usage.json';
function usagePeriod() { const d = new Date(); return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0'); }
function isAdmin(owner, tier) { return tier === 'admin' || ADMIN_OWNERS.includes(owner || 'default'); }

// Returns { ok, used, limit, unlimited }. Increments the counter when allowed.
async function meter(owner, tier, kind) {
  owner = (owner || 'default'); tier = (tier || 'bloom');
  if (isAdmin(owner, tier)) return { ok: true, unlimited: true };
  const limit = ((TIER_LIMITS[tier] || TIER_LIMITS.bloom)[kind]);
  const period = usagePeriod();
  try {
    if (supabase) {
      const { data } = await supabase.from('usage').select(kind).eq('owner', owner).eq('period', period).maybeSingle();
      const used = data ? (data[kind] || 0) : 0;
      if (limit !== I && used >= limit) return { ok: false, used, limit };
      await supabase.from('usage').upsert({ owner, period, [kind]: used + 1, updated_at: new Date().toISOString() }, { onConflict: 'owner,period' });
      return { ok: true, used: used + 1, limit };
    }
    let all = {}; try { all = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8')); } catch {}
    const key = owner + '|' + period; const row = all[key] || {};
    const used = row[kind] || 0;
    if (limit !== I && used >= limit) return { ok: false, used, limit };
    row[kind] = used + 1; all[key] = row; fs.writeFileSync(USAGE_PATH, JSON.stringify(all, null, 2));
    return { ok: true, used: row[kind], limit };
  } catch (e) {
    return { ok: true, error: e.message }; // never block on a metering failure
  }
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

// GET /api/usage — this month's usage + plan limits (null limit = unlimited)
app.get('/api/usage', async (req, res) => {
  try {
    const owner = sanitizeInput(req.query.owner) || 'default';
    const tier  = sanitizeInput(req.query.tier) || (isAdmin(owner) ? 'admin' : 'bloom');
    const period = usagePeriod();
    const limits = TIER_LIMITS[tier] || TIER_LIMITS.bloom;
    let usage = { designs: 0, renders: 0, cutouts: 0 };
    if (supabase) {
      const { data } = await supabase.from('usage').select('designs,renders,cutouts').eq('owner', owner).eq('period', period).maybeSingle();
      if (data) usage = { designs: data.designs || 0, renders: data.renders || 0, cutouts: data.cutouts || 0 };
    } else {
      let all = {}; try { all = JSON.parse(fs.readFileSync(USAGE_PATH, 'utf8')); } catch {}
      const row = all[owner + '|' + period] || {};
      usage = { designs: row.designs || 0, renders: row.renders || 0, cutouts: row.cutouts || 0 };
    }
    const norm = v => v === I ? null : v;
    res.json({ success: true, admin: isAdmin(owner, tier), period, tier, usage,
      limits: { designs: norm(limits.designs), renders: norm(limits.renders), cutouts: norm(limits.cutouts) } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Static site (local dev / preview) ─────────────────────────────────────────
// Serves the self-contained .html pages so `node server.js` runs the whole site
// at one origin. On Vercel the static pages are served by the platform instead
// (see vercel.json); these routes only handle requests reaching the function.
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'evercrafted-marketing-site.html')));
app.get('/evercrafted-schema.js', (_req, res) => res.type('application/javascript').sendFile(path.join(__dirname, 'evercrafted-schema.js')));
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
const SLOT_TEMPLATES = EC.SLOT_TEMPLATES;

// ── FORMULA ARCS (exact from handoff) ─────────────────────────────────────────
const FORMULA_ARCS = EC.FORMULA_ARCS;

// ── Slot fill: delegates to the single source of truth (evercrafted-schema.js) ─
function runSlotFill(emotions, formula, intensity, poemEmotions, wreathDiam, coverage) {
  return EC.runSlotFill(INVENTORY, emotions, formula, intensity, poemEmotions, wreathDiam, coverage);
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

// ── Tagging normalisation — single source of truth (evercrafted-schema.js) ─────
const normalizeTag = EC.normalizeTag;

function parseDataUrl(img) {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/.exec(img || '');
  if (m) return { media_type: m[1], data: m[2] };
  return { media_type: 'image/jpeg', data: (img || '').replace(/^data:[^,]*,/, '') };
}

// Many catalogue URLs are tiny CDN thumbnails (e.g. ?width=300&height=325).
// Rewrite the size params to request a large render so cutouts aren't grainy.
function hiResImageUrl(url, size = 1600) {
  try {
    if (!/^https?:\/\//i.test(url)) return url;
    const u = new URL(url);
    let changed = false;
    for (const k of ['width', 'height', 'w', 'h', 'maxwidth', 'maxheight']) {
      if (u.searchParams.has(k)) { u.searchParams.set(k, String(size)); changed = true; }
    }
    if (u.searchParams.has('canvas')) { u.searchParams.set('canvas', `${size},${size}`); changed = true; }
    return changed ? u.toString() : url;
  } catch (e) { return url; }
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
INTENSITY — [min,max] on 1-3: 1=soft (peace, tenderness) · 2=medium (nostalgia, warmth) · 3=heavy (grief, awe)
PHYSICAL SIZE & YIELD (critical — one stem is often several placeable pieces):
  stemLength — full length of the whole stem/spray in inches (e.g. a 28" branch)
  bloomSize  — diameter in inches of ONE placeable unit: a single bloom head, floret, or sprig (e.g. a 4.5" peony head, a 1.5" filler floret, a 2" eucalyptus sprig). NOT the whole spray.
  yield      — how many usable florals/sprigs you can cut/use from ONE stem. A focal peony stem ~1. A berry spray ~6. A eucalyptus stem ~4. A filler ~6-8.
  unit       — what one placeable piece is: "bloom" | "sprig" | "cluster" | "segment"
ASSET PROMPT (for generating a clean cutout of ONE unit later):
  assetPrompt — a Midjourney-style prompt for ONE small isolated unit. Be STRICT that it is a single small piece, never a full spray:
    flowers (focal/secondary/bridge): "A single isolated high-end luxury silk [colour] [flower name] — a SINGLE bloom head only, no stem and no leaves, premium faux botanical, delicate fabric petals, facing forward, overhead flat-lay view, studio lighting, pure solid white background"
    greenery/texture/accent: "A single isolated high-end luxury silk [colour] [foliage name] — ONE short sprig, just a small cut tip with a few leaves, NOT a full branch or spray, premium faux foliage, overhead flat-lay view, studio lighting, pure solid white background"
    Use the real name + true colour. One line.`;

// ── POST /api/tag — suggest tags for a single item (text and/or photo) ─────────
app.post('/api/tag', async (req, res) => {
  try {
    let name        = sanitizeInput(req.body.name);
    let description = sanitizeInput(req.body.description);
    let image       = typeof req.body.image === 'string' ? req.body.image : '';

    // Re-tag straight from a catalogue item: resolve its name/description and
    // fetch its photo for Vision (so re-tagging uses the full, real data).
    const catalogueId = sanitizeInput(req.body.catalogueId);
    if (catalogueId) {
      const item = SHOP_DATA.find(x => x.id === catalogueId || x.sku === catalogueId);
      if (item) {
        name = sanitizeInput(item.name);
        description = sanitizeInput(item.description);
        if (item.imageUrl && !image) {
          try {
            const ir = await fetch(hiResImageUrl(item.imageUrl));
            const ct = ir.headers.get('content-type') || 'image/jpeg';
            image = `data:${ct};base64,${Buffer.from(await ir.arrayBuffer()).toString('base64')}`;
          } catch (e) { /* tag from text only if the image can't be fetched */ }
        }
      }
    }

    if (!name && !description && !image) {
      return res.status(400).json({ success: false, error: 'Provide a product name, description, or photo' });
    }

    const prompt = `${TAG_SCHEMA_GUIDE}

Tag this single product.
${name ? `Name: ${name}` : ''}
${description ? `Description: ${description.slice(0, 600)}` : ''}
${image ? 'A product photo is attached — study it for form, finish, colour, and movement.' : ''}

Return ONLY one JSON object, no markdown, no backticks (include a short descriptive "name" — generate one from the photo if no name was given):
{"name":"","role":"","pass":1,"behavior":"","movement":"","finish":"","palette":"","ep":"","es":"","intensity":[1,2],"stemLength":22,"bloomSize":2.5,"yield":3,"unit":"sprig","assetPrompt":"","colorName":"","colorHex":"#RRGGBB","confidence":{"name":"high|medium|low","role":"high|medium|low","movement":"high|medium|low","ep":"high|medium|low","yield":"high|medium|low"}}`;

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
  const m = await meter(sanitizeInput(a.owner), sanitizeInput(a.tier), 'designs');
  if (!m.ok) return res.status(402).json({ success: false, error: 'limit_reached', kind: 'designs', limit: m.limit, used: m.used, message: `You've used all ${m.limit} designs in your plan this month. Upgrade to keep designing.` });
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
    // ── Emotion bridge ──────────────────────────────────────────────────────
    // The AI interprets the memory into emotions + a formula; the bridge keeps
    // that choice honest and grounds the rest in geometry. If the AI's formula
    // isn't canonical, fall back to the emotion-derived one (never silent default);
    // attach the derived design params (coverage/density/style…) for downstream
    // use (drama slider, DNA readout, evaluator).
    const bridge = EC.deriveDesignParams(data.emotions);
    if (!EC.FORMULA_ARCS[data.formula]) {
      data.formula = bridge.formula;
      data.formula_reason = data.formula_reason || `Chosen from the emotional profile (${bridge.quadrant}).`;
    }
    data.design_params = bridge;
    data.suggested_formula = bridge.formula;
    return res.json({ success: true, data });
  } catch (err) {
    console.error('[/api/scene]', err.message);
    return res.json({ success: false, error: err.message });
  }
});

// ── POST /api/blueprint — deterministic, no AI call ───────────────────────────
app.post('/api/blueprint', (req, res) => {
  try {
    const { emotions, formula, intensity, poem_emotions, coverage, diameter } = req.body;

    if (!emotions || !Array.isArray(emotions)) {
      return res.status(400).json({ success: false, error: 'emotions array is required' });
    }
    // Formula is now optional — the emotion bridge supplies one when absent or
    // non-canonical, so generation never has to error or silently default.
    const bridge = EC.deriveDesignParams(emotions);
    const useFormula = (formula && EC.FORMULA_ARCS[formula]) ? formula : bridge.formula;

    const intensityNum = Math.min(3, Math.max(1, parseInt(intensity) || 1));
    // An explicit coverage (e.g. from a drama slider) overrides the formula arc;
    // otherwise counts flow from the chosen formula's own coverage.
    const cov = (+coverage > 0 && +coverage <= 1) ? +coverage : undefined;
    const slots = runSlotFill(emotions, useFormula, intensityNum, poem_emotions, +diameter || 22, cov);
    const totalStems = slots.reduce((sum, s) => sum + s.stemCount, 0);
    const arcConfig = FORMULA_ARCS[useFormula] || FORMULA_ARCS['Crescent'];

    return res.json({
      success: true,
      data: { slots, totalStems, arcConfig, formula: useFormula, design_params: bridge },
    });
  } catch (err) {
    console.error('[/api/blueprint]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── The Stylist agent — the Prompt-Compiler skill, verbatim, as a system prompt ─
// Language ONLY. The geometry/counts are already fixed by the deterministic
// compiler; the agent never invents coordinates — it dresses them in words.
const STYLIST_SYSTEM = `You are the Evercrafted Stylist. You receive a FINISHED, deterministic wreath blueprint as structured facts (formula, season, palette, focal clusters by clock position, exposed vine arc, elements). You ONLY write language — you must NOT invent or change any coordinate, count, clock position, or element. Use exactly what you are given.

Produce a HIGH-END FAUX BOTANICAL render (never fresh florals).
MATERIALS: silk florals, latex-coated petals, wired stems, fabric leaves with visible vein structure, subtle artificial construction (stem joins, wrapped bases).
SURFACES: matte petals (no moisture/dew), slightly uniform petal edges, semi-gloss foliage with controlled sheen, no fresh-flower translucency.
CONSTRUCTION CUES: stems inserted into a grapevine base (visible integration), intentional editorial placement (not wild-grown).
LIGHTING: soft directional daylight (12–2pm), studio-quality shadows, no outdoor garden light.
ENVIRONMENT: neutral luxury interior (plaster wall, paneled entry, or door setting), no garden/outdoor.
LENS: 85mm editorial photography, shallow but controlled depth of field.
STYLE TAGS: luxury editorial, high-end catalog photography, restoration hardware aesthetic, composed and intentional, premium faux botanical.
The midjourney_prompt MUST end with this suffix exactly: --style raw --s 150 --q 2 --v 7 --no fresh flowers, dew, water droplets, wild garden, outdoor setting, hyper-natural imperfections, floral field styling

Return ONLY strict JSON, no markdown:
{
  "title": "evocative 2-4 word design name",
  "emotional_tone": "1-2 sentences on the feeling this design carries",
  "manufacturing_notes": "2-4 concise build notes referencing the given clusters/exposed arc (mass balance, depth, protect the bare arc, attachment)",
  "midjourney_prompt": "full v7 prompt naming the given florals by their given clock positions, the greenery sweep, the exposed vine arc, ending with the required suffix"
}`;

// ── POST /api/blueprint-doc — engine → compiler → Stylist agent ────────────────
// The full build document: deterministic geometry from the engine, language from
// the Stylist. Accepts the maker's live inventory; falls back to demo inventory.
app.post('/api/blueprint-doc', async (req, res) => {
  try {
    const b = req.body || {};
    const emotions = Array.isArray(b.emotions) ? b.emotions : [];
    if (!emotions.length) return res.status(400).json({ success: false, error: 'emotions array is required' });

    const bridge = EC.deriveDesignParams(emotions);
    const formula = (b.formula && EC.FORMULA_ARCS[b.formula]) ? b.formula : bridge.formula;
    const diam = +b.diameter > 0 ? +b.diameter : 24;
    const intensity = Math.min(3, Math.max(1, parseInt(b.intensity) || 2));
    const inv = (Array.isArray(b.inventory) && b.inventory.length) ? b.inventory : INVENTORY;
    const cov = (+b.coverage > 0 && +b.coverage <= 1) ? +b.coverage : undefined;

    const slots = EC.runSlotFill(inv, emotions, formula, intensity, b.poem_emotions || {}, diam, cov);
    const doc = EC.compileBlueprint(slots, formula, { wreathDiam: diam, season: b.season, emotions });

    // Stylist agent — language only; resilient if the model call fails.
    try {
      const raw = await callClaude({ system: STYLIST_SYSTEM, prompt: JSON.stringify(doc.renderFacts), maxTokens: 900 });
      doc.stylist = parseJSON(raw);
    } catch (e) {
      doc.stylist = { error: 'stylist unavailable', detail: e.message };
    }
    return res.json({ success: true, data: doc });
  } catch (err) {
    console.error('[/api/blueprint-doc]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── SHOP DATA (loaded once at startup) ───────────────────────────────────────
const SHOP_DATA = JSON.parse(fs.readFileSync('./evercrafted-shop-data.json', 'utf8'));

// GET /api/catalogue — lightweight list for the catalogue → inventory tool
app.get('/api/catalogue', (_req, res) => {
  try {
    const data = SHOP_DATA.map(i => ({
      id: i.id, sku: i.sku, name: i.name, price: i.price, imageUrl: i.imageUrl,
      desc: (i.description || '').slice(0, 160),
      currentRole: i.role, currentEp: i.ep,
    }));
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

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
    bloom_size: t.bloomSize, stem_length: t.stemLength, yield: t.yield, unit: t.unit,
    asset_prompt: t.assetPrompt || (typeof b.assetPrompt === 'string' ? b.assetPrompt.slice(0, 500) : ''),
    asset_url: (typeof b.assetUrl === 'string' ? b.assetUrl : '').slice(0, 2000),
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
    bloomSize: r.bloom_size, stemLength: r.stem_length, yield: r.yield, unit: r.unit, assetUrl: r.asset_url, assetPrompt: r.asset_prompt,
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
    if (typeof req.body.assetPrompt === 'string') patch.asset_prompt = req.body.assetPrompt.slice(0, 500);
    // editable tags (validated against the controlled vocabulary)
    const VK = { role: 'roles', behavior: 'behaviors', movement: 'movements', finish: 'finishes', palette: 'palettes', ep: 'emotions', es: 'emotions' };
    for (const f in VK) {
      if (typeof req.body[f] === 'string') {
        if (f === 'es' && req.body[f] === '') patch.es = '';
        else if (EC.VOCAB[VK[f]].includes(req.body[f])) patch[f] = req.body[f];
      }
    }
    if ('role' in patch) patch.pass = (patch.role === 'focal' || patch.role === 'structural') ? 1 : 2;
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
    Object.keys(patch).forEach(k => {
      if (k === 'in_stock') list[idx].inStock = patch[k];
      else if (k === 'asset_prompt') list[idx].assetPrompt = patch[k];
      else list[idx][k] = patch[k]; // stock, role, pass, behavior, movement, finish, palette, ep, es
    });
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

// ── Image rendering (Flux via fal.ai, or OpenAI) ──────────────────────────────
// Upload generated image bytes (or a source URL) to the public 'renders' bucket
async function persistRender(srcUrl, buf, contentType) {
  if (supabase) {
    try {
      let bytes = buf, ct = contentType || 'image/png';
      if (!bytes && srcUrl) {
        const ir = await fetch(srcUrl);
        ct = ir.headers.get('content-type') || 'image/png';
        bytes = Buffer.from(await ir.arrayBuffer());
      }
      if (bytes) {
        const ext = (ct.split('/')[1] || 'png').replace('jpeg', 'jpg');
        const path = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
        const { error } = await supabase.storage.from('renders').upload(path, bytes, { contentType: ct, upsert: false });
        if (!error) return supabase.storage.from('renders').getPublicUrl(path).data.publicUrl;
      }
    } catch (e) { /* fall back to source url */ }
  }
  return srcUrl;
}

async function generateImage(prompt, aspect) {
  const provider = (process.env.IMAGE_PROVIDER || '').toLowerCase()
    || (process.env.FAL_KEY ? 'fal' : (process.env.OPENAI_API_KEY ? 'openai' : 'none'));
  // Strip Midjourney flags (--ar/--style/--q/--v …) that confuse Flux/DALL·E
  const clean = prompt.replace(/--\w+\s+\S+/g, ' ').replace(/\s+/g, ' ').trim();

  if (provider === 'fal') {
    const image_size = aspect === 'square' ? 'square_hd' : 'portrait_4_3';
    const r = await fetch('https://fal.run/' + (process.env.FAL_MODEL || 'fal-ai/flux-pro/v1.1'), {
      method: 'POST',
      headers: { 'Authorization': `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: clean, image_size, num_images: 1 }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || j.error || `fal error ${r.status}`);
    const url = j.images?.[0]?.url;
    if (!url) throw new Error('fal: no image returned');
    return await persistRender(url, null);
  }

  if (provider === 'openai') {
    const size = aspect === 'square' ? '1024x1024' : '1024x1536';
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'gpt-image-1', prompt: clean, size, n: 1 }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error?.message || `openai error ${r.status}`);
    const b64 = j.data?.[0]?.b64_json, url = j.data?.[0]?.url;
    if (b64) return await persistRender(null, Buffer.from(b64, 'base64'), 'image/png');
    if (url) return await persistRender(url, null);
    throw new Error('openai: no image returned');
  }

  throw new Error('No image provider configured. Set IMAGE_PROVIDER=fal (or openai) and the matching API key.');
}

// POST /api/render — generate a wreath image from a render prompt
app.post('/api/render', async (req, res) => {
  try {
    const raw = String(req.body.prompt || '').slice(0, 2000).trim();
    if (!raw) return res.status(400).json({ success: false, error: 'prompt is required' });
    const m = await meter(sanitizeInput(req.body.owner), sanitizeInput(req.body.tier), 'renders');
    if (!m.ok) return res.status(402).json({ success: false, error: 'limit_reached', kind: 'renders', limit: m.limit, used: m.used, message: `You've used all ${m.limit} renders in your plan this month. Upgrade for more.` });
    const aspect = req.body.aspect === 'square' ? 'square' : 'portrait';
    // Wreath-lock: image models (esp. FLUX) drift to bouquets/window-boxes. Lead with
    // the circular ring form and forbid the wrong shapes, so the output is a WREATH.
    const prompt = `A complete circular botanical wreath — round ring shape with an open hollow center, hanging flat and centered against the wall. ${raw} The subject is unmistakably a round hanging wreath, NOT a bouquet, NOT a vase or jar of flowers, NOT a table centerpiece, NOT a windowsill arrangement, NOT a flower box. Centered composition, full circular form visible.`;
    const url = await generateImage(prompt, aspect);
    if (!url) throw new Error('No image returned');

    // Optionally attach the render to a saved design
    const designId = sanitizeInput(req.body.designId);
    if (designId && supabase) {
      try {
        const { data: d } = await supabase.from('designs').select('data').eq('id', designId).single();
        if (d) await supabase.from('designs').update({ data: { ...(d.data || {}), imageUrl: url } }).eq('id', designId);
      } catch (e) { /* non-fatal */ }
    } else if (designId) {
      try {
        let list = JSON.parse(fs.readFileSync(DESIGNS_PATH, 'utf8'));
        const i = list.findIndex(x => x.id === designId);
        if (i >= 0) { list[i].data = { ...(list[i].data || {}), imageUrl: url }; fs.writeFileSync(DESIGNS_PATH, JSON.stringify(list, null, 2)); }
      } catch (e) { /* non-fatal */ }
    }

    return res.json({ success: true, url });
  } catch (err) {
    console.error('[/api/render]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Cutout/segment assets ─────────────────────────────────────────────────────
// POST /api/asset — return an image to cut out: either the source product photo
// (fetched server-side to avoid browser CORS taint) or a generated single-unit
// (segment) illustration. Returns a data URL + whether it's already transparent.
// ML background removal via fal BiRefNet → transparent PNG data URL (handles
// white blooms and clean edges, unlike colour-threshold removal).
async function falRemoveBg(imageUrlOrData) {
  const model = process.env.FAL_BG_MODEL || 'fal-ai/birefnet';
  const r = await fetch('https://fal.run/' + model, {
    method: 'POST',
    headers: { 'Authorization': `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrlOrData }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.detail || j.error || `birefnet error ${r.status}`);
  const url = j.image?.url || j.images?.[0]?.url;
  if (!url) throw new Error('birefnet: no image');
  const ir = await fetch(url);
  return `data:image/png;base64,${Buffer.from(await ir.arrayBuffer()).toString('base64')}`;
}

app.post('/api/asset', async (req, res) => {
  try {
    const hasFal = !!process.env.FAL_KEY;
    const sourceImageUrl = typeof req.body.sourceImageUrl === 'string' ? req.body.sourceImageUrl : '';

    // ── From an existing photo: proper ML background removal when fal is available ──
    if (sourceImageUrl) {
      const hi = hiResImageUrl(sourceImageUrl);
      if (hasFal) {
        try { return res.json({ success: true, image: await falRemoveBg(hi), transparent: true }); }
        catch (e) { /* fall back to raw image for client-side removal */ }
      }
      const ir = await fetch(hi);
      if (!ir.ok) throw new Error('could not fetch source image');
      const ct = ir.headers.get('content-type') || 'image/png';
      const buf = Buffer.from(await ir.arrayBuffer());
      return res.json({ success: true, image: `data:${ct};base64,${buf.toString('base64')}`, transparent: false });
    }

    // ── Generate a single-unit cutout (metered) ──
    const m = await meter(sanitizeInput(req.body.owner), sanitizeInput(req.body.tier), 'cutouts');
    if (!m.ok) return res.status(402).json({ success: false, error: 'limit_reached', kind: 'cutouts', limit: m.limit, used: m.used, message: `You've used all ${m.limit} generated cutouts this month. Upgrade, or use "From photo" (free).` });

    // Prefer the Midjourney-style asset prompt written at tag time; else build one.
    let prompt = (typeof req.body.assetPrompt === 'string' && req.body.assetPrompt.trim())
      ? req.body.assetPrompt.trim().slice(0, 600) : '';
    if (!prompt) {
      const name = sanitizeInput(req.body.name) || 'a botanical element';
      const colorWord = sanitizeInput(req.body.colorName) || sanitizeInput(req.body.color);
      const unit = sanitizeInput(req.body.unit) || 'sprig';
      const cleanName = name.replace(/\b\d+(?:\.\d+)?\b\s*(?:''|"|in|inch|inches)?/gi, ' ').replace(/\s{2,}/g, ' ').trim() || name;
      let piece, extra;
      if (unit === 'bloom') { piece = 'a SINGLE bloom head only — no stem and no leaves, just one flower head'; extra = 'delicate fabric petals'; }
      else if (unit === 'cluster') { piece = 'ONE small single cluster, not a full spray'; extra = 'fine realistic detail'; }
      else { piece = 'ONE short single sprig — just a small cut tip with only a few leaves, NOT a full branch or spray'; extra = 'soft realistic foliage'; }
      prompt = `A single isolated high-end luxury silk ${colorWord ? colorWord + ' ' : ''}${cleanName} — ${piece}, premium artificial faux botanical, ${extra}, centered, facing forward, overhead flat-lay view, studio lighting, pure solid white background`;
    }
    const provider = (process.env.IMAGE_PROVIDER || '').toLowerCase()
      || (hasFal ? 'fal' : (process.env.OPENAI_API_KEY ? 'openai' : 'none'));

    if (provider === 'openai') {
      const r = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-image-1', prompt, size: '1024x1024', background: 'transparent', n: 1 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error?.message || `openai error ${r.status}`);
      const b64 = j.data?.[0]?.b64_json;
      if (!b64) throw new Error('openai: no image');
      return res.json({ success: true, image: `data:image/png;base64,${b64}`, transparent: true });
    }
    if (provider === 'fal') {
      const r = await fetch('https://fal.run/' + (process.env.FAL_ASSET_MODEL || 'fal-ai/flux-pro/v1.1'), {
        method: 'POST',
        headers: { 'Authorization': `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, image_size: 'square_hd', num_images: 1 }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || `fal error ${r.status}`);
      const url = j.images?.[0]?.url;
      if (!url) throw new Error('fal: no image');
      // proper ML background removal so white blooms survive and edges are clean
      return res.json({ success: true, image: await falRemoveBg(url), transparent: true });
    }
    throw new Error('No image provider configured. Set IMAGE_PROVIDER=fal (or openai) and the matching key.');
  } catch (err) {
    console.error('[/api/asset]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cutout — store a transparent PNG cutout and set the floral's asset_url
app.post('/api/cutout', async (req, res) => {
  try {
    const image = typeof req.body.image === 'string' ? req.body.image : '';
    const inventoryId = sanitizeInput(req.body.inventoryId);
    if (!image) return res.status(400).json({ success: false, error: 'image is required' });

    let url = '';
    if (supabase) {
      const { media_type, data } = parseDataUrl(image);
      const ext = (media_type.split('/')[1] || 'png').replace('jpeg', 'jpg');
      const path = `${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`;
      const { error } = await supabase.storage.from('cutouts').upload(path, Buffer.from(data, 'base64'), { contentType: media_type, upsert: false });
      if (error) throw new Error(error.message);
      url = supabase.storage.from('cutouts').getPublicUrl(path).data.publicUrl;
      if (inventoryId) { try { await supabase.from('inventory').update({ asset_url: url }).eq('id', inventoryId); } catch (e) {} }
    } else {
      url = image; // dev fallback: keep the data URL as the asset
      if (inventoryId) {
        try {
          let list = JSON.parse(fs.readFileSync(INVENTORY_PATH, 'utf8'));
          const i = list.findIndex(x => x.id === inventoryId);
          if (i >= 0) { list[i].assetUrl = url; fs.writeFileSync(INVENTORY_PATH, JSON.stringify(list, null, 2)); }
        } catch (e) {}
      }
    }
    return res.json({ success: true, url });
  } catch (err) {
    console.error('[/api/cutout]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ── Designs (saved blueprints from the engines) ───────────────────────────────
const DESIGNS_PATH = './designs.json';

function designRow(b) {
  return {
    owner:       (sanitizeInput(b.owner) || 'default').slice(0, 120),
    title:       (sanitizeInput(b.title) || 'Untitled design').slice(0, 160),
    source:      (sanitizeInput(b.source) || 'manual').slice(0, 40),
    formula:     sanitizeInput(b.formula).slice(0, 60),
    total_stems: Number.isFinite(+b.totalStems) ? Math.max(0, parseInt(b.totalStems)) : 0,
    data:        (b.data && typeof b.data === 'object') ? b.data : {}, // freeform payload (poem, prompt, slots…)
  };
}
function designToClient(r) {
  return { id: r.id, owner: r.owner, title: r.title, source: r.source, formula: r.formula, totalStems: r.total_stems, data: r.data, createdAt: r.created_at };
}

// POST /api/designs — save a generated design
app.post('/api/designs', async (req, res) => {
  try {
    const row = designRow(req.body);
    if (supabase) {
      const { data, error } = await supabase.from('designs').insert(row).select().single();
      if (error) throw new Error(error.message);
      console.log(`[/api/designs] (supabase) saved "${row.title}"`);
      return res.json({ success: true, data: designToClient(data) });
    }
    const clientRow = designToClient({ ...row, id: 'dsn_' + Date.now() + '_' + Math.floor(Math.random() * 1000), created_at: new Date().toISOString() });
    let list = [];
    try { list = JSON.parse(fs.readFileSync(DESIGNS_PATH, 'utf8')); } catch {}
    list.push(clientRow);
    fs.writeFileSync(DESIGNS_PATH, JSON.stringify(list, null, 2));
    console.log(`[/api/designs] (file) saved "${row.title}"`);
    return res.json({ success: true, data: clientRow });
  } catch (err) {
    console.error('[/api/designs POST]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/designs — list saved designs (optionally ?owner=)
app.get('/api/designs', async (req, res) => {
  try {
    const owner = sanitizeInput(req.query.owner) || '';
    if (supabase) {
      let q = supabase.from('designs').select('*').order('created_at', { ascending: false }).limit(500);
      if (owner) q = q.eq('owner', owner);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return res.json({ success: true, data: (data || []).map(designToClient) });
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(DESIGNS_PATH, 'utf8')); } catch {}
    if (owner) list = list.filter(x => x.owner === owner);
    return res.json({ success: true, data: list.slice().reverse() });
  } catch (err) {
    console.error('[/api/designs GET]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/designs/:id
app.delete('/api/designs/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (supabase) {
      const { error } = await supabase.from('designs').delete().eq('id', id);
      if (error) throw new Error(error.message);
      return res.json({ success: true });
    }
    let list = [];
    try { list = JSON.parse(fs.readFileSync(DESIGNS_PATH, 'utf8')); } catch {}
    fs.writeFileSync(DESIGNS_PATH, JSON.stringify(list.filter(x => x.id !== id), null, 2));
    return res.json({ success: true });
  } catch (err) {
    console.error('[/api/designs DELETE]', err.message);
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
