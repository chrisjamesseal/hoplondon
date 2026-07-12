// Rates and thresholds are data, not code, so a new tax year is just a new
// entry here. All values in pence. England/Wales/NI bands (Scotland differs).

export interface TaxYearConfig {
  id: string // e.g. "2026-27"
  label: string
  provisional?: boolean
  personalAllowance: number
  /** Width of the basic-rate band (taxable income above the personal allowance) */
  basicRateBand: number
  /** Gross income at which the additional rate starts */
  additionalRateThreshold: number
  /** Income above which the personal allowance tapers away (£1 per £2) */
  allowanceTaperThreshold: number
  basicRate: number
  higherRate: number
  additionalRate: number
  class4: {
    lowerProfitsLimit: number
    upperProfitsLimit: number
    mainRate: number
    upperRate: number
  }
  tradingAllowance: number
  /** Payments on account are due when the balancing payment exceeds this */
  paymentsOnAccountThreshold: number
}

const P = (pounds: number) => Math.round(pounds * 100)

// Thresholds frozen since 2021; Class 4 main rate cut to 6% from April 2024,
// Class 2 abolished (state-pension credit given automatically) from 2024/25.
const frozen = {
  personalAllowance: P(12570),
  basicRateBand: P(37700),
  additionalRateThreshold: P(125140),
  allowanceTaperThreshold: P(100000),
  basicRate: 0.2,
  higherRate: 0.4,
  additionalRate: 0.45,
  class4: {
    lowerProfitsLimit: P(12570),
    upperProfitsLimit: P(50270),
    mainRate: 0.06,
    upperRate: 0.02,
  },
  tradingAllowance: P(1000),
  paymentsOnAccountThreshold: P(1000),
}

export const TAX_YEARS: TaxYearConfig[] = [
  { id: '2024-25', label: '2024/25', ...frozen },
  { id: '2025-26', label: '2025/26', ...frozen },
  { id: '2026-27', label: '2026/27', provisional: true, ...frozen },
]

export function getTaxYearConfig(id: string): TaxYearConfig {
  const found = TAX_YEARS.find((t) => t.id === id)
  // Fall back to the latest known year's rates for future years we don't have data for
  return found ?? { ...TAX_YEARS[TAX_YEARS.length - 1], id, label: id.replace('-', '/'), provisional: true }
}
