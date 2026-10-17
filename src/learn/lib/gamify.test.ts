import { describe, expect, it } from 'vitest'
import { lessonsOn, bumpStreak, courseProgress, HEART_REGEN_MS, isUnlocked, levelInfo, liveStreak, regenHearts, sameAnswer } from './gamify'
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

describe('lessonsOn', () => {
  it('uses the daily count when there is one', () => {
    expect(lessonsOn('2026-10-17', { '2026-10-17': 3 }, {})).toBe(3)
  })
  it('falls back to lesson records for older saves', () => {
    expect(lessonsOn('2026-10-17', {}, { a: { lastCompleted: '2026-10-17' }, b: { lastCompleted: '2026-10-16' } })).toBe(1)
  })
})

describe('unit quizzes and jumping ahead', () => {
  it('closes every unit with a quiz step', async () => {
    const { pathSteps, quizKey } = await import('./gamify')
    const steps = pathSteps(DEMO_COURSE)
    expect(steps.filter((s) => s.kind === 'quiz').map((s) => s.id)).toEqual(DEMO_COURSE.units.map((u) => quizKey(u.id)))
  })

  it('locks the next unit until the quiz is passed', async () => {
    const { stepUnlocked, quizKey } = await import('./gamify')
    const [u1, u2] = DEMO_COURSE.units
    const done = (id: string) => ({ [id]: { completions: 1, bestAccuracy: 1, lastCompleted: '2026-10-17' } })
    const lessonsDone = Object.assign({}, ...u1.lessons.map((l) => done(l.id)))
    expect(stepUnlocked(DEMO_COURSE, quizKey(u1.id), lessonsDone)).toBe(true)
    expect(stepUnlocked(DEMO_COURSE, u2.lessons[0].id, lessonsDone)).toBe(false)
    expect(stepUnlocked(DEMO_COURSE, u2.lessons[0].id, { ...lessonsDone, ...done(quizKey(u1.id)) })).toBe(true)
  })

  it('treats a quiz as done for older saves that already started the next unit', async () => {
    const { stepDone, quizKey } = await import('./gamify')
    const [u1, u2] = DEMO_COURSE.units
    const progress = { [u2.lessons[0].id]: { completions: 1, bestAccuracy: 1, lastCompleted: '2026-10-17' } }
    expect(stepDone(DEMO_COURSE, { kind: 'quiz', id: quizKey(u1.id), unitIndex: 0 }, progress)).toBe(true)
  })

  it('builds a 5 question quiz with one question from the previous unit', async () => {
    const { unitQuizExercises, passMark } = await import('./gamify')
    const qs = unitQuizExercises(DEMO_COURSE, 1)
    expect(qs).toHaveLength(5)
    const prevPool = new Set(DEMO_COURSE.units[0].lessons.flatMap((l) => l.exercises))
    expect(qs.filter((q) => prevPool.has(q))).toHaveLength(1)
    expect(passMark(5)).toBe(4)
  })

  it('jump tests draw only from the skipped units', async () => {
    const { jumpTestExercises, stepsBeforeUnit, quizKey } = await import('./gamify')
    const qs = jumpTestExercises(DEMO_COURSE, 1)
    const pool = new Set(DEMO_COURSE.units[0].lessons.flatMap((l) => l.exercises))
    expect(qs.length).toBeGreaterThanOrEqual(5)
    for (const q of qs) expect(pool.has(q)).toBe(true)
    expect(stepsBeforeUnit(DEMO_COURSE, 1)).toEqual([...DEMO_COURSE.units[0].lessons.map((l) => l.id), quizKey(DEMO_COURSE.units[0].id)])
  })
})
