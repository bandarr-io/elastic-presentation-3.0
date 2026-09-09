import { editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

const STAT_DEFAULTS = [
  { index: 0, defaultEnd: '175', defaultSuffix: 'ZB', defaultLabel: 'of data generated in 2025', defaultSource: 'IDC / Seagate "Data Age 2025"' },
  { index: 1, defaultEnd: '90', defaultSuffix: '%', defaultLabel: 'of enterprise data is unstructured', defaultSource: 'IBM Research' },
  { index: 2, defaultEnd: '68', defaultSuffix: '%', defaultLabel: 'is "dark data" — never analyzed', defaultSource: 'Seagate / IDC Research' },
]

export default function DataExplosionEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['data-explosion'] || {}
  const update = (patch) => onUpdateSceneMetadata('data-explosion', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`
  const subLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const subheadingClass = `text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`
  const cardHeadingClass = `text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`

  const stats = meta.stats || []
  const setStat = (index, patch) => {
    const newStats = [...stats]
    newStats[index] = { ...newStats[index], ...patch }
    update({ stats: newStats })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Data Explosion Content
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Eyebrow Text
        </label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="The Challenge"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Verdict Line 1
        </label>
        <input
          type="text"
          value={meta.verdictLine1 || ''}
          onChange={(e) => update({ verdictLine1: e.target.value })}
          className={inputClass}
          placeholder="Most data goes unsearched, unanalyzed, unutilized."
        />
        <p className={hintClass}>
          Main punchline text (plain text, no color highlights)
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Verdict Line 2
        </label>
        <input
          type="text"
          value={meta.verdictLine2 || ''}
          onChange={(e) => update({ verdictLine2: e.target.value })}
          className={inputClass}
          placeholder="Speed. Scale. Flexibility. Innovation demands all three — simultaneously."
        />
        <p className={hintClass}>
          Supporting text below the punchline
        </p>
      </div>

      <div className="space-y-4">
        <h4 className={subheadingClass}>
          Stat Card Labels
        </h4>
        {STAT_DEFAULTS.map((stat) => (
          <div key={`de-stat-${stat.index}`} className={editorCardClass(isDark)}>
            <p className={cardHeadingClass}>
              Stat #{stat.index + 1}
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={subLabelClass}>
                    Number
                  </label>
                  <input
                    type="number"
                    value={stats[stat.index]?.end ?? ''}
                    onChange={(e) => setStat(stat.index, { end: e.target.value })}
                    className={inputClass}
                    placeholder={stat.defaultEnd}
                  />
                </div>
                <div>
                  <label className={subLabelClass}>
                    Suffix
                  </label>
                  <input
                    type="text"
                    value={stats[stat.index]?.suffix || ''}
                    onChange={(e) => setStat(stat.index, { suffix: e.target.value })}
                    className={inputClass}
                    placeholder={stat.defaultSuffix}
                  />
                </div>
              </div>
              <div>
                <label className={subLabelClass}>
                  Label
                </label>
                <input
                  type="text"
                  value={stats[stat.index]?.label || ''}
                  onChange={(e) => setStat(stat.index, { label: e.target.value })}
                  className={inputClass}
                  placeholder={stat.defaultLabel}
                />
              </div>
              <div>
                <label className={subLabelClass}>
                  Source
                </label>
                <input
                  type="text"
                  value={stats[stat.index]?.source || ''}
                  onChange={(e) => setStat(stat.index, { source: e.target.value })}
                  className={inputClass}
                  placeholder={stat.defaultSource}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
