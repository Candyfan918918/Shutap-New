# Claude Code — ship prompt templates v2.1

Source of truth: `shutap-prompt-templates-v2.1.md` (attached). Read it fully before touching code. Everything below is the delta and the verification; where this file and the spec disagree, the spec wins.

## Context

Production is running v1 prompts. Against the frozen spill below it returned three cards built on one premise, zero numbers, no button, abstract landings ("action list", "quarterly report"). v2.1 changes what stage 2 is asked to produce. Pipeline shape unchanged: premise → candidates → judge, three cards, three slots.

Frozen spill for verification:
> Opened a spreadsheet called "Household Budget" and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.

## Do

1. **Investigate first.** Locate the current prompt templates (expected `supabase/functions/_shared/prompts.ts`), the stage-1/2/3 call sites, the premise cache write to `joke_sets.premises`, and the `{{PREMISES}}` interpolation. Report actual paths before editing. If they live elsewhere or are split, say so and use the real locations.

2. **Replace all three prompt templates and `SLOT_RULES` verbatim** with the v2.1 text. Copy, do not paraphrase. Keep `{{VAR}}` names as the spec has them.

3. **Stage 1 JSON gains `slot`.** Each `used:true` premise now carries `slot: take | clapback | roast | spare`. Persist as-is in `joke_sets.premises` (jsonb, no migration expected — confirm). Validate: exactly 4 `used:true`, one per slot value; on validation failure retry stage 1 once, then fall back to positional dealing `[0]→take, [1]→clapback, [2]→roast, [3]→spare` and log it.

4. **Stage 2 and 3 interpolation changes.** `{{PREMISES}}` is replaced by `{{PREMISE}}` (this card's dealt premise, one line) and `{{OTHER_PREMISES}}` (the two dealt to the other cards, numbered). The spare is never shown to stage 2 or 3; it is used only on regeneration of a slot whose own premise produced `winner: null`.

5. **Add `HOUSE_VOICE`** (spec §4b). Interpolate it wherever `{{VOICE_NAME}}`, `{{VOICE_PERSONA}}`, `{{VOICE_REGISTER}}`, `{{VOICE_BANNED}}` would otherwise be empty. No voiceless runs.

6. **`prompt_version` → `"2.1"`** on every `joke_cards` row written from now on. Existing rows untouched.

7. **Judge model family.** Confirm the judge is a different model family from stage 2. If it isn't, report it; do not silently change models.

8. **Renderer audit only.** Word budgets are take 25 / clapback 30 / roast 50. If the front end clamps, truncates, or lowercases card text, report file and line. Do not change the renderer in this dispatch.

## Do not

- No prefilled examples, suggestion chips, or placeholder jokes anywhere.
- No changes to card count, slot names, tier logic, Stripe lookup keys, or `is_seed` handling.
- No renaming of `{{VAR}}`s beyond the `{{PREMISES}}` → `{{PREMISE}}` + `{{OTHER_PREMISES}}` split in the spec.
- Do not "improve" the prompt text.

## Verify

Run the frozen spill through the full pipeline three times. Paste all nine cards with their dealt premise. Then check and report, with run and slot for any failure:

- No two cards in a run share a premise.
- Every roast: ≥2 beats, a button (sentence on him / counter-offer to him / first-person fantasy), last word a visible noun.
- Every clapback addressed to the husband, not the user; no "you should / next time / try / consider".
- At least one card per run uses a number.
- No card ends on a landing-kill word (`comparable, procedural, organisational, mechanism, structure, decision, feelings, subject, record, precision`).
- No card contains a "like a…" whose second half is an abstraction.
- `grep -rn "7 cards\|seven\|7 angles\|fallback pool\|{{PREMISES}}" supabase/ src/` — report hits with file:line. Fix `{{PREMISES}}` remnants; report the others without fixing.
- Report actual model IDs for stage 2 and the judge.

Report format: paths changed, migration if any, the nine cards with dealt premises, check results with file:line for failures. No summary of what v2.1 is.
