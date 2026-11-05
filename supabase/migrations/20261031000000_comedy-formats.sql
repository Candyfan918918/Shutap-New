-- Comedy formats (Oct 30 2026): one name per format, top to bottom.
--   scene       → skit          (the shot list)
--   screenplay  → sketch        (the one-page script)
--   alt_tags    → crowd_work    (five spare angles on the situation)
--   escalate    → storytelling  (the rewrite kind)
-- The server reads the old names until this has run (bits.functions.ts cols()),
-- so deploy order does not matter. Safe to run twice. Constraints are
-- swapped BEFORE the kind update (Nov 5 2026: the first order failed on
-- the old check constraint).
alter table public.bit_versions drop constraint if exists bit_versions_kind_check;
alter table public.bit_versions add constraint bit_versions_kind_check
  check (kind in ('original', 'hotter', 'tighter', 'storytelling', 'escalate', 'mix', 'tag_swap'));
alter table public.rooms drop constraint if exists rooms_post_kind_check;
alter table public.rooms add constraint rooms_post_kind_check
  check (post_kind in ('card', 'bit', 'skit', 'scene'));
do $$ begin
  if exists (select 1 from information_schema.columns where table_name='bit_versions' and column_name='scene') then
    alter table public.bit_versions rename column scene to skit; end if;
  if exists (select 1 from information_schema.columns where table_name='bit_versions' and column_name='screenplay') then
    alter table public.bit_versions rename column screenplay to sketch; end if;
  if exists (select 1 from information_schema.columns where table_name='bits' and column_name='alt_tags') then
    alter table public.bits rename column alt_tags to crowd_work; end if;
end $$;
update public.bit_versions set kind = 'storytelling' where kind = 'escalate';
update public.rooms set post_kind = 'skit' where post_kind = 'scene';
