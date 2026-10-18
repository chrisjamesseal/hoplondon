import { describe, expect, it } from 'vitest'
import { ACHIEVEMENTS, achievementState, achievementStats } from './achievements'
import { DEMO_COURSE } from '../demo'

describe('achievements', () => {
  const base = { progress: {}, courses: [DEMO_COURSE], xp: 0, streak: 0, lastActiveDay: null }

  it('starts at level 0 with the first target next', () => {
    const st = achievementState(ACHIEVEMENTS[0], achievementStats(base))
    expect(st.level).toBe(0)
    expect(st.next).toBe(1)
  })

  it('moves up levels as the stat grows and ends with no next target', () => {
    const a = ACHIEVEMENTS.find((x) => x.id === 'xp')!
    expect(achievementState(a, { ...achievementStats(base), xp: 1200 })).toMatchObject({ level: 2, next: 2500 })
    expect(achievementState(a, { ...achievementStats(base), xp: 99999 })).toMatchObject({ level: a.tiers.length, next: null })
  })

  it('keeps streak levels after a streak breaks', () => {
    expect(achievementStats({ ...base, streak: 0, bestStreak: 8 }).streak).toBe(8)
  })

  it('counts quizzes apart from lessons and ignores skipped steps', () => {
    const p = (extra = {}) => ({ completions: 1, bestAccuracy: 1, lastCompleted: '2026-10-18', ...extra })
    const stats = achievementStats({ ...base, progress: { l1: p(), 'quiz:u1': p(), l2: p({ skipped: true }) } })
    expect(stats.lessons).toBe(1)
    expect(stats.quizzes).toBe(1)
    expect(stats.crowns).toBe(2)
  })

  it('describes each level without long dashes', () => {
    for (const a of ACHIEVEMENTS) for (const t of a.tiers) expect(a.describe(t)).not.toMatch(/[—–]/)
  })
})
