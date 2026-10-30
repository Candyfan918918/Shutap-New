-- Internal browsers (the founder's, Lovable previews, screenshot and test
-- browsers) are kept but never counted as players or picks.
alter table public.battle_players add column if not exists internal boolean not null default false;
