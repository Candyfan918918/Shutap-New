-- Shutap for Realtors, the product (Nov 6 2026). The listing carries every
-- fact the reader now gives; a kit remembers its controls and whether it was
-- bought on its own; kit_downloads is the ledger for copies, PDFs and text
-- files (one row per output per version per day; a PDF is six units). Only
-- the server reads or writes these. Safe to run twice.
alter table public.listings
  add column if not exists hoa text,
  add column if not exists taxes text,
  add column if not exists lot_sqft integer,
  add column if not exists mls text,
  add column if not exists status text,
  add column if not exists open_houses jsonb not null default '[]'::jsonb;

alter table public.kits
  add column if not exists controls jsonb not null default '{}'::jsonb,
  add column if not exists paid boolean not null default false,
  add column if not exists day text;
create index if not exists kits_user_day_idx on public.kits (user_id, day);

create table if not exists public.kit_downloads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kit_id uuid not null references public.kits(id) on delete cascade,
  version_id uuid not null references public.kit_versions(id) on delete cascade,
  output text not null,
  units integer not null default 1,
  tier text not null,
  watermarked boolean not null default false,
  day text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists kit_downloads_once_idx on public.kit_downloads (user_id, version_id, output, day);
create index if not exists kit_downloads_user_day_idx on public.kit_downloads (user_id, day);

alter table public.kit_downloads enable row level security;
revoke all on public.kit_downloads from anon, authenticated;
grant all on public.kit_downloads to service_role;
