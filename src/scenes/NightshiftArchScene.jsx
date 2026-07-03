import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase, faBrain, faRobot, faShareNodes, faArrowUpLong,
  faLock, faArrowRightLong, faCompress,
} from '@fortawesome/free-solid-svg-icons'

// Source: nightshift-architecture.html + nightshift-ai-index.html + nightshift-brain.html + nightshift-ai-economics.html
const ARCH_LAYERS = [
  { id: 'agent', name: 'SRE Agent', icon: faRobot, desc: 'Detects, investigates, and remediates', chips: ['Significant Events', 'RCA', 'Remediation', 'Approval Workflow'] },
  { id: 'context', name: 'Context Layer', icon: faShareNodes, desc: 'Self-updating model of your environment', chips: ['Failure Signatures', 'Knowledge Indicators', 'System Model', 'Topology'] },
  { id: 'data', name: 'Data Layer', icon: faDatabase, desc: 'Telemetry + artifacts, in place', chips: ['Logs · Traces · Metrics', 'Synthetics · Profiles', 'Code · Git · Deploys', 'Runbooks · Ownership'] },
]
const EXTERNALS = [
  { label: 'External Agents', items: 'Claude · Cursor · Copilot' },
  { label: 'External Systems', items: 'GitHub · Slack · Jira · PagerDuty' },
]

const SIGNATURE = {
  id: 'redis.pool.exhaustion.v3',
  seen: 'seen 23× · 14 deployments · last 90d',
  signals: ['pool_usage > 95%', 'p99 latency ↑ 4× baseline'],
  fix: 'restart + raise pool_size → 82% success',
}

const FUNNEL = [
  { name: 'Raw Telemetry', scale: 'Petabytes', width: 100, note: 'Never sent to the LLM — stored low-cost, queried via ES|QL' },
  { name: 'Knowledge Indicators', scale: 'Megabytes', width: 52, note: 'Structured system understanding for the agent' },
  { name: 'Significant Events', scale: 'Kilobytes', width: 18, note: 'Correlated RCA, blast radius, severity — what matters' },
]

const BEATS = [
  { key: 'arch', step: 'Architecture', titlePlain: 'A flywheel inside ', titleAccent: 'your cluster.', subtitle: 'Telemetry feeds a self-updating Context Layer; the agent reasons over it and reaches out to your tools — no direct infra access.' },
  { key: 'brain', step: 'Elastic Brain', titlePlain: 'Your data never leaves. ', titleAccent: 'The knowledge does.', subtitle: 'Every resolved incident becomes an anonymized failure signature the network learns from — opt-in, patterns only.' },
  { key: 'economics', step: 'AI Economics', titlePlain: 'The hierarchy ', titleAccent: 'is the token strategy.', subtitle: 'You can’t pass petabytes of logs to an LLM — so Elastic compresses meaning at every layer.' },
]

function NightshiftArchScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Inside Nightshift'
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const chipBase = isDark ? 'bg-white/[0.06] text-white/75' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/80'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const goTo = (i) => { setBeat(i); setPlayKey((k) => k + 1) }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1320px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {/* Beat 1 — Architecture */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.5fr_0.8fr] gap-4">
              <div className="reveal rounded-2xl border flex flex-col gap-2 p-3 min-h-0" style={{ borderColor: `${accent}45`, backgroundColor: isDark ? 'rgba(72,239,207,0.04)' : 'rgba(11,100,221,0.03)' }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-center" style={{ color: accent }}>Your Elastic Cluster</div>
                {ARCH_LAYERS.map((l, i) => (
                  <div key={l.id} className="flex flex-col">
                    <div className={`rounded-xl border flex items-center gap-3 p-3 ${cardBase}`}>
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                        <FontAwesomeIcon icon={l.icon} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className={`font-bold text-sm ${headText}`}>{l.name}</span>
                          <span className={`text-xs ${mutedText}`}>{l.desc}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {l.chips.map((c, j) => <span key={j} className={`text-[10px] rounded px-1.5 py-0.5 ${chipBase}`}>{c}</span>)}
                        </div>
                      </div>
                    </div>
                    {i < ARCH_LAYERS.length - 1 && (
                      <div className="flex justify-center py-0.5"><FontAwesomeIcon icon={faArrowUpLong} className="text-xs" style={{ color: `${accent}99` }} /></div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 min-h-0">
                {EXTERNALS.map((e, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col justify-center p-4 flex-1 ${cardBase}`}>
                    <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${mutedText}`}>{e.label}</div>
                    <div className={`text-sm font-semibold ${headText}`}>{e.items}</div>
                  </div>
                ))}
                <div className="reveal rounded-2xl border flex flex-col justify-center p-4 flex-1" style={{ borderColor: `${accent}66`, background: `linear-gradient(160deg, ${accent}1f, ${accent}08)` }}>
                  <div className="flex items-center gap-2 mb-1">
                    <FontAwesomeIcon icon={faBrain} style={{ color: accent }} />
                    <span className={`font-bold text-sm ${headText}`}>Elastic Brain</span>
                  </div>
                  <div className={`text-xs ${mutedText}`}>Global · shared · anonymized patterns</div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 2 — Elastic Brain */}
          {beat === 1 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
              <div className="reveal rounded-2xl border flex flex-col p-5 min-h-0" style={{ borderColor: `${accent}55`, background: isDark ? 'rgba(72,239,207,0.05)' : 'rgba(11,100,221,0.04)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faLock} style={{ color: accent }} />
                  <span className={`font-bold text-base ${headText}`}>Your Brain</span>
                </div>
                <p className={`text-sm leading-snug mb-3 ${mutedText}`}>Incidents, topology, runbooks, raw telemetry and code.</p>
                <span className="text-xs font-bold rounded-full px-3 py-1.5 self-start" style={{ backgroundColor: `${accent}22`, color: accent }}>Never leaves your environment</span>
              </div>

              <div className="reveal flex flex-col items-center gap-2 px-2">
                <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}aa` }} />
                <span className="text-[11px] font-semibold text-center max-w-[120px]" style={{ color: accent }}>Opt-in · strips names & values · keeps patterns</span>
              </div>

              <div className="reveal rounded-2xl border flex flex-col p-5 min-h-0" style={{ borderColor: `${accent}59`, background: `linear-gradient(160deg, ${accent}1c, ${accent}06)` }}>
                <div className="flex items-center gap-2 mb-3">
                  <FontAwesomeIcon icon={faBrain} style={{ color: accent }} />
                  <span className={`font-bold text-base ${headText}`}>Shared Brain</span>
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: `${accent}40`, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)' }}>
                  <div className="font-mono text-sm mb-1" style={{ color: accent }}>{SIGNATURE.id}</div>
                  <div className={`text-[11px] mb-2 ${mutedText}`}>{SIGNATURE.seen}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {SIGNATURE.signals.map((s, i) => <span key={i} className="text-[10px] font-mono rounded px-1.5 py-0.5" style={{ backgroundColor: `${accent}1c`, color: accent }}>{s}</span>)}
                  </div>
                  <div className={`text-xs font-semibold ${headText}`}>Best fix: {SIGNATURE.fix}</div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 3 — AI economics funnel */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-4">
              {FUNNEL.map((f, i) => (
                <div key={i} className="reveal flex items-center gap-4">
                  <div className="w-32 shrink-0 text-right">
                    <div className={`font-bold text-sm leading-tight ${headText}`}>{f.name}</div>
                    <div className="text-xs font-bold" style={{ color: accent }}>{f.scale}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="h-14 rounded-xl flex items-center px-4 transition-all" style={{ width: `${f.width}%`, background: `linear-gradient(90deg, ${accent}, ${accent}66)`, minWidth: 90 }}>
                      <span className="text-sm font-semibold text-elastic-dev-blue truncate">{f.note}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="reveal flex items-center justify-center gap-3 rounded-2xl border px-6 py-3 mt-2" style={{ borderColor: `${accent}45`, backgroundColor: `${accent}12` }}>
                <FontAwesomeIcon icon={faCompress} style={{ color: accent }} />
                <p className={`text-base md:text-lg font-semibold ${headText}`}>Token efficiency is a core differentiator — meaning, not raw data, reaches the LLM.</p>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={() => setPlayKey((k) => k + 1)} />
      </div>
    </div>
  )
}

export default NightshiftArchScene
