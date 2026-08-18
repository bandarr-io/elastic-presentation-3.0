import BeatsEditorBlock, { EyebrowField, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-vector'

const DEFAULT_BEATS = [
  {
    key: 'embed',
    step: 'Embed',
    titlePlain: 'Find by Meaning, ',
    titleAccent: 'Not Keywords',
    subtitle: 'Content becomes vectors — similar ideas cluster together so search understands intent.',
  },
  {
    key: 'search',
    step: 'Search',
    titlePlain: 'Ask Naturally. ',
    titleAccent: 'Retrieve What Matters',
    subtitle: 'The query joins the same space, and the nearest neighbors rise to the top.',
  },
]

const DEFAULT_QUERY = 'floating runway for military aircraft'

export default function SearchVectorEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · Vector Search"
        inputClass={inputClass}
        isDark={isDark}
      />

      <BeatsEditorBlock
        beats={beats}
        defaults={DEFAULT_BEATS}
        onChange={(next) => update({ beats: next })}
        isDark={isDark}
        inputClass={inputClass}
        textareaClass={textareaClass}
      />

      <div>
        <h3 className={sectionTitleClass(isDark)}>Demo query</h3>
        <div className="mt-3">
          <label className={fieldLabelClass(isDark)}>Typed query</label>
          <input
            type="text"
            value={meta.query || ''}
            onChange={(e) => update({ query: e.target.value })}
            className={inputClass}
            placeholder={DEFAULT_QUERY}
          />
        </div>
      </div>
    </div>
  )
}
