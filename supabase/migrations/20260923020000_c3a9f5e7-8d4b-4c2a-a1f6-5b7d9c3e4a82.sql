-- Prompt pipeline v3.4: the hall-of-fame line's own embedding.
--
--   joke_hall_of_fame.text_embedding · the embedding of joke_text, for
--                                      the paraphrase half of Guardrail D.
--                                      `embedding` (the situation's) stays
--                                      for the few-shot exclusion. Filled
--                                      lazily, a handful per flip.
ALTER TABLE public.joke_hall_of_fame
  ADD COLUMN IF NOT EXISTS text_embedding vector(1536);
