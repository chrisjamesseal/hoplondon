import type { Course, LessonProgress } from '../types'

/** The saved parts of the store that a backup carries */
export interface Saved {
  courses: Course[]
  progress: Record<string, LessonProgress>
  xp: number
  xpByDay: Record<string, number>
  lessonsByDay: Record<string, number>
  streak: number
  bestStreak: number
  lastActiveDay: string | null
  archived: string[]
  weak: string[]
}

const maxByKey = (a: Record<string, number> = {}, b: Record<string, number> = {}) => {
  const out = { ...a }
  for (const [k, v] of Object.entries(b)) out[k] = Math.max(out[k] ?? 0, v)
  return out
}

/**
 * Combines a restored backup with what is already on the phone. Nothing is
 * lost: every course from either side is kept and, for each lesson, the
 * furthest progress wins. Restoring an older backup can never undo newer work.
 */
export function mergeBackup(now: Partial<Saved>, backup: Partial<Saved>): Partial<Saved> {
  const courses = [...(now.courses ?? [])]
  for (const c of backup.courses ?? []) {
    const at = courses.findIndex((x) => x.id === c.id)
    // Same course on both sides: keep the one with more units (a follow on may have been added)
    if (at < 0) courses.push(c)
    else if (c.units.length > courses[at].units.length) courses[at] = c
  }
  const progress: Record<string, LessonProgress> = { ...(now.progress ?? {}) }
  for (const [k, p] of Object.entries(backup.progress ?? {})) {
    const mine = progress[k]
    if (!mine) progress[k] = p
    else
      progress[k] = {
        completions: Math.max(mine.completions, p.completions),
        bestAccuracy: Math.max(mine.bestAccuracy, p.bestAccuracy),
        lastCompleted: mine.lastCompleted > p.lastCompleted ? mine.lastCompleted : p.lastCompleted,
        skipped: mine.skipped && p.skipped ? true : undefined,
      }
  }
  const last = [now.lastActiveDay, backup.lastActiveDay].filter(Boolean).sort().pop() ?? null
  return {
    courses,
    progress,
    xp: Math.max(now.xp ?? 0, backup.xp ?? 0),
    xpByDay: maxByKey(now.xpByDay, backup.xpByDay),
    lessonsByDay: maxByKey(now.lessonsByDay, backup.lessonsByDay),
    streak: last === now.lastActiveDay ? Math.max(now.streak ?? 0, last === backup.lastActiveDay ? (backup.streak ?? 0) : 0) : (backup.streak ?? 0),
    bestStreak: Math.max(now.bestStreak ?? 0, backup.bestStreak ?? 0, now.streak ?? 0, backup.streak ?? 0),
    lastActiveDay: last,
    archived: [...new Set([...(now.archived ?? []), ...(backup.archived ?? [])])],
    weak: [...new Set([...(now.weak ?? []), ...(backup.weak ?? [])])],
  }
}
