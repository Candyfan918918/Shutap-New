-- One 'paid' event per Stripe invoice, so concurrent webhook retries can't
-- record a payment twice in the admin daily report. Safe to run more than once.
create unique index if not exists events_paid_invoice_uniq
  on public.events ((properties->>'invoice_id'))
  where name = 'paid';
