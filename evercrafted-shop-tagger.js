/**
 * Evercrafted Shop Catalogue Tagger
 * ===================================
 * Reads Full_1_26.csv, keeps identity fields,
 * re-derives all blueprint engine fields via Claude API.
 * Run from the same folder as your server (has access to Anthropic SDK).
 *
 * Usage:
 *   node evercrafted-shop-tagger.js
 *
 * Output:
 *   evercrafted-shop-data.json  (replace the old one in your server folder)
 *   evercrafted-shop-tagged.csv (for your review)
 *   tagger-errors.json          (any items that failed — review manually)
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

// ── CONFIG ────────────────────────────────────────────────────────
const BATCH_SIZE = 20;        // items per API call
const DELAY_MS   = 800;       // delay between batches (rate limiting)
const CSV_PATH   = './Full_1_26.csv';   // your uploaded CSV
const OUT_JSON   = './evercrafted-shop-data.json';
const OUT_CSV    = './evercrafted-shop-tagged.csv';
const ERR_PATH   = './tagger-errors.json';

// ── SCHEMA DEFINITIONS (shown to Claude) ─────────────────────────
const SCHEMA_GUIDE = `
EVERCRAFTED BLUEPRINT ENGINE SCHEMA
You are tagging faux botanical floral products for a wreath design system.
Assign each field based on reading the item name, description, and color.

ROLE — what job this piece does in a wreath:
  focal      = the star bloom. Large, high-visual-impact flower. The eye goes here first.
               Examples: peony, rose, dahlia, hydrangea, ranunculus, magnolia, amaryllis
  secondary  = fills around the focal. Smaller blooms, berries, buds. Supports without competing.
               Examples: small roses, berries, small clusters, wax flowers, sweet peas
  greenery   = foliage, leaves, eucalyptus, ferns. Extends the form and softens the edges.
               Examples: eucalyptus, fern, ivy, olive, dusty miller, salal
  accent     = fine detail pieces. Tiny berries, small sprays, decorative picks. Used sparingly.
               Examples: small berry picks, tiny flower sprays, seed heads, small star flowers
  structural = branches, bare stems, manzanita, twigs. Adds architecture and movement direction.
               Examples: branches, twigs, willow, manzanita, curly willow, pussy willow
  texture    = dried or textural pieces that add depth. Not the focus, not quite filler.
               Examples: pampas grass, cotton stems, thistles, wheat, seed pods, lunaria

PASS — which design layer this belongs in:
  1 = foundation layer (structural, focal — goes in first, carries the most weight)
  2 = detail layer (secondary, greenery, accent, texture — fills and softens)

BEHAVIOR — how much visual and physical space this takes up:
  heavy  = large blooms 4"+, substantial branches. Takes 3+ design units.
  mid    = medium pieces 2-4". Most florals and foliage.
  light  = small sprays, delicate stems, fine foliage. Under 2".
  wispy  = very fine, airy pieces. Pampas grass, baby's breath, fine sprays.

MOVEMENT — how this piece creates direction and flow in a composition:
  weeping     = naturally droops or cascades downward. Creates draping.
  reaching    = grows upward or outward from center. Creates energy.
  sweeping    = extends horizontally, creates lateral flow.
  architectural = strong geometric form. Branches, bare stems. Adds structure.
  cascading   = tumbles in a flowing waterfall pattern.
  still       = compact, rounded, doesn't create directional movement.

FINISH — the surface quality of this piece:
  matte      = flat, no shine. Most realistic faux botanicals.
  satin      = slight sheen. Silk petals with a soft glow.
  metallic   = gold, silver, bronze, champagne — clearly reflective.
  raw        = natural dried texture. Pampas, wheat, pods, dried florals.
  gloss      = high shine. Lacquered berries, glossy leaves.

PALETTE — the color family:
  neutral-light  = white, cream, ivory, blush, pale pink, light grey
  neutral-mid    = dusty pink, mauve, peach, lavender, rose, tan, beige, sage (mid tones)
  neutral-dark   = burgundy, wine, deep purple, navy, dark forest green, charcoal, rust
  botanical-green = any true green — sage, olive, moss, eucalyptus, fern, hunter
  champagne      = warm gold, amber, yellow, wheat, honey, butter, straw
  silver         = silver, grey, pewter, platinum, ash

EP (primary emotion from the Evercrafted wheel):
  nostalgia  = evokes memory, the past, grandmother's garden, heirloom quality
  grief      = heavy, dark, raw. Architectural black branches, stark forms.
  sadness    = muted, soft, quiet. Dusty mauves, faded tones.
  peace      = serene, simple, restful. Clean whites, soft greens, minimal.
  joy        = bright, alive, celebratory. Fresh colors, energetic forms.
  longing    = beautiful but bittersweet. Soft romantics, reaching forms.
  warmth     = cosy, harvest, amber tones. Autumn oranges, browns, golds.
  trust      = grounded, reliable, natural. Browns, greens, organic forms.
  awe        = dramatic, extraordinary, commanding. Bold, unusual, striking.
  tenderness = soft, gentle, delicate. Light touch, fine details, pale tones.
  melancholy = quiet sadness. Greys, muted tones, still forms.
  reverence  = elegant, elevated, ceremonial. Rich and refined.
  anticipation = fresh, new, hopeful. Spring tones, reaching forms.

ES (secondary emotion — the feeling underneath the primary):
  Same options as EP. Assign the emotion that comes second when you look at this piece.

INTENSITY [min, max]:
  1 = soft emotional register (peace, tenderness, quiet joy)
  2 = medium emotional weight (nostalgia, warmth, longing)
  3 = heavy emotional register (grief, awe, dramatic reverence)
  Assign a range e.g. [1,2] or [2,3] or [1,1] or [3,3]
`;

// ── CSV PARSER (simple, no dependencies) ──────────────────────────
function parseCSV(csvText) {
  const lines = csvText.split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i]||'').trim(); });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = []; let cur = ''; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { result.push(cur); cur = ''; }
    else { cur += c; }
  }
  result.push(cur);
  return result;
}

// ── BUILD PROMPT FOR A BATCH ───────────────────────────────────────
function buildBatchPrompt(batch) {
  const clean = str => (str||'').replace(/['"\\/]/g, ' ').replace(/\s+/g, ' ').trim();
  const items = batch.map((item, i) => `
ITEM ${i+1}:
  Name: ${clean(item.name)}
  Description: ${clean(item.description).slice(0, 250)}
  Color: ${(item['primaryHex '] || item.primaryHex || '').trim()} / ${clean(item.colorName)}
  Category: ${clean(item.category)}
  Current role label: ${clean(item.primaryRole)} (may be wrong)
`).join('\n');

  return `${SCHEMA_GUIDE}

Tag the following ${batch.length} faux botanical products for the Evercrafted blueprint engine.
Read each item carefully. Use the schema guide above. Trust the description and color more than the current role label.

${items}

Return ONLY a valid JSON array with exactly ${batch.length} objects in the same order as the items above.
No markdown, no backticks, no explanation. Start with [ and end with ].

Each object must have exactly these fields:
{
  "role": "focal|secondary|greenery|accent|structural|texture",
  "pass": 1,
  "behavior": "heavy|mid|light|wispy",
  "movement": "weeping|reaching|sweeping|architectural|cascading|still",
  "finish": "matte|satin|metallic|raw|gloss",
  "palette": "neutral-light|neutral-mid|neutral-dark|botanical-green|champagne|silver",
  "ep": "emotion from wheel",
  "es": "emotion from wheel",
  "intensity": [1, 2],
  "colorName": "human readable color name",
  "colorHex": "#RRGGBB"
}`;
}

// ── MAIN TAGGER ────────────────────────────────────────────────────
async function runTagger() {
  const client = new Anthropic();

  // Read CSV
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`CSV not found at ${CSV_PATH}`);
    console.error('Copy Full_1_26.csv to the same folder as this script.');
    process.exit(1);
  }
  const csvText = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parseCSV(csvText);
  console.log(`Loaded ${rows.length} items from CSV`);

  // Identity fields we keep
  const KEEP = ['id','sku','name','price','imageUrl','description','dallePrompt'];

  const results = [];
  const errors = [];
  const batches = [];
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    batches.push(rows.slice(i, i + BATCH_SIZE));
  }

  console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} items each...`);
  console.log('This will take approximately', Math.ceil(batches.length * DELAY_MS / 60000), 'minutes.\n');

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi];
    process.stdout.write(`Batch ${bi+1}/${batches.length} (${batch.length} items)... `);

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: 'You are a floral product tagging engine. Return ONLY valid JSON arrays. No prose, no markdown, no backticks.',
        messages: [{ role: 'user', content: buildBatchPrompt(batch) }]
      });

      const raw = response.content[0]?.text || '[]';
      // Extract array
      const start = raw.indexOf('[');
      const end   = raw.lastIndexOf(']');
      if (start === -1 || end === -1) throw new Error('No JSON array in response');

      // Clean the JSON string before parsing:
      // 1. Remove control characters that break JSON
      // 2. Fix unescaped newlines inside string values
      let jsonStr = raw.slice(start, end + 1);
      jsonStr = jsonStr
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // strip control chars
        .replace(/\n/g, ' ')                                  // collapse newlines
        .replace(/\r/g, '')                                   // strip CR
        .replace(/\t/g, ' ');                                 // collapse tabs

      let tags;
      try {
        tags = JSON.parse(jsonStr);
      } catch(parseErr) {
        // Last resort — try to extract each object individually
        const objMatches = jsonStr.match(/\{[^{}]+\}/g);
        if (objMatches && objMatches.length > 0) {
          tags = objMatches.map(obj => {
            try { return JSON.parse(obj); } catch(e) { return {}; }
          });
          console.log(`  (recovered ${tags.length} of ${batch.length} via fallback)`);
        } else {
          throw new Error('JSON parse failed: ' + parseErr.message);
        }
      }
      if (!Array.isArray(tags) || tags.length === 0) {
        throw new Error(`No items recovered from response`);
      }
      // Pad with empty objects if partial recovery
      while (tags.length < batch.length) tags.push({});

      // Merge kept fields + new tags
      batch.forEach((row, i) => {
        const kept = {};
        KEEP.forEach(k => { kept[k] = row[k] || ''; });
        const tag = tags[i] || {};

        // Validate and normalise tag fields
        const ROLES = ['focal','secondary','greenery','accent','structural','texture','bridge'];
        const BEHAVIORS = ['heavy','mid','light','wispy'];
        const MOVEMENTS = ['weeping','reaching','sweeping','architectural','cascading','still'];
        const FINISHES = ['matte','satin','metallic','raw','gloss'];
        const PALETTES = ['neutral-light','neutral-mid','neutral-dark','botanical-green','champagne','silver'];
        const EMOTIONS = ['nostalgia','grief','sadness','peace','joy','longing','warmth','trust','awe','tenderness','melancholy','reverence','anticipation'];

        results.push({
          ...kept,
          role:      ROLES.includes(tag.role)        ? tag.role      : 'secondary',
          pass:      tag.pass === 1 ? 1 : 2,
          behavior:  BEHAVIORS.includes(tag.behavior) ? tag.behavior  : 'mid',
          movement:  MOVEMENTS.includes(tag.movement) ? tag.movement  : 'still',
          finish:    FINISHES.includes(tag.finish)    ? tag.finish    : 'matte',
          palette:   PALETTES.includes(tag.palette)   ? tag.palette   : 'neutral-mid',
          ep:        EMOTIONS.includes(tag.ep)         ? tag.ep        : 'trust',
          es:        EMOTIONS.includes(tag.es)         ? tag.es        : '',
          blend:     '',
          intensity: Array.isArray(tag.intensity) && tag.intensity.length === 2 ? tag.intensity : [1,2],
          colorName: tag.colorName || '',
          colorHex:  tag.colorHex  || '',
          contrast:  'unified',
          inStock:   true,
          recommendedQty: 4,
        });
      });

      console.log(`✓ (${tags.length} tagged)`);

    } catch (err) {
      console.log(`✗ ERROR: ${err.message}`);
      // Save failed batch items with fallback
      batch.forEach(row => {
        errors.push({ sku: row.sku, name: row.name, error: err.message });
        const kept = {};
        KEEP.forEach(k => { kept[k] = row[k] || ''; });
        results.push({ ...kept, role:'secondary', pass:2, behavior:'mid', movement:'still', finish:'matte', palette:'neutral-mid', ep:'trust', es:'', blend:'', intensity:[1,2], colorName:'', colorHex:'', contrast:'unified', inStock:true, recommendedQty:4, _error: true });
      });
    }

    // Rate limit delay between batches
    if (bi < batches.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
  }

  // Save JSON
  fs.writeFileSync(OUT_JSON, JSON.stringify(results, null, 2));
  console.log(`\n✓ Saved ${results.length} items to ${OUT_JSON}`);

  // Save CSV for review
  if (results.length > 0) {
    const headers = Object.keys(results[0]);
    const csvOut = [
      headers.join(','),
      ...results.map(r => headers.map(h => {
        const v = Array.isArray(r[h]) ? JSON.stringify(r[h]) : String(r[h]||'').replace(/"/g,'""');
        return `"${v}"`;
      }).join(','))
    ].join('\n');
    fs.writeFileSync(OUT_CSV, csvOut);
    console.log(`✓ Saved review CSV to ${OUT_CSV}`);
  }

  // Save errors
  if (errors.length > 0) {
    fs.writeFileSync(ERR_PATH, JSON.stringify(errors, null, 2));
    console.log(`⚠ ${errors.length} errors saved to ${ERR_PATH} — review these manually`);
  }

  // Summary
  console.log('\n── SUMMARY ──────────────────────────────');
  const counts = field => {
    const c = {};
    results.forEach(r => { c[r[field]] = (c[r[field]]||0)+1; });
    return Object.entries(c).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`  ${k}: ${v}`).join('\n');
  };
  console.log('Role distribution:\n' + counts('role'));
  console.log('\nEmotion (ep) distribution:\n' + counts('ep'));
  console.log('\nMovement distribution:\n' + counts('movement'));
  console.log('\nPass distribution:\n' + counts('pass'));
  console.log('\nDone. Replace evercrafted-shop-data.json in your server folder with the new file.');
}

runTagger().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
