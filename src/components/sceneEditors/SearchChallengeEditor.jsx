import BeatsEditorBlock, { EyebrowField, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import StringListEditor, { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-challenge'

const DEFAULT_BEATS = [
  {
    key: 'tip',
    step: 'Surface',
    titlePlain: 'What you can see ',
    titleAccent: 'is the tip.',
    subtitle: 'Structured, indexed, governed — a thin slice above the waterline.',
  },
  {
    key: 'depth',
    step: 'Depth',
    titlePlain: '80% of data is ',
    titleAccent: 'unstructured.',
    subtitle: 'And it resists self-service by humans and agents.',
  },
]

const DEFAULT_STRUCTURED = [
  'Relational databases',
  'Data warehouses',
  'CRM & ERP records',
  'Transactional tables',
  'Metrics & KPIs',
]

const DEFAULT_UNSTRUCTURED = [
  'Documents',
  'PDFs',
  'Email',
  'Chat messages',
  'Transcripts',
  'Audio & video',
  'Images',
  'Presentations',
  'Contracts',
  'Support tickets',
  'Source code',
  'Log files',
]

export default function SearchChallengeEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · The Challenge"
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
        <h3 className={sectionTitleClass(isDark)}>Source lists</h3>
        <div className="space-y-4 mt-3">
          <StringListEditor
            label="Structured (surface)"
            values={meta.structuredSources || DEFAULT_STRUCTURED}
            onChange={(structuredSources) => update({ structuredSources })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <StringListEditor
            label="Unstructured (depth)"
            values={meta.unstructuredSources || DEFAULT_UNSTRUCTURED}
            onChange={(unstructuredSources) => update({ unstructuredSources })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div>
            <label className={fieldLabelClass(isDark)}>Depth caption</label>
            <input
              type="text"
              value={meta.depthCaption || ''}
              onChange={(e) => update({ depthCaption: e.target.value })}
              className={inputClass}
              placeholder="Unstructured · Siloed · Invisible to AI"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
