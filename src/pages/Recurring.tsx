import { useState } from 'react'
import { useStore } from '../store/store'
import type { Frequency } from '../types'
import { dueOccurrences, monthlyCost, nextDueDate } from '../lib/recurring'
import { formatDate, todayISO } from '../lib/dates'
import { formatPence, parseAmountToPence } from '../lib/money'
import { EmptyState, Money } from '../components/ui'

const FREQ_LABEL: Record<Frequency, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
}

function NewRecurringForm() {
  const categories = useStore((s) => s.categories)
  const addRecurring = useStore((s) => s.addRecurring)
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [direction, setDirection] = useState<'out' | 'in'>('out')
  const [categoryId, setCategoryId] = useState('subscriptions')
  const [frequency, setFrequency] = useState<Frequency>('monthly')
  const [startDate, setStartDate] = useState(todayISO())
  const [isSubscription, setIsSubscription] = useState(true)
  const [isBusiness, setIsBusiness] = useState(false)

  const submit = () => {
    const pence = parseAmountToPence(amount)
    if (!name.trim() || pence === null || pence === 0) return
    addRecurring({
      name: name.trim(),
      amountPence: direction === 'out' ? -Math.abs(pence) : Math.abs(pence),
      categoryId,
      frequency,
      startDate,
      isBusiness,
      isSubscription: direction === 'out' && isSubscription,
      paused: false,
    })
    setName('')
    setAmount('')
  }

  return (
    <div className="card mb">
      <h2>New recurring item</h2>
      <div className="form-row">
        <label className="field grow">Name<input type="text" placeholder="Netflix, Rent, Client retainer…" value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label className="field">Direction
          <select value={direction} onChange={(e) => setDirection(e.target.value as 'out' | 'in')}>
            <option value="out">Money out</option>
            <option value="in">Money in</option>
          </select>
        </label>
        <label className="field">Amount (£)<input type="text" inputMode="decimal" placeholder="9.99" style={{ width: 100 }} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="field">Frequency
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {Object.entries(FREQ_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="field">First due<input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></label>
        <label className="field">Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="small flex" style={{ gap: 6, paddingBottom: 8 }}>
          <input type="checkbox" checked={isSubscription} onChange={(e) => setIsSubscription(e.target.checked)} disabled={direction === 'in'} />
          Subscription
        </label>
        <label className="small flex" style={{ gap: 6, paddingBottom: 8 }}>
          <input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} />
          Business
        </label>
        <button className="btn" onClick={submit}>Add</button>
      </div>
    </div>
  )
}

export default function Recurring() {
  const recurring = useStore((s) => s.recurring)
  const postRecurring = useStore((s) => s.postRecurring)
  const skipRecurring = useStore((s) => s.skipRecurring)
  const updateRecurring = useStore((s) => s.updateRecurring)
  const deleteRecurring = useStore((s) => s.deleteRecurring)

  const subs = recurring.filter((r) => r.isSubscription && !r.paused)
  const subsMonthly = subs.reduce((s, r) => s + monthlyCost(r), 0)

  const withDue = recurring.map((r) => ({ r, due: dueOccurrences(r) }))
  const totalDue = withDue.reduce((s, x) => s + x.due.length, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Recurring &amp; subscriptions</h1>
          <div className="subtitle">
            {subs.length > 0
              ? <>Subscriptions cost <strong>{formatPence(subsMonthly)}/month</strong> ({formatPence(subsMonthly * 12)}/year). Anything in there you don’t use?</>
              : 'Track rent, bills, subscriptions and retainer income so they post themselves.'}
          </div>
        </div>
      </div>

      {totalDue > 0 && (
        <div className="callout warn mb">
          {totalDue} occurrence{totalDue === 1 ? ' is' : 's are'} due — post them to the ledger below.
        </div>
      )}

      <NewRecurringForm />

      {recurring.length === 0 ? (
        <div className="card"><EmptyState emoji="🔁" title="Nothing recurring yet" /></div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="grid">
            <thead>
              <tr>
                <th>Name</th>
                <th className="num">Amount</th>
                <th>Frequency</th>
                <th className="num">≈ monthly</th>
                <th>Next due</th>
                <th />
                <th />
              </tr>
            </thead>
            <tbody>
              {withDue.map(({ r, due }) => (
                <tr key={r.id} style={r.paused ? { opacity: 0.5 } : undefined}>
                  <td>
                    {r.name}{' '}
                    {r.isSubscription && <span className="badge accent">sub</span>}{' '}
                    {r.isBusiness && <span className="badge muted">biz</span>}{' '}
                    {r.paused && <span className="badge muted">paused</span>}
                  </td>
                  <td className="num"><Money pence={r.amountPence} /></td>
                  <td>{FREQ_LABEL[r.frequency]}</td>
                  <td className="num muted">{r.amountPence < 0 ? formatPence(monthlyCost(r)) : '—'}</td>
                  <td className="small">
                    {due.length > 0
                      ? <span className="badge warn">{due.length} due (from {formatDate(due[0])})</span>
                      : r.paused ? '—' : formatDate(nextDueDate(r))}
                  </td>
                  <td>
                    {due.length > 0 && !r.paused && (
                      <span className="flex" style={{ gap: 6 }}>
                        <button className="btn small" onClick={() => postRecurring(r.id, due)}>Post {due.length}</button>
                        <button className="btn secondary small" onClick={() => skipRecurring(r.id, due[due.length - 1])}>Skip</button>
                      </span>
                    )}
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn secondary small" onClick={() => updateRecurring(r.id, { paused: !r.paused })}>
                      {r.paused ? 'Resume' : 'Pause'}
                    </button>{' '}
                    <button className="icon-btn" title="Delete" onClick={() => { if (confirm(`Delete “${r.name}”? Posted transactions stay in the ledger.`)) deleteRecurring(r.id) }}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
