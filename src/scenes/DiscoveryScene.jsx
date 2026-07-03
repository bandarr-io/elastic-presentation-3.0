import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCube, faShareNodes, faTableColumns, faTriangleExclamation, faGaugeHigh,
  faServer, faBolt, faCircleNodes, faMagnifyingGlass, faLayerGroup,
  faLightbulb, faArrowRightLong,
} from '@fortawesome/free-solid-svg-icons'

// Source: 07-ki-demo.html + 08-discovery.html + system-model.html
const KI_TYPES = [
  { name: 'Entity', icon: faCube, desc: 'Services, pods, hosts, and resources — detected from telemetry.' },
  { name: 'Dependency', icon: faShareNodes, desc: 'Who calls whom — topology mapped in real time.' },
  { name: 'Schema', icon: faTableColumns, desc: 'Field structure and standards like ECS, recognized automatically.' },
]
const KI_ROWS = [
  { name: 'Cart Service', type: 'Entity', score: 99 },
  { name: 'checkout-service → payment-service', type: 'Dependency', score: 97 },
  { name: 'Elastic Common Schema', type: 'Schema', score: 98 },
  { name: 'checkout-service → recommendation-engine', type: 'Dependency', score: 93 },
  { name: 'Fraud Detection Service', type: 'Entity', score: 88 },
]

const EVENTS = [
  { name: 'OOM Exception', src: 'Application log', icon: faTriangleExclamation },
  { name: 'High Latency', src: 'Metric', icon: faGaugeHigh },
  { name: 'Pod Restart', src: 'Kubernetes event', icon: faServer },
  { name: 'Error Spike', src: 'Service', icon: faBolt },
]
const DISCOVERY_STEPS = [
  { name: 'Correlation', icon: faCircleNodes },
  { name: 'Root Cause Analysis', icon: faMagnifyingGlass },
  { name: 'Blast Radius Analysis', icon: faShareNodes },
  { name: 'Event Grouping', icon: faLayerGroup },
]

const MODEL_LANES = [
  { lane: 'API', nodes: [{ name: 'user-api', state: 'ok', meta: '0.2% err' }] },
  { lane: 'Services', nodes: [
    { name: 'checkout-service', state: 'degraded', meta: '2.1% err · 280ms' },
    { name: 'payment-service', state: 'critical', meta: '4.1% err · 850ms' },
  ] },
  { lane: 'Data Stores', nodes: [{ name: 'redis', state: 'root', meta: 'Pool exhausted · ↑500%' }] },
]
const REASONING = ['Payment errors rising', 'checkout-service impacted', 'redis latency high', 'connection pool exhausted', 'Root cause: Redis']

const BEATS = [
  { key: 'ki', step: 'Knowledge', titlePlain: 'Knowledge, ', titleAccent: 'extracted automatically.', subtitle: 'Streams infers entities, dependencies, and schema from telemetry — no configuration, no instrumentation.' },
  { key: 'discovery', step: 'Discovery', titlePlain: 'From events to a ', titleAccent: 'significant event.', subtitle: 'Raw events plus knowledge are correlated into a single, fully understood operational situation.' },
  { key: 'model', step: 'System Model', titlePlain: 'A live model the ', titleAccent: 'agent reasons over.', subtitle: 'Built continuously from telemetry — the agent traverses dependencies to find root cause.' },
]

function DiscoveryScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Agentic Observability · The Engine'
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  const stateColor = {
    ok: '#48EFCF', degraded: '#FEC514', critical: '#FF957D', root: '#F04E98',
  }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(60), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const goTo = (i) => { setBeat(i); setPlayKey((k) => k + 1) }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {/* Beat 1 — Knowledge Indicators */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-4">
              <div className="flex flex-col justify-center gap-3 min-h-0">
                {KI_TYPES.map((k, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex items-center gap-3 p-4 ${cardBase}`}>
                    <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={k.icon} />
                    </span>
                    <div className="min-w-0">
                      <div className={`font-bold text-base leading-tight ${headText}`}>{k.name}</div>
                      <p className={`text-sm leading-snug mt-0.5 ${mutedText}`}>{k.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className={`reveal rounded-2xl border flex flex-col p-5 min-h-0 ${cardBase}`}>
                <div className={`text-xs font-bold uppercase tracking-wider mb-3 ${mutedText}`}>Detected · logs-ecommerce-default · 25 indicators</div>
                <div className="flex-1 flex flex-col gap-2 min-h-0">
                  {KI_ROWS.map((r, i) => (
                    <div key={i} className="reveal flex items-center gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 w-20 text-center" style={{ backgroundColor: `${accent}18`, color: accent }}>{r.type}</span>
                      <span className={`text-sm flex-1 min-w-0 truncate ${headText}`} style={{ fontFamily: 'Space Mono, monospace' }}>{r.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}>
                          <div className="h-full rounded-full" style={{ width: `${r.score}%`, backgroundColor: accent }} />
                        </div>
                        <span className="text-sm font-bold tabular-nums w-7 text-right" style={{ color: accent }}>{r.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Beat 2 — Discovery pipeline */}
          {beat === 1 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 items-center">
              <div className="flex flex-col gap-2">
                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${mutedText}`}>Events + KIs</div>
                {EVENTS.map((e, i) => (
                  <div key={i} className={`reveal rounded-xl border flex items-center gap-2.5 px-3 py-2.5 ${cardBase}`}>
                    <FontAwesomeIcon icon={e.icon} style={{ color: accent }} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold leading-tight ${headText}`}>{e.name}</div>
                      <div className={`text-[11px] ${mutedText}`}>{e.src}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="reveal hidden lg:flex items-center justify-center"><FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} /></div>
              <div className="reveal rounded-2xl border flex flex-col p-4" style={{ borderColor: `${accent}55`, background: `linear-gradient(160deg, ${accent}1a, ${accent}06)` }}>
                <div className="text-sm font-bold text-center mb-3" style={{ color: accent }}>Discovery · Analysis & Reasoning</div>
                <div className="grid grid-cols-2 gap-2">
                  {DISCOVERY_STEPS.map((s, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-semibold ${headText}`} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
                      <FontAwesomeIcon icon={s.icon} style={{ color: accent }} className="text-[11px]" />
                      {s.name}
                    </div>
                  ))}
                </div>
              </div>
              <div className="reveal hidden lg:flex items-center justify-center"><FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} /></div>
              <div className="reveal rounded-2xl border flex flex-col p-4" style={{ borderColor: `${stateColor.root}59`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faLightbulb} style={{ color: stateColor.root }} />
                  <span className={`font-bold text-sm ${headText}`}>Significant Event</span>
                </div>
                <p className={`text-xs leading-snug mb-2 ${mutedText}`}><span className="font-semibold" style={{ color: stateColor.root }}>Root cause:</span> Memory exhaustion in service A causing cascading failures.</p>
                <p className={`text-xs leading-snug mb-3 ${mutedText}`}><span className="font-semibold" style={{ color: stateColor.root }}>Blast radius:</span> service B, service C, dependent APIs.</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {['OOM', 'Latency', 'Restart', 'Errors'].map((c, i) => (
                    <span key={i} className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${stateColor.root}1c`, color: stateColor.root }}>{c}</span>
                  ))}
                </div>
                <div className="text-xs font-bold mt-auto" style={{ color: stateColor.root }}>Score: High · can trigger alert</div>
              </div>
            </div>
          )}

          {/* Beat 3 — Live system model */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
                {MODEL_LANES.map((lane, i) => (
                  <div key={i} className="reveal flex flex-col min-h-0">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 text-center ${mutedText}`}>{lane.lane}</div>
                    <div className="flex-1 flex flex-col justify-center gap-3">
                      {lane.nodes.map((n, j) => {
                        const c = stateColor[n.state]
                        return (
                          <div key={j} className="rounded-xl border p-3 relative" style={{ borderColor: `${c}66`, background: isDark ? `${c}12` : `${c}10` }}>
                            {n.state === 'root' && <span className="absolute -top-2 left-3 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style={{ backgroundColor: c, color: '#fff' }}>Root Cause</span>}
                            <div className={`font-bold text-sm leading-tight ${headText}`} style={{ fontFamily: 'Space Mono, monospace' }}>{n.name}</div>
                            <div className="text-xs mt-1" style={{ color: c }}>{n.meta}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="reveal flex items-center flex-wrap justify-center gap-2 rounded-2xl border px-4 py-3 shrink-0" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
                <span className="text-xs font-bold uppercase tracking-wider mr-1" style={{ color: accent }}>Agent reasoning</span>
                {REASONING.map((r, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${headText}`}>{r}</span>
                    {i < REASONING.length - 1 && <FontAwesomeIcon icon={faArrowRightLong} className="text-[10px]" style={{ color: `${accent}99` }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={() => setPlayKey((k) => k + 1)} />
      </div>
    </div>
  )
}

export default DiscoveryScene
