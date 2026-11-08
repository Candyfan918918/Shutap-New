// Shutap Toasts (Nov 6 2026): the speech prompts. The person's own lines are
// the spine: Shutap writes only around them (the opener, the tags after a
// story, the turn, the lines to the partner, the toast) and never invents a
// story, a fact or a person. Same bones as the realtor kit: two writers, a
// judge from another model family, checks before anyone sees it.
// TOAST_PROMPT_VERSION is stamped on every toast; bump on any edit.
export const TOAST_PROMPT_VERSION = 'toast-0.3'
// 0.3 (Nov 6 2026): speeches ran short (the first lab runs: 47–102s on a
// 2-minute target); the writer gets a word floor and a short speech is rewritten.
// 0.2 (Nov 6 2026, Candy): the 60-second cut is on demand, written only when
// the speaker taps "make a 60-second version" (TOAST_CUT_PROMPT), not with every speech.

export const TOAST_TONES: Record<string, string> = {
  warm_funny:
    'Warm & funny. Laughs first, then the lump in the throat. Each story gets one tag that lands (a picture, not a label), the turn is earned by the stories, the true thing is said plainly. Affectionate: the room should like the person more at the end.',
  roast_lite:
    'Roast-lite. The speaker roasts the person, what happened in the stories, themselves and the room (the guests, the venue, the occasion itself). Sharper tags, a running callback, but never cruel, and only from what the speaker gave: tease the habits and moments in the stories, never invent a flaw. The turn still lands; the true thing is said straight.',
  dry:
    'Dry. Deadpan, short sentences, understatement. The speaker never laughs at their own line; the room does the work. Fewer jokes, each one lands harder. No exclamation marks.',
  heartfelt:
    'Heartfelt. One light laugh early (from a story), then mostly sincerity. Specific over sentimental: the stories carry the feeling, never adjectives about love. No clichés ("soulmate", "two become one", "journey").',
}

/** The rules every toast obeys, every tone, every occasion. */
export const TOAST_RULES = `HARD RULES (every line, every tone):
- THEIR WORDS STAY: every STORY below goes into the speech word for word, as its own line (source "story", ref = its number). THE TRUE THING goes in word for word as its own line (source "true_thing"), near the end, before the glasses. Never reword, trim or "fix" them.
- NEVER INVENT: no new story, event, habit, person, place, job, number or fact. Your lines (source "shutap") only open, react to, tag, connect and close what the speaker gave: a tag sharpens the picture a story already paints; it never adds a new thing that happened. If a STORY is "(empty)", you may write one short bridge line (source "bridge") built only from the other stories and the relation, never a new story.
- NAMES: write the person as {friend}, their partner as {partner}, the speaker as {me}, exactly so, with the braces. No other real names. Pronouns for {friend}: {{FRIEND_PRONOUN}}{{PARTNER_PRONOUN_LINE}}.
- THE JOKE'S TARGET: the situation, the stories, the speaker, the room; in roast-lite also the person. The person is never humiliated, and nothing is said about anyone's body, money, exes or private life that the speaker did not give.
- MUST SAY: every phrase under MUST SAY appears in the speech, word for word (source "must_say" if it is its own line). NEVER SAY: no word under NEVER SAY anywhere, in any form.
- SPOKEN: one breath per line (under 22 words; the stories are the exception), said by a normal person holding a glass. The turn word is the last word of a joke line. No emojis, no hashtags, no stage directions inside the text (use the fields). US English.`

export const TOAST_PROMPT = `You write a toast a real person will stand up and say out loud. The speaker gave you their stories in their own words; you build the speech around them.

THE OCCASION: {{OCCASION}}{{WHAT}}
THE SPEECH, IN THIS ORDER: {{STRUCTURE}}
WHO IT'S FOR: {friend}, the speaker's {{RELATION}}{{PARTNER}}
THE SPEAKER: {me}

THE STORIES (word for word):
{{STORIES}}

THE TRUE THING (the line the toast ends on before the glasses, word for word):
{{TRUE_THING}}

TONE: {{TONE}}
LENGTH: about {{SECONDS}} seconds said aloud, which is about {{WORDS}} words and never fewer than {{MIN_WORDS}} (count your words: a toast that runs long gets cut, one that runs short leaves the speaker standing there). With few stories, fill the time with what the speaker gave: a fuller opener, a second tag on a story, the turn, the lines to the room. Still never a new story or fact.
MUST SAY: {{MUST_SAY}}
NEVER SAY: {{NEVER_SAY}}
{{CHECK}}
{{STANDARD}}
{{RULES}}

WRITE:
1. lines: the whole speech, one object per spoken line, in order. Each: section (one of the sections above, e.g. "opener", "story 1", "story 1 · tag", "the turn", "the true thing", "to {partner}", "the toast"), text, source ("shutap" | "story" | "true_thing" | "must_say" | "bridge"), ref (the story number, for a story), pause (true for a beat after the line), laugh (true where the room should laugh: the speaker waits), glass (true only on the line where glasses go up{{GLASS_NOTE}}), note (a short delivery note or ""). The opener names the speaker and why they're up there. Each story is followed by at most two short tags. {{ENDING}}
2. cards: cue cards, one per section group (the opener, one per story with its tags, the close), at most 6. Each: title (2–4 words), keys (2–4 fragments of under 7 words each that remind the speaker what comes next, from the lines), land (the line the card ends on, word for word; for the last card, the toast line in full).
3. text_after: the text message the speaker sends {friend}{{TEXT_TO}} tonight after the toast: one or two sentences, warm, in the speaker's voice, nothing new invented.
4. flags: any line that only part of the room will get (an inside joke), or anything you were unsure about: [{"line": "...", "why": "..."}]. Empty if none.

Return only JSON:
{"lines":[{"section":"...","text":"...","source":"shutap","ref":0,"pause":false,"laugh":false,"glass":false,"note":""}],
 "cards":[{"title":"...","keys":["..."],"land":"..."}],
 "text_after":"...",
 "flags":[{"line":"...","why":"..."}]}`

export const TOAST_JUDGE_PROMPT = `You judge toasts written for a real person to stand up and say. You are not the writer. Rank these speeches, all written from the same stories, by which one the speaker should actually give, in this order of weight:
(1) it sounds like a person talking at a party, not a writer: every line sayable in one breath, holding a glass;
(2) the laughs come from the speaker's own stories and land (a picture the room can see, the turn word last), and nothing is invented;
(3) the turn earns the true thing, so the ending lands;
(4) it fits the tone and the occasion: {{CHECK}}
(5) it lands near {{SECONDS}} seconds.

THE OCCASION: {{OCCASION}}
TONE: {{TONE}}
THE STORIES: {{STORIES}}
THE TRUE THING: {{TRUE_THING}}

{{STANDARD}}

THE SPEECHES:
{{TOASTS}}

Return only JSON: {"ranking":[<speech numbers best first>],"why":"one sentence on the winner"}`

/** "funnier" on one line: three versions, the rest of the toast untouched. */
export const TOAST_TOUCH_PROMPT = `You sharpen one line of a toast a real person will stand up and say. Everything else stays as it is; you write three versions of that one line only.

THE OCCASION: {{OCCASION}}
WHO IT'S FOR: {friend}, the speaker's {{RELATION}}{{PARTNER}}
TONE: {{TONE}}
MUST SAY: {{MUST_SAY}}
NEVER SAY: {{NEVER_SAY}}
{{CHECK}}
{{RULES}}

{{KIND}}
THE LINES AROUND IT:
{{CONTEXT}}

THE LINE AS IT IS: {{LINE}}
{{AVOID}}
Three versions, each on a different move: understatement; a reversal; a more specific picture from what is already in the stories; a callback to an earlier line; a cut (fewer words, the turn word last). Each fits its place and is sayable in one breath (under 22 words). The tone stays the same. No two versions share their last three words. Keep {friend}, {partner} and {me} exactly so.

Return only JSON:
{"options":[{"line":"...","move":"understatement"},{"line":"...","move":"..."},{"line":"...","move":"..."}]}`

export const TOUCH_KIND_SPEECH = 'This is one of Shutap\'s lines in the speech (not the speaker\'s story). Write it three better ways; never add a new fact.'
export const TOUCH_KIND_STORY = 'This is the SPEAKER\'S OWN story line, in their words. Offer three ways to tell the SAME story funnier: the same facts and the same events, nothing added, in their voice (first person where they wrote first person). Their version stays first on the page; yours are suggestions they may take.'
export const TOUCH_KIND_TRUE = 'This is the SPEAKER\'S OWN closing line: the one true thing the toast ends on, said plainly. It is NOT a joke and must not become one. Offer three ways to say the SAME thing a little clearer, warmer or more vivid: the same meaning, nothing added, in their voice. Their version stays first on the page; yours are suggestions they may take.'

/** On demand (Nov 6 2026): the same speech cut to a minute, written only
 *  when the speaker taps "make a 60-second version". */
export const TOAST_CUT_PROMPT = `You cut a toast down to 60 seconds or less said aloud (about 110 words), for when the speaker is told on the day to keep it short. The speaker's own words stay; you take out, you never add.

THE OCCASION: {{OCCASION}}
TONE: {{TONE}}
MUST SAY: {{MUST_SAY}}
NEVER SAY: {{NEVER_SAY}}
{{RULES}}

THE FULL SPEECH (one line per row; [theirs] marks the speaker's own words):
{{SPEECH}}

KEEP, word for word: every [theirs] line you can (a story the speaker wrote is the last thing to go), the true thing, every MUST SAY, and the toast line at the end. Cut Shutap's lines first: tags, transitions, the second joke on a story. You may shorten one of Shutap's lines; you may not write a new one except a single short bridge where a cut leaves a gap. Keep the same marks (pause, laugh, glass, note).

Return only JSON, the same shape as the speech:
{"lines":[{"section":"...","text":"...","source":"shutap","ref":0,"pause":false,"laugh":false,"glass":false,"note":""}]}`
