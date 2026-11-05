import { describe, expect, it } from 'vitest'
import { buildDefiner } from './terms'
import type { Course } from '../types'

const course = (lessons: { teach: string[]; terms?: { t: string; d: string }[] }[]) =>
  ({ units: [{ lessons: lessons.map((l, i) => ({ id: `l${i}`, title: 'L', exercises: [], ...l })) }] }) as unknown as Course

describe('buildDefiner', () => {
  it('uses the definitions written for the course first', () => {
    const d = buildDefiner(course([{ teach: ['A **payoff** is whatever.'], terms: [{ t: 'Payoff', d: 'The reward for watching.' }] }]))
    expect(d('payoff')).toBe('The reward for watching.')
  })
  it('falls back on a sentence that says what the term is', () => {
    const d = buildDefiner(course([{ teach: ['A **format invariant** is the part of a series that stays stable.'] }]))
    expect(d('format invariant')).toBe('The part of a series that stays stable.')
  })
  it('finds the definition in another lesson of the course', () => {
    const d = buildDefiner(course([{ teach: ['Intro.'] }, { teach: ['**Retention** means how long viewers keep watching.'] }]))
    expect(d('Retention')).toBe('How long viewers keep watching.')
  })
  it('says nothing when no sentence defines the term', () => {
    const d = buildDefiner(course([{ teach: ['Low **CTR** alongside strong retention may signal a problem.'] }]))
    expect(d('CTR')).toBeNull()
  })
})
