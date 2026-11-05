-- AI on demand (Nov 5 2026): a version a person edited by hand or line by line
-- is kept as kind 'edited'. Until this runs, the server keeps it as 'mix'.
alter table public.bit_versions drop constraint if exists bit_versions_kind_check;
alter table public.bit_versions add constraint bit_versions_kind_check
  check (kind in ('original', 'hotter', 'tighter', 'storytelling', 'escalate', 'mix', 'tag_swap', 'edited'));
