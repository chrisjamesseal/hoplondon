import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { Card, ProgressBar } from '../components'
import type { Course } from '../types'
import { titleCase } from '../lib/titleCase'

const SOURCE_ICON = { pdf: '📄', topic: '💭', link: '🔗', language: '🗣️', demo: '🌱' }

export default function Courses() {
  const { courses, progress, activeCourseId, setActiveCourse, deleteCourse, archived, unarchiveCourse } = useLearn()
  const navigate = useNavigate()
  const [toDelete, setToDelete] = useState<Course | null>(null)
  const archivedIds = archived ?? []
  const live = courses.filter((c) => !archivedIds.includes(c.id))
  const shelf = courses.filter((c) => archivedIds.includes(c.id))

  const row = (c: Course, inArchive: boolean) => {
    const cp = courseProgress(c, progress)
    const active = !inArchive && c.id === activeCourseId
    return (
      <Card key={c.id} className={`course-row ${active ? 'active' : ''} ${inArchive ? 'archived' : ''}`}>
        <button
          className="course-row-main"
          onClick={() => {
            if (inArchive) unarchiveCourse(c.id)
            else setActiveCourse(c.id)
            navigate('/')
          }}
        >
          <span className="course-emoji">{c.emoji}</span>
          <div className="grow">
            <div className="row-between">
              <strong>{titleCase(c.title)}</strong>
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
        <div className="row-actions">
          {inArchive && (
            <button className="icon-btn" aria-label={`Restore ${c.title}`} title="Restore" onClick={() => unarchiveCourse(c.id)}>
              ↩️
            </button>
          )}
          <button className="icon-btn del" aria-label={`Delete ${c.title}`} title="Delete" onClick={() => setToDelete(c)}>
            🗑
          </button>
        </div>
      </Card>
    )
  }

  return (
    <div className="courses">
      <div className="row-between">
        <h1>My Courses</h1>
        {courses.length > 0 && (
          <Link to="/create" className="btn green small-btn">
            + New
          </Link>
        )}
      </div>
      {live.length === 0 && (
        <Card className="empty">
          <div className="big-emoji">📚</div>
          <h2>{shelf.length ? 'Nothing in Progress' : 'No Courses Yet'}</h2>
          <p className="muted">Make one from a PDF, a topic or a link and it will show up here.</p>
          <Link to="/create" className="btn green">
            Create a course
          </Link>
        </Card>
      )}
      <div className="course-list">{live.map((c) => row(c, false))}</div>

      {shelf.length > 0 && (
        <>
          <h2 className="section-title">📦 Archive</h2>
          <p className="tiny muted archive-note">Finished courses. Tap one to bring it back.</p>
          <div className="course-list">{shelf.map((c) => row(c, true))}</div>
        </>
      )}

      {toDelete && (
        <div className="modal-bg" onClick={() => setToDelete(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="del-title" onClick={(e) => e.stopPropagation()}>
            <div className="big-emoji">{toDelete.emoji}</div>
            <h2 id="del-title">Delete This Course?</h2>
            <p className="muted">
              {titleCase(toDelete.title)} and all its progress will be removed. This can't be undone.
            </p>
            <button
              className="btn red wide"
              onClick={() => {
                deleteCourse(toDelete.id)
                setToDelete(null)
              }}
            >
              Delete course
            </button>
            <button className="btn ghost wide" autoFocus onClick={() => setToDelete(null)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
