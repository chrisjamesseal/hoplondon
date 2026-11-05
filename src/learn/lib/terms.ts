import type { Course } from '../types'

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim()
const plain = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1')
const sentences = (s: string) => plain(s).split(/(?<=[.!?])\s+/)

const IS = /\b(?:is|are|means|refers to|describes|stands for)\b\s+/i

/** Pulls "…is the part that stays stable" out of a sentence that defines the term */
function fromSentence(term: string, sentence: string): string | null {
  const at = sentence.toLowerCase().indexOf(term.toLowerCase())
  if (at < 0) return null
  const after = sentence.slice(at + term.length)
  const m = after.match(IS)
  if (!m || m.index === undefined || m.index > 12) return null
  const rest = after.slice(m.index + m[0].length).replace(/[.!?]\s*$/, '').trim()
  if (rest.split(/\s+/).length < 3) return null
  return rest.charAt(0).toUpperCase() + rest.slice(1) + '.'
}

/**
 * Works out what a key term means. The course's own definitions come first.
 * Courses made before definitions existed fall back on a sentence in the
 * lessons that says what the term is.
 */
export function buildDefiner(course: Course | undefined): (term: string) => string | null {
  const given = new Map<string, string>()
  const texts: string[] = []
  for (const u of course?.units ?? [])
    for (const l of u.lessons) {
      for (const t of l.terms ?? []) given.set(norm(t.t), t.d)
      texts.push(...l.teach)
    }
  const found = new Map<string, string | null>()
  return (term) => {
    const key = norm(term)
    if (given.has(key)) return given.get(key)!
    if (found.has(key)) return found.get(key)!
    let out: string | null = null
    for (const t of texts) {
      for (const s of sentences(t)) {
        out = fromSentence(term, s)
        if (out) break
      }
      if (out) break
    }
    found.set(key, out)
    return out
  }
}
