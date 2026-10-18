import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { Card, ProgressBar } from '../components'
import type { Course } from '../types'
import { titleCase } from '../lib/titleCase'
import { categoryById, categoryOf } from '../lib/categorise'
import { ragOf } from '../lib/rag'

export default function Courses() {
  const { courses, progress, activeCourseId, setActiveCourse, archived, unarchiveCourse, deleteCourse } = useLearn()
  const navigate = useNavigate()
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const archivedIds = archived ?? []
  const { cat } = useParams()
  const isArchive = cat === 'archive'
  const category = isArchive ? undefined : categoryById(cat)
  const inCategory = category ? courses.filter((c) => categoryOf(c).id === category.id) : courses
  const live = inCategory.filter((c) => !archivedIds.includes(c.id))
  const shelf = inCategory.filter((c) => archivedIds.includes(c.id))

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
              {c.units.length} units · {cp.total} lessons
            </div>
            <div className="row-between tiny">
              <ProgressBar value={cp.ratio} color={ragOf(cp.ratio)} height={10} label={`${c.title} progress`} />
              <span className={`pct rag-text ${ragOf(cp.ratio)}`}>{Math.round(cp.ratio * 100)}%</span>
            </div>
          </div>
        </button>
        {inArchive &&
          (confirmId === c.id ? (
            <div className="archive-confirm">
              <span className="small muted">Delete this course and all its progress?</span>
              <button className="btn red wide" onClick={() => (deleteCourse(c.id), setConfirmId(null))}>
                🗑 Delete Course
              </button>
              <button className="btn ghost wide" onClick={() => setConfirmId(null)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="btn ghost wide danger-text archive-delete" onClick={() => setConfirmId(c.id)}>
              🗑 Delete Course
            </button>
          ))}
      </Card>
    )
  }

  return (
    <div className="courses">
      <div className="row-between">
        <div className="cat-head">
          <Link to="/courses" className="icon-btn cat-back" aria-label="Back to categories">
            ‹
          </Link>
          <h1>
            {isArchive ? '📦 Archive' : category ? `${category.emoji} ${category.label}` : 'My Courses'}
          </h1>
        </div>
        {courses.length > 0 && !isArchive && (
          <Link to="/create" className="btn green small-btn">
            + New
          </Link>
        )}
      </div>
      {isArchive && shelf.length === 0 && (
        <Card className="empty">
          <div className="big-emoji">📦</div>
          <h2>Archive is Empty</h2>
          <p className="muted">Courses you add to the archive show up here.</p>
        </Card>
      )}
      {!isArchive && live.length === 0 && (
        <Card className="empty">
          <div className="big-emoji">📚</div>
          <h2>{shelf.length ? 'Nothing in Progress' : 'No Courses Yet'}</h2>
          <p className="muted">Make one from a PDF, a topic or a link and it will show up here.</p>
          <Link to="/create" className="btn green">
            Create a course
          </Link>
        </Card>
      )}
      {!isArchive && <div className="course-list">{live.map((c) => row(c, false))}</div>}

      {shelf.length > 0 && (
        <>
          {!isArchive && <h2 className="section-title">📦 Archive</h2>}
          <p className="tiny muted archive-note">Finished courses. Tap one to bring it back.</p>
          <div className="course-list">{shelf.map((c) => row(c, true))}</div>
        </>
      )}

    </div>
  )
}
