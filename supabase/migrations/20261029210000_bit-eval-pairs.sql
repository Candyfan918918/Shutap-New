-- The bit eval bench (bit-1.4): one row per story per round, two bits
-- written by two pipeline variants, shown blind (left/right shuffled) and
-- rated by the founder. Only the server reads or writes it.
create table if not exists public.bit_eval_pairs (
  id uuid primary key default gen_random_uuid(),
  round text not null,
  story_id text not null,
  story text not null,
  controls jsonb not null,
  left_variant text not null,          -- 'old' | 'new': which variant sits on the left
  left_bit jsonb,
  right_bit jsonb,
  left_meta jsonb,
  right_meta jsonb,
  verdict text,                        -- 'left' | 'right' | 'neither'
  note text,
  created_at timestamptz not null default now(),
  rated_at timestamptz,
  unique (round, story_id)
);
alter table public.bit_eval_pairs enable row level security;
revoke all on public.bit_eval_pairs from anon, authenticated;
grant all on public.bit_eval_pairs to service_role;
