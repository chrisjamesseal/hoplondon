import { useState } from 'react'
import { useLearn } from '../store'
import { dayKey, levelInfo, liveStreak } from '../lib/gamify'
import { Card, ProgressBar } from '../components'

const GOALS = [
  { xp: 10, label: 'Casual' },
  { xp: 20, label: 'Regular' },
  { xp: 30, label: 'Serious' },
  { xp: 50, label: 'Intense' },
]

export default function Profile() {
  const s = useLearn()
  const [key, setKey] = useState(s.apiKey)
  const [saved, setSaved] = useState(false)
  const [resetAsk, setResetAsk] = useState(false)

  const lvl = levelInfo(s.xp)
  const streak = liveStreak(s.streak, s.lastActiveDay, dayKey())
  const done = Object.values(s.progress).filter((p) => p.completions).length
  const crowns = Object.values(s.progress).filter((p) => p.bestAccuracy >= 1).length
  const made = s.courses.filter((c) => c.generator !== 'demo').length

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2), xp: s.xpByDay[dayKey(d)] ?? 0, today: i === 6 }
  })
  const weekMax = Math.max(s.dailyGoal, ...week.map((w) => w.xp))
  const weekTotal = week.reduce((a, w) => a + w.xp, 0)

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
          <span className="muted small">{weekTotal} XP</span>
        </div>
        <div className="week">
          {week.map((w, i) => (
            <div key={i} className="week-col">
              <span className="week-val">{w.xp || ''}</span>
              <div className="week-track">
                <div className={`week-bar ${w.xp >= s.dailyGoal ? 'hit' : ''}`} style={{ height: `${(w.xp / weekMax) * 100}%` }} />
                <div className="week-goal" style={{ bottom: `${(s.dailyGoal / weekMax) * 100}%` }} />
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
        <div className="goal-options">
          {GOALS.map((g) => (
            <button key={g.xp} className={`goal-opt ${s.dailyGoal === g.xp ? 'active' : ''}`} onClick={() => s.setDailyGoal(g.xp)}>
              <strong>{g.label}</strong>
              <span>{g.xp} XP a day</span>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2>✨ Claude lessons</h2>
        <p className="small muted">
          With a Claude API key, Claude reads your PDF, topic or link and writes proper lessons. Without one, Leap builds simpler lessons from the
          text itself. Your key stays in this browser and is only sent to Anthropic.
        </p>
        <div className="key-row">
          <input
            className="input"
            type="password"
            placeholder="sk-ant-…"
            value={key}
            onChange={(e) => (setKey(e.target.value), setSaved(false))}
            autoComplete="off"
          />
          <button className="btn blue" onClick={() => (s.setApiKey(key), setSaved(true))}>
            Save
          </button>
        </div>
        {saved && <p className="tiny good">{key.trim() ? 'Saved. Claude mode is on ✨' : 'Key removed. Basic mode is on.'}</p>}
        <p className="tiny muted">
          Get a key at{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
        </p>
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
