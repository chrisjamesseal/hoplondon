export type SourceKind = 'pdf' | 'topic' | 'link' | 'language' | 'demo'

export interface McqExercise {
  type: 'mcq'
  prompt: string
  options: string[]
  answer: number
  explanation?: string
  /** Foreign phrase to read aloud; shows a speaker button on the question */
  audio?: string
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

/** A phrase to learn in a language course */
export interface Phrase {
  text: string
  /** Easy pronunciation, e.g. bon-ZHOOR */
  say?: string
  meaning: string
}

export interface Lesson {
  id: string
  title: string
  /** Picture shown big on the teach cards and on the path node */
  emoji?: string
  /** Short teaching cards shown before the exercises */
  teach: string[]
  /** Phrase cards shown after the teach cards (language courses) */
  phrases?: Phrase[]
  exercises: Exercise[]
}

export interface Unit {
  id: string
  title: string
  emoji?: string
  description: string
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  emoji: string
  /** Speech language code such as es-ES, for reading phrases aloud */
  lang?: string
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
