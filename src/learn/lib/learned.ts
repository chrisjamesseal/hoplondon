import type { Course, LessonProgress, Phrase } from '../types'

/** Every phrase from the lessons the learner has finished, once each, in course order */
export function learnedPhrases(course: Course, progress: Record<string, LessonProgress>): Phrase[] {
  const seen = new Set<string>()
  const out: Phrase[] = []
  for (const unit of course.units)
    for (const lesson of unit.lessons) {
      if (!progress[lesson.id]?.completions) continue
      for (const phrase of lesson.phrases ?? []) {
        if (seen.has(phrase.text)) continue
        seen.add(phrase.text)
        out.push(phrase)
      }
    }
  return out
}

/** Every phrase in the course, once each in course order, marked with whether its lesson has been finished */
export function phrasebookEntries(course: Course, progress: Record<string, LessonProgress>): { phrase: Phrase; learned: boolean }[] {
  const learned = new Set(learnedPhrases(course, progress).map((p) => p.text))
  const seen = new Set<string>()
  const out: { phrase: Phrase; learned: boolean }[] = []
  for (const unit of course.units)
    for (const lesson of unit.lessons)
      for (const phrase of lesson.phrases ?? []) {
        if (seen.has(phrase.text)) continue
        seen.add(phrase.text)
        out.push({ phrase, learned: learned.has(phrase.text) })
      }
  return out
}
