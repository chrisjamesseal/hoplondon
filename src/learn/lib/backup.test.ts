import { describe, expect, it } from 'vitest'
import { mergeBackup } from './backup'
import type { Course } from '../types'

const course = (id: string, units = 1): Course => ({
  id, title: id, emoji: '📘', summary: '', source: { kind: 'topic', label: id }, generator: 'claude', createdAt: '',
  units: Array.from({ length: units }, (_, i) => ({ id: `${id}u${i}`, title: 'U', description: '', lessons: [] })),
})
const p = (completions: number, bestAccuracy: number, lastCompleted = '2026-10-01') => ({ completions, bestAccuracy, lastCompleted })

describe('mergeBackup', () => {
  it('keeps courses from both sides and the furthest progress per lesson', () => {
    const out = mergeBackup(
      { courses: [course('a')], progress: { l1: p(1, 0.5), l2: p(2, 1) }, xp: 100 },
      { courses: [course('b'), course('a', 3)], progress: { l1: p(3, 0.9), l3: p(1, 1) }, xp: 400 },
    )
    expect(out.courses?.map((c) => c.id).sort()).toEqual(['a', 'b'])
    expect(out.courses?.find((c) => c.id === 'a')?.units).toHaveLength(3)
    expect(out.progress?.l1).toMatchObject({ completions: 3, bestAccuracy: 0.9 })
    expect(Object.keys(out.progress ?? {}).sort()).toEqual(['l1', 'l2', 'l3'])
    expect(out.xp).toBe(400)
  })
  it('takes the best day totals and the longest streak', () => {
    const out = mergeBackup(
      { xpByDay: { d1: 10 }, streak: 2, bestStreak: 2, lastActiveDay: '2026-10-26' },
      { xpByDay: { d1: 30, d2: 5 }, streak: 5, bestStreak: 6, lastActiveDay: '2026-10-27' },
    )
    expect(out.xpByDay).toEqual({ d1: 30, d2: 5 })
    expect(out.bestStreak).toBe(6)
    expect(out.lastActiveDay).toBe('2026-10-27')
    expect(out.streak).toBe(5)
  })
})
