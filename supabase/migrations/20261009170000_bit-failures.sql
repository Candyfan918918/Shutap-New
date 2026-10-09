-- Why a bit could not be written: controls, the rule each candidate failed,
-- the gateway error. No story text. Service role only.
create table if not exists public.bit_failures (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  controls jsonb,
  rejected jsonb not null default '[]'::jsonb,
  error text,
  lab boolean not null default false,
  ms integer
);
alter table public.bit_failures enable row level security;
