import { describe, expect, it } from 'vitest'
import { buildLanguageCourse, LANGUAGES, MEANINGS } from './phrasebook'

describe('phrasebook', () => {
  it.each(LANGUAGES.map((l) => [l.name, l] as const))('%s has all 10 phrases and builds a full course', (_n, lang) => {
    expect(lang.entries).toHaveLength(MEANINGS.length)
    for (const [text, say] of lang.entries) {
      expect(text.trim()).not.toBe('')
      expect(say.trim()).not.toBe('')
    }
    const course = buildLanguageCourse(lang)
    expect(course.lang).toBe(lang.lang)
    const lessons = course.units.flatMap((u) => u.lessons)
    expect(lessons).toHaveLength(5)
    expect(lessons.flatMap((l) => l.phrases ?? [])).toHaveLength(10)
    for (const l of lessons) {
      expect(l.exercises.map((e) => e.type)).toEqual(expect.arrayContaining(['mcq', 'tf', 'cloze', 'match']))
      for (const e of l.exercises) {
        if (e.type === 'cloze') expect(e.sentence.split('___')).toHaveLength(2)
        if (e.type === 'mcq') expect(new Set(e.options).size).toBe(e.options.length)
      }
    }
  })
})
