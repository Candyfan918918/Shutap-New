import { test } from 'node:test'
import assert from 'node:assert/strict'
import { MENTIONS_FROM_DAY, aiTells, usablePreview, isRepeat, looksComplete, mayMention, overlap, parseThreadUrl, pickDrafts, shutapLink } from './rules'

test('thread links reduce to one canonical URL; other Reddit pages are not threads', () => {
  assert.deepEqual(parseThreadUrl('https://old.reddit.com/r/Standup/comments/1AbC9x/my_first_open_mic/?utm=x'), {
    url: 'https://www.reddit.com/r/standup/comments/1abc9x/',
    subreddit: 'standup',
    id: '1abc9x',
  })
  assert.equal(parseThreadUrl('https://www.reddit.com/r/Standup/'), null)
  assert.equal(parseThreadUrl('https://www.reddit.com/user/someone/comments/abc123/x/'), null)
  assert.equal(parseThreadUrl('https://notreddit.com/r/a/comments/abc123/'), null)
  assert.equal(parseThreadUrl('not a url'), null)
})

test('the Shutap link is full shutap.com with UTM tags, toasts to /toasts', () => {
  assert.equal(
    shutapLink('toast', 'WeddingPlanning'),
    'https://shutap.com/toasts?utm_source=reddit&utm_medium=comment&utm_campaign=toast&utm_content=weddingplanning',
  )
  assert.match(shutapLink('humor', 'standup'), /^https:\/\/shutap\.com\/bits\?utm_source=reddit&.*utm_campaign=humor/)
})

const open = { day: '2026-12-10', linksAllowed: 'yes' as const, postedTotal: 9, postedWithMention: 0, mentionsAlreadyDraftedToday: 0 }

test('mentions: allowed only after warm-up, where links are allowed, under 1 in 10, once a day', () => {
  assert.equal(mayMention(open).ok, true)
  assert.equal(mayMention({ ...open, day: '2026-11-20' }).ok, false)
  assert.equal(mayMention({ ...open, day: MENTIONS_FROM_DAY }).ok, true)
  assert.equal(mayMention({ ...open, linksAllowed: 'unknown' }).ok, false)
  assert.equal(mayMention({ ...open, linksAllowed: 'no' }).ok, false)
  assert.equal(mayMention({ ...open, mentionsAlreadyDraftedToday: 1 }).ok, false)
  // 8 plain replies posted: a mention now would be 1 in 9.
  assert.equal(mayMention({ ...open, postedTotal: 8 }).ok, false)
  // 1 mention in 19 posted: a second would be 2 in 20, exactly 1 in 10.
  assert.equal(mayMention({ ...open, postedTotal: 19, postedWithMention: 1 }).ok, true)
  assert.equal(mayMention({ ...open, postedTotal: 18, postedWithMention: 1 }).ok, false)
})

test('picking drafts: best first, score 5+, one per subreddit, none where already replied today, capped', () => {
  const leads = [
    { id: 'a', subreddit: 'standup', score: 9 },
    { id: 'b', subreddit: 'standup', score: 8 },
    { id: 'c', subreddit: 'jokes', score: 4 },
    { id: 'd', subreddit: 'weddingplanning', score: 10 },
    { id: 'e', subreddit: 'socialskills', score: 7 },
    { id: 'f', subreddit: 'bestman', score: 8 },
  ]
  const { picked, dropped } = pickDrafts(leads, 2, new Set(['socialskills']))
  assert.deepEqual(picked.map((l) => l.id), ['d', 'a'])
  const why = Object.fromEntries(dropped.map((d) => [d.lead.id, d.reason]))
  assert.equal(why.b, 'one draft per subreddit a day')
  assert.equal(why.c, 'score 4')
  assert.equal(why.e, 'already replied in this subreddit today')
  assert.equal(why.f, 'daily draft cap')
})

test('repeat check catches near-copies, not different replies', () => {
  const a = 'congrats on the first open mic. open with the thing everyone can see, like your height or your shirt, then go to the story.'
  const b = 'Congrats on the first open mic! Open with the thing everyone can see, like your height or your shirt, then go to the story'
  const c = 'for a best man speech keep it under four minutes and end on the couple, not on a joke about the bachelor party.'
  assert.ok(overlap(a, b) > 0.8)
  assert.equal(isRepeat(b, [a]), true)
  assert.equal(isRepeat(c, [a]), false)
  assert.equal(isRepeat('short', []), false)
})

test('cut-off drafts are caught; finished ones pass', () => {
  const body = 'you can actually lean right into that rule as an opening joke, then go straight to the story about the canoe trip and land on the couple.'
  assert.equal(looksComplete(body), true)
  assert.equal(looksComplete(body + ' "google told me the number one rule of a best man speech'), false)
  assert.equal(looksComplete('the trick to fast reaction time is actually leaning into the slow one so it looks intentional. if you freeze after a compliment or'), false)
  assert.equal(looksComplete(body + ' Full disclosure, I made this: https://shutap.com/toasts?utm_source=reddit'), true)
  assert.equal(looksComplete('too short.'), false)
})

test('AI tells: the Nov 18 drafts are caught, a plain comment passes', () => {
  const bad = 'lean into the scale—the funniest angle is prestige-tv seriousness.\n\ncraft tip: don\'t hide it; the dissonance gets the laugh.'
  assert.ok(aiTells(bad).includes('dash'))
  assert.ok(aiTells(bad).includes('lean into'))
  assert.ok(aiTells(bad).includes('tip label'))
  const quotes = 'Try these.\n"one"\n"two"\n"three"'
  assert.ok(aiTells(quotes).includes('list of quoted lines'))
  const good = 'Ask a mid-size YouTuber in your niche, not a big one. They answer DMs and a fake SNL is an easy yes for them. For a sketch, do a cold open where your one mod reads the news.'
  assert.deepEqual(aiTells(good), [])
})

test('preview check: a post excerpt passes, a subreddit blurb does not', () => {
  assert.ok(usablePreview('I make short explainers about the business behind tech and games. My latest looks at a GTA VI researcher role'))
  assert.ok(!usablePreview('252K subscribers in the Standup community. For standup comics, Is this a funny or unnecessary remark?'))
  assert.ok(!usablePreview('short'))
})
