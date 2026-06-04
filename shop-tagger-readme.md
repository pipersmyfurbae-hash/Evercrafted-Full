# Evercrafted Shop Tagger — Setup & Run Guide

This script re-tags your full 560-item product catalogue using the
Evercrafted blueprint engine schema. It keeps your identity fields
(name, SKU, price, imageUrl, description, dallePrompt) and completely
re-derives everything the design engine uses.

## What gets re-derived

| Field       | What it means                                          |
|-------------|--------------------------------------------------------|
| role        | focal / secondary / greenery / accent / structural / texture |
| pass        | 1 (foundation layer) or 2 (detail layer)               |
| behavior    | heavy / mid / light / wispy                            |
| movement    | weeping / reaching / sweeping / architectural / still  |
| finish      | matte / satin / metallic / raw / gloss                 |
| palette     | neutral-light / neutral-mid / neutral-dark / botanical-green / champagne / silver |
| ep          | primary emotion (nostalgia / grief / peace / joy etc.) |
| es          | secondary emotion                                      |
| intensity   | [min, max] e.g. [1,2]                                  |
| colorName   | human readable color name                              |
| colorHex    | #RRGGBB hex value                                      |

## Setup

1. Copy these files into your server project folder (same folder as server.js):
   - evercrafted-shop-tagger.js
   - Full_1_26.csv  (your original upload)

2. The tagger uses the same Anthropic SDK already installed:
   npm install  (if not already done)

3. Make sure ANTHROPIC_API_KEY is in your .env

## Run

   node evercrafted-shop-tagger.js

Takes approximately 8-12 minutes for 560 items (28 batches of 20).
Progress prints to console as each batch completes.

## Output files

   evercrafted-shop-data.json   ← replace the old one in your server folder
   evercrafted-shop-tagged.csv  ← open in Excel/Sheets to review the tagging
   tagger-errors.json           ← any batches that failed (review manually)

## After running

1. Open evercrafted-shop-tagged.csv and spot-check:
   - Do the role assignments make sense for items you know?
   - Do the ep/es emotions feel right for the color and description?
   - Are movements correct (weeping vs reaching vs still)?

2. Copy evercrafted-shop-data.json into your server folder
   (replaces the heuristic-tagged version)

3. In server.js, confirm this line is at the top (outside any route):
   const SHOP_DATA = JSON.parse(fs.readFileSync('./evercrafted-shop-data.json'));

4. The gap matcher route (/api/gaps) will now use the properly tagged data.

## Cost estimate

560 items ÷ 20 per batch = 28 API calls
~1,800 input tokens + ~500 output tokens per call
~65,000 tokens total
Approximate cost: $0.15-0.20 at claude-sonnet-4 pricing
