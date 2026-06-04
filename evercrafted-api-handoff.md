# Evercrafted API Server — Claude Code Handoff
# =============================================
# All prompts extracted from the perfected Memory Scene Builder.
# BUILD THESE FILES: server.js, package.json, .env.example, vercel.json, README.md


# ── ROUTE 1: POST /api/location ──────────────────────
# Body: { location: string }
# Model: claude-sonnet-4-20250514  |  max_tokens: 1024
# System: 'You are a location intelligence engine. Return ONLY valid JSON.
#          No markdown, no backticks. Start with { end with }.'
# Retry once on parse failure. Return success:false with fallback on second failure.
# FALLBACK: { city:input, country:'', known_for:[input], architecture:'local',
#   landscape:'natural', lifestyle:'local', light_quality:'natural',
#   iconic_surfaces:['local wall','local feature','waterfront','regional facade'],
#   nearby_notable:input, palette_suggestion:'natural tones',
#   lifestyle_setting_ideas:['local wall','interior scene','waterfront'] }

# EXACT PROMPT:
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


# ── ROUTE 2: POST /api/scene ─────────────────────────
# Body: { memory, season, location, timeofday, who, sensory, feeling, locationData }
# Model: claude-sonnet-4-20250514  |  max_tokens: 2400
# No system prompt. Inject loc_context from locationData after the feeling line.
# Validate: must have poem, emotions[], formula, poem_emotions{structural,secondary,undertone}
# Retry once if invalid. Return success:false on second failure.

# loc_context to inject (build from req.body.locationData if present):
# ---
# LOCATION INTELLIGENCE (researched facts about [locationData.city]):
# - Known for: [locationData.known_for.join(', ')]
# - Architecture: [locationData.architecture]
# - Iconic surfaces: [locationData.iconic_surfaces.join(' / ')]
# - Suggested settings: [locationData.lifestyle_setting_ideas.join(' / ')]
# - Local palette: [locationData.palette_suggestion]
# - Nearby landmarks: [locationData.nearby_notable]
# ---

# EXACT PROMPT:
  const prompt = `You are Evercrafted's Memory Scene engine. A client has shared a memory for a custom faux botanical wreath commission. Read every detail carefully and imagine where this wreath truly belongs in the world of this memory.

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


# ── ROUTE 3: POST /api/blueprint ─────────────────────
# Body: { emotions[], formula, intensity, poem_emotions{structural,secondary,undertone} }
# NO AI CALL — pure deterministic logic. Translate JS to Node.js as-is.
# Returns: { success:true, data:{ slots[], totalStems, arcConfig:{s,e} } }

# INVENTORY:
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

# SLOT TEMPLATES:
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

# FORMULA ARCS:
const FORMULA_ARCS = {
  'Crescent':{s:210,e:330},'Side Sweep':{s:240,e:360},'Bottom Heavy':{s:150,e:330},
  'Diagonal Flow':{s:225,e:405},'Focal Burst':{s:270,e:420},'Garden Scatter':{s:0,e:360},
  'Wild Asymmetry':{s:180,e:315},'Half Ring':{s:180,e:360},'Spiral Flow':{s:240,e:420},
};

# SLOT FILL FUNCTION (translate to Node.js — logic identical):
function runSlotFill(emotions, formula, intensity, poemEmotions) {
  // poem_emotions drives placement by tier:
  // structural tier  → poemEmotions.structural (heaviest, deepest in arc)
  // secondary tier   → poemEmotions.secondary  (mid-ring, character layer)
  // texture/accent   → poemEmotions.undertone  (outermost, discovered detail)
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
    const pass = (slot.role === 'structural' || slot.role === 'focal') ? 1 : 2;
    const candidates = INVENTORY.filter(i => {
      if (i.role !== slot.role) return false;
      if (i.intensity[0] > intensity + 1 || i.intensity[1] < Math.max(1, intensity - 1)) return false;
      return true;
    });

    const tierTags = tierEmotionMap[slot.tier] || emotionTags;
    const scored = candidates.map(c => {
      const ce = [c.ep, c.es, c.blend].filter(Boolean).map(x => x.toLowerCase());
      const emotMatch = ce.filter(e => tierTags.includes(e)).length;
      // Bonus for matching the poem emotion specifically for this tier
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
    if (!chosen && candidates.length) {
      chosen = candidates[0];
    }

    const slotCount = Math.max(1, slots.filter(s => s.role === slot.role).length);
    const budget = 90;
    const zb = Math.round(budget * (ZS[slot.role] || 0.10) / slotCount);
    const sc = Math.max(1, Math.round(zb / (BU[chosen ? chosen.behavior : 'mid'] || 2.5)));
    filled.push({ ...slot, item: chosen, stemCount: sc });
  }
  return filled;
}



# ── SERVER CONFIG ─────────────────────────────────────
# Express setup:
#   cors origins: localhost:3000, localhost:5500, localhost:8080, 127.0.0.1:5500, 'null'
#   express.json() middleware
#   GET /api/health returns { ok: true, service: 'evercrafted-api' }
#   PORT: process.env.PORT || 3001
#   Request logging: METHOD /path - status - Xms

# package.json dependencies:
#   express, @anthropic-ai/sdk, cors, dotenv
#   devDependencies: nodemon
#   scripts: start: node server.js  |  dev: nodemon server.js

# .env.example:
#   ANTHROPIC_API_KEY=sk-ant-...
#   PORT=3001

# vercel.json:
#   { "version":2, "builds":[{"src":"server.js","use":"@vercel/node"}],
#     "routes":[{"src":"/(.*)","dest":"server.js"}] }


# ── BROWSER CHANGES TO evercrafted-memory-scene.html ─
# Add at top of <script>:
#   const CONFIG = { apiBase: 'http://localhost:3001' };
#
# Replace researchLocation() to call:
#   POST CONFIG.apiBase + '/api/location'
#   body: JSON.stringify({ location })
#   return response.json() then use result.data
#
# Replace callClaudeScene() to call:
#   POST CONFIG.apiBase + '/api/scene'
#   body: JSON.stringify({ ...answers, locationData: loc })
#   return result.data
#
# renderBlueprint() stays in browser — visual SVG rendering only.
# On success:false — log error, proceed with fallback data.


# ── README ────────────────────────────────────────────
# npm install
# cp .env.example .env   (add your Anthropic API key)
# npm run dev            (runs on localhost:3001)
# curl localhost:3001/api/health
#
# Deploy: vercel --prod
# Then update CONFIG.apiBase in the HTML to your Vercel URL