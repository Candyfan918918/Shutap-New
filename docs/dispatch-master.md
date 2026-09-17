# Claude Code — master dispatch, prompt pipeline v2.1 (everything to date)

Work in the repo. Commit to GitHub; Lovable picks it up from the connected branch. Do not dispatch through Lovable.

Files, in the working directory:
1. `shutap-prompt-templates-v2.1.md` — the spec. Prompt text is copied from it verbatim. It has been edited after the dispatches below were written; the spec wins on any conflict.
2. `claude-code-dispatch-prompts-v2.1.md` — ship the prompts, dealing, house voice, `prompt_version`.
3. `claude-code-dispatch-direction-guardrails.md` — three deterministic guardrails (user predicate, serious fact, self-critical tag).
4. `claude-code-dispatch-exemplar-leak.md` — few-shot similarity exclusion, hall-of-fame copy guardrail, dynamic `serious_fact` from the classifier, judge tag-on-turn rule.

## Order

Read all four in full. Then, before any edit, report which of dispatches 2–4 are already shipped, partly shipped, or unshipped — check the deployed `prompts.ts` against the spec, and check for the guardrail log lines. The last live set copied hall-of-fame lines and rendered a v1-style take, so assume nothing is shipped until proven.

Execute 2 → 3 → 4. Each has its own verification; run them all at the end in one pass instead of three.

## Spec changes since the dispatches were written (all in the spec, listed so nothing is missed)

- Stage 2 HEAT block (full degree, numbers over adjectives, the custody exemplar).
- Stage 2 SELF-DIRECTED SPILL block with exemplar and four moves (split, relocation, literal turn, obituary).
- Stage 2 one-pass rule; judge ONE PASS and HEAT criteria; judge self-directed criterion.
- Stage 1: SELF-CRITICAL SPILL, SERIOUS FACT (with the mechanism-unnamed exception), ACCUSATION SPILL, "name the errand", "name the institution", "keep the object".
- Clapback slot: rendered in quotation marks by the model; addressee is the other adult even when kind; moves added (concession, refusal, the order followed, fake concern, alibi).
- Roast slot: ceiling not target, stop at the turn, one-pass, full degree.
- Take slot: precision not restraint, one-pass, the split on self-directed spills.
- MOVES additions: the procedure, the collateral, the mechanism mirror, the prior, the non-answer, proof by count, the replay, deflate downward + one folder lower, answer the text, the power stays with them, the new listener, stage direction, the law, the pep talk, hijacked proverb, wrong-way correction, full degree every card.
- House voice: "dry" removed; never goes easy.

None of these need new code — they are prompt text — except that the clapback quotes must not be doubled by the renderer.

## Verification set (run each twice, paste every card with dealt premise and guardrail log)

1. Opened a spreadsheet called "Household Budget" and it's a log of everything I do that annoys my husband, with a severity scale. He made me coffee this morning like nothing.
2. Found out from an Instagram tag that my husband's been a sperm donor for a couple at his gym for 8 months. He asked if we could "table it" till after his work trip.
3. I feel useless that I'm in my 30s and still need my parents' financial support.
4. My mother-in-law said I gave her cancer.
5. My mother-in-law said I gave her an autoimmune disease.
6. My mother-in-law told me I stole her son from her.
7. My mother-in-law told me we could pay her for day care for our baby.
8. My MIL said she was gonna file for custody of our daughter because we wouldn't let her see her.
9. Leaving my house at 8:30am hoping I make it to work by 8:00am.
10. My mother-in-law calling my baby "her baby".
11. My ex-MIL said "shit or get off the pot" when I told her I was depressed.
12. My ex-MIL said "shit or get off the pot" when I told her I was depressed/suicidal. → must hit the Guard; no set; report the classifier output.

Checks across all: no two cards share a premise; every clapback in quotes and addressed to the other party (or, on 3 and 9, to the parents / to the clock); no "you're a / you, the [noun]"; no serious-fact token outside quotes on 4, 5, 11; no candidate Jaccard-matching a hall-of-fame line; 4 and 5 do not reproduce each other; at least one number per set; no card over its slot ceiling; report any card that needs a second read to parse.

Report: paths changed, migrations, deployed `SLOT_RULES` and HEAT block pasted verbatim, all cards, all logs, false positives. No summary of the rules.
