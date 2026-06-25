export default function DataTieringEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['data-tiering'] || {}
  const update = (patch) => onUpdateSceneMetadata('data-tiering', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`

  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`
  const tierLabelClass = `text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`

  const DEFAULT_TIERS = [
    { name: 'Hot', description: 'Real-time analytics', retention: '1-7 days', storage: 'NVMe SSD', latency: 'Milliseconds', useCase: 'Active investigations' },
    { name: 'Warm', description: 'Recent historical', retention: '1-4 weeks', storage: 'SSD', latency: 'Sub-second', useCase: 'Trend analysis' },
    { name: 'Cold', description: 'Searchable archives', retention: '1-12 months', storage: 'HDD', latency: 'Seconds', useCase: 'Audit trails' },
    { name: 'Frozen', description: 'Long-term compliance', retention: '1-7+ years', storage: 'Object Storage', latency: 'Minutes', useCase: 'Forensics' },
  ]
  const TIER_IDS = ['hot', 'warm', 'cold', 'frozen']

  const tiers = (meta.tiers || DEFAULT_TIERS).map((t, i) => ({ ...DEFAULT_TIERS[i], ...t }))
  const setTiers = (next) => update({ tiers: next })
  const setTier = (i, patch) => setTiers(tiers.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_ELASTIC_DISPLAY = {
    hot: { costSymbol: '$$$$', latencyShort: 'Milliseconds', subtitle: 'Real-time indexing & search', suitableFor: 'Dashboards, alerts, active queries', keyBenefit: 'Fastest performance for read/write' },
    warm: { costSymbol: '$$', latencyShort: 'Seconds', subtitle: 'Frequently accessed data', suitableFor: 'Recent historical, trend analysis', keyBenefit: 'Cost-effective, consistent performance' },
    cold: { costSymbol: '$', latencyShort: 'Seconds', subtitle: 'Read-only data', suitableFor: 'Historical lookbacks, audit trails', keyBenefit: 'Single replica, instant queries' },
    frozen: { costSymbol: '¢', latencyShort: 'Minutes', subtitle: 'Searchable archives', suitableFor: 'Compliance, legal hold, deep archives', keyBenefit: 'Searchable snapshots on object storage' },
  }

  const DEFAULT_TRADITIONAL_DISPLAY = {
    hot: { costSymbol: '$$$$$', latencyShort: 'Seconds', subtitle: 'All searchable data here', suitableFor: 'Everything that needs to be queryable', painPoint: 'Expensive to scale' },
    warm: { costSymbol: '$$$$', latencyShort: 'Minutes', subtitle: 'Read-only cache', suitableFor: 'Recently accessed data only', painPoint: 'Limited utility' },
    cold: { costSymbol: '$$$', latencyShort: '24+ hours', subtitle: 'Archive storage', suitableFor: 'Data you hope you never need', painPoint: 'Restore required' },
    frozen: { costSymbol: '$$', latencyShort: 'Days', subtitle: 'Manual rehydration', suitableFor: 'Compliance checkbox only', painPoint: 'Days to access, essentially unusable' },
  }

  const DEFAULT_SIMPLIFIED_DISPLAY = {
    hot: { name: 'Index', costSymbol: '$$$$', latencyShort: '~12 Hours', subtitle: 'Real-time ingest & search', keyBenefit: 'Millisecond queries on live data' },
    warm: { name: 'Search', costSymbol: '$$', latencyShort: '1–3 Days', subtitle: 'Query recent historical data', keyBenefit: 'Sub-second search on warm data' },
    cold: { name: 'Store', costSymbol: '$', latencyShort: '10% Cache', subtitle: 'Cost-efficient object storage', keyBenefit: 'Single replica on object store' },
    frozen: { name: 'Searchable', costSymbol: '¢', latencyShort: '1–365+ Days', subtitle: 'Full search across all archives', keyBenefit: 'Searchable snapshots without restore' },
  }

  const mergeDisplay = (defaults, key) =>
    Object.fromEntries(TIER_IDS.map((id) => [id, { ...defaults[id], ...(meta[key]?.[id] || {}) }]))

  const elasticDisplay = mergeDisplay(DEFAULT_ELASTIC_DISPLAY, 'elasticDisplay')
  const traditionalDisplay = mergeDisplay(DEFAULT_TRADITIONAL_DISPLAY, 'traditionalDisplay')
  const simplifiedDisplay = mergeDisplay(DEFAULT_SIMPLIFIED_DISPLAY, 'simplifiedDisplay')

  const updateDisplay = (key, tierId, patch) =>
    update({ [key]: { ...(meta[key] || {}), [tierId]: { ...(meta[key]?.[tierId] || {}), ...patch } } })

  const DEFAULT_SUBTITLES = {
    default: { accent: 'Hot, warm, cold, frozen.', plain: ' One platform across every stage — pick a path on the right to compare.' },
    elastic: { accent: 'No more restores. No more rehydration.', plain: ' — Search everything, instantly.' },
    simplified: { accent: 'Index. Search. Store.', plain: " — One platform, every stage of your data's life." },
    traditional: { accent: 'Restores required. Data invisible until rehydrated.', plain: ' Resulting in hours to days of waiting.' },
  }

  const updateSubtitle = (mode, field, value) =>
    update({ subtitles: { ...(meta.subtitles || {}), [mode]: { ...(meta.subtitles?.[mode] || {}), [field]: value } } })

  const DEFAULT_TRADITIONAL_OVERLAYS = {
    cold: { title: 'Restore', subtitle: 'On Request' },
    frozen: { title: 'Manual', subtitle: 'Rehydration' },
  }

  const updateOverlay = (tierId, patch) =>
    update({ traditionalOverlays: { ...(meta.traditionalOverlays || {}), [tierId]: { ...(meta.traditionalOverlays?.[tierId] || {}), ...patch } } })

  const DEFAULT_DATA_FLOW = {
    newestLabel: 'Newest Data →',
    oldestLabel: 'Oldest Data →',
  }
  const dataFlow = { ...DEFAULT_DATA_FLOW, ...(meta.dataFlow || {}) }

  const DEFAULT_COMPARISON_SIMPLIFIED = [
    { title: 'Index', description: 'Real-time ingest with millisecond search response' },
    { title: 'Search', description: 'Sub-second queries across recent historical data' },
    { title: 'Store', description: 'Cost-efficient object storage, single replica' },
    { title: 'Searchable', description: 'Full search across snapshots — no rehydration needed' },
  ]
  const DEFAULT_COMPARISON_ELASTIC = [
    { title: 'Searchable Snapshots', description: 'Cold & Frozen data queryable without restore' },
    { title: 'Unlimited Lookback', description: 'Query years of historical data instantly' },
    { title: '50% Storage Savings', description: 'Cold tier uses object store for replicas' },
    { title: 'Never Delete Data', description: 'Frozen tier so cheap you can keep everything' },
  ]
  const DEFAULT_COMPARISON_TRADITIONAL = [
    { title: '24+ Hour Restores', description: 'Cold data requires support ticket to access' },
    { title: 'Data Invisible', description: "Frozen data can't be searched until rehydrated" },
    { title: 'Limited Lookback', description: 'No visibility into historical data' },
    { title: 'Forced Deletion', description: 'Cost forces deletion of valuable data' },
  ]

  const comparisonSimplified = (meta.comparisonSimplified || DEFAULT_COMPARISON_SIMPLIFIED).map((item, i) => ({
    ...DEFAULT_COMPARISON_SIMPLIFIED[i],
    ...item,
  }))
  const comparisonElastic = (meta.comparisonElastic || DEFAULT_COMPARISON_ELASTIC).map((item, i) => ({
    ...DEFAULT_COMPARISON_ELASTIC[i],
    ...item,
  }))
  const comparisonTraditional = (meta.comparisonTraditional || DEFAULT_COMPARISON_TRADITIONAL).map((item, i) => ({
    ...DEFAULT_COMPARISON_TRADITIONAL[i],
    ...item,
  }))

  const setComparison = (key, next) => update({ [key]: next })
  const setComparisonItem = (key, items, i, patch) =>
    setComparison(key, items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_ARCHITECTURE_PATTERNS = [
    { id: 'all', label: 'All Tiers' },
    { id: 'hot-cold-frozen', label: 'Hot → Cold → Frozen' },
    { id: 'hot-frozen', label: 'Hot → Frozen' },
  ]
  const architecturePatterns = (meta.architecturePatterns || DEFAULT_ARCHITECTURE_PATTERNS).map((p, i) => ({
    ...DEFAULT_ARCHITECTURE_PATTERNS[i],
    ...p,
  }))
  const setArchitecturePatterns = (next) => update({ architecturePatterns: next })
  const setArchitecturePattern = (i, patch) =>
    setArchitecturePatterns(architecturePatterns.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_NAV = {
    traditional: 'Traditional',
    elastic: 'Elastic ILM',
    simplified: 'Index / Search / Store',
  }
  const nav = { ...DEFAULT_NAV, ...(meta.nav || {}) }

  const displayFields = (key, display, defaults, tierId, fields) =>
    fields.map(({ field, label }) => (
      <div key={field}>
        <label className={labelClass}>{label}</label>
        <input
          type="text"
          value={display[tierId][field] || ''}
          onChange={(e) => updateDisplay(key, tierId, { [field]: e.target.value })}
          className={inputClass}
          placeholder={defaults[tierId][field] || ''}
        />
      </div>
    ))

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Intelligent Data Lifecycle" />
          </div>
          <div>
            <label className={labelClass}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Your data ages. " />
          </div>
          <div>
            <label className={labelClass}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="Your insights shouldn't wait." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Subtitles (by comparison mode)</h3>
        <div className="space-y-3 mt-3">
          {Object.entries(DEFAULT_SUBTITLES).map(([mode, defaults]) => (
            <div key={mode} className={cardClass}>
              <span className={tierLabelClass}>{mode === 'default' ? 'Initial (no mode selected)' : mode.charAt(0).toUpperCase() + mode.slice(1)}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Accent Text</label>
                  <input
                    type="text"
                    value={meta.subtitles?.[mode]?.accent ?? ''}
                    onChange={(e) => updateSubtitle(mode, 'accent', e.target.value)}
                    className={inputClass}
                    placeholder={defaults.accent}
                  />
                </div>
                <div>
                  <label className={labelClass}>Plain Text</label>
                  <input
                    type="text"
                    value={meta.subtitles?.[mode]?.plain ?? ''}
                    onChange={(e) => updateSubtitle(mode, 'plain', e.target.value)}
                    className={inputClass}
                    placeholder={defaults.plain}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Tier Definitions</h3>
        <div className="space-y-3 mt-3">
          {tiers.map((tier, i) => (
            <div key={TIER_IDS[i]} className={cardClass}>
              <span className={tierLabelClass}>{DEFAULT_TIERS[i].name}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" value={tier.name || ''} onChange={(e) => setTier(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].name} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <input type="text" value={tier.description || ''} onChange={(e) => setTier(i, { description: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].description} />
                </div>
                <div>
                  <label className={labelClass}>Retention</label>
                  <input type="text" value={tier.retention || ''} onChange={(e) => setTier(i, { retention: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].retention} />
                </div>
                <div>
                  <label className={labelClass}>Storage</label>
                  <input type="text" value={tier.storage || ''} onChange={(e) => setTier(i, { storage: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].storage} />
                </div>
                <div>
                  <label className={labelClass}>Latency</label>
                  <input type="text" value={tier.latency || ''} onChange={(e) => setTier(i, { latency: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].latency} />
                </div>
                <div>
                  <label className={labelClass}>Use Case</label>
                  <input type="text" value={tier.useCase || ''} onChange={(e) => setTier(i, { useCase: e.target.value })} className={inputClass} placeholder={DEFAULT_TIERS[i].useCase} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Elastic ILM Display (per tier)</h3>
        <div className="space-y-3 mt-3">
          {TIER_IDS.map((tierId) => (
            <div key={tierId} className={cardClass}>
              <span className={tierLabelClass}>{tierId.charAt(0).toUpperCase() + tierId.slice(1)}</span>
              <div className="space-y-2">
                {displayFields('elasticDisplay', elasticDisplay, DEFAULT_ELASTIC_DISPLAY, tierId, [
                  { field: 'costSymbol', label: 'Cost Symbol' },
                  { field: 'latencyShort', label: 'Latency Label' },
                  { field: 'subtitle', label: 'Subtitle' },
                  { field: 'suitableFor', label: 'Suitable For' },
                  { field: 'keyBenefit', label: 'Key Benefit' },
                ])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Traditional Display (per tier)</h3>
        <div className="space-y-3 mt-3">
          {TIER_IDS.map((tierId) => (
            <div key={tierId} className={cardClass}>
              <span className={tierLabelClass}>{tierId.charAt(0).toUpperCase() + tierId.slice(1)}</span>
              <div className="space-y-2">
                {displayFields('traditionalDisplay', traditionalDisplay, DEFAULT_TRADITIONAL_DISPLAY, tierId, [
                  { field: 'costSymbol', label: 'Cost Symbol' },
                  { field: 'latencyShort', label: 'Latency Label' },
                  { field: 'subtitle', label: 'Subtitle' },
                  { field: 'suitableFor', label: 'Suitable For' },
                  { field: 'painPoint', label: 'Pain Point' },
                ])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Simplified Display (per tier)</h3>
        <div className="space-y-3 mt-3">
          {TIER_IDS.map((tierId) => (
            <div key={tierId} className={cardClass}>
              <span className={tierLabelClass}>{tierId.charAt(0).toUpperCase() + tierId.slice(1)}</span>
              <div className="space-y-2">
                {displayFields('simplifiedDisplay', simplifiedDisplay, DEFAULT_SIMPLIFIED_DISPLAY, tierId, [
                  { field: 'name', label: 'Name' },
                  { field: 'costSymbol', label: 'Cost Symbol' },
                  { field: 'latencyShort', label: 'Latency Label' },
                  { field: 'subtitle', label: 'Subtitle' },
                  { field: 'keyBenefit', label: 'Key Benefit' },
                ])}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Traditional Tier Overlays</h3>
        <div className="space-y-3 mt-3">
          {['cold', 'frozen'].map((tierId) => (
            <div key={tierId} className={cardClass}>
              <span className={tierLabelClass}>{tierId.charAt(0).toUpperCase() + tierId.slice(1)}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={meta.traditionalOverlays?.[tierId]?.title ?? ''}
                    onChange={(e) => updateOverlay(tierId, { title: e.target.value })}
                    className={inputClass}
                    placeholder={DEFAULT_TRADITIONAL_OVERLAYS[tierId].title}
                  />
                </div>
                <div>
                  <label className={labelClass}>Subtitle</label>
                  <input
                    type="text"
                    value={meta.traditionalOverlays?.[tierId]?.subtitle ?? ''}
                    onChange={(e) => updateOverlay(tierId, { subtitle: e.target.value })}
                    className={inputClass}
                    placeholder={DEFAULT_TRADITIONAL_OVERLAYS[tierId].subtitle}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Data Flow Legend</h3>
        <div className={`space-y-2 mt-3 ${cardClass}`}>
          <div>
            <label className={labelClass}>Newest Data Label</label>
            <input
              type="text"
              value={dataFlow.newestLabel}
              onChange={(e) => update({ dataFlow: { ...dataFlow, newestLabel: e.target.value } })}
              className={inputClass}
              placeholder={DEFAULT_DATA_FLOW.newestLabel}
            />
          </div>
          <div>
            <label className={labelClass}>Oldest Data Label</label>
            <input
              type="text"
              value={dataFlow.oldestLabel}
              onChange={(e) => update({ dataFlow: { ...dataFlow, oldestLabel: e.target.value } })}
              className={inputClass}
              placeholder={DEFAULT_DATA_FLOW.oldestLabel}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Comparison Panel — Simplified</h3>
        <div className="space-y-3 mt-3">
          {comparisonSimplified.map((card, i) => (
            <div key={i} className={cardClass}>
              <span className={tierLabelClass}>Card {i + 1}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input type="text" value={card.title || ''} onChange={(e) => setComparisonItem('comparisonSimplified', comparisonSimplified, i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_COMPARISON_SIMPLIFIED[i].title} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={3} value={card.description || ''} onChange={(e) => setComparisonItem('comparisonSimplified', comparisonSimplified, i, { description: e.target.value })} className={textareaClass} placeholder={DEFAULT_COMPARISON_SIMPLIFIED[i].description} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Comparison Panel — Elastic ILM</h3>
        <div className="space-y-3 mt-3">
          {comparisonElastic.map((card, i) => (
            <div key={i} className={cardClass}>
              <span className={tierLabelClass}>Card {i + 1}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input type="text" value={card.title || ''} onChange={(e) => setComparisonItem('comparisonElastic', comparisonElastic, i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_COMPARISON_ELASTIC[i].title} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={3} value={card.description || ''} onChange={(e) => setComparisonItem('comparisonElastic', comparisonElastic, i, { description: e.target.value })} className={textareaClass} placeholder={DEFAULT_COMPARISON_ELASTIC[i].description} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Comparison Panel — Traditional</h3>
        <div className="space-y-3 mt-3">
          {comparisonTraditional.map((card, i) => (
            <div key={i} className={cardClass}>
              <span className={tierLabelClass}>Card {i + 1}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Title</label>
                  <input type="text" value={card.title || ''} onChange={(e) => setComparisonItem('comparisonTraditional', comparisonTraditional, i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_COMPARISON_TRADITIONAL[i].title} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={3} value={card.description || ''} onChange={(e) => setComparisonItem('comparisonTraditional', comparisonTraditional, i, { description: e.target.value })} className={textareaClass} placeholder={DEFAULT_COMPARISON_TRADITIONAL[i].description} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Side Navigation</h3>
        <div className={`space-y-2 mt-3 ${cardClass}`}>
          <div>
            <label className={labelClass}>Traditional Tooltip</label>
            <input type="text" value={nav.traditional} onChange={(e) => update({ nav: { ...nav, traditional: e.target.value } })} className={inputClass} placeholder={DEFAULT_NAV.traditional} />
          </div>
          <div>
            <label className={labelClass}>Elastic ILM Tooltip</label>
            <input type="text" value={nav.elastic} onChange={(e) => update({ nav: { ...nav, elastic: e.target.value } })} className={inputClass} placeholder={DEFAULT_NAV.elastic} />
          </div>
          <div>
            <label className={labelClass}>Simplified Tooltip</label>
            <input type="text" value={nav.simplified} onChange={(e) => update({ nav: { ...nav, simplified: e.target.value } })} className={inputClass} placeholder={DEFAULT_NAV.simplified} />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Architecture Patterns (Elastic mode)</h3>
        <div className="space-y-3 mt-3">
          {architecturePatterns.map((pattern, i) => (
            <div key={pattern.id} className={cardClass}>
              <span className={tierLabelClass}>{DEFAULT_ARCHITECTURE_PATTERNS[i].label}</span>
              <div>
                <label className={labelClass}>Label</label>
                <input type="text" value={pattern.label || ''} onChange={(e) => setArchitecturePattern(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_ARCHITECTURE_PATTERNS[i].label} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
