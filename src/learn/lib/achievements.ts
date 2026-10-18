import type { Course, LessonProgress } from '../types'
import { dayKey, isCourseComplete, liveStreak } from './gamify'

export type StatKey = 'lessons' | 'streak' | 'crowns' | 'xp' | 'made' | 'quizzes' | 'finished'
export type Stats = Record<StatKey, number>

export interface Achievement {
  id: string
  icon: string
  name: string
  stat: StatKey
  /** Targets for level 1, 2, 3 and so on */
  tiers: number[]
  describe: (n: number) => string
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'lessons', icon: '🐣', name: 'First Steps', stat: 'lessons', tiers: [1, 5, 10, 25, 50, 100, 250], describe: (n) => `Finish ${plural(n, 'lesson')}` },
  { id: 'streak', icon: '🔥', name: 'On Fire', stat: 'streak', tiers: [3, 7, 14, 30, 60, 100, 365], describe: (n) => `Reach a ${n} day streak` },
  { id: 'crowns', icon: '👑', name: 'Perfectionist', stat: 'crowns', tiers: [5, 15, 30, 60, 100, 200], describe: (n) => `Ace ${plural(n, 'lesson')} with no mistakes` },
  { id: 'xp', icon: '🧠', name: 'Scholar', stat: 'xp', tiers: [500, 1000, 2500, 5000, 10000, 25000], describe: (n) => `Earn ${n.toLocaleString('en-GB')} XP` },
  { id: 'quizzes', icon: '🏆', name: 'Quiz Master', stat: 'quizzes', tiers: [1, 3, 5, 10, 20, 40], describe: (n) => `Pass ${plural(n, 'unit quiz', 'unit quizzes')}` },
  { id: 'finished', icon: '🎓', name: 'Finisher', stat: 'finished', tiers: [1, 3, 5, 10], describe: (n) => `Complete ${plural(n, 'course')}` },
  { id: 'made', icon: '🛠', name: 'Creator', stat: 'made', tiers: [1, 3, 5, 10], describe: (n) => `Make ${plural(n, 'course of your own', 'courses of your own')}` },
]

export interface StatSource {
  progress: Record<string, LessonProgress>
  courses: Course[]
  xp: number
  streak: number
  bestStreak?: number
  lastActiveDay: string | null
}

export function achievementStats(s: StatSource): Stats {
  const entries = Object.entries(s.progress)
  return {
    lessons: entries.filter(([k, p]) => !k.startsWith('quiz:') && p.completions && !p.skipped).length,
    streak: Math.max(s.bestStreak ?? 0, liveStreak(s.streak, s.lastActiveDay, dayKey())),
    crowns: entries.filter(([, p]) => p.bestAccuracy >= 1 && !p.skipped).length,
    xp: s.xp,
    made: s.courses.filter((c) => c.generator !== 'demo').length,
    quizzes: entries.filter(([k, p]) => k.startsWith('quiz:') && p.completions && !p.skipped).length,
    finished: s.courses.filter((c) => isCourseComplete(c, s.progress)).length,
  }
}

export interface AchievementState {
  a: Achievement
  value: number
  /** Levels reached, 0 when none yet */
  level: number
  /** Target for the next level, or null once everything is earned */
  next: number | null
}

export function achievementState(a: Achievement, stats: Stats): AchievementState {
  const value = stats[a.stat]
  const level = a.tiers.filter((t) => value >= t).length
  return { a, value, level, next: a.tiers[level] ?? null }
}

export const allAchievementStates = (stats: Stats) => ACHIEVEMENTS.map((a) => achievementState(a, stats))
