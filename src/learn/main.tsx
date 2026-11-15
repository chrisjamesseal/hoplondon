import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import LearnApp from './LearnApp'
import './learn.css'
import { startAutoUpdate } from './lib/autoUpdate'

startAutoUpdate()

// iPhone ignores the viewport setting for pinch zoom, so its pinch gestures are stopped here
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(type, (e) => e.preventDefault(), { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LearnApp />
    </HashRouter>
  </StrictMode>,
)
