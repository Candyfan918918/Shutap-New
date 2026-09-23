-- Prompt pipeline v3.2: the spill reader's two new answers.
--
--   joke_sets.metaphor_span · the phrase where the user describes
--                             themselves as something they are not
--                             ("a hamster in a non-stop spinning wheel"),
--                             or null. Guardrail G then requires a noun
--                             from their literal day on every card.
--   joke_sets.emotional     · the user reports a feeling about themselves.
--                             With self_directed, Guardrail H rejects
--                             blame. null = no answer = H off.
ALTER TABLE public.joke_sets
  ADD COLUMN IF NOT EXISTS metaphor_span text,
  ADD COLUMN IF NOT EXISTS emotional boolean;
