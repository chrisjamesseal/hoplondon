import { useRef, useState } from 'react'
import { exportStateJson, useStore } from '../store/store'
import { transactionsToCsv } from '../lib/csv'
import { buildDemoState } from '../lib/demoData'
import { todayISO } from '../lib/dates'
import type { AppState } from '../types'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Settings() {
  const transactions = useStore((s) => s.transactions)
  const categories = useStore((s) => s.categories)
  const addCategory = useStore((s) => s.addCategory)
  const replaceState = useStore((s) => s.replaceState)
  const resetAll = useStore((s) => s.resetAll)
  const [newCat, setNewCat] = useState('')
  const [newCatKind, setNewCatKind] = useState<'expense' | 'income'>('expense')
  const [message, setMessage] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const restore = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as AppState
      if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.categories)) {
        throw new Error('Not a hop backup file')
      }
      replaceState(parsed)
      setMessage(`Restored backup: ${parsed.transactions.length} transactions.`)
    } catch (e) {
      setMessage(`Couldn’t restore: ${e instanceof Error ? e.message : 'invalid file'}`)
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Settings &amp; data</h1>
          <div className="subtitle">Everything is stored locally in this browser — export a backup now and then.</div>
        </div>
      </div>

      {message && <div className="callout mb">{message}</div>}

      <div className="card-grid cols-2">
        <div className="card">
          <h2>Backup &amp; export</h2>
          <p className="small muted">The JSON backup contains everything (transactions, budgets, goals, invoices…). The CSV is just the ledger, for spreadsheets.</p>
          <div className="flex wrap">
            <button className="btn" onClick={() => download(`hop-backup-${todayISO()}.json`, exportStateJson(), 'application/json')}>
              Export backup (JSON)
            </button>
            <button
              className="btn secondary"
              onClick={() => download(`hop-transactions-${todayISO()}.csv`, transactionsToCsv(transactions, (id) => categories.find((c) => c.id === id)?.name ?? id), 'text/csv')}
            >
              Export transactions (CSV)
            </button>
          </div>
          <div className="mt">
            <button className="btn secondary" onClick={() => fileRef.current?.click()}>Restore from JSON backup…</button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f && confirm('Restoring replaces ALL current data with the backup. Continue?')) restore(f)
                e.target.value = ''
              }}
            />
          </div>
        </div>

        <div className="card">
          <h2>Categories</h2>
          <p className="small muted">{categories.length} categories. New ones appear everywhere immediately.</p>
          <div className="form-row">
            <label className="field grow">Name<input type="text" placeholder="Pets, Childcare…" value={newCat} onChange={(e) => setNewCat(e.target.value)} /></label>
            <label className="field">Type
              <select value={newCatKind} onChange={(e) => setNewCatKind(e.target.value as 'expense' | 'income')}>
                <option value="expense">Spending</option>
                <option value="income">Income</option>
              </select>
            </label>
            <button
              className="btn"
              onClick={() => {
                if (!newCat.trim()) return
                addCategory(newCat.trim(), newCatKind, '#898781')
                setNewCat('')
              }}
            >
              Add
            </button>
          </div>
          <p className="small mt">
            {categories.map((c) => (
              <span key={c.id} className="badge muted" style={{ marginRight: 6, marginBottom: 4, display: 'inline-block' }}>
                <span className="cat-dot" style={{ background: c.color }} />{c.name}
              </span>
            ))}
          </p>
        </div>

        <div className="card">
          <h2>Demo data</h2>
          <p className="small muted">Load six months of realistic example data (freelance designer in London) to explore the app. Replaces anything currently stored.</p>
          <button
            className="btn secondary"
            onClick={() => {
              if (transactions.length === 0 || confirm('Loading demo data replaces ALL current data. Continue?')) {
                replaceState(buildDemoState())
                setMessage('Demo data loaded — have a look around!')
              }
            }}
          >
            Load demo data
          </button>
        </div>

        <div className="card">
          <h2>Danger zone</h2>
          <p className="small muted">Wipe everything stored in this browser. Export a backup first.</p>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete ALL data? This cannot be undone.')) {
                resetAll()
                setMessage('All data deleted.')
              }
            }}
          >
            Delete all data
          </button>
        </div>
      </div>

      <p className="small muted mt">
        hop is a local-first budgeting app. Nothing you enter ever leaves your device — there is no server, no account and no analytics.
      </p>
    </div>
  )
}
