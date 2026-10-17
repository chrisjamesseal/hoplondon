import { Link, useNavigate } from 'react-router-dom'
import { useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { groupByCategory } from '../lib/categorise'
import { Card, ProgressBar } from '../components'

export default function CourseCategories() {
  const { courses, progress, archived } = useLearn()
  const navigate = useNavigate()
  const archivedIds = archived ?? []
  const groups = groupByCategory(courses)

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

      {groups.length === 0 ? (
        <Card className="empty">
          <div className="big-emoji">📚</div>
          <h2>No Courses Yet</h2>
          <p className="muted">Make one from a PDF, a topic or a link and it will show up here.</p>
          <Link to="/create" className="btn green">
            Create a course
          </Link>
        </Card>
      ) : (
        <div className="cat-grid">
          {groups.map(({ category, courses: list }) => {
            // Progress covers courses still in progress; finished ones only count if that is all there is
            const live = list.filter((c) => !archivedIds.includes(c.id))
            const counted = live.length ? live : list
            const totals = counted.reduce(
              (t, c) => {
                const cp = courseProgress(c, progress)
                return { done: t.done + cp.done, total: t.total + cp.total }
              },
              { done: 0, total: 0 },
            )
            const ratio = totals.total ? totals.done / totals.total : 0
            return (
              <button key={category.id} className="cat-tile" onClick={() => navigate(`/courses/${category.id}`)}>
                <span className="cat-emoji">{category.emoji}</span>
                <strong className="cat-name">{category.label}</strong>
                <span className="tiny muted cat-count">
                  {list.length} {list.length === 1 ? 'course' : 'courses'}
                </span>
                <ProgressBar value={ratio} height={8} label={`${category.label} progress`} />
                <span className="tiny cat-pct">{Math.round(ratio * 100)}%</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
