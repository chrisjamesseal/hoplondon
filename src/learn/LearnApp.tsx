import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useActiveCourse, useLearn } from './store'
import { dayKey, liveStreak } from './lib/gamify'
import Home from './pages/Home'
import Path from './pages/Path'
import Create from './pages/Create'
import LessonPage from './pages/LessonPage'
import Courses from './pages/Courses'
import Profile from './pages/Profile'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/path', label: 'Path', icon: '🗺️' },
  { to: '/create', label: 'New course', icon: '✨' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/profile', label: 'Profile', icon: '🐸' },
]

export function Stats() {
  const { streak, lastActiveDay, hearts, xp } = useLearn()
  const course = useActiveCourse()
  const s = liveStreak(streak, lastActiveDay, dayKey())
  return (
    <div className="stats">
      {course && (
        <NavLink to="/courses" className="stat" title="Switch course">
          <span className="stat-emoji">{course.emoji}</span>
        </NavLink>
      )}
      <span className={`stat ${s ? 'streak-on' : 'muted'}`} title="Day streak">🔥 {s}</span>
      <span className="stat xp" title="Total XP">⚡ {xp}</span>
      <span className="stat hearts" title="Hearts">❤️ {hearts}</span>
    </div>
  )
}

export default function LearnApp() {
  const syncHearts = useLearn((s) => s.syncHearts)
  const location = useLocation()
  const { pathname } = location
  const inLesson = /^\/(lesson|practice|quiz|jump)/.test(pathname)

  useEffect(() => {
    syncHearts()
    const t = setInterval(syncHearts, 30_000)
    return () => clearInterval(t)
  }, [syncHearts])

  useEffect(() => window.scrollTo(0, 0), [pathname])

  if (inLesson) {
    // Keyed per visit so moving between sessions, or retrying a quiz, starts fresh
    return (
      <Routes key={location.key}>
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/practice" element={<LessonPage mode="practice" />} />
        <Route path="/quiz/:unitId" element={<LessonPage mode="quiz" />} />
        <Route path="/jump/:unitId" element={<LessonPage mode="jump" />} />
      </Routes>
    )
  }

  return (
    <div className="shell">
      <nav className="side">
        <div className="logo">
          leap<span>.</span>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
            <span className="side-icon" aria-hidden>
              {n.icon}
            </span>
            <span className="side-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="content">
        <header className="topbar">
          <div className="logo logo-mobile">
            leap<span>.</span>
          </div>
          <Stats />
        </header>
        <main className="page">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/path" element={<Path />} />
            <Route path="/create" element={<Create />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
