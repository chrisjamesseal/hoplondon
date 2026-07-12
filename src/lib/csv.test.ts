import { describe, expect, it } from 'vitest'
import { autoDetectMapping, buildImportCandidates, normaliseDate, parseCsv } from './csv'
import type { Transaction } from '../types'

describe('normaliseDate', () => {
  it('handles ISO, UK slashed and written formats', () => {
    expect(normaliseDate('2026-03-12')).toBe('2026-03-12')
    expect(normaliseDate('12/03/2026')).toBe('2026-03-12')
    expect(normaliseDate('12/03/26')).toBe('2026-03-12')
    expect(normaliseDate('12 Mar 2026')).toBe('2026-03-12')
    expect(normaliseDate('2026-03-12T09:30:00Z')).toBe('2026-03-12')
    expect(normaliseDate('not a date')).toBeNull()
  })
})

describe('autoDetectMapping', () => {
  it('detects a Monzo-style export', () => {
    const m = autoDetectMapping(['Transaction ID', 'Date', 'Name', 'Amount', 'Category'])
    expect(m.date).toBe('Date')
    expect(m.description).toBe('Name')
    expect(m.amount).toBe('Amount')
  })

  it('detects split in/out columns when there is no amount column', () => {
    const m = autoDetectMapping(['Date', 'Description', 'Money In', 'Money Out', 'Balance'])
    expect(m.amount).toBeUndefined()
    expect(m.moneyIn).toBe('Money In')
    expect(m.moneyOut).toBe('Money Out')
  })
})

describe('buildImportCandidates', () => {
  const existing: Transaction[] = [
    { id: '1', date: '2026-06-01', description: 'Tesco', amountPence: -1250, categoryId: 'groceries', isBusiness: false },
  ]

  it('parses rows, signs split columns and flags duplicates against the ledger only', () => {
    const csv = parseCsv(
      ['Date,Description,Money In,Money Out', '01/06/2026,Tesco,,12.50', '02/06/2026,Client payment,500.00,', '02/06/2026,Coffee,,3.20', '02/06/2026,Coffee,,3.20', 'bad row,,,'].join('\n'),
    )
    const { candidates, skippedRows } = buildImportCandidates(
      csv.rows,
      { date: 'Date', description: 'Description', moneyIn: 'Money In', moneyOut: 'Money Out' },
      existing,
    )
    expect(skippedRows).toBe(1)
    expect(candidates).toHaveLength(4)
    expect(candidates[0]).toMatchObject({ date: '2026-06-01', amountPence: -1250, duplicate: true })
    expect(candidates[1]).toMatchObject({ amountPence: 50000, duplicate: false })
    // Identical rows within the same file are both kept (two real coffees)
    expect(candidates[2].duplicate).toBe(false)
    expect(candidates[3].duplicate).toBe(false)
  })

  it('parses single signed amount columns', () => {
    const csv = parseCsv(['Date,Description,Amount', '2026-06-03,Refund,4.00', '2026-06-04,Lunch,-9.90'].join('\n'))
    const { candidates } = buildImportCandidates(csv.rows, { date: 'Date', description: 'Description', amount: 'Amount' }, [])
    expect(candidates[0].amountPence).toBe(400)
    expect(candidates[1].amountPence).toBe(-990)
  })
})
