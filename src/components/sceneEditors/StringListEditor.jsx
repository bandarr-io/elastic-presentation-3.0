import { fieldLabelClass } from './BeatsEditorBlock'

export default function StringListEditor({
  label,
  values,
  onChange,
  inputClass,
  isDark,
  placeholder = 'Item',
  addLabel = 'Add item',
}) {
  const setItem = (i, value) => onChange(values.map((x, idx) => (idx === i ? value : x)))
  const removeItem = (i) => onChange(values.filter((_, idx) => idx !== i))

  return (
    <div>
      {label ? <label className={fieldLabelClass(isDark)}>{label}</label> : null}
      <div className="space-y-2">
        {values.map((value, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => setItem(i, e.target.value)}
              className={inputClass}
              placeholder={`${placeholder} ${i + 1}`}
            />
            <button
              type="button"
              onClick={() => removeItem(i)}
              className={`shrink-0 px-2 rounded-md text-sm ${isDark ? 'text-white/40 hover:text-white/80' : 'text-elastic-dev-blue/40 hover:text-elastic-dev-blue/80'}`}
              aria-label={`Remove ${label || 'item'} ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ''])}
          className={`text-xs ${isDark ? 'text-white/50 hover:text-white/80' : 'text-elastic-dev-blue/50 hover:text-elastic-dev-blue/80'}`}
        >
          + {addLabel}
        </button>
      </div>
    </div>
  )
}

export function mergeBeats(defaults, overrides) {
  if (!overrides?.length) return defaults.map((d) => ({ ...d }))
  const byKey = new Map()
  for (const beat of overrides) {
    if (beat?.key) byKey.set(beat.key, beat)
  }
  return defaults.map((def, i) => {
    const matched = def.key ? byKey.get(def.key) : undefined
    if (matched) return { ...def, ...matched }
    const indexed = overrides[i]
    if (indexed && !indexed.key) return { ...def, ...indexed }
    return { ...def }
  })
}
