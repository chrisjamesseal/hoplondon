import { create } from 'zustand'
import { useLearn } from './store'
import { ConnectionDropped, generateText, type GenerateOptions } from './lib/claudeApi'

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
  dismiss: (id: string) => void
}

const aborts = new Map<string, AbortController>()

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
async function writeWithRetry(req: Omit<GenerateOptions, 'onProgress' | 'signal'>, signal: AbortSignal, onProgress: (n: number) => void): Promise<string> {
  let lock: { release: () => Promise<void> } | null = null
  try {
    lock = (await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen')) ?? null
  } catch {
    /* not available */
  }
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        return await generateText({ ...req, signal, onProgress })
      } catch (e) {
        if (!(e instanceof ConnectionDropped) || attempt >= 2) throw e
        onProgress(0)
        await whenVisible()
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
      }
    }
  } finally {
    void lock?.release().catch(() => {})
  }
}

/**
 * Course writing runs here, outside any page, so the learner can carry on using Leap while
 * Claude works. It keeps going as long as the app stays open.
 */
export const useJobs = create<JobsState>((set, get) => ({
  jobs: [],
  start: (title, req, finish) => {
    const id = Math.random().toString(36).slice(2)
    const ctl = new AbortController()
    aborts.set(id, ctl)
    const patch = (p: Partial<Job>) => set((s) => ({ jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...p } : j)) }))
    set((s) => ({ jobs: [...s.jobs, { id, title, status: 'running', chars: 0 }] }))
    void (async () => {
      try {
        const text = await writeWithRetry(req, ctl.signal, (chars) => patch({ chars }))
        // Keep whatever course the learner is on; the banner offers to open the new one
        const before = useLearn.getState().activeCourseId
        const courseId = finish(text)
        if (before) useLearn.getState().setActiveCourse(before)
        patch({ status: 'done', courseId })
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) }))
        else patch({ status: 'error', error: e instanceof Error ? e.message : 'Something went wrong.' })
      } finally {
        aborts.delete(id)
      }
    })()
  },
  cancel: (id) => aborts.get(id)?.abort(),
  dismiss: (id) => set({ jobs: get().jobs.filter((j) => j.id !== id) }),
}))
