import { create } from 'zustand'
import { useLearn } from './store'
import { ConnectionDropped, generateText, getApiKey, type GenerateOptions } from './lib/claudeApi'
import { parseCourseJson } from './lib/claudePrompt'
import { describeStep, nextStep, outlineFrom, promptFor } from './lib/draftSteps'
import { normalizeCourse, normalizeLesson, normalizeQuiz } from './lib/normalize'
import type { Draft } from './types'

export interface Job {
  id: string
  title: string
  status: 'running' | 'done' | 'error'
  chars: number
  error?: string
  courseId?: string
}

interface JobsState {
  jobs: Job[]
  start: (title: string, req: Omit<GenerateOptions, 'onProgress' | 'signal'>, finish: (text: string) => string) => void
  cancel: (id: string) => void
  retry: (id: string) => void
  dismiss: (id: string) => void
}

const aborts = new Map<string, AbortController>()
// What each job was asked to do, so a failed one can be run again
const requests = new Map<string, { req: Omit<GenerateOptions, 'onProgress' | 'signal'>; finish: (text: string) => string }>()

const whenVisible = () =>
  new Promise<void>((resolve) => {
    if (document.visibilityState === 'visible') return resolve()
    const on = () => {
      if (document.visibilityState !== 'visible') return
      document.removeEventListener('visibilitychange', on)
      resolve()
    }
    document.addEventListener('visibilitychange', on)
  })

/**
 * iOS cuts network streams when the app goes to the background. Keep the screen awake while
 * writing, and if the connection still drops, start again as soon as the app is back.
 */
async function writeWithRetry(getReq: () => Omit<GenerateOptions, 'onProgress' | 'signal'>, signal: AbortSignal, onProgress: (n: number, text: string) => void): Promise<string> {
  let lock: { release: () => Promise<void> } | null = null
  try {
    lock = (await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen')) ?? null
  } catch {
    /* not available */
  }
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await generateText({ ...getReq(), signal, onProgress })
      } catch (e) {
        if (!(e instanceof ConnectionDropped) || attempt >= 2) throw e
        onProgress(0, '')
        await whenVisible()
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      }
    }
  } finally {
    void lock?.release().catch(() => {})
  }
}

function run(id: string) {
  const job = requests.get(id)
  if (!job) return
  const set = useJobs.setState
  const patch = (p: Partial<Job>) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) }))
  const ctl = new AbortController()
  aborts.set(id, ctl)
  void (async () => {
    try {
      const text = await writeWithRetry(() => job.req, ctl.signal, (chars) => patch({ chars }))
      // Keep whatever course the learner is on; the banner offers to open the new one
      const before = useLearn.getState().activeCourseId
      const courseId = job.finish(text)
      if (before) useLearn.getState().setActiveCourse(before)
      patch({ status: 'done', courseId })
      requests.delete(id)
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') {
        requests.delete(id)
        set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }))
      } else patch({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' })
    } finally {
      aborts.delete(id)
    }
  })()
}

/**
 * Course writing runs here, outside any page, so the learner can carry on using Leap while
 * Claude works. It keeps going as long as the app stays open.
 */
export const useJobs = create<JobsState>((set, get) => ({
  jobs: [],
  start: (title, req, finish) => {
    const id = Math.random().toString(36).slice(2)
    requests.set(id, { req, finish })
    set((s) => ({ jobs: [...s.jobs, { id, title, status: 'running', chars: 0 }] }))
    run(id)
  },
  retry: (id) => {
    if (!requests.has(id)) return
    set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, status: 'running', chars: 0, error: undefined } : j)) }))
    run(id)
  },
  cancel: (id) => aborts.get(id)?.abort(),
  dismiss: (id) => {
    requests.delete(id)
    set({ jobs: get().jobs.filter((j) => j.id !== id) })
  },
}))

// ---- New courses: written one lesson at a time and saved after each, so leaving the app never loses them ----

const live = new Map<string, AbortController>()
// The PDF can't be saved, so it is only kept while the app stays open
const pdfs = new Map<string, File | null | undefined>()

const get = (id: string) => useLearn.getState().drafts.find((d) => d.id === id)
const str = (v: unknown): string => (typeof v === 'string' ? v : '')

/** Starts, or carries on, writing a saved course from the next missing lesson */
export function runDraft(id: string) {
  if (live.has(id) || !get(id)) return
  const ctl = new AbortController()
  live.set(id, ctl)
  const patch = (p: Partial<Draft>) => get(id) && useLearn.getState().patchDraft(id, p)
  patch({ status: 'writing', note: undefined, auto: false })
  void (async () => {
    try {
      // A draft from before lessons were written one by one has no plan, so it starts again
      if (!get(id)!.outline && get(id)!.units.length) patch({ units: [] })
      for (;;) {
        const d = get(id)
        if (!d) return
        const step = nextStep(d)
        if (!step) break
        patch({ activity: describeStep(d, step) })
        const text = await writeWithRetry(() => ({ key: getApiKey(), prompt: promptFor(get(id)!, step), pdf: pdfs.get(id), readWeb: d.readWeb }), ctl.signal, () => {})
        const cur = get(id)
        if (!cur) return
        const obj = parseCourseJson(text) as Record<string, unknown>
        if (step.kind === 'outline') {
          const { head, outline } = outlineFrom(obj)
          if (!outline.length) throw new Error('Claude sent a plan Leap could not read. Try again.')
          patch({ head, outline, units: [] })
        } else if (step.kind === 'lesson') {
          const l = (obj.lesson && typeof obj.lesson === 'object' ? obj.lesson : obj) as Record<string, unknown>
          const o = cur.outline![step.u]
          const raw = { ...l, title: str(l.title) || o.lessons[step.l].title, emoji: str(l.emoji) || o.lessons[step.l].emoji }
          const incomplete = new Error('That lesson came back incomplete. Try again.')
          const st = useLearn.getState()
          if (!cur.courseId) {
            // The first lesson makes the course, which can be played from here while the rest is written
            let course
            try {
              course = normalizeCourse({ ...cur.head, units: [{ title: o.title, emoji: o.emoji, description: o.description, lessons: [raw] }] }, cur.source, 'claude')
            } catch {
              throw incomplete
            }
            course.building = { draftId: id, total: cur.outline!.reduce((n, u) => n + u.lessons.length, 0) }
            const before = st.activeCourseId
            st.addCourse(course)
            if (before) st.setActiveCourse(before)
            patch({ courseId: course.id })
          } else {
            const lesson = normalizeLesson(raw, cur.source)
            if (!lesson) throw incomplete
            st.appendLesson(cur.courseId, o, step.u, lesson)
          }
          const units = [...cur.units] as { lessons: unknown[] }[]
          const built = units[step.u] ?? { title: o.title, emoji: o.emoji, description: o.description, lessons: [] }
          units[step.u] = { ...built, lessons: [...built.lessons, raw] }
          patch({ units })
        } else {
          // A quiz that comes back short is skipped rather than blocking the course
          const units = [...cur.units] as { lessons: unknown[]; quiz?: unknown[] }[]
          units[step.u] = { ...units[step.u], quiz: Array.isArray(obj.quiz) ? obj.quiz : [] }
          if (cur.courseId) useLearn.getState().setUnitQuiz(cur.courseId, step.u, normalizeQuiz(obj.quiz))
          patch({ units })
        }
      }
      patch({ activity: undefined })
      finishDraft(id)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        patch({ status: 'paused', activity: undefined, auto: e instanceof ConnectionDropped, note: e instanceof Error ? e.message : 'Something went wrong.' })
      }
    } finally {
      live.delete(id)
    }
  })()
}

/** Stops writing and keeps the lessons that are in */
export function finishDraft(id: string) {
  const d = get(id)
  if (!d) return
  const s = useLearn.getState()
  live.get(id)?.abort()
  if (!d.courseId) return s.patchDraft(id, { status: 'paused', note: 'Nothing is written yet.' })
  s.endBuilding(d.courseId)
  s.removeDraft(id)
}

export function cancelDraft(id: string) {
  const d = get(id)
  live.get(id)?.abort()
  if (d?.courseId) useLearn.getState().endBuilding(d.courseId)
  useLearn.getState().removeDraft(id)
}

export function startDraft(title: string, source: Draft['source'], req: { prompt: string; pdf?: File | null; readWeb?: boolean }) {
  const id = Math.random().toString(36).slice(2)
  pdfs.set(id, req.pdf)
  useLearn.getState().saveDraft({ id, title, source, prompt: req.prompt, readWeb: req.readWeb, units: [], status: 'writing', updatedAt: Date.now() })
  runDraft(id)
}

/** After the app was closed or reloaded, nothing is writing any more, so mark those as paused and ready to carry on */
export function pauseStale() {
  const s = useLearn.getState()
  // A course marked as still being written whose job is gone has nothing more coming
  for (const c of s.courses) if (c.building && !(s.drafts ?? []).some((d) => d.id === c.building!.draftId)) s.endBuilding(c.id)
  for (const d of s.drafts ?? []) if (d.status === 'writing' && !live.has(d.id)) s.patchDraft(d.id, { status: 'paused', auto: true, activity: undefined, note: 'Stopped when Leap closed.' })
}

/** Carries on by itself with courses that stopped because the connection dropped or the app closed */
export function resumeInterrupted() {
  for (const d of useLearn.getState().drafts ?? []) if (d.status === 'paused' && d.auto) runDraft(d.id)
}
