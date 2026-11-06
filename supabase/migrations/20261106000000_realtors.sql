-- Shutap for Realtors (Nov 5 2026). A listing is what an agent pasted (read
-- from a page or from text) plus their note and controls; a kit is one tone's
-- six outputs for it; every edit or rewrite is a kit version. kit_evals holds
-- the founder's ratings from /kit-lab before the product is turned on.
-- Only the server reads or writes these.
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  source text not null,
  url text,
  address text,
  city text,
  price text,
  beds numeric,
  baths numeric,
  sqft integer,
  year_built integer,
  description text not null default '',
  photos jsonb not null default '[]'::jsonb,
  note text not null default '',
  controls jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists listings_user_idx on public.listings (user_id, created_at desc);

create table if not exists public.kits (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  user_id uuid not null,
  tone text not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);
create index if not exists kits_listing_idx on public.kits (listing_id, created_at desc);

create table if not exists public.kit_versions (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references public.kits(id) on delete cascade,
  kind text not null check (kind in ('original', 'edited', 'rewrite')),
  content jsonb not null,
  skipped jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists kit_versions_kit_idx on public.kit_versions (kit_id, created_at);

create table if not exists public.kit_evals (
  id uuid primary key default gen_random_uuid(),
  listing jsonb not null,
  controls jsonb not null,
  result jsonb not null,
  prompt_version text not null,
  rating text check (rating in ('pick', 'cut', 'rewrite')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.listings enable row level security;
alter table public.kits enable row level security;
alter table public.kit_versions enable row level security;
alter table public.kit_evals enable row level security;
revoke all on public.listings, public.kits, public.kit_versions, public.kit_evals from anon, authenticated;
grant all on public.listings, public.kits, public.kit_versions, public.kit_evals to service_role;
