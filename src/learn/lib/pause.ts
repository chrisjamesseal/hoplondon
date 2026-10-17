/**
 * Remembers where a lesson stopped when hearts ran out, so the learner can
 * practise to refill and then carry on from the same question.
 */
export interface PausedLesson {
  lessonId: string
  /** Exercise indexes still to do, in order (repeats included) */
  remaining: number[]
  solved: number
  firstTry: number
  missed: number[]
  startedAt: number
}

const KEY = 'leap-paused-lesson'

export function savePause(p: PausedLesson) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    // private mode: the lesson just restarts
  }
}

export function loadPause(lessonId?: string): PausedLesson | null {
  try {
    const p = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') as PausedLesson | null
    return p && (!lessonId || p.lessonId === lessonId) ? p : null
  } catch {
    return null
  }
}

export function clearPause() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // nothing stored
  }
}
