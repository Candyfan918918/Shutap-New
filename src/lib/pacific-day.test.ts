import { test } from 'node:test'
import assert from 'node:assert/strict'
import { nextPacificMidnight, pacificDay, pacificMidnight, shiftDay } from './pacific-day'

test('a normal day: PDT midnight is 07:00 UTC', () => {
  assert.equal(new Date(pacificMidnight('2026-10-22')).toISOString(), '2026-10-22T07:00:00.000Z')
  assert.equal(pacificDay(Date.parse('2026-10-22T06:59:59Z')), '2026-10-21')
  assert.equal(pacificDay(Date.parse('2026-10-22T07:00:00Z')), '2026-10-22')
})

test('winter: PST midnight is 08:00 UTC', () => {
  assert.equal(new Date(pacificMidnight('2026-12-15')).toISOString(), '2026-12-15T08:00:00.000Z')
})

test('fall back, Nov 1 2026: the day is 25 hours long', () => {
  const start = pacificMidnight('2026-11-01')
  const end = pacificMidnight('2026-11-02')
  assert.equal(new Date(start).toISOString(), '2026-11-01T07:00:00.000Z')
  assert.equal(new Date(end).toISOString(), '2026-11-02T08:00:00.000Z')
  assert.equal((end - start) / 3600000, 25)
  assert.equal(pacificDay(Date.parse('2026-11-02T07:59:59Z')), '2026-11-01')
  assert.equal(pacificDay(Date.parse('2026-11-02T08:00:00Z')), '2026-11-02')
})

test('spring forward, Mar 14 2027: the day is 23 hours long', () => {
  const start = pacificMidnight('2027-03-14')
  const end = pacificMidnight('2027-03-15')
  assert.equal(new Date(start).toISOString(), '2027-03-14T08:00:00.000Z')
  assert.equal(new Date(end).toISOString(), '2027-03-15T07:00:00.000Z')
  assert.equal((end - start) / 3600000, 23)
})

test('next reset is the coming Pacific midnight', () => {
  assert.equal(nextPacificMidnight(Date.parse('2026-10-22T17:50:00Z')), '2026-10-23T07:00:00.000Z')
  assert.equal(nextPacificMidnight(Date.parse('2026-10-23T06:59:59Z')), '2026-10-23T07:00:00.000Z')
  assert.equal(nextPacificMidnight(Date.parse('2026-10-23T07:00:00Z')), '2026-10-24T07:00:00.000Z')
  assert.equal(nextPacificMidnight(Date.parse('2026-11-01T20:00:00Z')), '2026-11-02T08:00:00.000Z')
})

test('shiftDay crosses months and years', () => {
  assert.equal(shiftDay('2026-12-31', 1), '2027-01-01')
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28')
})
