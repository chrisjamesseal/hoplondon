import type { Course, Lesson, LessonProgress } from '../types'

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

/** End of unit quiz: questions from every lesson in the unit, plus one from the unit before */
export function unitQuizExercises(course: Course, unitIndex: number, rand: () => number = Math.random) {
  const unit = course.units[unitIndex]
  const prev = course.units[unitIndex - 1]
  const fromPrev = prev ? pickRoundRobin(prev.lessons.map((l) => l.exercises), 1, rand) : []
  const fromUnit = pickRoundRobin(
    unit.lessons.map((l) => l.exercises),
    QUIZ_SIZE - fromPrev.length,
    rand,
  )
  return shuffle([...fromUnit, ...fromPrev], rand)
}

/** Jump ahead test: questions drawn from every unit being skipped */
export function jumpTestExercises(course: Course, toUnitIndex: number, rand: () => number = Math.random) {
  const skipped = course.units.slice(0, toUnitIndex)
  const n = Math.min(10, Math.max(QUIZ_SIZE, skipped.length * 3))
  return pickRoundRobin(
    skipped.flatMap((u) => u.lessons.map((l) => l.exercises)),
    n,
    rand,
  )
}

/** Everything before a unit, for marking as done after passing a jump test */
export function stepsBeforeUnit(course: Course, unitIndex: number): string[] {
  return pathSteps(course)
    .filter((s) => s.unitIndex < unitIndex)
    .map((s) => s.id)
}
