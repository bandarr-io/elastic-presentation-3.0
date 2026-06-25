import { useState } from 'react'
import IconSelect from './IconSelect'

const MODEL_NAV_ICON_DEFAULTS = ['server', 'cloud', 'bolt']

export default function PlatformOperationsEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['platform-operations'] || {}
  const update = (patch) => onUpdateSceneMetadata('platform-operations', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const innerCardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/60'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`
  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`

  // Mirror of the scene's default labels, used as placeholders only.
  const DEFAULT_MODELS = [
    { label: 'Self-Managed', titles: ['Full Control & Data Sovereignty', 'Predictable Cost & No Lock-In', 'Performance & Customization'] },
    { label: 'Cloud Hosted', titles: ['Elastic-Managed in Your Cloud', 'Cost-Efficient at Scale', 'Flexibility & Reach'] },
    { label: 'Serverless', titles: ['Fully Managed, Zero Ops', 'Usage-Based Pricing', 'Fastest Time-to-Value'] },
  ]

  const models = meta.models || DEFAULT_MODELS.map(() => ({}))
  const setModels = (next) => update({ models: next })
  const updateModel = (mi, patch) => setModels(models.map((m, i) => (i === mi ? { ...m, ...patch } : m)))

  const getPillars = (mi) => models[mi]?.pillars || [{}, {}, {}]
  const updatePillar = (mi, pi, patch) => {
    const pillars = getPillars(mi).map((p, i) => (i === pi ? { ...p, ...patch } : p))
    updateModel(mi, { pillars })
  }

  const [activeModel, setActiveModelRaw] = useState(0)
  const mi = Math.min(activeModel, Math.max(models.length - 1, 0))
  const pillars = getPillars(mi)
  const defModel = DEFAULT_MODELS[mi] || {}

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Deployment Models" />
          </div>
          <div>
            <label className={labelClass}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Run Elastic" />
          </div>
          <div>
            <label className={labelClass}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder=" Your Way" />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea rows={2} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="One platform, deployed your way..." />
          </div>
          <div>
            <label className={labelClass}>Footer Label</label>
            <input type="text" value={meta.footerLabel || ''} onChange={(e) => update({ footerLabel: e.target.value })} className={inputClass} placeholder="Value Delivered" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Models</h3>
        {/* Model selector tabs */}
        <div className="flex gap-2 mt-3">
          {models.map((m, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveModelRaw(i)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                i === mi
                  ? isDark ? 'border-elastic-teal/50 bg-elastic-teal/10 text-elastic-teal' : 'border-elastic-blue/40 bg-elastic-blue/10 text-elastic-blue'
                  : isDark ? 'border-white/10 text-white/50 hover:text-white/70' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:text-elastic-dev-blue/70'
              }`}
            >
              {m.label || DEFAULT_MODELS[i]?.label || `Model ${i + 1}`}
            </button>
          ))}
        </div>

        {/* Active model fields */}
        <div className={`${cardClass} mt-3 space-y-3`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Model Name</label>
              <input type="text" value={models[mi]?.label || ''} onChange={(e) => updateModel(mi, { label: e.target.value })} className={inputClass} placeholder={defModel.label || 'Model name'} />
            </div>
            <div>
              <label className={labelClass}>Nav Icon</label>
              <IconSelect
                value={typeof models[mi]?.navIcon === 'string' ? models[mi].navIcon : MODEL_NAV_ICON_DEFAULTS[mi] || 'server'}
                onChange={(name) => updateModel(mi, { navIcon: name })}
                inputClass={inputClass}
                isDark={isDark}
              />
            </div>
          </div>

          {pillars.map((pillar, pi) => {
            const isHero = pi === 0
            const points = pillar.points || ['']
            return (
              <div key={pi} className={innerCardClass}>
                <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                  {isHero ? 'Hero Box' : `Box ${pi + 1}`}
                </span>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof pillar.icon === 'string' ? pillar.icon : (isHero ? 'lock' : 'gear')}
                    onChange={(name) => updatePillar(mi, pi, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" value={pillar.title || ''} onChange={(e) => updatePillar(mi, pi, { title: e.target.value })} className={inputClass} placeholder={defModel.titles?.[pi] || 'Box title'} />
                  </div>
                  {isHero && (
                    <div>
                      <label className={labelClass}>Lead Sentence</label>
                      <textarea rows={2} value={pillar.lead ?? ''} onChange={(e) => updatePillar(mi, pi, { lead: e.target.value })} className={textareaClass} placeholder="One-line framing statement..." />
                    </div>
                  )}
                  <div>
                    <label className={labelClass}>Points</label>
                    <div className="space-y-2">
                      {points.map((point, pti) => (
                        <div key={pti} className="flex items-start gap-2">
                          <textarea
                            rows={2}
                            value={point}
                            onChange={(e) => updatePillar(mi, pi, { points: points.map((it, idx) => (idx === pti ? e.target.value : it)) })}
                            className={textareaClass}
                            placeholder="Benefit point"
                          />
                          {points.length > 1 && (
                            <button type="button" className={`${removeBtnClass} shrink-0 mt-1`} onClick={() => updatePillar(mi, pi, { points: points.filter((_, idx) => idx !== pti) })}>Remove</button>
                          )}
                        </div>
                      ))}
                      {points.length < 6 && (
                        <button type="button" className={addBtnClass} onClick={() => updatePillar(mi, pi, { points: [...points, ''] })}>+ Add Point</button>
                      )}
                    </div>
                  </div>
                  {isHero && (
                    <div>
                      <label className={labelClass}>Highlight Chip</label>
                      <input type="text" value={pillar.highlight ?? ''} onChange={(e) => updatePillar(mi, pi, { highlight: e.target.value })} className={inputClass} placeholder="100% on your infrastructure" />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

          <div>
            <label className={labelClass}>Footer Text</label>
            <textarea rows={2} value={models[mi]?.footer ?? ''} onChange={(e) => updateModel(mi, { footer: e.target.value })} className={textareaClass} placeholder="Value delivered summary for this model..." />
          </div>
        </div>
      </div>
    </div>
  )
}
