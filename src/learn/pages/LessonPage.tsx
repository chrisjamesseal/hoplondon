import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import type { Course, Exercise, Lesson } from '../types'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress, dayKey, flatLessons, lessonXp, liveStreak, MAX_HEARTS, nextHeartIn, shuffle } from '../lib/gamify'
import { play } from '../lib/sound'
import { Confetti, ProgressBar } from '../components'
import { pickEmoji } from '../lib/emoji'
import { Cloze, clozeTiles, Match, Mcq, TrueFalse } from './Exercises'

interface Item {
  key: string
  ex: Exercise
  tiles: string[]
}

type Phase = 'teach' | 'quiz' | 'done' | 'out'

const PRAISE = ['Nice!', 'Great job!', 'Correct!', 'You got it!', 'Brilliant!', 'Spot on!']

function findLesson(courses: Course[], id: string): { course: Course; lesson: Lesson } | null {
  for (const course of courses) {
    const lesson = flatLessons(course).find((l) => l.id === id)
    if (lesson) return { course, lesson }
  }
  return null
}

function toItems(exs: Exercise[]): Item[] {
  return exs.map((ex, i) => ({ key: `${i}`, ex, tiles: ex.type === 'cloze' ? clozeTiles(ex) : [] }))
}

function correctText(ex: Exercise): string {
  switch (ex.type) {
    case 'mcq':
      return ex.options[ex.answer]
    case 'tf':
      return ex.answer ? 'True' : 'False'
    case 'cloze':
      return ex.answer
    case 'match':
      return ''
  }
}

export default function LessonPage({ practice = false }: { practice?: boolean }) {
  const { lessonId = '' } = useParams()
  const navigate = useNavigate()
  const store = useLearn()
  const activeCourse = useActiveCourse()
  const found = practice ? null : findLesson(store.courses, lessonId)

  // Practice pulls a mix from lessons already done in the current course
  const session = useMemo(() => {
    if (!practice) return found ? { title: found.lesson.title, emoji: pickEmoji(found.lesson.emoji, found.lesson.title), teach: found.lesson.teach, exercises: found.lesson.exercises } : null
    if (!activeCourse) return null
    const lessons = flatLessons(activeCourse)
    const done = lessons.filter((l) => store.progress[l.id]?.completions)
    const pool = (done.length ? done : lessons.slice(0, 1)).flatMap((l) => l.exercises)
    return { title: 'Practice', emoji: '💪', teach: [], exercises: shuffle(pool).slice(0, 8) }
    // Build the session once per visit, not on every store change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practice, lessonId])

  const [queue, setQueue] = useState<Item[]>(() => toItems(session?.exercises ?? []))
  const total = session?.exercises.length ?? 0
  const [phase, setPhase] = useState<Phase>(() => (!practice && store.hearts <= 0 ? 'out' : session?.teach.length ? 'teach' : 'quiz'))
  const [teachIdx, setTeachIdx] = useState(0)
  const [idx, setIdx] = useState(0)
  const [choice, setChoice] = useState<number | null>(null)
  const [result, setResult] = useState<{ correct: boolean; note?: string } | null>(null)
  const [solved, setSolved] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [missed, setMissed] = useState<Set<string>>(new Set())
  const [startedAt] = useState(Date.now())
  const [earned, setEarned] = useState({ xp: 0, accuracy: 0, secs: 0 })
  const [quitAsk, setQuitAsk] = useState(false)

  const item = queue[idx]

  const finish = useCallback(
    (firstTryCount: number) => {
      const accuracy = total ? firstTryCount / total : 1
      const secs = Math.round((Date.now() - startedAt) / 1000)
      if (practice) {
        const xp = 5
        store.finishPractice(xp)
        setEarned({ xp, accuracy, secs })
      } else if (found) {
        const xp = lessonXp(accuracy, !!store.progress[found.lesson.id]?.completions)
        store.completeLesson(found.lesson.id, accuracy, xp)
        setEarned({ xp, accuracy, secs })
      }
      play(store.sound, 'complete')
      setPhase('done')
    },
    [found, practice, startedAt, store, total],
  )

  const grade = useCallback(
    (correct: boolean) => {
      if (!item) return
      const ex = item.ex
      play(store.sound, correct ? 'correct' : 'wrong')
      if (correct) {
        setSolved((n) => n + 1)
        if (!missed.has(item.key)) setFirstTry((n) => n + 1)
        setResult({ correct: true, note: ex.type !== 'match' ? ex.explanation : undefined })
      } else {
        setMissed((m) => new Set(m).add(item.key))
        // Wrong answers come back at the end, like Duolingo
        setQueue((q) => [...q, { ...item, tiles: item.ex.type === 'cloze' ? clozeTiles(item.ex) : [] }])
        if (!practice) store.loseHeart()
        setResult({ correct: false, note: ex.type !== 'match' ? ex.explanation : undefined })
      }
    },
    [item, missed, practice, store],
  )

  const check = useCallback(() => {
    if (!item || choice === null || result) return
    const ex = item.ex
    const correct =
      ex.type === 'mcq' ? choice === ex.answer : ex.type === 'tf' ? (choice === 0) === ex.answer : ex.type === 'cloze' ? item.tiles[choice] === ex.answer : false
    grade(correct)
  }, [choice, grade, item, result])

  const next = useCallback(() => {
    setResult(null)
    setChoice(null)
    if (!practice && useLearn.getState().hearts <= 0) return setPhase('out')
    if (idx + 1 >= queue.length) return finish(firstTry)
    setIdx(idx + 1)
  }, [finish, firstTry, idx, practice, queue.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'teach' && e.key === 'Enter') {
        if (teachIdx + 1 < (session?.teach.length ?? 0)) setTeachIdx(teachIdx + 1)
        else setPhase('quiz')
      }
      if (phase !== 'quiz' || !item) return
      if (e.key === 'Enter') result ? next() : check()
      const n = Number(e.key)
      if (!result && n >= 1 && n <= 4) {
        const max = item.ex.type === 'mcq' ? item.ex.options.length : item.ex.type === 'tf' ? 2 : item.tiles.length
        if (n <= max && item.ex.type !== 'match') setChoice(n - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [check, item, next, phase, result, session, teachIdx])

  if (!session || (!practice && !found) || total === 0) return <Navigate to="/" replace />

  const progressValue = phase === 'done' ? 1 : solved / total
  const quit = () => (phase === 'quiz' && solved > 0 ? setQuitAsk(true) : navigate('/path'))

  if (phase === 'done') {
    const course = found?.course ?? activeCourse
    const cp = course ? courseProgress(course, useLearn.getState().progress) : null
    const streak = liveStreak(store.streak, store.lastActiveDay, dayKey())
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
          <h1>{practice ? 'Practice complete!' : 'Lesson complete!'}</h1>
          {practice && <p className="muted">Hearts refilled ❤️ ×{MAX_HEARTS}</p>}
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
          {cp && (
            <div className="done-course">
              <div className="row-between small">
                <span>
                  {course!.emoji} {course!.title}
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
            <button className="btn green" autoFocus onClick={() => navigate('/path')}>
              Continue
            </button>
          </div>
        </footer>
      </div>
    )
  }

  if (phase === 'out') {
    const mins = Math.ceil(nextHeartIn(store.hearts, store.heartsUpdatedAt, Date.now()) / 60000)
    return (
      <div className="lesson out-screen">
        <div className="done-inner">
          <div className="done-mascot">💔</div>
          <h1>You ran out of hearts</h1>
          <p className="muted">Practise what you've learned to refill them, or wait {mins} min for the next one.</p>
          <div className="stack">
            <button className="btn blue wide" onClick={() => navigate('/practice')}>
              💪 Practise to refill
            </button>
            <Link to="/path" className="btn ghost wide">
              No thanks
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="lesson">
      <header className="lesson-top">
        <button className="icon-btn" onClick={quit} aria-label="Quit lesson">
          ✕
        </button>
        <ProgressBar value={progressValue} label="Lesson progress" />
        <span className={`stat hearts ${practice ? 'muted' : ''}`}>{practice ? '♾️' : `❤️ ${store.hearts}`}</span>
      </header>

      <main className="lesson-body">
        {phase === 'teach' && (
          <div className="teach">
            <div className="teach-label">💡 Learn · {session.title}</div>
            <div className="teach-body">
              <div key={`art-${teachIdx}`} className="teach-art" aria-hidden>
                {session.emoji}
              </div>
              <div key={teachIdx} className="teach-card pop">
                {session.teach[teachIdx]}
              </div>
              <div className="dots">
                {session.teach.map((_, i) => (
                  <span key={i} className={i <= teachIdx ? 'on' : ''} />
                ))}
              </div>
            </div>
          </div>
        )}
        {phase === 'quiz' && item && (
          <div key={`${idx}-${item.key}`} className="pop">
            {missed.has(item.key) && !result && <div className="retry-tag">↻ Previous mistake</div>}
            {item.ex.type === 'mcq' && <Mcq ex={item.ex} value={choice} onChange={(v) => (play(store.sound, 'tap'), setChoice(v))} locked={!!result} reveal={result ? item.ex.answer : undefined} />}
            {item.ex.type === 'tf' && <TrueFalse ex={item.ex} value={choice} onChange={(v) => (play(store.sound, 'tap'), setChoice(v))} locked={!!result} reveal={result ? (item.ex.answer ? 0 : 1) : undefined} />}
            {item.ex.type === 'cloze' && (
              <Cloze ex={item.ex} tiles={item.tiles} value={choice} onChange={(v) => (play(store.sound, 'tap'), setChoice(v))} locked={!!result} />
            )}
            {item.ex.type === 'match' && (
              <Match
                ex={item.ex}
                onTap={(ok) => play(store.sound, ok ? 'tap' : 'wrong')}
                onDone={(mistakes) => {
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
              <button className="btn ghost" onClick={() => setPhase('quiz')}>
                Skip
              </button>
              <button
                className="btn green"
                onClick={() => (teachIdx + 1 < session.teach.length ? setTeachIdx(teachIdx + 1) : setPhase('quiz'))}
              >
                {teachIdx + 1 < session.teach.length ? 'Next' : "Let's go"}
              </button>
            </>
          ) : result ? (
            <>
              <div className="feedback">
                <div className="feedback-icon">{result.correct ? '✓' : '✕'}</div>
                <div>
                  <strong>{result.correct ? PRAISE[(solved + idx) % PRAISE.length] : 'Not quite'}</strong>
                  {!result.correct && item && <p>Correct answer: {correctText(item.ex)}</p>}
                  {result.note && <p className="note">{result.note}</p>}
                </div>
              </div>
              <button className={`btn ${result.correct ? 'green' : 'red'}`} autoFocus onClick={next}>
                Continue
              </button>
            </>
          ) : (
            <>
              <span />
              {item?.ex.type !== 'match' && (
                <button className="btn green" disabled={choice === null} onClick={check}>
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
            <div className="big-emoji">🥺</div>
            <h2>Wait, don't go!</h2>
            <p className="muted">You'll lose your progress in this lesson.</p>
            <button className="btn blue wide" onClick={() => setQuitAsk(false)}>
              Keep learning
            </button>
            <button className="btn ghost wide danger-text" onClick={() => navigate('/path')}>
              End lesson
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
