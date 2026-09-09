import { editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import IconSelect from './IconSelect'

const CARD_DEFAULTS = [
  { index: 0, defaultTitle: 'Risk Reduction', defaultDesc: 'Reduce likelihood & severity of threats', defaultDetail: 'Elastic helps reduce your attack surface, detect threats faster, and improve your overall security posture.', defaultIcon: 'shield' },
  { index: 1, defaultTitle: 'Time Efficiency', defaultDesc: 'Do more with less', defaultDetail: 'Elastic helps you automate manual tasks, streamline workflows, and get insights faster so your teams can focus on what matters most.', defaultIcon: 'clock' },
  { index: 2, defaultTitle: 'Resilience', defaultDesc: 'Respond & recover faster', defaultDetail: 'Elastic helps you quickly identify and resolve issues, minimize downtime, and maintain business continuity even during incidents.', defaultIcon: 'rocket' },
  { index: 3, defaultTitle: 'Cost Savings', defaultDesc: 'Reduce expenses & prevent losses', defaultDetail: 'Elastic helps you consolidate tools, optimize resource usage, and prevent costly security breaches and operational incidents.', defaultIcon: 'coins' },
]

export default function BusinessValueEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['business-value'] || {}
  const update = (patch) => onUpdateSceneMetadata('business-value', { ...meta, ...patch })

  const hintClass = `text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`
  const subLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const subheadingClass = `text-sm font-semibold mb-3 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`
  const cardHeadingClass = `text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`

  const cards = meta.cards || []
  const updateCard = (index, field, value) => {
    const updated = [...cards]
    updated[index] = { ...(updated[index] || {}), [field]: value }
    update({ cards: updated })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Business Value Content
      </h3>

      {/* Header */}
      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Business Value"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Title</label>
        <input
          type="text"
          value={meta.title || ''}
          onChange={(e) => update({ title: e.target.value })}
          className={inputClass}
          placeholder="Delivering Measurable"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Title Highlight</label>
        <input
          type="text"
          value={meta.titleHighlight || ''}
          onChange={(e) => update({ titleHighlight: e.target.value })}
          className={inputClass}
          placeholder="Business Value"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Subtitle</label>
        <input
          type="text"
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="Elastic helps organizations in four key areas."
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Summary Message</label>
        <input
          type="text"
          value={meta.summaryText || ''}
          onChange={(e) => update({ summaryText: e.target.value })}
          className={inputClass}
          placeholder="Elastic delivers tangible impact across all four areas with a unified platform."
        />
        <p className={hintClass}>
          Appears after all four cards have been clicked
        </p>
      </div>

      {/* Value Cards */}
      <div>
        <h4 className={subheadingClass}>Value Cards</h4>
        <div className="grid grid-cols-2 gap-3">
          {CARD_DEFAULTS.map(({ index, defaultTitle, defaultDesc, defaultDetail, defaultIcon }) => (
            <div key={index} className={editorCardClass(isDark)}>
              <p className={cardHeadingClass}>Card #{index + 1}</p>
              <div className="space-y-2">
                <IconSelect
                  value={typeof cards[index]?.icon === 'string' ? cards[index].icon : defaultIcon}
                  onChange={(name) => updateCard(index, 'icon', name)}
                  inputClass={inputClass}
                  isDark={isDark}
                />
                <div>
                  <label className={subLabelClass}>Title</label>
                  <input type="text" value={cards[index]?.title || ''} onChange={(e) => updateCard(index, 'title', e.target.value)} className={inputClass} placeholder={defaultTitle} />
                </div>
                <div>
                  <label className={subLabelClass}>Description</label>
                  <input type="text" value={cards[index]?.description || ''} onChange={(e) => updateCard(index, 'description', e.target.value)} className={inputClass} placeholder={defaultDesc} />
                </div>
                <div>
                  <label className={subLabelClass}>Detail Text</label>
                  <input type="text" value={cards[index]?.detailText || ''} onChange={(e) => updateCard(index, 'detailText', e.target.value)} className={inputClass} placeholder={defaultDetail} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
