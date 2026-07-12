import { useMemo, useState } from 'react'
import { useStore } from '../store/store'
import { autoDetectMapping, buildImportCandidates, parseCsv, type ColumnMapping, type ParsedCsv } from '../lib/csv'
import { formatDate } from '../lib/dates'
import { Money } from '../components/ui'

export default function ImportPage() {
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const addTransactions = useStore((s) => s.addTransactions)

  const [csv, setCsv] = useState<ParsedCsv | null>(null)
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({})
  const [amountMode, setAmountMode] = useState<'single' | 'split'>('single')
  const [defaultCategory, setDefaultCategory] = useState('other')
  const [includeDuplicates, setIncludeDuplicates] = useState(false)
  const [asBusiness, setAsBusiness] = useState(false)
  const [done, setDone] = useState<number | null>(null)

  const onFile = async (file: File) => {
    const text = await file.text()
    const parsed = parseCsv(text)
    const detected = autoDetectMapping(parsed.headers)
    setCsv(parsed)
    setFileName(file.name)
    setMapping(detected)
    setAmountMode(detected.amount ? 'single' : detected.moneyIn || detected.moneyOut ? 'split' : 'single')
    setDone(null)
  }

  const mappingComplete =
    !!mapping.date &&
    !!mapping.description &&
    (amountMode === 'single' ? !!mapping.amount : !!mapping.moneyIn || !!mapping.moneyOut)

  const result = useMemo(() => {
    if (!csv || !mappingComplete) return null
    const m: ColumnMapping = {
      date: mapping.date!,
      description: mapping.description!,
      amount: amountMode === 'single' ? mapping.amount : undefined,
      moneyIn: amountMode === 'split' ? mapping.moneyIn : undefined,
      moneyOut: amountMode === 'split' ? mapping.moneyOut : undefined,
    }
    return buildImportCandidates(csv.rows, m, transactions)
  }, [csv, mapping, amountMode, mappingComplete, transactions])

  const toImport = result?.candidates.filter((c) => includeDuplicates || !c.duplicate) ?? []
  const dupCount = result?.candidates.filter((c) => c.duplicate).length ?? 0

  const runImport = () => {
    addTransactions(
      toImport.map((c) => ({
        date: c.date,
        description: c.description,
        amountPence: c.amountPence,
        categoryId: defaultCategory,
        isBusiness: asBusiness,
      })),
    )
    setDone(toImport.length)
    setCsv(null)
  }

  const colPicker = (label: string, value: string | undefined, set: (v: string | undefined) => void) => (
    <label className="field">
      {label}
      <select value={value ?? ''} onChange={(e) => set(e.target.value || undefined)}>
        <option value="">— choose column —</option>
        {csv!.headers.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
    </label>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Import bank CSV</h1>
          <div className="subtitle">Works with Monzo, Starling, Barclays and any CSV export with date, description and amount columns.</div>
        </div>
      </div>

      {done !== null && (
        <div className="callout mb">✅ Imported {done} transaction{done === 1 ? '' : 's'}. Head to the ledger to categorise anything that landed in “{categories.find((c) => c.id === defaultCategory)?.name}”.</div>
      )}

      {!csv && (
        <div className="card">
          <label
            className="empty-state"
            style={{ display: 'block', cursor: 'pointer' }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const f = e.dataTransfer.files?.[0]
              if (f) onFile(f)
            }}
          >
            <div className="big">⬆️</div>
            <h3>Drop a CSV here or click to choose a file</h3>
            <p className="muted">Your file is read entirely in the browser — it never leaves your machine.</p>
            <input
              type="file"
              accept=".csv,text/csv"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onFile(f)
              }}
            />
          </label>
        </div>
      )}

      {csv && (
        <>
          <div className="card mb">
            <h2>1 · Map columns <span className="muted small">({fileName}, {csv.rows.length} rows)</span></h2>
            <div className="form-row">
              {colPicker('Date', mapping.date, (v) => setMapping({ ...mapping, date: v }))}
              {colPicker('Description', mapping.description, (v) => setMapping({ ...mapping, description: v }))}
              <label className="field">
                Amount format
                <select value={amountMode} onChange={(e) => setAmountMode(e.target.value as typeof amountMode)}>
                  <option value="single">One signed column</option>
                  <option value="split">Separate in / out columns</option>
                </select>
              </label>
              {amountMode === 'single'
                ? colPicker('Amount', mapping.amount, (v) => setMapping({ ...mapping, amount: v }))
                : (
                  <>
                    {colPicker('Money in', mapping.moneyIn, (v) => setMapping({ ...mapping, moneyIn: v }))}
                    {colPicker('Money out', mapping.moneyOut, (v) => setMapping({ ...mapping, moneyOut: v }))}
                  </>
                )}
            </div>
          </div>

          {result && (
            <div className="card mb">
              <h2>2 · Review</h2>
              <p className="small muted">
                {result.candidates.length} rows parsed
                {result.skippedRows > 0 && <> · {result.skippedRows} skipped (missing/unreadable date, description or amount)</>}
                {dupCount > 0 && <> · <span className="badge warn">{dupCount} look like duplicates of existing transactions</span></>}
              </p>
              {dupCount > 0 && (
                <label className="small flex" style={{ gap: 6 }}>
                  <input type="checkbox" checked={includeDuplicates} onChange={(e) => setIncludeDuplicates(e.target.checked)} />
                  Import duplicates anyway
                </label>
              )}
              <div className="table-wrap mt" style={{ maxHeight: 320, overflowY: 'auto' }}>
                <table className="grid">
                  <thead>
                    <tr><th>Date</th><th>Description</th><th className="num">Amount</th><th /></tr>
                  </thead>
                  <tbody>
                    {result.candidates.slice(0, 100).map((c, i) => (
                      <tr key={i} style={c.duplicate && !includeDuplicates ? { opacity: 0.45 } : undefined}>
                        <td className="small">{formatDate(c.date)}</td>
                        <td>{c.description}</td>
                        <td className="num"><Money pence={c.amountPence} /></td>
                        <td>{c.duplicate && <span className="badge warn">duplicate</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.candidates.length > 100 && <p className="small muted">…and {result.candidates.length - 100} more.</p>}
              </div>
            </div>
          )}

          <div className="card">
            <h2>3 · Import</h2>
            <div className="form-row">
              <label className="field">
                Category for imported rows
                <select value={defaultCategory} onChange={(e) => setDefaultCategory(e.target.value)}>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label className="small flex" style={{ gap: 6, paddingBottom: 8 }}>
                <input type="checkbox" checked={asBusiness} onChange={(e) => setAsBusiness(e.target.checked)} />
                Mark all as business
              </label>
              <button className="btn" disabled={!mappingComplete || toImport.length === 0} onClick={runImport}>
                Import {toImport.length} transaction{toImport.length === 1 ? '' : 's'}
              </button>
              <button className="btn secondary" onClick={() => setCsv(null)}>Cancel</button>
            </div>
            <p className="small muted mt">You can recategorise rows individually in the ledger afterwards — that’s usually quicker than doing it here.</p>
          </div>
        </>
      )}
    </div>
  )
}
