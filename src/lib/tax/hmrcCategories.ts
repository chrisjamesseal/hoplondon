// HMRC allowable-expense categories for sole traders, with plain-English
// guidance. This is general guidance, not tax advice — see
// https://www.gov.uk/expenses-if-youre-self-employed for the source rules.

export interface HmrcCategory {
  id: string
  name: string
  emoji: string
  canClaim: string[]
  cannotClaim: string[]
  tip?: string
}

export const HMRC_CATEGORIES: HmrcCategory[] = [
  {
    id: 'office',
    name: 'Office costs',
    emoji: '🖥️',
    canClaim: [
      'Stationery, printing and postage',
      'Phone, mobile and internet bills (business portion)',
      'Software and subscriptions used for work (e.g. design tools, cloud storage)',
      'Computers and equipment (usually via capital allowances / AIA)',
    ],
    cannotClaim: ['The personal-use share of dual-purpose bills'],
    tip: 'For a phone used 50/50 for work and personal, claim 50% of the bill.',
  },
  {
    id: 'travel',
    name: 'Travel',
    emoji: '🚆',
    canClaim: [
      'Train, bus, taxi and air fares for business trips',
      'Vehicle costs — or simplified mileage: 45p/mile first 10,000 miles, 25p after',
      'Hotel rooms and meals on overnight business trips',
      'Parking, tolls and congestion charges on business journeys',
    ],
    cannotClaim: [
      'Commuting between home and a regular place of work',
      'Travel with a dual personal purpose (e.g. a holiday with one meeting)',
      'Parking or speeding fines',
    ],
    tip: 'Keep a mileage log — the simplified rate is often easier than actual vehicle costs.',
  },
  {
    id: 'premises',
    name: 'Premises & working from home',
    emoji: '🏠',
    canClaim: [
      'Rent, rates, power and insurance for business premises',
      'Working from home: a share of heating, electricity, council tax, internet',
      'Or HMRC flat rate: £10/mo (25–50 hrs), £18/mo (51–100 hrs), £26/mo (101+ hrs)',
    ],
    cannotClaim: ['Buying your home or the personal share of household bills'],
    tip: 'The flat rate avoids apportioning bills, but a calculated share is often worth more.',
  },
  {
    id: 'stock',
    name: 'Stock & materials',
    emoji: '📦',
    canClaim: [
      'Goods bought for resale',
      'Raw materials and direct costs of producing goods',
    ],
    cannotClaim: ['Goods or materials taken for personal use (at cost)'],
  },
  {
    id: 'legal-financial',
    name: 'Legal & financial',
    emoji: '⚖️',
    canClaim: [
      'Accountancy and bookkeeping fees',
      'Professional indemnity and business insurance',
      'Solicitor fees for business matters',
      'Bank charges and interest on business loans (cash basis: up to £500 interest)',
    ],
    cannotClaim: ['Fines and penalties', 'Legal costs of buying property or machinery'],
  },
  {
    id: 'marketing',
    name: 'Marketing & subscriptions',
    emoji: '📣',
    canClaim: [
      'Advertising (online ads, print, directories)',
      'Website costs and hosting',
      'Free samples and mail shots',
      'Subscriptions to trade or professional journals and approved professional bodies',
    ],
    cannotClaim: [
      'Entertaining clients, suppliers or customers — never allowable',
      'Gym or club membership fees',
      'Event hospitality',
    ],
    tip: 'Client entertaining is the classic trap: lunch with a client is not deductible.',
  },
  {
    id: 'staff',
    name: 'Staff & subcontractors',
    emoji: '👥',
    canClaim: [
      'Employee and freelancer/subcontractor costs',
      'Salaries, bonuses, pensions and employer NICs',
      'Agency fees',
    ],
    cannotClaim: ['Carers or domestic help (e.g. childcare while you work)'],
  },
  {
    id: 'clothing',
    name: 'Clothing',
    emoji: '🦺',
    canClaim: [
      'Uniforms with a logo',
      'Protective clothing needed for the work',
      'Costumes for actors and entertainers',
    ],
    cannotClaim: ['Everyday clothing, even if only worn for work (yes, including suits)'],
  },
  {
    id: 'training',
    name: 'Training',
    emoji: '🎓',
    canClaim: [
      'Courses that update or maintain skills in your current business',
      'Related books and learning materials',
    ],
    cannotClaim: ['Training to start a new, unrelated line of business'],
    tip: 'A course improving skills you already use is fine; retraining for a new career is not.',
  },
]

export function getHmrcCategory(id: string | undefined): HmrcCategory | undefined {
  return HMRC_CATEGORIES.find((c) => c.id === id)
}
