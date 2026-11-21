-- Shutap for small business, slice 3 (Nov 21 2026). Dark behind the
-- smallbusiness flag.
--
-- shop_skit_sets: the three skits drafted for one ask. day_text is what the
-- owner said happened, after the Guard and the Scrubber (names, places and
-- contact details taken out); the raw words are never stored. picked is the
-- one they chose (0..2); lines holds the lines as the owner left them
-- (their own edits and the "funnier" versions they kept), by line key.
--
-- shop_videos: one row per finished video. It is what the plan counts
-- (Free 3 ever, Basic 1 a Pacific day) and what My creations lists. A video
-- is kept until delete_on (30 days after it was made), then the file is
-- removed and deleted_at is set; the row stays so the count stays true.
--
-- Only the server reads or writes these. Safe to run twice.
create table if not exists public.shop_skit_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  day text not null,
  day_text text not null default '',
  promote text not null default '',
  idea text not null default '',
  skits jsonb not null,
  picked int check (picked between 0 and 2),
  lines jsonb not null default '{}'::jsonb,
  prompt_version text not null,
  tier text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shop_skit_sets_user_day_idx on public.shop_skit_sets (user_id, day, created_at desc);

create table if not exists public.shop_videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  shop_id uuid not null references public.shops(id) on delete cascade,
  skit_set_id uuid references public.shop_skit_sets(id) on delete set null,
  title text not null default '',
  day text not null,
  delete_on text not null,
  storage_path text,
  sent_tiktok boolean not null default false,
  saved boolean not null default false,
  tier text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists shop_videos_user_idx on public.shop_videos (user_id, created_at desc);
create index if not exists shop_videos_user_day_idx on public.shop_videos (user_id, day);
create index if not exists shop_videos_delete_idx on public.shop_videos (delete_on) where deleted_at is null;

alter table public.shop_skit_sets enable row level security;
alter table public.shop_videos enable row level security;
revoke all on public.shop_skit_sets, public.shop_videos from anon, authenticated;
grant all on public.shop_skit_sets, public.shop_videos to service_role;
