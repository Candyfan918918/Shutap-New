-- Refund a bit only when no bit with that id is stored, in one statement.
-- Two copies of the same press of "write" can run at once (a retry, or the
-- sign-in return in a second tab). A copy that fails must not take back the
-- charge of a copy that saved. The check and the refund are one statement,
-- and a copy that saves takes its charge again after saving, so the count
-- always matches the stored bits. Safe to run more than once.
create or replace function public.bit_refund_unless_stored(p_subject text, p_day date, p_bit uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.bit_usage
  set used = greatest(used - 1, 0),
      bit_ids = array_remove(bit_ids, p_bit),
      updated_at = now()
  where subject_key = p_subject
    and day = p_day
    and p_bit = any (bit_ids)
    and not exists (select 1 from public.bits where id = p_bit);
$$;

revoke execute on function public.bit_refund_unless_stored(text, date, uuid) from public, anon, authenticated;
grant execute on function public.bit_refund_unless_stored(text, date, uuid) to service_role;
