-- Shutap for small business, slice 2 (Nov 21 2026). Dark behind the
-- smallbusiness flag.
--
-- shops: one row per account (Basic covers one location: an owner with
-- several picks the one they film at). It holds what the owner told us about
-- their own business and the choices that shape every skit: the kind of
-- funny, the video length, who is on camera and the code word offer.
--
-- The shop's own name, city and "known for" lines are stored as typed. This
-- is the one planned exception to the Scrubber: it is business information
-- the owner gave about their own shop, and the videos use it. What happened
-- today (the owner's day story) is a different thing, goes through the Guard
-- and the Scrubber, and is never stored here.
--
-- shop_lookups: one row per Google lookup, so an account can be held to a few
-- a day (each one can cost money).
--
-- Only the server reads or writes these. Safe to run twice.
create table if not exists public.shops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  -- Google's id for the place the owner picked; null when they typed it in
  place_id text,
  name text not null,
  city text not null,
  country text not null check (country in ('us', 'ca', 'uk', 'au', 'other')),
  address text,
  website text,
  business_type text not null check (business_type in ('cafe', 'salon', 'auto', 'restaurant', 'barber', 'store', 'gym', 'other')),
  -- what the videos can mention: a few short lines the owner confirmed or typed
  known_for jsonb not null default '[]'::jsonb,
  voice text not null default 'warm' check (voice in ('dry', 'warm', 'sassy', 'goofy')),
  length int not null default 15 check (length in (7, 15, 30)),
  camera text not null default 'me' check (camera in ('me', 'team', 'faceless')),
  offer text not null default 'none' check (offer in ('none', 'freebie', 'promotion')),
  -- the freebie or the promotion, in the owner's words
  offer_text text not null default '',
  -- "Remind me tomorrow": an email to the sign-up address, only while this is on
  remind boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shop_lookups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('search', 'details')),
  day text not null,
  found int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists shop_lookups_user_day_idx on public.shop_lookups (user_id, day);

alter table public.shops enable row level security;
alter table public.shop_lookups enable row level security;
revoke all on public.shops, public.shop_lookups from anon, authenticated;
grant all on public.shops, public.shop_lookups to service_role;
