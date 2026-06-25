export default function LicensingEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['licensing'] || {}
  const update = (patch) => onUpdateSceneMetadata('licensing', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const DEFAULT_NO_HIDDEN_COSTS = ['No ingestion charges', 'No per-user fees', 'No data caps']
  const noHiddenCostsItems = meta.noHiddenCostsItems || DEFAULT_NO_HIDDEN_COSTS
  const setNoHiddenCostsItems = (next) => update({ noHiddenCostsItems: next })

  const DEFAULT_FREE_OPEN_FEATURES = [
    { name: 'Elasticsearch', desc: 'Distributed search & analytics' },
    { name: 'Kibana', desc: 'Visualize & explore data' },
    { name: 'Logstash', desc: 'Ingest & transform data' },
    { name: 'Elastic Agent', desc: 'Unified data collection' },
    { name: 'Security', desc: 'Protect your data' },
    { name: 'Observability', desc: 'Monitor everything' },
    { name: 'Full-text & Vector Search', desc: 'Find anything, fast' },
    { name: 'Community Support', desc: 'Global community' },
  ]
  const freeOpenFeatures = meta.freeOpenFeatures || DEFAULT_FREE_OPEN_FEATURES
  const setFreeOpenFeatures = (next) => update({ freeOpenFeatures: next })
  const setFreeOpenFeature = (i, patch) =>
    setFreeOpenFeatures(freeOpenFeatures.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_ENTERPRISE_FEATURES = [
    { name: 'Enterprise Support', desc: '24/7 expert help' },
    { name: 'Cross Cluster Search', desc: 'Global data access' },
    { name: 'Searchable Snapshots', desc: 'Cost-effective searchable storage' },
    { name: 'Agent Builder', desc: 'Create custom agents' },
    { name: 'AutoOps', desc: 'Supercharged Elasticstack Monitoring' },
    { name: 'Workflows', desc: 'Orchestrate processes' },
    { name: 'Maps & Geospatial', desc: 'Location intelligence' },
    { name: 'Single Sign-On', desc: 'Seamless authentication' },
    { name: 'LDAP/AD/SAML', desc: 'Identity provider integration' },
    { name: 'Field Level Security', desc: 'Granular access control' },
    { name: 'Encryption at Rest', desc: 'Data protection' },
    { name: 'Auditing', desc: 'Complete audit trails' },
    { name: 'Machine Learning', desc: 'Anomaly detection & more' },
    { name: 'Orchestration (ECE/ECK)', desc: 'Self-managed deployments' },
    { name: 'Cloud Security Posture', desc: 'K8s & cloud monitoring' },
    { name: 'Threat Intelligence', desc: 'Proactive defense' },
    { name: 'AI Assistant', desc: 'Intelligent assistance' },
    { name: 'AIOps', desc: 'Automated operations' },
    { name: 'Reciprocal Rank Fusion', desc: 'Hybrid search ranking' },
    { name: 'Semantic Search', desc: 'Understand meaning' },
    { name: 'GenAI Integrations', desc: 'AI-powered experiences' },
    { name: 'ELSER', desc: 'Semantic understanding' },
    { name: 'Integrations', desc: '400+ data sources' },
    { name: 'And More...', desc: 'Additional features' },
  ]
  const enterpriseFeatures = meta.enterpriseFeatures || DEFAULT_ENTERPRISE_FEATURES
  const setEnterpriseFeatures = (next) => update({ enterpriseFeatures: next })
  const setEnterpriseFeature = (i, patch) =>
    setEnterpriseFeatures(enterpriseFeatures.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const renderFeatureList = (items, defaults, setItems, setItem, addLabel) => (
    <div className="space-y-2">
      {items.map((feature, i) => (
        <div key={i} className={cardClass}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
              Item {i + 1}
            </span>
            {items.length > 1 && (
              <button type="button" className={removeBtnClass} onClick={() => setItems(items.filter((_, idx) => idx !== i))}>
                Remove
              </button>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
              <input
                type="text"
                value={feature.name || ''}
                onChange={(e) => setItem(i, { name: e.target.value })}
                className={inputClass}
                placeholder={defaults[i]?.name || 'Feature name'}
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
              <input
                type="text"
                value={feature.desc || ''}
                onChange={(e) => setItem(i, { desc: e.target.value })}
                className={inputClass}
                placeholder={defaults[i]?.desc || 'Feature description'}
              />
            </div>
          </div>
        </div>
      ))}
      <button type="button" className={addBtnClass} onClick={() => setItems([...items, { name: '', desc: '' }])}>
        {addLabel}
      </button>
    </div>
  )

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Licensing" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="One License. " />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="Full Power." />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="One software SKU. No add-ons. No data caps." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Power Gauge</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Platform Unlocked Label</label>
            <input type="text" value={meta.platformUnlockedLabel || ''} onChange={(e) => update({ platformUnlockedLabel: e.target.value })} className={inputClass} placeholder="Platform Unlocked" />
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>No Hidden Costs Items</label>
            <div className="space-y-2">
              {noHiddenCostsItems.map((item, i) => (
                <div key={i} className={cardClass}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                    {noHiddenCostsItems.length > 1 && (
                      <button type="button" className={removeBtnClass} onClick={() => setNoHiddenCostsItems(noHiddenCostsItems.filter((_, idx) => idx !== i))}>
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => setNoHiddenCostsItems(noHiddenCostsItems.map((x, idx) => (idx === i ? e.target.value : x)))}
                    className={inputClass}
                    placeholder={DEFAULT_NO_HIDDEN_COSTS[i] || 'Cost benefit'}
                  />
                </div>
              ))}
              <button type="button" className={addBtnClass} onClick={() => setNoHiddenCostsItems([...noHiddenCostsItems, ''])}>
                + Add Item
              </button>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>License Toggle</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Select License Label</label>
            <input type="text" value={meta.selectLicenseLabel || ''} onChange={(e) => update({ selectLicenseLabel: e.target.value })} className={inputClass} placeholder="Select License" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Free & Open Tier Name</label>
            <input type="text" value={meta.freeOpenTierName || ''} onChange={(e) => update({ freeOpenTierName: e.target.value })} className={inputClass} placeholder="Free & Open" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Enterprise Tier Name</label>
            <input type="text" value={meta.enterpriseTierName || ''} onChange={(e) => update({ enterpriseTierName: e.target.value })} className={inputClass} placeholder="Enterprise" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Footnote</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Line 1</label>
            <input type="text" value={meta.footnoteLine1 || ''} onChange={(e) => update({ footnoteLine1: e.target.value })} className={inputClass} placeholder="Full feature comparison at" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Line 2</label>
            <input type="text" value={meta.footnoteLine2 || ''} onChange={(e) => update({ footnoteLine2: e.target.value })} className={inputClass} placeholder="elastic.co/subscriptions" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Free & Open Section</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Section Subtitle</label>
            <input type="text" value={meta.freeOpenSectionSubtitle || ''} onChange={(e) => update({ freeOpenSectionSubtitle: e.target.value })} className={inputClass} placeholder="— Always included" />
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Features</label>
            {renderFeatureList(freeOpenFeatures, DEFAULT_FREE_OPEN_FEATURES, setFreeOpenFeatures, setFreeOpenFeature, '+ Add Free & Open Feature')}
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Enterprise Section</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Section Subtitle</label>
            <input type="text" value={meta.enterpriseSectionSubtitle || ''} onChange={(e) => update({ enterpriseSectionSubtitle: e.target.value })} className={inputClass} placeholder="— Unlock full potential" />
          </div>
          <div>
            <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Features</label>
            {renderFeatureList(enterpriseFeatures, DEFAULT_ENTERPRISE_FEATURES, setEnterpriseFeatures, setEnterpriseFeature, '+ Add Enterprise Feature')}
          </div>
        </div>
      </div>
    </div>
  )
}
