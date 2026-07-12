import { describe, expect, it } from 'vitest'
import { formatPence, parseAmountToPence } from './money'

describe('parseAmountToPence', () => {
  it('parses plain and formatted amounts', () => {
    expect(parseAmountToPence('12')).toBe(1200)
    expect(parseAmountToPence('12.5')).toBe(1250)
    expect(parseAmountToPence('£1,234.56')).toBe(123456)
    expect(parseAmountToPence('-45.00')).toBe(-4500)
    expect(parseAmountToPence('(45.00)')).toBe(-4500)
    expect(parseAmountToPence('+3.20')).toBe(320)
  })

  it('rejects rubbish', () => {
    expect(parseAmountToPence('')).toBeNull()
    expect(parseAmountToPence('abc')).toBeNull()
    expect(parseAmountToPence('12.3.4')).toBeNull()
    expect(parseAmountToPence('.')).toBeNull()
  })
})

describe('formatPence', () => {
  it('formats with separators and sign', () => {
    expect(formatPence(123456)).toBe('£1,234.56')
    expect(formatPence(-4500)).toBe('-£45.00')
    expect(formatPence(4500, { sign: true })).toBe('+£45.00')
    expect(formatPence(5)).toBe('£0.05')
  })
})
