-- 'canceled' means the subscription has ended. Stripe keeps a plan that is
-- cancelled to end at the period end 'active' (cancel_at_period_end) until
-- then, so a 'canceled' row never grants the Mirror — including an immediate
-- cancel whose old period end is still in the future.
create or replace function public.has_active_mirror(user_uuid uuid, check_env text default 'sandbox')
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = user_uuid and environment = check_env and product_id = 'mirror'
      and status in ('active','trialing','past_due')
      and (current_period_end is null or current_period_end > now())
  );
$$;
