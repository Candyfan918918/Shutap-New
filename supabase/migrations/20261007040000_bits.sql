-- Bits: the unit of the bit generator. One story in, one bit out (hook,
-- setup, tags, button), plus every version made from it afterwards.
--
-- Server-only. RLS is on and there are no client policies: every read and
-- write goes through the service role in src/lib/bits.functions.ts, and the
-- owner check lives there (user_id, or the guest's anon key).

create table if not exists public.bits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  anon_key text,
  story_clean text not null,
  controls jsonb not null default '{}'::jsonb,
  -- stage 1 output, reused by varyBit so a version builds on the same reading
  premises jsonb,
  -- the ranked candidate bits, kept for Mix your own (phase 3)
  candidates jsonb not null default '[]'::jsonb,
  -- five spare tags from the same story, for swapTag
  alt_tags text[] not null default '{}',
  prompt_version text,
  writer_model text,
  judge_model text,
  judge_why text,
  used_fallback boolean not null default false,
  timings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint bits_owner check (user_id is not null or anon_key is not null)
);

create index if not exists bits_user_created_idx on public.bits (user_id, created_at desc);
create index if not exists bits_anon_created_idx on public.bits (anon_key, created_at desc);

create table if not exists public.bit_versions (
  id uuid primary key default gen_random_uuid(),
  bit_id uuid not null references public.bits(id) on delete cascade,
  kind text not null check (kind in ('original', 'hotter', 'tighter', 'escalate', 'mix', 'tag_swap')),
  hook text not null,
  setup text not null,
  tags text[] not null default '{}',
  button text not null,
  why text,
  est_seconds integer not null default 0,
  heat smallint not null default 3 check (heat between 1 and 5),
  created_at timestamptz not null default now()
);

create index if not exists bit_versions_bit_idx on public.bit_versions (bit_id, created_at);

alter table public.bits enable row level security;
alter table public.bit_versions enable row level security;
