-- A setup paused with one or two surviving lines gets one top-up round.
alter table public.battle_setups add column if not exists topups int not null default 0;
