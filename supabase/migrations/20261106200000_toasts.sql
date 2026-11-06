-- Shutap Toasts, slice 0 (Nov 6 2026). A toast is one intake form (occasion,
-- who it's for, story lines, the one true thing, tone, length, must-say /
-- never-say) and the speech written from it; every edit kept before the lock
-- is a version; the lock freezes one version for good. "Change a line" after
-- a lock is a new toast whose parent is the locked one.
--
-- Names never reach these tables: the browser keeps them and sends
-- {friend}, {partner} and {me}; every other free text in `form` has been
-- through the Scrubber. toast_evals holds the founder's ratings from
-- /toast-lab before the product is turned on. Only the server reads or
-- writes these. Safe to run twice.
create table if not exists public.toasts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  occasion text not null check (occasion in ('best_man', 'maid_of_honor', 'parent', 'thanksgiving', 'holiday_party', 'new_years', 'retirement', 'birthday', 'toastmasters', 'other')),
  tone text not null check (tone in ('warm_funny', 'roast_lite', 'dry', 'heartfelt')),
  length text not null,
  form jsonb not null default '{}'::jsonb,
  prompt_version text not null,
  -- the plan it was written on; paid = bought on its own ($12.99: clean,
  -- never counted); marked = the free toast, every page ends "— shutap.com"
  tier text not null,
  paid boolean not null default false,
  marked boolean not null default false,
  parent_id uuid references public.toasts(id) on delete set null,
  locked_at timestamptz,
  locked_version_id uuid,
  day text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists toasts_user_idx on public.toasts (user_id, created_at desc);
create index if not exists toasts_user_day_idx on public.toasts (user_id, day);

create table if not exists public.toast_versions (
  id uuid primary key default gen_random_uuid(),
  toast_id uuid not null references public.toasts(id) on delete cascade,
  kind text not null check (kind in ('original', 'edited')),
  content jsonb not null,
  checks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists toast_versions_toast_idx on public.toast_versions (toast_id, created_at);

do $$ begin
  alter table public.toasts add constraint toasts_locked_version_fk foreign key (locked_version_id) references public.toast_versions(id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.toast_evals (
  id uuid primary key default gen_random_uuid(),
  form jsonb not null,
  result jsonb not null,
  prompt_version text not null,
  rating text check (rating in ('pick', 'cut', 'rewrite')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.toasts enable row level security;
alter table public.toast_versions enable row level security;
alter table public.toast_evals enable row level security;
revoke all on public.toasts, public.toast_versions, public.toast_evals from anon, authenticated;
grant all on public.toasts, public.toast_versions, public.toast_evals to service_role;
