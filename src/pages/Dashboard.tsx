import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { sumContributions, useStore } from '../store/store'
import { currentMonthKey, currentTaxYear, formatDate, formatMonthKey, formatTaxYear, todayISO } from '../lib/dates'
import { formatPence, formatPounds } from '../lib/money'
import { businessSummary, spendingByCategory, totalIncome, totalSpending, transactionsInMonth } from '../lib/selectors'
import { estimateTax } from '../lib/tax/ukTax'
import { getTaxYearConfig } from '../lib/tax/taxYears'
import { dueOccurrences, nextDueDate } from '../lib/recurring'
import { EmptyState, Money, ProgressBar, Stat } from '../components/ui'

export default function Dashboard() {
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const budgets = useStore((s) => s.budgets)
  const recurring = useStore((s) => s.recurring)
  const goals = useStore((s) => s.goals)
  const taxPot = useStore((s) => s.taxPot)
  const taxInputs = useStore((s) => s.taxInputs)

  const monthKey = currentMonthKey()
  const monthTxns = useMemo(() => transactionsInMonth(transactions, monthKey), [transactions, monthKey])
  const income = totalIncome(monthTxns)
  const spending = totalSpending(monthTxns)
  const net = income - spending
  const savingsRate = income > 0 ? Math.max(0, net) / income : 0

  const monthBudgets = budgets[monthKey] ?? {}
  const spent = spendingByCategory(monthTxns)
  const budgetRows = categories
    .filter((c) => monthBudgets[c.id] !== undefined)
    .map((c) => ({ cat: c, limit: monthBudgets[c.id], used: spent.get(c.id) ?? 0 }))
    .sort((a, b) => b.used / b.limit - a.used / a.limit)

  const dueSoon = recurring
    .filter((r) => !r.paused)
    .map((r) => ({ r, due: dueOccurrences(r).length > 0, next: dueOccurrences(r)[0] ?? nextDueDate(r) }))
    .sort((a, b) => (a.next < b.next ? -1 : 1))
    .slice(0, 5)

  const taxYearId = currentTaxYear()
  const biz = businessSummary({ transactions }, taxYearId)
  const inputs = taxInputs[taxYearId] ?? { employmentIncomePence: 0, taxDeductedAtSourcePence: 0 }
  const estimate = estimateTax(
    {
      businessIncome: biz.income,
      allowableExpenses: biz.expenses,
      employmentIncome: inputs.employmentIncomePence,
      taxDeductedAtSource: inputs.taxDeductedAtSourcePence,
    },
    getTaxYearConfig(taxYearId),
  )
  const potBalance = sumContributions(taxPot)

  const goalProgress = goals.map((g) => ({ g, saved: sumContributions(g.contributions) }))
  const recent = transactions.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6)
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id

  const isEmpty = transactions.length === 0 && goals.length === 0 && recurring.length === 0

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">{formatMonthKey(monthKey)} · today is {formatDate(todayISO())}</div>
        </div>
      </div>

      {isEmpty && (
        <div className="card mb">
          <EmptyState emoji="👋" title="Welcome to hop">
            <p>
              Your money lives only in this browser — nothing is uploaded anywhere.
              Start by <Link to="/transactions">adding a transaction</Link>, <Link to="/import">importing a bank CSV</Link>,
              or load some demo data from <Link to="/settings">Settings</Link> to look around.
            </p>
          </EmptyState>
        </div>
      )}

      <div className="card-grid cols-4 mb">
        <Stat label="Income this month" value={formatPence(income)} tone={income > 0 ? 'pos' : undefined} />
        <Stat label="Spending this month" value={formatPence(spending)} tone={spending > 0 ? 'neg' : undefined} />
        <Stat label="Net" value={formatPence(net)} tone={net >= 0 ? 'pos' : 'neg'} />
        <Stat
          label="Savings rate"
          value={income > 0 ? `${Math.round(savingsRate * 100)}%` : '—'}
          sub={income > 0 ? 'of this month’s income kept' : 'no income recorded yet'}
        />
      </div>

      <div className="card-grid cols-2">
        <div className="card">
          <div className="flex between">
            <h2>Budget health</h2>
            <Link to="/budgets" className="small">Manage →</Link>
          </div>
          {budgetRows.length === 0 ? (
            <p className="muted">No budgets set for {formatMonthKey(monthKey)} yet.</p>
          ) : (
            budgetRows.slice(0, 5).map(({ cat, limit, used }) => (
              <div key={cat.id} className="mb">
                <div className="flex between small">
                  <span><span className="cat-dot" style={{ background: cat.color }} />{cat.name}</span>
                  <span className={used > limit ? 'amount-neg' : 'muted'}>
                    {formatPounds(used)} / {formatPounds(limit)}
                  </span>
                </div>
                <ProgressBar fraction={used / limit} />
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="flex between">
            <h2>Tax pot — {formatTaxYear(taxYearId)}</h2>
            <Link to="/tax" className="small">Estimator →</Link>
          </div>
          {biz.income === 0 && inputs.employmentIncomePence === 0 ? (
            <p className="muted">No business income recorded this tax year yet.</p>
          ) : (
            <>
              <div className="flex between small">
                <span className="muted">Set aside so far</span>
                <strong>{formatPence(potBalance)}</strong>
              </div>
              <div className="flex between small mb">
                <span className="muted">Estimated needed (incl. payment on account)</span>
                <strong>{formatPence(estimate.suggestedSetAside)}</strong>
              </div>
              <ProgressBar fraction={estimate.suggestedSetAside > 0 ? potBalance / estimate.suggestedSetAside : 1} invertColours />
              <p className="small muted mt">
                Estimated liability {formatPence(estimate.totalLiability)} on {formatPence(estimate.totalIncome)} income.
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div className="flex between">
            <h2>Recurring &amp; subscriptions</h2>
            <Link to="/recurring" className="small">All →</Link>
          </div>
          {dueSoon.length === 0 ? (
            <p className="muted">No recurring items yet.</p>
          ) : (
            <table className="grid">
              <tbody>
                {dueSoon.map(({ r, due, next }) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td className="small muted">{due ? <span className="badge warn">due {formatDate(next)}</span> : `next ${formatDate(next)}`}</td>
                    <td className="num"><Money pence={r.amountPence} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="flex between">
            <h2>Savings goals</h2>
            <Link to="/goals" className="small">All →</Link>
          </div>
          {goalProgress.length === 0 ? (
            <p className="muted">No goals yet — give your savings a job.</p>
          ) : (
            goalProgress.slice(0, 4).map(({ g, saved }) => (
              <div key={g.id} className="mb">
                <div className="flex between small">
                  <span>{g.emoji} {g.name}</span>
                  <span className="muted">{formatPounds(saved)} / {formatPounds(g.targetPence)}</span>
                </div>
                <ProgressBar fraction={saved / g.targetPence} invertColours />
              </div>
            ))
          )}
        </div>
      </div>

      {recent.length > 0 && (
        <div className="card mt">
          <div className="flex between">
            <h2>Recent transactions</h2>
            <Link to="/transactions" className="small">Ledger →</Link>
          </div>
          <div className="table-wrap">
            <table className="grid">
              <tbody>
                {recent.map((t) => (
                  <tr key={t.id}>
                    <td className="muted small" style={{ width: 110 }}>{formatDate(t.date)}</td>
                    <td>{t.description}</td>
                    <td className="small muted">{catName(t.categoryId)}{t.isBusiness ? ' · business' : ''}</td>
                    <td className="num"><Money pence={t.amountPence} sign /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
