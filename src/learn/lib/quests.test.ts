import { describe, expect, it } from 'vitest'
import { questProgress, questsFor } from './quests'
import { applyFreeze } from './freeze'

describe('quests', () => {
  it('gives three different quests every day, always starting with a lesson', () => {
    for (let d = 1; d <= 40; d++) {
      const qs = questsFor(`2026-11-${String((d % 28) + 1).padStart(2, '0')}`)
      expect(qs).toHaveLength(3)
      expect(qs[0].id).toBe('lesson')
      expect(new Set(qs.map((q) => q.id)).size).toBe(3)
    }
  })
  it('is the same all day and changes over days', () => {
    expect(questsFor('2026-11-04')).toEqual(questsFor('2026-11-04'))
    expect(JSON.stringify(questsFor('2026-11-04'))).not.toBe(JSON.stringify(questsFor('2026-11-05')))
  })
  it('caps progress at the target and ignores yesterday', () => {
    const base = { day: '2026-11-04', lessons: 3, xp: 80, reviewDay: '2026-11-03', daily: { day: '2026-11-03', combo: 9, perfect: 2 } }
    const q = (id: string) => ({ id, target: 5 }) as Parameters<typeof questProgress>[0]
    expect(questProgress({ ...q('lesson'), target: 1 } as never, base)).toBe(1)
    expect(questProgress(q('xp') as never, base)).toBe(5)
    expect(questProgress(q('combo') as never, base)).toBe(0)
    expect(questProgress(q('review') as never, base)).toBe(0)
  })
})

describe('applyFreeze', () => {
  it('covers exactly one missed day', () => {
    expect(applyFreeze('2026-11-02', 1, '2026-11-04')).toEqual({ last: '2026-11-03', freezes: 0, used: true })
  })
  it('does nothing without a freeze, with no gap, or for longer gaps', () => {
    expect(applyFreeze('2026-11-02', 0, '2026-11-04').used).toBe(false)
    expect(applyFreeze('2026-11-03', 1, '2026-11-04').used).toBe(false)
    expect(applyFreeze('2026-10-30', 2, '2026-11-04').used).toBe(false)
    expect(applyFreeze(null, 2, '2026-11-04').used).toBe(false)
  })
})
