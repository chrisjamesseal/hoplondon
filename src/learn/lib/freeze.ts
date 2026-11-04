import { daysBetween, dayKey } from './gamify'

export const MAX_FREEZES = 2

/**
 * A streak freeze covers exactly one missed day. When the learner comes back
 * the day after a miss, a freeze is used up and yesterday counts as done, so
 * the streak carries on. Longer gaps are not covered.
 */
export function applyFreeze(last: string | null, freezes: number, today: string): { last: string | null; freezes: number; used: boolean } {
  if (!last || freezes <= 0 || daysBetween(last, today) !== 2) return { last, freezes, used: false }
  const [y, m, d] = today.split('-').map(Number)
  const yesterday = dayKey(new Date(y, m - 1, d - 1))
  return { last: yesterday, freezes: freezes - 1, used: true }
}
