-- Shutap for small business (Nov 21 2026, Candy): the end of every video
-- shows the business's own logo. It is a photo the owner added from their
-- phone, or the icon fetched from the website they gave. Stored small, as a
-- data: image, on the shop's row. logo_from says which, so a fetched icon is
-- replaced when the website changes and an owner's own photo never is.
-- Safe to run twice.
alter table public.shops add column if not exists logo text;
alter table public.shops add column if not exists logo_from text check (logo_from in ('upload', 'website'));
