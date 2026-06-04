# Evercrafted API Server

Secure Express proxy between the browser and the Anthropic API. Keeps the API key server-side.

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env from example
cp .env.example .env

# 3. Add your Anthropic API key to .env
#    ANTHROPIC_API_KEY=sk-ant-...

# 4. Start dev server
npm run dev
```

The server runs on `http://localhost:3001` by default.

---

## Endpoints

### `POST /api/location`

Looks up location intelligence used to inform scene generation.

**Request:**
```json
{ "location": "Lisbon, Portugal" }
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "city": "Lisbon",
    "country": "Portugal",
    "known_for": ["azulejo tiles", "fado music", "miradouros"],
    "architecture": "Pombaline and Moorish",
    "landscape": "hills descending to the Tagus",
    "lifestyle": "slow, sun-drenched café culture",
    "light_quality": "golden Atlantic light",
    "iconic_surfaces": ["azulejo staircase", "miradouro railing", "tram window", "limestone doorway"],
    "nearby_notable": "Sintra",
    "palette_suggestion": "terracotta, cobalt blue, faded gold, cream",
    "lifestyle_setting_ideas": [
      "a tiled staircase wall in Alfama",
      "a miradouro iron railing",
      "a houseboat window on the Tagus"
    ]
  }
}
```

**Response (failure — fallback included):**
```json
{
  "success": false,
  "error": "...",
  "fallback": { "city": "Lisbon", ... }
}
```

---

### `POST /api/scene`

Generates a full Memory Scene: poem, emotional layers, formula, render prompt.

**Request:**
```json
{
  "memory": "My grandmother's kitchen on Sunday mornings",
  "season": "Winter",
  "location": "Porto, Portugal",
  "timeofday": "Morning",
  "who": "My grandmother",
  "sensory": "Cinnamon and warm bread",
  "feeling": "Safe",
  "locationData": { ... }
}
```

**Response (success):**
```json
{
  "success": true,
  "data": {
    "scene_title": "The Sunday Kitchen",
    "poem": "...",
    "brief": "...",
    "emotions": ["warmth", "safety", "nostalgia"],
    "dominant_emotion": "warmth",
    "poem_emotions": {
      "structural": "safety",
      "secondary": "warmth",
      "undertone": "longing"
    },
    "formula": "Anchor Heavy / Soft Texture",
    "formula_reason": "...",
    "intensity": 2,
    "palette_words": ["cream", "cinnamon", "dusty rose", "sage"],
    "render_surface": "azulejo kitchen wall",
    "render_setting": "...",
    "render_prompt": "...",
    "map_query": "Porto Portugal old kitchen"
  }
}
```

---

### `POST /api/blueprint`

Deterministic slot-fill. No AI call — pure inventory logic.

**Request:**
```json
{
  "emotions": ["warmth", "safety", "nostalgia"],
  "formula": "Anchor Heavy",
  "intensity": 2,
  "poem_emotions": {
    "structural": "safety",
    "secondary": "warmth",
    "undertone": "longing"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "slots": [
      {
        "role": "anchor",
        "item": "White Peony",
        "colors": ["white", "cream"],
        "stems": 3,
        "arc_positions": ["12", "4", "8"]
      },
      ...
    ],
    "totalStems": 31,
    "arcConfig": {
      "intensity": 2,
      "name": "Three-Quarter Arc",
      "positions": ["12", "1", "2", "3", "4", "5", "6", "7", "8"]
    }
  }
}
```

---

## Waitlist storage (Supabase)

`POST /api/waitlist` writes to the Supabase `waitlist` table when
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. If they are not set,
it falls back to appending to a local `waitlist.json` file (fine for local
dev, but **not durable on Vercel** — serverless filesystems are ephemeral).

- Project: **Evercrafted** → `https://qybnmlqesnbmgxayhllf.supabase.co`
- Tables: `public.waitlist` (`id, email, scene_title, memory, source, created_at`)
  and `public.inventory` (the user-facing tagger saves here; falls back to a
  local `inventory.json` when Supabase env vars are unset)
- RLS is enabled with no public policies. The server uses the **service role**
  key, which bypasses RLS, so the table is not readable/writable by the browser.

Get the service role key from the Supabase dashboard:
**Project Settings → API → `service_role` secret**. Keep it server-side only.

---

## Deploying to Vercel

1. Install the Vercel CLI: `npm i -g vercel`
2. From the project directory: `vercel`
3. Set environment variables in the Vercel dashboard (Project → Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` → your Anthropic key
   - `SUPABASE_URL` → `https://qybnmlqesnbmgxayhllf.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY` → your Supabase service role key
   - `ALLOWED_ORIGINS` → (optional) extra browser origins, comma-separated
4. Deploy: `vercel --prod`

`vercel.json` serves the static `.html` pages and routes `/api/*` to
`server.js` (a serverless function). The site root (`/`) serves the marketing
page. The front-end `apiBase` auto-detects its environment: it calls
`http://localhost:3001` when opened locally and the same origin in production —
no manual URL edits needed.
