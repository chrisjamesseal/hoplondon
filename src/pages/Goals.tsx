import { useState } from 'react'
import { sumContributions, useStore } from '../store/store'
import { formatDate, monthsUntil, todayISO } from '../lib/dates'
import { formatPence, parseAmountToPence } from '../lib/money'
import { EmptyState, ProgressBar } from '../components/ui'

function NewGoalForm() {
  const addGoal = useStore((s) => s.addGoal)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('💰')
  const [target, setTarget] = useState('')
  const [deadline, setDeadline] = useState('')

  const submit = () => {
    const pence = parseAmountToPence(target)
    if (!name.trim() || pence === null || pence <= 0) return
    addGoal({ name: name.trim(), emoji: emoji || '💰', targetPence: pence, deadline: deadline || undefined })
    setName('')
    setTarget('')
    setDeadline('')
  }

  return (
    <div className="card mb">
      <h2>New goal</h2>
      <div className="form-row">
        <label className="field">Emoji<input type="text" style={{ width: 60 }} value={emoji} onChange={(e) => setEmoji(e.target.value)} /></label>
        <label className="field grow">Name<input type="text" placeholder="Emergency fund" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">Target (£)<input type="text" inputMode="decimal" placeholder="3000" value={target} onChange={(e) => setTarget(e.target.value)} /></label>
        <label className="field">Deadline (optional)<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label>
        <button className="btn" onClick={submit}>Add goal</button>
      </div>
    </div>
  )
}

export default function Goals() {
  const goals = useStore((s) => s.goals)
  const addGoalContribution = useStore((s) => s.addGoalContribution)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const [amounts, setAmounts] = useState<Record<string, string>>({})

  const totalSaved = goals.reduce((s, g) => s + sumContributions(g.contributions), 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Savings goals</h1>
          <div className="subtitle">
            {goals.length > 0 ? <>{formatPence(totalSaved)} saved across {goals.length} goal{goals.length === 1 ? '' : 's'}</> : 'Give every pound you save a job.'}
          </div>
        </div>
      </div>

      <NewGoalForm />

      {goals.length === 0 ? (
        <div className="card"><EmptyState emoji="🐷" title="No goals yet"><p>Try “Emergency fund” with a target of 3 months of spending.</p></EmptyState></div>
      ) : (
        <div className="card-grid cols-2">
          {goals.map((g) => {
            const saved = sumContributions(g.contributions)
            const remaining = Math.max(0, g.targetPence - saved)
            const months = g.deadline ? monthsUntil(g.deadline) : null
            const monthlyNeeded = months && remaining > 0 ? Math.ceil(remaining / months) : null
            const complete = saved >= g.targetPence
            return (
              <div className="card" key={g.id}>
                <div className="flex between">
                  <h2 style={{ margin: 0 }}>{g.emoji} {g.name}</h2>
                  <button className="icon-btn" title="Delete goal" onClick={() => { if (confirm(`Delete goal “${g.name}”?`)) deleteGoal(g.id) }}>✕</button>
                </div>
                <div className="flex between small mt">
                  <span className="muted">{formatPence(saved)} of {formatPence(g.targetPence)}</span>
                  {complete
                    ? <span className="badge pos">Done 🎉</span>
                    : <span className="muted">{Math.round((saved / g.targetPence) * 100)}%</span>}
                </div>
                <ProgressBar fraction={saved / g.targetPence} invertColours />
                {g.deadline && !complete && (
                  <p className="small muted mt">
                    By {formatDate(g.deadline)}{monthlyNeeded !== null && <> — save <strong>{formatPence(monthlyNeeded)}/month</strong> to make it</>}
                  </p>
                )}
                <div className="form-row mt">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Amount (£)"
                    style={{ width: 120 }}
                    value={amounts[g.id] ?? ''}
                    onChange={(e) => setAmounts({ ...amounts, [g.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return
                      const p = parseAmountToPence(amounts[g.id] ?? '')
                      if (p) { addGoalContribution(g.id, p, todayISO()); setAmounts({ ...amounts, [g.id]: '' }) }
                    }}
                  />
                  <button
                    className="btn small"
                    onClick={() => {
                      const p = parseAmountToPence(amounts[g.id] ?? '')
                      if (p) { addGoalContribution(g.id, p, todayISO()); setAmounts({ ...amounts, [g.id]: '' }) }
                    }}
                  >
                    Add contribution
                  </button>
                </div>
                {g.contributions.length > 0 && (
                  <p className="small muted mt">Last: {formatPence(g.contributions[g.contributions.length - 1].amountPence)} on {formatDate(g.contributions[g.contributions.length - 1].date)}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
