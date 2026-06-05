# PRD — Wreath Academy Builder
### Evercrafted Studio · v1.0 · June 2026

---

## 1. Product Overview

**What it does.** Wreath Academy Builder converts a wreath design (an Evercrafted blueprint JSON or a plain-language description) into a complete, sellable tutorial product: a structured course outline, fully written lessons, filmable video scripts, a materials list, a pricing recommendation, and a marketplace-ready sales listing. The finished course exports as a single document the maker can sell on Etsy, Gumroad, or their own site.

**Who it's for.** Experienced faux botanical wreath makers — typically Etsy sellers and studio owners — who are regularly asked to teach but stall on the work of course creation: structuring a curriculum, writing instruction a beginner can follow, scripting video, and writing sales copy. Wreath education is an established revenue stream (Etsy digital tutorials, YouTube, Skillshare); this tool removes the production barrier.

**Why it exists.** Evercrafted's design pipeline already produces blueprints and build sequences. Academy Builder is the monetization layer on top of them: it lets makers sell their *knowledge*, not just their wreaths — recurring, non-physical revenue that doesn't require their hands. Strategically, it deepens Atelier-tier value and creates a standalone $99 lifetime-license product.

---

## 2. User Stories

1. As an **experienced wreath maker**, I want to paste a design I've already built and get a structured course outline, so that I don't start from a blank page.
2. As a **maker who teaches informally**, I want each lesson written in clear steps with pro tips and common mistakes, so that my "you just feel it" knowledge becomes teachable.
3. As a **camera-shy creator**, I want a word-for-word video script with hooks and b-roll directions for every lesson, so that I can film a course in a weekend by reading from a stand.
4. As an **Etsy seller**, I want a finished sales listing — title, description, tags, price — so the course can go live the same day it's written.
5. As a **Studio-tier subscriber**, I want to preview the Atelier features (blurred, never hidden), so I understand exactly what upgrading unlocks.
6. As a **returning user**, I want my courses saved to my account, so I can finish writing lessons across multiple sessions and adapt a course for a new season.

---

## 3. User Flow

1. Landing page → "Build your first course" CTA
2. Auth (Supabase email magic link); profile auto-created at `bloom`
3. Tier check — Academy Builder workspace requires Studio+; lower tiers see the intake with a tier gate on generation
4. **Intake**: paste blueprint/description → select audience (Beginner/Intermediate/Advanced) → select format (Mini 3 / Full 6 / Masterclass 9 lessons) → optional teaching voice
5. **Generate outline** → course saved to `courses` table → workspace opens
6. **Workspace**: curriculum panel (left) + lesson editor (right). Click a lesson → "Write this lesson" → content generated and saved. Rewrite available per lesson.
7. **Atelier features**: per-lesson video script; whole-course sales listing. Studio users see both panels blurred with upgrade CTA.
8. **Export**: assembles outline + all written lessons + scripts + listing into one markdown/PDF download
9. Next action: list the course on Etsy/Gumroad (listing copy ready) or start another course

---

## 4. Tier Feature Matrix

| Feature | Bloom | Craft | Studio | Atelier |
|---|---|---|---|---|
| View saved courses (read-only) | — | ✓ | ✓ | ✓ |
| Course outline generation | locked | locked | ✓ | ✓ |
| Lesson writing (3–9 lessons) | locked | locked | ✓ | ✓ |
| Lesson rewrite | — | — | ✓ | ✓ |
| Materials list + price suggestion | — | — | ✓ | ✓ |
| Video scripts (per lesson) | — | — | locked | ✓ |
| Sales listing (title, copy, tags, price) | — | — | locked | ✓ |
| Course export (markdown) | — | — | ✓ (Evercrafted footer) | ✓ |
| White-label export (no branding) | — | — | locked | ✓ |
| Courses per month | — | — | 3 | Unlimited |

**Lifetime license ($99 one-time):** grants Atelier-level access *within Academy Builder only* (`profiles.academy_lifetime = true`), independent of subscription tier. Locked features are always rendered with blur overlay + upgrade CTA — never hidden.

---

## 5. AI Integration Details

**Model:** `claude-sonnet-4-20250514` via server-side proxy only. Four staged tasks (keeps each call inside token limits and gives per-stage regeneration):

| Task | Gate | Input | Output schema |
|---|---|---|---|
| `outline` | Studio | design source + audience + format + voice | `{course_title, tagline, transformation, modules:[{module_title, lessons:[{lesson_title, summary, duration_min}]}], materials[], suggested_price}` |
| `lesson` | Studio | brief context + course title + module + target lesson | `{objective, steps:[{title, instruction, pro_tip}], common_mistake, checkpoint}` |
| `video` | Atelier | brief context + lesson title (+ lesson content if written) | `{hook, sections:[{title, script, broll}], outro_cta}` |
| `listing` | Atelier | brief context + condensed outline | `{listing_title, description, tags[13], price, price_reason}` |

Full system prompts live in `lib/claude.ts` (see scaffold). Hard rules baked into every prompt: JSON-only responses; construction-order lesson sequencing; clock-position placement language; premium silk/faux botanical vocabulary — never "fresh flowers", "plastic", or "artificial". **The AI never outputs placement coordinates** — design data flows *in* from blueprints; it is never regenerated. Responses are fence-stripped and `JSON.parse`d in try/catch; parse failure surfaces a retry, never a blank state.

---

## 6. Data Model

**`profiles`** — `id uuid PK → auth.users`, `tier text default 'bloom'`, `academy_lifetime boolean default false`, `created_at`. RLS: user reads/updates own row. Auto-created by trigger on signup.

**`courses`** — `id uuid PK`, `user_id FK`, `course_title`, `design_source text`, `audience`, `format`, `voice`, `outline jsonb`, `listing jsonb null`, timestamps. Index on `user_id`. RLS: all operations scoped to `auth.uid() = user_id`.

**`lessons`** — `id uuid PK`, `course_id FK`, `module_index int`, `lesson_index int`, `content jsonb null`, `video_script jsonb null`, `updated_at`. Unique `(course_id, module_index, lesson_index)`; index on `course_id`. RLS: via ownership of parent course.

Full SQL with policies and trigger in `supabase/migrations/001_init.sql`.

---

## 7. API Routes

| Route | Method | Auth | Tier | Request | Response |
|---|---|---|---|---|---|
| `/api/claude` | POST | required | per task (see §5) | `{task, content, format?}` | `{success, data}` · 403 `{error:"tier_required", required}` |
| `/api/stripe/webhook` | POST | Stripe signature | — | Stripe event | `{received:true}` — syncs `tier` / `academy_lifetime` |
| Supabase client | — | RLS | — | direct table reads/writes for `courses`/`lessons` | — |

Stripe checkout sessions are created with `metadata.user_id`; webhook maps price IDs → tier, and the lifetime price → `academy_lifetime = true`. Subscription deletion downgrades to `bloom` (lifetime flag persists).

---

## 8. Component Map

| Component | Renders | Key props / state |
|---|---|---|
| `AppHeader` | Wordmark, app name, tier badge | `appName`, `tier` |
| `AcademyBuilderApp` | Intake + workspace | `tier`; state: `designSource, audience, format, voice, outline, lessons{}, scripts{}, listing, selected, busy, error` |
| Intake view | Design textarea, audience/format chips, voice input, generate CTA | local state → `callAcademy("outline")` |
| Curriculum panel | Modules, lesson rows with done-checks, materials, price — *the botanical moment* (leaf sprig + ✦ dividers) | `outline`, `lessons`, `selected` |
| Lesson editor | Objective, steps, pro tips, mistake/checkpoint cards, rewrite | `lessons[key]`, `busy` |
| `TierGate` | Blur + overlay + upgrade CTA around video/listing panels | `userTier`, `required`, `title`, `description` |
| Video panel | Hook, sections w/ b-roll, outro | `scripts[key]` |
| Listing panel | Title, description, tag chips, price card | `listing` |
| Export | Assembles markdown blob download | reads all state |
| `BotanicalDivider` | ✦ section divider | — |

---

## 9. Deployment Checklist

1. **Supabase**: create project → run `001_init.sql` → enable email auth → copy URL + keys
2. **Stripe**: create Craft/Studio/Atelier subscription prices + `$99` one-time Academy lifetime price → configure webhook endpoint → copy secrets
3. **Vercel**: import repo → set all env vars from `.env.local.example` (verify `ANTHROPIC_API_KEY` is *not* `NEXT_PUBLIC_`) → deploy
4. **Smoke test**: signup → profile at bloom → outline returns 403 → upgrade to Studio (test card) → outline + lessons generate and persist → video panel blurred → upgrade to Atelier → script + listing generate → export downloads → buy lifetime license on a bloom account → Academy features unlock
5. **Content QA**: generate one full Beginner course end-to-end; verify construction order, clock-position language, no "fresh/plastic/artificial" leakage

---

## 10. Known Limitations & Future Work

**v1 limitations**
- Markdown export only; styled PDF (via the docx/pdf pipeline) is the natural v1.1
- No image generation for lesson headers — the Faux Floral Render Engine could supply per-lesson render prompts
- Single design per course; multi-design "technique" courses not yet supported
- Course content is English-only; no editing UI beyond full-lesson rewrite (inline editing in v1.1)
- Monthly course limits enforced client-side in v1; move to DB counter

**v2 candidates**
- **Branded PDF course export** with Evercrafted typography (or white-label) — the deliverable students actually receive
- **Course hosting**: a buyer-facing course page under the maker's storefront (connects to Blueprint Marketplace Engine)
- **Bundle generator**: course + locked blueprint + supply list as one Etsy product
- **Seasonal adaptation**: re-skin a course for a new season via the Seasonal Mood Drift layer
- **Analytics loop**: course sales data feeding the Marketplace Intelligence Engine

---

*Wreath Academy Builder — An Evercrafted Studio product. The blueprint is the source of truth; the knowledge is the second product.*
