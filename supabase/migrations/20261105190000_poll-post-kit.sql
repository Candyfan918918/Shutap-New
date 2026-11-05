-- Third homepage poll (Nov 5 2026): the post kit is the video alone, so the
-- question is what people would actually use. Earlier polls' rows and votes
-- stay under 'ai-joke-generators' and 'humor-amplifier-2026-10'.
insert into public.polls (key, title)
values ('post-kit-2026-11', 'The humor amplifier: what would you actually use?')
on conflict (key) do nothing;
