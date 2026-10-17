import { describe, expect, it } from 'vitest'
import { normalizeCourse, normalizeExercise } from './normalize'

describe('normalizeExercise', () => {
  it('keeps the right MCQ answer after shuffling', () => {
    for (let i = 0; i < 20; i++) {
      const e = normalizeExercise({ type: 'mcq', prompt: 'Capital of France?', options: ['Paris', 'Rome', 'Oslo'], answer: 0 })
      expect(e?.type).toBe('mcq')
      if (e?.type === 'mcq') expect(e.options[e.answer]).toBe('Paris')
    }
  })

  it('rejects an MCQ whose answer index is out of range', () => {
    expect(normalizeExercise({ type: 'mcq', prompt: 'x', options: ['a', 'b'], answer: 5 })).toBeNull()
  })

  it('inserts the blank into a cloze sentence when missing', () => {
    const e = normalizeExercise({ type: 'cloze', sentence: 'Plants use photosynthesis to make food.', answer: 'photosynthesis', distractors: ['osmosis'] })
    expect(e).toMatchObject({ sentence: 'Plants use ___ to make food.' })
  })

  it('needs at least two match pairs', () => {
    expect(normalizeExercise({ type: 'match', pairs: [{ left: 'a', right: 'b' }] })).toBeNull()
  })
})

describe('normalizeCourse', () => {
  it('drops lessons with too few valid exercises and throws when nothing is left', () => {
    expect(() =>
      normalizeCourse({ units: [{ title: 'U', lessons: [{ title: 'L', exercises: [{ type: 'tf', statement: 'x', answer: true }] }] }] }, { kind: 'topic', label: 't' }, 'claude'),
    ).toThrow()
  })

  it('builds ids and falls back to the source label for the title', () => {
    const c = normalizeCourse(
      { units: [{ title: 'U', lessons: [{ title: 'L', exercises: [{ type: 'tf', statement: 'x', answer: true }, { type: 'tf', statement: 'y', answer: false }] }] }] },
      { kind: 'topic', label: 'Volcanoes' },
      'claude',
    )
    expect(c.title).toBe('Volcanoes')
    expect(c.units[0].lessons[0].id).toMatch(/^l_/)
  })
})
