import { describe, expect, it } from 'vitest'
import { nextStep, outlineFrom, progressOf } from './draftSteps'
import type { Draft } from '../types'

const base: Draft = { id: 'd', title: 't', source: { kind: 'topic', label: 't' }, prompt: 'p', units: [], status: 'writing', updatedAt: 0 }
const outline = [
  { title: 'Unit 1', lessons: [{ title: 'A' }, { title: 'B' }] },
  { title: 'Unit 2', lessons: [{ title: 'C' }] },
]

describe('draft steps', () => {
  it('plans first, then lessons in order, then each unit quiz', () => {
    expect(nextStep(base)).toEqual({ kind: 'outline' })
    const d: Draft = { ...base, outline }
    expect(nextStep(d)).toEqual({ kind: 'lesson', u: 0, l: 0 })
    expect(nextStep({ ...d, units: [{ lessons: [{}] }] })).toEqual({ kind: 'lesson', u: 0, l: 1 })
    expect(nextStep({ ...d, units: [{ lessons: [{}, {}] }] })).toEqual({ kind: 'quiz', u: 0 })
    expect(nextStep({ ...d, units: [{ lessons: [{}, {}], quiz: [] }] })).toEqual({ kind: 'lesson', u: 1, l: 0 })
    expect(nextStep({ ...d, units: [{ lessons: [{}, {}], quiz: [] }, { lessons: [{}], quiz: [] }] })).toBeNull()
  })

  it('counts lessons written out of those planned', () => {
    const d: Draft = { ...base, outline, units: [{ lessons: [{}, {}], quiz: [] }, { lessons: [{}] }] }
    expect(progressOf(d)).toMatchObject({ lessons: 3, total: 3 })
    expect(progressOf({ ...base, outline, units: [{ lessons: [{}] }] }).lessons).toBe(1)
  })

  it('reads a plan and drops units with no lessons', () => {
    const { head, outline: o } = outlineFrom({ title: 'T', emoji: '🌋', units: [{ title: 'U', lessons: [{ title: 'L' }] }, { title: 'Empty', lessons: [] }] })
    expect(head.title).toBe('T')
    expect(o).toHaveLength(1)
  })
})
