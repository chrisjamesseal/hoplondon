import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress, dayKey, flatLessons, lessonsOn, nextStep } from '../lib/gamify'
import { pickEmoji } from '../lib/emoji'
import { plainText } from './RichText'
import { Card, ProgressBar } from '../components'
import { splitUnitTitle, titleCase } from '../lib/titleCase'

export default function Home() {
  const course = useActiveCourse()
  const { progress, lessonsByDay, dailyLessons, archived, archiveCourse, deleteCourse } = useLearn()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()

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

  return (
    <div className="home-page">
      <Card className="course-card">
        <div className="course-card-top">
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
            {step.kind === 'quiz' ? '🏆' : '🚀'} {nextTitle && titleCase(nextTitle)}
          </button>
        ) : (
          <div className="complete-box">
            <strong>🏆 Course Complete!</strong>
            <span className="muted small">You finished every lesson and quiz.</span>
            <button className="btn green wide" onClick={() => navigate(`/extend/${course.id}`)}>
              🚀 Make a harder follow on
            </button>
            <div className="complete-actions">
              <button className="btn blue" onClick={() => navigate('/practice')}>
                💪 Practise
              </button>
              {!isArchived && (
                <button
                  className="btn ghost"
                  onClick={() => {
                    archiveCourse(course.id)
                    navigate('/courses')
                  }}
                >
                  📦 Add to archive
                </button>
              )}
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

      <h2 className="section-title">🗺️ Your Units</h2>
      {course.units.map((unit, ui) => {
        const done = unit.lessons.filter((l) => progress[l.id]?.completions).length
        const { label, name } = splitUnitTitle(unit.title)
        return (
          <Link key={unit.id} to="/path" className="card unit-row">
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
      <button className="btn ghost wide danger-text delete-course" onClick={() => setConfirmDelete(true)}>
        🗑 Delete Course
      </button>

      {confirmDelete && (
        <div className="modal-bg" onClick={() => setConfirmDelete(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()}>
            <div className="big-emoji">{course.emoji}</div>
            <h2 id="del-title">Delete This Course?</h2>
            <p className="muted">{titleCase(course.title)} and all its progress will be removed. This can't be undone.</p>
            <button
              className="btn red wide"
              onClick={() => {
                deleteCourse(course.id)
                setConfirmDelete(false)
                navigate('/courses')
              }}
            >
              Delete Course
            </button>
            <button className="btn ghost wide" autoFocus onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
