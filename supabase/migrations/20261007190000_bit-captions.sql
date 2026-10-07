-- Caption + hashtags for a bit version, written on first open of the
-- download sheet and cached here.
alter table public.bit_versions add column if not exists caption jsonb;
