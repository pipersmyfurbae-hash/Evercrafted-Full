# Evercrafted Gap Matcher — Claude Code Handoff
# ==============================================
# Add this as a new route to the existing server.js
# The shop data lives at evercrafted-shop-data.json (560 items)
# This route must be added alongside the existing /api/location, /api/scene, /api/blueprint routes

# ── ROUTE: POST /api/gaps ────────────────────────────────────────
# Purpose: Compare a blueprint's required slots against client inventory,
#          find gaps, match each gap to shop items using composition-aware scoring
#
# Body: {
#   filledSlots: array of { role, tier, item (null if gap), stemCount, movement, finish, ep, es },
#   formula: string (e.g. "Crescent"),
#   emotions: string[] (from poem_emotions),
#   poemEmotions: { structural, secondary, undertone },
#   clientInventory: array of client's tagged items (same schema as INVENTORY)
# }
#
# Returns: {
#   success: true,
#   data: {
#     gaps: [ { slot, suggestions: [shopItem...] } ],
#     gapCount: number,
#     fullyFilled: boolean
#   }
# }

# ── SCORING LOGIC ────────────────────────────────────────────────
# For each gap slot, score every shop item and return top 3.
# Score = roleMatch(3) + emotionMatch(2 per match) + poemBonus(3/2/1)
#       + archetypeCompat(2) + finishHarmony(1) + paletteCompat(1)
#       - archetypeClash(3) - emotionRepeat(2)
#
# archetypeClash: if the gap slot needs weeping and item is architectural, -3
# archetypeCompat: if the gap's neighboring items already have 'still' and this
#   item brings 'weeping', +2 (adds contrast). If same archetype as neighbors, -1.
# emotionRepeat: if item's ep/es already exists in the same tier in filled slots, -2
# poemBonus: if tier is Foundation and item matches structural poem emotion, +3
#            if tier is Secondary/Bridge and matches secondary poem emotion, +2
#            if tier is Texture/Accent and matches undertone poem emotion, +1
#
# NEVER return an item that:
# - Has a role mismatch (focal item can't fill a structural slot)
# - Is already in the filled slots (by id)
# - Would create more than 2 of the same movement archetype in the composition
#
# ── SHOP DATA LOADING ────────────────────────────────────────────
# Load evercrafted-shop-data.json at server startup (not per-request):
# const SHOP_DATA = JSON.parse(fs.readFileSync('./evercrafted-shop-data.json'));
#
# ── SUGGESTION ENRICHMENT ────────────────────────────────────────
# For each suggested shop item, add a `reason` field (1-2 sentences)
# explaining WHY this item works for this specific design:
# - Reference the poem emotion it matches
# - Reference how its movement archetype complements what's already placed
# - Reference the finish harmony with existing items
# Do NOT call the AI for this — generate it from the data:
#
# function buildReason(item, slot, filledSlots, poemEmotions) {
#   const pe = poemEmotions[slot.tier === 'Foundation' ? 'structural' : slot.tier === 'Secondary' ? 'secondary' : 'undertone'];
#   const emotionMatch = [item.ep, item.es].includes(pe);
#   const existingArchetypes = filledSlots.filter(s=>s.item).map(s=>s.item.movement);
#   const addsVariety = !existingArchetypes.includes(item.movement);
#   
#   let reason = '';
#   if (emotionMatch) reason += `Carries ${pe} — the ${slot.tier === 'Foundation' ? 'heart' : slot.tier === 'Secondary' ? 'character' : 'quiet undertone'} of this design. `;
#   if (addsVariety) reason += `Its ${item.movement} movement brings something the composition doesn't have yet.`;
#   else reason += `Works in the ${slot.role} layer without repeating what's already there.`;
#   return reason;
# }
#
# ── RESPONSE FORMAT ──────────────────────────────────────────────
# {
#   success: true,
#   data: {
#     gapCount: 3,
#     fullyFilled: false,
#     gaps: [
#       {
#         slot: { role: "focal", tier: "Foundation" },
#         suggestions: [
#           {
#             id, sku, name, price, imageUrl, colorName, colorHex,
#             role, movement, finish, ep, palette,
#             reason: "Carries nostalgia — the heart of this design. Its still movement works beside the weeping eucalyptus already placed.",
#             addToCartUrl: "/shop/" + sku,
#             inStock: true
#           }
#         ]
#       }
#     ]
#   }
# }
#
# ── ALSO ADD: POST /api/waitlist ─────────────────────────────────
# Body: { email, scene_title?, memory? }
# Append to a waitlist.json file (or log to console for now)
# Returns: { success: true }
# Format: { email, scene_title, timestamp, source: 'try-page' }
