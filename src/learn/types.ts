export type SourceKind = 'pdf' | 'topic' | 'link' | 'demo'

export interface McqExercise {
  type: 'mcq'
  prompt: string
  options: string[]
  answer: number
  explanation?: string
}

export interface TrueFalseExercise {
  type: 'tf'
  statement: string
  answer: boolean
  explanation?: string
}

/** Sentence with a single "___" gap, filled by tapping a word tile */
export interface ClozeExercise {
  type: 'cloze'
  sentence: string
  answer: string
  distractors: string[]
  explanation?: string
}

export interface MatchExercise {
  type: 'match'
  prompt: string
  pairs: { left: string; right: string }[]
}

export type Exercise = McqExercise | TrueFalseExercise | ClozeExercise | MatchExercise

export interface Lesson {
  id: string
  title: string
  /** Short teaching cards shown before the exercises */
  teach: string[]
  exercises: Exercise[]
}

export interface Unit {
  id: string
  title: string
  description: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  emoji: string
  summary: string
  source: { kind: SourceKind; label: string }
  generator: 'claude' | 'offline' | 'demo'
  createdAt: string
  units: Unit[]
}

export interface LessonProgress {
  completions: number
  bestAccuracy: number
  lastCompleted: string
}
