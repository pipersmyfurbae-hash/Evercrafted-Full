-- Moodoor curated-match data model: the curated `library` and the `match_queries`
-- analytics log. Net-new for the curated-match pivot (no library/EVS storage
-- existed before).
--
-- pgvector note: the `vector` extension (0.8.0) is AVAILABLE but NOT installed on
-- this project. We deliberately store the 11 EVS dims as plain numeric columns and
-- compute weighted cosine in the app layer (library is small; weighting +
-- diversity cap are cleaner in TS). Adopting pgvector later is purely additive:
--   ALTER TABLE library ADD COLUMN evs_vec vector(11); -- + backfill + index.

-- ── library: curated, pre-rendered wreaths ─────────────────────────────────────
create table if not exists public.library (
  id                      uuid primary key default gen_random_uuid(),
  slug                    text unique not null,
  title                   text not null,
  story_copy              text,
  hero_image_url          text not null,
  thumb_image_url         text,
  blueprint               jsonb not null,           -- runSlotFill output: {formula,slots,totalStems,arcConfig}
  genome                  text,
  bsre_score              numeric,

  -- EVS-1.0 continuous dimensions (each 0.00-1.00)
  warmth                  numeric not null,
  energy                  numeric not null,
  weight                  numeric not null,
  valence                 numeric not null,
  nostalgia               numeric not null,
  restraint               numeric not null,
  intimacy                numeric not null,
  season_spring           numeric not null,
  season_summer           numeric not null,
  season_autumn           numeric not null,
  season_winter           numeric not null,

  -- EVS-1.0 categorical tags
  occasion                text check (occasion in ('memorial','wedding','new-home','anniversary','everyday','holiday-specific','gift-general')),
  palette_family          text,
  formula                 text not null check (formula in ('Crescent','Side Sweep','Bottom Heavy','Diagonal Flow','Focal Burst','Garden Scatter','Wild Asymmetry','Half Ring','Spiral Flow')),
  bow                     text not null default 'none' check (bow in ('none','subtle','statement')),
  botanical_leads         jsonb not null default '[]'::jsonb,
  collection_id           uuid,

  -- commerce
  purchasable_finished    boolean not null default true,
  purchasable_blueprint   boolean not null default true,
  purchasable_kit         boolean not null default false,
  price_finished_cents    integer,
  price_blueprint_cents   integer,
  price_kit_cents         integer,
  stripe_price_finished   text,
  stripe_price_blueprint  text,
  stripe_price_kit        text,

  published               boolean not null default false,
  in_stock                boolean not null default true,
  created_at              timestamptz not null default now()
);

create index if not exists library_published_idx on public.library (published) where published = true;
create index if not exists library_occasion_idx on public.library (occasion);

-- ── match_queries: analytics — thin-coverage territories steer production ───────
create table if not exists public.match_queries (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  memory_text_hash    text,                       -- hash by default (PII-light)
  query_vector        jsonb not null,             -- the 11 EVS dims Claude produced
  query_categoricals  jsonb,                      -- occasion/bow/constraints
  returned_matches    jsonb not null,             -- [{library_id, score, formula}]
  top_score           numeric,
  felt_right          boolean,                    -- one-tap feedback signal
  feedback_match_id   uuid
);

create index if not exists match_queries_created_idx on public.match_queries (created_at desc);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table public.library enable row level security;
alter table public.match_queries enable row level security;

-- library: anyone may read PUBLISHED rows; no public writes (admin via service role).
drop policy if exists library_public_read on public.library;
create policy library_public_read on public.library
  for select to anon, authenticated
  using (published = true);

-- match_queries: NO anon/authenticated policies — all reads/writes go through the
-- service-role client (which bypasses RLS), making this table effectively server-only.
