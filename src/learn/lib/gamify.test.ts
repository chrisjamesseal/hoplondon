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

describe('unit quiz questions', () => {
  it('uses the unit\'s own quiz questions instead of lesson exercises when it has them', async () => {
    const { unitQuizExercises } = await import('./gamify')
    const quiz = Array.from({ length: 5 }, (_, i) => ({ type: 'tf' as const, statement: `fresh ${i}`, answer: true }))
    const course = { ...DEMO_COURSE, units: DEMO_COURSE.units.map((u, i) => (i === 0 ? { ...u, quiz } : u)) }
    const qs = unitQuizExercises(course, 0)
    expect(qs).toHaveLength(5)
    expect(qs.every((q) => q.type === 'tf' && q.statement.startsWith('fresh'))).toBe(true)
  })
})

describe('mixTrueFalse', () => {
  const tf = (n: number, answer: boolean) => ({ type: 'tf' as const, statement: `s${n}`, answer })
  const mcq = { type: 'mcq' as const, prompt: 'q', options: ['a', 'b'], answer: 0 }

  it('keeps the same slots for each question type and the same questions', async () => {
    const { mixTrueFalse } = await import('./gamify')
    const list = [tf(1, false), mcq, tf(2, true), mcq]
    const out = mixTrueFalse(list, 'lesson-a')
    expect(out.map((e) => e.type)).toEqual(['tf', 'mcq', 'tf', 'mcq'])
    expect(out.filter((e) => e.type === 'tf').map((e) => (e as { statement: string }).statement).sort()).toEqual(['s1', 's2'])
  })

  it('is stable for a lesson and not always false first', async () => {
    const { mixTrueFalse } = await import('./gamify')
    const list = [tf(1, false), tf(2, true)]
    expect(mixTrueFalse(list, 'x')).toEqual(mixTrueFalse(list, 'x'))
    const firstAnswers = new Set(Array.from({ length: 30 }, (_, i) => (mixTrueFalse(list, `lesson-${i}`)[0] as { answer: boolean }).answer))
    expect(firstAnswers.size).toBe(2)
  })
})

describe('written answers', () => {
  it('matches ignoring case and punctuation, takes alternatives and forgives one slip in longer words', async () => {
    const { typedMatches } = await import('./gamify')
    const ex = { answer: 'Premise', accept: ['the premise'] }
    expect(typedMatches(ex, 'premise')).toBe(true)
    expect(typedMatches(ex, ' The Premise! ')).toBe(true)
    expect(typedMatches(ex, 'premice')).toBe(true)
    expect(typedMatches(ex, 'promise')).toBe(true)
    expect(typedMatches(ex, 'pre')).toBe(false)
    expect(typedMatches({ answer: 'cat' }, 'cot')).toBe(false)
    expect(typedMatches(ex, '')).toBe(false)
  })

  it('writes out short multiple choice and gap fills, but leaves scenario questions alone', async () => {
    const { hardenExercise } = await import('./gamify')
    const short = { type: 'mcq' as const, prompt: 'What is the idea a video promises?', options: ['Premise', 'Budget', 'Edit', 'Thumbnail'], answer: 0 }
    expect(hardenExercise(short)).toMatchObject({ type: 'type', answer: 'Premise' })
    const long = { type: 'mcq' as const, prompt: 'A colleague misses a deadline. What is the best response?', options: ['Ask what got in the way and agree a new date together', 'Say nothing', 'Escalate', 'Reassign it'], answer: 0 }
    expect(hardenExercise(long)).toBe(long)
    const listy = { ...short, prompt: 'Which of the following is the promise?' }
    expect(hardenExercise(listy)).toBe(listy)
    expect(hardenExercise({ type: 'cloze', sentence: 'The ___ sells the click.', answer: 'title', distractors: ['a'] })).toMatchObject({ type: 'type', prompt: 'The ___ sells the click.', answer: 'title' })
  })

  it('only hardens units from earlier levels', async () => {
    const { exercisesFor } = await import('./gamify')
    const mcq = { type: 'mcq' as const, prompt: 'Name it?', options: ['Alpha', 'Beta'], answer: 0 }
    const course = { ...DEMO_COURSE, level: 2, units: [{ ...DEMO_COURSE.units[0], level: 1 }, { ...DEMO_COURSE.units[1], level: 2 }] }
    expect(exercisesFor(course, course.units[0], [mcq])[0].type).toBe('type')
    expect(exercisesFor(course, course.units[1], [mcq])[0].type).toBe('mcq')
  })
})
