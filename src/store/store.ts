import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  AppState,
  Category,
  Client,
  Contribution,
  Goal,
  Invoice,
  RecurringItem,
  TaxInputs,
  Transaction,
} from '../types'
import { todayISO } from '../lib/dates'

// Category colours use a CVD-validated categorical palette (slots 1–8), with
// sequential-blue steps and neutral grey for the overflow categories.
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'groceries', name: 'Groceries', kind: 'expense', color: '#2a78d6' },
  { id: 'transport', name: 'Transport', kind: 'expense', color: '#1baf7a' },
  { id: 'bills', name: 'Bills & utilities', kind: 'expense', color: '#eda100' },
  { id: 'health', name: 'Health & fitness', kind: 'expense', color: '#008300' },
  { id: 'housing', name: 'Rent & housing', kind: 'expense', color: '#4a3aa7' },
  { id: 'eating-out', name: 'Eating out', kind: 'expense', color: '#e34948' },
  { id: 'subscriptions', name: 'Subscriptions', kind: 'expense', color: '#e87ba4' },
  { id: 'shopping', name: 'Shopping', kind: 'expense', color: '#eb6834' },
  { id: 'entertainment', name: 'Entertainment', kind: 'expense', color: '#86b6ef' },
  { id: 'business-costs', name: 'Business costs', kind: 'expense', color: '#104281' },
  { id: 'other', name: 'Other', kind: 'expense', color: '#898781' },
  { id: 'salary', name: 'Salary', kind: 'income', color: '#008300' },
  { id: 'freelance', name: 'Freelance income', kind: 'income', color: '#2a78d6' },
  { id: 'other-income', name: 'Other income', kind: 'income', color: '#1baf7a' },
]

const emptyState: AppState = {
  schemaVersion: 1,
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  budgets: {},
  goals: [],
  recurring: [],
  clients: [],
  invoices: [],
  taxPot: [],
  taxInputs: {},
}

export const uid = () => crypto.randomUUID()

interface Actions {
  addTransaction: (t: Omit<Transaction, 'id'>) => void
  addTransactions: (ts: Omit<Transaction, 'id'>[]) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  undoDelete: () => void
  recentlyDeleted: Transaction | null

  addCategory: (name: string, kind: Category['kind'], color: string) => string
  setBudget: (monthKey: string, categoryId: string, limitPence: number | null) => void
  copyBudgets: (fromMonth: string, toMonth: string) => void

  addGoal: (g: Omit<Goal, 'id' | 'contributions'>) => void
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  addGoalContribution: (goalId: string, amountPence: number, date?: string) => void

  addRecurring: (r: Omit<RecurringItem, 'id'>) => void
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void
  deleteRecurring: (id: string) => void
  /** Post the given due occurrence dates to the ledger and advance lastPostedDate. */
  postRecurring: (id: string, dates: string[]) => void
  /** Mark occurrences up to a date as handled without creating transactions. */
  skipRecurring: (id: string, upTo: string) => void

  addClient: (c: Omit<Client, 'id'>) => string
  deleteClient: (id: string) => void
  addInvoice: (inv: Omit<Invoice, 'id'>) => void
  updateInvoice: (id: string, patch: Partial<Invoice>) => void
  deleteInvoice: (id: string) => void
  /** Mark paid and drop a matching income transaction into the ledger. */
  markInvoicePaid: (id: string, paidDate?: string) => void

  addTaxPotContribution: (amountPence: number, date?: string) => void
  deleteTaxPotContribution: (id: string) => void
  setTaxInputs: (taxYearId: string, inputs: TaxInputs) => void

  replaceState: (s: AppState) => void
  resetAll: () => void
}

export type Store = AppState & Actions

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...emptyState,
      recentlyDeleted: null,

      addTransaction: (t) =>
        set((s) => ({ transactions: [{ ...t, id: uid() }, ...s.transactions] })),
      addTransactions: (ts) =>
        set((s) => ({
          transactions: [...ts.map((t) => ({ ...t, id: uid() })), ...s.transactions],
        })),
      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      deleteTransaction: (id) =>
        set((s) => {
          const victim = s.transactions.find((t) => t.id === id) ?? null
          return {
            transactions: s.transactions.filter((t) => t.id !== id),
            recentlyDeleted: victim,
          }
        }),
      undoDelete: () =>
        set((s) =>
          s.recentlyDeleted
            ? { transactions: [s.recentlyDeleted, ...s.transactions], recentlyDeleted: null }
            : s,
        ),

      addCategory: (name, kind, color) => {
        const id = uid()
        set((s) => ({ categories: [...s.categories, { id, name, kind, color }] }))
        return id
      },
      setBudget: (monthKey, categoryId, limitPence) =>
        set((s) => {
          const month = { ...(s.budgets[monthKey] ?? {}) }
          if (limitPence === null) delete month[categoryId]
          else month[categoryId] = limitPence
          return { budgets: { ...s.budgets, [monthKey]: month } }
        }),
      copyBudgets: (fromMonth, toMonth) =>
        set((s) => ({
          budgets: {
            ...s.budgets,
            [toMonth]: { ...(s.budgets[fromMonth] ?? {}), ...(s.budgets[toMonth] ?? {}) },
          },
        })),

      addGoal: (g) => set((s) => ({ goals: [...s.goals, { ...g, id: uid(), contributions: [] }] })),
      updateGoal: (id, patch) =>
        set((s) => ({ goals: s.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      deleteGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      addGoalContribution: (goalId, amountPence, date = todayISO()) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [...g.contributions, { id: uid(), date, amountPence }] }
              : g,
          ),
        })),

      addRecurring: (r) => set((s) => ({ recurring: [...s.recurring, { ...r, id: uid() }] })),
      updateRecurring: (id, patch) =>
        set((s) => ({ recurring: s.recurring.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),
      deleteRecurring: (id) => set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) })),
      postRecurring: (id, dates) => {
        const item = get().recurring.find((r) => r.id === id)
        if (!item || dates.length === 0) return
        const newTxns: Transaction[] = dates.map((date) => ({
          id: uid(),
          date,
          description: item.name,
          amountPence: item.amountPence,
          categoryId: item.categoryId,
          isBusiness: item.isBusiness,
          recurringId: item.id,
        }))
        const last = dates[dates.length - 1]
        set((s) => ({
          transactions: [...newTxns, ...s.transactions],
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, lastPostedDate: last } : r)),
        }))
      },
      skipRecurring: (id, upTo) =>
        set((s) => ({
          recurring: s.recurring.map((r) => (r.id === id ? { ...r, lastPostedDate: upTo } : r)),
        })),

      addClient: (c) => {
        const id = uid()
        set((s) => ({ clients: [...s.clients, { ...c, id }] }))
        return id
      },
      deleteClient: (id) => set((s) => ({ clients: s.clients.filter((c) => c.id !== id) })),
      addInvoice: (inv) => set((s) => ({ invoices: [...s.invoices, { ...inv, id: uid() }] })),
      updateInvoice: (id, patch) =>
        set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      deleteInvoice: (id) => set((s) => ({ invoices: s.invoices.filter((i) => i.id !== id) })),
      markInvoicePaid: (id, paidDate = todayISO()) => {
        const inv = get().invoices.find((i) => i.id === id)
        if (!inv || inv.status === 'paid') return
        const client = get().clients.find((c) => c.id === inv.clientId)
        const txn: Transaction = {
          id: uid(),
          date: paidDate,
          description: `Invoice ${inv.number}${client ? ` — ${client.name}` : ''}`,
          amountPence: Math.abs(inv.amountPence),
          categoryId: 'freelance',
          isBusiness: true,
          invoiceId: inv.id,
        }
        set((s) => ({
          invoices: s.invoices.map((i) => (i.id === id ? { ...i, status: 'paid', paidDate } : i)),
          transactions: [txn, ...s.transactions],
        }))
      },

      addTaxPotContribution: (amountPence, date = todayISO()) =>
        set((s) => ({ taxPot: [...s.taxPot, { id: uid(), date, amountPence }] })),
      deleteTaxPotContribution: (id) =>
        set((s) => ({ taxPot: s.taxPot.filter((c) => c.id !== id) })),
      setTaxInputs: (taxYearId, inputs) =>
        set((s) => ({ taxInputs: { ...s.taxInputs, [taxYearId]: inputs } })),

      replaceState: (imported) => set(() => ({ ...imported, recentlyDeleted: null })),
      resetAll: () => set(() => ({ ...emptyState, recentlyDeleted: null })),
    }),
    {
      name: 'hoplondon-store',
      version: 1,
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        transactions: s.transactions,
        categories: s.categories,
        budgets: s.budgets,
        goals: s.goals,
        recurring: s.recurring,
        clients: s.clients,
        invoices: s.invoices,
        taxPot: s.taxPot,
        taxInputs: s.taxInputs,
      }),
    },
  ),
)

export function exportStateJson(): string {
  const s = useStore.getState()
  const data: AppState = {
    schemaVersion: s.schemaVersion,
    transactions: s.transactions,
    categories: s.categories,
    budgets: s.budgets,
    goals: s.goals,
    recurring: s.recurring,
    clients: s.clients,
    invoices: s.invoices,
    taxPot: s.taxPot,
    taxInputs: s.taxInputs,
  }
  return JSON.stringify(data, null, 2)
}

export function sumContributions(list: Contribution[]): number {
  return list.reduce((sum, c) => sum + c.amountPence, 0)
}
