import { fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

const DEFAULT_TOOLS = [
  { name: 'Splunk',      category: 'SIEM',      type: 'consolidate' },
  { name: 'QRadar',      category: 'SIEM',      type: 'consolidate' },
  { name: 'Datadog',     category: 'APM',       type: 'consolidate' },
  { name: 'CrowdStrike', category: 'EDR',       type: 'consolidate' },
  { name: 'Snowflake',   category: 'Data',      type: 'consolidate' },
  { name: 'Pinecone',    category: 'Vector',    type: 'consolidate' },
  { name: 'Palo Alto',   category: 'Firewall',  type: 'integrate'   },
  { name: 'Okta',        category: 'Identity',  type: 'integrate'   },
  { name: 'ServiceNow',  category: 'ITSM',      type: 'integrate'   },
  { name: 'Tines',       category: 'SOAR',      type: 'integrate'   },
  { name: 'Zscaler',     category: 'ZeroTrust', type: 'integrate'   },
  { name: 'Databricks',  category: 'Analytics', type: 'integrate'   },
]

function ConsolidationToolEditor({ metadata, onUpdate, isDark, inputClass }) {
  const tools = metadata.tools || DEFAULT_TOOLS

  const updateTool = (index, field, value) => {
    const updated = tools.map((t, i) => i === index ? { ...t, [field]: value } : t)
    onUpdate(updated)
  }

  const resetTools = () => onUpdate(DEFAULT_TOOLS)

  const labelClass = fieldLabelClass(isDark)
  const toolInputClass = `w-full px-2 py-1 text-xs rounded border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'}`
  const toolCardClass = `p-2 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10'}`

  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Tools ({tools.length}/12)</label>
        <button onClick={resetTools} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'text-white/40 hover:text-white/70' : 'text-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'}`}>
          Reset defaults
        </button>
      </div>

      <div className="space-y-4">
        {/* Replace row */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Replace</p>
          <div className="grid grid-cols-6 gap-2">
            {tools.map((tool, i) => tool.type !== 'consolidate' ? null : (
              <div key={i} className={toolCardClass}>
                <input
                  type="text"
                  value={tool.name}
                  onChange={(e) => updateTool(i, 'name', e.target.value)}
                  placeholder="Tool name"
                  className={`${toolInputClass} mb-1.5`}
                />
                <input
                  type="text"
                  value={tool.category}
                  onChange={(e) => updateTool(i, 'category', e.target.value)}
                  placeholder="Category"
                  className={toolInputClass}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Integrate row */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Integrate</p>
          <div className="grid grid-cols-6 gap-2">
            {tools.map((tool, i) => tool.type !== 'integrate' ? null : (
              <div key={i} className={toolCardClass}>
                <input
                  type="text"
                  value={tool.name}
                  onChange={(e) => updateTool(i, 'name', e.target.value)}
                  placeholder="Tool name"
                  className={`${toolInputClass} mb-1.5`}
                />
                <input
                  type="text"
                  value={tool.category}
                  onChange={(e) => updateTool(i, 'category', e.target.value)}
                  placeholder="Category"
                  className={toolInputClass}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

const PAIN_POINT_DEFAULTS = [
  'Multiple licenses & contracts',
  'Data silos & duplication',
  'Context switching',
  'Integration overhead',
  'Inconsistent alerting',
]

const BENEFIT_TEXT_DEFAULTS = [
  'Reduced licensing costs',
  'Faster triage & response',
  'Unified data layer',
  'No data duplication',
  'Shared context',
]

export default function ConsolidationEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.consolidation || {}
  const update = (patch) => onUpdateSceneMetadata('consolidation', { ...meta, ...patch })

  const setPainPoint = (i, value) => {
    const current = meta.painPoints || []
    const updated = [...current]
    updated[i] = value
    update({ painPoints: updated })
  }

  const setBenefitText = (i, value) => {
    const current = meta.benefitTexts || []
    const updated = [...current]
    updated[i] = value
    update({ benefitTexts: updated })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Consolidation Scene — Header
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Unified Platform"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Plain</label>
        <input
          type="text"
          value={meta.headingPlain || ''}
          onChange={(e) => update({ headingPlain: e.target.value })}
          className={inputClass}
          placeholder="Consolidate Point Solutions, "
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Heading — Accent</label>
        <input
          type="text"
          value={meta.headingAccent || ''}
          onChange={(e) => update({ headingAccent: e.target.value })}
          className={inputClass}
          placeholder="Centralize Data Workflows"
        />
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Subtitle</label>
        <textarea
          value={meta.subtitle || ''}
          onChange={(e) => update({ subtitle: e.target.value })}
          className={textareaClass}
          rows={2}
          placeholder="Comprehensive capabilities to replace disparate tools while integrating with your broader ecosystem"
        />
      </div>

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        Before State (Tool Sprawl)
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Sidebar Title</label>
        <input
          type="text"
          value={meta.beforeTitle || ''}
          onChange={(e) => update({ beforeTitle: e.target.value })}
          className={inputClass}
          placeholder="Tool Sprawl"
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass(isDark)}>Pain Points (5 items)</label>
        {PAIN_POINT_DEFAULTS.map((defaultVal, i) => (
          <input
            key={i}
            type="text"
            value={meta.painPoints?.[i] || ''}
            onChange={(e) => setPainPoint(i, e.target.value)}
            className={inputClass}
            placeholder={defaultVal}
          />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={fieldLabelClass(isDark)}>Stat Value</label>
          <input
            type="text"
            value={meta.beforeStatValue || ''}
            onChange={(e) => update({ beforeStatValue: e.target.value })}
            className={inputClass}
            placeholder="76+"
          />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Stat Label</label>
          <input
            type="text"
            value={meta.beforeStatLabel || ''}
            onChange={(e) => update({ beforeStatLabel: e.target.value })}
            className={inputClass}
            placeholder="Avg. security tools per org"
          />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Stat Source</label>
          <input
            type="text"
            value={meta.beforeStatSource || ''}
            onChange={(e) => update({ beforeStatSource: e.target.value })}
            className={inputClass}
            placeholder="IBM / Palo Alto Networks"
          />
        </div>
      </div>

      <div>
        <label className={fieldLabelClass(isDark)}>Chaos Label</label>
        <input
          type="text"
          value={meta.chaosLabel || ''}
          onChange={(e) => update({ chaosLabel: e.target.value })}
          className={inputClass}
          placeholder="Disconnected tools • Duplicated data • Fragmented workflows"
        />
      </div>

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        After State (With Elastic)
      </h3>

      <div>
        <label className={fieldLabelClass(isDark)}>Sidebar Title</label>
        <input
          type="text"
          value={meta.afterTitle || ''}
          onChange={(e) => update({ afterTitle: e.target.value })}
          className={inputClass}
          placeholder="With Elastic"
        />
      </div>

      <div className="space-y-2">
        <label className={fieldLabelClass(isDark)}>Benefit Text (5 items)</label>
        {BENEFIT_TEXT_DEFAULTS.map((defaultVal, i) => (
          <input
            key={i}
            type="text"
            value={meta.benefitTexts?.[i] || ''}
            onChange={(e) => setBenefitText(i, e.target.value)}
            className={inputClass}
            placeholder={defaultVal}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={fieldLabelClass(isDark)}>Stat Value</label>
          <input
            type="text"
            value={meta.afterStatValue || ''}
            onChange={(e) => update({ afterStatValue: e.target.value })}
            className={inputClass}
            placeholder="3-5"
          />
        </div>
        <div>
          <label className={fieldLabelClass(isDark)}>Stat Label</label>
          <input
            type="text"
            value={meta.afterStatLabel || ''}
            onChange={(e) => update({ afterStatLabel: e.target.value })}
            className={inputClass}
            placeholder="Vendors eliminated on average"
          />
        </div>
      </div>

      <h3 className={`${sectionTitleClass(isDark)} pt-2`}>
        Consolidation Scene — Tools
      </h3>
      <ConsolidationToolEditor
        metadata={meta}
        onUpdate={(tools) => update({ tools })}
        isDark={isDark}
        inputClass={inputClass}
      />
    </div>
  )
}
