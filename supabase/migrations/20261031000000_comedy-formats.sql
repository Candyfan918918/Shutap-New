-- Comedy formats (Oct 30 2026): one name per format, top to bottom.
--   scene       → skit          (the shot list)
--   screenplay  → sketch        (the one-page script)
--   alt_tags    → crowd_work    (five spare angles on the situation)
--   escalate    → storytelling  (the rewrite kind)
-- The server reads the old names until this has run (bits.functions.ts cols()),
-- so deploy order does not matter; run it before the next publish all the same.
alter table public.bit_versions rename column scene to skit;
alter table public.bit_versions rename column screenplay to sketch;
alter table public.bits rename column alt_tags to crowd_work;
update public.bit_versions set kind = 'storytelling' where kind = 'escalate';
-- rooms posted from a skit were post_kind 'scene'
update public.rooms set post_kind = 'skit' where post_kind = 'scene';
-- the check constraints still name the old kinds
alter table public.bit_versions drop constraint if exists bit_versions_kind_check;
alter table public.bit_versions add constraint bit_versions_kind_check
  check (kind in ('original', 'hotter', 'tighter', 'storytelling', 'escalate', 'mix', 'tag_swap'));
alter table public.rooms drop constraint if exists rooms_post_kind_check;
alter table public.rooms add constraint rooms_post_kind_check
  check (post_kind in ('card', 'bit', 'skit', 'scene'));
