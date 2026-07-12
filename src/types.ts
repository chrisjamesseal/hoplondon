// All monetary values are integer pence. Negative = money out, positive = money in.

export interface Transaction {
  id: string
  date: string // ISO yyyy-mm-dd
  description: string
  amountPence: number
  categoryId: string
  account?: string
  isBusiness: boolean
  hmrcCategoryId?: string // set when a business expense is tagged as a write-off
  invoiceId?: string
  recurringId?: string
  notes?: string
}

export interface Category {
  id: string
  name: string
  kind: 'expense' | 'income'
  color: string
}

/** Budgets: monthKey (yyyy-mm) -> categoryId -> limit in pence */
export type Budgets = Record<string, Record<string, number>>

export interface Contribution {
  id: string
  date: string
  amountPence: number
}

export interface Goal {
  id: string
  name: string
  emoji: string
  targetPence: number
  deadline?: string // ISO date
  contributions: Contribution[]
}

export type Frequency = 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface RecurringItem {
  id: string
  name: string
  amountPence: number // sign convention as transactions
  categoryId: string
  frequency: Frequency
  startDate: string // first due date
  /** Last occurrence date that has been posted (or skipped); occurrences after this are pending. */
  lastPostedDate?: string
  isBusiness: boolean
  isSubscription: boolean
  paused: boolean
}

export interface Client {
  id: string
  name: string
  contact?: string
  notes?: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid'

export interface Invoice {
  id: string
  number: string
  clientId: string
  description: string
  amountPence: number
  issueDate: string
  dueDate: string
  status: InvoiceStatus
  paidDate?: string
}

export interface TaxInputs {
  /** Employment (PAYE) income for the year, if any, in pence */
  employmentIncomePence: number
  /** Tax already deducted at source (PAYE) in pence */
  taxDeductedAtSourcePence: number
}

export interface AppState {
  schemaVersion: number
  transactions: Transaction[]
  categories: Category[]
  budgets: Budgets
  goals: Goal[]
  recurring: RecurringItem[]
  clients: Client[]
  invoices: Invoice[]
  taxPot: Contribution[]
  /** Per-tax-year manual inputs, keyed by tax year id e.g. "2026-27" */
  taxInputs: Record<string, TaxInputs>
}
