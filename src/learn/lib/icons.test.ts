import { describe, expect, it } from 'vitest'
import { Handshake, Rocket, Search, Shield, Sprout, Target, Wallet } from 'lucide-react'
import { iconFor } from './icons'

describe('iconFor', () => {
  it('matches the topic in a title', () => {
    expect(iconFor('Discovery Calls', '📞')).toBe(Search)
    expect(iconFor('Handling Objections', undefined)).toBe(Shield)
    expect(iconFor('Negotiating Prices', undefined)).toBe(Handshake)
    expect(iconFor('Pricing', undefined)).toBe(Wallet)
  })
  it('does not mistake planets for a plan, or learn for ear', () => {
    expect(iconFor('The Rocky Planets', undefined)).toBe(Rocket)
    expect(iconFor('Learn the Basics', undefined)).not.toBe(Target)
    expect(iconFor('Make a Plan', undefined)).toBe(Target)
  })
  it('falls back on the emoji the course came with', () => {
    expect(iconFor('Zzz Qqq', '🌱')).toBe(Sprout)
    expect(iconFor('Zzz Qqq', '🎯')).toBe(Target)
  })
  it('always gives an icon, and the same one every time', () => {
    expect(iconFor('Zzz', undefined, 3)).toBe(iconFor('Zzz', undefined, 3))
    expect(iconFor('', '👾')).toBeTruthy()
  })
})
