import { describe, expect, it } from 'vitest'
import { buildLanguageCourse, LANGUAGES, MEANINGS, similarIndexes } from './phrasebook'

const wordCount = (s: string) => s.replace(/\(.*?\)/g, '').trim().split(/\s+/).length

describe('phrasebook', () => {
  it.each(LANGUAGES.map((l) => [l.name, l] as const))('%s builds a full 5 unit course', (_n, lang) => {
    expect(lang.entries).toHaveLength(MEANINGS.length)
    for (const [text, say] of lang.entries) {
      expect(text.trim()).not.toBe('')
      expect(say.trim()).not.toBe('')
    }
    const course = buildLanguageCourse(lang)
    expect(course.lang).toBe(lang.lang)
    expect(course.units).toHaveLength(5)
    const lessons = course.units.flatMap((u) => u.lessons)
    expect(lessons).toHaveLength(14)
    // Every phrase is taught, and comes back in later lessons
    const taught = lessons.flatMap((l) => l.phrases ?? []).map((p) => p.text)
    expect(new Set(taught).size).toBe(10)
    expect(taught.length).toBeGreaterThan(20)
    for (const l of lessons) {
      expect(l.exercises.map((e) => e.type)).toEqual(expect.arrayContaining(['mcq', 'match']))
      for (const e of l.exercises) {
        if (e.type === 'cloze') expect(e.sentence.split('___')).toHaveLength(2)
        if (e.type === 'mcq') expect(new Set(e.options).size).toBe(e.options.length)
      }
    }
  })

  it('never offers a one word answer next to a longer phrase', () => {
    const de = LANGUAGES.find((l) => l.id === 'de')!
    for (const l of buildLanguageCourse(de).units.flatMap((u) => u.lessons)) {
      for (const e of l.exercises) {
        if (e.type !== 'mcq') continue
        const right = e.options[e.answer]
        if (wordCount(right) >= 3) for (const o of e.options) expect(wordCount(o)).toBeGreaterThan(1)
      }
    }
  })

  it('picks look-alike phrases as wrong answers', () => {
    // "Wie viel kostet das?" should be up against other questions, not "Ja" or "Nein"
    const de = LANGUAGES.find((l) => l.id === 'de')!
    const picks = similarIndexes(8, 3, (j) => de.entries[j][0]).map((j) => de.entries[j][0])
    expect(picks).not.toContain('Ja')
    expect(picks).not.toContain('Nein')
  })

  it('gives word by word meanings for multi word phrases', () => {
    const de = LANGUAGES.find((l) => l.id === 'de')!
    const phrase = buildLanguageCourse(de).units.flatMap((u) => u.lessons).flatMap((l) => l.phrases ?? []).find((p) => p.text === 'Wo ist die Toilette?')
    expect(phrase?.words?.map((w) => w.w)).toEqual(['Wo', 'ist', 'die', 'Toilette'])
  })
})
