import IconSelect from './IconSelect'

const USE_CASE_ICON_DEFAULTS = ['right-left', 'robot', 'shield-halved', 'envelope-open-text', 'terminal', 'magnifying-glass-chart', 'table-columns', 'clipboard-check']

export default function SecurityUseCasesEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['security-use-cases'] || {}
  const update = (patch) => onUpdateSceneMetadata('security-use-cases', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const PLACEHOLDER_POINTS = ['Bullet point placeholder one', 'Bullet point placeholder two', 'Bullet point placeholder three']
  const DEFAULT_USE_CASES = [
    { title: 'Card Title One', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Two', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Three', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Four', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Five', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Six', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Seven', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
    { title: 'Card Title Eight', tag: 'Category · Source', image: '', points: PLACEHOLDER_POINTS },
  ]

  const useCases = (meta.useCases || DEFAULT_USE_CASES).map((uc, i) => ({
    ...DEFAULT_USE_CASES[i],
    ...uc,
    points: uc.points || DEFAULT_USE_CASES[i]?.points || [],
  }))
  const setUseCases = (next) => update({ useCases: next })
  const setUseCase = (i, patch) => setUseCases(useCases.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const setUseCasePoint = (ucIdx, pointIdx, value) => {
    const points = [...(useCases[ucIdx].points || [])]
    points[pointIdx] = value
    setUseCase(ucIdx, { points })
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Eyebrow text" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="Section Title" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder=" Accent" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Subtitle placeholder — a short supporting sentence describing the cards shown below." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Use Cases</h3>
        <div className="space-y-2 mt-3">
          {useCases.map((uc, i) => {
            const points = uc.points || DEFAULT_USE_CASES[i]?.points || []
            return (
              <div key={i} className={cardClass}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Use Case {i + 1}</span>
                  {useCases.length > 1 && (
                    <button type="button" className={removeBtnClass} onClick={() => setUseCases(useCases.filter((_, idx) => idx !== i))}>Remove</button>
                  )}
                </div>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof uc.icon === 'string' ? uc.icon : USE_CASE_ICON_DEFAULTS[i]}
                    onChange={(name) => setUseCase(i, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
                    <input type="text" value={uc.title || ''} onChange={(e) => setUseCase(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_USE_CASES[i]?.title || 'Use case title'} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Tag</label>
                    <input type="text" value={uc.tag || ''} onChange={(e) => setUseCase(i, { tag: e.target.value })} className={inputClass} placeholder={DEFAULT_USE_CASES[i]?.tag || 'Category tag'} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Image URL</label>
                    <input type="text" value={uc.image || ''} onChange={(e) => setUseCase(i, { image: e.target.value })} className={inputClass} placeholder="/screenshots/usecases/example.png" />
                  </div>
                  <div>
                    <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Points</label>
                    <div className="space-y-2">
                      {points.map((pt, j) => (
                        <div key={j} className="flex gap-2 items-start">
                          <textarea
                            rows={2}
                            value={pt}
                            onChange={(e) => setUseCasePoint(i, j, e.target.value)}
                            className={textareaClass}
                            placeholder={DEFAULT_USE_CASES[i]?.points?.[j] || 'Detail bullet'}
                          />
                          {points.length > 1 && (
                            <button type="button" className={`${removeBtnClass} shrink-0 mt-1`} onClick={() => setUseCase(i, { points: points.filter((_, idx) => idx !== j) })}>Remove</button>
                          )}
                        </div>
                      ))}
                      <button type="button" className={addBtnClass} onClick={() => setUseCase(i, { points: [...points, ''] })}>+ Add Point</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <button type="button" className={addBtnClass} onClick={() => setUseCases([...useCases, { title: '', tag: '', icon: 'shield-halved', image: '', points: [''] }])}>+ Add Use Case</button>
        </div>
      </div>
    </div>
  )
}
