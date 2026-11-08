-- The /bits demo (Nov 8 2026, Candy): five lines typed in-house in /bit-lab,
-- with "funnier" used on a line or two, picked by Candy. The newest row is the
-- demo on shutap.com/bits. Never a user's bit. Only the server reads or writes.
create table if not exists public.bit_demos (
  id uuid primary key default gen_random_uuid(),
  lines jsonb not null,            -- { hook, setup, tags: [t1, t2], button }
  funnier jsonb not null default '[]'::jsonb, -- [{ slot, typed, picked, move }]
  controls jsonb,
  sketch jsonb,                    -- SketchElement[] written once at pick time
  skit jsonb,                      -- SkitBeat[] written once at pick time
  created_at timestamptz not null default now()
);
create index if not exists bit_demos_created_at on public.bit_demos (created_at desc);
alter table public.bit_demos enable row level security;
revoke all on public.bit_demos from anon, authenticated;
grant all on public.bit_demos to service_role;
