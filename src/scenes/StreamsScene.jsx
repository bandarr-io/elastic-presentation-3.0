import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import FlowConnectors from '../components/FlowConnectors'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faPlug, faCloudArrowDown, faGears, faRoute, faDatabase,
  faArrowRightLong, faRobot,
} from '@fortawesome/free-solid-svg-icons'

// Source: streams-intro.html (5-stage pipeline) + 06-streams.html (raw data → significant events).
const STAGES = [
  { num: '01', label: 'Source', icon: faPlug, name: 'Edge Collection', desc: 'Any shipper, any protocol — run what you already have, no lock-in.', tags: ['Elastic Agent', 'OTel Collector', 'Fluent Bit', 'Logstash'] },
  { num: '02', label: 'Inputs', icon: faCloudArrowDown, name: 'Managed Inputs', desc: 'Fully managed pull integrations and hosted endpoints — no agent to run.', tags: ['OTLP endpoint', 'Prom endpoint', 'AWS / Azure'] },
  { num: '03', label: 'Pipeline', icon: faGears, name: 'Pipeline', desc: 'Parse, normalize, and enrich in-flight — transform data before it lands.', tags: ['Parse', 'Normalize', 'Enrich'] },
  { num: '04', label: 'Routing', icon: faRoute, name: 'Routing', desc: 'Conditional fan-out — route, filter, and buffer to the right destination.', tags: ['Fan-out', 'Filter', 'Buffer'] },
  { num: '05', label: 'Destination', icon: faDatabase, name: 'Destination', desc: 'Elasticsearch with ILM — hot, warm, cold, cost-optimized at any scale.', tags: ['Elasticsearch', 'ILM', 'Tiering'] },
]

const COLLECTORS = [
  { name: 'OpenTelemetry', sub: 'OTLP · gRPC · HTTP' },
  { name: 'Kinesis Firehose', sub: 'AWS · streaming' },
  { name: 'FluentD / Bit', sub: 'Logs · structured events' },
  { name: 'Prometheus', sub: 'Metrics · scrape · remote write' },
]
const TOP_STREAMS = [
  { path: '/logs', node: 's-logs' },
  { path: '/metrics', node: 's-metrics' },
  { path: '/traces', node: 's-traces' },
]
const SUB_GROUPS = [
  { node: 'sub-logs', paths: ['/logs/aws/eks', '/logs/aws/eks/nginx', '/logs/aws/eks/kafka'] },
  { node: 'sub-metrics', paths: ['/metrics/k8s/nodes', '/metrics/k8s/pods'] },
  { node: 'sub-traces', paths: ['/traces/services/api', '/traces/services/db'] },
]
const ENTITIES = ['AWS', 'GCP', 'Azure', 'k8s', 'EKS', 'GKE', 'Docker', 'nginx', 'envoy', 'traefik', 'istio', 'postgres', 'redis', 'mongodb', 'mysql', 'kafka', 'rabbitmq', 'nats', 'pulsar', 'prometheus', 'grafana', 'consul']
const EVENTS = ['Severe errors & crashes', 'Version updates', 'Change in pattern distribution']

const BEATS = [
  { key: 'pipeline', step: 'Pipeline', titlePlain: 'Five stages. ', titleAccent: 'One pipeline.', subtitle: 'Every signal from any source to Elasticsearch — parsed, routed, and tiered along the way.' },
  { key: 'insight', step: 'Raw → Insight', titlePlain: 'From raw data to ', titleAccent: 'immediate insight.', subtitle: 'Always up-to-date, real-time, zero configuration — telemetry becomes agent-ready significant events.', hold: 4600 },
]

function StreamsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const flowRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · Streams'
  const stages = metadata.stages || STAGES
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const monoPill = isDark ? 'bg-white/[0.06] text-white/80' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/80'

  const edges = [
    { from: 'src', to: 's-logs' }, { from: 'src', to: 's-metrics' }, { from: 'src', to: 's-traces' },
    { from: 's-logs', to: 'sub-logs' }, { from: 's-metrics', to: 'sub-metrics' }, { from: 's-traces', to: 'sub-traces' },
    { from: 'sub-logs', to: 'ent' }, { from: 'sub-metrics', to: 'ent' }, { from: 'sub-traces', to: 'ent' },
    { from: 'ent', to: 'evt' },
  ].map((e) => ({ width: 2, opacity: 0.5, ...e }))

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 440, delay: stagger(55), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const Column = ({ title, sub, children }) => (
    <div className="reveal flex flex-col min-h-0 relative z-10">
      <div className="text-xs font-bold uppercase tracking-wider text-center" style={{ color: accent }}>{title}</div>
      {sub && <div className={`text-[11px] text-center mb-1.5 ${mutedText}`}>{sub}</div>}
      {children}
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {beat === 0 ? (
            <div className="my-auto flex items-stretch gap-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-stretch gap-2 flex-1 min-w-0">
                  <div className={`reveal relative rounded-2xl border flex flex-col p-4 flex-1 min-w-0 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: accent }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                        <FontAwesomeIcon icon={s.icon} />
                      </span>
                      <span className="text-sm font-bold uppercase tracking-wider" style={{ color: accent }}>{s.num} · {s.label}</span>
                    </div>
                    <h3 className={`font-bold text-lg leading-tight mb-1 ${headText}`}>{s.name}</h3>
                    <p className={`text-base leading-snug mb-2 ${mutedText}`}>{s.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {s.tags.map((t, j) => (
                        <span key={j} className={`text-sm font-medium rounded px-1.5 py-0.5 ${monoPill}`} style={{ fontFamily: t.startsWith('/') ? 'Space Mono, monospace' : undefined }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="reveal flex items-center shrink-0">
                      <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div ref={flowRef} className="flex-1 min-h-0 relative flex items-center">
              <FlowConnectors containerRef={flowRef} edges={edges} playKey={playKey} defaultColor={accent} />
              <div className="w-full grid grid-cols-[1.1fr_0.7fr_1fr_1.3fr_1fr] gap-8">
                {/* Data collection */}
                <Column title="Data Collection" sub="Any source, any format">
                  <div data-node="src" className={`flex-1 rounded-2xl border p-2.5 flex flex-col gap-2 justify-center ${cardBase}`}>
                    {COLLECTORS.map((c, i) => (
                      <div key={i} className="rounded-lg px-2.5 py-1.5" style={{ backgroundColor: `${accent}10` }}>
                        <div className={`text-sm font-bold leading-tight ${headText}`}>{c.name}</div>
                        <div className={`text-xs leading-tight ${mutedText}`}>{c.sub}</div>
                      </div>
                    ))}
                  </div>
                </Column>

                {/* Top-level streams */}
                <Column title="Top-Level Streams" sub="Central destinations">
                  <div className="flex-1 flex flex-col justify-center gap-3">
                    {TOP_STREAMS.map((s) => (
                      <span key={s.node} data-node={s.node} className={`text-base font-medium rounded-lg px-3 py-2.5 text-center ${monoPill}`} style={{ fontFamily: 'Space Mono, monospace' }}>{s.path}</span>
                    ))}
                  </div>
                </Column>

                {/* Sub streams */}
                <Column title="Sub Streams" sub="Schema · lifecycle · access">
                  <div className="flex-1 flex flex-col justify-center gap-2.5">
                    {SUB_GROUPS.map((g) => (
                      <div key={g.node} data-node={g.node} className={`rounded-xl border p-2 flex flex-col gap-1 ${cardBase}`}>
                        {g.paths.map((p, i) => (
                          <span key={i} className={`text-xs rounded px-2 py-1 ${monoPill}`} style={{ fontFamily: 'Space Mono, monospace' }}>{p}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </Column>

                {/* KIs & entities */}
                <Column title="KIs & Entities" sub="Auto-detected from telemetry">
                  <div data-node="ent" className={`flex-1 rounded-2xl border p-3 flex flex-col justify-center ${cardBase}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {ENTITIES.map((e, i) => (
                        <span key={i} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}1c`, color: accent }}>{e}</span>
                      ))}
                    </div>
                    <p className={`text-[11px] leading-snug mt-3 pt-2 italic ${mutedText}`}>Topology & dependencies auto-mapped in real time.</p>
                  </div>
                </Column>

                {/* Significant events */}
                <Column title="Significant Events" sub="AI-powered insights">
                  <div data-node="evt" className="flex-1 rounded-2xl border p-3 flex flex-col gap-2 justify-center" style={{ borderColor: `${accent}45`, background: `linear-gradient(160deg, ${accent}14, ${accent}05)` }}>
                    {EVENTS.map((e, i) => (
                      <div key={i} className={`text-sm font-semibold leading-snug rounded-lg px-2.5 py-2 ${headText}`} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>{e}</div>
                    ))}
                    <div className="flex items-center gap-2 mt-1 text-sm font-bold" style={{ color: accent }}>
                      <FontAwesomeIcon icon={faRobot} /> Agent-ready
                    </div>
                  </div>
                </Column>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default StreamsScene
