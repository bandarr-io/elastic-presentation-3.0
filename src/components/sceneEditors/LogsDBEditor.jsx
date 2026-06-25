import IconSelect from './IconSelect'

const OUTCOME_ICON_DEFAULTS = ['magnifying-glass-chart', 'clipboard-check', 'brain']

export default function LogsDBEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.logsdb || {}
  const update = (patch) => onUpdateSceneMetadata('logsdb', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`

  const parts = meta.titleParts || ['More Data.', 'Lower Cost.', 'Better Visibility.']
  const setParts = (next) => update({ titleParts: next })

  const DEFAULT_OUTCOMES = [
    { title: 'Better Investigations', desc: 'Find answers faster with more data.' },
    { title: 'Better Compliance', desc: 'Meet requirements with longer retention.' },
    { title: 'Better AI Outcomes', desc: 'More data. More context. Smarter insights.' },
  ]

  const outcomes = meta.outcomes || DEFAULT_OUTCOMES
  const setOutcomes = (next) => update({ outcomes: next })
  const setOutcome = (i, patch) => setOutcomes(outcomes.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_MODES = {
    standard: {
      label: 'Standard Logging',
      storageNote: 'Raw _source · full replicas',
      retentionLabel: 'Months',
      retentionNote: 'Limited by storage cost',
      tooling: '51 tools',
      toolingNote: 'Siloed logging, APM & monitoring across the state',
      footer: 'Costly to scale · short retention · siloed tools',
    },
    logsdb: {
      label: 'Elastic LogsDB',
      storageNote: 'Synthetic _source + index sorting + compression',
      storageBadge: '50–75% smaller',
      retentionLabel: 'Years',
      retentionNote: 'Compliance + AI-ready history',
      tooling: '1 platform',
      toolingNote: 'Logs · APM · Metrics · Security — up to $2–3M avoided',
      footer: 'Observability at scale. Built for today. Ready for tomorrow.',
    },
  }

  const modes = {
    standard: { ...DEFAULT_MODES.standard, ...(meta.modes?.standard || {}) },
    logsdb: { ...DEFAULT_MODES.logsdb, ...(meta.modes?.logsdb || {}) },
  }

  const updateMode = (key, patch) =>
    update({ modes: { ...(meta.modes || {}), [key]: { ...(meta.modes?.[key] || {}), ...patch } } })

  const modeFields = (key, m, defaults, extraFields = []) => {
    const fields = [
      { key: 'label', label: 'Toggle Label' },
      { key: 'storageNote', label: 'Storage Note' },
      { key: 'retentionLabel', label: 'Retention Label' },
      { key: 'retentionNote', label: 'Retention Note' },
      { key: 'tooling', label: 'Tooling Headline' },
      { key: 'toolingNote', label: 'Tooling Note' },
      { key: 'footer', label: 'Footer' },
      ...extraFields,
    ]
    return fields.map(({ key: fieldKey, label }) => (
      <div key={fieldKey}>
        <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{label}</label>
        <input
          type="text"
          value={m[fieldKey] || ''}
          onChange={(e) => updateMode(key, { [fieldKey]: e.target.value })}
          className={inputClass}
          placeholder={defaults[fieldKey] || ''}
        />
      </div>
    ))
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Store More. Spend Less." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1</label>
            <input type="text" value={parts[0] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 0 ? e.target.value : x)))} className={inputClass} placeholder="More Data." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2</label>
            <input type="text" value={parts[1] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 1 ? e.target.value : x)))} className={inputClass} placeholder="Lower Cost." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 3</label>
            <input type="text" value={parts[2] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 2 ? e.target.value : x)))} className={inputClass} placeholder="Better Visibility." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Elastic LogsDB keeps the data your teams depend on — for a fraction of the cost, retained for years — on the platform you already run." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Standard Logging Mode</h3>
        <div className={`space-y-2 mt-3 ${cardClass}`}>
          {modeFields('standard', modes.standard, DEFAULT_MODES.standard)}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Elastic LogsDB Mode</h3>
        <div className={`space-y-2 mt-3 ${cardClass}`}>
          {modeFields('logsdb', modes.logsdb, DEFAULT_MODES.logsdb, [{ key: 'storageBadge', label: 'Storage Badge' }])}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Outcomes</h3>
        <div className="space-y-3 mt-3">
          {outcomes.map((outcome, i) => (
            <div key={i} className={cardClass}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                {DEFAULT_OUTCOMES[i]?.title || `Outcome ${i + 1}`}
              </span>
              <div className="space-y-2">
                <IconSelect
                  value={typeof outcome.icon === 'string' ? outcome.icon : OUTCOME_ICON_DEFAULTS[i]}
                  onChange={(name) => setOutcome(i, { icon: name })}
                  inputClass={inputClass}
                  isDark={isDark}
                />
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
                  <input type="text" value={outcome.title || ''} onChange={(e) => setOutcome(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_OUTCOMES[i]?.title || ''} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                  <textarea rows={3} value={outcome.desc || ''} onChange={(e) => setOutcome(i, { desc: e.target.value })} className={textareaClass} placeholder={DEFAULT_OUTCOMES[i]?.desc || ''} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
