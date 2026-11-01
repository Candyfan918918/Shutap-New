-- One daily what-to-post email per user per Pacific day.
create table if not exists public.daily_idea_emails (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.daily_idea_emails enable row level security;
-- No policies: only the service role (cron hook) reads or writes it.
