# Claude Code — direction guardrails (the footstool fix)

Spec: `shutap-prompt-templates-v2.1.md`, sections 1–3 (SELF-CRITICAL, SERIOUS FACT, ACCUSATION rules), §4 clapback (THE CONCESSION, quotation marks), §8 (guardrail regexes). Read those before editing. Spec wins on conflict.

## Why

Two live sets in a row produced pictures pointed at the wrong thing:
- *"I feel useless… parents' financial support"* → "you, a 30-year-old walking, talking trust fund"
- *"My mother-in-law said I gave her cancer"* → "the hospital bed just became her throne, you, the footstool" · "cancer was her invoice" · "parking pass for the oncology wing"

The model is generating pictures now. It is pointing them at the user and at the illness. A prompt is a request; this dispatch makes the refusal code.

## Do

1. **Investigate.** Locate the deterministic guardrail pass in `joke-flip` (post-candidates, pre-judge, or post-judge — report which), the existing banned-token list, and where guardrail rejections are logged. Report paths and the current rejection log format before editing.

2. **Guardrail A — predicate nominative on user.** All spills, no allowlist. Reject any candidate matching, case-insensitive:
   ```
   \b(you|you're|you are|you've been|and you|you,)\s*,?\s*(a|an|the)\s+\w+
   ```
   Log `guardrail: user_predicate` with set_id, position, candidate index, matched span.

3. **Guardrail B — serious fact as vehicle.** Token list, in code, exported so it can grow:
   ```
   cancer, tumor, tumour, chemo, oncolog, hospital, hospice, icu, diagnos,
   terminal, died, death, dead, funeral, miscarr, stillb, stroke, surgery,
   overdose, laid off, fired, evicted, bankrupt
   ```
   Match as substrings against `situation_clean`. For each token that matches the spill, reject any candidate containing that token **outside a quoted span**. Quoted span = text between straight or curly double quotes. Tokens inside quotes are allowed (the card may quote the other party). Log `guardrail: serious_fact` with the token and position.

4. **Guardrail C — self-critical predicate.** Only if not already shipped from the previous dispatch: token list (`useless, pathetic, failure, behind, embarrassing, loser, worthless, should be by now`) against `situation_clean`; when matched, Guardrail A already covers the reject. If A is live, C is a log tag only: add `self_critical: true` to the flip log so we can query how often these spills arrive.

5. **Ordering.** Guardrails run on all ten candidates before the judge. A candidate that fails any guardrail is removed from the judge's list; the judge never sees it. If fewer than three survive, retry stage 2 once with the same premise; if still fewer than three, proceed with what survives; if zero, authored fallback, `used_fallback = true`, logged as today.

6. **Prompt rules.** Confirm the v2.1 stage-1 rules SELF-CRITICAL SPILL, SERIOUS FACT IN THE SPILL, ACCUSATION SPILL are present verbatim in `prompts.ts`. If v2.1 isn't shipped yet, ship the previous dispatch first; this one layers on it.

7. **Clapback quotes.** Confirm every clapback is returned with opening and closing double quotes from the model, and the renderer does not add a second pair. If the renderer adds them, remove that; the prompt owns the quotes.

8. **Renderer, report only.** Cards render lowercase and italic. Report where casing is applied; do not change it in this dispatch.

## Do not

- No allowlist on Guardrail A. "You, the hero" is out too.
- Do not add illness or loss tokens to the crisis classifier. Different system, different purpose. The crisis Guard is unchanged.
- No changes to card count, slots, tiers, Stripe keys, `is_seed`.
- Do not rewrite prompt text. Verbatim from the spec.

## Verify

Run each spill three times through the full pipeline. Paste all cards with their dealt premise and the guardrail log for each flip.

- *"My mother-in-law said I gave her cancer"* — no card contains an illness token outside quotation marks; no card matches Guardrail A; clapback is in quotes; at least one card contains the word "gave".
- *"I feel useless that I'm in my 30s and still need my parents' financial support"* — no card matches Guardrail A; the word "useless" appears in no card.
- *"Opened a spreadsheet called Household Budget…"* (regression) — no guardrail should fire on this spill at all. If one does, report the false positive with the matched span.

Report: paths changed, the guardrail log format, count of rejections per guardrail per run, all cards, any false positives. No summary of the rules — the spec has them.
