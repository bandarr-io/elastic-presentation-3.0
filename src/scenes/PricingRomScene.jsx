import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import {
  DEFAULT_COLUMNS,
  computeScenario,
  formatCurrency,
  normalizeScenarios,
  scenarioYearCount,
  toNumber,
} from '../utils/pricing'

// Customizable price / rough-order-of-magnitude (ROM) review.
// Supports multiple deal scenarios (Option A/B), multi-year terms with
// auto-projected escalators and volume ramps, a per-year discount schedule, and
// an "All Years" summary with Total Contract Value. Presenters edit everything
// in Scene Settings; all totals are computed live.

const DEFAULT_LEFT_PARAGRAPHS = [
  'Elastic\u2019s resource-based pricing aligns with how you use the platform\u2014not how much data you ingest or how many users you have.',
  'You\u2019re free to scale based on your performance and retention needs, without worrying about surprise overage fees.',
]

const DEFAULT_RIGHT_BULLETS = [
  { bold: 'Predictable costs', text: 'even as data volumes grow' },
  { bold: 'Flexibility', text: 'to support any use case\u2014search, security, observability' },
  { bold: 'Built-in value', text: 'with all core features included, no \u00e0 la carte charges' },
]

const ALL_YEARS = 'all'

function PricingRomScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Commercials'
  const titlePlain = metadata.titlePlain || 'Simple, Scalable '
  const titleAccent = metadata.titleAccent || 'Pricing'
  const subtitle = metadata.subtitle || 'One software SKU. No add-ons. No data caps.'
  const currency = metadata.currency || '$'
  const columns = { ...DEFAULT_COLUMNS, ...(metadata.columns || {}) }

  const scenarios = useMemo(() => normalizeScenarios(metadata), [metadata])
  const computed = useMemo(() => scenarios.map(computeScenario), [scenarios])

  const [activeScenario, setActiveScenario] = useState(0)
  const si = Math.min(activeScenario, scenarios.length - 1)
  const scenario = scenarios[si]
  const calc = computed[si]
  const numYears = scenarioYearCount(scenario)
  const isMultiYear = numYears > 1

  // Year selection: single-year scenarios just render their one year. Multi-year
  // scenarios add a year switcher and an "All Years" summary.
  const [activeYear, setActiveYear] = useState(0)
  const currentYear = !isMultiYear ? 0 : activeYear
  const showSummary = isMultiYear && currentYear === ALL_YEARS

  // Reset selections when the scenario or its shape changes.
  useEffect(() => {
    if (si > scenarios.length - 1) setActiveScenario(0)
  }, [si, scenarios.length])
  useEffect(() => {
    setActiveYear(0)
  }, [si])

  const leftParagraphs =
    Array.isArray(metadata.leftParagraphs) && metadata.leftParagraphs.length
      ? metadata.leftParagraphs
      : DEFAULT_LEFT_PARAGRAPHS
  const rightHeading = metadata.rightHeading || 'This model gives you:'
  const rightBullets =
    Array.isArray(metadata.rightBullets) && metadata.rightBullets.length
      ? metadata.rightBullets
      : DEFAULT_RIGHT_BULLETS

  const footnoteMarker = metadata.footnoteMarker ?? ''
  const footnote = metadata.footnote ?? ''

  const fmt = (n) => formatCurrency(n, currency)

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headBg = isDark ? '#153385' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-ink/80'
  const cardBg = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'
  const rowDivide = isDark ? 'divide-white/10' : 'divide-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 460,
      delay: stagger(60),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  const rows = scenario.rows || []
  const numCell = `px-2 py-3.5 text-right tabular-nums whitespace-nowrap ${headText}`

  // Auto-projection assumptions, surfaced so the audience sees how later years grow.
  const assumptions = []
  if (isMultiYear && toNumber(scenario.escalatorPct) > 0) assumptions.push(`Prices +${toNumber(scenario.escalatorPct)}%/yr`)
  if (isMultiYear && toNumber(scenario.rampPct) > 0) assumptions.push(`Volume +${toNumber(scenario.rampPct)}%/yr`)

  // Tab styling shared by scenario + year switchers.
  const tab = (isActive) =>
    `rounded-lg px-3.5 py-1.5 text-xs md:text-sm font-semibold transition-all duration-200 ${
      isActive
        ? 'shadow-sm'
        : isDark
          ? 'text-white/60 hover:text-white hover:bg-white/[0.05]'
          : 'text-elastic-dev-blue/70 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/[0.05]'
    }`
  const tabActiveStyle = { backgroundColor: accent, color: isDark ? '#0B1628' : '#fff' }

  const romLabel = scenario.romLabel || metadata.romLabel || ''
  const netTotalLabel = scenario.netTotalLabel || metadata.netTotalLabel || 'Net Total'

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-5 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        {/* Scenario + year switchers */}
        {(scenarios.length > 1 || isMultiYear) && (
          <div className="reveal flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              {scenarios.length > 1 && (
                <div className={`inline-flex items-center gap-1 rounded-xl border p-1 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-elastic-dev-blue/10'}`}>
                  {scenarios.map((s, i) => (
                    <button key={i} type="button" onClick={() => setActiveScenario(i)} className={tab(i === si)} style={i === si ? tabActiveStyle : undefined}>
                      {s.label || `Option ${String.fromCharCode(65 + i)}`}
                    </button>
                  ))}
                </div>
              )}

              {isMultiYear && (
                <div className={`inline-flex items-center gap-1 rounded-xl border p-1 ${isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-elastic-dev-blue/10'}`}>
                  {calc.years.map((yr) => (
                    <button key={yr.index} type="button" onClick={() => setActiveYear(yr.index)} className={tab(currentYear === yr.index)} style={currentYear === yr.index ? tabActiveStyle : undefined}>
                      {yr.label}
                    </button>
                  ))}
                  <button type="button" onClick={() => setActiveYear(ALL_YEARS)} className={tab(showSummary)} style={showSummary ? tabActiveStyle : undefined}>
                    All Years
                  </button>
                </div>
              )}
            </div>

            {assumptions.length > 0 && (
              <div className={`flex items-center gap-2 text-xs font-medium ${mutedText}`}>
                {assumptions.map((a) => (
                  <span key={a} className={`px-2.5 py-1 rounded-full ${isDark ? 'bg-white/[0.05]' : 'bg-elastic-dev-blue/[0.05]'}`}>{a}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quote table */}
        <div className="reveal flex-1 min-h-0 flex items-center justify-center">
          <div className={`w-full rounded-2xl border overflow-hidden shadow-sm ${cardBg}`}>
            {showSummary ? (
              <table className="w-full border-collapse text-sm md:text-base">
                <thead>
                  <tr style={{ backgroundColor: headBg }} className="text-white text-left">
                    <th className="px-2 py-2.5 font-bold text-center w-10">{columns.lineItem}</th>
                    <th className="px-2 py-2.5 font-bold">{columns.sku}</th>
                    {calc.years.map((yr) => (
                      <th key={yr.index} className="px-2 py-2.5 font-bold text-right w-32 whitespace-nowrap">{yr.label}</th>
                    ))}
                    <th className="px-2 py-2.5 font-bold text-right w-36 whitespace-nowrap">Contract Total</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${rowDivide}`}>
                  {rows.map((row, ri) => (
                    <tr key={ri} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-elastic-blue/[0.02]'}>
                      <td className="px-2 py-3.5 text-center font-semibold" style={{ color: accent }}>{ri + 1}</td>
                      <td className={`px-2 py-3.5 font-bold leading-snug ${headText}`}>{row.sku}</td>
                      {calc.years.map((yr) => (
                        <td key={yr.index} className={numCell}>{fmt(yr.cells[ri]?.lineTotal || 0)}</td>
                      ))}
                      <td className={`${numCell} font-bold`}>{fmt(calc.rowTotals[ri] || 0)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.08)' : 'rgba(11,100,221,0.06)' }}>
                    <td colSpan={2} className="px-3 py-2.5 font-bold text-base md:text-lg uppercase tracking-wider" style={{ color: accent }}>
                      Total Contract Value
                    </td>
                    {calc.years.map((yr) => (
                      <td key={yr.index} className={`px-2 py-2.5 text-right font-bold tabular-nums ${headText}`}>{fmt(yr.subtotal)}</td>
                    ))}
                    <td className={`px-2 py-2.5 text-right font-extrabold text-base md:text-lg tabular-nums ${headText}`}>
                      <CountUp value={calc.tcv} duration={900} format={(n) => fmt(n)} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              <table className="w-full border-collapse text-sm md:text-base">
                <thead>
                  <tr style={{ backgroundColor: headBg }} className="text-white text-left">
                    <th className="px-2 py-2.5 font-bold text-center w-10">{columns.lineItem}</th>
                    <th className="px-2 py-2.5 font-bold w-[15%]">{columns.sku}</th>
                    <th className="px-2 py-2.5 font-bold">{columns.description}</th>
                    <th className="px-2 py-2.5 font-bold text-center w-12">{columns.term}</th>
                    <th className="px-2 py-2.5 font-bold text-right w-16">{columns.quantity}</th>
                    <th className="px-2 py-2.5 font-bold text-right w-32 whitespace-nowrap">{columns.unitPrice}</th>
                    <th className="px-2 py-2.5 font-bold text-center w-20">{columns.discount}</th>
                    <th className="px-2 py-2.5 font-bold text-right w-28">{columns.total}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${rowDivide}`}>
                  {rows.map((row, ri) => {
                    const cell = calc.years[currentYear]?.cells[ri] || { quantity: 0, unitPrice: 0, discountPct: 0, hasDiscount: false, lineTotal: 0 }
                    return (
                      <tr key={ri} className={isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-elastic-blue/[0.02]'}>
                        <td className="px-2 py-3.5 text-center font-semibold" style={{ color: accent }}>{ri + 1}</td>
                        <td className={`px-2 py-3.5 font-bold leading-snug ${headText}`}>{row.sku}</td>
                        <td className={`px-2 py-3.5 leading-snug ${mutedText}`}>
                          {row.descLead && <span className={`font-bold ${headText}`}>{row.descLead} </span>}
                          {row.description}
                          {row.descNote && (
                            <span className={`block italic ${isDark ? 'text-white/50' : 'text-elastic-ink/60'}`}>{row.descNote}</span>
                          )}
                        </td>
                        <td className={`px-2 py-3.5 text-center tabular-nums ${headText}`}>{row.term}</td>
                        <td className={numCell}>{cell.quantity.toLocaleString('en-US')}</td>
                        <td className={numCell}>{fmt(cell.unitPrice)}</td>
                        <td className="px-2 py-3.5 text-center font-semibold" style={{ color: cell.hasDiscount ? accent : undefined }}>
                          <span className={cell.hasDiscount ? '' : mutedText}>{cell.hasDiscount ? `${cell.discountPct}%` : 'TBD'}</span>
                        </td>
                        <td className={`${numCell} font-bold`}>
                          {fmt(cell.lineTotal)}
                          {row.marker && <sup className="ml-0.5" style={{ color: accent }}>{row.marker}</sup>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.08)' : 'rgba(11,100,221,0.06)' }}>
                    <td colSpan={5} className="px-3 py-2.5 font-bold text-base md:text-lg" style={{ color: accent }}>
                      {romLabel}
                    </td>
                    <td colSpan={2} className={`px-2 py-2.5 text-right font-bold uppercase tracking-wider ${headText}`}>
                      {isMultiYear ? `${calc.years[currentYear]?.label} Total` : netTotalLabel}
                    </td>
                    <td className={`px-2 py-2.5 text-right font-extrabold text-base md:text-lg tabular-nums ${headText}`}>
                      <CountUp value={calc.years[currentYear]?.subtotal || 0} duration={900} format={(n) => fmt(n)} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>

        {/* Contract rollup chips (multi-year only) */}
        {isMultiYear && (
          <div className="reveal flex items-center gap-3 pt-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cardBg}`}>
              <span className={`text-xs uppercase tracking-wider ${mutedText}`}>Total Contract Value</span>
              <span className={`text-base font-extrabold tabular-nums ${headText}`}>{fmt(calc.tcv)}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cardBg}`}>
              <span className={`text-xs uppercase tracking-wider ${mutedText}`}>Avg / Year</span>
              <span className={`text-base font-extrabold tabular-nums ${headText}`}>{fmt(calc.avgAnnual)}</span>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${cardBg}`}>
              <span className={`text-xs uppercase tracking-wider ${mutedText}`}>Term</span>
              <span className={`text-base font-extrabold tabular-nums ${headText}`}>{numYears} yr</span>
            </div>
          </div>
        )}

        {/* Narrative footer */}
        <div className="reveal grid grid-cols-2 gap-8 items-start pt-4">
          <div className={`space-y-2.5 text-sm md:text-base leading-snug ${mutedText}`}>
            {leftParagraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div>
            <p className={`text-sm md:text-base font-semibold mb-2 ${headText}`}>{rightHeading}</p>
            <ul className="space-y-2">
              {rightBullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                  <span className={`text-sm md:text-base leading-snug ${mutedText}`}>
                    {b.bold && <span className={`font-bold ${headText}`}>{b.bold} </span>}
                    {b.text}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Footnote */}
        {footnote && (
          <div className={`reveal text-[10px] leading-tight pt-1 ${isDark ? 'text-white/40' : 'text-elastic-ink/50'}`}>
            {footnoteMarker && <sup>{footnoteMarker}</sup>}
            {footnote}
          </div>
        )}
      </div>
    </div>
  )
}

export default PricingRomScene
