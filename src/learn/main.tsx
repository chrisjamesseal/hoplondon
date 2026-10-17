import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import LearnApp from './LearnApp'
import './learn.css'
import { startAutoUpdate } from './lib/autoUpdate'

startAutoUpdate()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <LearnApp />
    </HashRouter>
  </StrictMode>,
)
