import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function UnifiedStrategyEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass }) {
  const meta = sceneMetadata?.['unified-strategy'] || {}
  const update = (patch) => onUpdateSceneMetadata('unified-strategy', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Platform Overview Content
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
          placeholder="The Elastic Search AI Platform"
        />
        <p className={hintClass}>
          Small text above the main title
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Title (Part 1)
        </label>
        <input
          type="text"
          value={meta.titlePart1 || ''}
          onChange={(e) => update({ titlePart1: e.target.value })}
          className={inputClass}
          placeholder="All Your Data"
        />
        <p className={hintClass}>
          First part of title (will be shown in teal/blue)
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Title (Part 2)
        </label>
        <input
          type="text"
          value={meta.titlePart2 || ''}
          onChange={(e) => update({ titlePart2: e.target.value })}
          className={inputClass}
          placeholder=", Real-Time, At Scale"
        />
        <p className={hintClass}>
          Second part of title (white/black)
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Subtitle
        </label>
        <input
          type="text"
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="Accelerate mission outcomes by finding insights from any data source"
        />
        <p className={hintClass}>
          Descriptive subtitle below the main title
        </p>
      </div>
    </div>
  )
}
