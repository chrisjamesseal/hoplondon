import type { Draft, OutlineUnit } from '../types'

/** A course is written in small steps: the plan, then each lesson, then each unit's quiz */
export type Step = { kind: 'outline' } | { kind: 'lesson'; u: number; l: number } | { kind: 'quiz'; u: number }

interface Built {
  title?: string
  lessons: unknown[]
  quiz?: unknown[]
}

const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown): string => (typeof v === 'string' ? v : '')
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export function outlineFrom(raw: unknown): { head: NonNullable<Draft['head']>; outline: OutlineUnit[] } {
  const r = rec(raw)
  const outline = arr(r.units)
    .map((u): OutlineUnit => {
      const o = rec(u)
      return {
        title: str(o.title) || 'Unit',
        emoji: str(o.emoji) || undefined,
        description: str(o.description),
        lessons: arr(o.lessons).map((l) => {
          const q = rec(l)
          return { title: str(q.title) || 'Lesson', emoji: str(q.emoji) || undefined, why: str(q.why) || undefined }
        }),
      }
    })
    .filter((u) => u.lessons.length > 0)
  return { head: { title: str(r.title) || undefined, emoji: str(r.emoji) || undefined, summary: str(r.summary) || undefined, lang: str(r.lang) || undefined }, outline }
}

export function nextStep(d: Draft): Step | null {
  if (!d.outline) return { kind: 'outline' }
  for (let u = 0; u < d.outline.length; u++) {
    const built = d.units[u] as Built | undefined
    const have = built?.lessons.length ?? 0
    if (have < d.outline[u].lessons.length) return { kind: 'lesson', u, l: have }
    if (!built?.quiz) return { kind: 'quiz', u }
  }
  return null
}

/** How far along: lessons done of lessons planned, and a 0 to 1 share counting quizzes too */
export function progressOf(d: Draft): { lessons: number; total: number; ratio: number } {
  if (!d.outline) return { lessons: 0, total: 0, ratio: 0 }
  let lessons = 0
  let total = 0
  let steps = 0
  let done = 0
  d.outline.forEach((o, i) => {
    const b = d.units[i] as Built | undefined
    total += o.lessons.length
    lessons += Math.min(b?.lessons.length ?? 0, o.lessons.length)
    steps += o.lessons.length + 1
    done += Math.min(b?.lessons.length ?? 0, o.lessons.length) + (b?.quiz ? 1 : 0)
  })
  return { lessons, total, ratio: steps ? done / steps : 0 }
}

export const describeStep = (d: Draft, s: Step): string => {
  if (s.kind === 'outline' || !d.outline) return 'Planning the course'
  const o = d.outline[s.u]
  return s.kind === 'lesson' ? `Writing ${o.lessons[s.l].title}` : `Writing the quiz for ${o.title}`
}

const outlineText = (d: Draft): string => (d.outline ?? []).map((u, i) => `Unit ${i + 1}: ${u.title}\n${u.lessons.map((l, j) => `  ${j + 1}. ${l.title}`).join('\n')}`).join('\n')

const promptOf = (e: unknown): string => {
  const r = rec(e)
  return str(r.prompt) || str(r.statement) || str(r.sentence)
}

const ONLY_JSON = 'Reply with only that JSON, with no text before or after it.'

export function promptFor(d: Draft, s: Step): string {
  if (s.kind === 'outline') {
    return `${d.prompt}

I am building this course in small steps. Right now write ONLY the plan: no teaching, no exercises, no quiz yet. This replaces the output format above. Reply with exactly this shape, with every unit and every lesson listed:
{ "title": "Course title", "emoji": "🌋", "summary": "One sentence on what the learner will be able to do", "lang": "only for a language course, such as es-ES", "units": [ { "title": "Unit 1: The foundations", "emoji": "🌱", "description": "Short line on what this unit covers", "lessons": [ { "title": "Max 5 words", "emoji": "🔭", "why": "One or two sentences on why this matters in real life." } ] } ] }
${ONLY_JSON}`
  }
  const unit = d.outline![s.u]
  const built = d.units[s.u] as Built | undefined
  if (s.kind === 'lesson') {
    const before = (built?.lessons ?? []).map((l) => `- ${str(rec(l).title)}`).join('\n')
    return `${d.prompt}

I am building this course one lesson at a time. Here is the plan, which you must follow:
${outlineText(d)}

Right now write ONLY Unit ${s.u + 1}, lesson ${s.l + 1}: "${unit.lessons[s.l].title}". Everything above about tone, lesson content and exercise types applies to this one lesson. This replaces the output format above: reply with a single JSON object for just this lesson, in the same shape as one item of a unit's "lessons" array ("title", "emoji", "why", "terms", "teach", "phrases" for language courses only, and "exercises"). No unit around it and no quiz.${before ? `\nLessons already written in this unit, so do not repeat them:\n${before}` : ''}
${ONLY_JSON}`
  }
  const covered = (built?.lessons ?? [])
    .map((l) => `- ${str(rec(l).title)}\n${arr(rec(l).exercises).map((e) => `    ${promptOf(e)}`).filter((x) => x.trim()).join('\n')}`)
    .join('\n')
  return `${d.prompt}

I am building this course one step at a time. Here is the plan:
${outlineText(d)}

Right now write ONLY the end of unit quiz for Unit ${s.u + 1}: "${unit.title}". Write 5 or 6 fresh questions that test the same ideas as these lessons but through different scenarios and examples, a notch harder, mostly mcq with a few tf or cloze. Never reword or reuse a question the lessons already asked:
${covered}
This replaces the output format above: reply with { "quiz": [ ...questions in the same shapes as the exercises above ] }.
${ONLY_JSON}`
}
