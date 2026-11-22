import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SB_ABOUT, SB_DESCRIPTION, SB_FAQ, SB_GET, SB_SOURCES, SB_STEPS, SB_TITLE, SB_VIEWS, SB_VIEWS_INTRO } from './page-copy'

const all = [SB_TITLE, SB_DESCRIPTION, SB_VIEWS_INTRO, ...SB_ABOUT, ...SB_GET, ...SB_STEPS.flatMap((s) => [s.title, s.body]), ...SB_VIEWS.flatMap((v) => [v.title, v.says, v.so]), ...SB_FAQ.flatMap((x) => [x.q, x.a])].join('\n')

test('no word the site never uses', () => {
  for (const w of ['generator', 'joke card', 'anonymous', 'safe space', 'community', 'therapy', 'support', 'positive', 'silver lining', 'reframe', 'resilience', 'mindset', 'the stream', 'writes your', 'writes it for you'])
    assert.ok(!all.toLowerCase().includes(w), `"${w}" is in the small-business page copy`)
  assert.ok(!/\bshops?\b/i.test(all.replace(/coffee shops|barber shops|car shops/gi, '')), 'owner-facing copy says business, not shop')
})

test('nothing is promised, and nothing that is not built is mentioned', () => {
  for (const w of ['guarantee', 'go viral', 'will get more views', 'more customers', 'more sales', 'send to tiktok', 'sends it to tiktok', 'pro plan'])
    assert.ok(!all.toLowerCase().includes(w), `"${w}" is in the small-business page copy`)
  assert.match(all, /No tool can promise views/)
})

test('what the platforms do is said only with their own pages listed', () => {
  assert.ok(SB_SOURCES.some((s) => s.href.includes('newsroom.tiktok.com')))
  assert.ok(SB_SOURCES.some((s) => s.href.includes('about.instagram.com')))
  for (const v of SB_VIEWS) assert.match(v.says, /TikTok|Instagram/)
})

test('search title and description fit', () => {
  assert.ok(SB_TITLE.length <= 70, String(SB_TITLE.length))
  assert.ok(SB_DESCRIPTION.length <= 190, String(SB_DESCRIPTION.length))
})
