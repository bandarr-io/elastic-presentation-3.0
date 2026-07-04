import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faPlus,
  faCopy,
  faArrowUp,
  faArrowDown,
  faTrash,
  faDownload,
  faClipboard,
  faClipboardCheck,
  faTableCells,
  faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import PricingRomScene from '../scenes/PricingRomScene'
import {
  DEFAULT_ROWS,
  computeScenario,
  formatCurrency,
  normalizeScenarios,
  projectCell,
  scenarioYearCount,
  toNumber,
} from '../utils/pricing'

const BLANK_ROW = {
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

const TEMPLATES = [
  {
    id: 'lst',
    label: 'License + Services + Training',
    patch: () => ({ rows: DEFAULT_ROWS.map((r) => ({ ...r, overrides: {} })) }),
  },
  {
    id: 'license',
    label: 'Single License Line',
    patch: () => ({
      rows: [
        {
          ...BLANK_ROW,
          sku: 'Enterprise Resource Unit - 64GB US Based Support',
          descLead: 'Software Licensing:',
          description: 'Daily Ingestion + Retention',
          quantity: '50',
          unitPrice: '13400',
        },
      ],
    }),
  },
  {
    id: 'ramp3',
    label: '3-Year Ramp (5% price / 10% volume)',
    patch: () => ({
      yearLabels: ['Year 1', 'Year 2', 'Year 3'],
      escalatorPct: '5',
      rampPct: '10',
      rows: [
        {
          ...BLANK_ROW,
          sku: 'Enterprise Resource Unit - 64GB US Based Support',
          descLead: 'Software Licensing:',
          description: 'Daily Ingestion + Retention',
          quantity: '50',
          unitPrice: '13400',
        },
      ],
    }),
  },
]

// Split a pasted spreadsheet block into line items. Tab-delimited (Excel /
// Sheets) is preferred; falls back to comma. Column order:
// SKU | Description | Quantity | Unit Price | Discount%
function parsePaste(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = (line.includes('\t') ? line.split('\t') : line.split(',')).map((s) => s.trim())
      const num = (s) => (s || '').replace(/[^0-9.]/g, '')
      return {
        ...BLANK_ROW,
        sku: parts[0] || '',
        description: parts[1] || '',
        quantity: num(parts[2]),
        unitPrice: num(parts[3]),
        discount: num(parts[4]),
      }
    })
    .filter((r) => r.sku || r.description || r.quantity || r.unitPrice)
}

function csvEscape(value) {
  const s = String(value ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Build a matrix (rows of cells) for the active scenario, with per-year
// Qty/Price/Disc/Total, a row total, and a totals footer.
function buildMatrix(scenario, calc, currency) {
  const rows = scenario.rows || []
  const yearHeaders = calc.years.flatMap((yr) => [`${yr.label} Qty`, `${yr.label} Unit`, `${yr.label} Disc%`, `${yr.label} Total`])
  const header = ['#', 'SKU', 'Description', 'Term', ...yearHeaders, 'Contract Total']

  const body = rows.map((row, ri) => {
    const perYear = calc.years.flatMap((yr) => {
      const c = yr.cells[ri] || {}
      return [c.quantity ?? 0, c.unitPrice ?? 0, c.hasDiscount ? c.discountPct : '', formatCurrency(c.lineTotal || 0, currency)]
    })
    return [ri + 1, row.sku || '', row.description || '', row.term || '', ...perYear, formatCurrency(calc.rowTotals[ri] || 0, currency)]
  })

  const totals = ['', 'Total Contract Value', '', '']
  calc.years.forEach((yr) => totals.push('', '', '', formatCurrency(yr.subtotal, currency)))
  totals.push(formatCurrency(calc.tcv, currency))

  return [header, ...body, totals]
}

export default function PricingRomBuilder({ meta, onChange, onClose }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const currency = meta.currency || '$'

  const scenarios = useMemo(() => normalizeScenarios(meta), [meta])
  const setScenarios = (next) => onChange({ scenarios: next })

  const [activeScenario, setActiveScenario] = useState(0)
  const si = Math.min(activeScenario, scenarios.length - 1)
  const scenario = scenarios[si]
  const numYears = scenarioYearCount(scenario)
  const calc = useMemo(() => computeScenario(scenario), [scenario])

  const [expanded, setExpanded] = useState({})
  const [showPaste, setShowPaste] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [copied, setCopied] = useState(false)

  // Lock body scroll while the builder is open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // --- scenario ops ---
  const updateScenario = (patch) => setScenarios(scenarios.map((s, i) => (i === si ? { ...s, ...patch } : s)))
  const addScenario = () => {
    const next = [...scenarios, { ...scenario, label: `Option ${String.fromCharCode(65 + scenarios.length)}` }]
    setScenarios(next)
    setActiveScenario(next.length - 1)
  }
  const duplicateScenario = () => {
    const copy = JSON.parse(JSON.stringify(scenario))
    copy.label = `${scenario.label || 'Option'} (copy)`
    const next = [...scenarios.slice(0, si + 1), copy, ...scenarios.slice(si + 1)]
    setScenarios(next)
    setActiveScenario(si + 1)
  }
  const removeScenario = () => {
    if (scenarios.length <= 1) return
    setScenarios(scenarios.filter((_, i) => i !== si))
    setActiveScenario(0)
  }

  // --- year ops ---
  const yearLabels = scenario.yearLabels && scenario.yearLabels.length ? scenario.yearLabels : ['Year 1']
  const addYear = () => updateScenario({ yearLabels: [...yearLabels, `Year ${yearLabels.length + 1}`] })
  const removeYear = () => yearLabels.length > 1 && updateScenario({ yearLabels: yearLabels.slice(0, -1) })
  const updateYearLabel = (y, v) => updateScenario({ yearLabels: yearLabels.map((l, i) => (i === y ? v : l)) })
  const yearDiscounts = scenario.yearDiscounts || []
  const updateYearDiscount = (y, v) => {
    const next = [...yearDiscounts]
    while (next.length < numYears) next.push('')
    next[y] = v
    updateScenario({ yearDiscounts: next })
  }

  // --- row ops ---
  const rows = scenario.rows || []
  const setRows = (next) => updateScenario({ rows: next })
  const updateRow = (ri, patch) => setRows(rows.map((r, i) => (i === ri ? { ...r, ...patch } : r)))
  const addRow = () => setRows([...rows, { ...BLANK_ROW }])
  const duplicateRow = (ri) => setRows([...rows.slice(0, ri + 1), JSON.parse(JSON.stringify(rows[ri])), ...rows.slice(ri + 1)])
  const removeRow = (ri) => setRows(rows.filter((_, i) => i !== ri))
  const moveRow = (ri, dir) => {
    const target = ri + dir
    if (target < 0 || target >= rows.length) return
    const next = [...rows]
    ;[next[ri], next[target]] = [next[target], next[ri]]
    setRows(next)
  }
  const updateOverride = (ri, y, field, value) => {
    const overrides = { ...(rows[ri].overrides || {}) }
    overrides[y] = { ...(overrides[y] || {}), [field]: value }
    updateRow(ri, { overrides })
  }

  const esc = toNumber(scenario.escalatorPct) / 100
  const ramp = toNumber(scenario.rampPct) / 100
  const autoQty = (row, y) => Math.round(toNumber(row.quantity) * Math.pow(1 + ramp, y))
  const autoUnit = (row, y) => Math.round(toNumber(row.unitPrice) * Math.pow(1 + esc, y))

  const applyTemplate = (tpl) => {
    updateScenario(tpl.patch())
    setShowTemplates(false)
  }

  const applyPaste = (mode) => {
    const parsed = parsePaste(pasteText)
    if (!parsed.length) return
    setRows(mode === 'replace' ? parsed : [...rows, ...parsed])
    setPasteText('')
    setShowPaste(false)
  }

  const exportMatrix = useMemo(() => buildMatrix(scenario, calc, currency), [scenario, calc, currency])
  const downloadCSV = () => {
    const csv = exportMatrix.map((r) => r.map(csvEscape).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(scenario.label || 'rom').replace(/[^\w-]+/g, '_')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }
  const copyTSV = async () => {
    const tsv = exportMatrix.map((r) => r.join('\t')).join('\n')
    try {
      await navigator.clipboard.writeText(tsv)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* clipboard unavailable */
    }
  }

  const fmt = (n) => formatCurrency(n, currency)

  // ---- styles ----
  const panelBg = isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'
  const surface = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'
  const text = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const muted = isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
  const cell = `w-full px-2 py-1.5 text-xs rounded-md border outline-none focus:ring-2 ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/25 focus:ring-elastic-teal/40'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/25 focus:ring-elastic-blue/30'
  }`
  const cellRight = `${cell} text-right tabular-nums`
  const tabActive = isDark ? 'border-elastic-teal/50 bg-elastic-teal/10 text-elastic-teal' : 'border-elastic-blue/40 bg-elastic-blue/10 text-elastic-blue'
  const tabIdle = isDark ? 'border-white/10 text-white/50 hover:text-white/70' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:text-elastic-dev-blue/70'
  const iconBtn = `w-6 h-6 rounded-md flex items-center justify-center text-[11px] transition-colors ${
    isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-elastic-dev-blue/50 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/10'
  }`
  const chipBtn = `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${tabIdle}`

  const GRID = 'grid items-center gap-1.5 grid-cols-[20px_minmax(0,1fr)_46px_58px_86px_52px_88px_96px]'

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col">
      {/* backdrop */}
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" aria-label="Close" onClick={onClose} />

      <div className={`relative m-3 md:m-5 flex-1 rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${panelBg} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
        {/* Header */}
        <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
          <div className="flex items-center gap-2.5">
            <FontAwesomeIcon icon={faTableCells} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
            <h2 className={`text-base font-bold ${text}`}>ROM Builder</h2>
            <span className={`text-xs ${muted}`}>Edits update the slide live</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyTSV} className={chipBtn} title="Copy table to clipboard (TSV)">
              <FontAwesomeIcon icon={copied ? faClipboardCheck : faClipboard} className="mr-1.5" />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button onClick={downloadCSV} className={chipBtn} title="Download CSV">
              <FontAwesomeIcon icon={faDownload} className="mr-1.5" />
              CSV
            </button>
            <button onClick={onClose} className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/10'}`} title="Close (Esc)">
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {/* Body: grid (left) + preview (right) */}
        <div className="flex-1 min-h-0 flex">
          {/* LEFT */}
          <div className="w-[58%] min-w-0 flex flex-col border-r overflow-hidden" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Scenario tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {scenarios.map((s, i) => (
                  <button key={i} onClick={() => setActiveScenario(i)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${i === si ? tabActive : tabIdle}`}>
                    {s.label || `Option ${String.fromCharCode(65 + i)}`}
                  </button>
                ))}
                <button onClick={addScenario} className={`${chipBtn} border-dashed`}><FontAwesomeIcon icon={faPlus} className="mr-1" />Option</button>
                <button onClick={duplicateScenario} className={iconBtn} title="Duplicate this option"><FontAwesomeIcon icon={faCopy} /></button>
                {scenarios.length > 1 && (
                  <button onClick={removeScenario} className={iconBtn} title="Remove this option"><FontAwesomeIcon icon={faTrash} /></button>
                )}
              </div>

              {/* Scenario meta */}
              <div className={`rounded-xl border p-3 space-y-3 ${surface}`}>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Option label</span>
                    <input value={scenario.label || ''} onChange={(e) => updateScenario({ label: e.target.value })} className={cell} placeholder="Option A — 3-Year Commit" />
                  </div>
                  <div>
                    <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Net total label (single-year)</span>
                    <input value={scenario.netTotalLabel || ''} onChange={(e) => updateScenario({ netTotalLabel: e.target.value })} className={cell} placeholder="Net Total" />
                  </div>
                </div>

                {/* Term / years */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Term — {numYears} {numYears === 1 ? 'year' : 'years'}</span>
                    <div className="flex items-center gap-1">
                      <button onClick={removeYear} className={`${iconBtn} ${numYears <= 1 ? 'opacity-30 pointer-events-none' : ''}`} title="Remove year"><FontAwesomeIcon icon={faArrowDown} /></button>
                      <button onClick={addYear} className={iconBtn} title="Add year"><FontAwesomeIcon icon={faPlus} /></button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {yearLabels.map((label, y) => (
                      <input key={y} value={label} onChange={(e) => updateYearLabel(y, e.target.value)} className={`${cell} !w-24`} placeholder={`Year ${y + 1}`} />
                    ))}
                  </div>
                </div>

                {/* Auto-projection */}
                {numYears > 1 && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Price escalator %/yr</span>
                      <input inputMode="numeric" value={scenario.escalatorPct ?? ''} onChange={(e) => updateScenario({ escalatorPct: e.target.value })} className={cellRight} placeholder="5" />
                    </div>
                    <div>
                      <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Volume ramp %/yr</span>
                      <input inputMode="numeric" value={scenario.rampPct ?? ''} onChange={(e) => updateScenario({ rampPct: e.target.value })} className={cellRight} placeholder="10" />
                    </div>
                  </div>
                )}
                {numYears > 1 && (
                  <div>
                    <span className={`text-[10px] uppercase tracking-wider ${muted}`}>Discount schedule % (per year)</span>
                    <div className="flex flex-wrap gap-1.5">
                      {yearLabels.map((label, y) => (
                        <input key={y} inputMode="numeric" value={yearDiscounts[y] ?? ''} onChange={(e) => updateYearDiscount(y, e.target.value)} className={`${cellRight} !w-20`} placeholder={`${label.replace(/[^0-9]/g, '') || y + 1}: %`} />
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <span className={`text-[10px] uppercase tracking-wider ${muted}`}>ROM / summary label</span>
                  <input value={scenario.romLabel || ''} onChange={(e) => updateScenario({ romLabel: e.target.value })} className={cell} placeholder="SAMPLE ROM: 20TB/day + Services + Training" />
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={addRow} className={`${chipBtn} ${isDark ? 'text-elastic-teal border-elastic-teal/40' : 'text-elastic-blue border-elastic-blue/40'}`}><FontAwesomeIcon icon={faPlus} className="mr-1" />Line item</button>
                <div className="relative">
                  <button onClick={() => setShowTemplates((v) => !v)} className={chipBtn}><FontAwesomeIcon icon={faWandMagicSparkles} className="mr-1.5" />Template</button>
                  {showTemplates && (
                    <div className={`absolute z-10 mt-1 w-64 rounded-lg border shadow-xl overflow-hidden ${surface}`}>
                      {TEMPLATES.map((t) => (
                        <button key={t.id} onClick={() => applyTemplate(t)} className={`w-full text-left px-3 py-2 text-xs ${isDark ? 'text-white/80 hover:bg-white/10' : 'text-elastic-dark-ink/80 hover:bg-elastic-dev-blue/5'}`}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => setShowPaste((v) => !v)} className={chipBtn}><FontAwesomeIcon icon={faClipboard} className="mr-1.5" />Paste</button>

                <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold">
                  {calc.years.map((yr) => (
                    <span key={yr.index} className={muted}>{yr.label}: <span className={text}>{fmt(yr.subtotal)}</span></span>
                  ))}
                  {numYears > 1 && <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>TCV: {fmt(calc.tcv)}</span>}
                </div>
              </div>

              {/* Paste panel */}
              {showPaste && (
                <div className={`rounded-xl border p-3 space-y-2 ${surface}`}>
                  <p className={`text-[11px] ${muted}`}>Paste rows from Excel/Sheets. Columns: <b>SKU · Description · Qty · Unit Price · Discount%</b> (tab or comma separated).</p>
                  <textarea rows={4} value={pasteText} onChange={(e) => setPasteText(e.target.value)} className={`${cell} font-mono`} placeholder={'ERU 64GB\t20TB Ingest\t85\t13400\t\nFlex Consulting\tServices\t90\t3300'} />
                  <div className="flex gap-2">
                    <button onClick={() => applyPaste('append')} className={`${chipBtn} ${isDark ? 'text-elastic-teal border-elastic-teal/40' : 'text-elastic-blue border-elastic-blue/40'}`}>Append</button>
                    <button onClick={() => applyPaste('replace')} className={chipBtn}>Replace all</button>
                  </div>
                </div>
              )}

              {/* Grid header */}
              <div>
                <div className={`${GRID} px-1 pb-1 text-[10px] uppercase tracking-wider ${muted}`}>
                  <span />
                  <span>Line item</span>
                  <span className="text-center">Term</span>
                  <span className="text-right">Qty</span>
                  <span className="text-right">Unit {currency}</span>
                  <span className="text-center">Disc%</span>
                  <span className="text-right">Total</span>
                  <span className="text-center">Actions</span>
                </div>

                <div className="space-y-1.5">
                  {rows.map((row, ri) => {
                    const base = projectCell(row, 0, scenario)
                    const invalid = base.lineTotal === 0
                    const isOpen = !!expanded[ri]
                    return (
                      <div key={ri} className={`rounded-lg border p-1.5 ${surface}`}>
                        {/* Top row: SKU + aligned numeric columns */}
                        <div className={GRID}>
                          <div className={`text-center text-xs font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{ri + 1}</div>
                          <input value={row.sku || ''} onChange={(e) => updateRow(ri, { sku: e.target.value })} className={`${cell} font-semibold`} placeholder="SKU / product name" />
                          <input value={row.term ?? ''} onChange={(e) => updateRow(ri, { term: e.target.value })} className={`${cell} text-center`} placeholder="12" />
                          <input inputMode="numeric" value={row.quantity ?? ''} onChange={(e) => updateRow(ri, { quantity: e.target.value })} className={cellRight} placeholder="Qty" />
                          <input inputMode="numeric" value={row.unitPrice ?? ''} onChange={(e) => updateRow(ri, { unitPrice: e.target.value })} className={cellRight} placeholder="Price" />
                          <input inputMode="numeric" value={row.discount ?? ''} onChange={(e) => updateRow(ri, { discount: e.target.value })} className={`${cell} text-center`} placeholder="TBD" />
                          <div className={`text-right text-xs font-bold tabular-nums ${invalid ? (isDark ? 'text-amber-400/80' : 'text-amber-600') : text}`} title={invalid ? 'Quantity or price is empty/zero' : `${yearLabels[0]} line total`}>
                            {fmt(base.lineTotal)}
                          </div>
                          <div className="flex items-center justify-center gap-0.5">
                            <button onClick={() => moveRow(ri, -1)} className={`${iconBtn} ${ri === 0 ? 'opacity-30 pointer-events-none' : ''}`} title="Move up"><FontAwesomeIcon icon={faArrowUp} /></button>
                            <button onClick={() => moveRow(ri, 1)} className={`${iconBtn} ${ri === rows.length - 1 ? 'opacity-30 pointer-events-none' : ''}`} title="Move down"><FontAwesomeIcon icon={faArrowDown} /></button>
                            <button onClick={() => duplicateRow(ri)} className={iconBtn} title="Duplicate"><FontAwesomeIcon icon={faCopy} /></button>
                            <button onClick={() => removeRow(ri)} className={iconBtn} title="Delete"><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        </div>

                        {/* Description block (full width, beneath the numeric row) */}
                        <div className="mt-1.5 pl-[26px] pr-[100px] space-y-1">
                          <div className="flex gap-1">
                            <input value={row.descLead || ''} onChange={(e) => updateRow(ri, { descLead: e.target.value })} className={`${cell} !w-32 shrink-0`} placeholder="Bold label" />
                            <input value={row.description || ''} onChange={(e) => updateRow(ri, { description: e.target.value })} className={`${cell} flex-1 min-w-0`} placeholder="Description" />
                          </div>
                          <div className="flex gap-1">
                            <input value={row.descNote || ''} onChange={(e) => updateRow(ri, { descNote: e.target.value })} className={`${cell} flex-1 min-w-0`} placeholder="Note (italic, optional)" />
                            <input value={row.marker || ''} onChange={(e) => updateRow(ri, { marker: e.target.value })} className={`${cell} !w-14 shrink-0 text-center`} placeholder="**" />
                          </div>
                          {numYears > 1 && (
                            <button onClick={() => setExpanded((p) => ({ ...p, [ri]: !isOpen }))} className={`text-[11px] font-semibold ${isDark ? 'text-elastic-teal/80 hover:text-elastic-teal' : 'text-elastic-blue/80 hover:text-elastic-blue'}`}>
                              {isOpen ? 'Hide per-year values' : 'Per-year values'}
                            </button>
                          )}
                        </div>

                        {/* Per-year overrides */}
                        {numYears > 1 && isOpen && (
                          <div className={`mt-1.5 ml-[26px] rounded-md p-2 space-y-1.5 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.03]'}`}>
                            <p className={`text-[10px] ${muted}`}>Blank = auto (base projected by escalator/ramp). Enter a value to override that year.</p>
                            {yearLabels.slice(1).map((label, idx) => {
                              const y = idx + 1
                              const ov = row.overrides?.[y] || {}
                              return (
                                <div key={y} className="grid grid-cols-[64px_1fr_1fr_1fr] gap-1.5 items-center">
                                  <span className={`text-[11px] font-medium truncate ${muted}`}>{label}</span>
                                  <input inputMode="numeric" value={ov.quantity ?? ''} onChange={(e) => updateOverride(ri, y, 'quantity', e.target.value)} className={cellRight} placeholder={autoQty(row, y).toLocaleString('en-US')} />
                                  <input inputMode="numeric" value={ov.unitPrice ?? ''} onChange={(e) => updateOverride(ri, y, 'unitPrice', e.target.value)} className={cellRight} placeholder={autoUnit(row, y).toLocaleString('en-US')} />
                                  <input inputMode="numeric" value={ov.discount ?? ''} onChange={(e) => updateOverride(ri, y, 'discount', e.target.value)} className={`${cell} text-center`} placeholder={yearDiscounts[y] ? `${yearDiscounts[y]}%` : 'disc%'} />
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {rows.length === 0 && (
                    <div className={`rounded-lg border border-dashed p-6 text-center text-xs ${muted} ${isDark ? 'border-white/15' : 'border-elastic-dev-blue/15'}`}>
                      No line items yet. Add one, start from a template, or paste from a spreadsheet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT — live preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className={`px-4 py-2 text-[10px] uppercase tracking-wider ${muted} border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>Live preview</div>
            <div className="flex-1 min-h-0 p-4 overflow-auto flex items-start justify-center">
              <ScaledPreview isDark={isDark}>
                <PricingRomScene metadata={meta} />
              </ScaledPreview>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// Renders children at a fixed 1280×720 stage, scaled to fit the available width
// so the preview is an accurate 16:9 miniature of the live slide.
function ScaledPreview({ children, isDark }) {
  const ref = useRef(null)
  const [scale, setScale] = useState(0.4)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const w = el.clientWidth
      setScale(Math.max(0.2, Math.min(w / 1280, 720 / 720)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={ref} className="w-full" style={{ height: 720 * scale }}>
      <div
        className={`rounded-xl overflow-hidden shadow-lg ${isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'}`}
        style={{ width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  )
}
