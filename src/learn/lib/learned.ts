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
