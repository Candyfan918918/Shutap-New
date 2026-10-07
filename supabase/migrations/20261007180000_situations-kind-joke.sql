-- Posting a bit opens a situations row with kind 'joke' (the story page
-- behind the post). The check only allowed scan / spill, so every post
-- failed at this insert. Applied to the database 2026-10-07.
alter table public.situations drop constraint if exists situations_kind_check;
alter table public.situations add constraint situations_kind_check
  check (kind is null or kind = any (array['scan'::text, 'spill'::text, 'joke'::text]));
