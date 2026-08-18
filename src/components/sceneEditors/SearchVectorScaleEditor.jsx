import BeatsEditorBlock, { EyebrowField, editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import StringListEditor, { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-vector-scale'

const DEFAULT_BEATS = [
  {
    key: 'claim',
    step: 'Vector DB',
    titlePlain: 'Elasticsearch Is a ',
    titleAccent: 'Vector Database',
    subtitle: 'Hybrid search, multimodal & multilingual retrieval, and GPU-accelerated indexing — in the same platform.',
  },
  {
    key: 'factors',
    step: 'Scale',
    titlePlain: 'Four Factors That Decide Whether AI ',
    titleAccent: 'Actually Scales',
    subtitle: 'Confidence, model agnosticism, disk-scale efficiency, and raw GPU speed.',
  },
  {
    key: 'diskbbq',
    step: 'DiskBBQ',
    titlePlain: 'High Volume. Low RAM. ',
    titleAccent: 'DiskBBQ.',
    subtitle: 'Better Binary Quantization plus a disk-resident vector index — high recall without saturating memory.',
  },
]

const DEFAULT_PILLS = ['Hybrid Search', 'Multimodal / Multilingual', 'GPU-Accelerated']

const DEFAULT_FACTORS = [
  { name: 'Confidence', title: 'Governed access, fully auditable', body: 'Access controls enforce at the query layer — before the model sees context. DLS, FLS, and RBAC hold across every retrieval.' },
  { name: 'Agnosticism', title: 'LLM-neutral by design', body: 'Bring fine-tuned, procured, or open-weight models. The platform cannot bake in a preference for any LLM.' },
  { name: 'Efficiency', title: 'Scale far beyond RAM', body: 'Dense indexes hit a memory ceiling. The platform must operate at full scale on disk — DiskBBQ is Elastic’s answer.', callout: '→ DiskBBQ — covered next' },
  { name: 'Raw Speed', title: 'GPU-accelerated vector search', body: 'Instrument streams and machine datasets need GPU-accelerated vector operations that match the pace of the data.' },
]

export default function SearchVectorScaleEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)
  const factors = DEFAULT_FACTORS.map((def, i) => ({ ...def, ...(meta.factors?.[i] || {}) }))
  const setFactor = (i, patch) => update({
    factors: factors.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
  })

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · Vector Database"
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
        <h3 className={sectionTitleClass(isDark)}>Claim pills</h3>
        <div className="mt-3">
          <StringListEditor
            values={meta.pills || DEFAULT_PILLS}
            onChange={(pills) => update({ pills })}
            inputClass={inputClass}
            isDark={isDark}
            placeholder="Pill"
          />
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Scale factors</h3>
        <div className="space-y-3 mt-3">
          {factors.map((factor, i) => (
            <div key={DEFAULT_FACTORS[i].name} className={editorCardClass(isDark)}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                {String(i + 1).padStart(2, '0')} · {DEFAULT_FACTORS[i].name}
              </span>
              <div className="space-y-2">
                <div>
                  <label className={fieldLabelClass(isDark)}>Name</label>
                  <input type="text" value={factor.name || ''} onChange={(e) => setFactor(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_FACTORS[i].name} />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Title</label>
                  <input type="text" value={factor.title || ''} onChange={(e) => setFactor(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_FACTORS[i].title} />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Body</label>
                  <textarea rows={3} value={factor.body || ''} onChange={(e) => setFactor(i, { body: e.target.value })} className={textareaClass} placeholder={DEFAULT_FACTORS[i].body} />
                </div>
                {DEFAULT_FACTORS[i].callout ? (
                  <div>
                    <label className={fieldLabelClass(isDark)}>Callout</label>
                    <input type="text" value={factor.callout || ''} onChange={(e) => setFactor(i, { callout: e.target.value })} className={inputClass} placeholder={DEFAULT_FACTORS[i].callout} />
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
