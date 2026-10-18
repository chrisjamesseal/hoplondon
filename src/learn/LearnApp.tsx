import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { useLearn } from './store'
import Home from './pages/Home'
import Path from './pages/Path'
import Create from './pages/Create'
import LessonPage from './pages/LessonPage'
import Courses from './pages/Courses'
import CourseCategories from './pages/CourseCategories'
import Profile from './pages/Profile'
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

/** Hearts sit at the top right of the page. Courses and Profile don't show them. */
function HeartsRow() {
  const hearts = useLearn((s) => s.hearts)
  return (
    <div className="hearts-row" title="Hearts">
      ❤️ {hearts}
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
          {!/^\/(courses|profile)/.test(pathname) && <HeartsRow />}
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
          </Routes>
        </main>
      </div>
    </div>
  )
}
