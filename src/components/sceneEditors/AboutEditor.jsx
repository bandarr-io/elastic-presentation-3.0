import { editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import IconSelect from './IconSelect'

const STAT_DEFAULTS = [
  { index: 0, defaultValue: '5B+', defaultLabel: 'Downloads', defaultDesc: 'Open source downloads worldwide' },
  { index: 1, defaultValue: '54%', defaultLabel: 'Fortune 500', defaultDesc: 'Trust Elastic for their data needs' },
  { index: 2, defaultValue: '40+', defaultLabel: 'Countries', defaultDesc: 'Global presence and support' },
  { index: 3, defaultValue: '3,000+', defaultLabel: 'Employees', defaultDesc: 'Distributed across the globe' },
]

const FEATURE_DEFAULTS = [
  { index: 0, defaultTitle: 'Search Pioneer', defaultDesc: 'Built on Apache Lucene, the gold standard for search', defaultIcon: 'magnifying-glass' },
  { index: 1, defaultTitle: 'Data at Scale', defaultDesc: 'Petabytes of data processed daily by our customers', defaultIcon: 'chart-column' },
  { index: 2, defaultTitle: 'AI-Native', defaultDesc: 'Vector search & ML built into the platform from day one', defaultIcon: 'brain' },
  { index: 3, defaultTitle: 'Open Source DNA', defaultDesc: 'Transparent, extensible, community-driven', defaultIcon: 'dna' },
]

export default function AboutEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.about || {}
  const update = (patch) => onUpdateSceneMetadata('about', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`
  const subLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const subheadingClass = `text-sm font-semibold mb-4 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`
  const cardHeadingClass = `text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`

  const stats = meta.stats || []
  const setStat = (index, patch) => {
    const newStats = [...stats]
    newStats[index] = { ...newStats[index], ...patch }
    update({ stats: newStats })
  }

  const features = meta.features || []
  const setFeature = (index, patch) => {
    const newFeatures = [...features]
    newFeatures[index] = { ...newFeatures[index], ...patch }
    update({ features: newFeatures })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        About Elastic Content
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Eyebrow
        </label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Who We Are"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Subtitle
        </label>
        <textarea
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={textareaClass}
          rows={3}
          placeholder="The Search AI Company—powering search, observability, and security for thousands of organizations worldwide."
        />
        <p className={hintClass}>
          Descriptive subtitle below the main title
        </p>
      </div>

      {/* Stats Cards */}
      <div>
        <h4 className={subheadingClass}>
          Statistics Cards
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {STAT_DEFAULTS.map((stat) => (
            <div key={`stat-${stat.index}`} className={editorCardClass(isDark)}>
              <p className={cardHeadingClass}>
                Stat #{stat.index + 1}
              </p>
              <div className="space-y-2">
                <div>
                  <label className={subLabelClass}>
                    Value
                  </label>
                  <input
                    type="text"
                    value={stats[stat.index]?.value || ''}
                    onChange={(e) => setStat(stat.index, { value: e.target.value })}
                    className={inputClass}
                    placeholder={stat.defaultValue}
                  />
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
                    Description
                  </label>
                  <input
                    type="text"
                    value={stats[stat.index]?.description || ''}
                    onChange={(e) => setStat(stat.index, { description: e.target.value })}
                    className={inputClass}
                    placeholder={stat.defaultDesc}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Cards */}
      <div>
        <h4 className={subheadingClass}>
          Features Cards
        </h4>
        <div className="grid grid-cols-2 gap-3">
          {FEATURE_DEFAULTS.map((feature) => (
            <div key={`feature-${feature.index}`} className={editorCardClass(isDark)}>
              <p className={cardHeadingClass}>
                Feature #{feature.index + 1}
              </p>
              <div className="space-y-2">
                <IconSelect
                  value={typeof features[feature.index]?.icon === 'string' ? features[feature.index].icon : feature.defaultIcon}
                  onChange={(name) => setFeature(feature.index, { icon: name })}
                  inputClass={inputClass}
                  isDark={isDark}
                />
                <div>
                  <label className={subLabelClass}>
                    Title
                  </label>
                  <input
                    type="text"
                    value={features[feature.index]?.title || ''}
                    onChange={(e) => setFeature(feature.index, { title: e.target.value })}
                    className={inputClass}
                    placeholder={feature.defaultTitle}
                  />
                </div>
                <div>
                  <label className={subLabelClass}>
                    Description
                  </label>
                  <input
                    type="text"
                    value={features[feature.index]?.description || ''}
                    onChange={(e) => setFeature(feature.index, { description: e.target.value })}
                    className={inputClass}
                    placeholder={feature.defaultDesc}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
