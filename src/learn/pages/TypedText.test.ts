import { describe, expect, it } from 'vitest'
import { toChars, typingDelays } from './TypedText'

describe('typed text', () => {
  it('keeps key term emphasis on the right letters and drops the markers', () => {
    const chars = toChars('A **term** here')
    expect(chars.map((c) => c.c).join('')).toBe('A term here')
    expect(chars.filter((c) => c.em).map((c) => c.c).join('')).toBe('term')
  })
  it('pauses longer after a full stop than after a letter', () => {
    const chars = toChars('Hi. Ok')
    const d = typingDelays(chars)
    expect(d[2]).toBeGreaterThan(d[0] * 5)
  })
  it('finishes a long card within about seven seconds', () => {
    const chars = toChars('word '.repeat(120))
    const total = typingDelays(chars).reduce((a, b) => a + b, 0)
    expect(total).toBeLessThanOrEqual(7000)
  })
})

import { PARAGRAPH_PAUSE_MS } from './TypedText'
describe('paragraph pause', () => {
  it('is long enough to notice', () => {
    expect(PARAGRAPH_PAUSE_MS).toBeGreaterThanOrEqual(600)
  })
})
