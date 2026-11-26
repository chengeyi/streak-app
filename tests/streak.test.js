import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyCheckin, streakStatus, diffDays } from '../src/utils/streak.js'

const base = { currentStreak: 5, longestStreak: 9, lastCheckinDate: '2026-11-24', freezeCards: 0 }

test('首次打卡連勝為 1', () => {
  const r = applyCheckin({}, '2026-11-25')
  assert.equal(r.currentStreak, 1)
  assert.equal(r.longestStreak, 1)
})

test('連續隔天打卡 +1', () => {
  const r = applyCheckin(base, '2026-11-25')
  assert.equal(r.currentStreak, 6)
  assert.equal(r.longestStreak, 9)
})

test('同一天重複打卡不變', () => {
  const r = applyCheckin({ ...base, lastCheckinDate: '2026-11-25' }, '2026-11-25')
  assert.equal(r.alreadyCheckedIn, true)
  assert.equal(r.currentStreak, 5)
})

test('漏一天且沒卡 → 歸 1', () => {
  const r = applyCheckin({ ...base, lastCheckinDate: '2026-11-23' }, '2026-11-25')
  assert.equal(r.currentStreak, 1)
})

test('漏一天且有保護卡 → 接上並扣一張', () => {
  const r = applyCheckin({ ...base, lastCheckinDate: '2026-11-23', freezeCards: 2 }, '2026-11-25')
  assert.equal(r.currentStreak, 6)
  assert.equal(r.freezeCards, 1)
  assert.equal(r.usedFreeze, true)
})

test('漏兩天以上即使有卡也歸 1', () => {
  const r = applyCheckin({ ...base, lastCheckinDate: '2026-11-22', freezeCards: 3 }, '2026-11-25')
  assert.equal(r.currentStreak, 1)
  assert.equal(r.freezeCards, 3)
})

test('打破最長紀錄會更新', () => {
  const r = applyCheckin({ ...base, currentStreak: 9 }, '2026-11-25')
  assert.equal(r.longestStreak, 10)
})

test('跨月、跨年日期差正確', () => {
  assert.equal(diffDays('2026-12-31', '2027-01-01'), 1)
  assert.equal(diffDays('2026-02-28', '2026-03-01'), 1)
})

test('streakStatus', () => {
  assert.equal(streakStatus('2026-11-25', '2026-11-25'), 'safe')
  assert.equal(streakStatus('2026-11-24', '2026-11-25'), 'at_risk')
  assert.equal(streakStatus('2026-11-22', '2026-11-25'), 'broken')
  assert.equal(streakStatus(null, '2026-11-25'), 'broken')
})
