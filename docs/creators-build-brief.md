# Shutap for Creators — Claude Code build brief

Hand this file to Claude Code. It is written against this repo (Candyfan918918/Shutap-New) as of commit 7c1a7d6, Oct 5 2026.

- Design to match: the "Shutap Redesign" demo (claude.ai artifact, Oct 5). Every screen in it is specified below.
- Copy: `claude/shutap-creators-copy-v1.md` in the Shutap project (strings, plans, sign-in, meta).
- Why and what: `claude/shutap-creators-master-plan.md` in the Shutap project.

**Done when:** a visitor from TikTok, on a phone, can land, write a bit with no account, read it off the prompter, sign in with one tap, pick one, download it with the mark, and find it in their set list the next day. Under two minutes, no reading required.

---

## 0. Ground rules

1. Work on a branch named `creators`. `main` is connected to Lovable; never force-push, rebase or amend anything already pushed (see AGENTS.md). Merge to `main` only when a phase passes its checks below.
2. Prompts live in `src/lib/jokes/prompts.server.ts` only. Never in components.
3. Model names come from env through `writerModel()` / `judgeModel()` in `src/lib/jokes/pipeline.server.ts`. The judge must be a different provider family from the writer. No keys in any `VITE_` variable.
4. Every rule that matters is enforced on the server (limits, tier, watermark), never only in the browser. Follow the pattern documented at the top of `src/lib/jokes.functions.ts`.
5. Before every merge, grep changed files for banned product words and report hits with file and line: `safe space|community|therapy|support|positive|silver lining|reframe|resilience|mindset|premium|credits|joke card|flip|generator|AI-generated`. "joke generator" is allowed only in page titles, meta descriptions, link previews and structured data.
6. Keep the brand: Sora for UI, Newsreader for the words people read, ink `#0b080f`, accent `#c1216b` / `#e7548a`, the eyes (`src/components/brand/EyeMark.tsx`). Light and dark both work.
7. Pseudonymous, 18+, the Scrubber runs on every free-text field before storage, the crisis classifier overrides everything (no bit, no paywall, the fixed support block).

## 1. What already exists and gets reused

| Need | Already in the repo | Use it for |
|---|---|---|
| Guest identity | `resolveJokeIdentity()` in `src/lib/jokes/session.server.ts` (x-shutap-anon header) | guest bits |
| Guest → account | `claimJokeSession` in `src/lib/jokes.functions.ts`, `anon-attacher.ts` | claim the guest bit on sign-in |
| Daily counter, incremented before any model call | `submitJokeEntry` / `DAILY` in `src/lib/jokes.functions.ts`, `DAILY_SETS` in `src/lib/jokes/deck.ts` | the new bit limits |
| Scrubber + crisis + reading | `runScrub` (`src/lib/agents/scrubber.functions.ts`), `runClassifyCrisis`, `runReadSpill`, as used in `submitJokeEntry` | the first steps of writeBit |
| Premise pass, candidates, hard rules, judge | `src/lib/jokes/pipeline.server.ts`, `prompts.server.ts`, `voices.server.ts` | the bit writer |
| Export image + watermark | `src/lib/jokes/card-art.ts`, `CardWatermark` in `src/pages/home/joke/ui.tsx`, `exportJokeCards` | bit image download |
| Sign-in | `startOAuth('google' \| 'apple')` in `src/lib/oauth-signin.ts`, `sendMagicLink` in `src/lib/magic-link.functions.ts` | the "Keep this bit." sheet |
| Paid tier | `getMirrorEntitlement`, `createMirrorCheckout`, `createMirrorPortal`, prices in `src/lib/pricing.ts` (mirror_monthly $7.99), checkout page `src/routes/subscribe.tsx` | Shutap+ (same Stripe price, new name in copy) |
| Analytics | `track()` in `src/lib/feedback.ts`, PostHog client in `src/lib/posthog.ts` | events in A6 |

Nothing in the current joke-card flow is deleted in this brief. The new studio replaces the homepage; the card flow stays reachable for history.

## 2. Decisions to confirm with Candy before step A1

1. **Limits.** Today every tier gets 5 situations a day and money buys only the clean card (comment at the top of `jokes.functions.ts`: "it never buys more jokes"). The new plan is guest 1, free 3 a day, Shutap+ unlimited. This reverses that rule on purpose. Confirm.
2. **Annual price.** Keep `mirror_annual` ($49.99/yr) on the pricing page, or show monthly only? Copy assumes monthly only.
3. **Old card flow.** Keep the three-card flow at a secondary route (suggest `/cards`) for existing users, or retire it after migration?

## 3. Phase A — the studio, the bit, the prompter, the plan (ship first)

### A1. Database (new migration in `supabase/migrations/`, additive, no renames)

```sql
create table bits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),          -- null for a guest
  anon_session_id text,                             -- guest owner until claimed
  situation_clean text not null,                    -- scrubbed input only
  input_kind text not null check (input_kind in ('story','bit')),
  controls jsonb not null,                          -- snapshot of the panel at write time
  current_version_id uuid,
  status text not null default 'not_posted',        -- not_posted | posted | running | ruin
  kept boolean not null default false,
  created_at timestamptz not null default now()
);
create table bit_versions (
  id uuid primary key default gen_random_uuid(),
  bit_id uuid not null references bits(id) on delete cascade,
  n int not null,
  source text not null check (source in ('write','punch_up','alt_swap','hotter','tighter','escalate','callback','pick')),
  hook text not null, setup text not null,
  tags text[] not null, button text not null,
  seconds_est int not null, heat int not null,
  why text,                                         -- one line from the judge, shown under the bit
  prompt_version text not null, writer_model text not null, judge_model text not null,
  created_at timestamptz not null default now()
);
create table bit_candidates (
  id uuid primary key default gen_random_uuid(),
  bit_id uuid not null references bits(id) on delete cascade,
  slot text not null check (slot in ('hook','tag','button')),
  text text not null, move text, rank int,
  created_at timestamptz not null default now()
);
create table bit_preferences (
  id uuid primary key default gen_random_uuid(),
  bit_id uuid not null references bits(id) on delete cascade,
  slot text not null, winner_id uuid not null references bit_candidates(id),
  loser_id uuid not null references bit_candidates(id), pair_index int not null,
  created_at timestamptz not null default now()
);
create table user_controls (
  user_id uuid primary key references auth.users(id),
  controls jsonb not null, updated_at timestamptz not null default now()
);
```
RLS: a user reads and writes only their own rows; guests have no direct table access (server functions only, same as `joke_cards` today). Guest bits are stored with `anon_session_id` so they can be claimed; delete unclaimed guest bits after 24 hours.

### A2. Prompts (`src/lib/jokes/prompts.server.ts`, new version `v3-bit`)

- Keep the premise pass, the five engines, the five moves and the three tests unchanged.
- New output schema per bit: `hook` (≤ 8 words, readable with sound off), `setup` (the situation in the creator's voice, may reuse their words), `tags[]` (1 at 15s, 2 at 30s, beats 1–3 at 60s+), `button` (must pass the answerability test), `why` (one plain sentence naming the move and the test the runner-up failed).
- Candidates: ten per slot. Judge ranks per slot, comparatively. Keep the top five tags as alternates (stored in `bit_candidates`).
- Controls block interpolated as fixed text: audience (where it's said), platform, length, format, voice, heat, hook style, never-list. Audience office / work / family / school lowers the effective heat ceiling by one.
- Input kind: classify story vs bit (a punchline shape under ~60 words → `bit`, "punch it up": keep their setup, write new tags and button).
- Voices: the eight creator voices (deadpan, observer, one-liner, storyteller, roaster, absurdist, crowd-worker, hype) map onto the twelve seeded voices in `voices.server.ts`. Never a named comedian.
- Talking pace for `seconds_est`: 2.6 words per second.

### A3. Server functions (new file `src/lib/bits.functions.ts`, same style as `jokes.functions.ts`)

| Function | Does | Counts toward the daily limit |
|---|---|---|
| `writeBit({ text, controls })` | identity → limit check and increment → scrub → crisis (stop here if crisis) → classify input → premise pass → candidates → judge → guardrails → insert bit, v1, candidates. 10 s ceiling; one retry, then an authored fallback, logged. | yes |
| `varyBit({ bitId, kind })` kind = hotter / tighter / escalate | rewrite the slots that change; new version | no |
| `swapTag({ bitId, candidateId, slot })` | new version with that tag; logs a rank event | no |
| `pickBit({ bitId, choices[] })` | writes three `bit_preferences` rows; new version with `source='pick'` | no |
| `keepBit({ bitId })` | sets `kept`; requires sign-in | no |
| `exportBit({ bitId, kind })` kind = image / scene | renders via `card-art.ts`; watermark unless Shutap+ | no |
| `listMyBits()` / `getBit({ bitId })` | set list and bit page | no |
| `saveControls({ controls })` | upserts `user_controls`; guests keep controls in the browser | no |

Limits: replace the `DAILY_SETS` use for the studio with `BITS_PER_DAY = { guest: 1, free: 3, paying: Infinity }` (new constant in `src/lib/jokes/deck.ts`). Signing in merges today's count, as `claimJokeSession` already does. Keep the existing IP rate limit.

### A4. Screens (new folder `src/pages/studio/`)

| Route | Component | From the demo |
|---|---|---|
| `/` | `StudioPage` = `StudioBox` + `ControlsPanel` + `TodayList` + `TodaysPremise` (Phase C; render nothing until then) | write screen |
| `/bit/$id` | `BitPage` = `BitCard` (hook, setup, tags, button, why) + `AltTags` + `Variations` + `PostKit` + action row | the bit |
| `/bit/$id/pick` | `PickOne` (3 rounds, A/B, "neither" deals the next pair, max 2 pairs per round) | pick one |
| overlay | `Prompter` (full-screen dark, large Newsreader, current line with a pink rule, play/pause at 2.6 w/s, tap a line to jump, screen wake lock when available) | prompter |
| `/bit/$id/scene` | `ScenePage` (screenplay format from the bit's slots; two characters; `(to camera)`) — can ship in Phase A as text-only | scene |
| sheet | `SignInSheet` "Keep this bit." Apple · Google · email link; shown on keep, download, pick one as guest, second bit as guest | sign-in |
| sheet | `DownloadSheet` (preview with the mark on free; "go clean · $7.99/month" and "download with the mark") | download |
| sheet | `LimitSheet` (fourth bit of the day) and `UpgradeSheet` (opens `createMirrorCheckout`) | limit, upgrade |
| `/pricing` (new; `/subscribe` keeps doing checkout) | `PricingPage` free vs Shutap+ | pricing |

Layout rules from the demo: phone-first single column; at ≥ 960 px the studio is box (left, ~60%) + controls (right). On a phone the controls collapse to one summary line ("social media · 30s · camera · deadpan · heat 3 · change"). The box starts empty; the placeholder is the only priming; no chips or example text inside the box. Writing state shows four short steps for ~8 seconds, never a spinner alone.

Nav: write · set list · pricing (desktop) · sign in / account. Footer: "SHUTAP. Say it funnier.", the 18+ / not-therapy line, 988.

### A5. Copy

Put every string for these screens in one file, `src/lib/copy/creators.ts`, taken from `claude/shutap-creators-copy-v1.md`. After the studio ships, swap the homepage meta description to the post-rebuild version in that doc.

### A6. Analytics (via `track()` in `src/lib/feedback.ts`)

`studio_viewed`, `control_changed {name, value}`, `bit_write_started`, `bit_written {input_kind, seconds, heat}`, `bit_write_failed {reason}`, `alt_swapped {rank}`, `variation_made {kind}`, `pick_completed`, `pick_neither {slot}`, `prompter_opened`, `prompter_played`, `scene_opened`, `signin_sheet_shown {reason}`, `signin_completed {method}`, `download_shown`, `download_marked`, `upgrade_clicked {from}`, `limit_hit`, `crisis_shown`.

The first number to watch: `bit_written` ÷ `studio_viewed` from TikTok (baseline 0 of 18 on the old homepage).

### A7. Checks before merging Phase A

1. Nine-bit check: three situations from the eval set × three bits, each line against the naming, swap and answerability tests. Record results in the eval ledger.
2. Phone (390 px) and desktop (1280 px), light and dark: no horizontal scroll, all text readable, every button reachable with the keyboard.
3. Guest flow end to end: write → prompter → keep → sign in with Google → the bit is in the set list.
4. Free flow: four new bits → the fourth shows the limit sheet; variations still work.
5. Download on free has the mark; on Shutap+ it doesn't. Server decides, not the browser.
6. Crisis input returns the support block, no bit, no paywall.
7. Banned-word grep on changed files, results listed with file and line; list every file changed.

## 4. Phase B — the set list, ran it, your material

- Table `bit_runs (id, bit_version_id, kind open_mic|show|post|practice, ran_at, post_url, views, likes, comments, per_beat jsonb, notes)`.
- `/set-list`: every bit, newest first, status pill, versions with what changed, runs.
- Ran it: posted (paste the link, numbers typed in; automatic numbers need TikTok sign-in and an approved developer app — later) or live (tap each beat hit or missed).
- `/mirror` keeps its route; point the pattern code at `bits` + `bit_runs`; nav label "your material". Records, observes, analyzes; never advises. Sparse data shows "forming".
- Checks: same as A7 items 2, 7.

## 5. Phase C — the room and today's premise

- The room (`/room/$id`): merge Spill and Scan. Questions generated from the entry; angles = the cached premise pass shown with the engine named; the brief saved on the bit. Redirect the old Spill/Scan routes.
- Today's premise: tables `premises_daily`, `premise_tags`; a nightly ranking job; seed 90 premises (authored, license = own). No likes, comments or follows. Unperformed bits never appear.
- Checks: same as A7 items 2, 6, 7.

## 6. Not in scope

Native app, App Store, TikTok sign-in for automatic numbers, recording a run with the prompter on screen, build-a-set, small-business tier. They come after weekly use proves out.
