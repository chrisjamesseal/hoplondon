import { describe, expect, it } from 'vitest'
import { addMonthsToKey, lastMonthKeys, monthKeyOf, taxYearBounds, taxYearOf } from './dates'

describe('taxYearOf', () => {
  it('splits the year on 6 April', () => {
    expect(taxYearOf('2026-04-05')).toBe('2025-26')
    expect(taxYearOf('2026-04-06')).toBe('2026-27')
    expect(taxYearOf('2026-12-31')).toBe('2026-27')
    expect(taxYearOf('2026-01-01')).toBe('2025-26')
  })

  it('pads the short year across a century-ish boundary', () => {
    expect(taxYearOf('2099-05-01')).toBe('2099-00')
  })
})

describe('taxYearBounds', () => {
  it('returns 6 April to 5 April inclusive', () => {
    expect(taxYearBounds('2026-27')).toEqual(['2026-04-06', '2027-04-05'])
  })
})

describe('month keys', () => {
  it('extracts and offsets month keys across year boundaries', () => {
    expect(monthKeyOf('2026-07-12')).toBe('2026-07')
    expect(addMonthsToKey('2026-01', -1)).toBe('2025-12')
    expect(addMonthsToKey('2026-12', 1)).toBe('2027-01')
    expect(lastMonthKeys(3, '2026-01')).toEqual(['2025-11', '2025-12', '2026-01'])
  })
})
