import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { Card, ProgressBar } from '../components'

const SOURCE_ICON = { pdf: '📄', topic: '💭', link: '🔗', language: '🗣️', demo: '🌱' }

export default function Courses() {
  const { courses, progress, activeCourseId, setActiveCourse, deleteCourse } = useLearn()
  const navigate = useNavigate()
  const [confirm, setConfirm] = useState<string | null>(null)

  return (
    <div className="courses">
      <div className="row-between">
        <h1>My courses</h1>
        {courses.length > 0 && (
          <Link to="/create" className="btn green small-btn">
            + New
          </Link>
        )}
      </div>
      {courses.length === 0 && (
        <Card className="empty">
          <div className="big-emoji">📚</div>
          <h2>No courses yet</h2>
          <p className="muted">Make one from a PDF, a topic or a link and it will show up here.</p>
          <Link to="/create" className="btn green">
            Create a course
          </Link>
        </Card>
      )}
      <div className="course-list">
        {courses.map((c) => {
          const cp = courseProgress(c, progress)
          const active = c.id === activeCourseId
          return (
            <Card key={c.id} className={`course-row ${active ? 'active' : ''}`}>
              <button
                className="course-row-main"
                onClick={() => {
                  setActiveCourse(c.id)
                  navigate('/')
                }}
              >
                <span className="course-emoji">{c.emoji}</span>
                <div className="grow">
                  <div className="row-between">
                    <strong>{c.title}</strong>
                    {active && <span className="pill">Learning</span>}
                  </div>
                  <div className="tiny muted">
                    {SOURCE_ICON[c.source.kind]} {c.source.label} · {c.units.length} units · {cp.total} lessons
                    {c.generator === 'claude' ? ' · ✨ Claude' : ''}
                  </div>
                  <div className="row-between tiny">
                    <ProgressBar value={cp.ratio} height={10} label={`${c.title} progress`} />
                    <span className="pct">{Math.round(cp.ratio * 100)}%</span>
                  </div>
                </div>
              </button>
              {confirm === c.id ? (
                <div className="confirm">
                  <span className="small">Delete this course and its progress?</span>
                  <button className="btn red small-btn" onClick={() => (deleteCourse(c.id), setConfirm(null))}>
                    Delete
                  </button>
                  <button className="btn ghost small-btn" onClick={() => setConfirm(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button className="icon-btn del" aria-label={`Delete ${c.title}`} onClick={() => setConfirm(c.id)}>
                  🗑
                </button>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
