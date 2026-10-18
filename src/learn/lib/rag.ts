export type Rag = 'red' | 'amber' | 'green'

/** Red under a third, amber up to two thirds, green from there */
export function ragOf(ratio: number): Rag {
  if (ratio >= 2 / 3) return 'green'
  if (ratio >= 1 / 3) return 'amber'
  return 'red'
}
