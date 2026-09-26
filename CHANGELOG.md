# Changelog — the joke-card prompt pipeline

`prompt_version` is stamped on every `joke_cards` row. The premise cache is
keyed on the version plus a hash of the premise prompt, so a bump re-reads
every set on its next flip.

## 3.8 — 2026-09-26

Four founder-ranked winners from the manager set added to the seed hall of
fame (1 take, 1 clapback, 2 roasts): institutional deadpan for a bodily
problem ("unannounced air quality advisory"), an eight-word polite clapback
("much better over Slack"), roasts as job-title verdicts. Prompt text
unchanged; the copy guardrail already stops candidates reproducing these
lines.

## 3.7 — 2026-09-26

Nine founder-ranked winners (3 take, 3 clapback, 3 roast) added to the
seed hall of fame as few-shot examples: cold precision, one physical noun,
the disguise ripped off in one move. Prompt text unchanged; the copy
guardrail already stops candidates reproducing these lines.

## 3.6 — 2026-09-25

The v3 spec (ledger through round AA, the $120 tank), merged over the
Lovable agent's 3.5 of the 23rd (G scoped to take and roast, the
network flip limit switchable off). Prompt text verbatim, and this time every template and slot rule is checked
character for character against the spec's code blocks by the patch
that applied them; two older ordering drifts in the candidate prompt
(THE LINEUP's place, the NEVER WRITE order) were found and fixed by
taking the block wholesale. New: A COST SPILL in stage 1; the
no-second-party cost exemplar, THE LOOP, THE CONVERSION, THE MACHINE'S
QUESTION and HARDER IS SHORTER in stage 2; the spill's figure on the
NEVER WRITE list; the judge's THE SPILL'S NUMBER, the loop-then-verdict
rule, and the metaphor criterion narrowed to take and roast; NO INVENTED
PEOPLE removed from the judge (it is not in the spec; Guardrail I stays);
ON A COST SPILL in the take and roast rules; THE CONFESSION in the
clapback rule.
Guardrail J (`spill_figure`): every number and currency amount the user
typed, whole, is rejected when a candidate repeats it; clock times are
not figures (the approved 8:30 take repeats the spill's times).
The clapback may carry a one-line stage direction above the quote; the
quotation-mark checks read the last line, the renderers honour the line
break. Round AA's three cards join the ledger, the seed and the hall of
fame.
## 3.5 — 2026-09-23

Spec v3 (ledger through round Z). Judge: INSIDE THE USER'S METAPHOR is
scoped to take and roast, verbatim; guardrail G (`literal_noun`) no longer
runs on the clapback. Open: v3 omits the judge's NO INVENTED PEOPLE bullet;
kept pending founder confirmation (guardrail I unchanged).

## 3.4 — 2026-09-23

Three guardrail bugs from the hamster set (3.3 was never cut; the number
is skipped so the dispatch and the stamp agree). The set's take and
clapback were the authored floor: both candidate passes failed and the
pool, written for in-law spills, served "she did the thing…" and "that
was a choice, and you made it" past every guardrail. The floor now goes
through the guardrails and hard rules like a candidate; the first pool
line that passes is dealt, and a spill no pool line fits is logged.
The clapback's own quotation marks were already unwrapped before every
outside-quotes check (B, CLINICAL, H); no stored clapback candidate was
missed. Guardrail I (`pronoun_antecedent`): on a self-directed set a
third-person singular pronoun before any person-noun (PERSON_NOUNS plus
the situation's capitalised roles) is out. Guardrail D gains a
paraphrase half: candidates that passed the text guardrails are embedded
in one batch and rejected at cosine ≥ EXEMPLAR_EMBED_THRESHOLD (0.86,
untuned until a keyed run of scripts/joke-hof-similarity.ts) to any
hall-of-fame line's `text_embedding`, filled lazily. Judge: NO INVENTED
PEOPLE under ONE PASS, verbatim. Migration for `text_embedding`.

## 3.2 — 2026-09-23

The user's metaphor, and blame. Founder rejected the live v3 set for "I
feel like a hamster in a non-stop spinning wheel as a stay-at-home mom":
every card lived inside the metaphor and the roast blamed her. Verbatim
from the spec: THE USER SPOKE IN A METAPHOR in stage 1; two judge
criteria (blame on a self-directed emotional spill is out; INSIDE THE
USER'S METAPHOR ranks with the findings); round Z in the ledger.
The spill reader now also answers `metaphor_span` and `emotional`, stored
on `joke_sets`. Guardrail G (`literal_noun`): on a metaphor spill a
candidate must hold a concrete noun from the spill outside the metaphor
or from the noun lists its archetype opens (`ARCHETYPE_NOUNS`, seeded
from the ledger's approved cards). Guardrail H (`blame`): on a
self-directed emotional spill, `you (chose|built|made|let|did this|
picked|caused|wanted)` outside quotes is out. Order A–H.

## 3.1 — 2026-09-23

Length. Founder: live v3.0 cards are too long; over the 72 approved
ledger cards the medians are take 11.5 / clapback 6 / roast 15 words and
the slot rules said up to 25 / 30 / 50. Verbatim from the spec: the slot
rules' first lines now give targets 10 / 6 / 15 and hard ceilings
16 / 10 / 25; a LENGTH bullet in stage 2 SHAPE; a LENGTH criterion in the
judge. Guardrail F (`length`): a candidate over its slot ceiling
(whitespace words, quotation marks stripped; `SLOT_CEILINGS`) is rejected
before the judge, logged `{count, ceiling}`. Runs after E. Seeded
hall-of-fame rows over a ceiling stay seeded; F is for new candidates.

## 3.0 — 2026-09-22

Spec: `docs/shutap-prompt-templates.md` (the founder's v2.1 file, as edited
through round Y; the file keeps its name until the founder renames it).

Prompt text, verbatim from the spec:
- Stage 2 LANDING gains THE BORROWED DOMAIN.
- Stage 2 SELF-DIRECTED SPILL gains YOU VERSUS YOU, THE IRONIC SUPERLATIVE,
  THE INSTITUTION'S ALIBI, the HR exemplar, and THE DELAY.
- Stage 2 MOVES gains THE WRONG ROLE, THE SMALL DEPRIVATION, THE CLEAN LINE,
  THE OVERREACTION, THE ANIMAL WITH A BILL, THE CONVENTION, THE BOOMERANG,
  THE LINEUP.
- Judge ranking gains OWN THE VOCABULARY; STOPS AT THE TURN moved to the
  spec's position (after the self-directed criterion).
- Clapback slot rule gains THE SCAPEGOAT.

Code:
- Guardrail E — borrowed domain (`borrowed_domain`). Six domain lexicons
  (corporate, finance, legal, medical, military, sports), each with the
  everyday words that mark the domain as the spill's own and the jargon
  that is the costume. A candidate wearing a domain the spill's text and
  archetype never opened is rejected unless it contains a quoted span from
  the spill. Corporate and finance open each other. Runs after A–D.
- Guardrail A on self-directed spills is limited to the verdict-noun list
  (spec §8, round U). The spill reader that extracts `serious_fact` now also
  answers `self_directed`; stored on `joke_sets.self_directed`; no answer
  keeps A total.
- Thin-input flag: fewer than 8 words → `joke_sets.thin_input`, logged on
  `[joke-set] opened`, and the surface nudges to the scan. Nothing is gated.
- Hall of fame seeded from the founder's ledger: 72 approved product-mode
  rows, 71 admitted by the hard rules and guardrails A–E against their own
  situation (`scripts/jokenet-sync.ts`); the seed in `voices.server.ts` and
  the migration carry the same rows. Few-shot order within a selection tier
  is now a stable per-set shuffle so the library is actually used.
- A clapback may be one word ("Rent.", "Client-facing.").
- Frozen eval set from the ledger: `JOKENET_SET`, `--set jokenet`.
- `[joke-flip]` logs `self_directed` and `domains`; `[joke-guardrail]` logs
  `{domain, token}` for E and `narrowed` for A.

Migrations: `20260922210000` (`joke_sets.self_directed`, `joke_sets.thin_input`),
`20260922211000` (hall-of-fame seed).

## 2.1 — 2026-09-14 → 2026-09-17

Prompts v2.1 verbatim, premise-per-slot dealing, house voice; guardrails A
(user predicate), B (serious fact, static + dynamic tokens), C (self-critical
tag), D (exemplar copy); few-shot similarity exclusion; STOPS AT THE TURN in
the judge; the founder's two narrowings (dynamic tokens whole-word, CLINICAL
outside quotes).
