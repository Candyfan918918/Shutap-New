-- Second homepage poll (Oct 29 2026): the humor amplifier. The first poll's
-- row and votes stay under 'ai-joke-generators' for the admin page.
insert into public.polls (key, title)
values ('humor-amplifier-2026-10', 'The humor amplifier: what would you actually post?')
on conflict (key) do nothing;
