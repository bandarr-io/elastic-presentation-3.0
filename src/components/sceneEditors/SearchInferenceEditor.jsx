import BeatsEditorBlock, { EyebrowField, editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import StringListEditor, { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-inference'

const DEFAULT_BEATS = [
  {
    key: 'providers',
    step: 'Any Model',
    titlePlain: 'One Platform, ',
    titleAccent: 'Any Model',
    subtitle: 'Vector, LLM, and rerank providers plug into /_inference. Swap hosting without re-indexing when the model stays the same.',
  },
  {
    key: 'sovereign',
    step: 'Sovereign',
    titlePlain: 'Inference in ',
    titleAccent: 'Sovereign AI',
    subtitle: 'Experiences route through Elasticsearch /_inference — public cloud or self-managed GPU.',
  },
]

const DEFAULT_GROUPS = [
  { short: 'Hyperscalers', title: 'Hyperscalers', items: ['AWS Bedrock', 'Amazon SageMaker', 'Azure OpenAI', 'Azure AI Foundry', 'Google Vertex AI', 'Google AI Studio', 'IBM watsonx.ai'] },
  { short: 'Model Providers', title: 'Model Providers & Specialists', items: ['OpenAI', 'Anthropic', 'Mistral', 'Cohere', 'AI21 Labs', 'Voyage AI', 'Jina AI', 'Contextual AI', 'Fireworks AI', 'Groq'] },
  { short: 'Self-Managed', title: 'Self-Managed & Open Source', items: ['NVIDIA NIM', 'Hugging Face', 'Llama Stack', 'OpenShift AI', 'Custom REST: vLLM', 'Ollama'] },
  { short: 'Elastic-Native', title: 'Elastic-Native', items: ['Elastic Inference Service', 'Jina On-Prem', 'ELSER', 'E5 / Eland-hosted'] },
]

const DEFAULT_EXPERIENCES = ['Chat / RAG', 'Agentic Search', 'Autonomous Agents']
const DEFAULT_PUBLIC = ['Elastic Inference Service', 'AWS / Azure / GCP', 'OpenAI / Anthropic', 'Model Aggregators']
const DEFAULT_PRIVATE = ['Jina On-Prem', 'NVIDIA NIM', 'vLLM', 'Ollama']

export default function SearchInferenceEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)
  const groups = DEFAULT_GROUPS.map((def, i) => ({
    ...def,
    ...(meta.groups?.[i] || {}),
    items: meta.groups?.[i]?.items || def.items,
  }))

  const setGroup = (i, patch) => update({
    groups: groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)),
  })

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · Inference"
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
        <h3 className={sectionTitleClass(isDark)}>Provider groups</h3>
        <div className="space-y-3 mt-3">
          {groups.map((group, i) => (
            <div key={DEFAULT_GROUPS[i].short} className={editorCardClass(isDark)}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                {DEFAULT_GROUPS[i].short}
              </span>
              <div className="space-y-2">
                <div>
                  <label className={fieldLabelClass(isDark)}>Short label</label>
                  <input type="text" value={group.short || ''} onChange={(e) => setGroup(i, { short: e.target.value })} className={inputClass} placeholder={DEFAULT_GROUPS[i].short} />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Title</label>
                  <input type="text" value={group.title || ''} onChange={(e) => setGroup(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_GROUPS[i].title} />
                </div>
                <StringListEditor
                  label="Providers"
                  values={group.items}
                  onChange={(items) => setGroup(i, { items })}
                  inputClass={inputClass}
                  isDark={isDark}
                  placeholder="Provider"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Sovereign split</h3>
        <div className="space-y-4 mt-3">
          <StringListEditor
            label="Experiences"
            values={meta.experiences || DEFAULT_EXPERIENCES}
            onChange={(experiences) => update({ experiences })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={fieldLabelClass(isDark)}>Public well</label>
              <input type="text" value={meta.publicWell || ''} onChange={(e) => update({ publicWell: e.target.value })} className={inputClass} placeholder="Elastic Cloud" />
            </div>
            <div>
              <label className={fieldLabelClass(isDark)}>Private well</label>
              <input type="text" value={meta.privateWell || ''} onChange={(e) => update({ privateWell: e.target.value })} className={inputClass} placeholder="Your GPU" />
            </div>
          </div>
          <StringListEditor
            label="Public cloud"
            values={meta.public || DEFAULT_PUBLIC}
            onChange={(next) => update({ public: next })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <StringListEditor
            label="Self-managed GPU"
            values={meta.private || DEFAULT_PRIVATE}
            onChange={(next) => update({ private: next })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div>
            <label className={fieldLabelClass(isDark)}>Closer</label>
            <input
              type="text"
              value={meta.closer || ''}
              onChange={(e) => update({ closer: e.target.value })}
              className={inputClass}
              placeholder="Air-gapped or Elastic Cloud. The call does not change."
            />
          </div>
        </div>
      </div>
    </div>
  )
}
