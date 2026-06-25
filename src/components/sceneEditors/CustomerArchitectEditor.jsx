import IconSelect from './IconSelect'

const PILLAR_ICON_DEFAULTS = ['bullseye', 'graduation-cap', 'handshake']
const SUPPORT_ICON_DEFAULTS = ['users', 'chart-line', 'headset', 'rocket']

export default function CustomerArchitectEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['customer-architect'] || {}
  const update = (patch) => onUpdateSceneMetadata('customer-architect', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const DEFAULT_PILLARS = [
    {
      title: 'Strategic Guidance',
      items: ['Architecture & scaling reviews', 'Roadmap alignment', 'Best-practice design'],
    },
    {
      title: 'Proactive Enablement',
      items: ['Champion certification', 'Hands-on workshops', 'Self-service playbooks'],
    },
    {
      title: 'Ongoing Partnership',
      items: ['Quarterly business reviews', 'Success planning', 'Priority escalation'],
    },
  ]
  const pillars = (meta.caPillars || DEFAULT_PILLARS).map((p, i) => ({ ...DEFAULT_PILLARS[i], ...p }))
  const setPillars = (next) => update({ caPillars: next })
  const setPillar = (i, patch) => setPillars(pillars.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_JOURNEY = ['Discover', 'Plan', 'Migrate', 'Optimize', 'Expand']
  const journey = meta.caJourneyPhases || DEFAULT_JOURNEY
  const setJourney = (next) => update({ caJourneyPhases: next })

  const DEFAULT_SUPPORT = [
    { label: 'Account Team' },
    { label: 'Executive Alignment' },
    { label: '24/7 Support & SLAs' },
    { label: 'Professional Services' },
  ]
  const support = (meta.supportLayers || DEFAULT_SUPPORT).map((item, i) => ({ ...DEFAULT_SUPPORT[i], ...item }))
  const setSupport = (next) => update({ supportLayers: next })
  const setSupportItem = (i, patch) => setSupport(support.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Your Customer Architect" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading Plain</label>
            <input type="text" value={meta.headingPlain || ''} onChange={(e) => update({ headingPlain: e.target.value })} className={inputClass} placeholder="We Walk This Journey " />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading Accent</label>
            <input type="text" value={meta.headingAccent || ''} onChange={(e) => update({ headingAccent: e.target.value })} className={inputClass} placeholder="With You." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="A single, named technical partner dedicated to your organization — accountable for your success from POC through enterprise-wide expansion, with the full Elastic team behind them." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Customer Architect Hero</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Tagline</label>
            <input type="text" value={meta.caTagline || ''} onChange={(e) => update({ caTagline: e.target.value })} className={inputClass} placeholder="Your dedicated partner" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
            <input type="text" value={meta.caTitle || ''} onChange={(e) => update({ caTitle: e.target.value })} className={inputClass} placeholder="Customer Architect" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.caSubtitle || ''} onChange={(e) => update({ caSubtitle: e.target.value })} className={textareaClass} placeholder="Knows your environment, aligns your roadmap, and stays with you long after go-live." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Journey Label</label>
            <input type="text" value={meta.caJourney || ''} onChange={(e) => update({ caJourney: e.target.value })} className={inputClass} placeholder="POC → Enterprise-wide" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Pillars</h3>
        <div className="space-y-2 mt-3">
          {pillars.map((pillar, i) => {
            const items = pillar.items || DEFAULT_PILLARS[i]?.items || []
            return (
              <div key={i} className={cardClass}>
                <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Pillar {i + 1}</span>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof pillar.icon === 'string' ? pillar.icon : PILLAR_ICON_DEFAULTS[i]}
                    onChange={(name) => setPillar(i, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
                    <input type="text" value={pillar.title || ''} onChange={(e) => setPillar(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_PILLARS[i]?.title || 'Pillar title'} />
                  </div>
                  <div>
                    <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Bullet Points</label>
                    <div className="space-y-2">
                      {items.map((item, bi) => (
                        <div key={bi} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={item}
                            onChange={(e) => {
                              const nextItems = items.map((it, idx) => (idx === bi ? e.target.value : it))
                              setPillar(i, { items: nextItems })
                            }}
                            className={inputClass}
                            placeholder={(DEFAULT_PILLARS[i]?.items || [])[bi] || 'Bullet point'}
                          />
                          {items.length > 1 && (
                            <button
                              type="button"
                              className={removeBtnClass}
                              onClick={() => setPillar(i, { items: items.filter((_, idx) => idx !== bi) })}
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" className={addBtnClass} onClick={() => setPillar(i, { items: [...items, ''] })}>+ Add Bullet</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Journey Phases</h3>
        <div className="space-y-2 mt-3">
          {journey.map((phase, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Phase {i + 1}</span>
                {journey.length > 1 && (
                  <button type="button" className={removeBtnClass} onClick={() => setJourney(journey.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </div>
              <input type="text" value={phase} onChange={(e) => setJourney(journey.map((it, idx) => (idx === i ? e.target.value : it)))} className={inputClass} placeholder={DEFAULT_JOURNEY[i] || 'Phase name'} />
            </div>
          ))}
          <button type="button" className={addBtnClass} onClick={() => setJourney([...journey, ''])}>+ Add Phase</button>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Support Team</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Champions Label</label>
            <input type="text" value={meta.caChampions || ''} onChange={(e) => update({ caChampions: e.target.value })} className={inputClass} placeholder="Backed by your 35+ certified champions" />
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Support Layers</label>
            <div className="space-y-2">
              {support.map((layer, i) => (
                <div key={i} className={cardClass}>
                  <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Layer {i + 1}</span>
                  <div className="space-y-2">
                    <IconSelect
                      value={typeof layer.icon === 'string' ? layer.icon : SUPPORT_ICON_DEFAULTS[i]}
                      onChange={(name) => setSupportItem(i, { icon: name })}
                      inputClass={inputClass}
                      isDark={isDark}
                    />
                    <input type="text" value={layer.label || ''} onChange={(e) => setSupportItem(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_SUPPORT[i]?.label || 'Support layer'} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
