-- Checks for 20261022190000_bit-usage.sql. Run against a scratch database
-- after the migration: psql -v ON_ERROR_STOP=1 -f supabase/tests/bit_usage_test.sql
-- Each block raises on failure. The parallel race (10 charges at cap 2, exactly
-- 2 succeed) was run by hand with concurrent psql sessions on Oct 22 2026.
begin;

do $$
declare
  b uuid := gen_random_uuid();
  r integer;
begin
  -- cap is enforced
  perform bit_charge('t:cap', '2026-10-22', 2, gen_random_uuid());
  perform bit_charge('t:cap', '2026-10-22', 2, gen_random_uuid());
  r := bit_charge('t:cap', '2026-10-22', 2, gen_random_uuid());
  if r <> -1 then raise exception 'cap: expected -1, got %', r; end if;

  -- the same bit is counted once
  perform bit_charge('t:dup', '2026-10-22', 5, b);
  r := bit_charge('t:dup', '2026-10-22', 5, b);
  if r <> 1 then raise exception 'dup: expected 1, got %', r; end if;

  -- refunding an unknown id changes nothing
  perform bit_refund('t:dup', '2026-10-22', gen_random_uuid());
  if (select used from bit_usage where subject_key = 't:dup') <> 1 then raise exception 'refund unknown changed count'; end if;

  -- refunding twice only gives one back
  perform bit_refund('t:dup', '2026-10-22', b);
  perform bit_refund('t:dup', '2026-10-22', b);
  if (select used from bit_usage where subject_key = 't:dup') <> 0 then raise exception 'double refund'; end if;

  -- days are separate
  r := bit_charge('t:cap', '2026-10-23', 2, gen_random_uuid());
  if r <> 1 then raise exception 'new day: expected 1, got %', r; end if;
end $$;

do $$
declare
  r integer;
begin
  -- guest bit carries over at sign-in, once
  perform bit_charge('anon:t', '2026-10-22', 1, gen_random_uuid());
  perform bit_charge('user:t', '2026-10-22', 2, gen_random_uuid());
  r := bit_merge_guest('user:t', 'anon:t', '2026-10-22');
  if r <> 2 then raise exception 'merge: expected 2, got %', r; end if;
  r := bit_merge_guest('user:t', 'anon:t', '2026-10-22');
  if r <> 2 then raise exception 'merge twice: expected 2, got %', r; end if;
  -- guest row untouched, so signing out gives no new guest bit
  if (select used from bit_usage where subject_key = 'anon:t') <> 1 then raise exception 'guest row changed'; end if;
  -- free cap of 2 is now full
  r := bit_charge('user:t', '2026-10-22', 2, gen_random_uuid());
  if r <> -1 then raise exception 'after merge: expected -1, got %', r; end if;
  -- nothing to merge
  r := bit_merge_guest('user:none', 'anon:none', '2026-10-22');
  if r <> 0 then raise exception 'empty merge: expected 0, got %', r; end if;
end $$;

rollback;
select 'bit_usage tests passed' as result;
