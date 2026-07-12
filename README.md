# hop — budgeting & UK freelance tax

A local-first web app that helps you save money: a "fancy spreadsheet" for everyday
budgeting, plus tooling for the awkward freelance bits — tracking what counts as an
HMRC tax write-off and estimating your Self Assessment bill so January is boring.

Everything lives in your browser's storage. No server, no account, no analytics;
export a JSON backup any time from Settings.

## Features

1. **Spreadsheet-style transaction ledger** — inline-editable grid with a keyboard-friendly
   quick-add row, filters by month/category/search, personal vs business flags, delete with undo.
2. **Bank CSV import & full export** — drop in a Monzo/Starling/Barclays (or any) CSV,
   map columns with auto-detection, review duplicates against the ledger, bulk import.
   Export everything as JSON backup or transactions as CSV.
3. **Monthly category budgets** — set limits per category, progress bars with near/over-limit
   states, copy last month's budgets forward.
4. **Dashboard** — this month's income, spending, net and savings rate; budget health,
   upcoming recurring payments, goals and tax pot at a glance.
5. **Savings goals** — targets with optional deadlines and a "save £X/month to make it" figure.
6. **Recurring & subscriptions** — rent, bills, subs and retainers post themselves to the
   ledger (with confirmation), plus a monthly/annual subscription cost overview.
7. **Freelance invoices** — clients, invoice statuses (draft/sent/paid/overdue); marking
   paid records the income automatically.
8. **HMRC write-off tagging** — tag business expenses with allowable-expense categories,
   with a built-in plain-English guide to what you can and can't claim (client entertaining:
   no; mileage: simplified rate; home-office: flat rate...).
9. **Self Assessment estimator** — trading profit with automatic trading-allowance
   comparison, income tax bands, personal allowance taper, Class 4 NI, payments on
   account, and a "set aside £X" tax pot to fill through the year. Rates are data
   (`src/lib/tax/taxYears.ts`), so new tax years are a one-line addition.
10. **Reports & insights** — income vs spending, spending by category, business vs
    personal split, top merchants, and callouts like "Eating out is 30% above your
    3-month average".

> ⚠️ Tax figures are estimates for planning (England/Wales/NI rates, cash basis) —
> not tax advice. Check [gov.uk](https://www.gov.uk/self-assessment-tax-returns) or an
> accountant before filing.

## Using it

Once merged to `main`, the app deploys automatically to GitHub Pages:
**https://chrisjamesseal.github.io/hoplondon/**

Your data still never leaves your device — the site is static files; everything you
enter is stored in your own browser.

## Running it locally

```bash
npm install
npm run dev        # local dev server
npm run build      # production build to dist/
npm test           # unit tests (tax engine, CSV import, dates, recurring)
```

Open the app and load **demo data from Settings** to explore with six months of
realistic example data.

## Stack

Vite + React + TypeScript · Zustand (localStorage persistence) · Recharts · PapaParse.
Money is stored as integer pence; the UK tax year (6 April–5 April) is handled in
`src/lib/dates.ts`.
