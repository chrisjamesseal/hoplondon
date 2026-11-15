import { describe, expect, it } from 'vitest'
import { learnedPhrases, phrasebookEntries } from './learned'
import type { Course } from '../types'

const ph = (text: string) => ({ text, meaning: text.toUpperCase() })
const course = {
  units: [
    { lessons: [{ id: 'a', phrases: [ph('Hola'), ph('Adiós')] }, { id: 'b', phrases: [ph('Gracias')] }] },
    { lessons: [{ id: 'c', phrases: [ph('Hola'), ph('Sí')] }] },
  ],
} as unknown as Course

describe('learnedPhrases', () => {
  it('lists phrases from finished lessons only, once each, in course order', () => {
    const done = { completions: 1, bestAccuracy: 1, lastCompleted: 'x' }
    expect(learnedPhrases(course, { a: done, c: done }).map((p) => p.text)).toEqual(['Hola', 'Adiós', 'Sí'])
  })
  it('is empty before any lesson is finished', () => {
    expect(learnedPhrases(course, {})).toEqual([])
  })
})

describe('phrasebookEntries', () => {
  it('lists every phrase once, marking the ones from finished lessons', () => {
    const done = { completions: 1, bestAccuracy: 1, lastCompleted: 'x' }
    const out = phrasebookEntries(course, { a: done })
    expect(out.map((e) => [e.phrase.text, e.learned])).toEqual([['Hola', true], ['Adiós', true], ['Gracias', false], ['Sí', false]])
  })
})
