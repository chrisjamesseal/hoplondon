/** Pounds per dollar, for showing costs in £. Update this if the exchange rate moves a lot. */
export const GBP_PER_USD = 0.76
/** What writing a course cost, in pounds, or nothing if Claude didn't write it */
export const costText = (usd?: number): string => {
  if (!usd) return ''
  const gbp = usd * GBP_PER_USD
  return gbp < 0.01 ? 'Under 1p' : '£' + gbp.toFixed(2)
}
