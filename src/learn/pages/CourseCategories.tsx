import { Link, useNavigate } from 'react-router-dom'
import { useActiveCourse, useLearn } from '../store'
import { courseProgress } from '../lib/gamify'
import { groupByCategory } from '../lib/categorise'
import { Card, ProgressBar } from '../components'
import { ragOf } from '../lib/rag'
import { titleCase } from '../lib/titleCase'

export default function CourseCategories() {
  const { courses, progress, archived } = useLearn()
  const navigate = useNavigate()
  const active = useActiveCourse()
  const activeCp = active ? courseProgress(active, progress) : null
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
        <>
        {active && activeCp && (
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
          </Card>
        )}
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
              <button key={category.id} className={`cat-tile rag-${ragOf(ratio)}`} onClick={() => navigate(`/courses/${category.id}`)}>
                <span className="cat-emoji">{category.emoji}</span>
                <strong className="cat-name">{category.label}</strong>
                <span className="tiny muted cat-count">
                  {list.length} {list.length === 1 ? 'course' : 'courses'}
                </span>
                <ProgressBar value={ratio} color={ragOf(ratio)} height={8} label={`${category.label} progress`} />
                <span className={`tiny cat-pct rag-text ${ragOf(ratio)}`}>{Math.round(ratio * 100)}%</span>
              </button>
            )
          })}
        </div>
        </>
      )}
    </div>
  )
}
