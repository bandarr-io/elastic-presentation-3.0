import BeatsEditorBlock, { EyebrowField, editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import StringListEditor, { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-context'

const DEFAULT_BEATS = [
  {
    key: 'missing',
    step: 'Missing Layer',
    titlePlain: 'The Context Layer Is the ',
    titleAccent: 'Missing Layer',
    subtitle: 'Most architectures jump from data straight to models — leaving retrieval, memory, and governance hand-rolled.',
  },
  {
    key: 'inside',
    step: 'Inside',
    titlePlain: 'Inside Elastic’s ',
    titleAccent: 'Context Layer',
    subtitle: 'Agent Builder and the Context Engine curate what AI sees and enforce permissions before the model.',
  },
  {
    key: 'flow',
    step: 'Benefits',
    titlePlain: 'What the Context Engine ',
    titleAccent: 'Delivers',
    subtitle: 'Sources converge; governed, citable, agent-ready outcomes radiate out.',
  },
]

const DEFAULT_LAYERS = [
  { name: 'Agents & AI Experiences', sub: 'research UIs · chat · agentic workflows' },
  { name: 'AI Models', sub: 'LLM · vector embeddings · rerankers' },
  { name: 'Datastore', sub: 'vectors · documents · time series · hybrid' },
]

const DEFAULT_GAP = {
  kicker: 'Missing',
  title: 'Context Layer',
  sub: 'retrieval · memory · ontology · skills · tools',
}

const DEFAULT_INSIDE = {
  title: 'Context Layer',
  kicker: 'permissions fire before the model',
  agentBuilderLabel: 'Agent Builder',
  contextEngineLabel: 'Context Engine',
}

export default function SearchContextEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)
  const layers = DEFAULT_LAYERS.map((def, i) => ({ ...def, ...(meta.layers?.[i] || {}) }))
  const gap = { ...DEFAULT_GAP, ...(meta.gap || {}) }
  const inside = { ...DEFAULT_INSIDE, ...(meta.inside || {}) }

  const setLayer = (i, patch) => update({
    layers: layers.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
  })

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · Context Layer"
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
        <h3 className={sectionTitleClass(isDark)}>Stack layers</h3>
        <div className="space-y-3 mt-3">
          {layers.map((layer, i) => (
            <div key={i} className={editorCardClass(isDark)}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                {DEFAULT_LAYERS[i].name}
              </span>
              <div className="space-y-2">
                <input type="text" value={layer.name || ''} onChange={(e) => setLayer(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_LAYERS[i].name} />
                <input type="text" value={layer.sub || ''} onChange={(e) => setLayer(i, { sub: e.target.value })} className={inputClass} placeholder={DEFAULT_LAYERS[i].sub} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Missing-layer gap</h3>
        <div className="space-y-2 mt-3">
          <input type="text" value={gap.kicker || ''} onChange={(e) => update({ gap: { ...gap, kicker: e.target.value } })} className={inputClass} placeholder={DEFAULT_GAP.kicker} />
          <input type="text" value={gap.title || ''} onChange={(e) => update({ gap: { ...gap, title: e.target.value } })} className={inputClass} placeholder={DEFAULT_GAP.title} />
          <input type="text" value={gap.sub || ''} onChange={(e) => update({ gap: { ...gap, sub: e.target.value } })} className={inputClass} placeholder={DEFAULT_GAP.sub} />
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Inside the context layer</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={fieldLabelClass(isDark)}>Title</label>
            <input type="text" value={inside.title || ''} onChange={(e) => update({ inside: { ...inside, title: e.target.value } })} className={inputClass} placeholder={DEFAULT_INSIDE.title} />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Kicker</label>
            <input type="text" value={inside.kicker || ''} onChange={(e) => update({ inside: { ...inside, kicker: e.target.value } })} className={inputClass} placeholder={DEFAULT_INSIDE.kicker} />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Agent Builder label</label>
            <input type="text" value={inside.agentBuilderLabel || ''} onChange={(e) => update({ inside: { ...inside, agentBuilderLabel: e.target.value } })} className={inputClass} placeholder={DEFAULT_INSIDE.agentBuilderLabel} />
          </div>
          <StringListEditor
            label="Agent Builder chips"
            values={meta.agentBuilder || ['Tool registry', 'Skills registry', 'Workflows', 'Prompt management']}
            onChange={(agentBuilder) => update({ agentBuilder })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div>
            <label className={fieldLabelClass(isDark)}>Context Engine label</label>
            <input type="text" value={inside.contextEngineLabel || ''} onChange={(e) => update({ inside: { ...inside, contextEngineLabel: e.target.value } })} className={inputClass} placeholder={DEFAULT_INSIDE.contextEngineLabel} />
          </div>
          <StringListEditor
            label="Context Engine chips"
            values={meta.contextEngine || ['Semantic metadata', 'Memory management', 'Knowledge bases', 'Entity graphs']}
            onChange={(contextEngine) => update({ contextEngine })}
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Sources & benefits</h3>
        <div className="space-y-4 mt-3">
          <StringListEditor
            label="Data sources"
            values={meta.sources || ['Documents & knowledge bases', 'Databases & warehouses', 'SaaS & APIs', 'Observability signals', 'Streams & events']}
            onChange={(sources) => update({ sources })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <StringListEditor
            label="Benefits"
            values={meta.benefits || ['Grounded retrieval', 'Governed access — DLS before LLM', 'Citable, auditable results', 'Usage & cost attribution', 'MCP-native agent substrate']}
            onChange={(benefits) => update({ benefits })}
            inputClass={inputClass}
            isDark={isDark}
          />
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Closers</h3>
        <div className="space-y-2 mt-3">
          <div>
            <label className={fieldLabelClass(isDark)}>Missing-layer closer</label>
            <input type="text" value={meta.missingCloser || ''} onChange={(e) => update({ missingCloser: e.target.value })} className={inputClass} placeholder="Jump the gap and retrieval stays a DIY project." />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Inside closer</label>
            <input type="text" value={meta.insideCloser || ''} onChange={(e) => update({ insideCloser: e.target.value })} className={inputClass} placeholder="What the model sees is curated — and governed." />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Flow closer</label>
            <input type="text" value={meta.flowCloser || ''} onChange={(e) => update({ flowCloser: e.target.value })} className={inputClass} placeholder="Governed context in. Agent-ready answers out." />
          </div>
        </div>
      </div>
    </div>
  )
}
