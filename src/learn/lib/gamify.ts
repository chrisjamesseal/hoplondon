import type { Course, Exercise, Lesson, LessonProgress } from '../types'

export const MAX_HEARTS = 5
export const HEART_REGEN_MS = 30 * 60 * 1000

/** Local calendar day as YYYY-MM-DD (streaks follow the learner's own midnight) */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** Streak after doing a lesson today */
export function bumpStreak(streak: number, lastActiveDay: string | null, today: string): number {
  if (!lastActiveDay) return 1
  const gap = daysBetween(lastActiveDay, today)
  if (gap <= 0) return Math.max(streak, 1)
  if (gap === 1) return streak + 1
  return 1
}

/** Streak to display: it survives until the end of the day after the last lesson */
export function liveStreak(streak: number, lastActiveDay: string | null, today: string): number {
  if (!lastActiveDay) return 0
  return daysBetween(lastActiveDay, today) <= 1 ? streak : 0
}

/** Hearts regenerate one every 30 minutes up to the max */
export function regenHearts(hearts: number, updatedAt: number, now: number): { hearts: number; updatedAt: number } {
  if (hearts >= MAX_HEARTS) return { hearts: MAX_HEARTS, updatedAt: now }
  const gained = Math.floor((now - updatedAt) / HEART_REGEN_MS)
  if (gained <= 0) return { hearts, updatedAt }
  const next = Math.min(MAX_HEARTS, hearts + gained)
  return { hearts: next, updatedAt: next >= MAX_HEARTS ? now : updatedAt + gained * HEART_REGEN_MS }
}

export function nextHeartIn(hearts: number, updatedAt: number, now: number): number {
  if (hearts >= MAX_HEARTS) return 0
  return Math.max(0, HEART_REGEN_MS - (now - updatedAt))
}

/** Each level needs 25 XP more than the last, starting at 50 */
export function levelInfo(xp: number): { level: number; into: number; needed: number } {
  let level = 1
  let need = 50
  let rest = xp
  while (rest >= need) {
    rest -= need
    level++
    need += 25
  }
  return { level, into: rest, needed: need }
}

export function lessonXp(accuracy: number, isReplay: boolean): number {
  const base = isReplay ? 5 : 10
  const bonus = accuracy >= 1 ? 5 : accuracy >= 0.8 ? 2 : 0
  return base + bonus
}

export function flatLessons(course: Course): Lesson[] {
  return course.units.flatMap((u) => u.lessons)
}

export function courseProgress(course: Course, progress: Record<string, LessonProgress>) {
  const lessons = flatLessons(course)
  const done = lessons.filter((l) => progress[l.id]?.completions).length
  return { done, total: lessons.length, ratio: lessons.length ? done / lessons.length : 0 }
}

/** Lessons unlock in order: the next one opens once the previous is completed */
export function isUnlocked(course: Course, lessonId: string, progress: Record<string, LessonProgress>): boolean {
  const lessons = flatLessons(course)
  const i = lessons.findIndex((l) => l.id === lessonId)
  if (i <= 0) return i === 0
  return !!progress[lessons[i - 1].id]?.completions
}

export function nextLesson(course: Course, progress: Record<string, LessonProgress>): Lesson | undefined {
  return flatLessons(course).find((l) => !progress[l.id]?.completions)
}

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const squash = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]
}

/** Checks a written answer. Ignores case, spaces and punctuation, takes the listed alternatives, and forgives one slip in longer words. */
export function typedMatches(ex: { answer: string; accept?: string[] }, input: string): boolean {
  const got = squash(input)
  if (!got) return false
  return [ex.answer, ...(ex.accept ?? [])].some((target) => {
    const want = squash(target)
    return got === want || (want.length >= 5 && editDistance(got, want) <= 1)
  })
}

/**
 * At harder levels, questions about earlier levels have to be written out. Multiple choice with a short
 * answer and gap fills become written answers. Everything else is left alone.
 */
export function hardenExercise(ex: Exercise): Exercise {
  if (ex.type === 'cloze') return { type: 'type', prompt: ex.sentence, answer: ex.answer, hint: ex.hint, explanation: ex.explanation }
  if (ex.type === 'mcq' && !ex.audio) {
    const answer = ex.options[ex.answer]
    const short = answer.length <= 28 && answer.split(/\s+/).length <= 3
    // "Which of the following" only makes sense with the options in view
    if (short && !/\b(following|these|below|above|options?|choices?)\b/i.test(ex.prompt)) {
      return { type: 'type', prompt: ex.prompt, answer, hint: ex.hint, explanation: ex.explanation }
    }
  }
  return ex
}

/** Exercises for a unit, written out when the course has moved on to a harder level than the unit's own */
export function exercisesFor(course: Course, unit: Course['units'][number], exercises: Exercise[]): Exercise[] {
  return (unit.level ?? 1) < (course.level ?? 1) ? exercises.map(hardenExercise) : exercises
}

/** Turns a written question into a multiple choice one, using other answers from the same unit as the wrong options */
export function softenToMcq(ex: Extract<Exercise, { type: 'type' }>, pool: string[], seed: string): Exercise {
  const seen = new Set([ex.answer.toLowerCase()])
  const others: string[] = []
  for (const a of shuffle(pool, seeded(seed))) {
    const k = a.toLowerCase()
    if (seen.has(k)) continue
    seen.add(k)
    others.push(a)
    if (others.length === 3) break
  }
  if (others.length < 2) return ex
  const options = shuffle([ex.answer, ...others], seeded(seed + 'o'))
  return { type: 'mcq', prompt: ex.prompt, options, answer: options.indexOf(ex.answer), explanation: ex.explanation, hint: ex.hint }
}

/**
 * New learning at a harder level should start with buttons and only move to typing later. The first
 * lesson of a unit has no written answers, the second keeps about a third, and written answers
 * always come after the tap questions within a lesson.
 */
export function easeIntoTyping(course: Course, unit: Course['units'][number], lessonIndex: number, exercises: Exercise[], seed: string): Exercise[] {
  if ((unit.level ?? 1) < (course.level ?? 1)) return exercises
  const typed = exercises.filter((e) => e.type === 'type').length
  if (!typed) return exercises
  const keep = lessonIndex <= 0 ? 0 : lessonIndex === 1 ? Math.floor(exercises.length / 3) : typed
  const pool = [...unit.lessons.flatMap((l) => l.exercises), ...(unit.quiz ?? [])].flatMap((e) => (e.type === 'type' || e.type === 'cloze' ? [e.answer] : []))
  let seen = 0
  const eased = exercises.map((e) => {
    if (e.type !== 'type') return e
    seen++
    return typed - seen < keep ? e : softenToMcq(e, pool, seed + seen)
  })
  // Taps first, writing last
  return [...eased.filter((e) => e.type !== 'type'), ...eased.filter((e) => e.type === 'type')]
}

/** Lenient answer comparison: ignores case, punctuation and extra spaces */
export function sameAnswer(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  return norm(a) === norm(b)
}

/** Lessons finished on a day. Falls back to lesson records for days saved before daily counts existed. */
export function lessonsOn(day: string, byDay: Record<string, number>, progress: Record<string, { lastCompleted: string }>): number {
  const recorded = byDay[day] ?? 0
  const fromProgress = Object.values(progress).filter((p) => p.lastCompleted === day).length
  return Math.max(recorded, fromProgress)
}

/** Small seeded random number generator, so the same lesson always gets the same order */
function seeded(seed: string): () => number {
  let h = 1779033703 ^ seed.length
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353)
  let a = (h ^ (h >>> 16)) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Generated lessons tend to put their false statement before their true one. Shuffle the true or false
 * questions between their own slots so the answer can't be guessed from the order. The seed keeps the
 * order the same every time that lesson opens, so a paused lesson still resumes at the right question.
 */
export function mixTrueFalse(exercises: Exercise[], seed: string): Exercise[] {
  const slots = exercises.flatMap((e, i) => (e.type === 'tf' ? [i] : []))
  if (slots.length < 2) return exercises
  const mixed = shuffle(
    slots.map((i) => exercises[i]),
    seeded(seed),
  )
  const out = [...exercises]
  slots.forEach((slot, k) => (out[slot] = mixed[k]))
  return out
}

/* ---------- unit quizzes and jumping ahead ---------- */

/** Unit quizzes are stored in progress under this key, next to lesson ids */
export const quizKey = (unitId: string) => `quiz:${unitId}`
export const QUIZ_SIZE = 5
export const PASS_RATE = 0.8

export function passMark(questions: number): number {
  return Math.ceil(questions * PASS_RATE)
}

/** Lessons and the quiz that closes each unit, in the order they unlock */
export type PathStep = { kind: 'lesson'; id: string; unitIndex: number } | { kind: 'quiz'; id: string; unitIndex: number }

export function pathSteps(course: Course): PathStep[] {
  return course.units.flatMap((u, ui) => [
    ...u.lessons.map((l): PathStep => ({ kind: 'lesson', id: l.id, unitIndex: ui })),
    { kind: 'quiz', id: quizKey(u.id), unitIndex: ui } as PathStep,
  ])
}

/** A step counts as done when finished; older saves without quizzes count a quiz as done once the next unit was started */
export function stepDone(course: Course, step: PathStep, progress: Record<string, LessonProgress>): boolean {
  if (progress[step.id]?.completions) return true
  if (step.kind !== 'quiz') return false
  return course.units.slice(step.unitIndex + 1).some((u) => u.lessons.some((l) => progress[l.id]?.completions))
}

export function stepUnlocked(course: Course, id: string, progress: Record<string, LessonProgress>): boolean {
  const steps = pathSteps(course)
  const i = steps.findIndex((s) => s.id === id)
  if (i <= 0) return i === 0
  return stepDone(course, steps[i - 1], progress)
}

export function nextStep(course: Course, progress: Record<string, LessonProgress>): PathStep | undefined {
  return pathSteps(course).find((s) => !stepDone(course, s, progress))
}

export function isCourseComplete(course: Course, progress: Record<string, LessonProgress>): boolean {
  return !nextStep(course, progress)
}

function pickRoundRobin<T>(groups: T[][], n: number, rand: () => number): T[] {
  const pools = groups.map((g) => shuffle(g, rand)).filter((g) => g.length)
  const out: T[] = []
  for (let round = 0; out.length < n && pools.some((p) => p.length); round++) {
    for (const p of shuffle(pools, rand)) {
      if (out.length >= n) break
      const x = p.pop()
      if (x) out.push(x)
    }
  }
  return out
}

/** Units that came with their own fresh quiz questions use those, otherwise the lesson exercises are reused */
const quizPool = (course: Course, u: Course['units'][number]): Exercise[][] =>
  (u.quiz && u.quiz.length >= 3 ? [u.quiz] : u.lessons.map((l) => l.exercises)).map((g) => exercisesFor(course, u, g))

/** End of unit quiz: the unit's own quiz questions when it has them, plus one from the unit before */
export function unitQuizExercises(course: Course, unitIndex: number, rand: () => number = Math.random) {
  const unit = course.units[unitIndex]
  const prev = course.units[unitIndex - 1]
  const fromPrev = prev ? pickRoundRobin(quizPool(course, prev), 1, rand) : []
  const fromUnit = pickRoundRobin(quizPool(course, unit), QUIZ_SIZE - fromPrev.length, rand)
  return shuffle([...fromUnit, ...fromPrev], rand)
}

/** Jump ahead test: questions drawn from every unit being skipped */
export function jumpTestExercises(course: Course, toUnitIndex: number, rand: () => number = Math.random) {
  const skipped = course.units.slice(0, toUnitIndex)
  const n = Math.min(10, Math.max(QUIZ_SIZE, skipped.length * 3))
  return pickRoundRobin(
    skipped.flatMap((u) => quizPool(course, u)),
    n,
    rand,
  )
}

/** Everything before a unit, for marking as done after passing a jump test */
/** Every step up to and including the nth lesson, for catching a course up to where the learner already was */
export function stepsThroughLesson(course: Course, n: number): string[] {
  const out: string[] = []
  let seen = 0
  if (n <= 0) return out
  for (const s of pathSteps(course)) {
    out.push(s.id)
    if (s.kind === 'lesson' && ++seen >= n) break
  }
  return out
}

export function stepsBeforeUnit(course: Course, unitIndex: number): string[] {
  return pathSteps(course)
    .filter((s) => s.unitIndex < unitIndex)
    .map((s) => s.id)
}
