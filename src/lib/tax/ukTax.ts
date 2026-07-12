import type { TaxYearConfig } from './taxYears'

export interface TaxEstimateInputs {
  /** Gross self-employment income (turnover) in pence */
  businessIncome: number
  /** Total allowable business expenses in pence */
  allowableExpenses: number
  /** Employment (PAYE) income in pence */
  employmentIncome: number
  /** Tax already deducted at source in pence */
  taxDeductedAtSource: number
}

export interface TaxEstimate {
  usedTradingAllowance: boolean
  deductionApplied: number
  tradingProfit: number
  totalIncome: number
  personalAllowance: number
  taxableIncome: number
  incomeTax: number
  bands: { name: string; amount: number; rate: number; tax: number }[]
  class4NI: number
  totalLiability: number
  balancingPayment: number
  paymentsOnAccountDue: boolean
  paymentOnAccountEach: number
  /** Suggested amount to have set aside: balancing payment + first payment on account */
  suggestedSetAside: number
  effectiveRate: number
}

/**
 * Estimate UK Self Assessment liability for a sole trader
 * (England/Wales/NI bands, cash basis). An estimate, not advice.
 */
export function estimateTax(inputs: TaxEstimateInputs, cfg: TaxYearConfig): TaxEstimate {
  const businessIncome = Math.max(0, inputs.businessIncome)
  const expenses = Math.max(0, inputs.allowableExpenses)
  const employmentIncome = Math.max(0, inputs.employmentIncome)

  // Trading allowance: deduct a flat £1,000 instead of actual expenses when
  // that's better. It cannot create a loss.
  const allowanceDeduction = Math.min(cfg.tradingAllowance, businessIncome)
  const usedTradingAllowance = businessIncome > 0 && allowanceDeduction > expenses
  const deductionApplied = usedTradingAllowance ? allowanceDeduction : Math.min(expenses, businessIncome)
  const tradingProfit = businessIncome - deductionApplied

  const totalIncome = tradingProfit + employmentIncome

  // Personal allowance tapers £1 for every £2 of income over the threshold
  const taperExcess = Math.max(0, totalIncome - cfg.allowanceTaperThreshold)
  const personalAllowance = Math.max(0, cfg.personalAllowance - Math.floor(taperExcess / 2))

  const taxableIncome = Math.max(0, totalIncome - personalAllowance)

  // Band boundaries in taxable-income terms. The additional rate starts at a
  // fixed gross income, so subtract whatever allowance actually applied.
  const basicTop = cfg.basicRateBand
  const higherTop = Math.max(basicTop, cfg.additionalRateThreshold - personalAllowance)

  const basicAmount = Math.min(taxableIncome, basicTop)
  const higherAmount = Math.max(0, Math.min(taxableIncome, higherTop) - basicTop)
  const additionalAmount = Math.max(0, taxableIncome - higherTop)

  const bands = [
    { name: 'Basic rate', amount: basicAmount, rate: cfg.basicRate, tax: Math.round(basicAmount * cfg.basicRate) },
    { name: 'Higher rate', amount: higherAmount, rate: cfg.higherRate, tax: Math.round(higherAmount * cfg.higherRate) },
    { name: 'Additional rate', amount: additionalAmount, rate: cfg.additionalRate, tax: Math.round(additionalAmount * cfg.additionalRate) },
  ].filter((b) => b.amount > 0)

  const incomeTax = bands.reduce((sum, b) => sum + b.tax, 0)

  // Class 4 NI is charged on trading profit only
  const { lowerProfitsLimit, upperProfitsLimit, mainRate, upperRate } = cfg.class4
  const mainBand = Math.max(0, Math.min(tradingProfit, upperProfitsLimit) - lowerProfitsLimit)
  const upperBand = Math.max(0, tradingProfit - upperProfitsLimit)
  const class4NI = Math.round(mainBand * mainRate) + Math.round(upperBand * upperRate)

  const totalLiability = incomeTax + class4NI
  const balancingPayment = Math.max(0, totalLiability - inputs.taxDeductedAtSource)

  // Payments on account: due when the balancing payment is over the threshold
  // and less than 80% of the liability was collected at source.
  const paymentsOnAccountDue =
    balancingPayment > cfg.paymentsOnAccountThreshold &&
    inputs.taxDeductedAtSource < totalLiability * 0.8
  const paymentOnAccountEach = paymentsOnAccountDue ? Math.round(balancingPayment / 2) : 0

  return {
    usedTradingAllowance,
    deductionApplied,
    tradingProfit,
    totalIncome,
    personalAllowance,
    taxableIncome,
    incomeTax,
    bands,
    class4NI,
    totalLiability,
    balancingPayment,
    paymentsOnAccountDue,
    paymentOnAccountEach,
    suggestedSetAside: balancingPayment + paymentOnAccountEach,
    effectiveRate: totalIncome > 0 ? totalLiability / totalIncome : 0,
  }
}
