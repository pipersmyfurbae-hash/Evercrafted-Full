-- Calibration corpus: approve/reject signal on generated scenes & layouts.
-- Run once in Supabase (or via the Supabase MCP) to enable durable storage;
-- until it exists, /api/layout-feedback falls back to local layout-feedback.json.
create table if not exists public.layout_feedback (
  id          bigint generated always as identity primary key,
  vote        text not null check (vote in ('up','down')),
  kind        text not null default 'scene',        -- 'scene' | 'layout'
  scene_title text default '',
  memory      text default '',
  design_id   text default '',                       -- ties to designs.id when known
  seed        text default '',                       -- R9 genome seed (layout votes)
  genome      text default '',                       -- serialized generator genome
  reason      text default '',
  source      text default 'try-page',
  created_at  timestamptz not null default now()
);
-- service-role inserts (server-side) bypass RLS; enable RLS so nothing else can read PII.
alter table public.layout_feedback enable row level security;
