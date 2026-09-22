-- Prompt pipeline v3.0: the borrowed-domain guardrail's neighbours, the
-- thin-input flag and the self-directed reading.
--
--   joke_sets.self_directed · the spill reader's answer at set creation:
--                             no other adult, the user is the actor.
--                             Guardrail A narrows to the verdict-noun list
--                             on those spills (spec §8); null = no answer,
--                             and no answer keeps A total.
--   joke_sets.thin_input    · fewer than THIN_INPUT_WORDS words. The set
--                             still runs; the surface nudges to the scan.
--
-- The hall-of-fame seed from the founder's approved rows is the migration
-- after this one, so it can be regenerated on its own.
ALTER TABLE public.joke_sets
  ADD COLUMN IF NOT EXISTS self_directed boolean,
  ADD COLUMN IF NOT EXISTS thin_input boolean NOT NULL DEFAULT false;
