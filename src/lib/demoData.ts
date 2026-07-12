import type { AppState, Transaction } from '../types'
import { DEFAULT_CATEGORIES, uid } from '../store/store'
import { addMonthsToKey, currentMonthKey, todayISO } from './dates'

const P = (pounds: number) => Math.round(pounds * 100)

/** Deterministic-ish pseudo-random so demo data looks organic but stable per load. */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

export function buildDemoState(): AppState {
  const rand = rng(42)
  const today = todayISO()
  const months = Array.from({ length: 6 }, (_, i) => addMonthsToKey(currentMonthKey(), i - 5))
  const txns: Transaction[] = []

  const add = (t: Omit<Transaction, 'id'>) => {
    if (t.date <= today) txns.push({ ...t, id: uid() })
  }

  const clientA = { id: uid(), name: 'Brightwave Studio', contact: 'anna@brightwave.example' }
  const clientB = { id: uid(), name: 'Fern & Co', contact: 'sam@fernco.example' }

  const invoices = months.flatMap((m, i) => {
    const issue = `${m}-10`
    const due = `${m}-24`
    const paid = `${m}-2${Math.floor(rand() * 5)}`
    const amount = P(1400 + Math.round(rand() * 900))
    const isLast = i === months.length - 1
    return [{
      id: uid(),
      number: `INV-${String(i + 1).padStart(3, '0')}`,
      clientId: i % 2 === 0 ? clientA.id : clientB.id,
      description: ['Brand refresh', 'Website build', 'Retainer — design support', 'Print collateral', 'App UI sprint', 'Consulting day rate'][i],
      amountPence: amount,
      issueDate: issue,
      dueDate: due,
      status: (isLast ? 'sent' : 'paid') as 'sent' | 'paid',
      paidDate: isLast ? undefined : paid,
    }]
  })

  for (const inv of invoices) {
    if (inv.status === 'paid' && inv.paidDate) {
      add({
        date: inv.paidDate,
        description: `Invoice ${inv.number} — ${inv.clientId === clientA.id ? 'Brightwave Studio' : 'Fern & Co'}`,
        amountPence: inv.amountPence,
        categoryId: 'freelance',
        isBusiness: true,
        invoiceId: inv.id,
      })
    }
  }

  for (const m of months) {
    add({ date: `${m}-01`, description: 'Rent', amountPence: P(-1250), categoryId: 'housing', isBusiness: false })
    add({ date: `${m}-02`, description: 'Council tax', amountPence: P(-148), categoryId: 'bills', isBusiness: false })
    add({ date: `${m}-05`, description: 'Octopus Energy', amountPence: P(-(70 + Math.round(rand() * 40))), categoryId: 'bills', isBusiness: false })
    add({ date: `${m}-07`, description: 'Netflix', amountPence: P(-12.99), categoryId: 'subscriptions', isBusiness: false })
    add({ date: `${m}-12`, description: 'Spotify', amountPence: P(-11.99), categoryId: 'subscriptions', isBusiness: false })
    add({ date: `${m}-15`, description: 'PureGym', amountPence: P(-27.99), categoryId: 'health', isBusiness: false })
    add({ date: `${m}-03`, description: 'Adobe Creative Cloud', amountPence: P(-56.98), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'office' })
    add({ date: `${m}-09`, description: 'Google Workspace', amountPence: P(-13.80), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'office' })

    for (let w = 0; w < 4; w++) {
      const day = String(3 + w * 7 + Math.floor(rand() * 3)).padStart(2, '0')
      add({ date: `${m}-${day}`, description: ['Sainsbury’s', 'Tesco', 'Lidl', 'Co-op'][Math.floor(rand() * 4)], amountPence: P(-(35 + Math.round(rand() * 45))), categoryId: 'groceries', isBusiness: false })
    }
    for (let e = 0; e < 3; e++) {
      const day = String(5 + e * 9 + Math.floor(rand() * 4)).padStart(2, '0')
      add({ date: `${m}-${day}`, description: ['Franco Manca', 'Dishoom', 'Pret', 'The Crown & Anchor'][Math.floor(rand() * 4)], amountPence: P(-(14 + Math.round(rand() * 40))), categoryId: 'eating-out', isBusiness: false })
    }
    for (let t = 0; t < 5; t++) {
      const day = String(2 + t * 5 + Math.floor(rand() * 3)).padStart(2, '0')
      add({ date: `${m}-${day}`, description: 'TfL travel', amountPence: P(-(3 + Math.round(rand() * 9))), categoryId: 'transport', isBusiness: false })
    }
    add({ date: `${m}-18`, description: 'Amazon', amountPence: P(-(15 + Math.round(rand() * 60))), categoryId: 'shopping', isBusiness: false })
  }

  // A few one-off business expenses across HMRC categories
  add({ date: `${months[1]}-14`, description: 'GWR train — client workshop', amountPence: P(-86.50), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'travel' })
  add({ date: `${months[2]}-06`, description: 'Freelancer insurance (PI)', amountPence: P(-19.5), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'legal-financial' })
  add({ date: `${months[3]}-21`, description: 'UX conference ticket', amountPence: P(-149), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'training' })
  add({ date: `${months[4]}-11`, description: 'Squarespace hosting (portfolio)', amountPence: P(-17), categoryId: 'business-costs', isBusiness: true, hmrcCategoryId: 'marketing' })
  add({ date: `${months[4]}-25`, description: 'Client lunch — Fern & Co', amountPence: P(-48.20), categoryId: 'business-costs', isBusiness: true }) // deliberately untagged: entertaining isn't allowable

  const budgets: AppState['budgets'] = {}
  for (const m of months.slice(-2)) {
    budgets[m] = {
      groceries: P(320),
      'eating-out': P(120),
      transport: P(90),
      subscriptions: P(30),
      shopping: P(80),
      entertainment: P(60),
    }
  }

  const potMonths = months.slice(0, -1)
  return {
    schemaVersion: 1,
    transactions: txns,
    categories: DEFAULT_CATEGORIES,
    budgets,
    goals: [
      {
        id: uid(), name: 'Emergency fund', emoji: '🛟', targetPence: P(6000),
        deadline: addMonthsToKey(currentMonthKey(), 10) + '-01',
        contributions: months.slice(0, -1).map((m) => ({ id: uid(), date: `${m}-28`, amountPence: P(250) })),
      },
      {
        id: uid(), name: 'Japan trip', emoji: '🗾', targetPence: P(2500),
        deadline: addMonthsToKey(currentMonthKey(), 8) + '-01',
        contributions: months.slice(2, -1).map((m) => ({ id: uid(), date: `${m}-28`, amountPence: P(150) })),
      },
    ],
    recurring: [
      { id: uid(), name: 'Rent', amountPence: P(-1250), categoryId: 'housing', frequency: 'monthly', startDate: `${addMonthsToKey(currentMonthKey(), 1)}-01`, isBusiness: false, isSubscription: false, paused: false },
      { id: uid(), name: 'Netflix', amountPence: P(-12.99), categoryId: 'subscriptions', frequency: 'monthly', startDate: `${addMonthsToKey(currentMonthKey(), 1)}-07`, isBusiness: false, isSubscription: true, paused: false },
      { id: uid(), name: 'Spotify', amountPence: P(-11.99), categoryId: 'subscriptions', frequency: 'monthly', startDate: `${addMonthsToKey(currentMonthKey(), 1)}-12`, isBusiness: false, isSubscription: true, paused: false },
      { id: uid(), name: 'Adobe Creative Cloud', amountPence: P(-56.98), categoryId: 'business-costs', frequency: 'monthly', startDate: `${addMonthsToKey(currentMonthKey(), 1)}-03`, isBusiness: true, isSubscription: true, paused: false },
      { id: uid(), name: 'PureGym', amountPence: P(-27.99), categoryId: 'health', frequency: 'monthly', startDate: `${addMonthsToKey(currentMonthKey(), 1)}-15`, isBusiness: false, isSubscription: true, paused: false },
    ],
    clients: [clientA, clientB],
    invoices,
    taxPot: potMonths.map((m) => ({ id: uid(), date: `${m}-29`, amountPence: P(320) })),
    taxInputs: {},
  }
}
