import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useStore } from '../store/store'
import { addMonthsToKey, currentMonthKey, daysInMonth, formatMonthKey, lastMonthKeys, todayISO } from '../lib/dates'
import { formatPence, formatPounds } from '../lib/money'
import { spendingByCategory, totalIncome, totalSpending, transactionsInMonth } from '../lib/selectors'
import { EmptyState } from '../components/ui'

// Validated categorical slots (see store DEFAULT_CATEGORIES for the same system)
const SERIES = { income: '#1baf7a', spending: '#2a78d6', business: '#4a3aa7', personal: '#2a78d6' }

const CHART_INK = 'var(--text-muted)'
const GRID = 'var(--border)'

function tooltipStyle() {
  return {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text)',
    fontSize: 12,
  }
}

const poundsTick = (v: number) => formatPounds(v)
const poundsTip = (v: unknown) => formatPence(Number(v))

export default function Reports() {
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const [monthsBack, setMonthsBack] = useState(6)

  const months = lastMonthKeys(monthsBack)

  const byMonth = useMemo(
    () =>
      months.map((m) => {
        const txns = transactionsInMonth(transactions, m)
        return {
          month: formatMonthKey(m).replace(' 20', ' ’'),
          Income: totalIncome(txns),
          Spending: totalSpending(txns),
          Business: totalSpending(txns.filter((t) => t.isBusiness)),
          Personal: totalSpending(txns.filter((t) => !t.isBusiness)),
        }
      }),
    [transactions, months],
  )

  const monthKey = currentMonthKey()
  const catData = useMemo(() => {
    const spent = spendingByCategory(transactionsInMonth(transactions, monthKey))
    return categories
      .filter((c) => c.kind === 'expense')
      .map((c) => ({ name: c.name, value: spent.get(c.id) ?? 0, color: c.color }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions, categories, monthKey])

  const merchants = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()
    for (const t of transactions) {
      if (t.amountPence >= 0) continue
      const key = t.description.trim()
      const cur = map.get(key) ?? { total: 0, count: 0 }
      map.set(key, { total: cur.total - t.amountPence, count: cur.count + 1 })
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 8)
  }, [transactions])

  const insights = useMemo(() => {
    const out: { emoji: string; text: string; tone: 'pos' | 'neg' | 'muted' }[] = []
    const cur = spendingByCategory(transactionsInMonth(transactions, monthKey))
    const prior = lastMonthKeys(3, addMonthsToKey(monthKey, -1))
    // Compare month-to-date spending against the same fraction of the 3-month average,
    // otherwise a half-finished month always looks "below average".
    const monthFraction = Number(todayISO().slice(8, 10)) / daysInMonth(monthKey)
    const monthTxns = transactionsInMonth(transactions, monthKey)
    for (const c of categories.filter((c) => c.kind === 'expense')) {
      const now = cur.get(c.id) ?? 0
      const fullAvg = prior.reduce((s, m) => s + (spendingByCategory(transactionsInMonth(transactions, m)).get(c.id) ?? 0), 0) / 3
      const pacedAvg = fullAvg * monthFraction
      if (pacedAvg < 2000) continue // ignore tiny baselines
      // Lumpy categories (rent on the 1st) always look "ahead of pace" — only
      // flag those once they exceed a typical whole month.
      const lumpy = monthTxns.filter((t) => t.categoryId === c.id && t.amountPence < 0).length <= 2
      const change = (now - pacedAvg) / pacedAvg
      if (change > 0.25 && (!lumpy || now > fullAvg * 1.1)) {
        out.push({ emoji: '📈', text: `${c.name} is ${Math.round(change * 100)}% above your usual pace (${formatPence(now)} so far vs ${formatPence(Math.round(pacedAvg))} typically by this point).`, tone: 'neg' })
      } else if (change < -0.25 && now > 0 && !lumpy) {
        out.push({ emoji: '📉', text: `${c.name} is ${Math.round(-change * 100)}% below your usual pace for this point in the month — nice.`, tone: 'pos' })
      }
    }
    const income = totalIncome(transactionsInMonth(transactions, monthKey))
    const spend = totalSpending(transactionsInMonth(transactions, monthKey))
    if (income > 0) {
      const rate = Math.round(((income - spend) / income) * 100)
      out.push(
        rate >= 20
          ? { emoji: '💪', text: `You’re keeping ${rate}% of this month’s income.`, tone: 'pos' }
          : rate >= 0
            ? { emoji: '🤏', text: `You’re keeping ${rate}% of this month’s income — a 20% savings rate is a good target.`, tone: 'muted' }
            : { emoji: '🚨', text: `You’ve spent ${formatPence(spend - income)} more than you earned this month.`, tone: 'neg' },
      )
    }
    return out.slice(0, 6)
  }, [transactions, categories, monthKey])

  if (transactions.length === 0) {
    return (
      <div>
        <div className="page-header"><h1>Reports</h1></div>
        <div className="card"><EmptyState emoji="📊" title="Nothing to report yet"><p>Add or import some transactions first.</p></EmptyState></div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <div className="subtitle">Where the money actually goes.</div>
        </div>
        <select value={monthsBack} onChange={(e) => setMonthsBack(Number(e.target.value))}>
          <option value={3}>Last 3 months</option>
          <option value={6}>Last 6 months</option>
          <option value={12}>Last 12 months</option>
        </select>
      </div>

      {insights.length > 0 && (
        <div className="card mb">
          <h2>Insights</h2>
          {insights.map((i, idx) => (
            <p key={idx} className={i.tone === 'neg' ? 'amount-neg' : i.tone === 'pos' ? 'amount-pos' : 'muted'}>
              {i.emoji} <span style={{ color: 'var(--text)' }}>{i.text}</span>
            </p>
          ))}
        </div>
      )}

      <div className="card mb">
        <h2>Income vs spending</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={byMonth} barGap={2}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="month" tick={{ fill: CHART_INK, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
            <YAxis tickFormatter={poundsTick} tick={{ fill: CHART_INK, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
            <Tooltip formatter={poundsTip} contentStyle={tooltipStyle()} cursor={{ fill: 'var(--surface-2)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar isAnimationActive={false} dataKey="Income" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar isAnimationActive={false} dataKey="Spending" fill={SERIES.spending} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card-grid cols-2">
        <div className="card">
          <h2>Spending by category — {formatMonthKey(monthKey)}</h2>
          {catData.length === 0 ? (
            <p className="muted">No spending recorded this month.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(160, catData.length * 36)}>
              <BarChart data={catData} layout="vertical" margin={{ right: 60 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: 'var(--text)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={poundsTip} contentStyle={tooltipStyle()} cursor={{ fill: 'var(--surface-2)' }} />
                <Bar isAnimationActive={false} dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={18} label={{ position: 'right', formatter: (v: unknown) => formatPounds(Number(v)), fill: CHART_INK, fontSize: 12 }}>
                  {catData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Business vs personal spending</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byMonth} barGap={2}>
              <CartesianGrid vertical={false} stroke={GRID} />
              <XAxis dataKey="month" tick={{ fill: CHART_INK, fontSize: 12 }} axisLine={{ stroke: GRID }} tickLine={false} />
              <YAxis tickFormatter={poundsTick} tick={{ fill: CHART_INK, fontSize: 12 }} axisLine={false} tickLine={false} width={76} />
              <Tooltip formatter={poundsTip} contentStyle={tooltipStyle()} cursor={{ fill: 'var(--surface-2)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="Personal" stackId="s" fill={SERIES.personal} maxBarSize={28} />
              <Bar isAnimationActive={false} dataKey="Business" stackId="s" fill={SERIES.business} radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {merchants.length > 0 && (
        <div className="card mt">
          <h2>Top merchants (all time)</h2>
          <div className="table-wrap">
            <table className="grid">
              <thead><tr><th>Merchant</th><th className="num">Times</th><th className="num">Total spent</th></tr></thead>
              <tbody>
                {merchants.map(([name, m]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="num muted">{m.count}</td>
                    <td className="num mono">{formatPence(m.total)}</td>
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
