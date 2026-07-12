export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

/** "2026-07-12" -> "2026-07" */
export function monthKeyOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

export function currentMonthKey(): string {
  return monthKeyOf(todayISO())
}

/** "2026-07" -> "July 2026" */
export function formatMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function addMonthsToKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  const ny = Math.floor(total / 12)
  const nm = (total % 12) + 1
  return `${ny}-${String(nm).padStart(2, '0')}`
}

/** Last N month keys ending at `end` (inclusive), oldest first. */
export function lastMonthKeys(n: number, end = currentMonthKey()): string[] {
  return Array.from({ length: n }, (_, i) => addMonthsToKey(end, i - (n - 1)))
}

/**
 * UK tax year id for a date. The tax year runs 6 April – 5 April, so
 * 2026-04-06 onwards is "2026-27" and 2026-04-05 belongs to "2025-26".
 */
export function taxYearOf(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const startYear = m > 4 || (m === 4 && d >= 6) ? y : y - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function currentTaxYear(): string {
  return taxYearOf(todayISO())
}

/** [inclusive start, inclusive end] ISO dates of a tax year id like "2026-27". */
export function taxYearBounds(taxYearId: string): [string, string] {
  const startYear = Number(taxYearId.split('-')[0])
  return [`${startYear}-04-06`, `${startYear + 1}-04-05`]
}

export function formatTaxYear(taxYearId: string): string {
  return taxYearId.replace('-', '/')
}

/** Whole months between today and a future ISO date, minimum 1. */
export function monthsUntil(isoDate: string, from = todayISO()): number {
  const [fy, fm] = from.split('-').map(Number)
  const [ty, tm] = isoDate.split('-').map(Number)
  return Math.max(1, (ty - fy) * 12 + (tm - fm))
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
