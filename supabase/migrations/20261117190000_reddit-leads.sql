-- Reddit leads (Nov 17 2026, Candy): a daily job finds Reddit threads where
-- someone needs a funny toast, speech, caption or roast, scores them, and drafts
-- a helpful reply. Candy posts by hand from her own account. Nothing here ever
-- logs into Reddit or posts: the job only reads Google search results.
--
-- Ban-safety rules the job and the admin page enforce from these tables:
--   * at most 5 drafts a day, at most 1 posted reply per subreddit per day
--   * a Shutap mention only where the subreddit allows links (links_allowed = 'yes')
--     and only while mentions stay at or under 1 in 10 posted replies
--   * no mentions at all during the first 14 days (account warm-up)
--   * blocked subreddits are never drafted for
-- Only the service role (the cron hook and admin server functions) reads or writes.

-- What to search for. One row per Google query (site:reddit.com is added by the job).
create table if not exists public.reddit_keywords (
  id uuid primary key default gen_random_uuid(),
  query text not null unique,          -- e.g. '"best man speech" funny'
  theme text not null,                 -- toast | realtor | roast | funny
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- What each subreddit allows. Unknown subreddits get no-link drafts until Candy sets them.
create table if not exists public.reddit_subreddits (
  name text primary key,               -- lower case, no r/ prefix
  links_allowed text not null default 'unknown'
    check (links_allowed in ('yes', 'no', 'unknown')),
  blocked boolean not null default false,
  notes text,
  updated_at timestamptz not null default now()
);

-- One row per thread found. The draft lives on the same row.
create table if not exists public.reddit_leads (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,            -- canonical https://www.reddit.com/r/<sub>/comments/<id>/
  subreddit text not null,
  title text not null,
  snippet text,
  query text,                          -- the keyword query that found it
  theme text,
  found_at timestamptz not null default now(),
  found_day date not null,             -- Pacific day the job found it
  score smallint,                      -- 1-10, how much they need it now
  score_reason text,
  draft text,                          -- the reply Candy pastes (may be edited before posting)
  mentions_shutap boolean not null default false,
  link_url text,                       -- full shutap.com link with UTM tags, when mentioned
  status text not null default 'new'
    check (status in ('new', 'drafted', 'posted', 'skipped', 'filtered')),
  filter_reason text,                  -- why the job dropped it (low score, blocked, daily cap…)
  posted_at timestamptz,
  posted_body text,                    -- what Candy actually posted (for the repeat check)
  skip_reason text
);
create index if not exists reddit_leads_status_found on public.reddit_leads (status, found_at desc);
create index if not exists reddit_leads_sub_posted on public.reddit_leads (subreddit, posted_at desc);
create index if not exists reddit_leads_found_day on public.reddit_leads (found_day);

-- One row per daily run, so a silent failure shows up on the admin page.
create table if not exists public.reddit_runs (
  id bigserial primary key,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  queries integer not null default 0,
  found integer not null default 0,
  new_threads integer not null default 0,
  drafted integer not null default 0,
  error text
);

alter table public.reddit_keywords enable row level security;
alter table public.reddit_subreddits enable row level security;
alter table public.reddit_leads enable row level security;
alter table public.reddit_runs enable row level security;
revoke all on public.reddit_keywords, public.reddit_subreddits, public.reddit_leads, public.reddit_runs from anon, authenticated;
grant all on public.reddit_keywords, public.reddit_subreddits, public.reddit_leads, public.reddit_runs to service_role;
grant usage, select on sequence public.reddit_runs_id_seq to service_role;

-- Starting keywords (Candy to review on /admin/reddit).
insert into public.reddit_keywords (query, theme) values
  ('"best man speech" funny', 'toast'),
  ('"best man speech" help', 'toast'),
  ('"maid of honor speech" funny', 'toast'),
  ('"maid of honor speech" help', 'toast'),
  ('"wedding toast" funny', 'toast'),
  ('"retirement speech" funny', 'toast'),
  ('"birthday toast" funny', 'toast'),
  ('"rehearsal dinner" toast', 'toast'),
  ('"farewell speech" coworker funny', 'toast'),
  ('realtor "funny" instagram caption', 'realtor'),
  ('realtor social media post ideas', 'realtor'),
  ('"real estate" funny listing description', 'realtor'),
  ('"roast" my friend jokes', 'roast'),
  ('"roast speech" ideas', 'roast'),
  ('"make this funny"', 'funny'),
  ('"funny caption" ideas', 'funny'),
  ('"how do I make" speech funnier', 'funny')
on conflict (query) do nothing;
