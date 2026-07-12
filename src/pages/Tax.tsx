import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { sumContributions, useStore } from '../store/store'
import { currentTaxYear, formatTaxYear, taxYearBounds, todayISO } from '../lib/dates'
import { formatPence, parseAmountToPence, penceToInputValue } from '../lib/money'
import { businessSummary } from '../lib/selectors'
import { estimateTax } from '../lib/tax/ukTax'
import { getTaxYearConfig, TAX_YEARS } from '../lib/tax/taxYears'
import { HMRC_CATEGORIES } from '../lib/tax/hmrcCategories'
import { Money, ProgressBar, Stat } from '../components/ui'

export default function Tax() {
  const transactions = useStore((s) => s.transactions)
  const taxInputs = useStore((s) => s.taxInputs)
  const setTaxInputs = useStore((s) => s.setTaxInputs)
  const taxPot = useStore((s) => s.taxPot)
  const addTaxPotContribution = useStore((s) => s.addTaxPotContribution)

  const [taxYearId, setTaxYearId] = useState(currentTaxYear())
  const [potAmount, setPotAmount] = useState('')
  const cfg = getTaxYearConfig(taxYearId)
  const inputs = taxInputs[taxYearId] ?? { employmentIncomePence: 0, taxDeductedAtSourcePence: 0 }

  const biz = useMemo(() => businessSummary({ transactions }, taxYearId), [transactions, taxYearId])
  const estimate = estimateTax(
    {
      businessIncome: biz.income,
      allowableExpenses: biz.expenses,
      employmentIncome: inputs.employmentIncomePence,
      taxDeductedAtSource: inputs.taxDeductedAtSourcePence,
    },
    cfg,
  )
  const potBalance = sumContributions(taxPot)
  const [start, end] = taxYearBounds(taxYearId)
  const yearIds = [...new Set([...TAX_YEARS.map((t) => t.id), currentTaxYear()])].sort()

  const moneyInput = (label: string, value: number, onCommit: (pence: number) => void) => (
    <label className="field">
      {label}
      <input
        key={`${taxYearId}-${value}`}
        type="text"
        inputMode="decimal"
        style={{ width: 120 }}
        defaultValue={value ? penceToInputValue(value) : ''}
        placeholder="0.00"
        onBlur={(e) => {
          const p = parseAmountToPence(e.target.value || '0')
          if (p !== null) onCommit(p)
        }}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </label>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Self Assessment estimator</h1>
          <div className="subtitle">Tax year {formatTaxYear(taxYearId)} ({start} to {end}){cfg.provisional && ' · rates provisional'}</div>
        </div>
        <label className="field">
          Tax year
          <select value={taxYearId} onChange={(e) => setTaxYearId(e.target.value)}>
            {yearIds.map((id) => <option key={id} value={id}>{formatTaxYear(id)}</option>)}
          </select>
        </label>
      </div>

      <div className="callout mb">
        These figures are an <strong>estimate for planning</strong>, using England/Wales/NI rates on a cash basis — not tax advice.
        Student loans, pension relief, dividends and Scottish rates aren’t included. Check <a href="https://www.gov.uk/self-assessment-tax-returns" target="_blank" rel="noreferrer">gov.uk</a> or an accountant before filing.
      </div>

      <div className="card-grid cols-4 mb">
        <Stat label="Business income" value={formatPence(biz.income)} sub={<>from business-flagged income &amp; paid invoices</>} />
        <Stat label="Allowable expenses" value={formatPence(estimate.deductionApplied)}
          sub={estimate.usedTradingAllowance ? `trading allowance beats your ${formatPence(biz.expenses)} of tagged expenses` : 'tagged write-offs'} />
        <Stat label="Estimated tax + NI" value={formatPence(estimate.totalLiability)} tone={estimate.totalLiability > 0 ? 'neg' : undefined}
          sub={`effective rate ${(estimate.effectiveRate * 100).toFixed(1)}%`} />
        <Stat label="Suggested set-aside" value={formatPence(estimate.suggestedSetAside)}
          sub={estimate.paymentsOnAccountDue ? 'includes first payment on account' : 'no payments on account due'} />
      </div>

      {biz.untaggedExpenses > 0 && (
        <div className="callout warn mb">
          {formatPence(biz.untaggedExpenses)} of business spending has no HMRC write-off category, so it is <strong>not</strong> being deducted.
          Tag it in the <Link to="/transactions">ledger</Link> if it qualifies (guide below).
        </div>
      )}

      <div className="card-grid cols-2 mb">
        <div className="card">
          <h2>How it’s worked out</h2>
          <table className="grid">
            <tbody>
              <tr><td>Business income</td><td className="num mono">{formatPence(biz.income)}</td></tr>
              <tr>
                <td>
                  {estimate.usedTradingAllowance ? 'Trading allowance (used instead of expenses)' : 'Allowable expenses'}
                </td>
                <td className="num mono">−{formatPence(estimate.deductionApplied)}</td>
              </tr>
              <tr><td><strong>Trading profit</strong></td><td className="num mono"><strong>{formatPence(estimate.tradingProfit)}</strong></td></tr>
              {inputs.employmentIncomePence > 0 && (
                <tr><td>Employment income</td><td className="num mono">{formatPence(inputs.employmentIncomePence)}</td></tr>
              )}
              <tr><td>Personal allowance{estimate.personalAllowance < cfg.personalAllowance && ' (tapered)'}</td><td className="num mono">−{formatPence(Math.min(estimate.personalAllowance, estimate.totalIncome))}</td></tr>
              <tr><td><strong>Taxable income</strong></td><td className="num mono"><strong>{formatPence(estimate.taxableIncome)}</strong></td></tr>
              {estimate.bands.map((b) => (
                <tr key={b.name}>
                  <td className="muted">{b.name} — {formatPence(b.amount)} @ {Math.round(b.rate * 100)}%</td>
                  <td className="num mono">{formatPence(b.tax)}</td>
                </tr>
              ))}
              <tr><td>Income tax</td><td className="num mono">{formatPence(estimate.incomeTax)}</td></tr>
              <tr><td>Class 4 National Insurance</td><td className="num mono">{formatPence(estimate.class4NI)}</td></tr>
              {inputs.taxDeductedAtSourcePence > 0 && (
                <tr><td>Already deducted (PAYE)</td><td className="num mono">−{formatPence(inputs.taxDeductedAtSourcePence)}</td></tr>
              )}
              <tr><td><strong>Balancing payment</strong></td><td className="num mono"><strong>{formatPence(estimate.balancingPayment)}</strong></td></tr>
              {estimate.paymentsOnAccountDue && (
                <tr>
                  <td className="muted">Plus 2 payments on account of {formatPence(estimate.paymentOnAccountEach)} (Jan &amp; Jul)</td>
                  <td className="num mono">{formatPence(estimate.paymentOnAccountEach * 2)}</td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="small muted mt">Class 2 NI is treated as covered automatically since April 2024.</p>
        </div>

        <div>
          <div className="card mb">
            <h2>Other income (optional)</h2>
            <p className="small muted">If you also have a PAYE job, add it so the right tax bands apply to your freelance profit.</p>
            <div className="form-row">
              {moneyInput('Employment income (£/yr)', inputs.employmentIncomePence, (p) =>
                setTaxInputs(taxYearId, { ...inputs, employmentIncomePence: p }))}
              {moneyInput('Tax already deducted (£)', inputs.taxDeductedAtSourcePence, (p) =>
                setTaxInputs(taxYearId, { ...inputs, taxDeductedAtSourcePence: p }))}
            </div>
          </div>

          <div className="card">
            <h2>Tax pot</h2>
            <p className="small muted">Move money aside as invoices get paid, so the January bill is boring.</p>
            <div className="flex between small">
              <span className="muted">Set aside</span>
              <strong>{formatPence(potBalance)} of {formatPence(estimate.suggestedSetAside)}</strong>
            </div>
            <ProgressBar fraction={estimate.suggestedSetAside > 0 ? potBalance / estimate.suggestedSetAside : 1} invertColours />
            <div className="form-row mt">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount (£)"
                style={{ width: 110 }}
                value={potAmount}
                onChange={(e) => setPotAmount(e.target.value)}
              />
              <button
                className="btn small"
                onClick={() => {
                  const p = parseAmountToPence(potAmount)
                  if (p) { addTaxPotContribution(p, todayISO()); setPotAmount('') }
                }}
              >
                Add to pot
              </button>
              {biz.income > 0 && (
                <span className="small muted">
                  Rule of thumb: put {Math.max(5, Math.round((estimate.suggestedSetAside / Math.max(1, biz.income)) * 100))}% of every payment in.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>What can I claim? — HMRC allowable expenses guide</h2>
        <p className="small muted mb">
          General guidance for sole traders, summarised from <a href="https://www.gov.uk/expenses-if-youre-self-employed" target="_blank" rel="noreferrer">gov.uk/expenses-if-youre-self-employed</a>. Tag qualifying spending in the ledger and it flows into the estimate above.
        </p>
        {HMRC_CATEGORIES.map((cat) => {
          const claimed = biz.byHmrcCategory.get(cat.id) ?? 0
          return (
            <details className="guide" key={cat.id}>
              <summary>
                {cat.emoji} {cat.name}
                {claimed > 0 && <span className="badge pos" style={{ marginLeft: 8 }}>claimed {formatPence(claimed)}</span>}
              </summary>
              <div className="guide-body">
                <div className="small"><strong className="amount-pos">✓ Usually allowable</strong></div>
                <ul className="small">{cat.canClaim.map((x) => <li key={x}>{x}</li>)}</ul>
                <div className="small"><strong className="amount-neg">✗ Not allowable</strong></div>
                <ul className="small">{cat.cannotClaim.map((x) => <li key={x}>{x}</li>)}</ul>
                {cat.tip && <p className="small muted">💡 {cat.tip}</p>}
              </div>
            </details>
          )
        })}
        <p className="small muted mt">
          Total tagged write-offs this year: <Money pence={biz.expenses} />
          {estimate.usedTradingAllowance && biz.income > 0 && (
            <> — but the £{(cfg.tradingAllowance / 100).toLocaleString('en-GB')} trading allowance is worth more, so the estimate uses that instead.</>
          )}
        </p>
      </div>
    </div>
  )
}
