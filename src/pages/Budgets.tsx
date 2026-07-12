import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { addMonthsToKey, currentMonthKey, formatMonthKey } from '../lib/dates'
import { formatPence, parseAmountToPence, penceToInputValue } from '../lib/money'
import { spendingByCategory, transactionsInMonth } from '../lib/selectors'
import { Money, ProgressBar } from '../components/ui'

export default function Budgets() {
  const [monthKey, setMonthKey] = useState(currentMonthKey())
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const budgets = useStore((s) => s.budgets)
  const setBudget = useStore((s) => s.setBudget)
  const copyBudgets = useStore((s) => s.copyBudgets)

  const monthBudgets = budgets[monthKey] ?? {}
  const prevMonth = addMonthsToKey(monthKey, -1)
  const spent = useMemo(
    () => spendingByCategory(transactionsInMonth(transactions, monthKey)),
    [transactions, monthKey],
  )

  const expenseCategories = categories.filter((c) => c.kind === 'expense')
  const totalBudget = Object.values(monthBudgets).reduce((s, v) => s + v, 0)
  // Only count spending in categories that actually have a budget, so the
  // headline compares like with like.
  const totalSpent = expenseCategories
    .filter((c) => monthBudgets[c.id] !== undefined)
    .reduce((s, c) => s + (spent.get(c.id) ?? 0), 0)
  const hasPrev = Object.keys(budgets[prevMonth] ?? {}).length > 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Budgets</h1>
          <div className="subtitle">
            {totalBudget > 0 ? (
              <>
                {formatPence(totalSpent)} spent of {formatPence(totalBudget)} budgeted —{' '}
                <Money pence={totalBudget - totalSpent} /> {totalBudget >= totalSpent ? 'left' : 'over'}
              </>
            ) : (
              'Set a monthly limit per category to keep spending honest.'
            )}
          </div>
        </div>
        <div className="flex">
          <button className="btn secondary small" onClick={() => setMonthKey(addMonthsToKey(monthKey, -1))}>←</button>
          <strong>{formatMonthKey(monthKey)}</strong>
          <button className="btn secondary small" onClick={() => setMonthKey(addMonthsToKey(monthKey, 1))}>→</button>
          {hasPrev && (
            <button className="btn secondary small" onClick={() => copyBudgets(prevMonth, monthKey)}>
              Copy {formatMonthKey(prevMonth)}
            </button>
          )}
        </div>
      </div>

      <div className="card-grid cols-2">
        {expenseCategories.map((c) => {
          const limit = monthBudgets[c.id]
          const used = spent.get(c.id) ?? 0
          return (
            <div className="card" key={c.id}>
              <div className="flex between">
                <strong>
                  <span className="cat-dot" style={{ background: c.color }} />
                  {c.name}
                </strong>
                <span className="flex" style={{ gap: 4 }}>
                  <span className="muted small">£</span>
                  <input
                    key={`${monthKey}-${limit ?? ''}`}
                    type="text"
                    inputMode="decimal"
                    style={{ width: 90, textAlign: 'right' }}
                    placeholder="no limit"
                    defaultValue={limit !== undefined ? penceToInputValue(limit) : ''}
                    onBlur={(e) => {
                      const v = e.target.value.trim()
                      if (v === '') setBudget(monthKey, c.id, null)
                      else {
                        const pence = parseAmountToPence(v)
                        if (pence !== null && pence > 0) setBudget(monthKey, c.id, pence)
                      }
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </span>
              </div>
              <div className="mt">
                {limit !== undefined ? (
                  <>
                    <ProgressBar fraction={used / limit} />
                    <div className="flex between small mt" style={{ marginTop: 6 }}>
                      <span className="muted">{formatPence(used)} spent</span>
                      {used > limit ? (
                        <span className="badge neg">{formatPence(used - limit)} over</span>
                      ) : (
                        <span className={used / limit > 0.85 ? 'badge warn' : 'muted'}>
                          {formatPence(limit - used)} left
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="small muted">{formatPence(used)} spent this month · no budget set</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
