-- Shutap for small business (Nov 21 2026): My creations. A finished video is
-- kept 30 days so the owner can download it again, then deleted.
--
-- shop-videos: a PRIVATE bucket. No policy is added, so no browser can read
-- or list it; the server hands the owner a short-lived link to their own
-- file only. Staff never watch these. Files live at <user id>/<video id>.<ext>.
--
-- The daily job removes every file past its delete_on day and marks the row
-- (the row stays so the plan's count stays true). The route only ever
-- deletes what is already due, so a repeat fire is harmless.
-- Safe to run twice.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shop-videos', 'shop-videos', false, 83886080, array['video/mp4', 'video/webm'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'shop-video-cleanup') then
    perform cron.unschedule('shop-video-cleanup');
  end if;
end $$;

-- 09:41 UTC: 1:41am Pacific in winter, 2:41am in summer
select cron.schedule(
  'shop-video-cleanup',
  '41 9 * * *',
  $$ select net.http_get(url := 'https://shutap.com/api/public/hooks/shop-video-cleanup', timeout_milliseconds := 120000); $$
);
