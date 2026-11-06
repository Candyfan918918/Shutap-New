// Shutap for Realtors (Nov 5 2026): the kit prompts. One listing in, six
// outputs out, in one tone. Written on the same bones as the bit prompts:
// THE STANDARD (lines rated funny), the house rules, and a judge from another
// model family. KIT_PROMPT_VERSION is stamped on every kit; bump on any edit.
export const KIT_PROMPT_VERSION = 'kit-0.1'

export const KIT_TONES: Record<string, string> = {
  professional:
    'Professional & trustworthy. Facts first, in order. At most one dry line per output, placed last; a stranger would call it wit, not a joke. Never roast the house. Numbers and specifics instead of adjectives. No exclamation marks.',
  funny:
    'Funny & relatable. The full Shutap treatment: the honest listing, one laugh per room (not per line), the buyer\'s inner voice is fair game, a running gag on the one thing about the house that comes back three times. Still accurate; the joke is the picture, never a lie.',
  luxury:
    'Sophisticated & luxury. Understated. Short sentences, aspiration stated plainly, one wink at the very end of each output and nowhere else. Never roast the house or the price. The reader should feel the agent has seen better houses and this is one.',
  young:
    'Young, energetic & trend-aware. Fast. Text-on-screen rhythm: fragments, POV framing, the format of a TikTok that gets to the point in two seconds. Playful, not sarcastic. No slang that will date in a month; no brand names.',
}

/** The rules every kit obeys whatever the tone. Fair housing is law, not taste. */
export const KIT_RULES = `HARD RULES (every line, every tone):
- FAIR HOUSING: never say or imply who should live here or who lives nearby. No "family", "kids", "couples", "singles", "seniors", "retirees", "safe", "secure", "quiet neighborhood", "good schools", "exclusive", "private community", "church", "walkable for seniors", nothing about race, religion, national origin, disability, sex or familial status, and no coded version of any of these. Describe the property and the place, never the people.
- EXACT NUMBERS: the price, beds, baths, square feet, lot size, year built, HOA and taxes are copied from THE LISTING character for character ($2,588,000 stays $2,588,000; never "$2.6M", never "about", never a different figure). A number not in THE LISTING does not exist.
- NOTHING ADDED: use only the facts in THE LISTING and THE AGENT'S NOTE. No invented renovations, views, appliances, school names, commute times, HOA facts or neighborhood businesses. If a fact is not given, do not need it.
- THE JOKE'S TARGET: the market, the process, the commute, the buyer's life stage, the agent, the house (only when ROAST THE HOUSE is on) and the neighborhood's traffic, parking, weather, prices and lines (only when ROAST THE NEIGHBORHOOD is on). Never the seller, never a named or identifiable buyer, never who lives nearby.
- MUST SAY: every word or phrase under MUST SAY appears word for word in every output where it can make sense (a sold post need not carry the open-house time; say so in "skipped"). NEVER SAY: no word under NEVER SAY anywhere.
- No real names except the brokerage and the agent if given under MUST SAY. No emojis. No hashtags. US English.`

export const KIT_PROMPT = `You write the content kit a real estate agent shoots and posts for one listing. The agent performs it: to camera, walking the house, phone in hand.

THE LISTING:
{{LISTING}}

THE AGENT'S NOTE (the one thing about it, in their words):
{{NOTE}}

TONE: {{TONE}}
ROAST THE HOUSE: {{ROAST_HOUSE}}
ROAST THE NEIGHBORHOOD: {{ROAST_NEIGHBORHOOD}}
MENTION THE PRICE IN THE JOKES: {{MENTION_PRICE}}
MUST SAY: {{MUST_SAY}}
NEVER SAY: {{NEVER_SAY}}

{{STANDARD}}
{{RULES}}

WRITE SIX THINGS, in this shape:

1. walkthrough: 7 to 9 shots for a 30-second one-take walkthrough. Each shot: where (the room and the camera move, e.g. "front door · to camera", "kitchen · pan left to the window"), action (one sentence: where to stand, what to do, when to say the line), line (what the agent says: one sentence, under 16 words, the turn as the last word), seconds (e.g. "0–3"), fact (the listing fact the line is built on, or "" ). Shot 1 is the hook (on screen, first two seconds); the last shot is the button, said as the door closes. One laugh per room at most. Then cut15: which shot numbers make the 15-second cut; cut60: what the 60-second cut adds (one sentence).
2. voiceover: the same walkthrough as clean narration for text-to-voice or the agent's own voice over B-roll: one line per shot, label = the room, text = the line as spoken (no directions, no quotes).
3. hooks: three first-two-second openers (line, move: which comedy move it uses, e.g. "specific picture", "escalation", "reversal", "buyer's inner voice", "price anchor", "listing-speak vs reality"). Each under 12 words. If MENTION THE PRICE is off, no hook uses the price.
4. open_house: five pieces, label and text: "invite post" (2–3 sentences), "story · 3 frames" (three short on-screen lines, numbered), "sign line" (under 8 words, for the A-frame), "day-before reminder" (one sentence), "thank-you text" (one or two sentences, to a visitor, warm, no sales push). If no open-house time is given, write them without a time and say so in "skipped".
5. posts: six, label and text: "just listed · instagram" (2–3 sentences), "just listed · tiktok" (fragments, under 25 words), "just listed · facebook" (3–4 sentences, the fullest), "price improvement" (1–2 sentences; use "now" with no number unless the price is under MUST SAY), "pending" (one line), "sold" (1–2 sentences, congratulate the new owners without naming them).
6. straight: the MLS-ready description, 60–110 words, no humor at all, every fact given and nothing else.

Also: skipped: an array of {where, what} for any MUST SAY word you left out of an output and why (empty if none).

Return only JSON:
{"walkthrough":{"shots":[{"where":"...","action":"...","line":"...","seconds":"...","fact":"..."}],"cut15":"...","cut60":"..."},
 "voiceover":[{"label":"...","text":"..."}],
 "hooks":[{"line":"...","move":"..."}],
 "open_house":[{"label":"...","text":"..."}],
 "posts":[{"label":"...","text":"..."}],
 "straight":"...",
 "skipped":[{"where":"...","what":"..."}]}`

export const KIT_JUDGE_PROMPT = `You judge content kits written for a real estate agent's listing video. You are not the writer. Rank these kits for one listing, same tone, by which one an agent would actually shoot and post, in this order of weight: (1) the walkthrough's hook stops a thumb and the button lands; (2) every line is sayable in one breath by a normal person, phone in hand; (3) the humor fits the tone and never makes the house or the agent look bad in a way that costs a listing; (4) the pieces are specific to THIS house (a kit that would fit any house loses); (5) nothing is said that the listing did not give.

THE LISTING:
{{LISTING}}

TONE: {{TONE}}

{{STANDARD}}

THE KITS:
{{KITS}}

Return only JSON: {"ranking":[<kit numbers best first>],"why":"one sentence on the winner"}`
