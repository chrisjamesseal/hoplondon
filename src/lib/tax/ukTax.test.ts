import { describe, expect, it } from 'vitest'
import { estimateTax } from './ukTax'
import { getTaxYearConfig } from './taxYears'

const cfg = getTaxYearConfig('2025-26')
const P = (pounds: number) => Math.round(pounds * 100)

const base = { businessIncome: 0, allowableExpenses: 0, employmentIncome: 0, taxDeductedAtSource: 0 }

describe('estimateTax', () => {
  // Hand-worked: £60,000 profit. Taxable 47,430 -> 37,700@20% + 9,730@40% = £11,432.
  // Class 4: 37,700@6% + 9,730@2% = £2,262 + £194.60 = £2,456.60.
  it('matches hand-worked example at £60k profit', () => {
    const r = estimateTax({ ...base, businessIncome: P(62000), allowableExpenses: P(2000) }, cfg)
    expect(r.usedTradingAllowance).toBe(false)
    expect(r.tradingProfit).toBe(P(60000))
    expect(r.incomeTax).toBe(P(11432))
    expect(r.class4NI).toBe(P(2456.6))
    expect(r.totalLiability).toBe(P(13888.6))
    expect(r.paymentsOnAccountDue).toBe(true)
    expect(r.paymentOnAccountEach).toBe(P(6944.3))
  })

  // £30,000 profit: taxable 17,430@20% = £3,486; Class 4 17,430@6% = £1,045.80
  it('matches hand-worked example at £30k profit', () => {
    const r = estimateTax({ ...base, businessIncome: P(32000), allowableExpenses: P(2000) }, cfg)
    expect(r.incomeTax).toBe(P(3486))
    expect(r.class4NI).toBe(P(1045.8))
  })

  // £130,000: allowance fully tapered. 37,700@20% + 87,440@40% + 4,860@45% = £44,703.
  it('tapers the personal allowance above £100k', () => {
    const r = estimateTax({ ...base, businessIncome: P(132000), allowableExpenses: P(2000) }, cfg)
    expect(r.personalAllowance).toBe(0)
    expect(r.incomeTax).toBe(P(44703))
    expect(r.class4NI).toBe(P(2262) + P(1594.6))
  })

  it('partially tapers the allowance between £100k and £125,140', () => {
    // £110,000: excess 10,000 -> allowance 12,570 - 5,000 = 7,570
    const r = estimateTax({ ...base, businessIncome: P(112000), allowableExpenses: P(2000) }, cfg)
    expect(r.personalAllowance).toBe(P(7570))
    expect(r.taxableIncome).toBe(P(102430))
  })

  it('owes nothing below the personal allowance', () => {
    const r = estimateTax({ ...base, businessIncome: P(10000) }, cfg)
    expect(r.incomeTax).toBe(0)
    expect(r.class4NI).toBe(0)
    expect(r.paymentsOnAccountDue).toBe(false)
  })

  it('uses the trading allowance when it beats actual expenses', () => {
    const r = estimateTax({ ...base, businessIncome: P(20000), allowableExpenses: P(400) }, cfg)
    expect(r.usedTradingAllowance).toBe(true)
    expect(r.deductionApplied).toBe(P(1000))
    expect(r.tradingProfit).toBe(P(19000))
  })

  it('uses actual expenses when they beat the trading allowance', () => {
    const r = estimateTax({ ...base, businessIncome: P(20000), allowableExpenses: P(4500) }, cfg)
    expect(r.usedTradingAllowance).toBe(false)
    expect(r.tradingProfit).toBe(P(15500))
  })

  it('never lets deductions create a negative profit', () => {
    const r = estimateTax({ ...base, businessIncome: P(500), allowableExpenses: P(2000) }, cfg)
    expect(r.tradingProfit).toBe(0)
  })

  it('stacks freelance profit on top of employment income', () => {
    // £40k employment + £20k profit = £60k total. Same income tax as the £60k case,
    // but Class 4 only on the £20k profit: 7,430@6% = £445.80.
    const r = estimateTax({ ...base, businessIncome: P(22000), allowableExpenses: P(2000), employmentIncome: P(40000) }, cfg)
    expect(r.incomeTax).toBe(P(11432))
    expect(r.class4NI).toBe(P(445.8))
  })

  it('subtracts PAYE tax already deducted and can suppress payments on account', () => {
    const r = estimateTax(
      { ...base, businessIncome: P(22000), allowableExpenses: P(2000), employmentIncome: P(40000), taxDeductedAtSource: P(11432 - 400) },
      cfg,
    )
    // Balancing payment = 11,432 + 445.80 - 11,032 = £845.80: under £1,000 -> no POA
    expect(r.balancingPayment).toBe(P(845.8))
    expect(r.paymentsOnAccountDue).toBe(false)
    expect(r.suggestedSetAside).toBe(P(845.8))
  })
})
