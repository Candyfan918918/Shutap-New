# Claude Code — exemplar leak and dynamic serious-fact (the "new car" fix)

Spec: `shutap-prompt-templates-v2.1.md`. Layers on the two prior dispatches. Spec wins on conflict.

## Why

Spill *"my mother-in-law said I gave her autoimmune disease"* produced:
- roast: "she said gave. like a gift with a card."
- clapback: "i wish i had that power. you'd have a new car."
- take: "the disease became a transferable asset in her description. she handed you the medical bill at the table."

The first two are the approved lines for the *cancer* spill, reproduced with a tag added. The few-shot retrieved the near-identical situation and the model copied it. The take names the disease and uses a medical prop; the static serious-fact token list has neither "disease" nor "autoimmune."

## Do

1. **Investigate.** Report how `{{EXAMPLES}}` is currently selected (filter keys, count, any similarity check), where hall-of-fame rows come from, and whether founder-approved sets are being written to `joke_hall_of_fame`. Report before editing.

2. **Few-shot exclusion by similarity.** Before interpolating `{{EXAMPLES}}`, embed `situation_clean` (pgvector is already there) and exclude any hall-of-fame row whose situation cosine similarity to the current spill is ≥ 0.80. Also exclude rows sharing the same `archetype` AND the same accusation verb (extract the quoted verb from the spill when present: "gave", "ruined", "made"). Log `examples_excluded: n, reason` per flip. Cap examples at 5 as before; if fewer than 2 survive, proceed with none rather than lowering the threshold.

3. **Guardrail D — exemplar copy.** After candidates return, compare each candidate against every hall-of-fame `joke_text` (normalize: lowercase, strip punctuation). Reject any candidate where token-set Jaccard ≥ 0.5 OR the hall-of-fame line appears as a contiguous substring. Log `guardrail: exemplar_copy` with the matched hall-of-fame id. This catches copy-plus-tag ("like a gift with a card").

4. **Dynamic serious-fact phrase.** In `joke-create-set`, the classifier call already runs (crisis + archetype). Extend its output with `serious_fact: string | null` — the exact phrase in the spill naming an illness, death, loss, or accident, or null. Persist on `joke_sets.serious_fact`. Guardrail B now blocks, outside quoted spans: every token of `serious_fact` with length ≥ 4, plus its head noun, plus the static list. Add to the static list: `disease, illness, autoimmune, condition, chronic, medical, symptom, flare, sick`. Log which source matched (static / dynamic).

5. **Tag-on-turn check, judge side.** Add to the judge prompt, ranking section, verbatim:
   ```
   - STOPS AT THE TURN. A line that ends on its picture ranks above the
     same line with a clause explaining the picture. "Like a gift" beats
     "like a gift with a card." If two candidates share their first
     sentence, the shorter one wins unless the addition is a new picture.
   ```

6. **Confirm SLOT_RULES.take shipped.** The live take reads as v1 ("transferable asset in her description"). Paste the deployed `SLOT_RULES.take` back in the report; it must match the spec including "Precision is its weapon, not restraint."

7. **Confirm HEAT block shipped** in stage 2 and the HEAT criterion in the judge. Paste both back.

## Do not

- Do not delete hall-of-fame rows. Exclusion is per-flip, not permanent.
- Do not lower the similarity threshold to get examples. None is better than a copy.
- No changes to card count, slots, tiers, Stripe keys, `is_seed`.

## Verify

Run each spill three times; paste all cards, dealt premises, `examples_excluded`, and every guardrail log line.

- *"My mother-in-law said I gave her autoimmune disease"* — no card contains "gift", "power", "disease", "autoimmune", or "medical" outside quotation marks; no candidate survives that Jaccard-matches a hall-of-fame line; `serious_fact` on the set row is "autoimmune disease".
- *"My mother-in-law said I gave her cancer"* — same checks with "cancer"; at least one card contains "gave"; `examples_excluded` should list the autoimmune set if it has been saved to hall of fame, and vice versa.
- *"Opened a spreadsheet called Household Budget…"* — regression: `serious_fact` is null, no guardrail fires, examples are not excluded.

Report: paths changed, migration for `joke_sets.serious_fact`, the deployed take rule and HEAT block verbatim, all cards, all logs.
