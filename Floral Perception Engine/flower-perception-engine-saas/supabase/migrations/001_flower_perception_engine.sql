-- supabase/migrations/001_flower_perception_engine.sql
-- Flower Perception Engine database schema
-- Run via: supabase db push

-- ─── PROFILES (shared Evercrafted base table) ───────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  tier       text not null default 'bloom' check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── FLOWER PERCEPTIONS ──────────────────────────────────────────────────────
create table if not exists public.flower_perceptions (
  id                text primary key,           -- perc_XXXXXXXXX
  user_id           uuid not null references public.profiles(id) on delete cascade,
  image_url         text,
  emotional_profile jsonb not null,
  visual_features   jsonb not null,
  tags              jsonb not null,
  confidence_score  float not null default 0,
  created_at        timestamptz default now()
);

alter table public.flower_perceptions enable row level security;

create policy "Users can read own perceptions"
  on public.flower_perceptions for select
  using (auth.uid() = user_id);

create policy "Users can insert own perceptions"
  on public.flower_perceptions for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own perceptions"
  on public.flower_perceptions for delete
  using (auth.uid() = user_id);

-- Index for fast user lookups
create index idx_flower_perceptions_user_id on public.flower_perceptions(user_id);
create index idx_flower_perceptions_created_at on public.flower_perceptions(created_at desc);

-- ─── FLOWER TAG LEARNING ─────────────────────────────────────────────────────
create table if not exists public.flower_tag_learning (
  id               uuid primary key default gen_random_uuid(),
  perception_id    text not null references public.flower_perceptions(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  user_adjustments jsonb not null default '{}',  -- emotion slider adjustments
  created_at       timestamptz default now()
);

alter table public.flower_tag_learning enable row level security;

create policy "Users can manage own tag learning"
  on public.flower_tag_learning for all
  using (auth.uid() = user_id);

-- ─── INVENTORY EMOTIONAL TAGS ────────────────────────────────────────────────
-- Atelier tier only — auto-tagged inventory items
create table if not exists public.inventory_emotional_tags (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  sku              text not null,
  emotion_tags     jsonb not null default '[]',
  visual_signature jsonb not null default '{}',
  perception_id    text references public.flower_perceptions(id),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique(user_id, sku)
);

alter table public.inventory_emotional_tags enable row level security;

create policy "Users can manage own inventory tags"
  on public.inventory_emotional_tags for all
  using (auth.uid() = user_id);

create index idx_inventory_tags_user_sku on public.inventory_emotional_tags(user_id, sku);

-- ─── PERCEPTION BLUEPRINTS ───────────────────────────────────────────────────
create table if not exists public.perception_blueprints (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  perception_id  text not null references public.flower_perceptions(id),
  blueprint_id   text not null,
  blueprint_data jsonb not null,
  created_at     timestamptz default now()
);

alter table public.perception_blueprints enable row level security;

create policy "Users can manage own perception blueprints"
  on public.perception_blueprints for all
  using (auth.uid() = user_id);
