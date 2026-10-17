import { useState } from 'react'
import { useLearn } from '../store'
import { dayKey, levelInfo, lessonsOn, liveStreak } from '../lib/gamify'
import { Card, ProgressBar } from '../components'

const GOALS = [
  { n: 1, label: 'Casual' },
  { n: 2, label: 'Regular' },
  { n: 3, label: 'Serious' },
  { n: 5, label: 'Intense' },
]

export default function Profile() {
  const s = useLearn()
  const [resetAsk, setResetAsk] = useState(false)

  const lvl = levelInfo(s.xp)
  const streak = liveStreak(s.streak, s.lastActiveDay, dayKey())
  const done = Object.values(s.progress).filter((p) => p.completions).length
  const crowns = Object.values(s.progress).filter((p) => p.bestAccuracy >= 1).length
  const made = s.courses.filter((c) => c.generator !== 'demo').length

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2), n: lessonsOn(dayKey(d), s.lessonsByDay, s.progress), today: i === 6 }
  })
  const weekMax = Math.max(s.dailyLessons, ...week.map((w) => w.n))
  const weekTotal = week.reduce((a, w) => a + w.n, 0)

  const badges = [
    { icon: '🐣', name: 'First steps', desc: 'Finish a lesson', have: done, need: 1 },
    { icon: '🔥', name: 'On fire', desc: 'Reach a 3 day streak', have: streak, need: 3 },
    { icon: '📅', name: 'Week warrior', desc: 'Reach a 7 day streak', have: streak, need: 7 },
    { icon: '👑', name: 'Perfectionist', desc: 'Ace 5 lessons with no mistakes', have: crowns, need: 5 },
    { icon: '🧠', name: 'Scholar', desc: 'Earn 500 XP', have: s.xp, need: 500 },
    { icon: '🛠', name: 'Creator', desc: 'Make your own course', have: made, need: 1 },
  ]

  return (
    <div className="profile">
      <Card className="level-card">
        <div className="level-badge">{lvl.level}</div>
        <div className="grow">
          <h1>Level {lvl.level}</h1>
          <div className="row-between small">
            <span>{lvl.into} XP</span>
            <span className="muted">{lvl.needed - lvl.into} XP to level {lvl.level + 1}</span>
          </div>
          <ProgressBar value={lvl.into / lvl.needed} color="blue" label="Level progress" />
        </div>
      </Card>

      <div className="stat-grid">
        <Card className="stat-tile">
          <span className="stat-big">🔥 {streak}</span>
          <span className="muted small">Day streak</span>
        </Card>
        <Card className="stat-tile">
          <span className="stat-big">⚡ {s.xp}</span>
          <span className="muted small">Total XP</span>
        </Card>
        <Card className="stat-tile">
          <span className="stat-big">✅ {done}</span>
          <span className="muted small">Lessons done</span>
        </Card>
        <Card className="stat-tile">
          <span className="stat-big">👑 {crowns}</span>
          <span className="muted small">Crowns</span>
        </Card>
      </div>

      <Card>
        <div className="row-between">
          <h2>This week</h2>
          <span className="muted small">{weekTotal} {weekTotal === 1 ? 'lesson' : 'lessons'}</span>
        </div>
        <div className="week">
          {week.map((w, i) => (
            <div key={i} className="week-col">
              <span className="week-val">{w.n || ''}</span>
              <div className="week-track">
                <div className={`week-bar ${w.n >= s.dailyLessons ? 'hit' : ''}`} style={{ height: `${(w.n / weekMax) * 100}%` }} />
                <div className="week-goal" style={{ bottom: `${(s.dailyLessons / weekMax) * 100}%` }} />
              </div>
              <span className={`week-day ${w.today ? 'today' : ''}`}>{w.day}</span>
            </div>
          ))}
        </div>
        <p className="tiny muted">Dashed line is your daily goal.</p>
      </Card>

      <Card>
        <h2>Achievements</h2>
        <div className="badges">
          {badges.map((b) => {
            const got = b.have >= b.need
            return (
              <div key={b.name} className={`badge ${got ? 'got' : ''}`}>
                <span className="badge-icon">{b.icon}</span>
                <div className="grow">
                  <div className="row-between">
                    <strong>{b.name}</strong>
                    <span className="tiny muted">
                      {Math.min(b.have, b.need)}/{b.need}
                    </span>
                  </div>
                  <span className="tiny muted">{b.desc}</span>
                  <ProgressBar value={b.have / b.need} color="gold" height={8} label={b.name} />
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2>Daily goal</h2>
        <p className="tiny muted">How many lessons do you want to finish each day?</p>
        <div className="goal-options">
          {GOALS.map((g) => (
            <button key={g.n} className={`goal-opt ${s.dailyLessons === g.n ? 'active' : ''}`} onClick={() => s.setDailyLessons(g.n)}>
              <strong>{g.label}</strong>
              <span>{g.n} {g.n === 1 ? 'lesson' : 'lessons'} a day</span>
            </button>
          ))}
        </div>
      </Card>


      <Card>
        <h2>Settings</h2>
        <label className="toggle">
          <input type="checkbox" checked={s.sound} onChange={(e) => s.setSound(e.target.checked)} />
          <span>Sound effects</span>
        </label>
        {resetAsk ? (
          <div className="confirm">
            <span className="small">Reset all XP, streaks and lesson progress?</span>
            <button className="btn red small-btn" onClick={() => (s.resetProgress(), setResetAsk(false))}>
              Reset
            </button>
            <button className="btn ghost small-btn" onClick={() => setResetAsk(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setResetAsk(true)}>
            Reset progress
          </button>
        )}
        <p className="tiny muted">
          Everything is saved in this browser only.
        </p>
      </Card>
    </div>
  )
}
