import { DEFAULT_SECTIONS, DEFAULT_HERO } from '../../scenes/currentArchitecture/defaults'

const LAYOUT_OPTIONS = [
  { id: 'story', label: 'Story' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'layered', label: 'Layered' },
  { id: 'hybrid', label: 'Hybrid' },
]

const SECTION_OPTIONS = [
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'appStack', label: 'App Stack' },
  { id: 'incumbents', label: 'Incumbent Tools' },
  { id: 'program', label: 'Program Metrics' },
]

export default function CurrentArchitectureEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['current-architecture'] || {}
  const update = (patch) => onUpdateSceneMetadata('current-architecture', { ...meta, ...patch })

  const layout = meta.layout || 'dashboard'
  const sections = { ...DEFAULT_SECTIONS, ...(meta.sections || {}) }
  const toggleSection = (key) => update({ sections: { ...sections, [key]: !sections[key] } })

  const hero = { ...DEFAULT_HERO, ...(meta.hero || {}) }
  const updateHero = (patch) => update({ hero: { ...hero, ...patch } })

  const router = meta.router || {}
  const routerEnabled = router.enabled !== undefined ? router.enabled : sections.router
  const routerLabel = router.label || 'Cribl'
  const updateRouter = (patch) => update({ router: { ...router, ...patch } })

  const toggleBtn = (active) => `flex-1 py-2 rounded-lg border text-xs font-semibold transition-colors ${
    active
      ? isDark ? 'border-elastic-teal/60 bg-elastic-teal/10 text-white' : 'border-elastic-blue/50 bg-elastic-blue/10 text-elastic-dark-ink'
      : isDark ? 'border-white/10 text-white/50 hover:text-white/70' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:text-elastic-dev-blue/70'
  }`

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const infra = meta.infrastructure || {}
  const updateInfra = (patch) => update({ infrastructure: { ...infra, ...patch } })

  const DEFAULT_ON_PREM_ITEMS = ['VMware · Virtual Machines', 'Cisco UCS', 'Compute · Network · Storage']
  const DEFAULT_CLOUD_ITEMS = ['Microsoft Azure', 'AWS', 'Google Cloud', 'Oracle Cloud']
  const onPremItems = infra.onPremItems || DEFAULT_ON_PREM_ITEMS
  const cloudItems = infra.cloudItems || DEFAULT_CLOUD_ITEMS

  const DEFAULT_APP_STACK = [
    ['.NET', 'Java', 'SQL', 'PHP'],
    ['Linux / Red Hat', 'OpenShift', 'Kubernetes (on-prem)'],
    ['Databricks — confirmed', 'Snowflake — evaluation'],
  ]
  const appStackRaw = meta.appStack || DEFAULT_APP_STACK
  const appStackRows = Array.isArray(appStackRaw[0]) ? appStackRaw : [appStackRaw]
  const setAppStackRows = (next) => update({ appStack: next })

  const DEFAULT_CURRENT_STACK = [
    { name: 'AppDynamics', role: 'APM' },
    { name: 'ThousandEyes', role: 'Network Monitoring' },
    { name: 'SecureApp', role: 'RASP' },
    { name: 'Splunk', role: 'Log Management & SIEM' },
    { name: 'ServiceNow', role: 'ITSM' },
  ]
  const currentStack = meta.currentStack || DEFAULT_CURRENT_STACK
  const setCurrentStack = (next) => update({ currentStack: next })
  const setCurrentStackItem = (i, patch) => setCurrentStack(currentStack.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const pipeline = meta.pipeline || {}
  const updatePipeline = (patch) => update({ pipeline: { ...pipeline, ...patch } })
  const DEFAULT_SOURCES = ['Infrastructure — servers, network, cloud, containers', 'Applications & Services', 'Security Tools & Platforms']
  const DEFAULT_CRIBL_STAGES = ['Collect', 'Route', 'Transform', 'Enrich']
  const DEFAULT_ELASTIC_COMPONENTS = ['Elasticsearch', 'Kibana', 'Beats / Agents', 'Elastic Security']
  const DEFAULT_CONSUMERS = ['Security Team', 'Ops / NOC', 'IT / Dev Teams']
  const sources = pipeline.sources || DEFAULT_SOURCES
  const criblStages = pipeline.criblStages || DEFAULT_CRIBL_STAGES
  const elasticComponents = pipeline.elasticComponents || DEFAULT_ELASTIC_COMPONENTS
  const consumers = pipeline.consumers || DEFAULT_CONSUMERS

  const DEFAULT_PROGRAM = [
    { value: '00', label: 'Certified Champions', sub: 'Enablement scorecard' },
    { value: '00', label: 'Monitoring Tools', sub: 'Under consolidation review' },
    { value: '$0M', label: 'Cost Avoidance Target', sub: 'Consolidation goal' },
    { value: 'POC', label: 'SIEM POC', sub: 'Running in parallel' },
  ]
  const program = meta.programStatus || DEFAULT_PROGRAM
  const setProgram = (next) => update({ programStatus: next })
  const setProgramItem = (i, patch) => setProgram(program.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const setStringList = (key, list, idx, value) => {
    const next = list.map((it, i) => (i === idx ? value : it))
    if (key === 'onPremItems' || key === 'cloudItems') updateInfra({ [key]: next })
    else updatePipeline({ [key]: next })
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Layout &amp; Sections</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Layout</label>
            <div className="flex gap-2">
              {LAYOUT_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" className={toggleBtn(layout === opt.id)} onClick={() => update({ layout: opt.id })}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Visible Sections</label>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_OPTIONS.map((opt) => (
                <button key={opt.id} type="button" className={toggleBtn(sections[opt.id])} onClick={() => toggleSection(opt.id)}>
                  {sections[opt.id] ? '✓ ' : ''}{opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Elastic Hero Zone</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
            <input type="text" value={hero.title} onChange={(e) => updateHero({ title: e.target.value })} className={inputClass} placeholder={DEFAULT_HERO.title} />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Badge</label>
            <input type="text" value={hero.badge} onChange={(e) => updateHero({ badge: e.target.value })} className={inputClass} placeholder={DEFAULT_HERO.badge} />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Ingest / Router</h3>
          <button type="button" className={toggleBtn(routerEnabled).replace('flex-1 ', '') + ' px-3'} onClick={() => updateRouter({ enabled: !routerEnabled })}>
            {routerEnabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
        {routerEnabled && (
          <div className="mt-3">
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Router Name</label>
            <input type="text" value={routerLabel} onChange={(e) => updateRouter({ label: e.target.value })} className={inputClass} placeholder="Cribl" />
          </div>
        )}
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Where Elastic Already Sits" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1</label>
            <input type="text" value={meta.titlePart1 || ''} onChange={(e) => update({ titlePart1: e.target.value })} className={inputClass} placeholder="Your Environment Today," />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2</label>
            <input type="text" value={meta.titlePart2 || ''} onChange={(e) => update({ titlePart2: e.target.value })} className={inputClass} placeholder=" Elastic Already Inside" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="This is not a greenfield evaluation — it is a question of scope, expansion, and consolidation." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Infrastructure</h3>
        <div className="space-y-3 mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>On-Prem Percentage</label>
              <input type="text" value={infra.onPremPct || ''} onChange={(e) => updateInfra({ onPremPct: e.target.value })} className={inputClass} placeholder="70%" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Cloud Percentage</label>
              <input type="text" value={infra.cloudPct || ''} onChange={(e) => updateInfra({ cloudPct: e.target.value })} className={inputClass} placeholder="30%" />
            </div>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>On-Prem Label</label>
            <input type="text" value={infra.onPremLabel || ''} onChange={(e) => updateInfra({ onPremLabel: e.target.value })} className={inputClass} placeholder="On-Prem (Primary Data Centers)" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Cloud Label</label>
            <input type="text" value={infra.cloudLabel || ''} onChange={(e) => updateInfra({ cloudLabel: e.target.value })} className={inputClass} placeholder="Cloud (Multi-Cloud)" />
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>On-Prem Items</label>
            <div className="space-y-2">
              {onPremItems.map((item, i) => (
                <div key={i} className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                    {onPremItems.length > 1 && (
                      <button type="button" className={removeBtnClass} onClick={() => updateInfra({ onPremItems: onPremItems.filter((_, idx) => idx !== i) })}>Remove</button>
                    )}
                  </div>
                  <input type="text" value={item} onChange={(e) => setStringList('onPremItems', onPremItems, i, e.target.value)} className={inputClass} placeholder={DEFAULT_ON_PREM_ITEMS[i] || 'Infrastructure item'} />
                </div>
              ))}
              <button type="button" className={addBtnClass} onClick={() => updateInfra({ onPremItems: [...onPremItems, ''] })}>+ Add On-Prem Item</button>
            </div>
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Cloud Items</label>
            <div className="space-y-2">
              {cloudItems.map((item, i) => (
                <div key={i} className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                    {cloudItems.length > 1 && (
                      <button type="button" className={removeBtnClass} onClick={() => updateInfra({ cloudItems: cloudItems.filter((_, idx) => idx !== i) })}>Remove</button>
                    )}
                  </div>
                  <input type="text" value={item} onChange={(e) => setStringList('cloudItems', cloudItems, i, e.target.value)} className={inputClass} placeholder={DEFAULT_CLOUD_ITEMS[i] || 'Cloud provider'} />
                </div>
              ))}
              <button type="button" className={addBtnClass} onClick={() => updateInfra({ cloudItems: [...cloudItems, ''] })}>+ Add Cloud Item</button>
            </div>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Network Note</label>
            <input type="text" value={infra.networkNote || ''} onChange={(e) => updateInfra({ networkNote: e.target.value })} className={inputClass} placeholder="Hybrid Network (MPLS / SD-WAN) — Cisco UCS Fabric" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Application Stack</h3>
        <div className="space-y-2 mt-3">
          {appStackRows.map((row, ri) => (
            <div key={ri} className={cardClass}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Row {ri + 1}</span>
              <div className="space-y-2">
                {row.map((tech, ti) => (
                  <div key={ti}>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Item {ti + 1}</label>
                    <input
                      type="text"
                      value={tech}
                      onChange={(e) => {
                        const next = appStackRows.map((r, rIdx) =>
                          rIdx === ri ? r.map((t, tIdx) => (tIdx === ti ? e.target.value : t)) : r
                        )
                        setAppStackRows(next)
                      }}
                      className={inputClass}
                      placeholder={(DEFAULT_APP_STACK[ri] || [])[ti] || 'Technology'}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Current Observability &amp; Security Stack</h3>
        <div className="space-y-2 mt-3">
          {currentStack.map((tool, i) => (
            <div key={i} className={cardClass}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
              <div className="space-y-2">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                  <input type="text" value={tool.name || ''} onChange={(e) => setCurrentStackItem(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_CURRENT_STACK[i]?.name || 'Tool name'} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Role</label>
                  <input type="text" value={tool.role || ''} onChange={(e) => setCurrentStackItem(i, { role: e.target.value })} className={inputClass} placeholder={DEFAULT_CURRENT_STACK[i]?.role || 'Role'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Existing Elastic + Cribl Pipeline</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Production Data Sources</label>
            <div className="space-y-2">
              {sources.map((item, i) => (
                <div key={i} className={cardClass}>
                  <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                  <input type="text" value={item} onChange={(e) => setStringList('sources', sources, i, e.target.value)} className={inputClass} placeholder={DEFAULT_SOURCES[i] || 'Data source'} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Router / Ingest Stages</label>
            <div className="space-y-2">
              {criblStages.map((item, i) => (
                <div key={i} className={cardClass}>
                  <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                  <input type="text" value={item} onChange={(e) => setStringList('criblStages', criblStages, i, e.target.value)} className={inputClass} placeholder={DEFAULT_CRIBL_STAGES[i] || 'Stage'} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Elastic Components</label>
            <div className="space-y-2">
              {elasticComponents.map((item, i) => (
                <div key={i} className={cardClass}>
                  <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                  <input type="text" value={item} onChange={(e) => setStringList('elasticComponents', elasticComponents, i, e.target.value)} className={inputClass} placeholder={DEFAULT_ELASTIC_COMPONENTS[i] || 'Component'} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Consumers</label>
            <div className="space-y-2">
              {consumers.map((item, i) => (
                <div key={i} className={cardClass}>
                  <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                  <input type="text" value={item} onChange={(e) => setStringList('consumers', consumers, i, e.target.value)} className={inputClass} placeholder={DEFAULT_CONSUMERS[i] || 'Consumer'} />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Caption</label>
            <textarea rows={3} value={pipeline.caption || ''} onChange={(e) => updatePipeline({ caption: e.target.value })} className={textareaClass} placeholder="Your team runs licensed Elastic in production today — data routing is already in place." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Program Status &amp; Metrics</h3>
        <div className="space-y-2 mt-3">
          {program.map((stat, i) => (
            <div key={i} className={cardClass}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
              <div className="space-y-2">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Value</label>
                  <input type="text" value={stat.value || ''} onChange={(e) => setProgramItem(i, { value: e.target.value })} className={inputClass} placeholder={DEFAULT_PROGRAM[i]?.value || '00'} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                  <input type="text" value={stat.label || ''} onChange={(e) => setProgramItem(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_PROGRAM[i]?.label || 'Metric label'} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtext</label>
                  <input type="text" value={stat.sub || ''} onChange={(e) => setProgramItem(i, { sub: e.target.value })} className={inputClass} placeholder={DEFAULT_PROGRAM[i]?.sub || 'Description'} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
