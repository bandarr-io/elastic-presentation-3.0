// Shared math for the Pricing / ROM scene and its editor. A "scenario" is one
// deal option (e.g. "Option A — 3-Year Commit"); each scenario has a number of
// years and a list of line items. Later years are auto-projected from the
// Year-1 base using a price escalator and a volume ramp, with optional per-cell
// overrides and a per-year discount schedule.

import { RU_LIST_PRICE } from './whiteboardSizing'

export const DEFAULT_COLUMNS = {
  lineItem: 'Line Item',
  sku: 'SKU',
  description: 'Description',
  term: 'Term',
  quantity: 'Quantity',
  unitPrice: 'List Unit Price',
  discount: 'Discount',
  total: 'Total',
}

export const DEFAULT_ROWS = [
  {
    sku: 'Enterprise Resource Unit - 64GB US Based Support',
    descLead: 'Software Licensing:',
    description: '20TB Daily Ingestion, 365 Day Retention',
    descNote: '',
    term: '12',
    quantity: '85',
    // the SKU is stable, the price isn't, so it comes from the one place that tracks it
    unitPrice: String(RU_LIST_PRICE),
    discount: '',
    marker: '**',
  },
  {
    sku: 'Flex Consulting',
    descLead: 'Services:',
    description:
      'Elastic professional services for implementation, migration. Delivered in 4 or 8 hr increments virtually or onsite',
    descNote: 'Cleared resources available',
    term: '12',
    quantity: '90',
    unitPrice: '3300',
    discount: '',
    marker: '',
  },
  {
    sku: 'Private Training 25 (1-day)',
    descLead: 'Private Training:',
    description: 'delivery of an Elastic course for 1 day for up to 25 students, including travel & lodging',
    descNote: '',
    term: '12',
    quantity: '3',
    unitPrice: '15000',
    discount: '25',
    marker: '',
  },
]

// A fresh, empty line item. Shared by the builder's "add row", its templates,
// and the paste importer so every row — however it was created — has the same
// shape. `descLead` is the bold label rendered before the description.
export const BLANK_ROW = {
  sku: '',
  descLead: '',
  description: '',
  descNote: '',
  term: '12',
  quantity: '',
  unitPrice: '',
  discount: '',
  marker: '',
  overrides: {},
}

// Keep only the numeric part of a pasted cell (it may carry a currency symbol,
// thousands separators, or a trailing %).
function pasteNumber(value) {
  return (value || '').replace(/[^0-9.]/g, '')
}

// A cell is "clean numeric" when the whole thing is just a number (optionally a
// currency prefix, grouping commas, or a trailing %) — "85" or "$13,400", but
// not "12 TB storage". Used to tell a real spreadsheet row from a tab-shaped
// line that lost its tabs.
function isNumericCell(value) {
  return /^[$€£]?\s*\d[\d,]*(\.\d+)?\s*%?$/.test((value || '').trim())
}

// Choose the delimiter for one pasted line. Tab wins outright — that's what
// Excel/Sheets copy, and whiteboard descriptions carry commas ("6 nodes, 12 TB
// storage") that a comma split would shred. Comma is only trusted when the
// split yields a spreadsheet-shaped row (SKU · Description · Qty …) with a
// clean-numeric quantity; otherwise the line stays intact as a single cell so a
// mangled paste fails visibly instead of silently landing in the wrong columns.
function splitPasteLine(line) {
  if (line.includes('\t')) return line.split('\t')
  const commaParts = line.split(',')
  const plausible = commaParts.length >= 3 && isNumericCell(commaParts[2])
  return plausible ? commaParts : [line]
}

// Split a pasted spreadsheet block into line items. Documented column order:
//   SKU · Description · Qty · Unit Price · Discount% · [Bold label]
// The 6th column is optional; a plain 5-column Excel/Sheets paste leaves the
// bold lead empty exactly as before, and the whiteboard's "Copy quote lines"
// fills it so its rows arrive looking like the builder's own template rows.
export function parsePaste(text) {
  return String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = splitPasteLine(line).map((s) => s.trim())
      return {
        ...BLANK_ROW,
        overrides: {},
        sku: parts[0] || '',
        description: parts[1] || '',
        quantity: pasteNumber(parts[2]),
        unitPrice: pasteNumber(parts[3]),
        discount: pasteNumber(parts[4]),
        descLead: parts[5] || '',
      }
    })
    .filter((r) => r.sku || r.description || r.quantity || r.unitPrice)
}

// Strip commas/currency symbols and coerce to a finite number (0 on failure).
export function toNumber(value) {
  if (value == null || value === '') return 0
  const n = Number(String(value).replace(/[^0-9.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

// A value counts as "set" when it is a non-empty, finite number string.
function isSet(value) {
  return value != null && String(value).trim() !== '' && Number.isFinite(Number(value))
}

export function formatCurrency(n, currency = '$') {
  return `${currency}${Math.round(toNumber(n)).toLocaleString('en-US')}`
}

// Number of years in a scenario, derived from its year labels (min 1).
export function scenarioYearCount(scenario) {
  const labels = scenario?.yearLabels
  return Array.isArray(labels) && labels.length ? labels.length : 1
}

export function scenarioYearLabel(scenario, yearIndex) {
  return scenario?.yearLabels?.[yearIndex] || `Year ${yearIndex + 1}`
}

// Effective values for one line item in one (0-based) year: overrides win,
// otherwise Year-1 base is projected forward by the escalator/ramp. Discount
// precedence: per-cell override → scenario year-discount schedule → base row.
export function projectCell(row, yearIndex, scenario) {
  const override = row?.overrides?.[yearIndex] || {}
  const escalator = toNumber(scenario?.escalatorPct) / 100
  const ramp = toNumber(scenario?.rampPct) / 100

  const quantity = isSet(override.quantity)
    ? toNumber(override.quantity)
    : Math.round(toNumber(row?.quantity) * Math.pow(1 + ramp, yearIndex))

  const unitPrice = isSet(override.unitPrice)
    ? toNumber(override.unitPrice)
    : Math.round(toNumber(row?.unitPrice) * Math.pow(1 + escalator, yearIndex))

  let discountSource = ''
  if (isSet(override.discount)) discountSource = override.discount
  else if (isSet(scenario?.yearDiscounts?.[yearIndex])) discountSource = scenario.yearDiscounts[yearIndex]
  else if (isSet(row?.discount)) discountSource = row.discount

  const hasDiscount = isSet(discountSource)
  const discountPct = hasDiscount ? toNumber(discountSource) : 0
  const lineTotal = Math.round(quantity * unitPrice * (1 - discountPct / 100))

  // "Priced" means a unit price is actually set. A blank price (the state
  // whiteboard-imported rows arrive in) is a to-do, not a $0 line — so callers
  // can show it neutrally instead of flagging it as broken.
  const priced = isSet(override.unitPrice) || isSet(row?.unitPrice)

  return { quantity, unitPrice, discountPct, hasDiscount, lineTotal, priced }
}

// Full computation for a scenario: per-year cells + subtotal, plus contract
// rollups (TCV = Σ year subtotals, average annual = TCV ÷ years).
export function computeScenario(scenario) {
  const numYears = scenarioYearCount(scenario)
  const rows = scenario?.rows || []

  const years = []
  for (let y = 0; y < numYears; y++) {
    let subtotal = 0
    const cells = rows.map((row) => {
      const cell = projectCell(row, y, scenario)
      subtotal += cell.lineTotal
      return cell
    })
    years.push({ index: y, label: scenarioYearLabel(scenario, y), subtotal, cells })
  }

  const tcv = years.reduce((sum, yr) => sum + yr.subtotal, 0)
  const avgAnnual = numYears ? Math.round(tcv / numYears) : 0

  // Per line-item total across all years (for the All-Years summary rows).
  const rowTotals = rows.map((_, ri) => years.reduce((sum, yr) => sum + (yr.cells[ri]?.lineTotal || 0), 0))

  // Real line items still awaiting a unit price. Lets the totals footer show
  // that the running total is provisional rather than presenting an
  // understated number as final.
  const unpricedCount = rows.filter((row) => {
    const hasContent = isSet(row?.quantity) || String(row?.sku || '').trim() || String(row?.description || '').trim()
    return hasContent && !projectCell(row, 0, scenario).priced
  }).length

  return { numYears, years, tcv, avgAnnual, rowTotals, unpricedCount }
}

// Normalize scene metadata into a scenarios array. Legacy single-table metadata
// (top-level `rows`) is wrapped into one single-year scenario so older decks
// keep working unchanged.
export function normalizeScenarios(metadata = {}) {
  if (Array.isArray(metadata.scenarios) && metadata.scenarios.length) {
    return metadata.scenarios
  }
  const legacyRows = Array.isArray(metadata.rows) && metadata.rows.length ? metadata.rows : DEFAULT_ROWS
  return [
    {
      label: metadata.scenarioLabel || 'Option A',
      yearLabels: Array.isArray(metadata.yearLabels) && metadata.yearLabels.length ? metadata.yearLabels : ['Year 1'],
      escalatorPct: metadata.escalatorPct || '',
      rampPct: metadata.rampPct || '',
      yearDiscounts: metadata.yearDiscounts || [],
      romLabel: metadata.romLabel,
      netTotalLabel: metadata.netTotalLabel,
      rows: legacyRows,
    },
  ]
}
