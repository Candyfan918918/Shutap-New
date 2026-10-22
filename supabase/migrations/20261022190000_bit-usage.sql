-- Daily bit budget, one row per person (or guest browser) per Pacific day.
-- Added Oct 22 2026 for the paywall: guest 1 · free 2 · basic 5 · pro fair-use.
--
-- Every change goes through the three functions below, each a single locked
-- write, so two taps at the same moment can never both pass the cap. A bit is
-- charged by its id: a retried request for the same bit is never counted twice.
-- Safe to run more than once.

create table if not exists public.bit_usage (
  subject_key text not null,             -- 'user:<uuid>' or 'anon:<browser id>'
  day date not null,                     -- calendar day in America/Los_Angeles
  used integer not null default 0 check (used >= 0),
  bit_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (subject_key, day)
);
alter table public.bit_usage enable row level security;
-- No policies: only the service role reads or writes this table.
revoke all on public.bit_usage from anon, authenticated;
grant all on public.bit_usage to service_role;

-- Charge one new bit. Returns the new count, the current count if this bit
-- was already charged (a retry), or -1 when the cap is already reached.
create or replace function public.bit_charge(p_subject text, p_day date, p_cap integer, p_bit uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  if p_subject is null or p_day is null or p_bit is null or p_cap is null or p_cap < 1 then
    return -1;
  end if;

  insert into public.bit_usage as u (subject_key, day, used, bit_ids, updated_at)
  values (p_subject, p_day, 1, array[p_bit], now())
  on conflict (subject_key, day) do update
    set used = u.used + 1,
        bit_ids = array_append(u.bit_ids, p_bit),
        updated_at = now()
    where u.used < p_cap
      and not (p_bit = any (u.bit_ids))
  returning used into v_used;

  if v_used is not null then
    return v_used;
  end if;

  -- Nothing changed: either this bit was already charged (return the count,
  -- no second charge) or the cap is reached.
  select used into v_used
  from public.bit_usage
  where subject_key = p_subject and day = p_day and p_bit = any (bit_ids);
  if found then
    return v_used;
  end if;
  return -1;
end;
$$;

-- Give one bit back (nothing was written, or the Guard fired). No-op when the
-- bit was never charged, so a double refund can't push the count down twice.
create or replace function public.bit_refund(p_subject text, p_day date, p_bit uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bit_usage
  set used = greatest(used - 1, 0),
      bit_ids = array_remove(bit_ids, p_bit),
      updated_at = now()
  where subject_key = p_subject and day = p_day and p_bit = any (bit_ids);
$$;

-- After sign-in: the bits this browser wrote as a guest today count toward
-- the account's day. Union by bit id, so running it twice changes nothing.
-- The guest row is left as is, so signing out never hands back a guest bit.
create or replace function public.bit_merge_guest(p_user text, p_guest text, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_guest uuid[];
  v_cur uuid[];
  v_merged uuid[];
begin
  if p_user is null or p_guest is null or p_day is null or p_user = p_guest then
    return coalesce((select used from public.bit_usage where subject_key = p_user and day = p_day), 0);
  end if;

  select bit_ids into v_guest from public.bit_usage where subject_key = p_guest and day = p_day;
  if v_guest is null or cardinality(v_guest) = 0 then
    return coalesce((select used from public.bit_usage where subject_key = p_user and day = p_day), 0);
  end if;

  insert into public.bit_usage (subject_key, day) values (p_user, p_day)
  on conflict (subject_key, day) do nothing;

  select bit_ids into v_cur
  from public.bit_usage
  where subject_key = p_user and day = p_day
  for update;

  select coalesce(array_agg(distinct x), '{}') into v_merged
  from unnest(coalesce(v_cur, '{}') || v_guest) as t(x);

  update public.bit_usage
  set bit_ids = v_merged,
      used = cardinality(v_merged),
      updated_at = now()
  where subject_key = p_user and day = p_day;

  return cardinality(v_merged);
end;
$$;

revoke execute on function public.bit_charge(text, date, integer, uuid) from public, anon, authenticated;
revoke execute on function public.bit_refund(text, date, uuid) from public, anon, authenticated;
revoke execute on function public.bit_merge_guest(text, text, date) from public, anon, authenticated;
grant execute on function public.bit_charge(text, date, integer, uuid) to service_role;
grant execute on function public.bit_refund(text, date, uuid) to service_role;
grant execute on function public.bit_merge_guest(text, text, date) to service_role;
