-- Phase 7: a post is a whole bit or a whole scene. The rendered content is
-- snapshotted on the room (post_data) so a later version never changes a
-- post people already liked and commented on.
alter table public.rooms add column if not exists post_kind text not null default 'card'
  check (post_kind in ('card', 'bit', 'scene'));
alter table public.rooms add column if not exists bit_version_id uuid references public.bit_versions(id) on delete set null;
alter table public.rooms add column if not exists post_data jsonb;
create index if not exists rooms_bit_version_idx on public.rooms (bit_version_id, post_kind);
