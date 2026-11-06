-- Shutap Toasts, slice 3 (Nov 6 2026): the 60-second version is made on
-- demand from the locked speech and kept with the toast, so it's written
-- once and downloads freely after. Safe to run twice.
alter table public.toasts add column if not exists cut60 jsonb;
