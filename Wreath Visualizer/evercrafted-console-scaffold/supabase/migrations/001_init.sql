-- supabase/migrations/001_init.sql
-- Evercrafted System Console — initial schema
-- Run via: supabase db push

-- ─────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  display_name  text,
  tier          text not null default 'bloom'
                check (tier in ('bloom','craft','studio','atelier')),
  stripe_customer_id text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
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

-- ─────────────────────────────────────────
-- BLUEPRINTS
-- ─────────────────────────────────────────
create table if not exists public.blueprints (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  name            text not null,
  formula         text not null,
  emotion_quadrant text,
  style_signature  text,
  season          text,
  size            text,
  ec_canon_version text default 'V1',
  ec_certified    boolean default true,
  blueprint_json  jsonb,
  notes           text,
  tags            text[] default '{}',
  source          text default 'manual'  -- 'manual' | 'memory_weaver' | 'abc_lab'
                  check (source in ('manual','memory_weaver','abc_lab','imported')),
  created_at      timestamptz default now()
);

alter table public.blueprints enable row level security;
create policy "Users can CRUD own blueprints"
  on public.blueprints for all using (auth.uid() = user_id);

create index blueprints_user_id_idx on public.blueprints(user_id);
create index blueprints_formula_idx on public.blueprints(formula);

-- ─────────────────────────────────────────
-- ORDERS
-- ─────────────────────────────────────────
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  order_number    text unique not null,  -- e.g. EC-001
  customer_name   text not null,
  customer_email  text,
  memory_text     text,
  occasion        text,
  season          text,
  size            text,
  budget_tier     text,
  formula         text,
  blueprint_id    uuid references public.blueprints(id),
  quote_total     numeric(10,2),
  lead_time_days  int default 10,
  status          text default 'Received'
                  check (status in ('Received','Build','Quality Check','Shipped','Cancelled')),
  ai_brief        text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users can CRUD own orders"
  on public.orders for all using (auth.uid() = user_id);

create index orders_user_id_idx on public.orders(user_id);
create index orders_status_idx on public.orders(status);

-- ─────────────────────────────────────────
-- DROPS (Analytics)
-- ─────────────────────────────────────────
create table if not exists public.drops (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  name          text not null,
  formula       text,
  units_sold    int default 0,
  retail_price  numeric(10,2),
  cogs_per_unit numeric(10,2),
  revenue       numeric(10,2) generated always as (units_sold * retail_price) stored,
  margin_pct    numeric(5,2) generated always as (
    case when retail_price > 0
    then round(((retail_price - cogs_per_unit) / retail_price * 100)::numeric, 2)
    else 0 end
  ) stored,
  launched_at   date default current_date,
  created_at    timestamptz default now()
);

alter table public.drops enable row level security;
create policy "Users can CRUD own drops"
  on public.drops for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- INVENTORY (optional — if user manages via console)
-- ─────────────────────────────────────────
create table if not exists public.inventory (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  name          text not null,
  role          text check (role in ('focal','supporting','filler','greenery')),
  color_family  text,
  stock_count   int default 0,
  max_stock     int default 0,
  formula_compat text[] default '{}',
  compat_level  text default 'med' check (compat_level in ('high','med','low')),
  sku           text,
  supplier      text,
  updated_at    timestamptz default now()
);

alter table public.inventory enable row level security;
create policy "Users can CRUD own inventory"
  on public.inventory for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- STRIPE WEBHOOK HANDLER (tier upgrades)
-- Handle in app/api/stripe/webhook/route.ts
-- Updates profiles.tier when subscription changes
-- ─────────────────────────────────────────
-- (No table needed — updates profiles.tier directly)

-- ─────────────────────────────────────────
-- UPDATED_AT TRIGGER (shared)
-- ─────────────────────────────────────────
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

create trigger set_orders_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();
