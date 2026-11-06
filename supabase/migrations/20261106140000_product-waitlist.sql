-- Product waitlists (Nov 6 2026): who asked to hear when a product opens
-- (Toasts first). One row per email per product. Only the server writes.
create table if not exists public.product_waitlist (
  id uuid primary key default gen_random_uuid(),
  product text not null,
  email text not null,
  occasion text,
  user_id uuid,
  created_at timestamptz not null default now()
);
create unique index if not exists product_waitlist_once_idx on public.product_waitlist (product, lower(email));
alter table public.product_waitlist enable row level security;
revoke all on public.product_waitlist from anon, authenticated;
grant all on public.product_waitlist to service_role;
