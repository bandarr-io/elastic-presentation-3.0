import { editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'

export default function CrossClusterEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['cross-cluster'] || {}
  const update = (patch) => onUpdateSceneMetadata('cross-cluster', { ...meta, ...patch })

  const subsectionClass = `text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const faintLabelClass = `text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const softCardClass = `p-3 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.03]'}`

  const updateBenefit = (i, field, value) => {
    const benefits = [...(meta.benefits || [])]
    benefits[i] = { ...(benefits[i] || {}), [field]: value }
    update({ benefits })
  }

  const updateCluster = (i, field, value) => {
    const clusters = [...(meta.clusters || [])]
    clusters[i] = { ...(clusters[i] || {}), [field]: value }
    update({ clusters })
  }

  const updateSite = (i, patch) => {
    const sites = [...(meta.sites || [])]
    sites[i] = { ...(sites[i] || {}), ...patch }
    update({ sites })
  }

  return (
    <div className="space-y-6 mt-6">
      <h3 className={sectionTitleClass(isDark)}>
        Cross-Cluster Content
      </h3>

      {/* Header */}
      <div>
        <label className={fieldLabelClass(isDark)}>Eyebrow Text</label>
        <input
          type="text"
          value={meta.eyebrow || ''}
          onChange={(e) => update({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Distributed Architecture"
        />
      </div>
      <div>
        <label className={fieldLabelClass(isDark)}>Title Part 1 (plain)</label>
        <input
          type="text"
          value={meta.titlePart1 || ''}
          onChange={(e) => update({ titlePart1: e.target.value })}
          className={inputClass}
          placeholder="Distributed by Design, "
        />
      </div>
      <div>
        <label className={fieldLabelClass(isDark)}>Title Part 2 (accent colour)</label>
        <input
          type="text"
          value={meta.titlePart2 || ''}
          onChange={(e) => update({ titlePart2: e.target.value })}
          className={inputClass}
          placeholder="Connected by Elastic"
        />
      </div>

      {/* Benefit cards */}
      <div>
        <h4 className={subsectionClass}>
          Benefit Cards
        </h4>
        <div className="grid grid-cols-2 gap-3">
        {[
          { defaultText: 'Search across all data',        defaultHighlight: 'limit data transfer costs'  },
          { defaultText: 'Data privacy & sovereignty',    defaultHighlight: 'global compliance'          },
          { defaultText: 'Faster, more responsive',       defaultHighlight: 'reduced app latency'        },
          { defaultText: 'High availability for DR',      defaultHighlight: 'business continuity'        },
          { defaultText: 'Seamless hybrid & multi-cloud', defaultHighlight: 'deployment flexibility'     },
        ].map((defaults, i) => (
          <div key={`cc-benefit-${i}`} className={softCardClass}>
            <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Card #{i + 1}</p>
            <div className="space-y-2">
              <div>
                <label className={faintLabelClass}>Main text</label>
                <input
                  type="text"
                  value={meta.benefits?.[i]?.text || ''}
                  onChange={(e) => updateBenefit(i, 'text', e.target.value)}
                  className={inputClass}
                  placeholder={defaults.defaultText}
                />
              </div>
              <div>
                <label className={faintLabelClass}>Highlight text</label>
                <input
                  type="text"
                  value={meta.benefits?.[i]?.highlight || ''}
                  onChange={(e) => updateBenefit(i, 'highlight', e.target.value)}
                  className={inputClass}
                  placeholder={defaults.defaultHighlight}
                />
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* ── Stage 0: Remote Clusters ───────────────────────────────────── */}
      <div>
        <h4 className={subsectionClass}>
          Remote Clusters (Stage 0)
        </h4>
        <div className="grid grid-cols-4 gap-3">
        {[
          { defaultLabel: 'elastic', defaultName: 'On-Prem', defaultType: 'onprem' },
          { defaultLabel: 'elastic', defaultName: 'AWS',     defaultType: 'cloud'  },
          { defaultLabel: 'elastic', defaultName: 'GCP',     defaultType: 'cloud'  },
          { defaultLabel: 'elastic', defaultName: 'Azure',   defaultType: 'cloud'  },
        ].map((defaults, i) => (
          <div key={`cc-cluster-${i}`} className={softCardClass}>
            <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Cluster #{i + 1}</p>
            <div className="space-y-2">
              <div>
                <label className={faintLabelClass}>Label (e.g. "elastic")</label>
                <input
                  type="text"
                  value={meta.clusters?.[i]?.label || ''}
                  onChange={(e) => updateCluster(i, 'label', e.target.value)}
                  className={inputClass}
                  placeholder={defaults.defaultLabel}
                />
              </div>
              <div>
                <label className={faintLabelClass}>Name badge (e.g. "On-Prem")</label>
                <input
                  type="text"
                  value={meta.clusters?.[i]?.name || ''}
                  onChange={(e) => updateCluster(i, 'name', e.target.value)}
                  className={inputClass}
                  placeholder={defaults.defaultName}
                />
              </div>
              <div>
                <label className={faintLabelClass}>Icon</label>
                <select
                  value={meta.clusters?.[i]?.type || defaults.defaultType}
                  onChange={(e) => updateCluster(i, 'type', e.target.value)}
                  className={inputClass}
                >
                  <option value="cloud">Cloud</option>
                  <option value="onprem">Building (On-Prem)</option>
                  <option value="server">Server</option>
                  <option value="database">Database</option>
                  <option value="network">Network</option>
                </select>
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* ── Stage 1: In Practice ──────────────────────────────────── */}
      <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
        <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
          Stage 1: In Practice
        </h4>

        <div>
          <label className={fieldLabelClass(isDark)}>Hub Name</label>
          <input
            type="text"
            value={meta.stage1HubName || ''}
            onChange={(e) => update({ stage1HubName: e.target.value })}
            className={inputClass}
            placeholder="Your Organization"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Hub Subtitle</label>
          <input
            type="text"
            value={meta.stage1HubSubtitle || ''}
            onChange={(e) => update({ stage1HubSubtitle: e.target.value })}
            className={inputClass}
            placeholder="Main Elastic Cluster"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Search Query</label>
          <input
            type="text"
            value={meta.stage1Query || ''}
            onChange={(e) => update({ stage1Query: e.target.value })}
            className={inputClass}
            placeholder="GET _remote/*:logs-*/_search"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Number of Sites</label>
          <select
            value={meta.siteCount || '7'}
            onChange={(e) => update({ siteCount: e.target.value })}
            className={inputClass}
          >
            {[2, 3, 4, 5, 6, 7, 8].map(n => (
              <option key={n} value={String(n)}>{n} sites</option>
            ))}
          </select>
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
            2–4 sites appear in a single row. 5–8 sites use two rows.
          </p>
        </div>
      </div>

      {/* Stage 1 site list */}
      <div>
        <h4 className={subsectionClass}>
          Sites (Stage 1)
        </h4>
        <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: parseInt(meta.siteCount || '7') }, (_, i) => {
          const defaultNames    = ['HQ Data Center', 'AWS us-east-1', 'Azure West EU', 'GCP Asia Pacific', 'DR Backup', 'Edge — LATAM', 'On-Prem EU']
          const defaultRegions  = ['US-East', 'US-East', 'EU-West', 'APAC', 'US-West', 'SA-East', 'EU-East']
          const defaultDocs     = ['2.4M', '8.1M', '3.7M', '1.9M', '2.4M', '0.9M', '1.5M']
          const site = meta.sites?.[i] || {}
          return (
            <div key={`site-${i}`} className={`${editorCardClass(isDark)} space-y-2`}>
              <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Site {i + 1}</p>
              <div>
                <label className={faintLabelClass}>Name</label>
                <input type="text" value={site.name || ''} onChange={(e) => updateSite(i, { name: e.target.value })} className={inputClass} placeholder={defaultNames[i] ?? `Site ${i + 1}`} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={faintLabelClass}>Type</label>
                  <select value={site.type || 'cloud'} onChange={(e) => updateSite(i, { type: e.target.value })} className={inputClass}>
                    <option value="cloud">Cloud</option>
                    <option value="onprem">On-Prem</option>
                    <option value="server">Server</option>
                    <option value="database">Database</option>
                    <option value="network">Network</option>
                  </select>
                </div>
                <div>
                  <label className={faintLabelClass}>Region</label>
                  <input type="text" value={site.region || ''} onChange={(e) => updateSite(i, { region: e.target.value })} className={inputClass} placeholder={defaultRegions[i] ?? 'Global'} />
                </div>
              </div>
              <div>
                <label className={faintLabelClass}>Doc Count</label>
                <input type="text" value={site.docs || ''} onChange={(e) => updateSite(i, { docs: e.target.value })} className={inputClass} placeholder={defaultDocs[i] ?? '1.0M'} />
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
