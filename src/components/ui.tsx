import type { ReactNode } from 'react'
import { formatPence } from '../lib/money'

export function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: ReactNode; tone?: 'pos' | 'neg' }) {
  return (
    <div className="card">
      <div className="stat-label">{label}</div>
      <div className={`stat-value ${tone === 'pos' ? 'amount-pos' : tone === 'neg' ? 'amount-neg' : ''}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Money({ pence, sign = false }: { pence: number; sign?: boolean }) {
  return (
    <span className={`mono ${pence > 0 ? 'amount-pos' : pence < 0 ? 'amount-neg' : ''}`}>
      {formatPence(pence, { sign })}
    </span>
  )
}

/** Budget-style progress bar: turns amber near the limit, red over it. */
export function ProgressBar({ fraction, invertColours = false }: { fraction: number; invertColours?: boolean }) {
  const pct = Math.min(1, Math.max(0, fraction)) * 100
  let cls = 'good'
  if (!invertColours) {
    if (fraction > 1) cls = 'over'
    else if (fraction > 0.85) cls = 'near'
    else cls = ''
  }
  return (
    <div className="progress">
      <div className={cls} style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState({ emoji, title, children }: { emoji: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="big">{emoji}</div>
      <h3>{title}</h3>
      {children}
    </div>
  )
}
