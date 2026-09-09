import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

const VALUE_PROP_DEFAULTS = [
  { label: 'Card 1', titlePlaceholder: 'Faster queries, at scale.', descPlaceholder: 'Multi-stage concurrent execution delivers greater speed and efficiency across billions of events. No pre-aggregation required.' },
  { label: 'Card 2', titlePlaceholder: 'One query. One window.', descPlaceholder: 'Search, aggregate, calculate, transform, and visualize from a single pipeline. Refine as you go.' },
  { label: 'Card 3', titlePlaceholder: 'Lookup, join, and transform.', descPlaceholder: 'Perform data transformations in one query with lookup and joins. No convoluted scripts. No redundant requests.' },
  { label: 'Card 4', titlePlaceholder: 'More accurate alerting.', descPlaceholder: 'Review trends over isolated incidents to reduce false positives and surface more actionable notifications.' },
]

export default function EsqlEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass }) {
  const meta = sceneMetadata?.esql || {}
  const update = (patch) => onUpdateSceneMetadata('esql', { ...meta, ...patch })

  const cardLabelClass = `text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`

  const titles = meta.valuePropTitles || []
  const descs = meta.valuePropDescriptions || []

  const setValuePropTitle = (i, value) => {
    const next = [...titles]
    next[i] = value
    update({ valuePropTitles: next })
  }

  const setValuePropDescription = (i, value) => {
    const next = [...descs]
    next[i] = value
    update({ valuePropDescriptions: next })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        ES|QL Scene — Header
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="ES|QL · Elasticsearch Query Language"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Plain</label>
        <input
          type="text"
          value={meta.headingPlain || ''}
          onChange={(e) => update({ headingPlain: e.target.value })}
          className={inputClass}
          placeholder="Transform Your "
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Accent</label>
        <input
          type="text"
          value={meta.headingAccent || ''}
          onChange={(e) => update({ headingAccent: e.target.value })}
          className={inputClass}
          placeholder="Investigation Workflows."
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Subtitle</label>
        <textarea
          rows={2}
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="A next-generation piped query language. Search, aggregate, transform, and visualize from a single query."
        />
      </div>

      <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
        ES|QL Scene — Value Propositions
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {VALUE_PROP_DEFAULTS.map(({ label, titlePlaceholder, descPlaceholder }, i) => (
          <div key={i} className="space-y-3">
            <p className={cardLabelClass}>{label}</p>
            <div>
              <label className={fieldLabelClass(isDark)}>Title</label>
              <input
                type="text"
                value={titles[i] || ''}
                onChange={(e) => setValuePropTitle(i, e.target.value)}
                className={inputClass}
                placeholder={titlePlaceholder}
              />
            </div>
            <div>
              <label className={fieldLabelClass(isDark)}>Description</label>
              <textarea
                rows={2}
                value={descs[i] || ''}
                onChange={(e) => setValuePropDescription(i, e.target.value)}
                className={inputClass}
                placeholder={descPlaceholder}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
