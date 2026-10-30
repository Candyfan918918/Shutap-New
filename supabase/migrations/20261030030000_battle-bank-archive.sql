-- Bank v2: a retired bank is kept for the record and never served.
alter table public.battle_setups add column if not exists archived boolean not null default false;
