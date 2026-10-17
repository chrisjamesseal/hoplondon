import { describe, expect, it } from 'vitest'
import { bumpStreak, courseProgress, HEART_REGEN_MS, isUnlocked, levelInfo, liveStreak, regenHearts, sameAnswer } from './gamify'
import { DEMO_COURSE } from '../demo'

describe('streaks', () => {
  it('starts at 1 on first lesson', () => {
    expect(bumpStreak(0, null, '2026-10-17')).toBe(1)
  })
  it('does not grow twice in one day', () => {
    expect(bumpStreak(4, '2026-10-17', '2026-10-17')).toBe(4)
  })
  it('grows on consecutive days, across month ends', () => {
    expect(bumpStreak(4, '2026-10-31', '2026-11-01')).toBe(5)
  })
  it('resets after a missed day', () => {
    expect(bumpStreak(9, '2026-10-15', '2026-10-17')).toBe(1)
  })
  it('shows as live until the day after', () => {
    expect(liveStreak(3, '2026-10-16', '2026-10-17')).toBe(3)
    expect(liveStreak(3, '2026-10-15', '2026-10-17')).toBe(0)
  })
})

describe('hearts', () => {
  it('regenerates one per interval, capped', () => {
    const t0 = 1_000_000
    expect(regenHearts(2, t0, t0 + HEART_REGEN_MS * 1.5)).toEqual({ hearts: 3, updatedAt: t0 + HEART_REGEN_MS })
    expect(regenHearts(4, t0, t0 + HEART_REGEN_MS * 10).hearts).toBe(5)
  })
})

describe('levels', () => {
  it('needs 50 then 75 XP', () => {
    expect(levelInfo(0)).toEqual({ level: 1, into: 0, needed: 50 })
    expect(levelInfo(60)).toEqual({ level: 2, into: 10, needed: 75 })
    expect(levelInfo(125).level).toBe(3)
  })
})

describe('course unlocking', () => {
  it('opens lessons in order', () => {
    const [a, b] = DEMO_COURSE.units[0].lessons
    expect(isUnlocked(DEMO_COURSE, a.id, {})).toBe(true)
    expect(isUnlocked(DEMO_COURSE, b.id, {})).toBe(false)
    const p = { [a.id]: { completions: 1, bestAccuracy: 1, lastCompleted: '2026-10-17' } }
    expect(isUnlocked(DEMO_COURSE, b.id, p)).toBe(true)
    expect(courseProgress(DEMO_COURSE, p).done).toBe(1)
  })
})

describe('sameAnswer', () => {
  it('ignores case and punctuation', () => {
    expect(sameAnswer('Photosynthesis!', ' photosynthesis')).toBe(true)
    expect(sameAnswer('cat', 'cats')).toBe(false)
  })
})
