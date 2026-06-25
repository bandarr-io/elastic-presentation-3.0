import IconSelect from './IconSelect'

export default function ElasticValueEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['elastic-value'] || {}
  const update = (patch) => onUpdateSceneMetadata('elastic-value', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const DEFAULT_HERO_STATS = [
    { value: '720B', label: 'Documents stored & searchable' },
    { value: '640TB', label: 'Total data under management' },
    { value: '99.99%', label: 'Cluster uptime' },
    { value: '6TB', label: 'Ingested every day' },
  ]
  const HERO_ICON_DEFAULTS = ['database', 'server', 'gauge-high', 'bolt']
  const heroStats = meta.heroStats || DEFAULT_HERO_STATS
  const setHeroStats = (next) => update({ heroStats: next })
  const setHeroStat = (i, patch) => setHeroStats(heroStats.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_STATS = [
    { value: '159', label: 'Users served (40–60 daily)' },
    { value: '57', label: 'Servers run by a team of 3' },
    { value: '20+', label: 'High-volume log sources' },
    { value: '163', label: 'Active ingest pipelines' },
    { value: 'v9.4.2', label: 'Live since 2015 (from v2.x)' },
    { value: '1 yr', label: 'Historical log retention' },
    { value: '20–40%', label: 'Storage saved via LogsDB' },
    { value: '180', label: 'WEC subscriptions via GPO' },
  ]
  const stats = meta.stats || DEFAULT_STATS
  const setStats = (next) => update({ stats: next })
  const setStat = (i, patch) => setStats(stats.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Already Delivering Value" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Your Platform," />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder=" by the Numbers" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="One self-managed, on-premises platform powering security, identity, compliance, and operations across your users and teams — end to end." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Hero Stats</h3>
        <div className="space-y-2 mt-3">
          {heroStats.map((stat, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                {heroStats.length > 1 && (
                  <button type="button" className={removeBtnClass} onClick={() => setHeroStats(heroStats.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </div>
              <div className="space-y-2">
                <IconSelect
                  value={typeof stat.icon === 'string' ? stat.icon : HERO_ICON_DEFAULTS[i]}
                  onChange={(name) => setHeroStat(i, { icon: name })}
                  inputClass={inputClass}
                  isDark={isDark}
                />
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Value</label>
                  <input type="text" value={stat.value || ''} onChange={(e) => setHeroStat(i, { value: e.target.value })} className={inputClass} placeholder={DEFAULT_HERO_STATS[i]?.value || '720B'} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                  <input type="text" value={stat.label || ''} onChange={(e) => setHeroStat(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_HERO_STATS[i]?.label || 'Metric label'} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={addBtnClass} onClick={() => setHeroStats([...heroStats, { icon: 'database', value: '', label: '' }])}>+ Add Hero Stat</button>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Platform Stats</h3>
        <div className="space-y-2 mt-3">
          {stats.map((stat, i) => (
            <div key={i} className={cardClass}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Item {i + 1}</span>
                {stats.length > 1 && (
                  <button type="button" className={removeBtnClass} onClick={() => setStats(stats.filter((_, idx) => idx !== i))}>Remove</button>
                )}
              </div>
              <div className="space-y-2">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Value</label>
                  <input type="text" value={stat.value || ''} onChange={(e) => setStat(i, { value: e.target.value })} className={inputClass} placeholder={DEFAULT_STATS[i]?.value || '159'} />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                  <input type="text" value={stat.label || ''} onChange={(e) => setStat(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_STATS[i]?.label || 'Metric label'} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className={addBtnClass} onClick={() => setStats([...stats, { value: '', label: '' }])}>+ Add Platform Stat</button>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Bottom Line</h3>
        <div className="space-y-3 mt-3">
          <IconSelect
            value={typeof meta.bottomLineIcon === 'string' ? meta.bottomLineIcon : 'layer-group'}
            onChange={(name) => update({ bottomLineIcon: name })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Label</label>
            <input type="text" value={meta.bottomLineEyebrow || ''} onChange={(e) => update({ bottomLineEyebrow: e.target.value })} className={inputClass} placeholder="The Bottom Line" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Bottom Line Text</label>
            <textarea rows={3} value={meta.bottomLine || ''} onChange={(e) => update({ bottomLine: e.target.value })} className={textareaClass} placeholder="A single on-prem platform that consolidates 20+ vendor portals into one customizable window — accelerating investigations and giving every team enterprise search over the data they depend on." />
          </div>
        </div>
      </div>
    </div>
  )
}
