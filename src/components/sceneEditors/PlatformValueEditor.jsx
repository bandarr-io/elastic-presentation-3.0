import IconSelect from './IconSelect'

const VALUE_ICON_DEFAULTS = ['layer-group', 'brain', 'cloud', 'bolt']

export default function PlatformValueEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['platform-value'] || {}
  const update = (patch) => onUpdateSceneMetadata('platform-value', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`
  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`

  const DEFAULT_TITLES = ['One Unified Platform', 'AI-Native', 'Deploy Anywhere', 'Real-Time at Scale']

  const values = meta.values || DEFAULT_TITLES.map(() => ({}))
  const setValues = (next) => update({ values: next })
  const setValue = (i, patch) => setValues(values.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="The Elastic Platform" />
          </div>
          <div>
            <label className={labelClass}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="One Platform for " />
          </div>
          <div>
            <label className={labelClass}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="Everything" />
          </div>
          <div>
            <label className={labelClass}>Subtitle</label>
            <textarea rows={2} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Search, Observability, and Security..." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Value Cards</h3>
        <div className="space-y-2 mt-3">
          {values.map((value, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Card {i + 1}</span>
                {values.length > 1 && (
                  <button type="button" className={removeBtnClass} onClick={() => setValues(values.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </div>
              <div className="space-y-2">
                <IconSelect
                  value={typeof value.icon === 'string' ? value.icon : VALUE_ICON_DEFAULTS[i] || 'star'}
                  onChange={(name) => setValue(i, { icon: name })}
                  inputClass={inputClass}
                  isDark={isDark}
                />
                <div>
                  <label className={labelClass}>Title</label>
                  <input type="text" value={value.title || ''} onChange={(e) => setValue(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_TITLES[i] || 'Value title'} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={2} value={value.desc || ''} onChange={(e) => setValue(i, { desc: e.target.value })} className={textareaClass} placeholder="Short supporting sentence." />
                </div>
              </div>
            </div>
          ))}
          {values.length < 6 && (
            <button type="button" className={addBtnClass} onClick={() => setValues([...values, { icon: 'star', title: '', desc: '' }])}>+ Add Value Card</button>
          )}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Closing Statement</h3>
        <div className="mt-3">
          <textarea rows={3} value={meta.closing ?? ''} onChange={(e) => update({ closing: e.target.value })} className={textareaClass} placeholder="One platform to search, observe, and protect everything..." />
        </div>
      </div>
    </div>
  )
}
