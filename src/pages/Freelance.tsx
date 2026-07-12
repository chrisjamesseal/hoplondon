import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import type { Invoice } from '../types'
import { currentTaxYear, formatDate, formatTaxYear, taxYearOf, todayISO } from '../lib/dates'
import { formatPence, parseAmountToPence } from '../lib/money'
import { EmptyState, Money, Stat } from '../components/ui'

function statusBadge(inv: Invoice) {
  if (inv.status === 'paid') return <span className="badge pos">paid {inv.paidDate && formatDate(inv.paidDate)}</span>
  if (inv.status === 'draft') return <span className="badge muted">draft</span>
  if (inv.dueDate < todayISO()) return <span className="badge neg">overdue</span>
  return <span className="badge accent">sent</span>
}

function NewInvoiceForm() {
  const clients = useStore((s) => s.clients)
  const invoices = useStore((s) => s.invoices)
  const addClient = useStore((s) => s.addClient)
  const addInvoice = useStore((s) => s.addInvoice)

  const [clientId, setClientId] = useState('')
  const [newClientName, setNewClientName] = useState('')
  const [number, setNumber] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')

  const suggestedNumber = `INV-${String(invoices.length + 1).padStart(3, '0')}`

  const submit = () => {
    const pence = parseAmountToPence(amount)
    if (pence === null || pence <= 0) return
    let cid = clientId
    if (!cid) {
      if (!newClientName.trim()) return
      cid = addClient({ name: newClientName.trim() })
    }
    const issue = issueDate || todayISO()
    const due = dueDate || issue
    addInvoice({
      number: number.trim() || suggestedNumber,
      clientId: cid,
      description: description.trim(),
      amountPence: pence,
      issueDate: issue,
      dueDate: due,
      status: 'sent',
    })
    setNumber('')
    setDescription('')
    setAmount('')
    setDueDate('')
    setNewClientName('')
  }

  return (
    <div className="card mb">
      <h2>New invoice</h2>
      <div className="form-row">
        <label className="field">
          Client
          <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">+ new client</option>
            {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        {!clientId && (
          <label className="field">Client name<input type="text" placeholder="Acme Ltd" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} /></label>
        )}
        <label className="field">Invoice no.<input type="text" placeholder={suggestedNumber} style={{ width: 100 }} value={number} onChange={(e) => setNumber(e.target.value)} /></label>
        <label className="field grow">Description<input type="text" placeholder="Website redesign — final" value={description} onChange={(e) => setDescription(e.target.value)} /></label>
        <label className="field">Amount (£)<input type="text" inputMode="decimal" placeholder="1200" style={{ width: 100 }} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label className="field">Issued<input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} /></label>
        <label className="field">Due<input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></label>
        <button className="btn" onClick={submit}>Add invoice</button>
      </div>
      <p className="small muted mt">Marking an invoice paid records the income in your ledger automatically (as business income).</p>
    </div>
  )
}

export default function Freelance() {
  const invoices = useStore((s) => s.invoices)
  const clients = useStore((s) => s.clients)
  const markInvoicePaid = useStore((s) => s.markInvoicePaid)
  const updateInvoice = useStore((s) => s.updateInvoice)
  const deleteInvoice = useStore((s) => s.deleteInvoice)

  const taxYearId = currentTaxYear()
  const clientName = (id: string) => clients.find((c) => c.id === id)?.name ?? '—'

  const stats = useMemo(() => {
    const paidThisYear = invoices
      .filter((i) => i.status === 'paid' && i.paidDate && taxYearOf(i.paidDate) === taxYearId)
      .reduce((s, i) => s + i.amountPence, 0)
    const outstanding = invoices.filter((i) => i.status === 'sent').reduce((s, i) => s + i.amountPence, 0)
    const overdue = invoices
      .filter((i) => i.status === 'sent' && i.dueDate < todayISO())
      .reduce((s, i) => s + i.amountPence, 0)
    return { paidThisYear, outstanding, overdue }
  }, [invoices, taxYearId])

  const sorted = invoices.slice().sort((a, b) => (a.issueDate < b.issueDate ? 1 : -1))

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Freelance invoices</h1>
          <div className="subtitle">Track who owes you what, and feed paid invoices straight into the tax estimate.</div>
        </div>
      </div>

      <div className="card-grid cols-3 mb">
        <Stat label={`Paid in ${formatTaxYear(taxYearId)}`} value={formatPence(stats.paidThisYear)} tone="pos" />
        <Stat label="Outstanding" value={formatPence(stats.outstanding)} />
        <Stat label="Overdue" value={formatPence(stats.overdue)} tone={stats.overdue > 0 ? 'neg' : undefined} />
      </div>

      <NewInvoiceForm />

      {invoices.length === 0 ? (
        <div className="card"><EmptyState emoji="🧾" title="No invoices yet" /></div>
      ) : (
        <div className="card table-wrap" style={{ padding: 0 }}>
          <table className="grid">
            <thead>
              <tr>
                <th>No.</th><th>Client</th><th>Description</th><th className="num">Amount</th>
                <th>Issued</th><th>Due</th><th>Status</th><th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((inv) => (
                <tr key={inv.id}>
                  <td className="mono">{inv.number}</td>
                  <td>{clientName(inv.clientId)}</td>
                  <td>{inv.description}</td>
                  <td className="num"><Money pence={inv.amountPence} /></td>
                  <td className="small muted">{formatDate(inv.issueDate)}</td>
                  <td className="small muted">{formatDate(inv.dueDate)}</td>
                  <td>{statusBadge(inv)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {inv.status !== 'paid' && (
                      <>
                        {inv.status === 'draft' && (
                          <button className="btn secondary small" onClick={() => updateInvoice(inv.id, { status: 'sent' })}>Mark sent</button>
                        )}{' '}
                        <button className="btn small" onClick={() => markInvoicePaid(inv.id)}>Mark paid</button>
                      </>
                    )}{' '}
                    <button className="icon-btn" title="Delete" onClick={() => { if (confirm(`Delete invoice ${inv.number}?`)) deleteInvoice(inv.id) }}>✕</button>
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
