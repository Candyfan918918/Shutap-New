-- Scene and screenplay renderings of a bit version, generated on first open
-- and cached here (phase 5). Server-only like the rest of bit_versions.
alter table public.bit_versions add column if not exists scene jsonb;
alter table public.bit_versions add column if not exists screenplay jsonb;
