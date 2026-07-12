import Papa from 'papaparse'
import type { Transaction } from '../types'
import { parseAmountToPence } from './money'

export interface ParsedCsv {
  headers: string[]
  rows: Record<string, string>[]
}

export interface ColumnMapping {
  date: string
  description: string
  /** Single signed amount column… */
  amount?: string
  /** …or separate paid-in / paid-out columns */
  moneyIn?: string
  moneyOut?: string
}

export interface ImportCandidate {
  date: string
  description: string
  amountPence: number
  /** True when a matching transaction already exists in the ledger */
  duplicate: boolean
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
  })
  const headers = result.meta.fields ?? []
  return { headers, rows: result.data }
}

const DATE_HEADERS = ['date', 'transaction date', 'created', 'timestamp', 'booking date']
const DESC_HEADERS = ['description', 'name', 'merchant', 'reference', 'memo', 'counter party', 'counterparty', 'details', 'narrative']
const AMOUNT_HEADERS = ['amount', 'amount (gbp)', 'value', 'net amount']
const MONEY_IN_HEADERS = ['money in', 'paid in', 'credit', 'credit amount', 'deposits', 'in']
const MONEY_OUT_HEADERS = ['money out', 'paid out', 'debit', 'debit amount', 'withdrawals', 'out']

function matchHeader(headers: string[], candidates: string[]): string | undefined {
  const lower = headers.map((h) => h.toLowerCase().trim())
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h === cand)
    if (idx >= 0) return headers[idx]
  }
  for (const cand of candidates) {
    const idx = lower.findIndex((h) => h.includes(cand))
    if (idx >= 0) return headers[idx]
  }
  return undefined
}

/** Guess a column mapping from headers (covers Monzo, Starling, Barclays, generic exports). */
export function autoDetectMapping(headers: string[]): Partial<ColumnMapping> {
  const mapping: Partial<ColumnMapping> = {
    date: matchHeader(headers, DATE_HEADERS),
    description: matchHeader(headers, DESC_HEADERS),
    amount: matchHeader(headers, AMOUNT_HEADERS),
  }
  if (!mapping.amount) {
    mapping.moneyIn = matchHeader(headers, MONEY_IN_HEADERS)
    mapping.moneyOut = matchHeader(headers, MONEY_OUT_HEADERS)
  }
  return mapping
}

/** Normalise "12/03/2026", "2026-03-12", "12 Mar 2026" etc. to ISO yyyy-mm-dd. */
export function normaliseDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[1]}-${m[2]}-${m[3]}`
  // UK convention: day first
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/)
  if (m) {
    const [, d, mo, yRaw] = m
    const y = yRaw.length === 2 ? `20${yRaw}` : yRaw
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})/)
  if (m) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
    const idx = months.indexOf(m[2].slice(0, 3).toLowerCase())
    if (idx >= 0) return `${m[3]}-${String(idx + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return null
}

function dedupeKey(date: string, description: string, amountPence: number): string {
  return `${date}|${description.toLowerCase().trim()}|${amountPence}`
}

/**
 * Turn mapped CSV rows into import candidates, flagging rows that already
 * exist in the ledger. Only existing transactions count as duplicates —
 * identical rows within the file are kept (could be two real coffees).
 */
export function buildImportCandidates(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  existing: Transaction[],
): { candidates: ImportCandidate[]; skippedRows: number } {
  const existingKeys = new Set(existing.map((t) => dedupeKey(t.date, t.description, t.amountPence)))
  const candidates: ImportCandidate[] = []
  let skippedRows = 0

  for (const row of rows) {
    const date = normaliseDate(row[mapping.date] ?? '')
    const description = (row[mapping.description] ?? '').trim()

    let amountPence: number | null = null
    if (mapping.amount) {
      amountPence = parseAmountToPence(row[mapping.amount] ?? '')
    } else {
      const inP = mapping.moneyIn ? parseAmountToPence(row[mapping.moneyIn] ?? '') : null
      const outP = mapping.moneyOut ? parseAmountToPence(row[mapping.moneyOut] ?? '') : null
      if (inP !== null && inP !== 0) amountPence = Math.abs(inP)
      else if (outP !== null && outP !== 0) amountPence = -Math.abs(outP)
      else if (inP !== null || outP !== null) amountPence = 0
    }

    if (!date || !description || amountPence === null) {
      skippedRows++
      continue
    }
    candidates.push({
      date,
      description,
      amountPence,
      duplicate: existingKeys.has(dedupeKey(date, description, amountPence)),
    })
  }
  return { candidates, skippedRows }
}

export function transactionsToCsv(transactions: Transaction[], categoryName: (id: string) => string): string {
  return Papa.unparse(
    transactions.map((t) => ({
      Date: t.date,
      Description: t.description,
      Amount: (t.amountPence / 100).toFixed(2),
      Category: categoryName(t.categoryId),
      Business: t.isBusiness ? 'yes' : 'no',
      Notes: t.notes ?? '',
    })),
  )
}
