-- Joke battle (homepage). The bank is in-house: setups the writer writes,
-- four versions each with a /guides technique. Never from a user's story.
-- Players are a random ID kept in the browser (linked to an account on
-- sign-in). Results are admin-only. Only the server reads or writes these.
create table if not exists public.battle_setups (
  id uuid primary key default gen_random_uuid(),
  n int not null unique,
  topic text not null default 'everyday',
  setup text not null,
  active boolean not null default true,
  picks int not null default 0,   -- counted picks (flags excluded)
  nones int not null default 0,   -- of which "none of these"
  created_at timestamptz not null default now()
);
create table if not exists public.battle_versions (
  id uuid primary key default gen_random_uuid(),
  setup_id uuid not null references public.battle_setups(id) on delete cascade,
  text text not null,
  technique_id text not null,
  technique_name text not null,
  guide_slug text,
  guide_title text,
  active boolean not null default true,
  shown int not null default 0,   -- counted rounds it appeared in
  picked int not null default 0,  -- counted rounds it won
  created_at timestamptz not null default now()
);
create index if not exists battle_versions_setup on public.battle_versions (setup_id);
create table if not exists public.battle_players (
  player_id uuid primary key,
  user_id uuid,
  picks int not null default 0,
  streak_days int not null default 0,
  last_day date,
  humor jsonb not null default '{}'::jsonb,
  test_passed int not null default 0,
  test_failed int not null default 0,
  rounds_served int not null default 0,
  served_today int not null default 0,
  served_day date,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  linked_at timestamptz
);
create index if not exists battle_players_user on public.battle_players (user_id);
create table if not exists public.battle_rounds (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null,
  user_id uuid,
  setup_id uuid not null references public.battle_setups(id) on delete cascade,
  shown uuid[] not null,           -- the real versions on screen
  options text[] not null,         -- on-screen order: version ids and 'control'
  control_text text,               -- the flat control line on a test round
  is_test boolean not null default false,
  served_at timestamptz not null default now(),
  pick text,                       -- a version id, 'control', 'none' or 'skip'
  picked_at timestamptz,
  ms int,                          -- server-measured, served → picked
  flag text                        -- too_fast | test_fail | repeat: stored, not counted
);
create index if not exists battle_rounds_player on public.battle_rounds (player_id);
create index if not exists battle_rounds_setup on public.battle_rounds (setup_id);
create index if not exists battle_rounds_served on public.battle_rounds (served_at desc);
alter table public.battle_setups enable row level security;
alter table public.battle_versions enable row level security;
alter table public.battle_players enable row level security;
alter table public.battle_rounds enable row level security;
revoke all on public.battle_setups, public.battle_versions, public.battle_players, public.battle_rounds from anon, authenticated;
grant all on public.battle_setups, public.battle_versions, public.battle_players, public.battle_rounds to service_role;
