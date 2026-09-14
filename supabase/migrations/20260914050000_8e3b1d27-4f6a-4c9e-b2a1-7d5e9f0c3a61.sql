-- The exemplar-leak and dynamic serious-fact dispatch.
--
--   joke_sets.serious_fact   · the exact phrase in the spill naming an
--                              illness, death, loss or accident, or null.
--                              Guardrail B blocks its tokens outside quotes.
--   joke_sets.embedding      · the spill's embedding, computed once at the
--                              deal, so the few-shot can exclude a hall-of-
--                              fame row that is the same situation again.
--   joke_hall_of_fame.embedding · each exemplar situation's embedding,
--                              filled lazily the first time it is compared.
--
-- pgvector is already installed (situations, mirror_signals). 1536 is
-- openai/text-embedding-3-small, the model the rest of the app embeds with.
ALTER TABLE public.joke_sets
  ADD COLUMN IF NOT EXISTS serious_fact text,
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

ALTER TABLE public.joke_hall_of_fame
  ADD COLUMN IF NOT EXISTS embedding vector(1536);
