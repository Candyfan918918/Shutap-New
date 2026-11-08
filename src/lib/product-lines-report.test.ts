import { test } from 'node:test'
import assert from 'node:assert/strict'
import { aggregateProductLines, type PlEventRow } from './product-lines-report'

const ADMIN = 'admin-1'
const include = (uid: string) => uid !== ADMIN
const DAY = '2026-11-07'
const inDay = (iso: string) => iso.startsWith(DAY)
const ev = (name: string, who: { user_id?: string; session_id?: string }, properties: Record<string, unknown> = {}): PlEventRow => ({
  name,
  user_id: who.user_id ?? null,
  session_id: who.session_id ?? null,
  properties,
})

test('realtor kits and toasts: unique people per step, counts per row, admins left out', () => {
  const r = aggregateProductLines({
    events: [
      ev('page_view', { session_id: 'g1' }, { path: '/realtors' }),
      ev('page_view', { session_id: 'g1' }, { path: '/realtors' }), // same person twice
      ev('page_view', { user_id: 'u1' }, { path: '/toasts/thanksgiving' }),
      ev('page_view', { user_id: ADMIN }, { path: '/toasts' }),
      ev('page_view', { session_id: 'g2' }, { path: '/realtorsx' }), // not a realtors page
      ev('listing_read_started', { user_id: 'u1' }),
      ev('listing_read', { user_id: 'u1' }),
      ev('listing_read_started', { user_id: 'u2' }),
      ev('listing_read_failed', { user_id: 'u2' }),
      ev('toast_form_viewed', { session_id: 'g3' }),
      ev('toast_form_viewed', { user_id: 'u1' }),
      ev('toast_downloaded', { user_id: 'u1' }, { what: 'speech' }),
      ev('toast_downloaded', { user_id: ADMIN }, { what: 'speech' }),
    ],
    kits: [
      { user_id: 'u1', created_at: `${DAY}T10:00:00Z`, paid: true },
      { user_id: 'u1', created_at: `${DAY}T11:00:00Z`, paid: false },
      { user_id: 'u2', created_at: '2026-11-01T10:00:00Z', paid: false },
      { user_id: ADMIN, created_at: `${DAY}T12:00:00Z`, paid: false },
    ],
    kitDownloads: [
      { user_id: 'u1', created_at: `${DAY}T10:05:00Z` },
      { user_id: ADMIN, created_at: `${DAY}T10:05:00Z` },
      { user_id: 'u1', created_at: '2026-11-06T10:05:00Z' },
    ],
    toasts: [
      { user_id: 'u1', created_at: `${DAY}T09:00:00Z`, paid: false, locked_at: `${DAY}T09:30:00Z`, occasion: 'thanksgiving' },
      { user_id: 'u3', created_at: `${DAY}T09:00:00Z`, paid: true, locked_at: null, occasion: 'wedding' },
      { user_id: 'u3', created_at: '2026-11-02T09:00:00Z', paid: false, locked_at: null, occasion: 'wedding' },
      { user_id: ADMIN, created_at: `${DAY}T09:00:00Z`, paid: false, locked_at: null, occasion: 'wedding' },
    ],
    inDay,
    include,
  })
  assert.deepEqual(r.realtors, {
    visited: 1, pasted: 2, read_ok: 1, read_failed: 1,
    kits: 2, makers: 1, paid: 1, downloads: 1, total_kits: 3, total_makers: 2,
  })
  assert.equal(r.toasts.visited, 1)
  assert.equal(r.toasts.form_opened, 2)
  assert.equal(r.toasts.written, 2)
  assert.equal(r.toasts.writers, 2)
  assert.equal(r.toasts.locked, 1)
  assert.equal(r.toasts.paid, 1)
  assert.equal(r.toasts.downloads, 1)
  assert.equal(r.toasts.total, 3)
  assert.equal(r.toasts.total_writers, 2)
  assert.deepEqual(r.toasts.occasions, [['thanksgiving', 1], ['wedding', 1]])
})
