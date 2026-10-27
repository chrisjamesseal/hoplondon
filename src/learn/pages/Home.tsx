import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress, dayKey, stepsThroughLesson, flatLessons, lessonsOn, liveStreak, nextStep } from '../lib/gamify'
import { pickEmoji } from '../lib/emoji'
import { plainText } from './RichText'
import { Card, ProgressBar } from '../components'
import { splitUnitTitle, titleCase } from '../lib/titleCase'

export default function Home() {
  const course = useActiveCourse()
  const { hearts, progress, lessonsByDay, xpByDay, dailyLessons, archived, archiveCourse, weak } = useLearn()
  const navigate = useNavigate()
  const markStepsDone = useLearn((s) => s.markStepsDone)
  const [catchUp, setCatchUp] = useState<number | null>(null)
  const streak = liveStreak(useLearn((s) => s.streak), useLearn((s) => s.lastActiveDay), dayKey())

  if (!course) {
    return (
      <Card className="empty">
        <div className="big-emoji">🌱</div>
        <h2>Nothing to Learn Yet</h2>
        <p>Upload a PDF, type a topic or paste a link and Leap turns it into bite-sized lessons.</p>
        <Link to="/create" className="btn green">
          Create a course
        </Link>
      </Card>
    )
  }

  const cp = courseProgress(course, progress)
  const step = nextStep(course, progress)
  const nextTitle =
    step?.kind === 'lesson' ? flatLessons(course).find((l) => l.id === step.id)?.title : step ? `${course.units[step.unitIndex].title} quiz` : undefined
  const isArchived = (archived ?? []).includes(course.id)
  const today = lessonsOn(dayKey(), lessonsByDay, progress)
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const k = dayKey(d)
    return { k, label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1), on: lessonsOn(k, lessonsByDay, progress) > 0 || (xpByDay[k] ?? 0) > 0, today: i === 6 }
  })

  return (
    <div className="home-page">
      <Card className="course-card">
        <div className="course-card-top">
          <div className="card-hearts">
            <span title="Streak" className="streak-chip">🔥 {streak}</span>
            <span title="Hearts">❤️ {hearts}</span>
          </div>
          <span className="course-emoji">{course.emoji}</span>
          <div>
            <h1>{titleCase(course.title)}</h1>
            {course.summary && <p className="muted">{course.summary}</p>}
          </div>
        </div>
        <div className="row-between small">
          <span>📊 Course Progress</span>
          <strong>
            {cp.done}/{cp.total} lessons · {Math.round(cp.ratio * 100)}%
          </strong>
        </div>
        <ProgressBar value={cp.ratio} label="Course progress" />
        {step ? (
          <button className="btn green wide" onClick={() => navigate(step.kind === 'lesson' ? `/lesson/${step.id}` : `/quiz/${course.units[step.unitIndex].id}`)}>
            <span>{step.kind === 'quiz' ? '🏆' : '🚀'}</span>
            <span className="btn-text">{nextTitle && titleCase(nextTitle)}</span>
          </button>
        ) : (
          <div className="complete-box">
            <strong>🏆 Course Complete!</strong>
            <span className="muted small">You finished every lesson and quiz.</span>
            <button className="btn green wide" onClick={() => navigate(`/extend/${course.id}`)}>
              🚀 Add more lessons
            </button>
            <div className="complete-actions">
              <button className="btn blue" onClick={() => navigate('/practice')}>
                💪 Practise
              </button>
            </div>
          </div>
        )}
        <Link to="/courses" className="btn ghost wide change-course">
          🔄 Change Course
        </Link>
      </Card>

      <Card className="goal-card">
        <div className="row-between small">
          <span>🎯 Daily Goal</span>
          <strong>
            {Math.min(today, dailyLessons)}/{dailyLessons} {dailyLessons === 1 ? 'lesson' : 'lessons'}
          </strong>
        </div>
        <ProgressBar value={today / dailyLessons} color="gold" height={12} label="Daily goal" />
        {today >= dailyLessons && <p className="tiny good">Goal smashed today 🎉</p>}
      </Card>

      <Card className="streak-week">
        <div className="row-between small">
          <span>🔥 {streak} day streak</span>
          <span className="muted">Last 7 days</span>
        </div>
        <ol className="sw-days" aria-label="Days you learned this week">
          {days.map((d) => (
            <li key={d.k} className={`sw-day ${d.on ? 'on' : ''} ${d.today ? 'today' : ''}`}>
              <span className="sw-dot" aria-hidden>
                {d.on ? '🔥' : ''}
              </span>
              <span className="sw-label">{d.label}</span>
              <span className="sr-only">{d.on ? 'Learned' : 'No lesson'}</span>
            </li>
          ))}
        </ol>
        {weak?.length > 0 && cp.done > 0 && (
          <Link to="/practice" className="btn ghost wide weak-btn">
            🎯 Practise {weak.length} weak {weak.length === 1 ? 'spot' : 'spots'}
          </Link>
        )}
      </Card>

      <h2 className="section-title">🗺️ Your Units</h2>
      {course.units.map((unit, ui) => {
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        const { label, name } = splitUnitTitle(unit.title)
        return (
          <Link key={unit.id} to="/path" className={`card unit-row ${done === unit.lessons.length ? 'complete' : ''}`}>
            <span className="unit-row-emoji">{pickEmoji(unit.emoji, `${unit.title} ${unit.description}`, ui)}</span>
            <div className="unit-row-main">
              <div className="unit-row-head">
                {label ? <span className="unit-pill">{label}</span> : <span />}
                <span className="unit-row-count">
                  {done}/{unit.lessons.length}
                </span>
              </div>
              <strong>{name}</strong>
              <span className="muted small">{plainText(unit.description)}</span>
              <ProgressBar value={done / unit.lessons.length} color="gold" height={10} label={`${unit.title} progress`} />
            </div>
          </Link>
        )
      })}
      <Link to="/path" className="btn blue wide">
        🗺️ Open Lesson Path
      </Link>
      <button className="btn ghost wide delete-course" onClick={() => setCatchUp(cp.done)}>
        ✅ Set my progress
      </button>
      {catchUp !== null && (
        <div className="modal-bg" onClick={() => setCatchUp(null)}>
          <div className="modal" role="dialog" aria-label="Set my progress" onClick={(e) => e.stopPropagation()}>
            <div className="big-emoji">✅</div>
            <h2>How Far Were You?</h2>
            <p className="muted">Mark the first lessons as done. Anything already finished stays finished.</p>
            <div className="stepper">
              <button className="btn ghost" aria-label="One fewer" onClick={() => setCatchUp(Math.max(0, catchUp - 1))}>
                −
              </button>
              <strong className="stepper-n">
                {catchUp} of {cp.total}
              </strong>
              <button className="btn ghost" aria-label="One more" onClick={() => setCatchUp(Math.min(cp.total, catchUp + 1))}>
                +
              </button>
            </div>
            <button
              className="btn green wide"
              onClick={() => {
                markStepsDone(stepsThroughLesson(course, catchUp))
                setCatchUp(null)
              }}
            >
              Mark as done
            </button>
            <button className="btn ghost wide" onClick={() => setCatchUp(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <Link to={`/rewrite/${course.id}`} className="btn ghost wide delete-course">
        ✏️ Rewrite course
      </Link>
      {!isArchived && (
        <button
          className="btn ghost wide delete-course"
          onClick={() => {
            archiveCourse(course.id)
            navigate('/courses')
          }}
        >
          📦 Add to archive
        </button>
      )}
    </div>
  )
}
