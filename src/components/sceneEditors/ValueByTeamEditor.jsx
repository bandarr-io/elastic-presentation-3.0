import IconSelect from './IconSelect'

export default function ValueByTeamEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['value-by-team'] || {}
  const update = (patch) => onUpdateSceneMetadata('value-by-team', { ...meta, ...patch })

  const TEAM_ICON_DEFAULTS = ['shield-halved', 'fingerprint', 'headset', 'globe', 'clipboard-check', 'building-columns']

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`
  const addBtnClass = `w-full py-2 rounded-lg border border-dashed text-xs font-semibold ${
    isDark
      ? 'border-white/20 text-white/50 hover:border-white/40 hover:text-white/70'
      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:border-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
  }`
  const removeBtnClass = `text-xs font-semibold ${isDark ? 'text-red-400/70 hover:text-red-400' : 'text-red-600/70 hover:text-red-600'}`

  const DEFAULT_TEAMS = [
    {
      id: 'soc',
      title: 'Security Ops / CTI',
      tag: 'SOC · Threat Intel',
      points: [
        'Near-real-time detection across CrowdStrike, Okta, Azure, Entra, Cloudflare, O365 & more',
        'ML risk scoring on users, accounts, hosts, IPs and URLs',
        'AI agents query, build dashboards, correlate threats & collect evidence',
        'Auto-builds ServiceNow incidents with agent-collected evidence',
      ],
    },
    {
      id: 'identity',
      title: 'Identity',
      tag: 'Accounts & Access',
      points: [
        'Account-lockout analysis — location, reason, affected accounts',
        'User & group-membership change monitoring',
        'Brute-force, privileged- and service-account detection',
      ],
    },
    {
      id: 'helpdesk',
      title: 'Help Desk',
      tag: 'Frontline Support',
      points: [
        'Self-service user unlocks',
        'Authentication investigations',
      ],
    },
    {
      id: 'webapp',
      title: 'Web Application',
      tag: 'WAF Rules',
      points: [
        'Test, deploy & monitor WAF rules across your organization',
        'Attack detection — injection, XSS, and threat-correlated rules',
      ],
    },
    {
      id: 'compliance',
      title: 'Risk & Compliance',
      tag: 'Audit-Ready',
      points: [
        'Compliance adherence + audit evidence (proof validation)',
        'One-year retention for regulated agencies',
        'Dashboards mapped to PUB 1075, NIST 800-53 & HIPAA',
      ],
    },
    {
      id: 'agencies',
      title: 'New Business Units',
      tag: 'Newly Onboarded',
      points: [
        'Policy-adherence monitoring',
        'Monitoring, alerting & reporting tailored per team',
      ],
    },
  ]

  const teams = (meta.teams || DEFAULT_TEAMS).map((t, i) => ({
    ...DEFAULT_TEAMS[i],
    ...t,
    points: t.points || DEFAULT_TEAMS[i]?.points || [],
  }))
  const setTeams = (next) => update({ teams: next })
  const setTeam = (i, patch) => setTeams(teams.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const setTeamPoint = (teamIdx, pointIdx, value) => {
    const points = [...(teams[teamIdx].points || [])]
    points[pointIdx] = value
    setTeam(teamIdx, { points })
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Value Across the Enterprise" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Every Team," />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder=" One Platform" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea rows={3} value={meta.subtitle || ''} onChange={(e) => update({ subtitle: e.target.value })} className={textareaClass} placeholder="Hundreds of users across Security, Identity, Help Desk, Web Application, Risk & Compliance, and newly onboarded business units — each in its own isolated instance." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Measured Impact</h3>
        <div className="space-y-3 mt-3">
          <IconSelect
            value={typeof meta.impactIcon === 'string' ? meta.impactIcon : 'stopwatch'}
            onChange={(name) => update({ impactIcon: name })}
            inputClass={inputClass}
            isDark={isDark}
          />
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Label</label>
            <input type="text" value={meta.impactEyebrow || ''} onChange={(e) => update({ impactEyebrow: e.target.value })} className={inputClass} placeholder="Measured Impact" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Impact Stat</label>
            <input type="text" value={meta.impactStat || ''} onChange={(e) => update({ impactStat: e.target.value })} className={inputClass} placeholder="90%" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Impact Label</label>
            <input type="text" value={meta.impactLabel || ''} onChange={(e) => update({ impactLabel: e.target.value })} className={inputClass} placeholder="Less time gathering for investigations" />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Impact Detail</label>
            <textarea rows={3} value={meta.impactDetail || ''} onChange={(e) => update({ impactDetail: e.target.value })} className={textareaClass} placeholder="What took five minutes of manual searching across sources is now collected and presented automatically by AI-driven rules." />
          </div>
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Teams</h3>
        <div className="space-y-2 mt-3">
          {teams.map((team, i) => {
            const points = team.points || DEFAULT_TEAMS[i]?.points || []
            return (
              <div key={i} className={cardClass}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>Team {i + 1}</span>
                  {teams.length > 1 && (
                    <button type="button" className={removeBtnClass} onClick={() => setTeams(teams.filter((_, idx) => idx !== i))}>Remove</button>
                  )}
                </div>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof team.icon === 'string' ? team.icon : TEAM_ICON_DEFAULTS[i]}
                    onChange={(name) => setTeam(i, { icon: name })}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
                    <input type="text" value={team.title || ''} onChange={(e) => setTeam(i, { title: e.target.value })} className={inputClass} placeholder={DEFAULT_TEAMS[i]?.title || 'Team title'} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Tag</label>
                    <input type="text" value={team.tag || ''} onChange={(e) => setTeam(i, { tag: e.target.value })} className={inputClass} placeholder={DEFAULT_TEAMS[i]?.tag || 'Team tag'} />
                  </div>
                  <div>
                    <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Use Cases</label>
                    <div className="space-y-2">
                      {points.map((pt, j) => (
                        <div key={j} className="flex gap-2 items-start">
                          <textarea
                            rows={2}
                            value={pt}
                            onChange={(e) => setTeamPoint(i, j, e.target.value)}
                            className={textareaClass}
                            placeholder={DEFAULT_TEAMS[i]?.points?.[j] || 'Use case bullet'}
                          />
                          {points.length > 1 && (
                            <button type="button" className={`${removeBtnClass} shrink-0 mt-1`} onClick={() => setTeam(i, { points: points.filter((_, idx) => idx !== j) })}>Remove</button>
                          )}
                        </div>
                      ))}
                      {points.length < 3 && (
                        <button type="button" className={addBtnClass} onClick={() => setTeam(i, { points: [...points, ''] })}>+ Add Use Case</button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          {teams.length < 6 && (
            <button type="button" className={addBtnClass} onClick={() => setTeams([...teams, { title: '', tag: '', icon: 'users', points: [''] }])}>+ Add Team</button>
          )}
        </div>
      </div>
    </div>
  )
}
