-- Slice 0 (Nov 5 2026): one `product` on everything a person makes or takes,
-- so bits and the realtor kits share one set list, one ledger, one admin.
-- Default 'bits' backfills every existing row; nothing changes for readers.
-- Until this runs, the code names the product only inside events.properties
-- (always safe); the realtor slice is the first to write the column.
alter table public.bits add column if not exists product text not null default 'bits';
alter table public.bit_downloads add column if not exists product text not null default 'bits';
alter table public.events add column if not exists product text not null default 'bits';
create index if not exists bits_product_idx on public.bits (product);
create index if not exists bit_downloads_product_idx on public.bit_downloads (product);
create index if not exists events_product_idx on public.events (product);
