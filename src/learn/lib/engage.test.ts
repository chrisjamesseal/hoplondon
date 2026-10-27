import { describe, expect, it } from 'vitest'
import { comboLabel, exSig, pickPractice } from './engage'
import type { Exercise } from '../types'

const tf = (s: string): Exercise => ({ type: 'tf', statement: s, answer: true })

describe('engage', () => {
  it('combo shows from three in a row', () => {
    expect(comboLabel(2)).toBeNull()
    expect(comboLabel(3)).toBe('3 in a row')
    expect(comboLabel(7)).toContain('On fire')
  })
  it('signature ignores the shape the question was shown in', () => {
    expect(exSig({ type: 'cloze', sentence: 'A ___ b', answer: 'x', distractors: ['y'] })).toBe(exSig({ type: 'type', prompt: 'A ___ b', answer: 'x' }))
  })
  it('practice puts weak questions in and removes duplicates', () => {
    const pool = [...'abcdefghij'].map((c) => ({ ex: tf(c) }))
    const out = pickPractice([...pool, { ex: tf('a') }], new Set(['j']), 4, (a) => a)
    expect(out).toHaveLength(4)
    expect(out.some((p) => exSig(p.ex) === 'j')).toBe(true)
    expect(new Set(out.map((p) => exSig(p.ex))).size).toBe(4)
  })
})

import { normalizeExercise } from './normalize'
describe('order exercises', () => {
  it('normalises a valid order question', () => {
    expect(normalizeExercise({ type: 'order', prompt: 'Order', items: ['a', 'b', 'c'] })).toMatchObject({ type: 'order', items: ['a', 'b', 'c'] })
  })
  it('rejects one with too few items', () => {
    expect(normalizeExercise({ type: 'order', prompt: 'Order', items: ['a', 'b'] })).toBeNull()
  })
})
