import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress, dayKey, flatLessons, isUnlocked, nextLesson } from '../lib/gamify'
import { Card, ProgressBar } from '../components'

const UNIT_COLOURS = ['green', 'blue', 'purple', 'orange', 'pink']
// Horizontal offsets that make the lesson nodes snake down the page
const SNAKE = [0, 44, 70, 44, 0, -44, -70, -44]

export default function Path() {
  const course = useActiveCourse()
  const { progress, xpByDay, dailyGoal } = useLearn()
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

  const cp = courseProgress(course, progress)
  const next = nextLesson(course, progress)
  const todayXp = xpByDay[dayKey()] ?? 0
  const lessonIndex = new Map(flatLessons(course).map((l, i) => [l.id, i]))

  return (
    <div className="path-page">
      <div className="path-head">
        <Card className="course-card">
          <div className="course-card-top">
            <span className="course-emoji">{course.emoji}</span>
            <div>
              <h1>{course.title}</h1>
              {course.summary && <p className="muted">{course.summary}</p>}
            </div>
          </div>
          <div className="row-between small">
            <span>Course progress</span>
            <strong>
              {cp.done}/{cp.total} lessons · {Math.round(cp.ratio * 100)}%
            </strong>
          </div>
          <ProgressBar value={cp.ratio} label="Course progress" />
          {next ? (
            <button className="btn green wide" onClick={() => navigate(`/lesson/${next.id}`)}>
              {cp.done ? 'Continue' : 'Start learning'}: {next.title}
            </button>
          ) : (
            <button className="btn gold wide" onClick={() => navigate('/practice')}>
              🏆 Course complete! Practise to stay sharp
            </button>
          )}
        </Card>
        <Card className="goal-card">
          <div className="row-between small">
            <span>🎯 Daily goal</span>
            <strong>
              {Math.min(todayXp, dailyGoal)}/{dailyGoal} XP
            </strong>
          </div>
          <ProgressBar value={todayXp / dailyGoal} color="gold" height={12} label="Daily goal" />
          {todayXp >= dailyGoal && <p className="tiny good">Goal smashed today 🎉</p>}
        </Card>
      </div>

      {course.units.map((unit, ui) => {
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        return (
          <section key={unit.id} className="unit">
            <div className={`unit-banner ${UNIT_COLOURS[ui % UNIT_COLOURS.length]}`}>
              <div>
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
                      {state === 'done' ? (p!.bestAccuracy >= 1 ? '👑' : '✓') : state === 'locked' ? '🔒' : '★'}
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
