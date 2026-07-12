import { NavLink, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import ImportPage from './pages/ImportPage'
import Budgets from './pages/Budgets'
import Goals from './pages/Goals'
import Recurring from './pages/Recurring'
import Freelance from './pages/Freelance'
import Tax from './pages/Tax'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

const NAV = [
  { section: 'Money', links: [
    { to: '/', label: 'Dashboard', icon: '🏠' },
    { to: '/transactions', label: 'Transactions', icon: '📒' },
    { to: '/budgets', label: 'Budgets', icon: '🎯' },
    { to: '/goals', label: 'Savings goals', icon: '🐷' },
    { to: '/recurring', label: 'Recurring', icon: '🔁' },
    { to: '/reports', label: 'Reports', icon: '📊' },
  ]},
  { section: 'Freelance', links: [
    { to: '/freelance', label: 'Invoices', icon: '🧾' },
    { to: '/tax', label: 'Tax', icon: '🏛️' },
  ]},
  { section: 'Data', links: [
    { to: '/import', label: 'Import CSV', icon: '⬆️' },
    { to: '/settings', label: 'Settings', icon: '⚙️' },
  ]},
]

export default function App() {
  return (
    <div className="app-layout">
      <nav className="sidebar">
        <div className="brand">
          hop<span>.</span>
        </div>
        {NAV.map(({ section, links }) => (
          <div key={section}>
            <div className="nav-section">{section}</div>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <span aria-hidden>{l.icon}</span>
                <span className="nav-label">{l.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/budgets" element={<Budgets />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/recurring" element={<Recurring />} />
          <Route path="/freelance" element={<Freelance />} />
          <Route path="/tax" element={<Tax />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
