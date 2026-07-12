/** Format integer pence as GBP, e.g. -123456 -> "-£1,234.56" */
export function formatPence(pence: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(pence)
  const pounds = Math.floor(abs / 100)
  const rem = abs % 100
  const body = `£${pounds.toLocaleString('en-GB')}.${String(rem).padStart(2, '0')}`
  if (pence < 0) return `-${body}`
  if (opts.sign && pence > 0) return `+${body}`
  return body
}

/** Format whole pounds without pennies, for compact displays. Rounds to nearest pound. */
export function formatPounds(pence: number): string {
  const rounded = Math.round(pence / 100)
  const abs = Math.abs(rounded)
  return `${rounded < 0 ? '-' : ''}£${abs.toLocaleString('en-GB')}`
}

/**
 * Parse a user-entered amount like "£1,234.56", "1234.5", "-12", "(45.00)" into pence.
 * Returns null when the input isn't a recognisable amount.
 */
export function parseAmountToPence(input: string): number | null {
  let s = input.trim()
  if (!s) return null
  let negative = false
  if (/^\(.*\)$/.test(s)) {
    negative = true
    s = s.slice(1, -1)
  }
  s = s.replace(/[£$€\s,]/g, '')
  if (s.startsWith('-')) {
    negative = !negative
    s = s.slice(1)
  } else if (s.startsWith('+')) {
    s = s.slice(1)
  }
  if (!/^\d*(\.\d*)?$/.test(s) || s === '' || s === '.') return null
  const [poundsPart, penniesPart = ''] = s.split('.')
  const pounds = poundsPart === '' ? 0 : parseInt(poundsPart, 10)
  const pennies = Math.round(parseFloat(`0.${penniesPart || '0'}`) * 100)
  const total = pounds * 100 + pennies
  return negative ? -total : total
}

/** Pence -> "1234.56" for populating <input> values (no symbol, no separators). */
export function penceToInputValue(pence: number): string {
  return (pence / 100).toFixed(2)
}
