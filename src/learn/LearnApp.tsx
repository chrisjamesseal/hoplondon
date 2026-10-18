import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useLearn } from './store'
import { useJobs } from './jobs'
import { dayKey, liveStreak } from './lib/gamify'
import Home from './pages/Home'
import Path from './pages/Path'
import Create from './pages/Create'
import LessonPage from './pages/LessonPage'
import Courses from './pages/Courses'
import CourseCategories from './pages/CourseCategories'
import Profile from './pages/Profile'
import RewriteCourse from './pages/RewriteCourse'
import Gate from './pages/Gate'
import Achievements from './pages/Achievements'
import ExtendCourse from './pages/ExtendCourse'

const NAV = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/path', label: 'Path', icon: '🗺️' },
  { to: '/create', label: 'New course', icon: '✨' },
  { to: '/courses', label: 'Courses', icon: '📚' },
  { to: '/profile', label: 'Profile', icon: '🐸' },
]

/** Progress for courses being written in the background */
function JobBanner() {
  const { jobs, cancel, dismiss } = useJobs()
  const setActive = useLearn((s) => s.setActiveCourse)
  const navigate = useNavigate()
  if (!jobs.length) return null
  return (
    <div className="jobs">
      {jobs.map((j) => (
        <div key={j.id} className={`job ${j.status}`}>
          <div className="job-text">
            <strong>{j.status === 'running' ? '⏳ Writing' : j.status === 'done' ? '✅ Ready' : '😬 Failed'}</strong>
            <strong className="job-title">{j.title}</strong>
            {j.status === 'error' && <span className="tiny">{j.error}</span>}
          </div>
          {j.status === 'running' && (
            <button className="btn ghost job-btn" onClick={() => cancel(j.id)}>
              Cancel
            </button>
          )}
          {j.status === 'done' && (
            <button
              className="btn green job-btn"
              onClick={() => {
                if (j.courseId) setActive(j.courseId)
                dismiss(j.id)
                navigate('/')
              }}
            >
              Open
            </button>
          )}
          {j.status !== 'running' && (
            <button className="job-x" aria-label="Dismiss" onClick={() => dismiss(j.id)}>
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

/** Hearts sit at the top right of the page. Courses and Profile don't show them. */
function HeartsRow() {
  const hearts = useLearn((s) => s.hearts)
  const streak = useLearn((s) => liveStreak(s.streak, s.lastActiveDay, dayKey()))
  return (
    <div className="hearts-row">
      <span title="Streak" className="streak-chip">🔥 {streak}</span>
      <span title="Hearts">❤️ {hearts}</span>
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
        <main className="page">
          {!/^\/(lesson|quiz|practice|jump)/.test(pathname) && <JobBanner />}
          {!/^\/(courses|profile|create|$)/.test(pathname) && <HeartsRow />}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/path" element={<Path />} />
            <Route path="/create" element={<Create />} />
            <Route path="/create/:method" element={<Create />} />
            <Route path="/courses" element={<CourseCategories />} />
            <Route path="/courses/:cat" element={<Courses />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/gate/:app" element={<Gate />} />
            <Route path="/profile/achievements" element={<Achievements />} />
            <Route path="/extend/:courseId" element={<ExtendCourse />} />
            <Route path="/rewrite/:courseId" element={<RewriteCourse />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
