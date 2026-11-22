-- Shutap for small business (Nov 21 2026): the week, the code-word counter
-- and the reminder email.
--
-- shops.code_says: how many customers said the code word, as counted by the
-- owner tapping +1 on "Your week". A plain tally the owner keeps; Shutap
-- cannot check it.
--
-- shop_reminder_emails: one row per owner per Pacific day a reminder was
-- sent, so the hourly job never sends twice. The reminder goes only to an
-- owner who turned "Remind me tomorrow" on, to their sign-up address.
--
-- Only the server reads or writes these. Safe to run twice.
alter table public.shops add column if not exists code_says int not null default 0 check (code_says >= 0);

create table if not exists public.shop_reminder_emails (
  user_id uuid not null,
  day text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.shop_reminder_emails enable row level security;
revoke all on public.shop_reminder_emails from anon, authenticated;
grant all on public.shop_reminder_emails to service_role;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'shop-reminder-emails') then
    perform cron.unschedule('shop-reminder-emails');
  end if;
end $$;

-- every hour at :17; the route itself sends only in the late morning, Pacific
select cron.schedule(
  'shop-reminder-emails',
  '17 * * * *',
  $$ select net.http_get(url := 'https://shutap.com/api/public/hooks/shop-reminder-emails', timeout_milliseconds := 120000); $$
);
