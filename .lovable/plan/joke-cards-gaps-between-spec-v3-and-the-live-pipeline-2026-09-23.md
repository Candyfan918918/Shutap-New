# Joke cards: gaps between spec v3 and the live pipeline

The uploaded v3 spec differs from the one the app runs (3.4) in only two places, both in the judge's ranking list. Everything else, including stage 1, stage 2, and the slot rules, matches line for line.

## Gap 1: the metaphor rule should not cover the clapback
- **Spec v3:** INSIDE THE USER'S METAPHOR applies to the take and the roast only. The clapback is the user's own voice, so it can stay inside their image.
- **Live:** the judge text applies the rule to every card. The automatic check (the one that requires a real noun from the spill) takes no slot, so it also rejects clapbacks that stay inside the metaphor.
- **Effect:** on metaphor spills like the hamster one, good in-image clapbacks get rejected. The clapback then falls back to the authored pool more often.

## Gap 2: v3 drops NO INVENTED PEOPLE
- **Spec v3:** the NO INVENTED PEOPLE rule is gone from the judge.
- **Live (3.4):** the judge still has the rule, and guardrail I (pronoun before any named person) also enforces it in code.
- **Decision needed:** v3 might be an older snapshot taken before 3.4 was cut, or the founder might have removed the rule on purpose. If it's the first, keep the rule. If it's the second, take it out of the judge. Guardrail I is code, not prompt text, so it would stay unless you ask me to remove it.

## Changes (once approved)
1. Copy the v3 judge text for INSIDE THE USER'S METAPHOR into `prompts.server.ts` word for word.
2. In `pipeline.server.ts`, run guardrail G (`literalNounFailure`) only on the take and roast slots.
3. Gap 2: by default, keep the current text and flag it in the changelog. If you confirm the removal, delete the judge bullet instead.
4. Bump `PROMPT_VERSION` to 3.5, add a CHANGELOG entry, and save v3 as `docs/shutap-prompt-templates.md`.
5. Check the result by running the hamster spill and one non-metaphor spill through the pipeline. For each card, report the dealt premise and the guardrail log.
