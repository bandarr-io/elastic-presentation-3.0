import { editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function DataMeshEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['data-mesh'] || {}
  const update = (patch) => onUpdateSceneMetadata('data-mesh', { ...meta, ...patch })

  const subsectionClass = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const stageHeadingClass = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`
  const mutedLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const faintLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`

  const setStageLabel = (i, value) => {
    const labels = [...(meta.stageLabels || ['', '', '', '', ''])]
    labels[i] = value
    update({ stageLabels: labels })
  }

  const setDilemmaLeftItem = (i, patch) => {
    const items = [...(meta.dilemmaLeftItems || [{}, {}, {}, {}])]
    items[i] = { ...items[i], ...patch }
    update({ dilemmaLeftItems: items })
  }

  const setDilemmaRightItem = (i, patch) => {
    const items = [...(meta.dilemmaRightItems || [{}, {}, {}, {}])]
    items[i] = { ...items[i], ...patch }
    update({ dilemmaRightItems: items })
  }

  const setProblemsCard = (i, patch) => {
    const cards = [...(meta.problemsCards || [{}, {}, {}, {}])]
    cards[i] = { ...cards[i], ...patch }
    update({ problemsCards: cards })
  }

  const setArchItem = (i, patch) => {
    const items = [...(meta.archItems || [{}, {}, {}, {}])]
    items[i] = { ...items[i], ...patch }
    update({ archItems: items })
  }

  const setArchItemProblem = (i, pi, value) => {
    const items = [...(meta.archItems || [{}, {}, {}, {}])]
    const problems = [...(items[i]?.problems || ['', '', '', ''])]
    problems[pi] = value
    items[i] = { ...items[i], problems }
    update({ archItems: items })
  }

  const setMeshNode = (i, value) => {
    const nodes = [...(meta.meshNodes || [{}, {}, {}])]
    nodes[i] = { ...nodes[i], label: value }
    update({ meshNodes: nodes })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Data Mesh Content
      </h3>

      {/* ── Header ── */}
      <div className="space-y-3">
        <h4 className={subsectionClass}>Header</h4>
        <div>
          <label className={fieldLabelClass(isDark)}>Eyebrow</label>
          <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Data Architecture" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Title Part 1</label>
          <input type="text" value={meta.titlePart1 || ''} onChange={(e) => update({ titlePart1: e.target.value })} className={inputClass} placeholder="From Chaos to " />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Title Part 2 (highlighted)</label>
          <input type="text" value={meta.titlePart2 || ''} onChange={(e) => update({ titlePart2: e.target.value })} className={inputClass} placeholder="Clarity" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Subtitle</label>
          <textarea value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} rows={2} placeholder="How Elastic creates an enterprise-wide data mesh to search and act on data at scale." />
        </div>
      </div>

      {/* ── Stage Nav Labels + Stage 1 — side by side ── */}
      <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '30% 1fr' }}>

        {/* Stage Nav Labels */}
        <div className="space-y-3">
          <h4 className={subsectionClass}>Stage Nav Labels</h4>
          {['The Question', 'The Dilemma', 'The Problems', 'The Workarounds', 'The Solution'].map((placeholder, i) => (
            <div key={i}>
              <label className={mutedLabelClass}>Stage {i + 1}</label>
              <input
                type="text"
                value={meta.stageLabels?.[i] || ''}
                onChange={(e) => setStageLabel(i, e.target.value)}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>

        {/* Stage 1 — The Question */}
        <div className="space-y-3">
          <h4 className={stageHeadingClass}>Stage 1 — {meta.stageLabels?.[0] || 'The Question'}</h4>
          <div>
            <label className={fieldLabelClass(isDark)}>Search bar question</label>
            <input type="text" value={meta.question || ''} onChange={(e) => update({ question: e.target.value })} className={inputClass} placeholder="Why do we collect data?" />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Answer heading</label>
            <input type="text" value={meta.answerHeading || ''} onChange={(e) => update({ answerHeading: e.target.value })} className={inputClass} placeholder="To use it." />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Answer body</label>
            <textarea value={meta.answerBody || ''} onChange={(e) => update({ answerBody: e.target.value })} className={textareaClass} rows={2} placeholder="Data is a strategic asset. We need to retrieve, connect, and act on it — fast." />
          </div>
          <div>
            <label className={fieldLabelClass(isDark)}>Answer footer</label>
            <textarea value={meta.answerFooter || ''} onChange={(e) => update({ answerFooter: e.target.value })} className={textareaClass} rows={2} placeholder="But data is generated everywhere. How do you get total visibility at speed, at scale, without breaking the bank?" />
          </div>
        </div>

      </div>

      {/* ── Stage 1 — The Dilemma ── */}
      <div className="space-y-3">
        <h4 className={stageHeadingClass}>Stage 2 — {meta.stageLabels?.[1] || 'The Dilemma'}</h4>
        <div>
          <label className={fieldLabelClass(isDark)}>Intro text</label>
          <input type="text" value={meta.dilemmaIntro || ''} onChange={(e) => update({ dilemmaIntro: e.target.value })} className={inputClass} placeholder="The industry faced a choice..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {/* Left card */}
          <div className={`${editorCardClass(isDark)} space-y-2`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-elastic-teal/80' : 'text-elastic-blue'}`}>Left card</p>
            <div>
              <label className={faintLabelClass}>Title</label>
              <input type="text" value={meta.dilemmaLeftTitle || ''} onChange={(e) => update({ dilemmaLeftTitle: e.target.value })} className={inputClass} placeholder="Search" />
            </div>
            <div>
              <label className={faintLabelClass}>Subtitle</label>
              <input type="text" value={meta.dilemmaLeftSubtitle || ''} onChange={(e) => update({ dilemmaLeftSubtitle: e.target.value })} className={inputClass} placeholder="Like memory" />
            </div>
            {['Query instantly ✓', 'Pivot & explore ✓', 'Milliseconds ✓', '$4+ per GB ✗'].map((placeholder, i) => (
              <div key={i}>
                <label className={faintLabelClass}>Item {i + 1}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meta.dilemmaLeftItems?.[i]?.text || ''}
                    onChange={(e) => setDilemmaLeftItem(i, { text: e.target.value })}
                    className={`${inputClass} w-[80%]`}
                    placeholder={placeholder.replace(' ✓', '').replace(' ✗', '')}
                  />
                  <select
                    value={meta.dilemmaLeftItems?.[i]?.good ?? (i < 3 ? true : false)}
                    onChange={(e) => setDilemmaLeftItem(i, { good: e.target.value === 'true' })}
                    className={`${inputClass} w-[20%]`}
                  >
                    <option value="true">✓</option>
                    <option value="false">✗</option>
                  </select>
                </div>
              </div>
            ))}
            <div>
              <label className={faintLabelClass}>Footer note</label>
              <input type="text" value={meta.dilemmaLeftFooter || ''} onChange={(e) => update({ dilemmaLeftFooter: e.target.value })} className={inputClass} placeholder="Fast & flexible, but expensive" />
            </div>
          </div>

          {/* Right card */}
          <div className={`${editorCardClass(isDark)} space-y-2`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-orange-400/80' : 'text-elastic-midnight'}`}>Right card</p>
            <div>
              <label className={faintLabelClass}>Title</label>
              <input type="text" value={meta.dilemmaRightTitle || ''} onChange={(e) => update({ dilemmaRightTitle: e.target.value })} className={inputClass} placeholder="Storage" />
            </div>
            <div>
              <label className={faintLabelClass}>Subtitle</label>
              <input type="text" value={meta.dilemmaRightSubtitle || ''} onChange={(e) => update({ dilemmaRightSubtitle: e.target.value })} className={inputClass} placeholder="Like disk" />
            </div>
            {['Batch scan only ✗', 'Rehydrate first ✗', 'Minutes to hours ✗', '$0.02 per GB ✓'].map((placeholder, i) => (
              <div key={i}>
                <label className={faintLabelClass}>Item {i + 1}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={meta.dilemmaRightItems?.[i]?.text || ''}
                    onChange={(e) => setDilemmaRightItem(i, { text: e.target.value })}
                    className={`${inputClass} w-[80%]`}
                    placeholder={placeholder.replace(' ✓', '').replace(' ✗', '')}
                  />
                  <select
                    value={meta.dilemmaRightItems?.[i]?.good ?? (i === 3 ? true : false)}
                    onChange={(e) => setDilemmaRightItem(i, { good: e.target.value === 'true' })}
                    className={`${inputClass} w-[20%]`}
                  >
                    <option value="true">✓</option>
                    <option value="false">✗</option>
                  </select>
                </div>
              </div>
            ))}
            <div>
              <label className={faintLabelClass}>Footer note</label>
              <input type="text" value={meta.dilemmaRightFooter || ''} onChange={(e) => update({ dilemmaRightFooter: e.target.value })} className={inputClass} placeholder="Cheap but slow" />
            </div>
          </div>
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Callout prefix</label>
          <input type="text" value={meta.dilemmaCalloutPrefix || ''} onChange={(e) => update({ dilemmaCalloutPrefix: e.target.value })} className={inputClass} placeholder="Cost won. The industry went" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Callout highlighted word</label>
          <input type="text" value={meta.dilemmaCalloutHighlight || ''} onChange={(e) => update({ dilemmaCalloutHighlight: e.target.value })} className={inputClass} placeholder="storage-first" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Callout sub-text</label>
          <input type="text" value={meta.dilemmaCalloutSub || ''} onChange={(e) => update({ dilemmaCalloutSub: e.target.value })} className={inputClass} placeholder="But that created new problems..." />
        </div>
      </div>

      {/* ── Stage 2 — The Problems ── */}
      <div className="space-y-3">
        <h4 className={stageHeadingClass}>Stage 3 — {meta.stageLabels?.[2] || 'The Problems'}</h4>
        <div>
          <label className={fieldLabelClass(isDark)}>Intro text</label>
          <input type="text" value={meta.problemsIntro || ''} onChange={(e) => update({ problemsIntro: e.target.value })} className={inputClass} placeholder="Storage-first seemed smart… until the cracks appeared" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { placeholder: 'Data Silos', descPlaceholder: "Isolated pools that can't talk to each other" },
            { placeholder: 'Slow Insights', descPlaceholder: 'Minutes to hours before you can query' },
            { placeholder: 'No Visibility', descPlaceholder: "Can't see across the enterprise" },
            { placeholder: 'Data Sprawl', descPlaceholder: 'Copies everywhere, truth nowhere' },
          ].map(({ placeholder, descPlaceholder }, i) => (
            <div key={i} className={`${editorCardClass(isDark)} space-y-2`}>
              <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Problem #{i + 1}</p>
              <div>
                <label className={faintLabelClass}>Title</label>
                <input
                  type="text"
                  value={meta.problemsCards?.[i]?.title || ''}
                  onChange={(e) => setProblemsCard(i, { title: e.target.value })}
                  className={inputClass}
                  placeholder={placeholder}
                />
              </div>
              <div>
                <label className={faintLabelClass}>Description</label>
                <input
                  type="text"
                  value={meta.problemsCards?.[i]?.desc || ''}
                  onChange={(e) => setProblemsCard(i, { desc: e.target.value })}
                  className={inputClass}
                  placeholder={descPlaceholder}
                />
              </div>
            </div>
          ))}
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Bottom callout</label>
          <input type="text" value={meta.problemsCallout || ''} onChange={(e) => update({ problemsCallout: e.target.value })} className={inputClass} placeholder="The industry needed solutions. Workarounds emerged…" />
        </div>
      </div>

      {/* ── Stage 3 — The Workarounds ── */}
      <div className="space-y-3">
        <h4 className={stageHeadingClass}>Stage 4 — {meta.stageLabels?.[3] || 'The Workarounds'}</h4>
        <div>
          <label className={fieldLabelClass(isDark)}>Eyebrow</label>
          <input type="text" value={meta.workaroundsEyebrow || ''} onChange={(e) => update({ workaroundsEyebrow: e.target.value })} className={inputClass} placeholder="The Industry's Attempts" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Heading prefix</label>
          <input type="text" value={meta.workaroundsHeadingPrefix || ''} onChange={(e) => update({ workaroundsHeadingPrefix: e.target.value })} className={inputClass} placeholder="Workarounds emerged… but data stayed" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Heading highlighted word</label>
          <input type="text" value={meta.workaroundsHighlight || ''} onChange={(e) => update({ workaroundsHighlight: e.target.value })} className={inputClass} placeholder="trapped" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Empty state hint</label>
          <input type="text" value={meta.workaroundsEmptyState || ''} onChange={(e) => update({ workaroundsEmptyState: e.target.value })} className={inputClass} placeholder="Select a workaround to see why it falls short" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Problems panel subtitle</label>
          <input type="text" value={meta.workaroundsFallsShort || ''} onChange={(e) => update({ workaroundsFallsShort: e.target.value })} className={inputClass} placeholder="Why it falls short" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Summary callout (leave blank for default styled version)</label>
          <textarea value={meta.summaryCallout || ''} onChange={(e) => update({ summaryCallout: e.target.value || null })} className={textareaClass} rows={2} placeholder="The problem isn't where data lives… It's whether you can search it all at once." />
        </div>
        {/* Arch items */}
        <div className="grid grid-cols-2 gap-3">
        {[
          { key: 'catalog',    placeholder: 'Metadata Catalog',  subtitlePlaceholder: 'The Dewey Decimal approach' },
          { key: 'warehouse',  placeholder: 'Data Warehouse',    subtitlePlaceholder: 'Rigid structured storage'   },
          { key: 'lake',       placeholder: 'Data Lake',         subtitlePlaceholder: 'Store everything raw'       },
          { key: 'federation', placeholder: 'Federated Search',  subtitlePlaceholder: 'Query translator'           },
        ].map(({ key, placeholder, subtitlePlaceholder }, i) => (
          <div key={key} className={`${editorCardClass(isDark)} space-y-2`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Workaround #{i + 1} ({key})</p>
            <div>
              <label className={faintLabelClass}>Label</label>
              <input
                type="text"
                value={meta.archItems?.[i]?.label || ''}
                onChange={(e) => setArchItem(i, { label: e.target.value })}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
            <div>
              <label className={faintLabelClass}>Subtitle</label>
              <input
                type="text"
                value={meta.archItems?.[i]?.subtitle || ''}
                onChange={(e) => setArchItem(i, { subtitle: e.target.value })}
                className={inputClass}
                placeholder={subtitlePlaceholder}
              />
            </div>
            {[0, 1, 2, 3].map((pi) => (
              <div key={pi}>
                <label className={faintLabelClass}>Problem {pi + 1}</label>
                <input
                  type="text"
                  value={meta.archItems?.[i]?.problems?.[pi] || ''}
                  onChange={(e) => setArchItemProblem(i, pi, e.target.value)}
                  className={inputClass}
                  placeholder={`Problem ${pi + 1}`}
                />
              </div>
            ))}
          </div>
        ))}
        </div>
      </div>

      {/* ── Stage 4 — The Transformation ── */}
      <div className="space-y-3">
        <h4 className={stageHeadingClass}>Stage 5 — {meta.stageLabels?.[4] || 'The Transformation'}</h4>
        <div>
          <label className={fieldLabelClass(isDark)}>Before mesh title (scattered silos view)</label>
          <input type="text" value={meta.siloTitle || ''} onChange={(e) => update({ siloTitle: e.target.value })} className={inputClass} placeholder="What if you could search everywhere without copying anything?" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>After mesh title (connected mesh view)</label>
          <input type="text" value={meta.meshTitle || ''} onChange={(e) => update({ meshTitle: e.target.value })} className={inputClass} placeholder="The Elastic Data Mesh: Query globally, store locally" />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Mesh node labels</label>
          {[{ placeholder: 'Site 1' }, { placeholder: 'Site 2' }, { placeholder: 'Site N' }].map(({ placeholder }, i) => (
            <div key={i} className="mt-1">
              <input
                type="text"
                value={meta.meshNodes?.[i]?.label || ''}
                onChange={(e) => setMeshNode(i, e.target.value)}
                className={inputClass}
                placeholder={placeholder}
              />
            </div>
          ))}
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>Labels for Site 1, Site 2, Site N nodes in the connected mesh diagram</p>
        </div>
      </div>
    </div>
  )
}
