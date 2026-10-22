-- Real-name profiles (Oct 2026): a new account is created with the person's
-- real name and their Google picture instead of a made-up alias. The aliases
-- table stays the public identity record; the made-up-name parts default to
-- '' so a real-name row needs none of them.
alter table public.aliases add column if not exists avatar_url text;
alter table public.aliases alter column emotion set default '';
alter table public.aliases alter column nation set default '';
alter table public.aliases alter column creature set default '';
alter table public.aliases alter column emoji set default '';

-- Profile pictures. Public read; writes go through a server function with
-- the service role, so no client write policy is needed.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
