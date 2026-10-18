import { Link, useNavigate, useParams } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { dayKey, lessonsOn, nextStep } from '../lib/gamify'
import { GATE_APPS, GATE_KEY, lessonsLeft } from '../lib/gate'
import { Card, ProgressBar } from '../components'

/** An iPhone Shortcut opens this when a distracting app is launched. Lessons first, then the app. */
export default function Gate() {
  const { app = '' } = useParams()
  const target = GATE_APPS[app]
  const course = useActiveCourse()
  const { progress, lessonsByDay, dailyLessons } = useLearn()
  const navigate = useNavigate()
  const done = lessonsOn(dayKey(), lessonsByDay, progress)
  const left = lessonsLeft(done, dailyLessons)
  const step = course ? nextStep(course, progress) : undefined
  const name = target?.name ?? 'that app'

  try {
    sessionStorage.setItem(GATE_KEY, app)
  } catch {
    // Private mode: the gate still works, it just won't bring you back here after a lesson
  }

  if (left === 0) {
    return (
      <Card className="empty">
        <div className="big-emoji">🎉</div>
        <h2>Goal Smashed</h2>
        <p className="muted">
          You did {done} {done === 1 ? 'lesson' : 'lessons'} today. {target ? `${name} is yours.` : 'Enjoy your break.'}
        </p>
        {target ? (
          <a className="btn green" href={target.url} onClick={() => sessionStorage.removeItem(GATE_KEY)}>
            Open {name}
          </a>
        ) : (
          <Link to="/" className="btn green">
            Back to Leap
          </Link>
        )}
      </Card>
    )
  }

  return (
    <Card className="empty">
      <div className="big-emoji">🔒</div>
      <h2>Stay Focused</h2>
      <p className="muted">
        Do {left} more {left === 1 ? 'lesson' : 'lessons'} to open {name}.
      </p>
      <div className="gate-bar">
        <ProgressBar value={done / dailyLessons} color="gold" height={12} label="Daily goal" />
      </div>
      <p className="tiny muted">
        {done}/{dailyLessons} lessons today
      </p>
      {step && (
        <button className="btn green" onClick={() => navigate(step.kind === 'lesson' ? `/lesson/${step.id}` : `/quiz/${course!.units[step.unitIndex].id}`)}>
          Start a lesson
        </button>
      )}
      {!step && (
        <Link to="/practice" className="btn blue">
          Practise instead
        </Link>
      )}
    </Card>
  )
}
