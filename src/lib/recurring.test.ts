import { describe, expect, it } from 'vitest'
import { dueOccurrences, monthlyCost, nextDueDate } from './recurring'
import type { RecurringItem } from '../types'

const item = (over: Partial<RecurringItem>): RecurringItem => ({
  id: 'r1',
  name: 'Test',
  amountPence: -1000,
  categoryId: 'subscriptions',
  frequency: 'monthly',
  startDate: '2026-01-15',
  isBusiness: false,
  isSubscription: true,
  paused: false,
  ...over,
})

describe('dueOccurrences', () => {
  it('lists every unposted occurrence up to the given date', () => {
    expect(dueOccurrences(item({}), '2026-03-20')).toEqual(['2026-01-15', '2026-02-15', '2026-03-15'])
  })

  it('resumes after the last posted occurrence', () => {
    expect(dueOccurrences(item({ lastPostedDate: '2026-02-15' }), '2026-03-20')).toEqual(['2026-03-15'])
  })

  it('returns nothing when paused or not yet started', () => {
    expect(dueOccurrences(item({ paused: true }), '2026-03-20')).toEqual([])
    expect(dueOccurrences(item({ startDate: '2027-01-01' }), '2026-03-20')).toEqual([])
  })

  it('clamps month-end dates instead of skipping short months', () => {
    expect(dueOccurrences(item({ startDate: '2026-01-31' }), '2026-03-05')).toEqual(['2026-01-31', '2026-02-28'])
  })

  it('handles weekly and yearly frequencies', () => {
    expect(dueOccurrences(item({ frequency: 'weekly', startDate: '2026-06-01' }), '2026-06-15')).toEqual([
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
    ])
    expect(dueOccurrences(item({ frequency: 'yearly', startDate: '2025-05-01' }), '2026-06-01')).toEqual([
      '2025-05-01',
      '2026-05-01',
    ])
  })
})

describe('nextDueDate', () => {
  it('is the start date before anything is posted, then the following occurrence', () => {
    expect(nextDueDate(item({}))).toBe('2026-01-15')
    expect(nextDueDate(item({ lastPostedDate: '2026-02-15' }))).toBe('2026-03-15')
  })
})

describe('monthlyCost', () => {
  it('normalises each frequency to a monthly figure', () => {
    expect(monthlyCost(item({ amountPence: -1200, frequency: 'monthly' }))).toBe(1200)
    expect(monthlyCost(item({ amountPence: -1200, frequency: 'yearly' }))).toBe(100)
    expect(monthlyCost(item({ amountPence: -300, frequency: 'quarterly' }))).toBe(100)
    expect(monthlyCost(item({ amountPence: -1200, frequency: 'weekly' }))).toBe(5200)
  })
})
