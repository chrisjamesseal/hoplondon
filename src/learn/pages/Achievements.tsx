import { Link } from 'react-router-dom'
import { useLearn } from '../store'
import { achievementStats, allAchievementStates } from '../lib/achievements'
import { Card, ProgressBar } from '../components'

export default function Achievements() {
  const s = useLearn()
  const states = allAchievementStates(achievementStats(s))
  const earned = states.flatMap((st) => st.a.tiers.slice(0, st.level).map((target, i) => ({ st, target, level: i + 1 })))
  const total = states.reduce((n, st) => n + st.a.tiers.length, 0)
  const aims = states.filter((st) => st.next !== null)

  return (
    <div className="profile">
      <div className="cat-head">
        <Link to="/profile" className="icon-btn cat-back" aria-label="Back to profile">
          ‹
        </Link>
        <h1>Achievements</h1>
      </div>
      <Card>
        <div className="row-between small">
          <span>🏅 Earned</span>
          <strong>
            {earned.length}/{total}
          </strong>
        </div>
        <ProgressBar value={earned.length / total} color="gold" label="Achievements earned" />
      </Card>

      <h2 className="section-title">To Aim For</h2>
      <Card>
        <div className="badges">
          {aims.length === 0 && <p className="muted">Every level earned. Legend.</p>}
          {aims.map(({ a, value, level, next }) => (
            <div key={a.id} className="badge">
              <span className="badge-icon">{a.icon}</span>
              <div className="grow">
                <div className="row-between">
                  <strong>{a.name}</strong>
                  <span className="tiny muted">Level {level + 1}</span>
                </div>
                <span className="tiny muted">{a.describe(next!)}</span>
                <div className="row-between tiny muted">
                  <span />
                  <span>
                    {value.toLocaleString('en-GB')}/{next!.toLocaleString('en-GB')}
                  </span>
                </div>
                <ProgressBar value={value / next!} color="gold" height={8} label={a.name} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="section-title">Completed</h2>
      <Card>
        {earned.length === 0 ? (
          <p className="muted">Nothing yet. Finish a lesson to earn your first one.</p>
        ) : (
          <div className="badges">
            {earned.map(({ st, target, level }) => (
              <div key={`${st.a.id}-${level}`} className="badge got">
                <span className="badge-icon">{st.a.icon}</span>
                <div className="grow">
                  <div className="row-between">
                    <strong>{st.a.name}</strong>
                    <span className="tiny muted">Level {level}</span>
                  </div>
                  <span className="tiny muted">{st.a.describe(target)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
