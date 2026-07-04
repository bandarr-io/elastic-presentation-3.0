import { useMemo, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTableCells } from '@fortawesome/free-solid-svg-icons'
import PricingRomBuilder from '../PricingRomBuilder'
import { DEFAULT_COLUMNS, computeScenario, formatCurrency, normalizeScenarios, scenarioYearCount } from '../../utils/pricing'

// Side-panel editor for the Pricing / ROM scene. The pricing table itself
// (scenarios, years, line items, auto-projection) is built in the full-screen
// ROM Builder; this panel handles the surrounding slide text and launches it.

export default function PricingRomEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['pricing-rom'] || {}
  const update = (patch) => onUpdateSceneMetadata('pricing-rom', { ...meta, ...patch })

  const [builderOpen, setBuilderOpen] = useState(false)

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`
  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`

  const currency = meta.currency || '$'
  const columns = { ...DEFAULT_COLUMNS, ...(meta.columns || {}) }
  const updateColumn = (key, value) => update({ columns: { ...columns, [key]: value } })

  // Summary of the current quote for the launch card.
  const scenarios = useMemo(() => normalizeScenarios(meta), [meta])
  const summary = useMemo(
    () =>
      scenarios.map((s) => {
        const calc = computeScenario(s)
        return { label: s.label, years: scenarioYearCount(s), lines: (s.rows || []).length, tcv: calc.tcv }
      }),
    [scenarios],
  )

  const leftParagraphs = meta.leftParagraphs || ['']
  const setLeftParagraphs = (next) => update({ leftParagraphs: next })
  const rightBullets = meta.rightBullets || [{ bold: '', text: '' }]
  const setRightBullets = (next) => update({ rightBullets: next })
  const updateBullet = (bi, patch) => setRightBullets(rightBullets.map((b, i) => (i === bi ? { ...b, ...patch } : b)))

  return (
    <div className="space-y-6 mt-6">
      {/* Launch ROM Builder */}
      <div className={`rounded-xl border p-4 ${isDark ? 'border-elastic-teal/30 bg-elastic-teal/[0.06]' : 'border-elastic-blue/30 bg-elastic-blue/[0.05]'}`}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Pricing table</p>
            <p className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
              {scenarios.length} option{scenarios.length > 1 ? 's' : ''} · build line items, multi-year terms & totals
            </p>
          </div>
          <button
            onClick={() => setBuilderOpen(true)}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
              isDark ? 'bg-elastic-teal text-elastic-dev-blue hover:bg-elastic-teal/90' : 'bg-elastic-blue text-white hover:bg-elastic-blue/90'
            }`}
          >
            <FontAwesomeIcon icon={faTableCells} />
            Open ROM Builder
          </button>
        </div>
        <div className="mt-3 space-y-1">
          {summary.map((s, i) => (
            <div key={i} className={`flex items-center justify-between text-xs ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
              <span className="truncate">{s.label || `Option ${String.fromCharCode(65 + i)}`} · {s.lines} line{s.lines === 1 ? '' : 's'} · {s.years}yr</span>
              <span className={`font-semibold tabular-nums ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{formatCurrency(s.tcv, currency)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Header */}
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Commercials" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Title Plain</label>
              <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Simple, Scalable " />
            </div>
            <div>
              <label className={labelClass}>Title Accent</label>
              <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="Pricing" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea rows={2} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="One software SKU. No add-ons. No data caps." />
          </div>
          <div className="w-24">
            <label className={labelClass}>Currency</label>
            <input type="text" value={meta.currency || ''} onChange={(e) => update({ currency: e.target.value })} className={inputClass} placeholder="$" />
          </div>
        </div>
      </div>

      {/* Narrative */}
      <div>
        <h3 className={sectionClass}>Narrative — Left Column</h3>
        <div className="space-y-2 mt-3">
          {leftParagraphs.map((p, pi) => (
            <div key={pi} className="flex items-start gap-2">
              <textarea rows={2} value={p} onChange={(e) => setLeftParagraphs(leftParagraphs.map((it, i) => (i === pi ? e.target.value : it)))} className={textareaClass} placeholder="Paragraph text" />
              {leftParagraphs.length > 1 && (
                <button type="button" className={`${removeBtnClass} shrink-0 mt-1`} onClick={() => setLeftParagraphs(leftParagraphs.filter((_, i) => i !== pi))}>Remove</button>
              )}
            </div>
          ))}
          <button type="button" className={addBtnClass} onClick={() => setLeftParagraphs([...leftParagraphs, ''])}>+ Add Paragraph</button>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Narrative — Right Column</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Heading</label>
            <input type="text" value={meta.rightHeading || ''} onChange={(e) => update({ rightHeading: e.target.value })} className={inputClass} placeholder="This model gives you:" />
          </div>
          <div className="space-y-2">
            {rightBullets.map((b, bi) => (
              <div key={bi} className={cardClass}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Bullet {bi + 1}</span>
                  {rightBullets.length > 1 && (
                    <button type="button" className={removeBtnClass} onClick={() => setRightBullets(rightBullets.filter((_, i) => i !== bi))}>Remove</button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className={labelClass}>Bold Lead</label>
                    <input type="text" value={b.bold || ''} onChange={(e) => updateBullet(bi, { bold: e.target.value })} className={inputClass} placeholder="Predictable costs" />
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Text</label>
                    <input type="text" value={b.text || ''} onChange={(e) => updateBullet(bi, { text: e.target.value })} className={inputClass} placeholder="even as data volumes grow" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" className={addBtnClass} onClick={() => setRightBullets([...rightBullets, { bold: '', text: '' }])}>+ Add Bullet</button>
          </div>
        </div>
      </div>

      {/* Footnote */}
      <div>
        <h3 className={sectionClass}>Footnote</h3>
        <div className="space-y-3 mt-3">
          <div className="w-24">
            <label className={labelClass}>Marker</label>
            <input type="text" value={meta.footnoteMarker ?? ''} onChange={(e) => update({ footnoteMarker: e.target.value })} className={inputClass} placeholder="**" />
          </div>
          <div>
            <label className={labelClass}>Text</label>
            <textarea rows={2} value={meta.footnote ?? ''} onChange={(e) => update({ footnote: e.target.value })} className={textareaClass} placeholder="Discounts based on Elastic FY End (April 30) purchase" />
          </div>
        </div>
      </div>

      {/* Column labels */}
      <div>
        <h3 className={sectionClass}>Column Labels</h3>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {Object.entries(DEFAULT_COLUMNS).map(([key, defaultLabel]) => (
            <div key={key}>
              <label className={labelClass}>{defaultLabel}</label>
              <input type="text" value={columns[key] || ''} onChange={(e) => updateColumn(key, e.target.value)} className={inputClass} placeholder={defaultLabel} />
            </div>
          ))}
        </div>
      </div>

      {builderOpen && (
        <PricingRomBuilder meta={meta} onChange={update} onClose={() => setBuilderOpen(false)} />
      )}
    </div>
  )
}
