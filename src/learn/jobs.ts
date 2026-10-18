import { create } from 'zustand'
import { useLearn } from './store'
import { generateText, type GenerateOptions } from './lib/claudeApi'

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
        const text = await generateText({ ...req, signal: ctl.signal, onProgress: (chars) => patch({ chars }) })
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
