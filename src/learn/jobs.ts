import { create } from 'zustand'
import { useLearn } from './store'
import { ConnectionDropped, generateText, getApiKey, type GenerateOptions } from './lib/claudeApi'
import { parseCourseJson } from './lib/claudePrompt'
import { normalizeCourse } from './lib/normalize'
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

// ---- New courses: saved as they are written, so leaving the app never loses them ----

const live = new Map<string, AbortController>()
// The PDF can't be saved, so it is only kept while the app stays open
const pdfs = new Map<string, File | null | undefined>()

const unitsIn = (text: string): { head: Record<string, unknown>; units: unknown[] } | null => {
  try {
    const head = parseCourseJson(text) as Record<string, unknown>
    return { head, units: Array.isArray(head.units) ? head.units : [] }
  } catch {
    return null
  }
}

const get = (id: string) => useLearn.getState().drafts.find((d) => d.id === id)

function continuePrompt(d: Draft): string {
  const done = d.units.map((u, i) => `${i + 1}. ${String((u as { title?: unknown })?.title ?? 'Unit')}`).join('\n')
  return `${d.prompt}

I already have these units, so do not repeat them:
${done}

Carry on the same course. Write only the remaining units, numbered from "Unit ${d.units.length + 1}: ..." onwards, to finish the whole course. Use the same JSON format but with only the new units.`
}

/** Starts, or carries on, writing a saved course */
export function runDraft(id: string) {
  if (live.has(id) || !get(id)) return
  const store = useLearn.getState()
  const ctl = new AbortController()
  live.set(id, ctl)
  store.patchDraft(id, { status: 'writing', note: undefined })
  let base: unknown[] = []
  let last = 0
  void (async () => {
    try {
      const text = await writeWithRetry(
        () => {
          const d = get(id)!
          base = d.units
          return { key: getApiKey(), prompt: base.length ? continuePrompt(d) : d.prompt, pdf: pdfs.get(id), readWeb: d.readWeb }
        },
        ctl.signal,
        (_chars, t) => {
          // Save about once a second; the last unit may still be half written, so it waits
          if (Date.now() - last < 1000) return
          last = Date.now()
          const p = unitsIn(t)
          if (!p) return
          const done = p.units.slice(0, -1)
          const h = p.head
          useLearn.getState().patchDraft(id, {
            units: [...base, ...done],
            ...(base.length ? {} : { head: { title: typeof h.title === 'string' ? h.title : undefined, emoji: typeof h.emoji === 'string' ? h.emoji : undefined, summary: typeof h.summary === 'string' ? h.summary : undefined, lang: typeof h.lang === 'string' ? h.lang : undefined } }),
          })
        },
      )
      const p = unitsIn(text)
      if (p) useLearn.getState().patchDraft(id, { units: [...base, ...p.units], ...(base.length ? {} : { head: { title: p.head.title as string, emoji: p.head.emoji as string, summary: p.head.summary as string, lang: p.head.lang as string } }) })
      else if (!base.length) throw new Error('Claude sent something Leap could not read. Try again.')
      finishDraft(id)
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError') && get(id)) {
        useLearn.getState().patchDraft(id, { status: 'paused', note: e instanceof Error ? e.message : 'Something went wrong.' })
      }
    } finally {
      live.delete(id)
    }
  })()
}

/** Turns what has been written so far into a real course */
export function finishDraft(id: string) {
  const d = get(id)
  if (!d) return
  const s = useLearn.getState()
  try {
    const course = normalizeCourse({ ...d.head, units: d.units }, d.source, 'claude')
    live.get(id)?.abort()
    // Keep whatever course the learner is on
    const before = s.activeCourseId
    s.addCourse(course)
    if (before) s.setActiveCourse(before)
    s.removeDraft(id)
  } catch (e) {
    s.patchDraft(id, { status: 'paused', note: e instanceof Error ? e.message : 'Could not build the course.' })
  }
}

export function cancelDraft(id: string) {
  live.get(id)?.abort()
  useLearn.getState().removeDraft(id)
}

export function startDraft(title: string, source: Draft['source'], req: { prompt: string; pdf?: File | null; readWeb?: boolean }) {
  const id = Math.random().toString(36).slice(2)
  pdfs.set(id, req.pdf)
  useLearn.getState().saveDraft({ id, title, source, prompt: req.prompt, readWeb: req.readWeb, units: [], status: 'writing', updatedAt: Date.now() })
  runDraft(id)
}

/** After the app was closed or reloaded, nothing is writing any more, so mark those as paused */
export function pauseStale() {
  const s = useLearn.getState()
  for (const d of s.drafts ?? []) if (d.status === 'writing' && !live.has(d.id)) s.patchDraft(d.id, { status: 'paused', note: 'Stopped when Leap closed. Tap to carry on.' })
}
