// Shutap Toasts landing pages (Nov 6 2026): one per occasion, each opening
// the form already set to it. Copy rules: no "generator", never "writes your
// jokes for you" (Shutap builds the toast around the person's own stories),
// none of the banned wellness words, no invented numbers or testimonials.
import type { Occasion } from './shared'

export type Landing = {
  slug: string
  occasion: Occasion
  /** the <title> and the description for search */
  title: string
  description: string
  kicker: string
  /** the H1, with the funny part set apart */
  h1: [string, string]
  lead: string
  sections: { h2: string; body: string[]; list?: string[] }[]
  faqs: { q: string; a: string }[]
  guide?: { href: string; label: string }
}

export const LANDINGS: Landing[] = [
  {
    slug: 'thanksgiving',
    occasion: 'thanksgiving',
    title: 'Funny Thanksgiving Toast, From Your Own Family Story | Shutap Toasts',
    description: 'Type the one story the whole table knows. Shutap builds a 60-second or 2-minute Thanksgiving toast around it, with pause marks, cue cards and a phone prompter.',
    kicker: 'shutap toasts · Thanksgiving',
    h1: ['Your Thanksgiving toast, ', 'funnier.'],
    lead: 'One story the whole table knows, in your words. Shutap builds the toast around it: a greeting, the story, the thanks, glasses up. A minute or two, before the food gets cold.',
    sections: [
      {
        h2: 'How a Thanksgiving toast is built',
        body: ['A good Thanksgiving toast is short and shared. Shutap follows the shape people actually remember: greet the table, tell one story everybody can follow, say what you’re grateful for, raise a glass. Your story goes in word for word; Shutap writes the lines around it and only changes a line when you tap it.'],
        list: ['greeting: who you are and why you’re standing', 'one shared story, in your words', 'gratitude: the line that isn’t a joke', 'glasses up'],
      },
      {
        h2: 'The half-the-table check',
        body: ['Inside jokes kill a family toast: half the table laughs, the other half asks what happened. Shutap flags any line only part of the room will get, so you can swap it before Thursday.'],
      },
      {
        h2: 'What you take to the table',
        body: ['Once you lock it: the speech as a PDF with the pauses marked, cue cards to hold under the table, a phone prompter that works without Wi-Fi, and a 60-second version for when the turkey is already on the table. Your first toast is free.'],
      },
    ],
    faqs: [
      { q: 'How long should a Thanksgiving toast be?', a: 'About a minute, two at most. Shutap writes to the length you pick (60 seconds or 2 minutes) and shows a running clock, counted at a relaxed 140 words a minute with the pauses.' },
      { q: 'Does Shutap make up stories about my family?', a: 'No. Your story goes in word for word. Shutap writes only the lines around it: the opener, a tag after the story, the thanks, the toast. It never invents a story, a fact or a person.' },
      { q: 'Do the names leave my phone?', a: 'No. Names stay on your device. Shutap only ever sees placeholders and your browser puts the names back on screen, in the prompter and in the PDFs.' },
      { q: 'What does it cost?', a: 'Your first toast is free (each page ends “— shutap.com”). After that a toast is $12.99 one time, Basic includes one a month, and Pro is unlimited. Downloads are never limited.' },
    ],
    guide: { href: '/guides/funny-thanksgiving-toast', label: 'How to give a funny Thanksgiving toast' },
  },
  {
    slug: 'office-holiday-party',
    occasion: 'holiday_party',
    title: 'Funny Office Holiday Party Toast That Is Safe for Work | Shutap Toasts',
    description: 'Type the year’s big win. Shutap builds a 60- or 90-second holiday party toast around it: shout-outs, one light laugh, thanks and glasses up, with a workplace check on every line.',
    kicker: 'shutap toasts · holiday party',
    h1: ['Your holiday party toast, ', 'funnier.'],
    lead: 'The year’s wins, one light laugh, the thanks, glasses up. Sixty or ninety seconds, written around what your team actually did, and checked so nobody in the room winces.',
    sections: [
      {
        h2: 'The shape of a team toast',
        body: ['A holiday party toast is a thank-you with one laugh in it. Shutap builds it from the win you type: shout-outs to the team and the work, one light line, the thanks, the toast. Your win goes in word for word.'],
        list: ['the year’s wins: shout-outs to teams and work', 'one light laugh', 'thanks', 'glasses up'],
      },
      {
        h2: 'The workplace check',
        body: ['Every line Shutap writes is checked before you see it: no one person singled out or embarrassed, and nothing about drinking, bonuses, layoffs, HR or pay. Those words are on the never-say list by default; drop any of them if your room is different.'],
      },
      {
        h2: 'What you take to the party',
        body: ['The speech as a PDF, cue cards, the phone prompter (works without the venue’s Wi-Fi), a rehearse timer, and the message to send the team after. Edit any line until you lock it; after that, download as often as you like.'],
      },
    ],
    faqs: [
      { q: 'How long should a holiday party toast be?', a: 'Sixty to ninety seconds. People are standing, holding drinks and talking. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Can I roast my coworkers?', a: 'Lightly, and only about what you typed. The workplace check rejects any line that singles out one person or touches drinking, bonuses, layoffs, HR or pay.' },
      { q: 'Does Shutap invent accomplishments?', a: 'No. It builds the toast from the win you give it and never adds a number, a project or a person you didn’t type.' },
      { q: 'What does it cost?', a: 'Your first toast is free (each page ends “— shutap.com”). After that $12.99 a toast, one included each month on Basic, unlimited on Pro.' },
    ],
  },
  {
    slug: 'new-years',
    occasion: 'new_years',
    title: 'Funny New Year’s Eve Toast That Ends at Midnight | Shutap Toasts',
    description: 'The year in one line, the turn, glasses up at midnight. A 30- or 60-second New Year’s toast from your own words, with a prompter that tells you when to start so the last line lands at 12:00.',
    kicker: 'shutap toasts · New Year’s',
    h1: ['Your New Year’s toast, ', 'on the stroke of midnight.'],
    lead: 'The year in one line, the turn, glasses up. Thirty or sixty seconds, in your words, and a prompter that tells you exactly when to start so the last word lands at 12:00.',
    sections: [
      {
        h2: 'Sync to midnight',
        body: ['On the night, open the prompter on your phone and tap “sync to midnight”. It counts down to the moment you should start talking, based on how long your toast runs, so the toast line lands as the year turns.'],
      },
      {
        h2: 'The shape of a New Year’s toast',
        body: ['Short, because there’s a countdown coming. Shutap builds it from the one line you type about the year: that line, the turn, the toast. Your line stays word for word.'],
        list: ['the year in one line, in your words', 'the turn', 'glasses up at midnight'],
      },
    ],
    faqs: [
      { q: 'How long should a New Year’s toast be?', a: 'Thirty to sixty seconds. Shutap writes to the length you pick, and the prompter works out your start time from it.' },
      { q: 'Does the prompter need Wi-Fi at the party?', a: 'Only to open it. Once it’s open on your phone it runs without a connection.' },
      { q: 'What does it cost?', a: 'Your first toast is free (each page ends “— shutap.com”). After that $12.99 a toast, one a month on Basic, unlimited on Pro. Downloads are never limited.' },
    ],
  },
  {
    slug: 'best-man',
    occasion: 'best_man',
    title: 'Funny Best Man Speech Built From Your Own Stories | Shutap Toasts',
    description: 'Type three stories about the groom in your words. Shutap builds a 2-, 3- or 5-minute best man speech around them, keeps your lines word for word, and checks every line for the grandma in the room.',
    kicker: 'shutap toasts · best man',
    h1: ['Your best man speech, ', 'funnier.'],
    lead: 'Three stories only you can tell, in your words. Shutap builds the speech around them: the opening laugh, his stories, the turn, the true thing, the line to his partner, glasses up.',
    sections: [
      {
        h2: 'Your stories stay yours',
        body: ['You type the stories the way you’d tell them at the bar and lock them. They go into the speech word for word. Shutap writes the lines around them, and nothing changes until you tap a line and pick one of three ways to say it, with “keep it as it is” first. Leave the third story empty and Shutap writes a bridge from the other two. It never makes one up.'],
      },
      {
        h2: 'The shape of a best man speech',
        body: ['The speech follows the shape that works at a reception, and you end on the one true thing you wrote, said plainly.'],
        list: ['the opening laugh: who you are and why you’re holding the mic', 'his stories, each with a tag that lands', 'the turn', 'the one true thing, word for word', 'to his partner', 'glasses up'],
      },
      {
        h2: 'Grandma’s in the room',
        body: ['Every line Shutap writes is checked before you see it: no exes, no honeymoon, no bachelor party, no drinking stories, nothing a grandparent or a ten-year-old would wince at. Those are on the never-say list by default; tap × to drop one if you know your room.'],
      },
      {
        h2: 'On the day',
        body: ['Lock it and you get the speech as a PDF with pauses and “wait for the laugh” marked, cue cards (one story a card), a phone prompter with “skip to the toast” for when the DJ waves at you, a 60-second version, a rehearse timer, a one-page keepsake for the couple and the text to send them that night.'],
      },
    ],
    faqs: [
      { q: 'How long should a best man speech be?', a: 'Three minutes is the sweet spot; two if the schedule is tight, five at most. Shutap writes to the length you pick and shows a running clock at a relaxed 140 words a minute, pauses counted.' },
      { q: 'Will it sound like me?', a: 'Your stories go in word for word, and you can edit any line or tap funnier on it until you lock. Nothing changes unless you pick it.' },
      { q: 'Can I roast the groom?', a: 'Yes: pick roast-lite and Shutap roasts him, the stories, you and the room, using only what you typed. The wedding checks still apply.' },
      { q: 'Do the names leave my device?', a: 'No. Shutap only sees placeholders; your browser puts the names back on screen, in the prompter and in the PDFs.' },
      { q: 'What does it cost?', a: 'Your first toast is free (each page ends “— shutap.com”). After that $12.99 one time, one a month on Basic, unlimited on Pro. Downloads are never limited.' },
    ],
    guide: { href: '/guides/funny-best-man-speech', label: 'How to write a funny best man speech' },
  },
  {
    slug: 'maid-of-honor',
    occasion: 'maid_of_honor',
    title: 'Funny Maid of Honor Speech From Your Own Stories | Shutap Toasts',
    description: 'Type the friendship stories only you know. Shutap builds a 2-, 3- or 5-minute maid of honor speech around them in your words, with cue cards, a phone prompter and a keepsake for the couple.',
    kicker: 'shutap toasts · maid of honor',
    h1: ['Your maid of honor speech, ', 'funnier.'],
    lead: 'The friendship stories only you know, in your words. Shutap builds the speech around them: the story, her qualities, the turn, your wishes, glasses up.',
    sections: [
      {
        h2: 'Built around your friendship',
        body: ['Type the stories the way you’d tell them to a friend, and lock them: they go in word for word. Shutap writes the lines around them and offers three ways to say any line you tap, your version first. An empty story gets a bridge from the others, never an invented one.'],
        list: ['a friendship story', 'her qualities, shown not listed', 'the turn', 'your wishes for them', 'glasses up'],
      },
      {
        h2: 'Checked for the whole room',
        body: ['No exes, no honeymoon, no bachelorette party, no drinking stories, nothing her grandmother would wince at. Those are the default never-say list; drop any you don’t need.'],
      },
      {
        h2: 'What you take to the reception',
        body: ['The speech PDF with pauses marked, cue cards, a phone prompter that works without Wi-Fi, a 60-second version, a rehearse timer, a one-page keepsake to give the couple, and the text to send them that night.'],
      },
    ],
    faqs: [
      { q: 'How long should a maid of honor speech be?', a: 'Two to three minutes; five at most. Shutap writes to the length you pick and shows the clock as you edit.' },
      { q: 'Does Shutap write the speech for me?', a: 'It builds the speech around your stories. Your lines stay word for word, you edit anything you like, and nothing changes unless you tap it and pick.' },
      { q: 'Can I make it heartfelt instead of funny?', a: 'Yes. Pick heartfelt: one light laugh from your stories, then mostly the true thing you wrote.' },
      { q: 'What does it cost?', a: 'Your first toast is free (each page ends “— shutap.com”). After that $12.99 one time, one a month on Basic, unlimited on Pro.' },
    ],
    guide: { href: '/guides/funny-maid-of-honor-speech', label: 'How to write a funny maid of honor speech' },
  },
]

export const landingBySlug = (slug: string): Landing | undefined => LANDINGS.find((l) => l.slug === slug)
