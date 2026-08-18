export function fieldLabelClass(isDark) {
  return `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
}

export function sectionTitleClass(isDark) {
  return `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`
}

export function editorCardClass(isDark) {
  return `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
}

export function EyebrowField({ value, onChange, placeholder, inputClass, isDark }) {
  return (
    <div>
      <h3 className={sectionTitleClass(isDark)}>Header</h3>
      <div className="mt-3">
        <label className={fieldLabelClass(isDark)}>Eyebrow</label>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          placeholder={placeholder}
        />
      </div>
    </div>
  )
}

export default function BeatsEditorBlock({
  beats,
  defaults = [],
  onChange,
  isDark,
  inputClass,
  textareaClass,
  heading = 'Beats',
}) {
  const setBeat = (i, patch) => onChange(beats.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))

  return (
    <div>
      <h3 className={sectionTitleClass(isDark)}>{heading}</h3>
      <div className="space-y-3 mt-3">
        {beats.map((beat, i) => {
          const def = defaults[i] || {}
          return (
            <div key={beat.key || i} className={editorCardClass(isDark)}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                {def.step || beat.step || `Beat ${i + 1}`}
              </span>
              <div className="space-y-2">
                <div>
                  <label className={fieldLabelClass(isDark)}>Stepper label</label>
                  <input
                    type="text"
                    value={beat.step || ''}
                    onChange={(e) => setBeat(i, { step: e.target.value })}
                    className={inputClass}
                    placeholder={def.step || ''}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Title (plain)</label>
                  <input
                    type="text"
                    value={beat.titlePlain || ''}
                    onChange={(e) => setBeat(i, { titlePlain: e.target.value })}
                    className={inputClass}
                    placeholder={def.titlePlain || ''}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Title (accent)</label>
                  <input
                    type="text"
                    value={beat.titleAccent || ''}
                    onChange={(e) => setBeat(i, { titleAccent: e.target.value })}
                    className={inputClass}
                    placeholder={def.titleAccent || ''}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Subtitle</label>
                  <textarea
                    rows={3}
                    value={beat.subtitle || ''}
                    onChange={(e) => setBeat(i, { subtitle: e.target.value })}
                    className={textareaClass}
                    placeholder={def.subtitle || ''}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
