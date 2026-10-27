import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLearn } from '../store'
import { dayKey, levelInfo, lessonsOn, liveStreak } from '../lib/gamify'
import { Card, ProgressBar } from '../components'
import { achievementStats, allAchievementStates } from '../lib/achievements'

const GOALS = [
  { n: 1, label: 'Casual' },
  { n: 2, label: 'Regular' },
  { n: 3, label: 'Serious' },
  { n: 5, label: 'Intense' },
]

interface InstallEvent extends Event {
  prompt: () => Promise<void>
}

/** Puts the Leap frog on the home screen: one tap on Android, steps on iPhone */
function InstallCard() {
  const [evt, setEvt] = useState<InstallEvent | null>(null)
  const standalone = typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as InstallEvent)
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  if (standalone) return null
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
  return (
    <Card className="install-card">
      <div className="install-row">
        <span className="install-icon" aria-hidden>
          🐸
        </span>
        <div className="grow">
          <h2>Add Leap to Your Home Screen</h2>
          <p className="muted small">
            {ios ? 'Tap the Share button, then Add to Home Screen. Leap opens full screen like an app.' : 'Open it like an app, full screen, one tap away.'}
          </p>
        </div>
      </div>
      {evt && (
        <button className="btn green wide" onClick={() => evt.prompt().then(() => setEvt(null))}>
          Install Leap
        </button>
      )}
    </Card>
  )
}

export default function Profile() {
  const s = useLearn()
  const [resetAsk, setResetAsk] = useState(false)
  const [backupMsg, setBackupMsg] = useState('')

  async function backup() {
    try {
      await navigator.clipboard.writeText(localStorage.getItem('leap-v1') ?? '')
      setBackupMsg('Copied. Paste it into Notes to keep it safe.')
    } catch {
      setBackupMsg("Couldn't copy. Try again.")
    }
  }

  async function restore() {
    try {
      const text = (await navigator.clipboard.readText()).trim()
      const parsed = JSON.parse(text)
      if (!parsed?.state?.courses) throw new Error()
      localStorage.setItem('leap-v1', text)
      location.reload()
    } catch {
      setBackupMsg('Copy your backup first, then tap Restore.')
    }
  }

  const lvl = levelInfo(s.xp)
  const streak = liveStreak(s.streak, s.lastActiveDay, dayKey())
  const done = Object.values(s.progress).filter((p) => p.completions).length
  const crowns = Object.values(s.progress).filter((p) => p.bestAccuracy >= 1).length

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return { day: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2), n: lessonsOn(dayKey(d), s.lessonsByDay, s.progress), today: i === 6 }
  })
  const weekMax = Math.max(s.dailyLessons, ...week.map((w) => w.n))
  const weekTotal = week.reduce((a, w) => a + w.n, 0)

  const states = allAchievementStates(achievementStats(s))

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

      <InstallCard />

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
          <h2>This Week</h2>
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
        <div className="row-between">
          <h2>Achievements</h2>
          <Link to="/profile/achievements" className="small see-all">
            See all ›
          </Link>
        </div>
        <div className="badges">
          {states.map(({ a, value, level, next }) => {
            const target = next ?? a.tiers[a.tiers.length - 1]
            return (
              <div key={a.id} className={`badge ${level > 0 ? 'got' : ''}`}>
                <span className="badge-icon">{a.icon}</span>
                <div className="grow">
                  <div className="row-between">
                    <strong>{a.name}</strong>
                    <span className="tiny muted">{next === null ? `Level ${level} (max)` : level > 0 ? `Level ${level}` : 'Not started'}</span>
                  </div>
                  <span className="tiny muted">{a.describe(target)}</span>
                  <ProgressBar value={Math.min(1, value / target)} color="gold" height={8} label={a.name} />
                  {next !== null && (
                    <span className="tiny muted">
                      {value.toLocaleString('en-GB')}/{next.toLocaleString('en-GB')}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card className="goal-card-wrap">
        <h2>Daily Goal</h2>
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


      <Card className="settings-card">
        <h2>Settings</h2>
        <label className="toggle">
          <input type="checkbox" checked={s.sound} onChange={(e) => s.setSound(e.target.checked)} />
          <span>Sound effects</span>
        </label>
        {resetAsk ? (
          <div className="confirm">
            <span className="small">Reset all XP, streaks and lesson progress?</span>
            <button className="btn red" onClick={() => (s.resetProgress(), setResetAsk(false))}>
              Reset
            </button>
            <button className="btn ghost" onClick={() => setResetAsk(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn ghost danger-text" onClick={() => setResetAsk(true)}>
            Reset progress
          </button>
        )}
        <div className="backup-row">
          <button className="btn ghost " onClick={backup}>
            💾 Copy backup
          </button>
          <button className="btn ghost " onClick={restore}>
            ♻️ Restore backup
          </button>
        </div>
        {backupMsg && <p className="tiny muted">{backupMsg}</p>}
        <p className="tiny muted">
          Progress is saved on this device. Safari and a home screen icon keep separate progress, so stick to one.
        </p>
      </Card>
    </div>
  )
}
