// Shutap Toasts occasion pages (Nov 8 2026 redesign, approved by Candy): one
// page per occasion, each carrying the whole form in its first screen and a
// real toast for exactly that occasion beside it. Every /guides and /funniest
// page about an occasion links here.
//
// Copy rules: say what goes in and what comes out; no "generator", never
// "writes your jokes for you" (Shutap builds the toast around the person's own
// stories); none of the banned wellness words; no invented numbers or
// testimonials. Every claim here is something the code does: the occasion's
// check is given to the writer and the judge, never-say words start on the
// list and are checked on every line Shutap writes, stories and the last line
// go in word for word, names stay on the device.
import type { Occasion, Pronoun } from './shared'

export type Landing = {
  slug: string
  occasion: Occasion
  /** what the form starts with on this page (father / mother of the bride) */
  preset?: { relation?: string; pronoun?: Pronoun; demo?: 'dad' | 'mom' }
  /** the <title> and the description for search */
  title: string
  description: string
  /** short name: chips, breadcrumbs, the hub */
  name: string
  kicker: string
  /** the H1: what goes in, then (set apart) what comes out */
  h1: [string, string]
  /** one line under the H1 */
  lead: string
  /** how the demo shows names: {friend}, {partner}, {me} */
  roles: { friend: string; partner?: string; me: string }
  /** the hub card */
  hub: { group: 'Weddings' | 'Holidays' | 'Life and work'; type: string; lengths: string; shape: string }
  /** "How a … is built" */
  built: { h2: string; intro: string }
  /** the occasion's own checks: true of the code, in plain words */
  checks: { h3: string; body: string }[]
  faqs: { q: string; a: string }[]
  guide?: { href: string; label: string }
  /** a utility page: not one of the 10 */
  utility?: boolean
}

const COST = 'Your first toast is free, with a shutap.com watermark across every PDF page. After that a toast is $12.99 one time, Basic includes 1 a month and Pro is unlimited. Downloads are never limited.'
const NAMES = 'No. Names stay on your device. Shutap only ever sees placeholders, and your browser puts the names back on screen, in the prompter and in the PDFs.'
const NEVER_MADE_UP = { h3: 'It never makes up a story', body: 'Your stories and your last line go in word for word. Shutap writes only the lines around them, and never adds a story, a fact, a number or a person you didn’t type. Leave story 2 or 3 empty and it writes a bridge from the ones you did.' }
const GRANDMA = { h3: 'Grandma’s in the room', body: 'Every wedding toast is written and judged against one rule: nothing a grandparent, a pastor or a ten-year-old would wince at. Exes, the honeymoon, the bachelor party and drinking start on your never-say list, and every line Shutap writes is checked against it. Tap × to drop one if you know your room.' }
const HALF_TABLE = (o: string) => ({ h3: 'The half-the-table rule', body: `Inside jokes kill a family toast: half the table laughs, the other half asks what happened. Every ${o} toast is written and judged against one rule: the story has to be one the whole table can follow.` })

export const LANDINGS: Landing[] = [
  {
    slug: 'best-man',
    occasion: 'best_man',
    name: 'Best man',
    title: 'Funny Best Man Speech From Your Own Stories | Shutap Toasts',
    description: 'Type three stories about the groom. Shutap builds a 2-, 3- or 5-minute best man speech around them, word for word, with cue cards, a phone prompter and a keepsake for the couple. First toast free.',
    kicker: 'Shutap Toasts · Best man',
    h1: ['Type three stories about the groom. ', 'Get a best man speech you’ll actually want to give.'],
    lead: 'A 2-, 3- or 5-minute speech built around your stories, word for word.',
    roles: { friend: '[groom]', partner: '[partner]', me: '[you]' },
    hub: { group: 'Weddings', type: 'Three stories about the groom', lengths: '2, 3 or 5 min', shape: 'opening laugh · his stories · the turn · the true thing · to the partner · glasses up' },
    built: { h2: 'How a best man speech is built', intro: 'The shape that works at a reception: the opening laugh, his stories, the turn, the one true thing said plainly, a line to his partner, glasses up.' },
    checks: [GRANDMA, NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a best man speech be?', a: 'Three minutes is the sweet spot; two if the schedule is tight, five at most. Shutap writes to the length you pick and shows a running clock at a relaxed 140 words a minute, pauses counted.' },
      { q: 'Will it sound like me?', a: 'Your stories go in word for word. You can edit any line or tap funnier on any line Shutap wrote until you lock it. Nothing changes unless you pick it.' },
      { q: 'Can I roast the groom?', a: 'Yes. Pick roast-lite and Shutap roasts him, what happened, you and the room, using only what you typed. The wedding rule still applies.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/funny-best-man-speech', label: 'How to write a funny best man speech' },
  },
  {
    slug: 'maid-of-honor',
    occasion: 'maid_of_honor',
    name: 'Maid of honor',
    title: 'Funny Maid of Honor Speech From Your Own Stories | Shutap Toasts',
    description: 'Type three stories about your friendship. Shutap builds a 2-, 3- or 5-minute maid of honor speech around them, word for word, with cue cards, a phone prompter and a keepsake for the couple. First toast free.',
    kicker: 'Shutap Toasts · Maid of honor',
    h1: ['Type three stories about your friendship. ', 'Get a maid of honor speech that sounds like you.'],
    lead: 'A 2-, 3- or 5-minute speech built around your stories, word for word.',
    roles: { friend: '[bride]', partner: '[partner]', me: '[you]' },
    hub: { group: 'Weddings', type: 'Three stories about your friendship', lengths: '2, 3 or 5 min', shape: 'a friendship story · her qualities · the turn · wishes · glasses up' },
    built: { h2: 'How a maid of honor speech is built', intro: 'A friendship story, her qualities shown rather than listed, the turn, your wishes for them, glasses up.' },
    checks: [GRANDMA, NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a maid of honor speech be?', a: 'Two to three minutes; five at most. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Does Shutap write the speech for me?', a: 'It builds the speech around your stories. Your lines stay word for word, you edit anything you like, and nothing changes unless you tap it and pick.' },
      { q: 'Can I make it heartfelt instead of funny?', a: 'Yes. Pick heartfelt: one light laugh from your stories, then mostly the true thing you wrote.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/funny-maid-of-honor-speech', label: 'How to write a funny maid of honor speech' },
  },
  {
    slug: 'father-of-the-bride',
    occasion: 'parent',
    preset: { relation: 'dad', pronoun: 'she', demo: 'dad' },
    name: 'Father of the bride',
    title: 'Father of the Bride Speech From Your Own Stories | Shutap Toasts',
    description: 'Type three stories about your daughter. Shutap builds a 2-, 3- or 5-minute father of the bride speech around them, word for word, with cue cards, a phone prompter and a keepsake. First toast free.',
    kicker: 'Shutap Toasts · Father of the bride',
    h1: ['Type three stories about your daughter. ', 'Get a father of the bride speech, ready to give.'],
    lead: 'A 2-, 3- or 5-minute speech built around your stories, word for word.',
    roles: { friend: '[bride]', partner: '[partner]', me: '[you]' },
    hub: { group: 'Weddings', type: 'Her as a kid, her grown up, the day you met the partner', lengths: '2, 3 or 5 min', shape: 'welcome · your daughter · welcoming the new family · wishes · glasses up' },
    built: { h2: 'How a father of the bride speech is built', intro: 'Welcome the room, tell who she is through your stories, welcome her partner and their family, your wishes, glasses up.' },
    checks: [GRANDMA, NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a father of the bride speech be?', a: 'Three minutes is right for most receptions; two if there are many speeches, five at most. Shutap writes to the length you pick and shows the clock.' },
      { q: 'Can I welcome the groom’s family?', a: 'Yes. Welcoming the new family is part of the shape, and anything you add to must-say goes in.' },
      { q: 'Will it sound like me?', a: 'Your stories go in word for word. Edit any line or tap funnier until you lock it; nothing changes unless you pick it.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
  },
  {
    slug: 'mother-of-the-bride',
    occasion: 'parent',
    preset: { relation: 'mom', pronoun: 'she', demo: 'mom' },
    name: 'Mother of the bride',
    title: 'Mother of the Bride Speech From Your Own Stories | Shutap Toasts',
    description: 'Type three stories about your daughter. Shutap builds a 2-, 3- or 5-minute mother of the bride speech around them, word for word, with cue cards, a phone prompter and a keepsake. First toast free.',
    kicker: 'Shutap Toasts · Mother of the bride',
    h1: ['Type three stories about your daughter. ', 'Get a mother of the bride speech in your own words.'],
    lead: 'A 2-, 3- or 5-minute speech built around your stories, word for word.',
    roles: { friend: '[bride]', partner: '[partner]', me: '[you]' },
    hub: { group: 'Weddings', type: 'Her as a kid, her grown up, the day you met the partner', lengths: '2, 3 or 5 min', shape: 'welcome · your daughter · welcoming the new family · wishes · glasses up' },
    built: { h2: 'How a mother of the bride speech is built', intro: 'Welcome the room, tell who she is through your stories, welcome her partner and their family, your wishes, glasses up.' },
    checks: [GRANDMA, NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a mother of the bride speech be?', a: 'Two to three minutes; five at most. Shutap writes to the length you pick and shows the clock.' },
      { q: 'Can I make it heartfelt instead of funny?', a: 'Yes. Pick heartfelt: one light laugh from your stories, then mostly the true thing you wrote.' },
      { q: 'Will it sound like me?', a: 'Your stories go in word for word. Edit any line or tap funnier until you lock it; nothing changes unless you pick it.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
  },
  {
    slug: 'thanksgiving',
    occasion: 'thanksgiving',
    name: 'Thanksgiving',
    title: 'Funny Thanksgiving Toast From Your Family’s Stories | Shutap Toasts',
    description: 'Type the stories your family tells. Shutap builds a 1- or 2-minute Thanksgiving toast around them, word for word, with pause marks, cue cards and a phone prompter. First toast free.',
    kicker: 'Shutap Toasts · Thanksgiving',
    h1: ['Type your family’s best stories. ', 'Get a Thanksgiving toast they’ll still quote at Christmas.'],
    lead: 'A one- or two-minute toast for the table, built around your stories, word for word.',
    roles: { friend: '[host]', me: '[you]' },
    hub: { group: 'Holidays', type: 'One story the whole table knows', lengths: '1 or 2 min', shape: 'greeting · the story · gratitude · glasses up' },
    built: { h2: 'How a Thanksgiving toast is built', intro: 'Short and shared. Greet the table, tell one story everybody can follow, say what you’re grateful for, raise a glass.' },
    checks: [HALF_TABLE('Thanksgiving'), NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a Thanksgiving toast be?', a: 'About a minute, two at most. Shutap writes to the length you pick (1 or 2 minutes) and shows a running clock, counted at a relaxed 140 words a minute with the pauses.' },
      { q: 'Does Shutap make up stories about my family?', a: 'No. Your stories go in word for word. Shutap writes only the lines around them: the opener, the tags, the thanks, the toast. It never invents a story, a fact or a person.' },
      { q: 'Do the names leave my phone?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/funny-thanksgiving-toast', label: 'How to give a funny Thanksgiving toast' },
  },
  {
    slug: 'christmas',
    occasion: 'christmas',
    name: 'Christmas',
    title: 'Funny Christmas Toast From Your Family’s Stories | Shutap Toasts',
    description: 'Type the stories your family tells every year. Shutap builds a 1- or 2-minute Christmas toast around them, word for word, with pause marks, cue cards and a phone prompter. First toast free.',
    kicker: 'Shutap Toasts · Christmas',
    h1: ['Type the stories your family tells every year. ', 'Get a Christmas toast for the whole table.'],
    lead: 'A one- or two-minute toast for Christmas dinner, built around your stories, word for word.',
    roles: { friend: '[host]', me: '[you]' },
    hub: { group: 'Holidays', type: 'The story your family tells every year', lengths: '1 or 2 min', shape: 'greeting · the story · gratitude · glasses up' },
    built: { h2: 'How a Christmas toast is built', intro: 'Greet the table, tell the story everyone knows by heart, say what this year gave you, raise a glass.' },
    checks: [HALF_TABLE('Christmas'), NEVER_MADE_UP],
    faqs: [
      { q: 'How long should a Christmas toast be?', a: 'A minute, two at most: the food is on the table. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Is this for the office party too?', a: 'The office party has its own page, with a workplace check. This one is for family and friends at the table.' },
      { q: 'Do the names leave my phone?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/funny-christmas-toast', label: 'How to give a funny Christmas toast' },
  },
  {
    slug: 'office-holiday-party',
    occasion: 'holiday_party',
    name: 'Office holiday party',
    title: 'Funny Office Holiday Party Toast, Safe for Work | Shutap Toasts',
    description: 'Type the year’s big win. Shutap builds a 60-second to 2-minute holiday party toast around your team’s stories, written and judged against a workplace check. First toast free.',
    kicker: 'Shutap Toasts · Office holiday party',
    h1: ['Type the year’s big win. ', 'Get a holiday party toast that works for the whole office.'],
    lead: 'A 60-second to 2-minute toast built around what your team actually did, word for word.',
    roles: { friend: '[team]', me: '[you]' },
    hub: { group: 'Holidays', type: 'The year’s big win', lengths: '60s, 90s or 2 min', shape: 'shout-outs · a laugh the team shared · thanks · glasses up' },
    built: { h2: 'How a team toast is built', intro: 'A thank-you with a laugh in it: the year’s wins, a moment the team laughed, the thanks, glasses up.' },
    checks: [
      { h3: 'The workplace check', body: 'Every office toast is written and judged against one rule: no one person singled out or embarrassed, shout-outs go to teams and wins. Drinking, bonuses and layoffs start on your never-say list, and every line Shutap writes is checked against it.' },
      NEVER_MADE_UP,
    ],
    faqs: [
      { q: 'How long should a holiday party toast be?', a: 'Sixty to ninety seconds. People are standing, holding drinks and talking. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Can I roast my coworkers?', a: 'Lightly, and only about what you typed. Every line is written and judged against the workplace check: no one person singled out.' },
      { q: 'Does Shutap invent accomplishments?', a: 'No. It builds the toast from the wins you give it and never adds a number, a project or a person you didn’t type.' },
      { q: 'What does it cost?', a: COST },
    ],
  },
  {
    slug: 'new-years',
    occasion: 'new_years',
    name: 'New Year’s',
    title: 'Funny New Year’s Eve Toast That Ends at Midnight | Shutap Toasts',
    description: 'Type the year in one line. Shutap builds a 1- or 2-minute New Year’s toast around it, and the phone prompter tells you when to start so the last line lands at midnight. First toast free.',
    kicker: 'Shutap Toasts · New Year’s',
    h1: ['Type the year in one line. ', 'Get a New Year’s toast that ends at midnight.'],
    lead: 'A one- or two-minute toast built around your words, timed to the countdown.',
    roles: { friend: '[everyone]', me: '[you]' },
    hub: { group: 'Holidays', type: 'The year in one line', lengths: '1 or 2 min', shape: 'the year · the turn · glasses up at midnight' },
    built: { h2: 'How a New Year’s toast is built', intro: 'Short, because there’s a countdown coming: the year in your words, the turn, glasses up at midnight.' },
    checks: [
      { h3: 'Sync to midnight', body: 'On the night, open the prompter on your phone and tap “sync to midnight”. It counts down to the moment you should start talking, from how long your toast runs, so the last line lands as the year turns.' },
      NEVER_MADE_UP,
    ],
    faqs: [
      { q: 'How long should a New Year’s toast be?', a: 'A minute; two at most. Shutap writes to the length you pick, and the prompter works out your start time from it.' },
      { q: 'Does the prompter need Wi-Fi at the party?', a: 'Open it before the countdown: it runs on your phone from there.' },
      { q: 'Do the names leave my phone?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/funny-new-years-toast', label: 'How to give a funny New Year’s toast' },
  },
  {
    slug: 'retirement',
    occasion: 'retirement',
    name: 'Retirement',
    title: 'Funny Retirement Speech From Your Own Stories | Shutap Toasts',
    description: 'Type what they’re known for at work. Shutap builds a 2- or 3-minute retirement speech around your stories, word for word, with cue cards, a phone prompter and a keepsake to hand them. First toast free.',
    kicker: 'Shutap Toasts · Retirement',
    h1: ['Type what they’re known for at work. ', 'Get a retirement speech that does their career justice.'],
    lead: 'A 2- or 3-minute speech built around your stories, word for word.',
    roles: { friend: '[retiree]', me: '[you]' },
    hub: { group: 'Life and work', type: 'What they’re known for at work', lengths: '2 or 3 min', shape: 'career highlights · the turn · the next chapter · glasses up' },
    built: { h2: 'How a retirement speech is built', intro: 'Career highlights told through your stories, the turn, the next chapter, glasses up.' },
    checks: [
      { h3: 'A keepsake to hand them', body: 'Once you lock it you get a one-page keepsake of the speech, with room for a few words of your own and your signature, and the text to send them that night.' },
      NEVER_MADE_UP,
    ],
    faqs: [
      { q: 'How long should a retirement speech be?', a: 'Two to three minutes. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Can several of us give it?', a: 'One speaker per toast. Each person can write their own.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
  },
  {
    slug: 'birthday',
    occasion: 'birthday',
    name: 'Birthday',
    title: 'Funny Birthday Toast From Your Own Stories | Shutap Toasts',
    description: 'Type one habit only they have. Shutap builds a 2- or 3-minute birthday toast around your stories, word for word, with cue cards, a phone prompter and a keepsake. First toast free.',
    kicker: 'Shutap Toasts · Birthday',
    h1: ['Type one habit only they have. ', 'Get a birthday toast that’s all about them.'],
    lead: 'A 2- or 3-minute toast built around your stories, word for word.',
    roles: { friend: '[name]', me: '[you]' },
    hub: { group: 'Life and work', type: 'One habit only they have', lengths: '2 or 3 min', shape: 'who they are · stories · appreciation · glasses up' },
    built: { h2: 'How a birthday toast is built', intro: 'Who they are, your stories about them, why they matter, glasses up.' },
    checks: [
      { h3: 'A keepsake to hand them', body: 'Once you lock it you get a one-page keepsake of the toast, with room for a few words of your own and your signature, and the text to send them that night.' },
      NEVER_MADE_UP,
    ],
    faqs: [
      { q: 'How long should a birthday toast be?', a: 'About two minutes; three at most. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Can I roast them?', a: 'Yes. Pick roast-lite and Shutap roasts them, what happened, you and the room, using only what you typed.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
  },
  {
    slug: 'any-occasion',
    occasion: 'other',
    utility: true,
    name: 'Any occasion',
    title: 'A Funny Toast for Any Occasion, From Your Own Stories | Shutap Toasts',
    description: 'Toastmasters, a team dinner, a graduation, an anniversary: type three stories and Shutap builds the toast around them, word for word, with cue cards and a phone prompter. First toast free.',
    kicker: 'Shutap Toasts · Any occasion',
    h1: ['Type three stories. ', 'Get a toast for any occasion.'],
    lead: 'A team dinner, a graduation, an anniversary: built around your stories, word for word.',
    roles: { friend: '[name]', me: '[you]' },
    hub: { group: 'Life and work', type: 'Three stories', lengths: '1, 2 or 3 min', shape: 'open · the stories · the true thing · glasses up' },
    built: { h2: 'How a toast is built', intro: 'Open, your stories, the one true thing said plainly, glasses up.' },
    checks: [NEVER_MADE_UP],
    faqs: [
      { q: 'Can I write a Toastmasters humorous speech here?', a: 'Yes: pick Toastmasters as the occasion. It writes a 5–7 minute speech with callbacks and no glasses up.' },
      { q: 'Do the names leave my device?', a: NAMES },
      { q: 'What does it cost?', a: COST },
    ],
    guide: { href: '/guides/humorous-speech-ideas-for-toastmasters', label: 'Humorous speech ideas for Toastmasters' },
  },
]

export const OCCASION_PAGES = LANDINGS.filter((l) => !l.utility)

export const landingBySlug = (slug: string): Landing | undefined => LANDINGS.find((l) => l.slug === slug)

/** The page for an occasion (the first one that uses it), else any occasion. */
export function landingFor(o: Occasion | undefined, relation?: string): Landing {
  if (o === 'parent' && /mom|mother/i.test(relation ?? '')) return landingBySlug('mother-of-the-bride')!
  return LANDINGS.find((l) => l.occasion === o) ?? landingBySlug('any-occasion')!
}
