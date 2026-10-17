import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { flatLessons, isUnlocked, nextLesson } from '../lib/gamify'
import { pickEmoji } from '../lib/emoji'
import { Card, ProgressBar } from '../components'

const UNIT_COLOURS = ['green', 'blue', 'purple', 'orange', 'pink']
// Horizontal offsets that make the lesson nodes snake down the page
const SNAKE = [0, 44, 70, 44, 0, -44, -70, -44]

export default function Path() {
  const course = useActiveCourse()
  const { progress } = useLearn()
  const navigate = useNavigate()

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

  const next = nextLesson(course, progress)
  const lessonIndex = new Map(flatLessons(course).map((l, i) => [l.id, i]))

  return (
    <div className="path-page">
      <h1 className="path-title">
        {course.emoji} {course.title}
      </h1>

      {course.units.map((unit, ui) => {
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        return (
          <section key={unit.id} className="unit">
            <div className={`unit-banner ${UNIT_COLOURS[ui % UNIT_COLOURS.length]}`}>
              <span className="unit-emoji">{pickEmoji(unit.emoji, `${unit.title} ${unit.description}`, ui)}</span>
              <div className="unit-banner-text">
                <h2>{unit.title}</h2>
                <p>{unit.description}</p>
              </div>
              <div className="unit-progress">
                <span>
                  {done}/{unit.lessons.length}
                </span>
                <ProgressBar value={done / unit.lessons.length} color="gold" height={10} label={`${unit.title} progress`} />
              </div>
            </div>
            <div className="nodes">
              {unit.lessons.map((lesson) => {
                const i = lessonIndex.get(lesson.id) ?? 0
                const p = progress[lesson.id]
                const unlocked = isUnlocked(course, lesson.id, progress)
                const current = next?.id === lesson.id
                const state = p?.completions ? 'done' : current ? 'current' : unlocked ? 'open' : 'locked'
                return (
                  <div key={lesson.id} className="node-wrap" style={{ transform: `translateX(${SNAKE[i % SNAKE.length]}px)` }}>
                    {current && <div className="start-bubble">START</div>}
                    <button
                      className={`node ${state} ${UNIT_COLOURS[ui % UNIT_COLOURS.length]}`}
                      disabled={!unlocked}
                      onClick={() => navigate(`/lesson/${lesson.id}`)}
                      aria-label={`${lesson.title}${state === 'locked' ? ' (locked)' : ''}`}
                    >
                      {state === 'done' ? (p!.bestAccuracy >= 1 ? '👑' : '✓') : state === 'locked' ? '🔒' : pickEmoji(lesson.emoji, lesson.title, i)}
                    </button>
                    <div className="node-label">{lesson.title}</div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
