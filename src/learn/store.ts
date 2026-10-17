import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, LessonProgress } from './types'
import { DEMO_COURSE } from './demo'
import { bumpStreak, dayKey, MAX_HEARTS, regenHearts } from './lib/gamify'

interface LearnState {
  courses: Course[]
  activeCourseId: string | null
  progress: Record<string, LessonProgress>
  xp: number
  xpByDay: Record<string, number>
  streak: number
  lastActiveDay: string | null
  hearts: number
  heartsUpdatedAt: number
  dailyGoal: number
  sound: boolean

  addCourse: (c: Course) => void
  deleteCourse: (id: string) => void
  setActiveCourse: (id: string) => void
  completeLesson: (lessonId: string, accuracy: number, xp: number) => void
  finishPractice: (xp: number) => void
  syncHearts: () => void
  loseHeart: () => void
  refillHearts: () => void
  setDailyGoal: (n: number) => void
  setSound: (on: boolean) => void
  resetProgress: () => void
}

export const useLearn = create<LearnState>()(
  persist(
    (set, get) => ({
      courses: [DEMO_COURSE],
      activeCourseId: DEMO_COURSE.id,
      progress: {},
      xp: 0,
      xpByDay: {},
      streak: 0,
      lastActiveDay: null,
      hearts: MAX_HEARTS,
      heartsUpdatedAt: Date.now(),
      dailyGoal: 30,
      sound: true,

      addCourse: (c) => set((s) => ({ courses: [c, ...s.courses], activeCourseId: c.id })),
      deleteCourse: (id) =>
        set((s) => {
          const course = s.courses.find((c) => c.id === id)
          const lessonIds = new Set(course?.units.flatMap((u) => u.lessons.map((l) => l.id)))
          const courses = s.courses.filter((c) => c.id !== id)
          return {
            courses,
            progress: Object.fromEntries(Object.entries(s.progress).filter(([k]) => !lessonIds.has(k))),
            activeCourseId: s.activeCourseId === id ? (courses[0]?.id ?? null) : s.activeCourseId,
          }
        }),
      setActiveCourse: (id) => set({ activeCourseId: id }),
      completeLesson: (lessonId, accuracy, xp) =>
        set((s) => {
          const today = dayKey()
          const prev = s.progress[lessonId]
          return {
            progress: {
              ...s.progress,
              [lessonId]: {
                completions: (prev?.completions ?? 0) + 1,
                bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, accuracy),
                lastCompleted: today,
              },
            },
            xp: s.xp + xp,
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
            streak: bumpStreak(s.streak, s.lastActiveDay, today),
            lastActiveDay: today,
          }
        }),
      finishPractice: (xp) =>
        set((s) => {
          const today = dayKey()
          return {
            xp: s.xp + xp,
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
            streak: bumpStreak(s.streak, s.lastActiveDay, today),
            lastActiveDay: today,
            hearts: MAX_HEARTS,
            heartsUpdatedAt: Date.now(),
          }
        }),
      syncHearts: () => {
        const { hearts, heartsUpdatedAt } = get()
        const next = regenHearts(hearts, heartsUpdatedAt, Date.now())
        if (next.hearts !== hearts || next.updatedAt !== heartsUpdatedAt) set({ hearts: next.hearts, heartsUpdatedAt: next.updatedAt })
      },
      loseHeart: () =>
        set((s) => {
          const now = Date.now()
          const cur = regenHearts(s.hearts, s.heartsUpdatedAt, now)
          return { hearts: Math.max(0, cur.hearts - 1), heartsUpdatedAt: cur.hearts >= MAX_HEARTS ? now : cur.updatedAt }
        }),
      refillHearts: () => set({ hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setSound: (sound) => set({ sound }),
      resetProgress: () => set({ progress: {}, xp: 0, xpByDay: {}, streak: 0, lastActiveDay: null, hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() }),
    }),
    {
      name: 'leap-v1',
      version: 2,
      // v1 stored a Claude API key; drop it
      migrate: (persisted) => {
        const { apiKey: _drop, ...rest } = (persisted ?? {}) as Record<string, unknown>
        return rest as unknown as LearnState
      },
    },
  ),
)

export function useActiveCourse(): Course | undefined {
  return useLearn((s) => s.courses.find((c) => c.id === s.activeCourseId) ?? s.courses[0])
}
