import IconSelect from './IconSelect'

const MAX_CATEGORIES = 5
const MAX_PROBLEMS = 8

const DEFAULT_CATEGORIES = [
  {
    label: 'Observability',
    icon: 'chart-line',
    problems: [
      'Disconnected logs, metrics, traces',
      'MTTR stays high despite lots of data',
      'Tool sprawl and cost pressure',
      'Weak correlation to customer impact',
    ],
  },
  {
    label: 'Security',
    icon: 'shield',
    problems: [
      'Alert fatigue and signal-to-noise ratio',
      'Blind spots across cloud and on-prem',
      'Tool sprawl and cost pressure',
      'Manual investigation slows response',
    ],
  },
  {
    label: 'Search',
    icon: 'magnifying-glass',
    problems: [
      'Slow or irrelevant search results',
      'Limited semantic or vector search',
      'Tool sprawl and cost pressure',
      'Difficulty scaling search infrastructure',
    ],
  },
]

export default function ProblemPatternsEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['problem-patterns'] || {}
  const update = (patch) => onUpdateSceneMetadata('problem-patterns', { ...meta, ...patch })

  const categories =
    Array.isArray(meta.categories) && meta.categories.length ? meta.categories : DEFAULT_CATEGORIES
  const setCategories = (next) => update({ categories: next })
  const setCategory = (i, patch) => setCategories(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)))
  const setProblem = (ci, pi, value) =>
    setCategory(ci, { problems: (categories[ci].problems || []).map((p, idx) => (idx === pi ? value : p)) })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const subCardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`
  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Problem Orientation" />
          </div>
          <div>
            <label className={labelClass}>Title (plain)</label>
            <input type="text" value={meta.title || ''} onChange={(e) => update({ title: e.target.value })} className={inputClass} placeholder="Common" />
          </div>
          <div>
            <label className={labelClass}>Title (accent)</label>
            <input type="text" value={meta.titleHighlight || ''} onChange={(e) => update({ titleHighlight: e.target.value })} className={inputClass} placeholder="Problem Patterns" />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea rows={2} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Orient around the problems teams typically solve…" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Categories</h3>
        <div className="space-y-2 mt-3">
          {categories.map((cat, ci) => {
            const problems = cat.problems || []
            return (
              <div key={ci} className={cardClass}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Category {ci + 1}</span>
                  {categories.length > 1 && (
                    <button type="button" className={removeBtnClass} onClick={() => setCategories(categories.filter((_, idx) => idx !== ci))}>Remove</button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Tab label</label>
                    <input type="text" value={cat.label || ''} onChange={(e) => setCategory(ci, { label: e.target.value })} className={inputClass} placeholder="Observability" />
                  </div>
                  <IconSelect
                    label="Tab icon"
                    value={typeof cat.icon === 'string' ? cat.icon : 'chart-line'}
                    onChange={(name) => setCategory(ci, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />

                  <label className={labelClass}>Problems</label>
                  <div className="space-y-2">
                    {problems.map((problem, pi) => (
                      <div key={pi} className={subCardClass}>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono shrink-0 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{String(pi + 1).padStart(2, '0')}</span>
                          <input
                            type="text"
                            value={problem || ''}
                            onChange={(e) => setProblem(ci, pi, e.target.value)}
                            className={`${inputClass} flex-1`}
                            placeholder="Describe a problem this audience faces"
                          />
                          {problems.length > 1 && (
                            <button type="button" className={removeBtnClass} onClick={() => setCategory(ci, { problems: problems.filter((_, idx) => idx !== pi) })}>✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {problems.length < MAX_PROBLEMS && (
                      <button type="button" className={addBtnClass} onClick={() => setCategory(ci, { problems: [...problems, ''] })}>+ Add Problem</button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {categories.length < MAX_CATEGORIES && (
            <button
              type="button"
              className={addBtnClass}
              onClick={() => setCategories([...categories, { label: 'New Category', icon: 'chart-line', problems: [''] }])}
            >
              + Add Category
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
