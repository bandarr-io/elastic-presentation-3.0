import BeatsEditorBlock, { EyebrowField, editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import { mergeBeats } from './StringListEditor'

const SCENE_ID = 'search-gpu'

const DEFAULT_BEATS = [
  {
    key: 'bottleneck',
    step: 'Bottleneck',
    titlePlain: 'CPU Indexing Is the ',
    titleAccent: 'Choke Point',
    subtitle: 'Vectors arrive faster than CPU can build HNSW graphs. The rest of the pipeline waits.',
  },
  {
    key: 'gpu',
    step: 'GPU',
    titlePlain: 'NVIDIA Builds the Graph. ',
    titleAccent: 'Elasticsearch Serves It.',
    subtitle: 'cuVS constructs CAGRA on GPU, then converts to HNSW so the same cluster can search it.',
  },
]

const DEFAULT_STATS = [
  { value: 12, suffix: '×', label: 'indexing throughput' },
  { value: 7, suffix: '×', label: 'faster merges' },
  { value: 5, suffix: '×', label: 'cost-adjusted throughput' },
]

const DEFAULT_STATIONS = [
  { label: 'Your data', sub: 'Unstructured' },
  { label: 'Embedding', sub: 'Vectors' },
  { cpuLabel: 'CPU indexing', cpuSub: 'HNSW bottleneck', gpuLabel: 'NVIDIA cuVS', gpuSub: 'CAGRA → HNSW' },
  { label: 'Elasticsearch', sub: 'Vector DB' },
]

export default function SearchGpuEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const beats = mergeBeats(DEFAULT_BEATS, meta.beats)
  const stats = DEFAULT_STATS.map((def, i) => ({ ...def, ...(meta.stats?.[i] || {}) }))
  const stations = DEFAULT_STATIONS.map((def, i) => ({ ...def, ...(meta.stations?.[i] || {}) }))

  const setStat = (i, patch) => update({
    stats: stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
  })
  const setStation = (i, patch) => update({
    stations: stations.map((s, idx) => (idx === i ? { ...s, ...patch } : s)),
  })

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Search · GPU Acceleration"
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
        <h3 className={sectionTitleClass(isDark)}>Pipeline stations</h3>
        <div className="space-y-3 mt-3">
          {stations.map((station, i) => (
            <div key={i} className={editorCardClass(isDark)}>
              <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                Station {i + 1}
              </span>
              {i === 2 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={fieldLabelClass(isDark)}>CPU label</label>
                    <input type="text" value={station.cpuLabel || ''} onChange={(e) => setStation(i, { cpuLabel: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].cpuLabel} />
                  </div>
                  <div>
                    <label className={fieldLabelClass(isDark)}>CPU sub</label>
                    <input type="text" value={station.cpuSub || ''} onChange={(e) => setStation(i, { cpuSub: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].cpuSub} />
                  </div>
                  <div>
                    <label className={fieldLabelClass(isDark)}>GPU label</label>
                    <input type="text" value={station.gpuLabel || ''} onChange={(e) => setStation(i, { gpuLabel: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].gpuLabel} />
                  </div>
                  <div>
                    <label className={fieldLabelClass(isDark)}>GPU sub</label>
                    <input type="text" value={station.gpuSub || ''} onChange={(e) => setStation(i, { gpuSub: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].gpuSub} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={fieldLabelClass(isDark)}>Label</label>
                    <input type="text" value={station.label || ''} onChange={(e) => setStation(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].label} />
                  </div>
                  <div>
                    <label className={fieldLabelClass(isDark)}>Sub</label>
                    <input type="text" value={station.sub || ''} onChange={(e) => setStation(i, { sub: e.target.value })} className={inputClass} placeholder={DEFAULT_STATIONS[i].sub} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>GPU stats</h3>
        <div className="space-y-3 mt-3">
          {stats.map((stat, i) => (
            <div key={i} className={editorCardClass(isDark)}>
              <div className="grid grid-cols-[5rem_4rem_1fr] gap-2">
                <div>
                  <label className={fieldLabelClass(isDark)}>Value</label>
                  <input
                    type="number"
                    value={stat.value}
                    onChange={(e) => setStat(i, { value: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Suffix</label>
                  <input type="text" value={stat.suffix || ''} onChange={(e) => setStat(i, { suffix: e.target.value })} className={inputClass} placeholder="×" />
                </div>
                <div>
                  <label className={fieldLabelClass(isDark)}>Label</label>
                  <input type="text" value={stat.label || ''} onChange={(e) => setStat(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_STATS[i].label} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionTitleClass(isDark)}>Closers</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={fieldLabelClass(isDark)}>CPU closer</label>
            <input type="text" value={meta.cpuCloser || ''} onChange={(e) => update({ cpuCloser: e.target.value })} className={inputClass} placeholder="Graph construction on CPU is the stage that cannot keep up." />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Handoff</label>
            <input type="text" value={meta.handoff || ''} onChange={(e) => update({ handoff: e.target.value })} className={inputClass} placeholder="CAGRA on GPU → HNSW in Elasticsearch" />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>GPU closer</label>
            <input type="text" value={meta.gpuCloser || ''} onChange={(e) => update({ gpuCloser: e.target.value })} className={inputClass} placeholder="Same cluster. No sidecar vector database." />
          </div>
        </div>
      </div>
    </div>
  )
}
