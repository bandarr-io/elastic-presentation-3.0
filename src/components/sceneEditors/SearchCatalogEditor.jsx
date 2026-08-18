import { CATALOG_SCENARIOS, buildCatalogBeats, resolveCatalogScenario } from '../../data/catalogScenarios'
import BeatsEditorBlock, { EyebrowField, fieldLabelClass } from './BeatsEditorBlock'
import { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-catalog'
const DEFAULT_EYEBROW = 'Search · How Search Works'

export default function SearchCatalogEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })

  const scenario = resolveCatalogScenario(meta)
  const defaultBeats = buildCatalogBeats(scenario)
  const beats = mergeBeats(defaultBeats, meta.beats)

  return (
    <div className="space-y-6 mt-6">
      <div>
        <label className={fieldLabelClass(isDark)}>Audience pack</label>
        <select
          value={scenario.id}
          onChange={(e) => update({ scenarioId: e.target.value, beats: undefined })}
          className={inputClass}
        >
          {Object.values(CATALOG_SCENARIOS).map((pack) => (
            <option key={pack.id} value={pack.id}>
              {pack.label}
            </option>
          ))}
        </select>
        <p className={`text-xs mt-2 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
          Swaps the teaching nouns (query term, corpus, index rows). Beat titles regenerate unless you have already edited them — switching packs clears beat overrides.
        </p>
      </div>

      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder={DEFAULT_EYEBROW}
        inputClass={inputClass}
        isDark={isDark}
      />

      <BeatsEditorBlock
        beats={beats}
        defaults={defaultBeats}
        onChange={(next) => update({ beats: next })}
        isDark={isDark}
        inputClass={inputClass}
        textareaClass={textareaClass}
      />
    </div>
  )
}
