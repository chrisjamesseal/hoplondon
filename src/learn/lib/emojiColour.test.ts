import { describe, expect, it } from 'vitest'
import { clashPenalty, hueDistance, needsPlate, PALETTE, pickUnitColours, type Tone } from './emojiColour'

const hueOf = (name: string) => PALETTE.find((c) => c.name === name)!.hue
/** A vivid emoji that is all one colour, e.g. a green puzzle piece at hue 100 */
const single = (hue: number, strength = 0.6): Tone => {
  const bins = new Array(12).fill(0)
  bins[Math.floor(hue / 30)] = 1
  return { bins, strength }
}
const grey: Tone = { bins: new Array(12).fill(0), strength: 0 }

describe('hueDistance', () => {
  it('wraps around the colour wheel', () => {
    expect(hueDistance(350, 10)).toBe(20)
    expect(hueDistance(0, 180)).toBe(180)
    expect(hueDistance(100, 100)).toBe(0)
  })
})

describe('clashPenalty', () => {
  const green = single(100)
  it('is high when the emoji blends into the background', () => {
    expect(clashPenalty(green, hueOf('green'))).toBeGreaterThan(0.4)
  })
  it('is moderate when it sits right opposite', () => {
    expect(clashPenalty(green, hueOf('purple'))).toBeGreaterThan(0.25)
  })
  it('is zero when the colours sit comfortably apart', () => {
    expect(clashPenalty(green, hueOf('blue'))).toBe(0)
  })
  it('ignores grey and unmeasured emoji', () => {
    expect(clashPenalty(grey, hueOf('green'))).toBe(0)
    expect(clashPenalty(null, hueOf('green'))).toBe(0)
  })
  it('asks for a plate only when the clash is clear', () => {
    expect(needsPlate(green, hueOf('green'))).toBe(true)
    expect(needsPlate(green, hueOf('purple'))).toBe(true)
    expect(needsPlate(green, hueOf('blue'))).toBe(false)
    expect(needsPlate(grey, hueOf('green'))).toBe(false)
  })
})

describe('pickUnitColours', () => {
  it('avoids both the matching and the opposite colour for a green emoji', () => {
    const [colour] = pickUnitColours([{ tones: [single(100)], main: single(100) }])
    expect(colour).not.toBe('green')
    expect(colour).not.toBe('purple')
    expect(clashPenalty(single(100), hueOf(colour))).toBe(0)
  })

  it('keeps the usual rotation when no emoji clashes', () => {
    const units = Array.from({ length: 4 }, () => ({ tones: [grey], main: grey }))
    expect(pickUnitColours(units)).toEqual(['green', 'blue', 'purple', 'orange'])
  })

  it('does not give neighbouring units the same colour', () => {
    const units = Array.from({ length: 5 }, () => ({ tones: [single(100)], main: single(100) }))
    const colours = pickUnitColours(units)
    colours.slice(1).forEach((c, i) => expect(c).not.toBe(colours[i]))
  })

  it('does not break on a unit with no measured emoji', () => {
    expect(pickUnitColours([{ tones: [null], main: null }, { tones: [], main: null }])).toEqual(['green', 'blue'])
  })
})
