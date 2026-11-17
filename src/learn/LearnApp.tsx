import { CircleAlert, CircleCheck, House, Library, LoaderCircle, Map as MapIcon, Sparkles, UserRound } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useLearn } from './store'
import { setPlayInSilent } from './lib/sound'
import { pauseStale, resumeInterrupted, useJobs } from './jobs'
import { dayKey, liveStreak } from './lib/gamify'
import Home from './pages/Home'
import Path from './pages/Path'
import Phrasebook from './pages/Phrasebook'
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
  { to: '/', label: 'Home', Icon: House },
  { to: '/path', label: 'Path', Icon: MapIcon },
  { to: '/create', label: 'New course', Icon: Sparkles },
  { to: '/courses', label: 'Courses', Icon: Library },
  { to: '/profile', label: 'Profile', Icon: UserRound },
]

/** Progress for courses being written in the background */
function JobBanner() {
  const { jobs, cancel, dismiss, retry } = useJobs()
  const setActive = useLearn((s) => s.setActiveCourse)
  const navigate = useNavigate()
  if (!jobs.length) return null
  return (
    <div className="jobs">
      {jobs.map((j) => (
        <div key={j.id} className={`job ${j.status}`}>
          <span className={`job-icon ${j.status}`} role="img" aria-label={j.status === 'running' ? 'Writing' : j.status === 'done' ? 'Ready' : 'Failed'}>
            {j.status === 'running' ? <LoaderCircle size={26} strokeWidth={2.5} /> : j.status === 'done' ? <CircleCheck size={26} strokeWidth={2.5} /> : <CircleAlert size={26} strokeWidth={2.5} />}
          </span>
          <div className="job-text">
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
          {j.status === 'error' && (
            <button className="btn green job-btn" onClick={() => retry(j.id)}>
              Retry
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
  const useFreezeIfNeeded = useLearn((s) => s.useFreezeIfNeeded)
  const playInSilent = useLearn((s) => s.sound && s.soundInSilent)
  const location = useLocation()
  const { pathname } = location
  const inLesson = /^\/(lesson|practice|review|quiz|jump)/.test(pathname)

  useEffect(() => {
    pauseStale()
    resumeInterrupted()
    const back = () => document.visibilityState === 'visible' && resumeInterrupted()
    document.addEventListener('visibilitychange', back)
    syncHearts()
    useFreezeIfNeeded()
    const t = setInterval(syncHearts, 30_000)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', back)
    }
  }, [syncHearts, useFreezeIfNeeded])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  // Sounds stay audible on a silent iPhone. Starting audio needs a tap, so it is also tried on the first one.
  useEffect(() => {
    // The silent clip shows up as a playing audio on the phone, so it only runs where there is sound: lessons and the phrasebook
    const on = playInSilent && /^\/(lesson|practice|review|quiz|jump|phrasebook)/.test(pathname)
    setPlayInSilent(on)
    if (!on) return
    const again = () => setPlayInSilent(true)
    document.addEventListener('pointerdown', again, { once: true })
    return () => document.removeEventListener('pointerdown', again)
  }, [playInSilent, pathname])

  if (inLesson) {
    // Keyed per visit so moving between sessions, or retrying a quiz, starts fresh
    return (
      <Routes key={location.key}>
        <Route path="/lesson/:lessonId" element={<LessonPage />} />
        <Route path="/practice" element={<LessonPage mode="practice" />} />
        <Route path="/review" element={<LessonPage mode="practice" review />} />
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
              <n.Icon size={26} strokeWidth={2.1} />
            </span>
            <span className="side-label">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="content">
        <main className="page">
          {!/^\/(lesson|quiz|practice|jump)/.test(pathname) && <JobBanner />}
          {!/^\/(courses|profile|create|$)/.test(pathname) && <HeartsRow />}
          <div key={pathname} className="route-fade">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/path" element={<Path />} />
            <Route path="/phrasebook" element={<Phrasebook />} />
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
          </div>
        </main>
      </div>
    </div>
  )
}
