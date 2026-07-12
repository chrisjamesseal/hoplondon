import type { AppState, Transaction } from '../types'
import { monthKeyOf, taxYearBounds } from './dates'

export function transactionsInMonth(transactions: Transaction[], monthKey: string): Transaction[] {
  return transactions.filter((t) => monthKeyOf(t.date) === monthKey)
}

export function transactionsInTaxYear(transactions: Transaction[], taxYearId: string): Transaction[] {
  const [start, end] = taxYearBounds(taxYearId)
  return transactions.filter((t) => t.date >= start && t.date <= end)
}

export function totalIncome(transactions: Transaction[]): number {
  return transactions.filter((t) => t.amountPence > 0).reduce((sum, t) => sum + t.amountPence, 0)
}

/** Total spending as a positive number of pence. */
export function totalSpending(transactions: Transaction[]): number {
  return -transactions.filter((t) => t.amountPence < 0).reduce((sum, t) => sum + t.amountPence, 0)
}

/** Spending per category (positive pence), for a set of transactions. */
export function spendingByCategory(transactions: Transaction[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const t of transactions) {
    if (t.amountPence >= 0) continue
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) - t.amountPence)
  }
  return map
}

export interface TaxYearBusinessSummary {
  income: number
  expenses: number
  byHmrcCategory: Map<string, number>
  untaggedExpenses: number
}

/** Business income and allowable (tagged) expenses for a tax year. */
export function businessSummary(state: Pick<AppState, 'transactions'>, taxYearId: string): TaxYearBusinessSummary {
  const txns = transactionsInTaxYear(state.transactions, taxYearId).filter((t) => t.isBusiness)
  const income = totalIncome(txns)
  const byHmrcCategory = new Map<string, number>()
  let expenses = 0
  let untaggedExpenses = 0
  for (const t of txns) {
    if (t.amountPence >= 0) continue
    const amount = -t.amountPence
    if (t.hmrcCategoryId) {
      expenses += amount
      byHmrcCategory.set(t.hmrcCategoryId, (byHmrcCategory.get(t.hmrcCategoryId) ?? 0) + amount)
    } else {
      untaggedExpenses += amount
    }
  }
  return { income, expenses, byHmrcCategory, untaggedExpenses }
}
