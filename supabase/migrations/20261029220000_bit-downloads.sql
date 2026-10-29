-- Download ledger (Oct 29 2026): one row per download of a bit version —
-- caption + hashtags copied, the picture, the script PDF, the 5-second
-- video. Each kind is its own download against the daily cap (Free 1,
-- Basic 3, Pro none); the same kind on the same version the same day is
-- free (the unique index). Only the server reads or writes it.
create table if not exists public.bit_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  bit_id uuid not null,
  version_id uuid not null,
  kind text not null check (kind in ('caption','image','pdf','video')),
  tier text not null,
  watermarked boolean not null default false,
  day date not null,
  created_at timestamptz not null default now()
);
create unique index if not exists bit_downloads_once_per_day on public.bit_downloads (user_id, version_id, kind, day);
create index if not exists bit_downloads_user_day on public.bit_downloads (user_id, day);
create index if not exists bit_downloads_created on public.bit_downloads (created_at desc);
alter table public.bit_downloads enable row level security;
revoke all on public.bit_downloads from anon, authenticated;
grant all on public.bit_downloads to service_role;
