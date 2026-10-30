-- Daily humor training (/bit-daily): the day's stories, and one row per
-- story × /funniest technique, rated keep / cut / rewrite by the founder.
-- Kept and rewritten rows feed the live writer (src/lib/bits/house.server.ts).
-- Only the server reads or writes these tables.
create table if not exists public.bit_daily_days (
  day date primary key,
  page_slug text,
  stories jsonb not null,
  created_at timestamptz not null default now()
);
create table if not exists public.bit_daily (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  story_id text not null,
  story text not null,
  technique_id text not null,
  technique_name text not null,
  page_slug text,
  bit jsonb,
  meta jsonb,
  verdict text check (verdict in ('keep', 'cut', 'rewrite')),
  rewrite text,
  best_line text,
  note text,
  created_at timestamptz not null default now(),
  rated_at timestamptz,
  unique (day, story_id, technique_id)
);
create index if not exists bit_daily_rated_at on public.bit_daily (rated_at desc);
alter table public.bit_daily_days enable row level security;
alter table public.bit_daily enable row level security;
revoke all on public.bit_daily_days from anon, authenticated;
revoke all on public.bit_daily from anon, authenticated;
grant all on public.bit_daily_days to service_role;
grant all on public.bit_daily to service_role;
