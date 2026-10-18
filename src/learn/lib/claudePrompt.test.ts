import { describe, expect, it } from 'vitest'
import { buildFollowOnPrompt, buildPrompt, parseCourseJson } from './claudePrompt'
import { DEMO_COURSE } from '../demo'
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

  it('pitches content at adults', () => {
    const p = buildPrompt({ kind: 'topic', topic: 'Inflation' })
    expect(p).toContain('aged 25 and over')
    expect(p).toMatch(/never as children/)
  })

  it('puts a pasted video transcript in the prompt', () => {
    const p = buildPrompt({ kind: 'link', url: 'https://youtu.be/abc', transcript: 'Today we talk about bees and honey.' })
    expect(p).toContain('<transcript>\nToday we talk about bees and honey.\n</transcript>')
    expect(p).toContain('Stick to what is said')
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

describe('language courses', () => {
  it('keeps phrases, audio and lang when importing', () => {
    const raw = {
      title: 'Spanish',
      lang: 'es-ES',
      units: [{ title: 'U', lessons: [{ title: 'Hello', phrases: [{ text: 'Hola', say: 'OH-lah', meaning: 'Hello' }], exercises: [{ type: 'mcq', prompt: 'Listen', audio: 'Hola', options: ['Hello', 'Bye'], answer: 0 }, { type: 'tf', statement: 'a', answer: true }] }] }],
    }
    const c = normalizeCourse(raw, { kind: 'language', label: 'Spanish' }, 'claude')
    expect(c.lang).toBe('es-ES')
    expect(c.units[0].lessons[0].phrases?.[0].say).toBe('OH-lah')
    const first = c.units[0].lessons[0].exercises[0]
    expect(first.type === 'mcq' && first.audio).toBe('Hola')
  })
})

describe('harder prompts', () => {
  it('asks for hard multiple choice and fresh unit quizzes with real examples', () => {
    const p = buildPrompt({ kind: 'topic', topic: 'Inflation' })
    expect(p).toContain('genuinely hard')
    expect(p).toContain('must not be the longest')
    expect(p).toContain('Never reword or reuse a lesson question')
    expect(p).toContain('real world examples')
    expect(p).toContain('"quiz"')
  })
})

describe('buildFollowOnPrompt', () => {
  it('lists what is covered, asks for harder new units and carries the numbering on', () => {
    const p = buildFollowOnPrompt({ ...DEMO_COURSE, level: 1 })
    expect(p).toContain(DEMO_COURSE.units[0].title)
    expect(p).toContain('level 2')
    expect(p).toContain(`Unit ${DEMO_COURSE.units.length + 1}:`)
    expect(p).toContain('clearly harder')
    expect(p).toContain('JSON only')
  })

  it('has no long dashes', () => {
    expect(buildFollowOnPrompt(DEMO_COURSE)).not.toMatch(/[—–]/)
  })
})
