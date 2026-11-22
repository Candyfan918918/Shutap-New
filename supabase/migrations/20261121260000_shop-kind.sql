-- Shutap for small business (Nov 21 2026): what kind of place the business
-- is, in the words of its own listing ("Japanese restaurant"), confirmed by
-- the owner on "Is this your business?". The skit writer uses it so a
-- Japanese restaurant filed under Coffee shop is not handed espresso jokes.
-- Safe to run twice.
alter table public.shops add column if not exists kind text;
