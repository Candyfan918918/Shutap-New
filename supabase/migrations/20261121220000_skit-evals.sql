-- Shutap for small business (Nov 21 2026): the founder's ratings from
-- /skit-lab, before the product is turned on. One row per lab run: the shop
-- and the ask as typed into the lab (invented or the founder's own; never an
-- owner's), every candidate set with what the checks flagged, and the rating.
-- Only the server reads or writes this. Safe to run twice.
create table if not exists public.skit_evals (
  id uuid primary key default gen_random_uuid(),
  shop jsonb not null,
  ask jsonb not null,
  result jsonb not null,
  prompt_version text not null,
  rating text check (rating in ('pick', 'cut', 'rewrite')),
  notes text,
  created_at timestamptz not null default now()
);
alter table public.skit_evals enable row level security;
revoke all on public.skit_evals from anon, authenticated;
grant all on public.skit_evals to service_role;
