import type { Course, Exercise, Lesson, Phrase, SourceKind, Unit } from '../types'
import { shuffle } from './gamify'

export function uid(prefix = ''): string {
  return prefix + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')
const strs = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter(Boolean) : [])

const emojiOf = (v: unknown): string | undefined => {
  const e = [...str(v)].slice(0, 4).join('')
  return e && /\p{Extended_Pictographic}/u.test(e) ? e : undefined
}

export const BLANK = '___'

/** Turns loosely-shaped exercise JSON into a valid exercise, or null if unusable */
export function normalizeExercise(raw: unknown): Exercise | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const explanation = str(r.explanation) || undefined
  switch (r.type) {
    case 'mcq': {
      const options = strs(r.options)
      const answer = Number(r.answer)
      const prompt = str(r.prompt)
      if (!prompt || options.length < 2 || !Number.isInteger(answer) || !options[answer]) return null
      // Models like to put the right answer first; shuffle so position gives nothing away
      const correct = options[answer]
      const mixed = shuffle([...new Set(options)])
      return { type: 'mcq', prompt, options: mixed, answer: mixed.indexOf(correct), explanation, audio: str(r.audio) || undefined }
    }
    case 'tf': {
      const statement = str(r.statement) || str(r.prompt)
      if (!statement || typeof r.answer !== 'boolean') return null
      return { type: 'tf', statement, answer: r.answer, explanation }
    }
    case 'cloze': {
      let sentence = str(r.sentence) || str(r.prompt)
      const answer = str(r.answer)
      if (!sentence || !answer) return null
      if (!sentence.includes(BLANK)) {
        const at = sentence.toLowerCase().indexOf(answer.toLowerCase())
        if (at < 0) return null
        sentence = sentence.slice(0, at) + BLANK + sentence.slice(at + answer.length)
      }
      sentence = sentence.replace(/_{3,}/g, BLANK)
      const distractors = [...new Set(strs(r.distractors))].filter((d) => d.toLowerCase() !== answer.toLowerCase()).slice(0, 4)
      if (distractors.length < 1) return null
      return { type: 'cloze', sentence, answer, distractors, explanation }
    }
    case 'match': {
      const pairs = (Array.isArray(r.pairs) ? r.pairs : [])
        .map((p) => ({ left: str((p as Record<string, unknown>)?.left), right: str((p as Record<string, unknown>)?.right) }))
        .filter((p) => p.left && p.right)
        .slice(0, 5)
      if (pairs.length < 2) return null
      return { type: 'match', prompt: str(r.prompt) || 'Match the pairs', pairs }
    }
    default:
      return null
  }
}

const phrasesOf = (v: unknown): Phrase[] =>
  (Array.isArray(v) ? v : [])
    .map((p) => {
      const r = (p ?? {}) as Record<string, unknown>
      const words = (Array.isArray(r.words) ? r.words : [])
        .map((w) => ({ w: str((w as Record<string, unknown>)?.w), m: str((w as Record<string, unknown>)?.m) }))
        .filter((w) => w.w && w.m)
      return { text: str(r.text), say: str(r.say) || undefined, meaning: str(r.meaning), words: words.length ? words : undefined }
    })
    .filter((p) => p.text && p.meaning)
    .slice(0, 8)

export function normalizeCourse(raw: unknown, source: { kind: SourceKind; label: string }, generator: Course['generator']): Course {
  const r = (raw ?? {}) as Record<string, unknown>
  const units: Unit[] = (Array.isArray(r.units) ? r.units : [])
    .map((u): Unit => {
      const ur = (u ?? {}) as Record<string, unknown>
      const lessons: Lesson[] = (Array.isArray(ur.lessons) ? ur.lessons : [])
        .map((l): Lesson => {
          const lr = (l ?? {}) as Record<string, unknown>
          return {
            id: uid('l_'),
            title: str(lr.title) || 'Lesson',
            emoji: emojiOf(lr.emoji),
            teach: strs(lr.teach).slice(0, 4),
            phrases: phrasesOf(lr.phrases),
            exercises: (Array.isArray(lr.exercises) ? lr.exercises : []).map(normalizeExercise).filter((e): e is Exercise => !!e),
          }
        })
        .filter((l) => l.exercises.length >= 2)
      return { id: uid('u_'), title: str(ur.title) || 'Unit', emoji: emojiOf(ur.emoji), description: str(ur.description), lessons }
    })
    .filter((u) => u.lessons.length > 0)

  if (!units.length) throw new Error("Couldn't build any lessons from that source. Try a longer document or a different topic.")

  return {
    id: uid('c_'),
    title: str(r.title) || source.label,
    emoji: [...str(r.emoji)].slice(0, 4).join('') || '📘',
    lang: /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(str(r.lang)) ? str(r.lang) : undefined,
    summary: str(r.summary),
    source,
    generator,
    createdAt: new Date().toISOString(),
    units,
  }
}
