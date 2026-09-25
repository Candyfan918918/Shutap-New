-- Hall of fame: round AA (the $120 tank), the founder's approved set.
-- Same admission as the 2026-09-22 seed: scripts/jokenet-sync.ts, the hard
-- rules and guardrails A–J against the row's own situation. Re-runnable;
-- nothing is deleted. The clapback carries its stage direction on its own
-- line above the quote.
INSERT INTO public.joke_hall_of_fame (slot, voice_key, archetype, situation_clean, joke_text, source)
SELECT v.slot, NULL, NULL, v.situation, v.joke, v.source FROM (VALUES
  ('the_take', 'I filled up my tank today and it cost me $120.', 'Your car ate better today than you will all week.', 'jokenet:249'),
  ('the_clapback', 'I filled up my tank today and it cost me $120.', 'Pump screen: "Receipt?"
"No. I know what I did."', 'jokenet:250'),
  ('the_roast', 'I filled up my tank today and it cost me $120.', 'You work Monday to pay for the gas that gets you to work Tuesday.', 'jokenet:251')
) AS v(slot, situation, joke, source)
WHERE NOT EXISTS (SELECT 1 FROM public.joke_hall_of_fame h WHERE h.joke_text = v.joke AND h.situation_clean = v.situation);
