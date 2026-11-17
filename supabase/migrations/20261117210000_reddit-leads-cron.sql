-- Reddit leads: run the daily job at 15:13 UTC (7:13am Pacific in winter,
-- 8:13am in summer). The route runs at most once per Pacific day, so a repeat
-- fire is harmless.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'reddit-leads') then
    perform cron.unschedule('reddit-leads');
  end if;
end $$;

select cron.schedule(
  'reddit-leads',
  '13 15 * * *',
  $$ select net.http_get(url := 'https://shutap.com/api/public/hooks/reddit-leads', timeout_milliseconds := 300000); $$
);
