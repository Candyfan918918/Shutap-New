-- Reddit lead keywords, round 2 (Nov 17 2026, Candy): lead with funny stories,
-- comedians and stand-up, jokes, being funnier, humor, and humor-writing tools;
-- toasts and speeches second. Realtor, roast and caption searches are paused
-- (kept, not deleted, so they can be switched back on).

update public.reddit_keywords set active = false
where theme in ('realtor', 'roast') or query = '"funny caption" ideas';

update public.reddit_keywords set theme = 'humor' where theme = 'funny';

insert into public.reddit_keywords (query, theme) values
  -- funny stories
  ('"how to tell a funny story"', 'humor'),
  ('"make my story funnier"', 'humor'),
  ('"funny story" how to tell it better', 'humor'),
  -- comedians and stand-up
  ('"first open mic" set', 'humor'),
  ('"open mic" jokes feedback', 'humor'),
  ('"stand up" set writing help', 'humor'),
  ('"want to be a comedian"', 'humor'),
  ('"stand up comedy" writing tips', 'humor'),
  -- jokes
  ('"how to write jokes"', 'humor'),
  ('"punch up" my jokes', 'humor'),
  ('"is this joke funny"', 'humor'),
  ('"need a joke" about', 'humor'),
  -- being funnier
  ('"how to be funnier"', 'humor'),
  ('"how do I get funnier"', 'humor'),
  ('"how to be funny" in conversation', 'humor'),
  -- humor and humor-writing tools
  ('"humor writing" tips', 'humor'),
  ('"comedy writing" help', 'humor'),
  ('"AI" joke writing tool', 'humor'),
  ('"funny" AI writer recommendation', 'humor')
on conflict (query) do update set active = true, theme = excluded.theme;
