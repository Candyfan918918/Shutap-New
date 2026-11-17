-- JokeNet fills itself (Nov 17 2026). Two in-house feeds, no typing:
--
--   1. /bit-daily ratings become JokeNet rows. Every keep / cut / rewrite
--      she gives there lands here with a score: the bit as written (keep 4,
--      rewrite 2 = close, cut 1), her rewrite (5, her own line) and the line
--      she marks funniest (5). Re-rating updates the same rows.
--   2. A nightly writer adds ~50 new lines on in-house situations
--      (/api/public/hooks/jokenet-nightly), unrated. A judge from another
--      model family pre-scores each one (ai_score 1–10) so the rating queue
--      shows the likely-funny ones first. ai_score never feeds the writer;
--      only her ratings do.
--
-- Users' stories and bits never reach this table. Safe to run twice.
alter table public.jokenet add column if not exists origin text;
alter table public.jokenet add column if not exists ai_score smallint check (ai_score between 1 and 10);
create unique index if not exists jokenet_origin_key on public.jokenet (origin);
create index if not exists jokenet_queue_idx on public.jokenet (ai_score desc nulls last, id desc) where rating is null and archived_at is null;

create or replace function public.jokenet_from_bit_daily() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  whole text;
  key text := 'bit_daily:' || new.id::text;
  why text := 'from /bit-daily ' || new.day::text || ' · ' || new.technique_name;
begin
  if new.verdict is null or new.bit is null then
    return new;
  end if;
  whole := concat_ws(E'\n',
    nullif(new.bit->>'hook', ''),
    nullif(new.bit->>'setup', ''),
    (select string_agg(t, E'\n') from jsonb_array_elements_text(coalesce(new.bit->'tags', '[]'::jsonb)) t where t <> ''),
    nullif(new.bit->>'button', ''));
  if coalesce(whole, '') <> '' then
    insert into public.jokenet (situation, joke, rating, move, source, license, founder, origin, notes)
    values (new.story, whole, case new.verdict when 'keep' then 4 when 'rewrite' then 2 else 1 end, new.technique_name, 'shutap', 'own', false, key || ':bit', why)
    on conflict (origin) do update set joke = excluded.joke, rating = excluded.rating, archived_at = null;
  end if;

  if new.verdict = 'rewrite' and coalesce(trim(new.rewrite), '') <> '' then
    insert into public.jokenet (situation, joke, rating, move, source, license, founder, origin, notes)
    values (new.story, trim(new.rewrite), 5, new.technique_name, 'me', 'own', true, key || ':rewrite', why || ' · your rewrite')
    on conflict (origin) do update set joke = excluded.joke, rating = 5, archived_at = null;
  else
    update public.jokenet set archived_at = now() where origin = key || ':rewrite' and archived_at is null;
  end if;

  if coalesce(trim(new.best_line), '') <> '' then
    insert into public.jokenet (situation, joke, rating, move, source, license, founder, origin, notes)
    values (new.story, trim(new.best_line), 5, new.technique_name, 'shutap', 'own', false, key || ':best', why || ' · marked funniest')
    on conflict (origin) do update set joke = excluded.joke, rating = 5, archived_at = null;
  else
    update public.jokenet set archived_at = now() where origin = key || ':best' and archived_at is null;
  end if;
  return new;
end $$;

drop trigger if exists jokenet_from_bit_daily on public.bit_daily;
create trigger jokenet_from_bit_daily
  after insert or update of verdict, rewrite, best_line on public.bit_daily
  for each row execute function public.jokenet_from_bit_daily();

-- Everything she has already rated on /bit-daily comes in now.
update public.bit_daily set verdict = verdict where verdict is not null;

-- The nightly writer: 3:23am Pacific (11:23 UTC). It reuses the cron secret
-- of the existing reengagement-emails job, so no secret is written here.
do $$
declare
  secret text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise notice 'pg_cron not installed: schedule jokenet-nightly by hand';
    return;
  end if;
  select substring(command from 'x-cron-secret''\s*,\s*''([^'']+)''') into secret
  from cron.job where command like '%x-cron-secret%' order by jobid limit 1;
  if secret is null then
    raise notice 'no cron secret found on an existing job: schedule jokenet-nightly by hand';
    return;
  end if;
  perform cron.unschedule(jobid) from cron.job where jobname = 'jokenet-nightly';
  perform cron.schedule(
    'jokenet-nightly',
    '23 11 * * *',
    format($f$ select net.http_post(
         url := 'https://shutap.com/api/public/hooks/jokenet-nightly',
         headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', %L),
         body := '{}'::jsonb,
         timeout_milliseconds := 300000
       ) $f$, secret)
  );
end $$;
