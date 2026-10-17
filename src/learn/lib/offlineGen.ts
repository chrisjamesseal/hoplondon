/**
 * Builds a course from plain text with no AI: picks key terms by frequency and
 * turns informative sentences into gap-fills, true/false, multiple choice and
 * matching exercises. Used by Quick mode.
 */
import { shuffle } from './gamify'
import { BLANK } from './normalize'

const STOP = new Set(
  `a about above after again against all also although always am among an and any are around as at be became because become been before being below between both but by can could did do does doing done down during each either else even ever every few for from further had has have having he her here hers herself him himself his how however i if in into is it its itself just least less like made make many may me might more most much must my myself near need neither never no nor not now of off often on once one only onto or other others otherwise our ours ourselves out over own per perhaps rather same see seen she should since so some such than that the their theirs them themselves then there therefore these they this those though through thus to too toward under until up upon us use used uses using very via was we well were what whatever when where whether which while who whom whose why will with within without would yet you your yours yourself yourselves first second new known called including include includes several various within based different another way ways part parts number large small high low long time times year years day days back still get got given given give takes take takes much make makes made later early within become became almost usually generally often common commonly`.split(
    /\s+/,
  ),
)

const DROP_SECTIONS = /^(references|see also|external links|notes|further reading|bibliography|sources|citations|footnotes|acknowledg)/i

export interface Section {
  heading: string
  sentences: string[]
}

export function cleanText(text: string): string {
  return text
    .replace(/!\[[^\]]*]\([^)]*\)/g, ' ') // markdown images
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1') // markdown links
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/\[\d+(?:[,–-]\d+)*]/g, '') // [12] citation markers
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=["“(]?[A-Z0-9])/)
    .map((s) => s.trim())
    .filter((s) => {
      const words = s.split(' ').length
      return s.length >= 40 && s.length <= 240 && words >= 6 && /[.!?]$/.test(s) && !/[|{}<>]|\.{3}/.test(s)
    })
}

/** Splits text on wiki (== X ==) or markdown (# X) headings, else into even chunks */
export function toSections(text: string): Section[] {
  const lines = cleanText(text).split('\n')
  const raw: { heading: string; body: string[] }[] = [{ heading: '', body: [] }]
  for (const line of lines) {
    const h = line.match(/^\s*(?:={2,}\s*(.+?)\s*={2,}|#{1,4}\s+(.+?))\s*$/)
    if (h) raw.push({ heading: (h[1] ?? h[2]).replace(/[*_#]/g, '').trim(), body: [] })
    else raw[raw.length - 1].body.push(line)
  }

  const sections: Section[] = []
  let dropping = false
  for (const s of raw) {
    if (DROP_SECTIONS.test(s.heading)) dropping = true
    else if (s.heading && dropping && !/^=/.test(s.heading)) dropping = DROP_SECTIONS.test(s.heading)
    if (dropping) continue
    const sentences = s.body.join('\n').split(/\n\s*\n/).flatMap(splitSentences)
    if (sentences.length) sections.push({ heading: s.heading, sentences })
  }

  // Merge tiny sections into the previous one, split huge ones
  const merged: Section[] = []
  for (const s of sections) {
    const prev = merged[merged.length - 1]
    if (prev && (s.sentences.length < 4 || prev.sentences.length < 4)) {
      prev.sentences.push(...s.sentences)
      if (!prev.heading) prev.heading = s.heading
    } else merged.push({ ...s, sentences: [...s.sentences] })
  }
  const out: Section[] = []
  for (const s of merged) {
    for (let i = 0, part = 1; i < s.sentences.length; i += 14, part++) {
      const chunk = s.sentences.slice(i, i + 14)
      if (chunk.length < 3 && out.length) out[out.length - 1].sentences.push(...chunk)
      else out.push({ heading: s.sentences.length > 14 && s.heading ? `${s.heading} (${part})` : s.heading, sentences: chunk })
    }
  }
  return out
}

/** Ranks candidate key terms: frequent content words and repeated proper-noun phrases */
export function keyTerms(sentences: string[], max = 80): string[] {
  const counts = new Map<string, { n: number; form: string }>()
  const add = (form: string, weight = 1) => {
    const key = form.toLowerCase()
    const cur = counts.get(key)
    counts.set(key, { n: (cur?.n ?? 0) + weight, form: cur?.form ?? form })
  }
  for (const s of sentences) {
    const words = s.match(/[\p{L}][\p{L}'-]*[\p{L}]/gu) ?? []
    words.forEach((w, i) => {
      if (w.length >= 4 && !STOP.has(w.toLowerCase()) && !/'s$/.test(w)) add(i === 0 ? w.toLowerCase() : w)
    })
    for (const m of s.matchAll(/(?<!^)\b([A-Z][a-z]+(?:\s+(?:of\s+)?[A-Z][a-z]+)+)\b/g)) add(m[1], 2)
  }
  return [...counts.values()]
    .filter((c) => c.n >= 2)
    .sort((a, b) => b.n * Math.min(b.form.length, 12) - a.n * Math.min(a.form.length, 12))
    .slice(0, max)
    .map((c) => c.form)
}

function findTerm(sentence: string, terms: string[]): string | undefined {
  // Prefer longer, more specific terms, and never the very first word
  const sorted = [...terms].sort((a, b) => b.length - a.length)
  return sorted.find((t) => {
    const re = new RegExp(`(?<=\\s)${escapeRe(t)}(?=[\\s,.;:!?)])`, 'i')
    return re.test(sentence)
  })
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function blankOut(sentence: string, term: string): string {
  return sentence.replace(new RegExp(`(?<=\\s)${escapeRe(term)}(?=[\\s,.;:!?)])`, 'i'), BLANK)
}

function distractorsFor(term: string, pool: string[], n: number): string[] {
  const isProper = /^[A-Z]/.test(term)
  const multi = term.includes(' ')
  const lower = term.toLowerCase()
  const fits = pool.filter((t) => t.toLowerCase() !== lower && /^[A-Z]/.test(t) === isProper)
  const close = fits.filter((t) => t.includes(' ') === multi)
  return shuffle(close.length >= n ? close : fits).slice(0, n)
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…'
}

interface RawExercise {
  type: string
  [k: string]: unknown
}

function lessonExercises(sentences: string[], terms: string[]): RawExercise[] {
  const usable = sentences
    .map((s) => ({ s, term: findTerm(s, terms) }))
    .filter((x): x is { s: string; term: string } => !!x.term)
  const out: RawExercise[] = []
  const used = new Set<string>()

  const take = () => {
    const x = usable.find((u) => !used.has(u.s))
    if (x) used.add(x.s)
    return x
  }

  const plan = ['cloze', 'mcq', 'tf', 'cloze', 'tf', 'mcq', 'match']
  for (const kind of plan) {
    if (kind === 'match') {
      const pairs = usable
        .filter((u) => !used.has(u.s))
        .concat(usable)
        .reduce<{ left: string; right: string }[]>((acc, u) => {
          if (acc.length < 4 && !acc.some((p) => p.left.toLowerCase() === u.term.toLowerCase())) {
            acc.push({ left: u.term, right: truncate(blankOut(u.s, u.term), 90) })
          }
          return acc
        }, [])
      if (pairs.length >= 3) out.push({ type: 'match', prompt: 'Match each term to its clue', pairs })
      continue
    }
    const x = take()
    if (!x) break
    const distractors = distractorsFor(x.term, terms, 3)
    if (distractors.length < 2) continue
    if (kind === 'cloze') {
      out.push({ type: 'cloze', sentence: blankOut(x.s, x.term), answer: x.term, distractors, explanation: x.s })
    } else if (kind === 'mcq') {
      out.push({ type: 'mcq', prompt: `Which completes this?\n\n${blankOut(x.s, x.term)}`, options: [x.term, ...distractors], answer: 0, explanation: x.s })
    } else {
      const truth = Math.random() < 0.5
      const statement = truth ? x.s : blankOut(x.s, x.term).replace(BLANK, distractors[0])
      out.push({ type: 'tf', statement, answer: truth, explanation: truth ? 'This is exactly what the source says.' : `The source says: “${x.s}”` })
    }
  }
  return out
}

export function generateOffline(title: string, text: string) {
  const sections = toSections(text)
  const all = sections.flatMap((s) => s.sentences)
  if (all.length < 6) throw new Error('Not enough readable text to build lessons from. Try a longer document, or switch to With Claude.')
  const terms = keyTerms(all)

  const lessons = sections
    .slice(0, 15)
    .map((s, i) => {
      const lessonTerms = keyTerms(s.sentences, 20)
      const name = s.heading || (lessonTerms[0] ? `${capitalise(lessonTerms[0])} basics` : `Part ${i + 1}`)
      return {
        title: truncate(name, 40),
        teach: s.sentences.slice(0, 3),
        exercises: lessonExercises(s.sentences.slice(3).concat(s.sentences.slice(0, 3)), [...new Set([...lessonTerms, ...terms])]),
      }
    })
    .filter((l) => l.exercises.length >= 3)

  const units = []
  for (let i = 0; i < lessons.length; i += 3) {
    const group = lessons.slice(i, i + 3)
    units.push({
      title: `Unit ${units.length + 1}: ${group[0].title.replace(/ \(\d+\)$/, '')}`,
      description: group.map((l) => l.title).join(' · '),
      lessons: group,
    })
  }

  return { title, emoji: '📘', summary: `${lessons.length} lessons built from your source`, units }
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
