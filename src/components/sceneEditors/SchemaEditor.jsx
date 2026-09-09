import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

const SOURCE_DEFAULTS = [
  { defaultLabel: 'Firewall', defaultField: 'src_ip', defaultHits: 14 },
  { defaultLabel: 'Windows Events', defaultField: 'source_address', defaultHits: 31 },
  { defaultLabel: 'Web Server', defaultField: 'client.ip', defaultHits: 7 },
  { defaultLabel: 'EDR', defaultField: 'RemoteIP', defaultHits: 5 },
]

export default function SchemaEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass }) {
  const meta = sceneMetadata?.schema || {}
  const update = (patch) => onUpdateSceneMetadata('schema', { ...meta, ...patch })

  const sourceLabelClass = `text-xs font-medium ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`
  const subsectionTitleClass = `text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`

  const updateSource = (i, patch) => {
    const sources = [...(meta.sources || [{}, {}, {}, {}])]
    sources[i] = { ...sources[i], ...patch }
    update({ sources })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Schema Scene Content
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Elastic Common Schema"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Title Part 1 (plain)</label>
        <input
          type="text"
          value={meta.titlePart1 || ''}
          onChange={(e) => update({ titlePart1: e.target.value })}
          className={inputClass}
          placeholder="Schema on Read"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Title Part 2 (accent colour)</label>
        <input
          type="text"
          value={meta.titlePart2 || ''}
          onChange={(e) => update({ titlePart2: e.target.value })}
          className={inputClass}
          placeholder="Schema on Write"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Stage 0 Subtitle</label>
        <input
          type="text"
          value={meta.subtitle0 || ''}
          onChange={(e) => update({ subtitle0: e.target.value })}
          className={inputClass}
          placeholder="How you organize data determines how fast you can find it"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Stage 1 Subtitle</label>
        <input
          type="text"
          value={meta.subtitle1 || ''}
          onChange={(e) => update({ subtitle1: e.target.value })}
          className={inputClass}
          placeholder="One field name. Any source. Zero guesswork."
        />
      </div>

      {/* Sources */}
      <div>
        <h4 className={subsectionTitleClass}>
          Data Sources (Stage 1)
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {SOURCE_DEFAULTS.map((defaults, i) => {
            const src = meta.sources?.[i] || {}
            return (
              <div key={i} className="space-y-2">
                <p className={sourceLabelClass}>
                  Source {i + 1}
                </p>
                <div>
                  <label className={fieldLabelClass(isDark)}>Label</label>
                  <input
                    type="text"
                    value={src.label || ''}
                    onChange={(e) => updateSource(i, { label: e.target.value })}
                    className={inputClass}
                    placeholder={defaults.defaultLabel}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Raw Field Name</label>
                  <input
                    type="text"
                    value={src.rawField || ''}
                    onChange={(e) => updateSource(i, { rawField: e.target.value })}
                    className={inputClass}
                    placeholder={defaults.defaultField}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Hit Count</label>
                  <input
                    type="number"
                    value={src.hitCount ?? ''}
                    onChange={(e) => updateSource(i, { hitCount: e.target.value })}
                    className={inputClass}
                    placeholder={defaults.defaultHits}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
