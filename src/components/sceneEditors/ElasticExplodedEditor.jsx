import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function ElasticExplodedEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['elastic-exploded'] || {}
  const update = (patch) => onUpdateSceneMetadata('elastic-exploded', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Exploded Platform Content
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
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Title (Plain)
        </label>
        <input
          type="text"
          value={meta.titlePlain || ''}
          onChange={(e) => update({ titlePlain: e.target.value })}
          className={inputClass}
          placeholder="From ingest to action. "
        />
        <p className={hintClass}>
          First part of the title, in the standard ink color
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Title (Accent)
        </label>
        <input
          type="text"
          value={meta.titleAccent || ''}
          onChange={(e) => update({ titleAccent: e.target.value })}
          className={inputClass}
          placeholder="One engine."
        />
        <p className={hintClass}>
          Second part of the title, in the accent color
        </p>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>
          Subtitle
        </label>
        <textarea
          rows={3}
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={textareaClass}
          placeholder="Ingestion, search, ML, and automation are usually separate products held together by connectors and sync jobs. In Elastic, they are layers of the same engine, working on the same data in place. Click the logo to take it apart."
        />
        <p className={hintClass}>
          Descriptive subtitle below the main title
        </p>
      </div>
    </div>
  )
}
