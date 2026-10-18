import { describe, expect, it } from 'vitest'
import { GATE_APPS, lessonsLeft } from './gate'

describe('gate', () => {
  it('counts lessons left and never goes below zero', () => {
    expect(lessonsLeft(0, 2)).toBe(2)
    expect(lessonsLeft(1, 2)).toBe(1)
    expect(lessonsLeft(5, 2)).toBe(0)
  })
  it('has a link for each app', () => {
    for (const a of Object.values(GATE_APPS)) expect(a.url).toMatch(/^[a-z0-9]+:\/\//)
  })
})
