-- Bit health: a real test bit every 30 minutes, and alerts on any failure.
-- Added Oct 21 2026 after five days of every write failing unnoticed.
create table if not exists public.bit_health (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  source text not null,
  ok boolean not null,
  ms integer not null,
  model text,
  detail jsonb
);
alter table public.bit_health enable row level security;

create table if not exists public.bit_alerts (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  kind text not null,
  detail text
);
alter table public.bit_alerts enable row level security;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'bit-health') then
    perform cron.unschedule('bit-health');
  end if;
end $$;

select cron.schedule(
  'bit-health',
  '7,37 * * * *',
  $$ select net.http_get(url := 'https://shutap.com/api/public/bit-health', timeout_milliseconds := 90000); $$
);
