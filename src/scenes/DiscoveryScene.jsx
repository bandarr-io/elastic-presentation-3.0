import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import FlowConnectors from '../components/FlowConnectors'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCube, faShareNodes, faTableColumns, faTriangleExclamation, faGaugeHigh,
  faServer, faBolt, faCircleNodes, faMagnifyingGlass, faLayerGroup,
  faArrowRightLong, faArrowLeftLong, faCircleCheck, faDatabase, faEnvelope,
} from '@fortawesome/free-solid-svg-icons'

// Source: 07-ki-demo.html + 08-discovery.html + system-model.html
const KI_TYPES = [
  { name: 'Entity', icon: faCube, desc: 'Services, pods, hosts, and resources — detected from telemetry.' },
  { name: 'Dependency', icon: faShareNodes, desc: 'Who calls whom — topology mapped in real time.' },
  { name: 'Schema', icon: faTableColumns, desc: 'Field structure and standards like ECS, recognized automatically.' },
]
// Knowledge Indicators table (simulated Streams browser · logs-ecommerce-default).
const KI_ROWS = [
  { name: 'Cart Service', sub: 'service', type: 'Entity', score: 99 },
  { name: 'cart-service → order-management', sub: 'service_dependency', type: 'Dependency', score: 97 },
  { name: 'Checkout Service', sub: 'service', type: 'Entity', score: 99 },
  { name: 'checkout-service → payment-service', sub: 'service_dependency', type: 'Dependency', score: 97 },
  { name: 'checkout-service → product-catalog', sub: 'service_dependency', type: 'Dependency', score: 97 },
  { name: 'checkout-service → recommendation-engine', sub: 'service_dependency', type: 'Dependency', score: 93 },
  { name: 'Elastic Common Schema', sub: 'ecs', type: 'Schema', score: 96 },
  { name: 'Elasticsearch', sub: 'database', type: 'Entity', score: 97 },
  { name: 'Fraud Detection Service', sub: 'service', type: 'Entity', score: 88 },
  { name: 'Order Management Service', sub: 'service', type: 'Entity', score: 99 },
]
const KI_TABS = ['Retention', 'Processing', 'Schema', 'Data quality', 'Knowledge Indicators', 'Rules', 'Advanced']
const KI_BADGES = ['Classic', 'ILM Policy: logs']

// Dependency graph shown when a row is clicked (Streams dependency explorer).
const GRAPH_NODES = [
  { id: 'g-cart', col: 1, row: 1, name: 'Cart Service', kind: 'entity · service', icon: faCube },
  { id: 'g-product', col: 1, row: 2, name: 'Product Catalog Service', kind: 'entity · service', icon: faCube },
  { id: 'g-recommend', col: 1, row: 3, name: 'Recommendation Engine', kind: 'entity · service', icon: faCube },
  { id: 'g-ecs', col: 1, row: 4, name: 'Elastic Common Schema', kind: 'schema · ecs', icon: faTableColumns },
  { id: 'g-rabbit', col: 2, row: 1, name: 'RabbitMQ', kind: 'entity · message_queue', icon: faEnvelope },
  { id: 'g-es', col: 2, row: 3, name: 'Elasticsearch', kind: 'entity · database', icon: faDatabase },
  { id: 'g-postgres', col: 3, row: 3, name: 'PostgreSQL', kind: 'entity · database', icon: faDatabase },
  { id: 'g-redis', col: 4, row: 3, name: 'Redis', kind: 'entity · cache', icon: faDatabase },
]
const GRAPH_EDGES = [
  { from: 'g-cart', to: 'g-rabbit' },
  { from: 'g-product', to: 'g-es' },
  { from: 'g-recommend', to: 'g-es' },
  { from: 'g-es', to: 'g-postgres' },
  { from: 'g-postgres', to: 'g-redis' },
]

const EVENTS = [
  { name: 'OOM Exception', src: 'Application log', icon: faTriangleExclamation, tone: 'critical' },
  { name: 'High Latency', src: 'Metric', icon: faGaugeHigh, tone: 'degraded' },
  { name: 'Pod Restart', src: 'Kubernetes event', icon: faServer, tone: 'ok' },
  { name: 'Error Spike', src: 'Service', icon: faBolt, tone: 'root' },
]
const DISCOVERY_STEPS = [
  { name: 'Correlation', icon: faCircleNodes },
  { name: 'Root Cause Analysis', icon: faMagnifyingGlass },
  { name: 'Blast Radius Analysis', icon: faShareNodes },
  { name: 'Event Grouping', icon: faLayerGroup },
]

// Live system-model topology (system-model.html grid: col 0-4 × row 0-2).
const NODES = [
  { id: 'n-nginx', col: 1, row: 1, lane: 'edge', name: 'nginx-ingress', state: 'ok', stats: [['RPS', '240'], ['ERR', '0.1%']] },
  { id: 'n-userapi', col: 2, row: 1, lane: 'api', name: 'user-api', state: 'ok', stats: [['RPS', '120'], ['ERR', '0.2%']] },
  { id: 'n-checkout', col: 3, row: 1, lane: 'svc', name: 'checkout-service', state: 'degraded', stats: [['RPS', '320'], ['ERR', '2.1%'], ['P95', '280ms']] },
  { id: 'n-auth', col: 3, row: 2, lane: 'svc', name: 'auth-service', state: 'ok', stats: [['RPS', '45'], ['ERR', '0.0%'], ['P95', '35ms']] },
  { id: 'n-orderdb', col: 3, row: 3, lane: 'svc', name: 'order-db', state: 'ok', stats: [['RPS', '12'], ['ERR', '0.0%'], ['P95', '8ms']] },
  { id: 'n-payment', col: 4, row: 1, lane: 'data', name: 'payment-service', state: 'critical', focus: true, stats: [['RPS', '520'], ['ERR', '4.1%'], ['P95', '850ms']] },
  { id: 'n-redis', col: 4, row: 2, lane: 'data', name: 'redis', state: 'root', issue: 'Connection pool exhausted', stats: [['USE', '1500%'], ['P95', '480ms']] },
  { id: 'n-postgres', col: 4, row: 3, lane: 'data', name: 'postgres', state: 'ok', stats: [['RPS', '10'], ['ERR', '0.0%'], ['P95', '12ms']] },
  { id: 'n-k8s', col: 5, row: 1, lane: 'infra', name: 'k8s-node-03', state: 'degraded', stats: [['CPU', '91%'], ['MEM', '85%'], ['POD', '23']] },
]
const LANES = [
  { key: 'edge', label: 'Edge', col: 1 },
  { key: 'api', label: 'API', col: 2 },
  { key: 'svc', label: 'Services · Impacted', col: 3 },
  { key: 'data', label: 'Data Stores · Root Cause', col: 4 },
  { key: 'infra', label: 'Infrastructure', col: 5 },
]
const RAIL = [
  { name: 'Live & continuous', desc: 'Structure and health reflect real-time signals.' },
  { name: 'Agent reasoning', desc: 'Traverses dependencies to isolate the root cause.' },
  { name: 'Knowledge indicators', desc: 'Signals and patterns attached to the model.' },
  { name: 'No manual mapping', desc: 'Topology discovered from telemetry automatically.' },
  { name: 'No instrumentation', desc: 'Zero code changes — builds itself from signals.' },
]
const REASONING = [
  'Payment errors increasing', 'checkout-service impacted', 'payment-service high error rate',
  'dependency redis latency high', 'redis connection pool exhausted', 'Root cause: Redis',
]

const BEATS = [
  { key: 'ki', step: 'Knowledge', titlePlain: 'Knowledge, ', titleAccent: 'extracted automatically.', subtitle: 'Streams infers entities, dependencies, and schema from telemetry — no configuration, no instrumentation.' },
  { key: 'discovery', step: 'Discovery', titlePlain: 'From events to a ', titleAccent: 'significant event.', subtitle: 'Raw events plus knowledge are correlated, analyzed, and transformed into one understood operational situation.', hold: 4200 },
  { key: 'model', step: 'System Model', titlePlain: "The agent's live ", titleAccent: 'system model.', subtitle: 'Built continuously from telemetry — the agent navigates dependencies to understand impact and find the root cause.', hold: 5200 },
]

function DiscoveryScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const graphRef = useRef(null)
  const kiGraphRef = useRef(null)
  const [drill, setDrill] = useState(null)

  const eyebrow = metadata.eyebrow || 'Agentic Observability · Discovery'
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  const stateColor = { ok: '#48EFCF', degraded: '#FEC514', critical: '#FF957D', root: '#F04E98' }
  const stateLabel = { ok: 'Healthy', degraded: 'Degraded', critical: 'Critical', root: 'Critical · Root Cause' }

  const edges = [
    { from: 'n-nginx', to: 'n-userapi' },
    { from: 'n-userapi', to: 'n-checkout' },
    { from: 'n-checkout', to: 'n-payment' },
    { from: 'n-payment', to: 'n-k8s' },
    { from: 'n-checkout', to: 'n-auth', fromSide: 'bottom', toSide: 'top', opacity: 0.3 },
    { from: 'n-payment', to: 'n-redis', fromSide: 'bottom', toSide: 'top', color: stateColor.root, dashed: true, width: 2.5 },
  ]

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 440, delay: stagger(55), easing: 'easeOutQuad',
    })
    // Reasoning path steps in after the graph has drawn.
    const steps = el.querySelectorAll('.reason-step')
    let stepAnim
    if (steps.length) {
      stepAnim = animate(steps, {
        opacity: [0, 1], translateX: [-10, 0], duration: 360, delay: stagger(240, { start: 900 }), easing: 'easeOutQuad',
      })
    }
    return () => { anim?.pause?.(); stepAnim?.pause?.() }
  }, [beat, playKey])

  // Reset the KI drill-down whenever we leave / re-enter the Knowledge beat.
  useEffect(() => { setDrill(null) }, [beat])

  // Fade the dependency-graph nodes in when a row is opened.
  useEffect(() => {
    if (!drill) return undefined
    const el = kiGraphRef.current
    if (!el) return undefined
    const a = animate(el.querySelectorAll('.graph-node'), {
      opacity: [0, 1], duration: 360, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => a?.pause?.()
  }, [drill])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {/* Beat 1 — Knowledge Indicators (simulated Streams browser) */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-4">
              {/* Explainer rail */}
              <div className="flex flex-col justify-center gap-2.5 min-h-0">
                {KI_TYPES.map((k, i) => (
                  <div key={i} className="reveal pl-3.5 border-l-2 py-1.5" style={{ borderColor: accent }}>
                    <div className="flex items-center gap-2.5">
                      <FontAwesomeIcon icon={k.icon} className="text-lg" style={{ color: accent }} />
                      <div className={`font-bold text-2xl leading-tight ${headText}`}>{k.name}</div>
                    </div>
                    <p className={`text-base leading-snug mt-1 ${mutedText}`}>{k.desc}</p>
                  </div>
                ))}
                <div className="reveal flex items-center gap-2 text-base font-semibold mt-1.5" style={{ color: accent }}>
                  Click any row to explore its dependency graph <FontAwesomeIcon icon={faArrowRightLong} />
                </div>
              </div>

              {/* Simulated browser window */}
              <div className={`reveal rounded-2xl border flex flex-col min-h-0 overflow-hidden ${cardBase}`}>
                {/* Chrome bar */}
                <div className={`flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                  <span className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                  </span>
                  <span className={`font-mono text-[10px] truncate ${mutedText}`}>
                    app/streams/stream/logs-ecommerce-default/knowledge-indicators{drill ? '/graph' : ''}
                  </span>
                </div>

                {/* Window body */}
                <div className="flex-1 min-h-0 flex flex-col p-4 overflow-hidden">
                  {/* Stream header */}
                  <div className="flex items-center gap-2 flex-wrap mb-2 flex-shrink-0">
                    <span className={`font-mono text-sm font-bold ${headText}`}>logs-ecommerce-default</span>
                    {KI_BADGES.map((b) => (
                      <span key={b} className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${isDark ? 'bg-white/[0.06] text-white/70' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/75'}`}>{b}</span>
                    ))}
                    <span className="text-[10px] font-semibold rounded px-1.5 py-0.5 flex items-center gap-1" style={{ backgroundColor: `${accent}18`, color: accent }}>
                      <FontAwesomeIcon icon={faCircleCheck} className="text-[9px]" /> Good quality
                    </span>
                  </div>

                  {/* Tabs */}
                  <div className={`flex items-center gap-3 border-b mb-2 flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                    {KI_TABS.map((t) => {
                      const active = t === 'Knowledge Indicators'
                      return (
                        <span key={t} className={`text-[11px] pb-1.5 -mb-px whitespace-nowrap ${active ? 'font-bold' : mutedText}`} style={active ? { color: accent, borderBottom: `2px solid ${accent}` } : {}}>
                          {t}{active && <span className="ml-1 rounded-full px-1.5 py-0.5 text-[9px]" style={{ backgroundColor: `${accent}22` }}>25</span>}
                        </span>
                      )
                    })}
                  </div>

                  {!drill ? (
                    <>
                      {/* Active / Excluded */}
                      <div className="flex items-center gap-4 mb-2 text-[11px] flex-shrink-0">
                        <span className="font-bold" style={{ color: accent }}>Active <span className="tabular-nums">25</span></span>
                        <span className={mutedText}>Excluded 0</span>
                      </div>
                      {/* Column headers */}
                      <div className={`grid grid-cols-[1fr_auto_auto] gap-4 px-2 pb-1 mb-1 border-b flex-shrink-0 text-[9px] font-bold uppercase tracking-wider ${mutedText} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                        <span>Feature</span>
                        <span className="w-24 text-left">Type</span>
                        <span className="w-16 text-right">Confidence</span>
                      </div>
                      {/* Rows */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        {KI_ROWS.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => setDrill(r)}
                            className={`reveal w-full grid grid-cols-[1fr_auto_auto] items-center gap-4 px-2 py-1.5 rounded-lg text-left transition-colors ${isDark ? 'hover:bg-white/[0.05]' : 'hover:bg-elastic-dev-blue/[0.04]'}`}
                          >
                            <div className="min-w-0">
                              <div className="text-[13px] font-semibold truncate" style={{ color: accent }}>{r.name}</div>
                              <div className={`text-[9px] uppercase tracking-wider ${mutedText}`}>{r.sub}</div>
                            </div>
                            <span className={`w-24 text-[10px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 text-center ${isDark ? 'bg-white/[0.06]' : 'bg-elastic-dev-blue/[0.06]'} ${headText}`}>{r.type}</span>
                            <span className="w-16 flex items-center justify-end gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} />
                              <span className="text-sm font-bold tabular-nums" style={{ color: accent }}>{r.score}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Back + breadcrumb */}
                      <div className="flex items-center gap-2 mb-3 flex-shrink-0 text-[12px]">
                        <button
                          onClick={() => setDrill(null)}
                          className={`rounded-md border px-2 py-1 flex items-center gap-1.5 font-semibold transition-colors ${isDark ? 'border-white/15 hover:bg-white/[0.06] text-white' : 'border-elastic-dev-blue/15 hover:bg-elastic-dev-blue/[0.05] text-elastic-dark-ink'}`}
                        >
                          <FontAwesomeIcon icon={faArrowLeftLong} className="text-[11px]" /> Back
                        </button>
                        <span className={`font-mono truncate ${mutedText}`}>{drill.name}</span>
                        <span className="font-semibold whitespace-nowrap" style={{ color: accent }}>· Dependencies</span>
                      </div>
                      {/* Dependency graph (dot-grid canvas) */}
                      <div
                        ref={kiGraphRef}
                        className="relative flex-1 min-h-0 rounded-lg"
                        style={{
                          backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(16,28,63,0.015)',
                          backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(16,28,63,0.12)'} 1px, transparent 1.4px)`,
                          backgroundSize: '18px 18px',
                        }}
                      >
                        <FlowConnectors containerRef={kiGraphRef} edges={GRAPH_EDGES} playKey={playKey} defaultColor={accent} />
                        <div className="h-full grid gap-x-6 gap-y-2" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(4, 1fr)' }}>
                          {GRAPH_NODES.map((n) => (
                            <div
                              key={n.id}
                              data-node={n.id}
                              className={`graph-node relative z-10 rounded-lg border px-2.5 py-2 self-center ${cardBase}`}
                              style={{ gridColumn: n.col, gridRow: n.row, borderColor: `${accent}55` }}
                            >
                              <div className="flex items-center gap-1.5">
                                <FontAwesomeIcon icon={n.icon} className="text-[10px]" style={{ color: accent }} />
                                <span className={`text-[11px] font-bold leading-none truncate ${headText}`} style={{ fontFamily: 'Space Mono, monospace' }}>{n.name}</span>
                                <span className="ml-auto w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                              </div>
                              <div className={`text-[9px] mt-0.5 ${mutedText}`}>{n.kind}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Beat 2 — Discovery pipeline (Events → Analysis → Significant Event) */}
          {beat === 1 && (
            <div className="my-auto flex flex-col gap-4">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1.1fr_auto_1.1fr] gap-3 items-stretch">
              <div className="flex flex-col gap-2 justify-center">
                <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${mutedText}`}>Events · Raw signals</div>
                {EVENTS.map((e, i) => {
                  const c = accent
                  return (
                    <div key={i} className={`reveal rounded-xl border flex items-center gap-3 px-3.5 py-3 ${cardBase}`} style={{ borderLeftWidth: '3px', borderLeftColor: c }}>
                      <span className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: `${c}1f`, color: c }}>
                        <FontAwesomeIcon icon={e.icon} />
                      </span>
                      <div className="min-w-0">
                        <div className={`text-base font-semibold leading-tight ${headText}`}>{e.name}</div>
                        <div className={`text-xs ${mutedText}`}>{e.src}</div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="reveal hidden lg:flex flex-col items-center justify-center gap-1">
                <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${accent}99` }}>× KIs</span>
              </div>

              <div className="reveal rounded-2xl border flex flex-col p-4 min-h-0" style={{ borderColor: `${accent}55`, background: `linear-gradient(160deg, ${accent}1a, ${accent}06)` }}>
                <div className="flex items-center gap-2 text-base font-bold mb-2" style={{ color: accent }}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} /> Analysis & Reasoning
                </div>
                <div className={`text-[11px] font-bold uppercase tracking-wider mb-1 ${mutedText}`}>Input sources</div>
                <div className="flex gap-3 mb-3 text-xs">
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} /><span className={headText}>Events</span></span>
                  <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accent }} /><span className={headText}>Knowledge Indicators</span></span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {DISCOVERY_STEPS.map((s, i) => (
                    <div key={i} className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold ${headText}`} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)' }}>
                      <FontAwesomeIcon icon={s.icon} style={{ color: accent }} className="text-xs" /> {s.name}
                    </div>
                  ))}
                </div>
                <div className={`text-[11px] italic text-center mt-2 ${mutedText}`}>Agent-driven investigation</div>
              </div>

              <div className="reveal hidden lg:flex flex-col items-center justify-center gap-1">
                <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} />
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${accent}99` }}>Situation</span>
              </div>

              <div className="reveal rounded-2xl border flex flex-col p-4" style={{ borderColor: `${stateColor.root}59`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: stateColor.root }} />
                  <span className={`font-bold text-base ${headText}`}>Consolidated Situation</span>
                </div>
                <p className={`text-xs leading-snug mb-2 rounded-lg p-2.5 ${headText}`} style={{ backgroundColor: `${stateColor.root}10` }}>
                  Memory exhaustion in service A causing cascading failures across dependent services.
                </p>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Root cause</div>
                <p className={`text-xs leading-snug mb-1.5 ${headText}`}>Memory exhaustion in service A</p>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Impact / Blast radius</div>
                <p className={`text-xs leading-snug mb-2 ${headText}`}>Affecting service B, service C, and dependent APIs</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {['OOM', 'Latency', 'Restart', 'Errors'].map((c, i) => (
                    <span key={i} className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${stateColor.root}1c`, color: stateColor.root }}>{c}</span>
                  ))}
                </div>
                <div className="rounded-lg px-3 py-2.5 text-center text-sm font-bold text-white mt-auto" style={{ backgroundColor: stateColor.root }}>
                  <FontAwesomeIcon icon={faTriangleExclamation} className="mr-1.5" /> Score: High — can trigger alert
                </div>
              </div>
              </div>
              <p className={`reveal text-center text-base leading-snug max-w-3xl mx-auto ${mutedText}`}>
                Events are correlated, analyzed, and transformed into a fully understood operational situation.
              </p>
            </div>
          )}

          {/* Beat 3 — Live system model */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5">
              <div className="flex-1 min-h-0 flex gap-3">
              {/* Explainer rail */}
              <div className="reveal w-52 shrink-0 flex flex-col justify-center gap-2 min-h-0">
                {RAIL.map((r, i) => (
                  <div key={i} className="pl-2.5 border-l-2" style={{ borderColor: accent }}>
                    <div className={`text-xs font-bold leading-tight ${headText}`}>{r.name}</div>
                    <div className={`text-[10px] leading-snug ${mutedText}`}>{r.desc}</div>
                  </div>
                ))}
              </div>

              {/* Topology graph */}
              <div ref={graphRef} className="relative flex-1 min-h-0">
                  <FlowConnectors containerRef={graphRef} edges={edges} playKey={playKey} defaultColor={accent} />
                  <div className="h-full grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'auto 1fr 1fr 1fr' }}>
                    {LANES.map((l) => (
                      <div key={l.key} className={`text-[9px] font-bold uppercase tracking-wider text-center ${mutedText}`} style={{ gridColumn: l.col, gridRow: 1 }}>{l.label}</div>
                    ))}
                    {NODES.map((n) => {
                      const c = stateColor[n.state]
                      const isCrit = n.state === 'critical' || n.state === 'root'
                      return (
                        <div
                          key={n.id}
                          data-node={n.id}
                          className={`reveal relative z-10 rounded-xl border p-2 flex flex-col justify-center self-center ${cardBase}`}
                          style={{ gridColumn: n.col, gridRow: n.row + 1, borderColor: `${c}66` }}
                        >
                          {(isCrit || n.focus) && <span className="motion-pulse-ring absolute inset-0 rounded-xl border-2 pointer-events-none" style={{ borderColor: c }} />}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${n.state !== 'ok' ? 'motion-blink' : ''}`} style={{ backgroundColor: c }} />
                            <span className={`text-[11px] font-bold leading-none truncate ${headText}`} style={{ fontFamily: 'Space Mono, monospace' }}>{n.name}</span>
                          </div>
                          <div className="text-[8px] font-semibold uppercase tracking-wider mb-1" style={{ color: c }}>{stateLabel[n.state]}</div>
                          {n.issue && <div className="text-[8px] leading-tight mb-1" style={{ color: c }}>{n.issue}</div>}
                          <div className="flex gap-1.5">
                            {n.stats.map(([k, v], j) => (
                              <span key={j} className={`text-[8px] ${mutedText}`}><span className="font-bold" style={{ color: n.state === 'ok' ? undefined : c }}>{v}</span> {k}</span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Agent reasoning path — spans full width */}
                <div className="flex items-center justify-center flex-wrap gap-1.5 rounded-xl border px-3 py-2 shrink-0" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0d` }}>
                <span className="text-[10px] font-bold uppercase tracking-wider mr-1" style={{ color: accent }}>Agent reasoning path</span>
                {REASONING.map((r, i) => (
                  <div key={i} className="reason-step flex items-center gap-1.5">
                    <span className={`text-[11px] font-semibold rounded px-1.5 py-0.5 ${i === REASONING.length - 1 ? 'text-white' : headText}`} style={i === REASONING.length - 1 ? { backgroundColor: stateColor.root } : { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,28,63,0.05)' }}>{r}</span>
                    {i < REASONING.length - 1 && <FontAwesomeIcon icon={faArrowRightLong} className="text-[9px]" style={{ color: `${accent}99` }} />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default DiscoveryScene
