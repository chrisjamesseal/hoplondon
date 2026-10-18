export type SourceKind = 'pdf' | 'topic' | 'link' | 'language' | 'demo'

export interface McqExercise {
  type: 'mcq'
  prompt: string
  options: string[]
  answer: number
  explanation?: string
  hint?: string
  /** Foreign phrase to read aloud; shows a speaker button on the question */
  audio?: string
}

export interface TrueFalseExercise {
  type: 'tf'
  statement: string
  answer: boolean
  explanation?: string
  hint?: string
}

/** Sentence with a single "___" gap, filled by tapping a word tile */
export interface ClozeExercise {
  type: 'cloze'
  sentence: string
  answer: string
  distractors: string[]
  explanation?: string
  hint?: string
}

export interface MatchExercise {
  type: 'match'
  prompt: string
  pairs: { left: string; right: string }[]
}

/** Harder levels: the learner writes the answer. The first letter is shown and a hint is on hand. */
export interface TypeExercise {
  type: 'type'
  prompt: string
  /** One word or a very short phrase */
  answer: string
  /** Other wordings that count as right */
  accept?: string[]
  hint?: string
  explanation?: string
}

export type Exercise = McqExercise | TrueFalseExercise | ClozeExercise | MatchExercise | TypeExercise

/** A phrase to learn in a language course */
export interface Phrase {
  text: string
  /** Easy pronunciation, e.g. bon-ZHOOR */
  say?: string
  meaning: string
  /** Word by word meanings, shown when the learner taps an underlined word */
  words?: { w: string; m: string }[]
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
  /** Fresh end of unit questions, written to differ from the lesson exercises */
  quiz?: Exercise[]
  /** Which run of the course added this unit: 1 for the original, 2 for the first harder follow on */
  level?: number
}

export interface Course {
  id: string
  title: string
  emoji: string
  /** Speech language code such as es-ES, for reading phrases aloud */
  lang?: string
  summary: string
  /** 1 for the first run, 2 after a harder follow on has been added, and so on */
  level?: number
  /** Optional general heading such as sales or youtube; worked out from the title when missing */
  category?: string
  source: { kind: SourceKind; label: string }
  generator: 'claude' | 'offline' | 'demo'
  createdAt: string
  units: Unit[]
}

export interface LessonProgress {
  completions: number
  bestAccuracy: number
  lastCompleted: string
  /** Passed by jumping ahead with a test, not by doing the lesson */
  skipped?: boolean
}
