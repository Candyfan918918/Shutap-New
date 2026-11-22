import { test } from 'node:test'
import assert from 'node:assert/strict'
import { funnel, tally, type FunnelEvent } from './funnel'

const e = (who: string, name: string, properties: Record<string, unknown> = {}): FunnelEvent => ({ who, name, properties })

test('each step counts distinct people, with the share of the first and the previous step', () => {
  const rows = funnel([e('a', 'sb_step'), e('a', 'sb_step'), e('b', 'sb_step'), e('c', 'sb_step'), e('d', 'sb_step'), e('a', 'sb_lookup'), e('b', 'shop_lookup'), e('a', 'shop_saved'), e('a', 'sb_camera', { ok: false }), e('a', 'sb_shot', { n: 2 })])
  const by = Object.fromEntries(rows.map((r) => [r.key, r]))
  assert.equal(by['opened']!.people, 4)
  assert.equal(by['lookup']!.people, 2)
  assert.equal(by['lookup']!.ofFirst, 50)
  assert.equal(by['saved']!.ofPrevious, 50)
  assert.equal(by['camera']!.people, 0) // a camera that did not turn on is not a step taken
  assert.equal(by['filmed']!.people, 0) // two shots are not three
  assert.equal(by['made']!.ofPrevious, null) // nothing to divide by
})

test('problems are counted by kind, most common first', () => {
  assert.deepEqual(tally([e('a', 'shop_film_problem', { what: 'camera_blocked' }), e('b', 'shop_film_problem', { what: 'camera_blocked' }), e('a', 'shop_film_problem', { what: 'compose_failed' }), e('a', 'other')], 'shop_film_problem', 'what'), [{ what: 'camera_blocked', n: 2 }, { what: 'compose_failed', n: 1 }])
})
