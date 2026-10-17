import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress, dayKey, nextLesson } from '../lib/gamify'
import { pickEmoji } from '../lib/emoji'
import { Card, ProgressBar } from '../components'

export default function Home() {
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

  return (
    <div className="home-page">
      <Card className="course-card">
        <div className="course-card-top">
          <span className="course-emoji">{course.emoji}</span>
          <div>
            <h1>{course.title}</h1>
            {course.summary && <p className="muted">{course.summary}</p>}
          </div>
        </div>
        <div className="row-between small">
          <span>📊 Course progress</span>
          <strong>
            {cp.done}/{cp.total} lessons · {Math.round(cp.ratio * 100)}%
          </strong>
        </div>
        <ProgressBar value={cp.ratio} label="Course progress" />
        {next ? (
          <button className="btn green wide" onClick={() => navigate(`/lesson/${next.id}`)}>
            🚀 {cp.done ? 'Continue' : 'Start learning'}: {next.title}
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

      <h2 className="section-title">🗺️ Your units</h2>
      {course.units.map((unit, ui) => {
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        return (
          <Link key={unit.id} to="/path" className="card unit-row">
            <span className="unit-row-emoji">{pickEmoji(unit.emoji, `${unit.title} ${unit.description}`, ui)}</span>
            <div className="unit-row-main">
              <strong>{unit.title}</strong>
              <span className="muted small">{unit.description}</span>
              <ProgressBar value={done / unit.lessons.length} color="gold" height={10} label={`${unit.title} progress`} />
            </div>
            <span className="unit-row-count">
              {done}/{unit.lessons.length}
            </span>
          </Link>
        )
      })}
      <Link to="/path" className="btn blue wide">
        🗺️ Open lesson path
      </Link>
    </div>
  )
}
