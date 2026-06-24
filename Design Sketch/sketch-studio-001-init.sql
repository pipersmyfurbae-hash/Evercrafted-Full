-- supabase/migrations/001_init.sql
-- Evercrafted Design Sketch Studio — initial schema

-- ── PROFILES ──────────────────────────────────────────────────────────────────
-- Extends auth.users with Evercrafted subscription tier.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  tier        text not null default 'bloom'
                   check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- ── SAVED SKETCHES ────────────────────────────────────────────────────────────
-- Stores user-saved wreath sketch configurations (Craft+ tier required).
create table if not exists public.saved_sketches (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  style       text not null,                  -- e.g. "Victorian", "Custom"
  elements    jsonb not null,                 -- element placement array (same structure as wreathDesigns)
  specs       jsonb,                          -- { diameter, style, balance, element_count }
  note        text,                           -- design note (AI-generated or manual)
  is_ai_note  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.saved_sketches enable row level security;
create policy "Users can read own sketches"
  on public.saved_sketches for select using (auth.uid() = user_id);
create policy "Users can insert own sketches"
  on public.saved_sketches for insert with check (auth.uid() = user_id);
create policy "Users can update own sketches"
  on public.saved_sketches for update using (auth.uid() = user_id);
create policy "Users can delete own sketches"
  on public.saved_sketches for delete using (auth.uid() = user_id);

-- Index for fast user library queries
create index idx_saved_sketches_user_id on public.saved_sketches(user_id);
create index idx_saved_sketches_created_at on public.saved_sketches(created_at desc);

-- ── AI GENERATION LOG ─────────────────────────────────────────────────────────
-- Tracks Atelier AI generation usage (for rate limiting + analytics).
create table if not exists public.ai_generations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  action      text not null,                  -- 'generate_note' | 'generate_layout'
  input_hash  text,                           -- hash of input for dedup
  tokens_used integer,
  created_at  timestamptz not null default now()
);

alter table public.ai_generations enable row level security;
create policy "Users can read own generations"
  on public.ai_generations for select using (auth.uid() = user_id);
-- Insert handled server-side only (service role) — no client insert policy

-- ── UPDATED_AT TRIGGER ────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger set_sketches_updated_at
  before update on public.saved_sketches
  for each row execute procedure public.set_updated_at();
