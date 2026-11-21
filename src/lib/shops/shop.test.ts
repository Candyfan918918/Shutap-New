import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cameraTip, codeWordLine, defaultFacing, deleteDay, deleteLabel, lineCount, weekStart, weekStatus } from './shop'

test('"Me" opens on the front camera; team and no-faces on the back', () => {
  assert.equal(defaultFacing('me'), 'front')
  assert.equal(defaultFacing('team'), 'back')
  assert.equal(defaultFacing('faceless'), 'back')
})
test('the filming tip names the camera and follows who is on it', () => {
  assert.equal(cameraTip('me', 'front'), 'Front camera. Prop your phone up. You play every part.')
  assert.equal(cameraTip('team', 'back'), 'Back camera. One of you films, the rest act.')
  assert.equal(cameraTip('faceless', 'back'), 'Back camera. Hands and products only. No faces.')
  assert.match(cameraTip('faceless', 'front'), /^Front camera\. Flip back/)
})
test('the code word line: none when the owner chose no code word', () => {
  assert.equal(codeWordLine('none', 'new password', 'a free cookie'), null)
  assert.equal(codeWordLine('freebie', '  ', 'a free cookie'), null)
})
test('the code word line carries what the owner typed, once, with one full stop', () => {
  assert.equal(codeWordLine('freebie', 'new password', 'a free cookie'), 'Say “new password” when you come in for a free cookie.')
  assert.equal(codeWordLine('promotion', 'last pie', '10% off any pastry.'), 'Say “last pie” when you come in for 10% off any pastry.')
  assert.equal(codeWordLine('freebie', 'new password', ''), 'Say “new password” when you come in.')
})
test('four lines to approve without a code word, five with one', () => {
  assert.equal(lineCount('none'), 4)
  assert.equal(lineCount('freebie'), 5)
  assert.equal(lineCount('promotion'), 5)
})
test('the week: 3 is the goal, 5 is the badge', () => {
  assert.deepEqual(weekStatus(0), { posted: 0, goalMet: false, badge: false, toGoal: 3, toBadge: 5 })
  assert.deepEqual(weekStatus(3), { posted: 3, goalMet: true, badge: false, toGoal: 0, toBadge: 2 })
  assert.deepEqual(weekStatus(5), { posted: 5, goalMet: true, badge: true, toGoal: 0, toBadge: 0 })
  assert.equal(weekStatus(7).badge, true)
  assert.equal(weekStatus(-2).posted, 0)
})
test('a new week starts Monday', () => {
  assert.equal(weekStart('2026-11-21'), '2026-11-16') // Saturday
  assert.equal(weekStart('2026-11-16'), '2026-11-16') // Monday
  assert.equal(weekStart('2026-11-22'), '2026-11-16') // Sunday
  assert.equal(weekStart('2026-11-23'), '2026-11-23')
  assert.equal(weekStart('2027-01-01'), '2026-12-28') // across the year
})
test('videos are kept 30 days', () => {
  assert.equal(deleteDay('2026-11-21'), '2026-12-21')
  assert.equal(deleteDay('2026-12-15'), '2027-01-14')
})
test('My creations says when each video goes', () => {
  assert.deepEqual(deleteLabel('2026-11-21', '2026-11-21'), { text: 'Deletes Dec 21', soon: false })
  assert.deepEqual(deleteLabel('2026-10-23', '2026-11-21'), { text: 'Deletes tomorrow', soon: true })
  assert.deepEqual(deleteLabel('2026-10-22', '2026-11-21'), { text: 'Deletes today', soon: true })
  assert.deepEqual(deleteLabel('2026-10-01', '2026-11-21'), { text: 'Deletes today', soon: true })
})
