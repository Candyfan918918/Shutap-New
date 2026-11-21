-- Shutap for small business (Nov 21 2026): the shop lookup runs before
-- sign-up (sign-up sits right after "Is this your shop?"), so a lookup is
-- counted by who made it, account or guest browser: 'user:<id>' or
-- 'anon:<browser id>'. Safe to run twice, and after 20261121200000_shops.
alter table public.shop_lookups add column if not exists subject text;
alter table public.shop_lookups alter column user_id drop not null;
update public.shop_lookups set subject = 'user:' || user_id::text where subject is null and user_id is not null;
create index if not exists shop_lookups_subject_day_idx on public.shop_lookups (subject, day);
