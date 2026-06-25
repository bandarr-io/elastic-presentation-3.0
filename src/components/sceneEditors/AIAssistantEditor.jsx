import IconSelect from './IconSelect'

export default function AIAssistantEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['ai-assistant'] || {}
  const update = (patch) => onUpdateSceneMetadata('ai-assistant', { ...meta, ...patch })

  const STAGE_ICON_DEFAULTS = ['wand-magic-sparkles', 'diagram-project', 'robot']

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`

  const parts = meta.titleParts || ['Reactive today.', 'Agentic now.', 'Autonomous next.']
  const setParts = (next) => update({ titleParts: next })

  const DEFAULT_STAGES = [
    {
      key: 'reactive',
      name: 'Reactive & Assistive',
      desc: 'Ask in plain language; get answers, context, and the next step.',
      items: ['Natural language → ES|QL', 'Alert & error explanation', 'Guided runbooks', 'ML anomaly detection'],
    },
    {
      key: 'agentic',
      name: 'Agentic',
      desc: 'Correlates signals and surfaces a recommended action — no manual queries.',
      items: ['Attack Discovery correlation', 'Cross-signal root cause', 'Recommended action surfaced', 'Workflow automation'],
    },
    {
      key: 'autonomous',
      name: 'Autonomous & Closed-Loop',
      desc: 'Investigate, decide, and remediate end-to-end with human oversight.',
      items: ['Multi-step autonomous investigation', 'Policy-guarded remediation', 'Closed-loop automation'],
    },
  ]

  const stages = meta.stages || DEFAULT_STAGES
  const setStages = (next) => update({ stages: next })
  const setStage = (i, patch) => setStages(stages.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const setStageItem = (stageIdx, itemIdx, value) => {
    const items = stages[stageIdx]?.items || DEFAULT_STAGES[stageIdx]?.items || []
    setStage(stageIdx, { items: items.map((x, idx) => (idx === itemIdx ? value : x)) })
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="From Answers to Action" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1</label>
            <input type="text" value={parts[0] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 0 ? e.target.value : x)))} className={inputClass} placeholder="Reactive today." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2</label>
            <input type="text" value={parts[1] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 1 ? e.target.value : x)))} className={inputClass} placeholder="Agentic now." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 3</label>
            <input type="text" value={parts[2] || ''} onChange={(e) => setParts(parts.map((x, idx) => (idx === 2 ? e.target.value : x)))} className={inputClass} placeholder="Autonomous next." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="More than a chat box — Elastic AI is in production today." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Today Label</label>
            <input type="text" value={meta.todayLabel || ''} onChange={(e) => update({ todayLabel: e.target.value })} className={inputClass} placeholder="In production today" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Roadmap Label</label>
            <input type="text" value={meta.roadmapLabel || ''} onChange={(e) => update({ roadmapLabel: e.target.value })} className={inputClass} placeholder="Committed roadmap" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Capability Stages</h3>
        <div className="space-y-3 mt-3">
          {stages.map((stage, i) => {
            const defaultStage = DEFAULT_STAGES[i] || {}
            const items = stage.items || defaultStage.items || []
            return (
              <div key={stage.key || i} className={cardClass}>
                <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                  {defaultStage.name || `Stage ${i + 1}`}
                </span>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof stage.icon === 'string' ? stage.icon : STAGE_ICON_DEFAULTS[i]}
                    onChange={(name) => setStage(i, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                    <input type="text" value={stage.name || ''} onChange={(e) => setStage(i, { name: e.target.value })} className={inputClass} placeholder={defaultStage.name || ''} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                    <textarea rows={3} value={stage.desc || ''} onChange={(e) => setStage(i, { desc: e.target.value })} className={textareaClass} placeholder={defaultStage.desc || ''} />
                  </div>
                  <div>
                    <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Bullet Items</label>
                    <div className="space-y-2">
                      {items.map((item, j) => (
                        <input
                          key={j}
                          type="text"
                          value={item}
                          onChange={(e) => setStageItem(i, j, e.target.value)}
                          className={inputClass}
                          placeholder={(defaultStage.items || [])[j] || 'Bullet item'}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
