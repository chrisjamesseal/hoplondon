import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { flatLessons, nextStep, quizKey, stepDone, stepUnlocked } from '../lib/gamify'
import { pickEmoji } from '../lib/emoji'
import { plainText } from './RichText'
import { Card, ProgressBar } from '../components'

const UNIT_COLOURS = ['green', 'blue', 'purple', 'orange', 'pink']
// Horizontal offsets that make the lesson nodes snake down the page
const SNAKE = [0, 44, 70, 44, 0, -44, -70, -44]

export default function Path() {
  const course = useActiveCourse()
  const { progress } = useLearn()
  const navigate = useNavigate()

  // Open the path at the next thing to do, not the top of the course
  useEffect(() => {
    const t = setTimeout(() => document.querySelector('.node.current')?.scrollIntoView({ block: 'center' }), 60)
    return () => clearTimeout(t)
  }, [course?.id])

  if (!course) {
    return (
      <Card className="empty">
        <div className="big-emoji">🌱</div>
        <h2>Nothing to learn yet</h2>
        <p>Upload a PDF, type a topic or paste a link and Leap turns it into bite-sized lessons.</p>
        <Link to="/create" className="btn green">
          Create a course
        </Link>
      </Card>
    )
  }

  const next = nextStep(course, progress)
  const lessonIndex = new Map(flatLessons(course).map((l, i) => [l.id, i]))

  return (
    <div className="path-page">
      <h1 className="path-title">
        {course.emoji} {course.title}
      </h1>

      {course.units.map((unit, ui) => {
        const colour = UNIT_COLOURS[ui % UNIT_COLOURS.length]
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        const quizId = quizKey(unit.id)
        const quizStep = { kind: 'quiz' as const, id: quizId, unitIndex: ui }
        const quizDone = stepDone(course, quizStep, progress)
        const quizOpen = stepUnlocked(course, quizId, progress)
        const unitLocked = !!unit.lessons[0] && !stepUnlocked(course, unit.lessons[0].id, progress)
        const steps = unit.lessons.length + 1
        const stepsDone = done + (quizDone ? 1 : 0)
        return (
          <section key={unit.id} className="unit">
            <div className={`unit-banner ${colour}`}>
              <div className="unit-banner-top">
                <span className="unit-emoji">{pickEmoji(unit.emoji, `${unit.title} ${unit.description}`, ui)}</span>
                <div className="unit-banner-text">
                  <h2>{unit.title}</h2>
                  <p>{plainText(unit.description)}</p>
                </div>
              </div>
              <div className="unit-progress">
                <ProgressBar value={stepsDone / steps} color="gold" height={10} label={`${unit.title} progress`} />
                <span>
                  {done}/{unit.lessons.length}
                </span>
              </div>
              {unitLocked && (
                <button className="jump-btn" onClick={() => navigate(`/jump/${unit.id}`)}>
                  ⏭️ Jump here
                </button>
              )}
            </div>
            <div className="nodes">
              {unit.lessons.map((lesson) => {
                const i = lessonIndex.get(lesson.id) ?? 0
                const p = progress[lesson.id]
                const unlocked = stepUnlocked(course, lesson.id, progress)
                const current = next?.id === lesson.id
                const state = p?.completions ? 'done' : current ? 'current' : unlocked ? 'open' : 'locked'
                return (
                  <div key={lesson.id} className="node-wrap" style={{ transform: `translateX(${SNAKE[i % SNAKE.length]}px)` }}>
                    {current && <div className="start-bubble">START</div>}
                    <button
                      className={`node ${state} ${colour}`}
                      disabled={!unlocked}
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                      aria-label={`${lesson.title}${state === 'locked' ? ' (locked)' : ''}`}
                    >
                      {state === 'done' ? (p!.bestAccuracy >= 1 && !p!.skipped ? '👑' : '✓') : state === 'locked' ? '🔒' : pickEmoji(lesson.emoji, lesson.title, i)}
                    </button>
                    <div className="node-label">{lesson.title}</div>
                  </div>
                )
              })}
              <div className="node-wrap quiz-wrap">
                {next?.id === quizId && <div className="start-bubble">QUIZ</div>}
                <button
                  className={`node quiz ${quizDone ? 'done' : next?.id === quizId ? 'current' : quizOpen ? 'open' : 'locked'} ${colour}`}
                  disabled={!quizOpen}
                  onClick={() => navigate(`/quiz/${unit.id}`)}
                  aria-label={`${unit.title} quiz${quizOpen ? '' : ' (locked)'}`}
                >
                  {quizOpen || quizDone ? '🏆' : '🔒'}
                </button>
                <div className="node-label">Unit quiz</div>
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
