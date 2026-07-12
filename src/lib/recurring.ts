import type { Frequency, RecurringItem } from '../types'
import { todayISO } from './dates'

function addFrequency(isoDate: string, freq: Frequency): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  switch (freq) {
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + 7)
      break
    case 'monthly':
    case 'quarterly':
    case 'yearly': {
      const months = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12
      // Clamp to the target month's length so "31st of each month" doesn't skip Feb
      const targetMonth = (m - 1 + months) % 12
      date.setUTCDate(1)
      date.setUTCMonth(date.getUTCMonth() + months)
      const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
      date.setUTCDate(Math.min(d, lastDay))
      if (date.getUTCMonth() !== targetMonth) date.setUTCDate(1) // shouldn't happen, guard anyway
      break
    }
  }
  return date.toISOString().slice(0, 10)
}

/** Occurrence dates of `item` due on or before `upTo` that haven't been posted yet. */
export function dueOccurrences(item: RecurringItem, upTo = todayISO()): string[] {
  if (item.paused) return []
  const dates: string[] = []
  let cursor = item.startDate
  // Skip forward past already-posted occurrences
  while (item.lastPostedDate && cursor <= item.lastPostedDate) {
    cursor = addFrequency(cursor, item.frequency)
  }
  while (cursor <= upTo && dates.length < 200) {
    dates.push(cursor)
    cursor = addFrequency(cursor, item.frequency)
  }
  return dates
}

/** The next date this item will fall due after everything currently posted. */
export function nextDueDate(item: RecurringItem): string {
  if (!item.lastPostedDate) return item.startDate
  let cursor = item.startDate
  while (cursor <= item.lastPostedDate) {
    cursor = addFrequency(cursor, item.frequency)
  }
  return cursor
}

/** Approximate monthly cost in pence (positive number) for subscription overviews. */
export function monthlyCost(item: RecurringItem): number {
  const abs = Math.abs(item.amountPence)
  switch (item.frequency) {
    case 'weekly':
      return Math.round((abs * 52) / 12)
    case 'monthly':
      return abs
    case 'quarterly':
      return Math.round(abs / 3)
    case 'yearly':
      return Math.round(abs / 12)
  }
}
