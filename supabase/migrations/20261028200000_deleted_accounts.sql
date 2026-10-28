-- A lasting record of every signed-up account, including ones that were
-- deleted. When an account is deleted, its profile row is copied here first
-- WITHOUT email or name (the privacy page promises records kept after
-- deletion have the link to the person removed). Oct 28 2026.
create table if not exists public.deleted_accounts (
  user_id uuid primary key,
  provider text,
  signup_at timestamptz,
  deleted_at timestamptz not null default now(),
  last_country text,
  last_city text,
  visit_count int,
  login_count int
);
alter table public.deleted_accounts enable row level security;
-- No policies: only the service role (admin server functions) can read it.

create or replace function public.record_deleted_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(old.is_anonymous, false) then return old; end if;
  insert into public.deleted_accounts (user_id, provider, signup_at, last_country, last_city, visit_count, login_count)
  values (old.user_id, old.provider, coalesce(old.signup_at, old.first_visit_at), old.last_country, old.last_city, old.visit_count, old.login_count)
  on conflict (user_id) do nothing;
  return old;
end $$;

drop trigger if exists profiles_record_deleted on public.profiles;
create trigger profiles_record_deleted before delete on public.profiles
  for each row execute function public.record_deleted_account();

-- Every deleted account is labelled as deleted by the person themselves and
-- is never contacted again (Candy, Oct 28 2026).
alter table public.deleted_accounts add column if not exists deleted_by text not null default 'self';
alter table public.deleted_accounts add column if not exists do_not_contact boolean not null default true;
