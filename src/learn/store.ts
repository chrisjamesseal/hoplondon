import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Course, LessonProgress, Unit } from './types'
import { DEMO_COURSE } from './demo'
import { buildLanguageCourse, languageLabel, LANGUAGES } from './lib/phrasebook'
import { WEAK_CAP } from './lib/engage'
import { applyFreeze, MAX_FREEZES } from './lib/freeze'
import { QUEST_BONUS_XP, questKey, questsFor } from './lib/quests'
import { bumpStreak, dayKey, lessonsOn, MAX_HEARTS, regenHearts } from './lib/gamify'

interface LearnState {
  courses: Course[]
  activeCourseId: string | null
  progress: Record<string, LessonProgress>
  xp: number
  xpByDay: Record<string, number>
  lessonsByDay: Record<string, number>
  streak: number
  /** Longest streak ever reached, so streak achievements stay earned after a break */
  bestStreak: number
  lastActiveDay: string | null
  hearts: number
  heartsUpdatedAt: number
  dailyGoal: number
  dailyLessons: number
  sound: boolean
  /** Finished courses tucked away on the Courses page */
  archived: string[]
  /** Questions answered wrong, brought back first in practice until they are right */
  weak: string[]
  /** Streak freezes in the bank, each covers one missed day */
  freezes: number
  /** Today's best combo and perfect lessons, for the daily quests */
  daily: { day: string; combo: number; perfect: number }
  reviewDay: string | null
  /** Quest bonuses already taken, as day:quest */
  claimed: string[]

  addCourse: (c: Course) => void
  /** Adds new units to the end of a course and raises its level, keeping all progress */
  extendCourse: (id: string, units: Unit[]) => void
  /** Swaps one difficulty level's units for rewritten ones, keeping progress by position */
  replaceLevel: (id: string, level: number, units: Unit[]) => void
  deleteCourse: (id: string) => void
  setActiveCourse: (id: string) => void
  completeLesson: (lessonId: string, accuracy: number, xp: number) => void
  finishPractice: (xp: number, review?: boolean) => void
  noteCombo: (n: number) => void
  claimQuest: (id: string) => void
  useFreezeIfNeeded: () => void
  /** Marks steps as done after a jump test, without touching ones already done */
  skipSteps: (ids: string[]) => void
  /** Marks steps as done with no XP or streak, for catching a course up to where the learner was */
  markStepsDone: (ids: string[]) => void
  archiveCourse: (id: string) => void
  unarchiveCourse: (id: string) => void
  syncHearts: () => void
  loseHeart: () => void
  refillHearts: () => void
  setDailyGoal: (n: number) => void
  setDailyLessons: (n: number) => void
  setSound: (on: boolean) => void
  addWeak: (sig: string) => void
  clearWeak: (sig: string) => void
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
      lessonsByDay: {},
      streak: 0,
      bestStreak: 0,
      lastActiveDay: null,
      hearts: MAX_HEARTS,
      heartsUpdatedAt: Date.now(),
      dailyGoal: 30,
      dailyLessons: 2,
      sound: true,
      archived: [],
      weak: [],
      freezes: 1,
      daily: { day: '', combo: 0, perfect: 0 },
      reviewDay: null,
      claimed: [],

      addCourse: (c) => set((s) => ({ courses: [c, ...s.courses], activeCourseId: c.id })),
      extendCourse: (id, units) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== id) return c
            const level = (c.level ?? 1) + 1
            return { ...c, units: [...c.units, ...units.map((u) => ({ ...u, level }))], level }
          }),
          archived: (s.archived ?? []).filter((x) => x !== id),
          activeCourseId: id,
        })),
      replaceLevel: (id, level, units) =>
        set((s) => ({
          courses: s.courses.map((c) => {
            if (c.id !== id) return c
            const old = c.units.filter((u) => (u.level ?? 1) === level)
            const first = c.units.findIndex((u) => (u.level ?? 1) === level)
            const fresh = units.map((u, i) => ({
              ...u,
              id: old[i]?.id ?? u.id,
              level,
              lessons: u.lessons.map((l, j) => ({ ...l, id: old[i]?.lessons[j]?.id ?? l.id })),
            }))
            const rest = c.units.filter((u) => (u.level ?? 1) !== level)
            const at = first < 0 ? rest.length : c.units.slice(0, first).filter((u) => (u.level ?? 1) !== level).length
            return { ...c, units: [...rest.slice(0, at), ...fresh, ...rest.slice(at)] }
          }),
          activeCourseId: id,
        })),
      deleteCourse: (id) =>
        set((s) => {
          const course = s.courses.find((c) => c.id === id)
          const lessonIds = new Set(course?.units.flatMap((u) => u.lessons.map((l) => l.id)))
          const courses = s.courses.filter((c) => c.id !== id)
          for (const u of course?.units ?? []) lessonIds.add(`quiz:${u.id}`)
          return {
            courses,
            archived: (s.archived ?? []).filter((x) => x !== id),
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
            daily: { day: today, combo: s.daily?.day === today ? s.daily.combo : 0, perfect: (s.daily?.day === today ? s.daily.perfect : 0) + (accuracy >= 1 ? 1 : 0) },
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
            lessonsByDay: { ...s.lessonsByDay, [today]: lessonsOn(today, s.lessonsByDay, s.progress) + 1 },
            streak: bumpStreak(s.streak, s.lastActiveDay, today),
            bestStreak: Math.max(s.bestStreak ?? 0, bumpStreak(s.streak, s.lastActiveDay, today)),
            lastActiveDay: today,
          }
        }),
      finishPractice: (xp, review) =>
        set((s) => {
          const today = dayKey()
          return {
            reviewDay: review ? today : s.reviewDay,
            xp: s.xp + xp,
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + xp },
            streak: bumpStreak(s.streak, s.lastActiveDay, today),
            bestStreak: Math.max(s.bestStreak ?? 0, bumpStreak(s.streak, s.lastActiveDay, today)),
            lastActiveDay: today,
            hearts: MAX_HEARTS,
            heartsUpdatedAt: Date.now(),
          }
        }),
      skipSteps: (ids) =>
        set((s) => {
          const today = dayKey()
          const progress = { ...s.progress }
          for (const id of ids) {
            if (!progress[id]?.completions) progress[id] = { completions: 1, bestAccuracy: 0, lastCompleted: today, skipped: true }
          }
          return { progress, streak: bumpStreak(s.streak, s.lastActiveDay, today), bestStreak: Math.max(s.bestStreak ?? 0, bumpStreak(s.streak, s.lastActiveDay, today)), lastActiveDay: today }
        }),
      markStepsDone: (ids) =>
        set((s) => {
          const progress = { ...s.progress }
          for (const id of ids) {
            if (!progress[id]?.completions) progress[id] = { completions: 1, bestAccuracy: 0, lastCompleted: dayKey(), skipped: true }
          }
          return { progress }
        }),
      archiveCourse: (id) =>
        set((s) => {
          const archived = [...new Set([...(s.archived ?? []), id])]
          const live = s.courses.filter((c) => !archived.includes(c.id))
          return { archived, activeCourseId: s.activeCourseId === id ? (live[0]?.id ?? id) : s.activeCourseId }
        }),
      unarchiveCourse: (id) => set((s) => ({ archived: (s.archived ?? []).filter((x) => x !== id), activeCourseId: id })),
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
      noteCombo: (n) =>
        set((s) => {
          const today = dayKey()
          const cur = s.daily?.day === today ? s.daily : { day: today, combo: 0, perfect: 0 }
          return n > cur.combo ? { daily: { ...cur, combo: n } } : s.daily?.day === today ? s : { daily: cur }
        }),
      claimQuest: (id) =>
        set((s) => {
          const today = dayKey()
          const key = questKey(today, id)
          if ((s.claimed ?? []).includes(key)) return s
          const claimed = [...(s.claimed ?? []), key]
          let freezes = s.freezes ?? 0
          // Taking all three bonuses earns a streak freeze
          const all = questsFor(today).every((q) => claimed.includes(questKey(today, q.id)))
          if (all && !claimed.includes(questKey(today, 'all'))) {
            claimed.push(questKey(today, 'all'))
            freezes = Math.min(MAX_FREEZES, freezes + 1)
          }
          return {
            claimed: claimed.slice(-60),
            freezes,
            xp: s.xp + QUEST_BONUS_XP,
            xpByDay: { ...s.xpByDay, [today]: (s.xpByDay[today] ?? 0) + QUEST_BONUS_XP },
          }
        }),
      useFreezeIfNeeded: () =>
        set((s) => {
          const r = applyFreeze(s.lastActiveDay, s.freezes ?? 0, dayKey())
          return r.used ? { lastActiveDay: r.last, freezes: r.freezes } : s
        }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal }),
      setDailyLessons: (dailyLessons) => set({ dailyLessons }),
      setSound: (sound) => set({ sound }),
      addWeak: (sig) => set((s) => ((s.weak ?? []).includes(sig) ? s : { weak: [...(s.weak ?? []), sig].slice(-WEAK_CAP) })),
      clearWeak: (sig) => set((s) => ((s.weak ?? []).includes(sig) ? { weak: (s.weak ?? []).filter((x) => x !== sig) } : s)),
      resetProgress: () => set({ weak: [], freezes: 1, daily: { day: '', combo: 0, perfect: 0 }, reviewDay: null, claimed: [], progress: {}, xp: 0, xpByDay: {}, lessonsByDay: {}, streak: 0, bestStreak: 0, lastActiveDay: null, hearts: MAX_HEARTS, heartsUpdatedAt: Date.now() }),
    }),
    {
      name: 'leap-v1',
      version: 6,
      migrate: (persisted, version) => {
        // v1 stored a Claude API key; drop it
        const { apiKey: _drop, ...rest } = (persisted ?? {}) as Record<string, unknown>
        // v3 rewrote the starter course; lesson ids are unchanged so progress carries over
        if (Array.isArray(rest.courses)) {
          rest.courses = (rest.courses as Course[]).map((c) => (c.id === DEMO_COURSE.id ? DEMO_COURSE : c))
        }
        // v4 grew the travel phrase courses to 5 units, v6 to 15 phrases; carry progress over by lesson title
        if (version < 6 && Array.isArray(rest.courses)) {
          const progress = { ...((rest.progress ?? {}) as Record<string, LessonProgress>) }
          rest.courses = (rest.courses as Course[]).map((c) => {
            const lang = c.source.kind === 'language' ? LANGUAGES.find((l) => languageLabel(l) === c.source.label) : undefined
            if (!lang) return c
            const fresh = { ...buildLanguageCourse(lang), id: c.id, createdAt: c.createdAt }
            const newByTitle = new Map(fresh.units.flatMap((u) => u.lessons).reverse().map((l) => [l.title, l.id]))
            // The old last round of phrases is now the middle one
            const renamed: Record<string, string> = { 'Last five': 'Next five' }
            for (const old of c.units.flatMap((u) => u.lessons)) {
              const to = newByTitle.get(renamed[old.title] && !c.units.some((u) => u.lessons.some((l) => l.title === 'Next five')) ? renamed[old.title] : old.title)
              if (to && progress[old.id]) progress[to] = progress[old.id]
            }
            return fresh
          })
          rest.progress = progress
        }
        return rest as unknown as LearnState
      },
    },
  ),
)

export function useActiveCourse(): Course | undefined {
  return useLearn((s) => s.courses.find((c) => c.id === s.activeCourseId) ?? s.courses[0])
}
