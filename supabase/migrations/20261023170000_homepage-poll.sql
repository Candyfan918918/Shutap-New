-- Homepage poll: one vote per signed-in account, changeable, with one
-- optional follow-up answer. Only the server reads or writes these tables
-- (service role through server functions). Voters get percentages back
-- after they vote; vote counts and who-picked-what are admin-only.
-- Safe to run more than once.

create table if not exists public.polls (
  key text primary key,
  title text not null,
  opened_at timestamptz not null default now(),
  closes_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.poll_votes (
  poll_key text not null references public.polls(key) on delete cascade,
  user_id uuid not null,
  option_key text not null,
  follow_up text,
  previous_option text,
  change_count integer not null default 0,
  voted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  emailed_at timestamptz,
  primary key (poll_key, user_id)
);

create index if not exists poll_votes_poll_option_idx on public.poll_votes (poll_key, option_key);

alter table public.polls enable row level security;
alter table public.poll_votes enable row level security;

-- No policies for anon or authenticated: browsers never touch these tables
-- directly. The service role bypasses RLS.
revoke all on public.polls from anon, authenticated;
revoke all on public.poll_votes from anon, authenticated;
grant all on public.polls to service_role;
grant all on public.poll_votes to service_role;

-- The first poll. opened_at is when this runs, which is when voting opens.
insert into public.polls (key, title)
values ('ai-joke-generators', 'AI joke generators: funny or trash?')
on conflict (key) do nothing;
