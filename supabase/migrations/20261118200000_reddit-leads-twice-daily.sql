-- Reddit leads twice a day (Candy, Nov 18 2026): 15:13 and 21:13 UTC
-- (7:13am and 1:13pm Pacific in winter). The route skips a run that comes
-- within 4 hours of the last one, and the daily draft cap covers both runs.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reddit-leads') then
    perform cron.unschedule('reddit-leads');
  end if;
end $$;

select cron.schedule(
  'reddit-leads',
  '13 15,21 * * *',
  $$ select net.http_get(url := 'https://shutap.com/api/public/hooks/reddit-leads', timeout_milliseconds := 300000); $$
);
