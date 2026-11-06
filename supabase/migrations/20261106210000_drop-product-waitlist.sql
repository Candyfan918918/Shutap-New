-- Nov 6 2026 (Candy): no more waitlist. Toasts opens today, so the toast
-- waitlist and everything stored for it is deleted. The table only ever
-- held the toast list (it was empty when dropped). Safe to run twice.
drop table if exists public.product_waitlist;
