import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Course, Exercise, Lesson, Phrase } from '../types'
import { useActiveCourse, useLearn } from '../store'
import {
  courseProgress,
  dayKey,
  lessonsOn,
  flatLessons,
  isCourseComplete,
  mixTrueFalse,
  easeIntoTyping,
  exercisesFor,
  typedMatches,
  jumpTestExercises,
  lessonXp,
  liveStreak,
  MAX_HEARTS,
  nextHeartIn,
  passMark,
  quizKey,
  shuffle,
  stepsBeforeUnit,
  unitQuizExercises,
} from '../lib/gamify'
import { GATE_KEY } from '../lib/gate'
import { play } from '../lib/sound'
import { titleCase } from '../lib/titleCase'
import { clearPause, loadPause, savePause } from '../lib/pause'
import { Confetti, ProgressBar } from '../components'
import { pickEmoji } from '../lib/emoji'
import { useKeyboardFit } from '../lib/keyboard'
import { Cloze, clozeTiles, Match, Mcq, SpeakButton, TrueFalse, Typed } from './Exercises'
import { buildGlossary, GlossContext, plainText, RichText } from './RichText'

export type LessonMode = 'lesson' | 'practice' | 'quiz' | 'jump'

interface TeachCard {
  text?: string
  phrase?: Phrase
}

interface Item {
  key: string
  ex: Exercise
  tiles: string[]
}

type Phase = 'teach' | 'quiz' | 'done' | 'failed' | 'course' | 'out'

const PRAISE = ['Nice!', 'Great Job!', 'Correct!', 'You Got It!', 'Brilliant!', 'Spot On!']

function findLesson(courses: Course[], id: string): { course: Course; lesson: Lesson } | null {
  for (const course of courses) {
    const lesson = flatLessons(course).find((l) => l.id === id)
    if (lesson) return { course, lesson }
  }
  return null
}

function findUnit(courses: Course[], id: string): { course: Course; unitIndex: number } | null {
  for (const course of courses) {
    const unitIndex = course.units.findIndex((u) => u.id === id)
    if (unitIndex >= 0) return { course, unitIndex }
  }
  return null
}

/** Written answers start with one letter given; the second and third hints give another each */
const lettersFor = (hints: number, answer: string) => Math.min(1 + Math.max(0, hints - 1), Math.max(1, answer.length - 1))

/** How many hints a question can give, 0 when it has none */
function maxHints(ex: Exercise, tiles: string[]): number {
  switch (ex.type) {
    case 'type':
      return 1 + Math.min(2, Math.max(0, ex.answer.length - 2))
    case 'mcq':
      return Math.max(0, ex.options.length - 2)
    case 'cloze':
      return Math.max(0, tiles.length - 2)
    case 'tf':
      return ex.hint ? 1 : 0
    default:
      return 0
  }
}

/** The nudge shown after the first hint. Written answers fall back to the word length. */
function hintText(ex: Exercise, hints: number): string {
  if (ex.type === 'match' || hints < 1) return ''
  if (ex.type === 'type') return ex.hint ?? `${ex.answer.length} letters`
  return ex.hint ?? ''
}

/** The wrong choices a hint rules out, in a fixed order */
const ruledOutFor = (wrong: number[], hints: number) => new Set(wrong.slice(0, hints))

const toItem = (ex: Exercise, i: number): Item => ({ key: `${i}`, ex, tiles: ex.type === 'cloze' ? clozeTiles(ex) : [] })

function correctText(ex: Exercise): string {
  switch (ex.type) {
    case 'mcq':
      return ex.options[ex.answer]
    case 'tf':
      return ex.answer ? 'True' : 'False'
    case 'cloze':
    case 'type':
      return ex.answer
    case 'match':
      return ''
  }
}

interface Session {
  course?: Course
  title: string
  emoji: string
  cards: TeachCard[]
  exercises: Exercise[]
  /** Progress key this session completes (lesson id or quiz key) */
  key?: string
  unitIndex?: number
}

export default function LessonPage({ mode = 'lesson' }: { mode?: LessonMode }) {
  const { lessonId = '', unitId = '' } = useParams()
  const navigate = useNavigate()
  const store = useLearn()
  const activeCourse = useActiveCourse()
  const tested = mode === 'quiz' || mode === 'jump'
  const usesHearts = mode === 'lesson'

  // Build the session once per visit, not on every store change
  const session = useMemo((): Session | null => {
    if (mode === 'lesson') {
      const found = findLesson(store.courses, lessonId)
      if (!found) return null
      const { course, lesson } = found
      return {
        course,
        key: lesson.id,
        title: titleCase(lesson.title),
        emoji: pickEmoji(lesson.emoji, lesson.title),
        cards: [...lesson.teach.map((text): TeachCard => ({ text })), ...(lesson.phrases ?? []).map((phrase): TeachCard => ({ phrase }))],
        exercises: (() => {
          const unit = course.units.find((u) => u.lessons.some((l) => l.id === lesson.id)) ?? course.units[0]
          const eased = easeIntoTyping(course, unit, unit.lessons.findIndex((l) => l.id === lesson.id), exercisesFor(course, unit, lesson.exercises), lesson.id)
          return mixTrueFalse(eased, lesson.id)
        })(),
      }
    }
    if (tested) {
      const found = findUnit(store.courses, unitId)
      if (!found) return null
      const { course, unitIndex } = found
      const unit = course.units[unitIndex]
      return {
        course,
        unitIndex,
        key: mode === 'quiz' ? quizKey(unit.id) : undefined,
        title: titleCase(mode === 'quiz' ? `${unit.title} quiz` : `Jump to ${unit.title}`),
        emoji: mode === 'quiz' ? '🏆' : '⏭️',
        cards: [],
        exercises: mode === 'quiz' ? unitQuizExercises(course, unitIndex) : jumpTestExercises(course, unitIndex),
      }
    }
    if (!activeCourse) return null
    const lessons = flatLessons(activeCourse)
    const done = lessons.filter((l) => store.progress[l.id]?.completions)
    const pool = (done.length ? done : lessons.slice(0, 1)).flatMap((l) => exercisesFor(activeCourse, activeCourse.units.find((u) => u.lessons.some((x) => x.id === l.id)) ?? activeCourse.units[0], l.exercises))
    return { course: activeCourse, title: 'Practice', emoji: '💪', cards: [], exercises: shuffle(pool).slice(0, 8) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lessonId, unitId])

  const gloss = useMemo(() => buildGlossary(session?.course), [session])
  const langCode = session?.course?.lang
  const total = session?.exercises.length ?? 0

  // A lesson paused when hearts ran out picks up where it stopped
  const [resume] = useState(() => (mode === 'lesson' ? loadPause(lessonId) : null))
  const [queue, setQueue] = useState<Item[]>(() => {
    const exs = session?.exercises ?? []
    if (resume) return resume.remaining.filter((i) => exs[i]).map((i) => toItem(exs[i], i))
    return exs.map(toItem)
  })
  const [phase, setPhase] = useState<Phase>(() =>
    usesHearts && store.hearts <= 0 ? 'out' : resume || !session?.cards.length ? 'quiz' : 'teach',
  )
  const [teachIdx, setTeachIdx] = useState(0)
  const [idx, setIdx] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [typed, setTyped] = useState('')
  const [hints, setHints] = useState(0)
  const [result, setResult] = useState<{ correct: boolean; note?: string } | null>(null)
  const [solved, setSolved] = useState(resume?.solved ?? 0)
  const [firstTry, setFirstTry] = useState(resume?.firstTry ?? 0)
  const [missed, setMissed] = useState<Set<string>>(() => new Set((resume?.missed ?? []).map(String)))
  const [startedAt] = useState(resume?.startedAt ?? Date.now())
  const [earned, setEarned] = useState({ xp: 0, accuracy: 0, secs: 0, correct: 0 })
  const [quitAsk, setQuitAsk] = useState(false)

  const item = queue[idx]
  const typing = phase !== 'teach' && item?.ex.type === 'type'
  useKeyboardFit(typing)

  const finish = useCallback(
    (firstTryCount: number) => {
      const accuracy = total ? firstTryCount / total : 1
      const secs = Math.round((Date.now() - startedAt) / 1000)
      const result = { accuracy, secs, correct: firstTryCount }
      if (tested && firstTryCount < passMark(total)) {
        play(store.sound, 'wrong')
        setEarned({ ...result, xp: 0 })
        return setPhase('failed')
      }
      let xp = 0
      if (mode === 'practice') {
        xp = 5
        store.finishPractice(xp)
      } else if (mode === 'quiz' && session?.key) {
        xp = store.progress[session.key]?.completions ? 5 : 15
        store.completeLesson(session.key, accuracy, xp)
      } else if (mode === 'jump' && session?.course && session.unitIndex !== undefined) {
        store.skipSteps(stepsBeforeUnit(session.course, session.unitIndex))
      } else if (session?.key) {
        xp = lessonXp(accuracy, !!store.progress[session.key]?.completions)
        store.completeLesson(session.key, accuracy, xp)
        clearPause()
      }
      setEarned({ ...result, xp })
      play(store.sound, 'complete')
      setPhase('done')
    },
    [mode, session, startedAt, store, tested, total],
  )

  const grade = useCallback(
    (correct: boolean) => {
      if (!item) return
      const ex = item.ex
      const note = ex.type !== 'match' ? ex.explanation : undefined
      play(store.sound, correct ? 'correct' : 'wrong')
      // Lessons only count a question once it's right; tests count every answer
      if (correct || tested) setSolved((n) => n + 1)
      if (correct) {
        if (!missed.has(item.key) && hints === 0) setFirstTry((n) => n + 1)
        return setResult({ correct: true, note })
      }
      setMissed((m) => new Set(m).add(item.key))
      if (!tested) {
        // Wrong answers come back at the end, like Duolingo. Tests ask each question once.
        setQueue((q) => [...q, toItem(item.ex, Number(item.key))])
      }
      if (usesHearts) store.loseHeart()
      setResult({ correct: false, note })
    },
    [hints, item, missed, store, tested, usesHearts],
  )

  const check = useCallback(() => {
    if (!item || result) return
    const ex = item.ex
    if (ex.type === 'type') {
      if (!typed.trim()) return
      return grade(typedMatches(ex, ex.answer.slice(0, lettersFor(hints, ex.answer)) + typed))
    }
    if (choice === null) return
    const correct =
      ex.type === 'mcq' ? choice === ex.answer : ex.type === 'tf' ? (choice === 0) === ex.answer : ex.type === 'cloze' ? item.tiles[choice] === ex.answer : false
    grade(correct)
  }, [choice, grade, hints, item, result, typed])

  const next = useCallback(() => {
    setResult(null)
    setChoice(null)
    setTyped('')
    setHints(0)
    if (usesHearts && useLearn.getState().hearts <= 0) {
      // Remember the spot so practising to refill doesn't mean starting again
      savePause({
        lessonId,
        remaining: queue.slice(idx + 1).map((q) => Number(q.key)),
        solved,
        firstTry,
        missed: [...missed].map(Number),
        startedAt,
      })
      return setPhase('out')
    }
    if (idx + 1 >= queue.length) return finish(firstTry)
    setIdx(idx + 1)
  }, [finish, firstTry, idx, lessonId, missed, queue, solved, startedAt, usesHearts])

  const goTeach = useCallback(
    (step: number) => {
      const to = teachIdx + step
      if (to < 0) return
      if (to >= (session?.cards.length ?? 0)) return setPhase('quiz')
      setTeachIdx(to)
    },
    [session, teachIdx],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'teach') {
        if (e.key === 'Enter' || e.key === 'ArrowRight') goTeach(1)
        if (e.key === 'ArrowLeft') goTeach(-1)
      }
      if (phase !== 'quiz' || !item) return
      if (e.key === 'Enter') result ? next() : check()
      const n = Number(e.key)
      if (!result && n >= 1 && n <= 4 && item.ex.type !== 'type') {
        const max = item.ex.type === 'mcq' ? item.ex.options.length : item.ex.type === 'tf' ? 2 : item.tiles.length
        if (n <= max && item.ex.type !== 'match') setChoice(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [check, goTeach, item, next, phase, result])

  if (!session || total === 0) return <Navigate to={tested ? '/path' : '/'} replace />

  const course = session.course
  const hintsOn = (course?.level ?? 1) >= 2
  // A hint can reveal a letter the learner has already typed, so drop it from what they wrote
  const useHint = () => {
    if (item?.ex.type === 'type') {
      const ans = item.ex.answer
      const from = lettersFor(hints, ans)
      const to = lettersFor(hints + 1, ans)
      if (to > from && typed.toLowerCase().startsWith(ans.slice(from, to).toLowerCase())) setTyped(typed.slice(to - from))
    }
    setHints((h) => h + 1)
  }
  const canHint = hintsOn && !!item && !result && hints < maxHints(item.ex, item.tiles)
  const progressValue = phase === 'done' || phase === 'course' ? 1 : solved / total
  const quit = () => (phase === 'quiz' && solved > 0 ? setQuitAsk(true) : navigate('/path'))
  const paused = mode === 'practice' ? loadPause() : null

  const afterDone = () => {
    const state = useLearn.getState()
    if (paused) return navigate(`/lesson/${paused.lessonId}`)
    // Opened from the focus gate: once today's goal is met, go back to it so the app can be opened
    try {
      const gate = sessionStorage.getItem(GATE_KEY)
      if (gate && lessonsOn(dayKey(), state.lessonsByDay, state.progress) >= state.dailyLessons) return navigate(`/gate/${gate}`)
    } catch {
      // No session storage: carry on as normal
    }
    if (course && mode !== 'practice' && isCourseComplete(course, state.progress) && !(state.archived ?? []).includes(course.id)) return setPhase('course')
    navigate('/path')
  }

  if (phase === 'course' && course) {
    const lessons = flatLessons(course).length
    return (
      <div className="lesson done-screen">
        <Confetti />
        <div className="done-inner">
          <div className="done-mascot">🏆</div>
          <h1>Course Complete!</h1>
          <p className="muted">
            You finished every lesson and quiz in {course.emoji} {titleCase(course.title)}.
          </p>
          <div className="done-stats two">
            <div className="done-stat green">
              <span>Lessons</span>
              <strong>📚 {lessons}</strong>
            </div>
            <div className="done-stat blue">
              <span>Units</span>
              <strong>🗺️ {course.units.length}</strong>
            </div>
          </div>
          <p className="small muted">Archive it to keep your courses list tidy. You can bring it back any time.</p>
        </div>
        <footer className="check-bar">
          <div className="check-inner stack-buttons">
            <button className="btn green" onClick={() => navigate(`/extend/${course.id}`)}>
              🚀 Add more lessons
            </button>
            <button className="btn ghost" onClick={() => navigate('/')}>
              Keep in my courses
            </button>
            <button
              className="btn green"
              autoFocus
              onClick={() => {
                store.archiveCourse(course.id)
                navigate('/courses')
              }}
            >
              📦 Add to archive
            </button>
          </div>
        </footer>
      </div>
    )
  }

  if (phase === 'failed') {
    const need = passMark(total)
    return (
      <div className="lesson out-screen">
        <div className="done-inner">
          <div className="done-mascot">{mode === 'quiz' ? '📝' : '⏭️'}</div>
          <h1>Not Quite</h1>
          <p className="muted">
            You got {earned.correct} of {total}. You need {need} to pass{mode === 'jump' ? ' and jump ahead' : ''}.
          </p>
          <div className="stack">
            <button className="btn blue wide" onClick={() => navigate(`/${mode}/${unitId}`, { state: { retry: Date.now() } })}>
              Try again
            </button>
            <Link to="/path" className="btn ghost wide">
              Back to the path
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    const cp = course ? courseProgress(course, useLearn.getState().progress) : null
    const streak = liveStreak(store.streak, store.lastActiveDay, dayKey())
    const heading = { lesson: 'Lesson Complete!', practice: 'Practice Complete!', quiz: 'Quiz Passed!', jump: 'You Jumped Ahead!' }[mode]
    return (
      <div className="lesson done-screen">
        <Confetti />
        <div className="done-inner">
          <svg className="done-check" viewBox="0 0 120 120" role="img" aria-label="Complete">
            <circle className="dc-ring" cx="60" cy="60" r="54" />
            <circle className="dc-fill" cx="60" cy="60" r="46" />
            <path className="dc-tick" d="M38 62 L54 78 L84 44" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <line key={i} className="dc-spark" x1="60" y1="2" x2="60" y2="12" transform={`rotate(${i * 45} 60 60)`} style={{ animationDelay: `${0.7 + (i % 2) * 0.08}s` }} />
            ))}
          </svg>
          <h1>{heading}</h1>
          {mode === 'practice' && <p className="muted">Hearts refilled ❤️ ×{MAX_HEARTS}</p>}
          {tested && (
            <p className="muted">
              {earned.correct} of {total} correct.{mode === 'jump' ? ' Earlier lessons are marked as done.' : ''}
            </p>
          )}
          <div className="done-stats">
            <div className="done-stat gold">
              <span>Total XP</span>
              <strong>⚡ {earned.xp}</strong>
            </div>
            <div className="done-stat green">
              <span>{earned.accuracy >= 1 ? 'Perfect!' : 'Accuracy'}</span>
              <strong>🎯 {Math.round(earned.accuracy * 100)}%</strong>
            </div>
            <div className="done-stat blue">
              <span>Time</span>
              <strong>
                ⏱ {Math.floor(earned.secs / 60)}:{String(earned.secs % 60).padStart(2, '0')}
              </strong>
            </div>
          </div>
          <p className="streak-line">🔥 {streak} day streak</p>
          {cp && course && (
            <div className="done-course">
              <div className="row-between small">
                <span>
                  {course.emoji} {titleCase(course.title)}
                </span>
                <strong>{Math.round(cp.ratio * 100)}%</strong>
              </div>
              <ProgressBar value={cp.ratio} />
            </div>
          )}
        </div>
        <footer className="check-bar">
          <div className="check-inner">
            <span />
            <button className="btn green" autoFocus onClick={afterDone}>
              {paused ? 'Back to your lesson' : 'Continue'}
            </button>
          </div>
        </footer>
      </div>
    )
  }

  if (phase === 'out') {
    const mins = Math.ceil(nextHeartIn(store.hearts, store.heartsUpdatedAt, Date.now()) / 60000)
    const hasPause = !!loadPause(lessonId)
    return (
      <div className="lesson out-screen">
        <div className="done-inner">
          <div className="done-mascot">💔</div>
          <h1>You Ran Out of Hearts</h1>
          <p className="muted">
            Do a quick practice to refill them, or wait {mins} min for the next one.
            {hasPause ? ' Your place in this lesson is saved, so you will carry on from the same question.' : ''}
          </p>
          <div className="stack">
            <button className="btn blue wide" onClick={() => navigate('/practice')}>
              💪 Practise to refill
            </button>
            <Link to="/path" className="btn ghost wide">
              Not now
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const card = session.cards[teachIdx]
  return (
    <GlossContext.Provider value={gloss}>
      <div className={`lesson ${typing ? 'typing' : ''}`}>
        <header className="lesson-top">
          <button className="icon-btn" onClick={quit} aria-label="Quit">
            ✕
          </button>
          <ProgressBar value={progressValue} label="Progress" />
          <span className={`stat hearts ${usesHearts ? '' : 'muted'}`}>{usesHearts ? `❤️ ${store.hearts}` : tested ? `${session.emoji}` : '♾️'}</span>
        </header>

        <main className="lesson-body">
          {tested && phase === 'quiz' && (
            <div className="test-tag">{session.title}</div>
          )}
          {phase === 'teach' && card && (
            <div className="teach">
              <div className="teach-label">💡 Learn · {session.title}</div>
              <div className="teach-body">
                <div key={`art-${teachIdx}`} className="teach-art" aria-hidden>
                  {session.emoji}
                </div>
                <div key={teachIdx} className={`teach-card pop ${card.phrase ? 'phrase-card' : ''}`}>
                  {card.phrase ? (
                    <>
                      <div className="phrase-text">
                        <RichText text={card.phrase.text} />
                      </div>
                      {card.phrase.say && <div className="phrase-say">{card.phrase.say}</div>}
                      <div className="phrase-meaning">{card.phrase.meaning}</div>
                      {card.phrase.words && card.phrase.words.length > 1 && (
                        <div className="word-breakdown" aria-label="Word by word">
                          {card.phrase.words.map((w, i) => (
                            <span key={i} className="wb-item">
                              <span className="wb-word">{w.w}</span>
                              <span className="wb-meaning">{w.m}</span>
                            </span>
                          ))}
                        </div>
                      )}
                      <SpeakButton text={card.phrase.text} lang={langCode} big />
                    </>
                  ) : (
                    <RichText text={card.text ?? ''} hints={false} />
                  )}
                </div>
                <div className="dots">
                  {session.cards.map((_, i) => (
                    <span key={i} className={i <= teachIdx ? 'on' : ''} />
                  ))}
                </div>
              </div>
            </div>
          )}
          {phase === 'quiz' && item && (
            <div key={`${idx}-${item.key}`} className="pop">
              {missed.has(item.key) && !result && !tested && (
                <div className="q-num">
                  <span className="retry-tag">↻ Previous mistake</span>
                </div>
              )}
              {item.ex.type === 'mcq' && (
                <Mcq
                  lang={langCode}
                  ex={item.ex}
                  value={choice}
                  onChange={(v) => (play(store.sound, 'tap'), setChoice(v))}
                  locked={!!result}
                  reveal={result ? item.ex.answer : undefined}
                  ruledOut={hintsOn ? ruledOutFor(item.ex.options.map((_, i) => i).filter((i) => i !== (item.ex as { answer: number }).answer && i !== choice), hints) : undefined}
                />
              )}
              {item.ex.type === 'type' && (
                <Typed
                  ex={item.ex}
                  letters={lettersFor(hints, item.ex.answer)}
                  value={typed}
                  onChange={setTyped}
                  locked={!!result}
                  right={result ? result.correct : undefined}
                />
              )}
              {item.ex.type === 'tf' && (
                <TrueFalse ex={item.ex} value={choice} onChange={(v) => (play(store.sound, 'tap'), setChoice(v))} locked={!!result} reveal={result ? (item.ex.answer ? 0 : 1) : undefined} />
              )}
              {item.ex.type === 'cloze' && (
                <Cloze
                  ex={item.ex}
                  tiles={item.tiles}
                  value={choice}
                  onChange={(v) => (play(store.sound, 'tap'), setChoice(v))}
                  locked={!!result}
                  ruledOut={hintsOn ? ruledOutFor(item.tiles.map((_, i) => i).filter((i) => item.tiles[i] !== (item.ex as { answer: string }).answer && i !== choice), hints) : undefined}
                />
              )}
              {hintsOn && hints > 0 && !result && hintText(item.ex, hints) && <p className="hint-note">💡 {hintText(item.ex, hints)}</p>}
              {item.ex.type === 'match' && (
                <Match
                  ex={item.ex}
                  onTap={(ok) => play(store.sound, ok ? 'tap' : 'wrong')}
                  onDone={(mistakes) => {
                    if (tested && mistakes) {
                      // In a test a slip counts as a wrong answer
                      setMissed((m) => new Set(m).add(item.key))
                      setSolved((n) => n + 1)
                      play(store.sound, 'wrong')
                      return setResult({ correct: false, note: `All matched, with ${mistakes} slip${mistakes > 1 ? 's' : ''}.` })
                    }
                    if (mistakes) setMissed((m) => new Set(m).add(item.key))
                    play(store.sound, 'correct')
                    setSolved((n) => n + 1)
                    if (!mistakes && !missed.has(item.key)) setFirstTry((n) => n + 1)
                    setResult({ correct: true, note: mistakes ? `All matched, with ${mistakes} slip${mistakes > 1 ? 's' : ''}.` : 'Every pair first time!' })
                  }}
                />
              )}
            </div>
          )}
        </main>

        <footer className={`check-bar ${result ? (result.correct ? 'right' : 'wrong') : ''}`}>
          <div className="check-inner">
            {phase === 'teach' ? (
              <>
                <div className="teach-nav">
                  <button className="btn ghost" disabled={teachIdx === 0} onClick={() => goTeach(-1)}>
                    ← Back
                  </button>
                  <button className="btn ghost" onClick={() => setPhase('quiz')}>
                    Skip
                  </button>
                </div>
                <button className="btn green" onClick={() => goTeach(1)}>
                  {teachIdx + 1 < session.cards.length ? 'Next' : "Let's go"}
                </button>
              </>
            ) : result ? (
              <>
                <div className="feedback">
                  <div className="feedback-icon">{result.correct ? '✓' : '✕'}</div>
                  <div>
                    <strong>{result.correct ? PRAISE[(solved + idx) % PRAISE.length] : 'Not Quite'}</strong>
                    {!result.correct && item && correctText(item.ex) && <p>Correct answer: {plainText(correctText(item.ex))}</p>}
                    {result.note && (
                      <p className="note">
                        <RichText text={result.note} hints={false} />
                      </p>
                    )}
                  </div>
                </div>
                <button className={`btn ${result.correct ? 'green' : 'red'}`} autoFocus onClick={next}>
                  Continue
                </button>
              </>
            ) : (
              <>
                {hintsOn && item && maxHints(item.ex, item.tiles) > 0 ? (
                  <button className="btn ghost hint-btn" disabled={!canHint} onClick={useHint}>
                    💡 Hint{hints > 0 ? ` (${hints}/${maxHints(item.ex, item.tiles)})` : ''}
                  </button>
                ) : (
                  <span />
                )}
                {item?.ex.type !== 'match' && (
                  <button className="btn green" disabled={item?.ex.type === 'type' ? !typed.trim() : choice === null} onClick={check}>
                    Check
                  </button>
                )}
              </>
            )}
          </div>
        </footer>

        {quitAsk && (
          <div className="modal-bg" onClick={() => setQuitAsk(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="big-emoji">⏸️</div>
              <h2>{tested ? 'End This Quiz?' : 'End This Lesson?'}</h2>
              <p className="muted">Your answers so far won't be saved.</p>
              <button className="btn blue wide" onClick={() => setQuitAsk(false)}>
                Keep going
              </button>
              <button
                className="btn ghost wide danger-text"
                onClick={() => {
                  if (mode === 'lesson') clearPause()
                  navigate('/path')
                }}
              >
                End {tested ? 'quiz' : 'lesson'}
              </button>
            </div>
          </div>
        )}
      </div>
    </GlossContext.Provider>
  )
}
