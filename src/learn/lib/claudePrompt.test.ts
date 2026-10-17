import { describe, expect, it } from 'vitest'
import { buildPrompt, parseCourseJson } from './claudePrompt'
import { normalizeCourse } from './normalize'

describe('buildPrompt', () => {
  it('includes the source and the file format', () => {
    const p = buildPrompt({ kind: 'topic', topic: 'Black holes' })
    expect(p).toContain('Black holes')
    expect(p).toContain('JSON only')
    expect(p).toContain('"exercises"')
  })

  it('asks for the attached PDF', () => {
    expect(buildPrompt({ kind: 'pdf', fileName: 'notes.pdf' })).toContain('PDF I\'ve attached (notes.pdf)')
  })

  it('has no long dashes', () => {
    expect(buildPrompt({ kind: 'link', url: 'https://x.y' })).not.toMatch(/[—–]/)
  })
})

describe('parseCourseJson', () => {
  const course = {
    title: 'Bees',
    units: [{ title: 'U', lessons: [{ title: 'L', teach: [], exercises: [{ type: 'tf', statement: 'a', answer: true }, { type: 'tf', statement: 'b', answer: false }] }] }],
  }

  it('reads plain JSON', () => {
    expect(parseCourseJson(JSON.stringify(course))).toEqual(course)
  })

  it('reads JSON inside a code fence with chat around it', () => {
    const reply = 'Here you go!\n```json\n' + JSON.stringify(course, null, 2) + '\n```\nEnjoy.'
    const parsed = parseCourseJson(reply)
    expect(normalizeCourse(parsed, { kind: 'topic', label: 'Bees' }, 'claude').title).toBe('Bees')
  })

  it('explains broken input', () => {
    expect(() => parseCourseJson('hello')).toThrow(/doesn't look like/)
    expect(() => parseCourseJson('{"title": ')).toThrow()
  })
})

describe('language prompt', () => {
  it('asks for phrases and audio', () => {
    const p = buildPrompt({ kind: 'language', language: 'Japanese' })
    expect(p).toContain('Japanese')
    expect(p).toContain('"phrases"')
    expect(p).toContain('"audio"')
    expect(p).not.toMatch(/[—–]/)
  })

  it('keeps phrases, audio and lang when importing', () => {
    const raw = {
      title: 'Spanish',
      lang: 'es-ES',
      units: [
        {
          title: 'U',
          lessons: [
            {
              title: 'Hello',
              phrases: [{ text: 'Hola', say: 'OH-lah', meaning: 'Hello' }],
              exercises: [
                { type: 'mcq', prompt: 'Listen', audio: 'Hola', options: ['Hello', 'Bye'], answer: 0 },
                { type: 'tf', statement: 'a', answer: true },
              ],
            },
          ],
        },
      ],
    }
    const c = normalizeCourse(raw, { kind: 'language', label: 'Spanish' }, 'claude')
    expect(c.lang).toBe('es-ES')
    expect(c.units[0].lessons[0].phrases?.[0].say).toBe('OH-lah')
    const first = c.units[0].lessons[0].exercises[0]
    expect(first.type === 'mcq' && first.audio).toBe('Hola')
  })
})
