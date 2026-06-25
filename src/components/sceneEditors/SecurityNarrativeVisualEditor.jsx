const DEFAULT_BEATS = [
  {
    key: 'why-now',
    step: 'Why Now',
    title: 'The world has changed.',
    accentTitle: '',
    subtitle: 'Nation-state capabilities are now commodity. AI has collapsed the cost of attack. Breakout times are measured in seconds, not hours.',
    threatStats: [
      { label: 'Lower cost to build custom malware with AI', note: 'What once took a skilled team now takes a prompt' },
      { label: 'A new vulnerability published globally', note: 'Oct 2025: 172 patches in one Patch Tuesday' },
      { label: 'More zero-days exploited before disclosure', note: 'AI agents auto-fuzz and discover vulnerabilities' },
      { label: 'CVEs per month in 2026', note: 'Manual patch cycles can no longer keep pace' },
    ],
  },
  {
    key: 'taxes',
    step: 'The Taxes',
    title: 'The industry taxes your SOC. ',
    accentTitle: "It doesn't secure it.",
    subtitle: 'The adversary follows the money — slipping through every gap the status quo leaves open.',
    taxes: [
      { name: 'Endpoint Tax', desc: 'Pay twice — protection, then telemetry.', breach: 'Uncovered endpoints' },
      { name: 'Automation Tax', desc: 'A separate SOAR just to use your SIEM.', breach: 'SOAR handoffs' },
      { name: 'AI Black-Box Tax', desc: "A vendor LLM you can't verify.", breach: 'Black-box AI' },
      { name: 'Data Tax', desc: 'Rehydration fees for your own data.', breach: 'Rehydration wall' },
    ],
    killChainFooter: {
      adversaryLabel: 'Adversary',
      gapText: 'moves through every gap…',
      exfiltrationLabel: 'Exfiltration',
    },
  },
  {
    key: 'agentic',
    step: 'Agentic SOC',
    title: "You can't bolt on an ",
    accentTitle: 'agentic SOC.',
    subtitle: 'Machine speed with human judgment requires a platform where data, AI, and automation are native — not stitched together.',
    maturity: [
      {
        name: 'Legacy SOC',
        mode: 'Human-in-the-loop',
        desc: 'Bolted-on tools, broken handoffs, analyst as the bottleneck.',
        parts: ['SIEM', 'SOAR', 'XDR', 'Intel'],
        delaysLabel: '⏱ delays',
      },
      {
        name: 'Agentic SOC',
        mode: 'Human-on-the-loop',
        desc: 'One platform builds the response at machine speed; the analyst approves.',
        parts: ['SIEM', 'XDR', 'AI', 'Automation'],
      },
      {
        name: 'Autonomous SOC',
        mode: 'Unsupervised',
        desc: 'No human oversight. Risky and unaccountable — not for security teams.',
        parts: ['Unified', 'No approval'],
      },
    ],
  },
  {
    key: 'built',
    step: 'Built as One',
    title: 'Built as one. ',
    accentTitle: 'Not stitched together.',
    subtitle: 'Three capabilities a platform must have natively to operate at machine speed.',
    capabilities: [
      { name: 'Senses', tagline: 'Unified data & visibility', desc: 'One agent. A hybrid data mesh across cloud, edge, and on-prem — no egress, no rehydration.' },
      { name: 'Brain', tagline: 'Reason at machine speed', desc: 'Model-agnostic, data-grounded reasoning. BM25 + vector in one query, your choice of LLM.' },
      { name: 'Hands', tagline: 'Respond fast', desc: 'Deterministic + agentic workflows as code. Full automation or human-on-the-loop.' },
    ],
    loopCaption: 'A continuous loop — detect, reason, respond',
  },
]

function mergeBeatsWithDefaults(metaBeats) {
  return DEFAULT_BEATS.map((def, i) => {
    const b = metaBeats?.[i] || {}
    const merged = { ...def, ...b }
    if (def.threatStats) {
      merged.threatStats = def.threatStats.map((d, j) => ({ ...d, ...(b.threatStats?.[j] || {}) }))
    }
    if (def.taxes) {
      merged.taxes = def.taxes.map((d, j) => ({ ...d, ...(b.taxes?.[j] || {}) }))
    }
    if (def.killChainFooter) {
      merged.killChainFooter = { ...def.killChainFooter, ...(b.killChainFooter || {}) }
    }
    if (def.maturity) {
      merged.maturity = def.maturity.map((d, j) => ({
        ...d,
        ...(b.maturity?.[j] || {}),
        parts: (d.parts || []).map((p, k) => b.maturity?.[j]?.parts?.[k] ?? p),
      }))
    }
    if (def.capabilities) {
      merged.capabilities = def.capabilities.map((d, j) => ({ ...d, ...(b.capabilities?.[j] || {}) }))
    }
    return merged
  })
}

export default function SecurityNarrativeVisualEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['security-narrative-visual'] || {}
  const update = (patch) => onUpdateSceneMetadata('security-narrative-visual', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`

  const beats = mergeBeatsWithDefaults(meta.beats)
  const setBeats = (next) => update({ beats: next })
  const setBeat = (i, patch) => setBeats(beats.map((b, idx) => (idx === i ? { ...b, ...patch } : b)))

  const setThreatStat = (beatIdx, statIdx, patch) => {
    const stats = beats[beatIdx].threatStats || []
    setBeat(beatIdx, { threatStats: stats.map((s, idx) => (idx === statIdx ? { ...s, ...patch } : s)) })
  }

  const setTax = (beatIdx, taxIdx, patch) => {
    const taxes = beats[beatIdx].taxes || []
    setBeat(beatIdx, { taxes: taxes.map((t, idx) => (idx === taxIdx ? { ...t, ...patch } : t)) })
  }

  const setKillChainFooter = (beatIdx, patch) => {
    const footer = beats[beatIdx].killChainFooter || {}
    setBeat(beatIdx, { killChainFooter: { ...footer, ...patch } })
  }

  const setMaturity = (beatIdx, matIdx, patch) => {
    const maturity = beats[beatIdx].maturity || []
    setBeat(beatIdx, { maturity: maturity.map((m, idx) => (idx === matIdx ? { ...m, ...patch } : m)) })
  }

  const setMaturityPart = (beatIdx, matIdx, partIdx, value) => {
    const maturity = beats[beatIdx].maturity || []
    const parts = maturity[matIdx]?.parts || []
    setMaturity(beatIdx, matIdx, { parts: parts.map((p, idx) => (idx === partIdx ? value : p)) })
  }

  const setCapability = (beatIdx, capIdx, patch) => {
    const capabilities = beats[beatIdx].capabilities || []
    setBeat(beatIdx, { capabilities: capabilities.map((c, idx) => (idx === capIdx ? { ...c, ...patch } : c)) })
  }

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Header</h3>
        <div className="mt-3">
          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
          <input
            type="text"
            value={meta.eyebrow || ''}
            onChange={(e) => update({ eyebrow: e.target.value })}
            className={inputClass}
            placeholder="Elastic Security · Why Now"
          />
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Beats</h3>
        <div className="space-y-3 mt-3">
          {beats.map((beat, i) => {
            const def = DEFAULT_BEATS[i] || {}
            return (
              <div key={def.key || i} className={cardClass}>
                <span className={`text-xs font-semibold mb-3 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>
                  Beat {i + 1}: {def.step || beat.step}
                </span>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Step Label</label>
                    <input type="text" value={beat.step || ''} onChange={(e) => setBeat(i, { step: e.target.value })} className={inputClass} placeholder={def.step || ''} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Plain</label>
                    <input type="text" value={beat.title || ''} onChange={(e) => setBeat(i, { title: e.target.value })} className={inputClass} placeholder={def.title || ''} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent</label>
                    <input type="text" value={beat.accentTitle || ''} onChange={(e) => setBeat(i, { accentTitle: e.target.value })} className={inputClass} placeholder={def.accentTitle || ''} />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
                    <textarea rows={3} value={beat.subtitle || ''} onChange={(e) => setBeat(i, { subtitle: e.target.value })} className={textareaClass} placeholder={def.subtitle || ''} />
                  </div>

                  {i === 0 && beat.threatStats?.map((stat, j) => (
                    <div key={j} className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat {j + 1}</span>
                      <div className="space-y-2">
                        <div>
                          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                          <input type="text" value={stat.label || ''} onChange={(e) => setThreatStat(i, j, { label: e.target.value })} className={inputClass} placeholder={def.threatStats?.[j]?.label || ''} />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Note</label>
                          <textarea rows={2} value={stat.note || ''} onChange={(e) => setThreatStat(i, j, { note: e.target.value })} className={textareaClass} placeholder={def.threatStats?.[j]?.note || ''} />
                        </div>
                      </div>
                    </div>
                  ))}

                  {i === 1 && (
                    <>
                      {beat.taxes?.map((tax, j) => (
                        <div key={j} className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                          <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Tax {j + 1}</span>
                          <div className="space-y-2">
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                              <input type="text" value={tax.name || ''} onChange={(e) => setTax(i, j, { name: e.target.value })} className={inputClass} placeholder={def.taxes?.[j]?.name || ''} />
                            </div>
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                              <textarea rows={2} value={tax.desc || ''} onChange={(e) => setTax(i, j, { desc: e.target.value })} className={textareaClass} placeholder={def.taxes?.[j]?.desc || ''} />
                            </div>
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Breach Label</label>
                              <input type="text" value={tax.breach || ''} onChange={(e) => setTax(i, j, { breach: e.target.value })} className={inputClass} placeholder={def.taxes?.[j]?.breach || ''} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                        <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Kill Chain Footer</span>
                        <div className="space-y-2">
                          <div>
                            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Adversary Label</label>
                            <input type="text" value={beat.killChainFooter?.adversaryLabel || ''} onChange={(e) => setKillChainFooter(i, { adversaryLabel: e.target.value })} className={inputClass} placeholder={def.killChainFooter?.adversaryLabel || ''} />
                          </div>
                          <div>
                            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Gap Text</label>
                            <input type="text" value={beat.killChainFooter?.gapText || ''} onChange={(e) => setKillChainFooter(i, { gapText: e.target.value })} className={inputClass} placeholder={def.killChainFooter?.gapText || ''} />
                          </div>
                          <div>
                            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Exfiltration Label</label>
                            <input type="text" value={beat.killChainFooter?.exfiltrationLabel || ''} onChange={(e) => setKillChainFooter(i, { exfiltrationLabel: e.target.value })} className={inputClass} placeholder={def.killChainFooter?.exfiltrationLabel || ''} />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {i === 2 && beat.maturity?.map((mat, j) => (
                    <div key={j} className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Architecture {j + 1}</span>
                      <div className="space-y-2">
                        <div>
                          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                          <input type="text" value={mat.name || ''} onChange={(e) => setMaturity(i, j, { name: e.target.value })} className={inputClass} placeholder={def.maturity?.[j]?.name || ''} />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Mode</label>
                          <input type="text" value={mat.mode || ''} onChange={(e) => setMaturity(i, j, { mode: e.target.value })} className={inputClass} placeholder={def.maturity?.[j]?.mode || ''} />
                        </div>
                        <div>
                          <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                          <textarea rows={2} value={mat.desc || ''} onChange={(e) => setMaturity(i, j, { desc: e.target.value })} className={textareaClass} placeholder={def.maturity?.[j]?.desc || ''} />
                        </div>
                        {mat.parts?.map((part, k) => (
                          <div key={k}>
                            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Part {k + 1}</label>
                            <input type="text" value={part || ''} onChange={(e) => setMaturityPart(i, j, k, e.target.value)} className={inputClass} placeholder={def.maturity?.[j]?.parts?.[k] || ''} />
                          </div>
                        ))}
                        {j === 0 && (
                          <div>
                            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Delays Label</label>
                            <input type="text" value={mat.delaysLabel || ''} onChange={(e) => setMaturity(i, j, { delaysLabel: e.target.value })} className={inputClass} placeholder={def.maturity?.[0]?.delaysLabel || ''} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {i === 3 && (
                    <>
                      {beat.capabilities?.map((cap, j) => (
                        <div key={j} className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                          <span className={`text-xs font-semibold mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Capability {j + 1}</span>
                          <div className="space-y-2">
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                              <input type="text" value={cap.name || ''} onChange={(e) => setCapability(i, j, { name: e.target.value })} className={inputClass} placeholder={def.capabilities?.[j]?.name || ''} />
                            </div>
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Tagline</label>
                              <input type="text" value={cap.tagline || ''} onChange={(e) => setCapability(i, j, { tagline: e.target.value })} className={inputClass} placeholder={def.capabilities?.[j]?.tagline || ''} />
                            </div>
                            <div>
                              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                              <textarea rows={2} value={cap.desc || ''} onChange={(e) => setCapability(i, j, { desc: e.target.value })} className={textareaClass} placeholder={def.capabilities?.[j]?.desc || ''} />
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className={`mt-2 pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                        <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Loop Caption</label>
                        <input type="text" value={beat.loopCaption || ''} onChange={(e) => setBeat(i, { loopCaption: e.target.value })} className={inputClass} placeholder={def.loopCaption || ''} />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
