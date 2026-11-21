import { useState } from 'react'
import { LayoutGrid, List } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { groupByCategory } from '../lib/categorise'
import { Card, ProgressBar } from '../components'
import { ragOf } from '../lib/rag'
import { titleCase } from '../lib/titleCase'
import DraftCards from './DraftCards'
import { BuildStatus } from './BuildStatus'

export default function CourseCategories() {
  const { courses, progress, archived, setActiveCourse } = useLearn()
  const hasDrafts = (useLearn((s) => s.drafts) ?? []).some((d) => !d.courseId)
  const navigate = useNavigate()
  const active = useActiveCourse()
  const activeCp = active ? courseProgress(active, progress) : null
  const archivedIds = archived ?? []
  // Archived courses live on their own shelf, so they never count in the groups or the list
  const live = courses.filter((c) => !archivedIds.includes(c.id))
  const groups = groupByCategory(live)
  const [view, setView] = useState<'groups' | 'list'>(() => {
    try {
      return localStorage.getItem('leap-courses-view') === 'groups' ? 'groups' : 'list'
    } catch {
      return 'list'
    }
  })
  const pick = (v: 'groups' | 'list') => {
    setView(v)
    try {
      localStorage.setItem('leap-courses-view', v)
    } catch {
      // Not remembered, still works
    }
  }
  // The course being learned first, then the rest as they were added
  const ordered = [...live].sort((a, b) => Number(b.id === active?.id) - Number(a.id === active?.id))

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

      {courses.length > 0 && (
        <div className="view-toggle" role="group" aria-label="How to show courses">
          <button type="button" className={view === 'groups' ? 'on' : ''} aria-pressed={view === 'groups'} onClick={() => pick('groups')}>
            <LayoutGrid size={18} strokeWidth={2.25} aria-hidden /> Grouped
          </button>
          <button type="button" className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => pick('list')}>
            <List size={18} strokeWidth={2.25} aria-hidden /> List
          </button>
        </div>
      )}

      <DraftCards />

      {courses.length === 0 && !hasDrafts ? (
        <Card className="empty">
          <div className="big-emoji">📚</div>
          <h2>No Courses Yet</h2>
          <p className="muted">Make one from a PDF, a topic or a link and it will show up here.</p>
          <Link to="/create" className="btn green">
            Create a course
          </Link>
        </Card>
      ) : (
        <>
        {view === 'list' && (
          <div className="course-list">
            {ordered.length === 0 && courses.length > 0 && <p className="muted small">Everything is in the archive. Bring a course back to see it here.</p>}
            {ordered.map((c) => {
              const cp = courseProgress(c, progress)
              const isActive = c.id === active?.id
              return (
                <Card key={c.id} className={`course-row ${isActive ? 'active' : ''}`}>
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
                        <strong>{titleCase(c.title)}</strong>
                        {isActive && <span className="pill">Learning</span>}
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
                  <BuildStatus course={c} />
                </Card>
              )
            })}
          </div>
        )}
        {view === 'groups' && active && activeCp && (
          <Card className="course-row active">
            <button className="course-row-main" onClick={() => navigate('/')}>
              <span className="course-emoji">{active.emoji}</span>
              <div className="grow">
                <div className="row-between">
                  <strong>{titleCase(active.title)}</strong>
                  <span className="pill">Learning</span>
                </div>
                <div className="tiny muted">
                  {active.units.length} units · {activeCp.total} lessons
                </div>
                <div className="row-between tiny">
                  <ProgressBar value={activeCp.ratio} color={ragOf(activeCp.ratio)} height={10} label={`${active.title} progress`} />
                  <span className={`pct rag-text ${ragOf(activeCp.ratio)}`}>{Math.round(activeCp.ratio * 100)}%</span>
                </div>
              </div>
            </button>
            <BuildStatus course={active} />
          </Card>
        )}
        {view === 'groups' && (
        <div className="cat-grid">
          {groups.length === 0 && courses.length > 0 && <p className="muted small">Everything is in the archive. Bring a course back to see it here.</p>}
          {groups.map(({ category, courses: list }) => {
            const totals = list.reduce(
              (t, c) => {
                const cp = courseProgress(c, progress)
                return { done: t.done + cp.done, total: t.total + cp.total }
              },
              { done: 0, total: 0 },
            )
            const ratio = totals.total ? totals.done / totals.total : 0
            return (
              <button key={category.id} className={`cat-tile rag-${ragOf(ratio)}`} onClick={() => navigate(`/courses/${category.id}`)}>
                <span className="cat-emoji">{category.emoji}</span>
                <strong className="cat-name">{category.label}</strong>
                <span className="tiny muted cat-count">
                  {list.length} {list.length === 1 ? 'course' : 'courses'}
                </span>
                <ProgressBar value={ratio} color={ragOf(ratio)} height={8} label={`${category.label} progress`} />
              </button>
            )
          })}
        </div>
        )}
        <button className="btn ghost wide archive-link" onClick={() => navigate('/courses/archive')}>
          📦 Archive{archivedIds.length ? ` (${archivedIds.length})` : ''}
        </button>
        </>
      )}
    </div>
  )
}
