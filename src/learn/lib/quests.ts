export type QuestId = 'lesson' | 'xp' | 'review' | 'combo' | 'perfect'

export interface Quest {
  id: QuestId
  icon: string
  label: string
  target: number
}

export const QUEST_BONUS_XP = 10

const LESSON: Quest = { id: 'lesson', icon: '📘', label: 'Finish a lesson', target: 1 }
const POOL: Quest[] = [
  { id: 'xp', icon: '⚡', label: 'Earn 30 XP', target: 30 },
  { id: 'review', icon: '🎯', label: 'Do the daily review', target: 1 },
  { id: 'combo', icon: '🔥', label: 'Get 5 right in a row', target: 5 },
  { id: 'perfect', icon: '👑', label: 'Finish a lesson with no mistakes', target: 1 },
]

/** Three quests a day: always a lesson, plus two others that rotate with the date */
export function questsFor(day: string): Quest[] {
  const n = Math.floor(new Date(`${day}T12:00:00Z`).getTime() / 86_400_000)
  const a = n % POOL.length
  const b = (a + 1 + (Math.floor(n / POOL.length) % (POOL.length - 1))) % POOL.length
  return [LESSON, POOL[a], POOL[b]]
}

export interface QuestInputs {
  day: string
  lessons: number
  xp: number
  reviewDay: string | null
  daily: { day: string; combo: number; perfect: number }
}

export function questProgress(q: Quest, s: QuestInputs): number {
  const today = s.daily.day === s.day ? s.daily : { combo: 0, perfect: 0 }
  const value = { lesson: s.lessons, xp: s.xp, review: s.reviewDay === s.day ? 1 : 0, combo: today.combo, perfect: today.perfect }[q.id]
  return Math.min(q.target, value)
}

export const questKey = (day: string, id: string) => `${day}:${id}`
