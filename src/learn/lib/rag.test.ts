import { describe, expect, it } from 'vitest'
import { ragOf } from './rag'

describe('ragOf', () => {
  it('is red under a third, amber to two thirds, green after', () => {
    expect(ragOf(0)).toBe('red')
    expect(ragOf(0.33)).toBe('red')
    expect(ragOf(0.34)).toBe('amber')
    expect(ragOf(0.5)).toBe('amber')
    expect(ragOf(0.67)).toBe('green')
    expect(ragOf(1)).toBe('green')
  })
})
