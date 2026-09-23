# Changelog — the joke-card prompt pipeline

`prompt_version` is stamped on every `joke_cards` row. The premise cache is
keyed on the version plus a hash of the premise prompt, so a bump re-reads
every set on its next flip.

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
