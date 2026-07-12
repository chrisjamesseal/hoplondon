import { useMemo, useRef, useState } from 'react'
import { useStore } from '../store/store'
import type { Transaction } from '../types'
import { formatMonthKey, monthKeyOf, todayISO } from '../lib/dates'
import { parseAmountToPence, penceToInputValue } from '../lib/money'
import { HMRC_CATEGORIES } from '../lib/tax/hmrcCategories'
import { Money, EmptyState } from '../components/ui'

/** Uncontrolled cell that commits on blur or Enter. Re-mounts when the stored value changes. */
function EditableCell({
  value,
  onCommit,
  type = 'text',
  numeric = false,
}: {
  value: string
  onCommit: (v: string) => void
  type?: string
  numeric?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <input
      key={value}
      ref={ref}
      className={`cell-input${numeric ? ' num' : ''}`}
      type={type}
      defaultValue={value}
      onBlur={(e) => {
        if (e.target.value !== value) onCommit(e.target.value)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') ref.current?.blur()
        if (e.key === 'Escape' && ref.current) {
          ref.current.value = value
          ref.current.blur()
        }
      }}
    />
  )
}

function QuickAddRow() {
  const categories = useStore((s) => s.categories)
  const addTransaction = useStore((s) => s.addTransaction)
  const [date, setDate] = useState(todayISO())
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('groceries')
  const [isBusiness, setIsBusiness] = useState(false)
  const descRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const pence = parseAmountToPence(amount)
    if (!description.trim() || pence === null || pence === 0) return
    const cat = categories.find((c) => c.id === categoryId)
    // Convention: type a plain number for spending; income categories flip the sign
    const signed = cat?.kind === 'income' ? Math.abs(pence) : pence > 0 ? -pence : pence
    addTransaction({ date, description: description.trim(), amountPence: signed, categoryId, isBusiness })
    setDescription('')
    setAmount('')
    descRef.current?.focus()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit()
  }

  return (
    <tr style={{ background: 'var(--surface-2)' }}>
      <td>
        <input className="cell-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} onKeyDown={onKeyDown} />
      </td>
      <td>
        <input
          ref={descRef}
          className="cell-input"
          placeholder="Add a transaction… (Enter to save)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </td>
      <td>
        <select className="cell-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <optgroup label="Spending">
            {categories.filter((c) => c.kind === 'expense').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
          <optgroup label="Income">
            {categories.filter((c) => c.kind === 'income').map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </optgroup>
        </select>
      </td>
      <td className="num">
        <input
          className="cell-input num"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </td>
      <td style={{ textAlign: 'center' }}>
        <input type="checkbox" checked={isBusiness} onChange={(e) => setIsBusiness(e.target.checked)} title="Business transaction" />
      </td>
      <td />
      <td>
        <button className="btn small" onClick={submit}>Add</button>
      </td>
    </tr>
  )
}

export default function Transactions() {
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const updateTransaction = useStore((s) => s.updateTransaction)
  const deleteTransaction = useStore((s) => s.deleteTransaction)
  const undoDelete = useStore((s) => s.undoDelete)
  const recentlyDeleted = useStore((s) => s.recentlyDeleted)

  const [monthFilter, setMonthFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState<'all' | 'personal' | 'business'>('all')
  const [search, setSearch] = useState('')

  const months = useMemo(() => {
    const set = new Set(transactions.map((t) => monthKeyOf(t.date)))
    return [...set].sort().reverse()
  }, [transactions])

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return transactions
      .filter((t) => monthFilter === 'all' || monthKeyOf(t.date) === monthFilter)
      .filter((t) => categoryFilter === 'all' || t.categoryId === categoryFilter)
      .filter((t) => typeFilter === 'all' || (typeFilter === 'business') === t.isBusiness)
      .filter((t) => !q || t.description.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [transactions, monthFilter, categoryFilter, typeFilter, search])

  const totals = useMemo(() => {
    const income = filtered.filter((t) => t.amountPence > 0).reduce((s, t) => s + t.amountPence, 0)
    const spending = filtered.filter((t) => t.amountPence < 0).reduce((s, t) => s + t.amountPence, 0)
    return { income, spending, net: income + spending }
  }, [filtered])

  const catById = (id: string) => categories.find((c) => c.id === id)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Transactions</h1>
          <div className="subtitle">
            {filtered.length} shown · in <Money pence={totals.income} /> · out <Money pence={totals.spending} /> · net{' '}
            <Money pence={totals.net} sign />
          </div>
        </div>
      </div>

      <div className="flex wrap mb">
        <input type="text" placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="all">All months</option>
          {months.map((m) => (
            <option key={m} value={m}>{formatMonthKey(m)}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="all">Personal + business</option>
          <option value="personal">Personal only</option>
          <option value="business">Business only</option>
        </select>
      </div>

      <div className="card table-wrap" style={{ padding: 0 }}>
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 130 }}>Date</th>
              <th>Description</th>
              <th style={{ width: 160 }}>Category</th>
              <th className="num" style={{ width: 110 }}>Amount</th>
              <th style={{ width: 60, textAlign: 'center' }} title="Business transaction">Biz</th>
              <th style={{ width: 150 }}>Write-off</th>
              <th style={{ width: 60 }} />
            </tr>
          </thead>
          <tbody>
            <QuickAddRow />
            {filtered.map((t) => (
              <LedgerRow key={t.id} t={t} catColor={catById(t.categoryId)?.color} categories={categories} update={updateTransaction} remove={deleteTransaction} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyState emoji="📒" title="No transactions yet">
            <p>Add one above, seed demo data in Settings, or import a bank CSV.</p>
          </EmptyState>
        )}
      </div>

      {recentlyDeleted && (
        <div className="toast">
          Deleted “{recentlyDeleted.description}”
          <button onClick={undoDelete}>Undo</button>
        </div>
      )}
    </div>
  )
}

function LedgerRow({
  t,
  catColor,
  categories,
  update,
  remove,
}: {
  t: Transaction
  catColor?: string
  categories: ReturnType<typeof useStore.getState>['categories']
  update: (id: string, patch: Partial<Transaction>) => void
  remove: (id: string) => void
}) {
  return (
    <tr>
      <td>
        <EditableCell type="date" value={t.date} onCommit={(v) => v && update(t.id, { date: v })} />
      </td>
      <td>
        <EditableCell value={t.description} onCommit={(v) => v.trim() && update(t.id, { description: v.trim() })} />
      </td>
      <td>
        <span className="cat-dot" style={{ background: catColor ?? 'var(--border)' }} />
        <select
          className="cell-select"
          style={{ width: 'calc(100% - 16px)', display: 'inline-block' }}
          value={t.categoryId}
          onChange={(e) => update(t.id, { categoryId: e.target.value })}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td className="num">
        <span className={t.amountPence > 0 ? 'amount-pos' : 'amount-neg'}>
          <EditableCell
            numeric
            value={penceToInputValue(t.amountPence)}
            onCommit={(v) => {
              const pence = parseAmountToPence(v)
              if (pence !== null) update(t.id, { amountPence: pence })
            }}
          />
        </span>
      </td>
      <td style={{ textAlign: 'center' }}>
        <input
          type="checkbox"
          checked={t.isBusiness}
          onChange={(e) => update(t.id, { isBusiness: e.target.checked, hmrcCategoryId: e.target.checked ? t.hmrcCategoryId : undefined })}
        />
      </td>
      <td>
        {t.isBusiness && t.amountPence < 0 ? (
          <select
            className="cell-select"
            value={t.hmrcCategoryId ?? ''}
            onChange={(e) => update(t.id, { hmrcCategoryId: e.target.value || undefined })}
          >
            <option value="">— not claimed —</option>
            {HMRC_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        ) : (
          <span className="muted small">{t.amountPence > 0 && t.isBusiness ? 'income' : ''}</span>
        )}
      </td>
      <td>
        <button className="icon-btn" title="Delete" onClick={() => remove(t.id)}>✕</button>
      </td>
    </tr>
  )
}
