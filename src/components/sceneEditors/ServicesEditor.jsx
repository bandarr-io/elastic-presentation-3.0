import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

const HIDDEN_COST_DEFAULTS = [
  { placeholder: 'Opportunity cost of delayed insights',      sev: 'HIGH'   },
  { placeholder: 'Engineer time diverted from impactful work', sev: 'HIGH'  },
  { placeholder: 'Production incidents during migration',      sev: 'MEDIUM' },
  { placeholder: 'Vendor support for edge cases',             sev: 'MEDIUM' },
  { placeholder: 'Re-work from initial mistakes',             sev: 'HIGH'   },
]

const DATA_SOURCE_DEFAULTS = ['AWS', 'Linux Systems', 'Windows Systems', 'Palo Alto', 'CrowdStrike']

export default function ServicesEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.services || {}
  const update = (patch) => onUpdateSceneMetadata('services', { ...meta, ...patch })

  const costs = meta.hiddenCosts || []
  const sources = meta.dataSources || []

  const setHiddenCost = (i, patch) => {
    const next = [...costs]
    next[i] = { ...next[i], ...patch }
    update({ hiddenCosts: next })
  }

  const setDataSource = (i, name) => {
    const next = [...sources]
    next[i] = { ...next[i], name }
    update({ dataSources: next })
  }

  return (
    <div className="space-y-6 mt-6">

      <h3 className={sectionTitleClass(isDark)}>
        Services Scene — Header
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Your Path to Success"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Plain</label>
        <input
          type="text"
          value={meta.headingPlain || ''}
          onChange={(e) => update({ headingPlain: e.target.value })}
          className={inputClass}
          placeholder="Transform Faster "
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Accent</label>
        <input
          type="text"
          value={meta.headingAccent || ''}
          onChange={(e) => update({ headingAccent: e.target.value })}
          className={inputClass}
          placeholder="with Expert Guidance."
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Subtitle</label>
        <textarea
          rows={3}
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="Skip the guesswork. Elastic Professional Services accelerates your deployment, migration, and adoption — so your team focuses on outcomes, not overhead."
        />
      </div>

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        Services Scene — Hidden Costs
      </h3>
      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
        DIY Reality stage — cost items with severity (HIGH / MEDIUM / LOW).
      </p>

      {HIDDEN_COST_DEFAULTS.map((item, i) => (
        <div key={i} className="space-y-2">
          <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Cost {i + 1}</p>
          <div>
            <label className={fieldLabelClass(isDark)}>Label</label>
            <input
              type="text"
              value={costs[i]?.label || ''}
              onChange={(e) => setHiddenCost(i, { label: e.target.value })}
              className={inputClass}
              placeholder={item.placeholder}
            />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Severity</label>
            <select
              value={costs[i]?.severity || ''}
              onChange={(e) => setHiddenCost(i, { severity: e.target.value })}
              className={inputClass}
            >
              <option value="">Default ({item.sev})</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>
      ))}

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        Services Scene — Data Sources
      </h3>
      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
        Zero Downtime demo — data source names shown in the left panel.
      </p>

      {DATA_SOURCE_DEFAULTS.map((def, i) => (
        <div key={i}>
          <label className={fieldLabelClass(isDark)}>Source {i + 1}</label>
          <input
            type="text"
            value={sources[i]?.name || ''}
            onChange={(e) => setDataSource(i, e.target.value)}
            className={inputClass}
            placeholder={def}
          />
        </div>
      ))}

    </div>
  )
}
