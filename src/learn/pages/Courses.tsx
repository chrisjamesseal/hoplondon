import { Link, useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { Card, ProgressBar } from '../components'
import type { Course } from '../types'
import { titleCase } from '../lib/titleCase'

export default function Courses() {
  const { courses, progress, activeCourseId, setActiveCourse, archived, unarchiveCourse } = useLearn()
  const navigate = useNavigate()
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
              {c.units.length} units · {cp.total} lessons
            </div>
            <div className="row-between tiny">
              <ProgressBar value={cp.ratio} height={10} label={`${c.title} progress`} />
              <span className="pct">{Math.round(cp.ratio * 100)}%</span>
            </div>
          </div>
        </button>
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

    </div>
  )
}
