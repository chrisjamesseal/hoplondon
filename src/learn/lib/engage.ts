import type { Exercise } from '../types'

/** What identifies a question across sessions, whatever shape it was shown in */
export function exSig(ex: Exercise): string {
  const text = ex.type === 'tf' ? ex.statement : ex.type === 'cloze' ? ex.sentence : ex.prompt
  return text.replace(/\s+/g, ' ').trim().slice(0, 100)
}

export const WEAK_CAP = 40

export const FROG_GOOD = ['Ribbit! Nice one', 'Hop hop hooray', 'Leaping ahead', 'Frog approved', 'Smooth jump']
export const FROG_BAD = ['Shake it off', 'Mistakes make it stick', 'You will nail it next time', 'Back on the lily pad']

/** How the combo reads once the learner is on a run of first time answers */
export function comboLabel(n: number): string | null {
  if (n < 3) return null
  if (n >= 10) return `${n} in a row. Unstoppable`
  if (n >= 6) return `${n} in a row. On fire`
  return `${n} in a row`
}

export function frogLine(correct: boolean, n: number): string {
  const pool = correct ? FROG_GOOD : FROG_BAD
  return pool[n % pool.length]
}

/** A closing line from the frog for the finish screen */
export function frogVerdict(accuracy: number): string {
  if (accuracy >= 1) return 'Flawless. The frog is seriously impressed.'
  if (accuracy >= 0.8) return 'Strong work. Nearly spotless.'
  if (accuracy >= 0.5) return 'Solid. Your weak spots will come back for practice.'
  return 'Tough one. Practice will help it stick.'
}

/** Weak questions first (up to six), then the rest, no repeats */
export function pickPractice<T extends { ex: Exercise }>(pool: T[], weak: Set<string>, size: number, shuffle: <U>(a: U[]) => U[]): T[] {
  const seen = new Set<string>()
  const unique = pool.filter((p) => {
    const k = exSig(p.ex)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
  const weakOnes = shuffle(unique.filter((p) => weak.has(exSig(p.ex)))).slice(0, 6)
  const rest = shuffle(unique.filter((p) => !weakOnes.includes(p)))
  return shuffle([...weakOnes, ...rest].slice(0, size))
}
