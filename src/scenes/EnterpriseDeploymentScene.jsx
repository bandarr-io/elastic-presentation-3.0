import { useEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'

/* ============================================================
   EnterpriseDeploymentScene
   Interactive Elastic deployment reference architecture.

   Adapted from the standalone "ElasticArchitecture" diagram and
   brought inline with the presentation's Elastic branding:
   - Elastic brand palette (blue / teal / poppy / pink / yellow)
   - Brand type stack (Mier B display, Inter body, Space Mono labels)
   - Theme-aware (dark / light) via useTheme + CSS custom properties
   - Standard SceneHeader for eyebrow / title / subtitle

   The diagram is data-driven: edit NODES / EDGES / GROUPS below.
   Edges are pure functions of the data (no DOM measurement).
   ============================================================ */

const W = 1760
const H = 1080

// Visible crop of the coordinate space — trims the dead margin around the
// content (content spans ~x:36–1716, y:109–878) so the diagram fills the frame.
const VIEW = { x: 20, y: 100, w: 1734, h: 792 }

// Category → semantic role for the flow. Colors resolve per-theme below.
const GROUPS = [
  { id: 'gp-sources', x: 36, y: 120, w: 208, h: 492, label: 'Data Sources' },
  { id: 'gp-monitor', x: 1140, y: 728, w: 560, h: 150, label: 'Monitoring Cluster', monitor: true },
]

const NODES = [
  { id: 'kb', x: 56, y: 150, w: 168, h: 96, t: 'ops', title: 'Internal Knowledge Bases',
    sub: 'Wikis · docs · shares', group: 'gp-sources',
    desc: 'Content repositories crawled and synced for enterprise search.' },
  { id: 'servers', x: 56, y: 280, w: 168, h: 80, t: 'ops', title: 'Servers',
    sub: 'App & infra hosts', group: 'gp-sources',
    desc: 'Fleet of application and infrastructure servers emitting logs, metrics, and traces.' },
  { id: 'endpoints', x: 56, y: 394, w: 168, h: 80, t: 'ops', title: 'Endpoints',
    sub: 'Laptops · workstations', group: 'gp-sources',
    desc: 'User endpoints instrumented for security telemetry and observability.' },
  { id: 'databases', x: 56, y: 508, w: 168, h: 80, t: 'ops', title: 'Databases',
    sub: 'SQL · NoSQL', group: 'gp-sources',
    desc: 'Operational databases whose records are pulled into the pipeline, typically via Logstash JDBC inputs.' },

  { id: 'connectors', x: 292, y: 150, w: 220, h: 96, t: 'collect', title: 'Connectors, Crawler & Clients',
    sub: 'Content sync · web crawl · SDKs',
    desc: 'Workplace connectors, the web crawler, and language clients that push content and documents straight into Elasticsearch.' },
  { id: 'beats', x: 292, y: 278, w: 220, h: 84, t: 'collect', title: 'Beats',
    sub: 'Lightweight data shippers',
    desc: 'Purpose-built shippers (Filebeat, Metricbeat, …) sending directly to Elasticsearch or through Logstash for enrichment.' },
  { id: 'agent', x: 292, y: 408, w: 220, h: 84, t: 'collect', title: 'Elastic Agent',
    sub: 'Unified collection & defend',
    desc: 'Single agent for logs, metrics, and endpoint security — centrally managed by Fleet Server.' },
  { id: 'fleet', x: 292, y: 608, w: 220, h: 80, t: 'collect', title: 'Fleet Server',
    sub: 'Central agent management',
    desc: 'Coordinates policies, upgrades, and integrations for every deployed Elastic Agent.' },

  { id: 'logstash', x: 560, y: 452, w: 212, h: 92, t: 'process', title: 'Logstash',
    sub: 'Parse · transform · enrich',
    desc: 'Heavy-duty pipeline for parsing, transforming, and enriching events before they are indexed.' },
  { id: 'kafka', x: 560, y: 608, w: 212, h: 80, t: 'process', title: 'Kafka',
    sub: 'Buffer / message queue',
    desc: 'Durable buffer that absorbs bursts and decouples producers from the cluster.' },

  { id: 'es', x: 840, y: 120, w: 350, h: 460, t: 'store', title: 'Elasticsearch', custom: 'es',
    desc: 'The heart of the deployment: dedicated master, data (tiered), machine-learning, and ingest node roles.' },

  { id: 'kibana', x: 1280, y: 120, w: 250, h: 88, t: 'serve', title: 'Kibana',
    sub: 'Dashboards · Discover · Alerting · ML UI',
    desc: 'Visualization and management layer — dashboards, alerting, and cluster administration.' },
  { id: 'cloud', x: 1280, y: 266, w: 250, h: 118, t: 'store', title: 'Cloud Hosting',
    sub: 'AWS · Microsoft Azure · Google Cloud', chips: ['Hosting', 'Cross-cluster replication'],
    desc: 'Hosting and replication available across all three major cloud providers.' },
  { id: 'thirdparty', x: 1280, y: 442, w: 250, h: 138, t: 'serve', title: 'Third-Party Connections',
    sub: 'Alert & action destinations', chips: ['Slack', 'Teams', 'ServiceNow', 'Email', 'Webhooks'],
    desc: 'Alerting actions and case workflows pushed into the tools your teams already live in.' },

  { id: 'lb', x: 1576, y: 120, w: 170, h: 88, t: 'serve', title: 'Load Balancers',
    sub: 'HA entry point',
    desc: 'Distribute user and API traffic across Kibana and Elasticsearch endpoints.' },
  { id: 'users', x: 1576, y: 300, w: 170, h: 88, t: 'serve', title: 'Users',
    sub: 'Analysts · SREs · apps',
    desc: 'People and applications consuming search, dashboards, and alerts.' },

  { id: 'storage', x: 845, y: 755, w: 200, h: 88, t: 'ops', ghost: true, title: 'Remote Storage',
    sub: 'S3 · Blob · MinIO · …',
    desc: 'Snapshot repository for backups and searchable snapshots backing the frozen tier.' },
  { id: 'monitor', x: 1140, y: 728, w: 560, h: 150, t: 'ops', custom: 'monitor',
    title: 'Monitoring Cluster', group: 'gp-monitor',
    desc: 'Separate cluster that receives logs and metrics from production, so observability survives production incidents.' },
]

/* Sources share a single vertical BUS at x=254; direct-to-Logstash
   paths merge into one corridor run at y=520 (Agent/Fleet gap). */
const EDGES = [
  { s: 'kb', e: 'connectors', sS: 'r', eS: 'l', c: 'collect', p: 1 },
  { s: 'servers', e: 'beats', sS: 'r', eS: 'l', c: 'collect', p: 1 },
  { s: 'servers', e: 'agent', sS: 'r', eS: 'l', c: 'collect',
    route: [{ x: 254, y: 320 }, { x: 254, y: 450 }] },
  { s: 'servers', e: 'logstash', sS: 'r', eS: 'l', eT: 0.739, c: 'collect',
    route: [{ x: 254, y: 320 }, { x: 254, y: 520 }] },
  { s: 'endpoints', e: 'beats', sS: 'r', eS: 'l', c: 'collect',
    route: [{ x: 254, y: 434 }, { x: 254, y: 320 }] },
  { s: 'endpoints', e: 'agent', sS: 'r', eS: 'l', c: 'collect', p: 1,
    route: [{ x: 254, y: 434 }, { x: 254, y: 450 }] },
  { s: 'endpoints', e: 'logstash', sS: 'r', eS: 'l', eT: 0.739, c: 'collect',
    route: [{ x: 254, y: 434 }, { x: 254, y: 520 }] },
  { s: 'databases', e: 'logstash', sS: 'r', eS: 'l', eT: 0.739, c: 'collect', p: 1,
    route: [{ x: 254, y: 548 }, { x: 254, y: 520 }] },

  { s: 'connectors', e: 'es', sS: 'r', eS: 'l', eT: 0.17, c: 'collect', p: 1, mx: 788 },
  { s: 'beats', e: 'es', sS: 'r', sT: 0.32, eS: 'l', eT: 0.32, c: 'collect', p: 1, mx: 800 },
  { s: 'agent', e: 'es', sS: 'r', sT: 0.28, eS: 'l', eT: 0.48, c: 'collect', p: 1, mx: 806 },

  { s: 'beats', e: 'logstash', sS: 'r', sT: 0.78, eS: 'l', eT: 0.12, c: 'collect', mx: 540 },
  { s: 'agent', e: 'logstash', sS: 'r', sT: 0.74, eS: 'l', eT: 0.48, c: 'collect', mx: 536 },
  { s: 'fleet', e: 'agent', sS: 't', eS: 'b', c: 'ops', dash: true, lbl: 'manages' },

  { s: 'logstash', e: 'es', sS: 'r', eS: 'l', eT: 0.68, c: 'process', p: 2, mx: 818 },
  { s: 'logstash', e: 'kafka', sS: 'b', eS: 't', c: 'process', lbl: 'buffer' },
  { s: 'kafka', e: 'es', sS: 'r', eS: 'l', eT: 0.92, c: 'process', p: 1, lbl: 'ingest', mx: 806 },

  { s: 'es', e: 'kibana', sS: 'r', sT: 0.096, eS: 'l', c: 'serve', p: 2, lbl: 'search & viz', both: true },
  { s: 'es', e: 'cloud', sS: 'r', sT: 0.446, eS: 'l', c: 'store', p: 1, lbl: 'replication', both: true },
  { s: 'es', e: 'thirdparty', sS: 'r', sT: 0.85, eS: 'l', c: 'serve', p: 1, lbl: 'alerts' },
  { s: 'lb', e: 'kibana', sS: 'l', eS: 'r', c: 'serve', p: 1 },
  { s: 'users', e: 'lb', sS: 't', eS: 'b', c: 'serve', p: 1 },
  { s: 'thirdparty', e: 'users', sS: 'r', eS: 'b', eT: 0.30, c: 'serve',
    route: [{ x: 1627, y: 511 }] },

  { s: 'es', e: 'storage', sS: 'b', sT: 0.30, eS: 't', c: 'ops', dash: true, p: 1, lbl: 'backups & snapshots' },
  { s: 'es', e: 'monitor', sS: 'b', sT: 0.76, eS: 't', eT: 0.12, c: 'ops', dash: true, p: 1, lbl: 'logs & metrics',
    route: [{ x: 1106, y: 694 }, { x: 1207, y: 694 }] },
  { s: 'monitor', e: 'users', sS: 't', sT: 0.9293, eS: 'b', eT: 0.70, c: 'ops', dash: true, lbl: 'ops visibility' },
]

// Elasticsearch data tiers — Elastic brand palette (matches deck convention).
const TIERS = [
  { label: 'Hot', color: '#F04E98' },
  { label: 'Warm', color: '#FF957D' },
  { label: 'Cold', color: '#0B64DD' },
  { label: 'Frozen', color: '#48EFCF', note: 'searchable snapshots' },
]

/* ---------------- pure geometry ---------------- */

const byId = Object.fromEntries(NODES.map((n) => [n.id, n]))

function anchor(n, side, t = 0.5) {
  const { x, y, w, h } = n
  switch (side) {
    case 'l': return { x, y: y + h * t }
    case 'r': return { x: x + w, y: y + h * t }
    case 't': return { x: x + w * t, y }
    case 'b': return { x: x + w * t, y: y + h }
    default: return { x, y }
  }
}

function polyline(ed) {
  const A = anchor(byId[ed.s], ed.sS, ed.sT)
  const B = anchor(byId[ed.e], ed.eS, ed.eT)
  if (ed.route) return [A, ...ed.route, B]
  const hOut = ed.sS === 'l' || ed.sS === 'r'
  const hIn = ed.eS === 'l' || ed.eS === 'r'
  if (hOut && hIn) {
    if (Math.abs(A.y - B.y) < 14) return [A, B]
    const mx = ed.mx != null ? ed.mx : (A.x + B.x) / 2
    return [A, { x: mx, y: A.y }, { x: mx, y: B.y }, B]
  }
  if (!hOut && !hIn) {
    if (Math.abs(A.x - B.x) < 14) return [A, B]
    const my = ed.my != null ? ed.my : (A.y + B.y) / 2
    return [A, { x: A.x, y: my }, { x: B.x, y: my }, B]
  }
  return hOut ? [A, { x: B.x, y: A.y }, B] : [A, { x: A.x, y: B.y }, B]
}

function roundedPath(pl, R = 12) {
  let d = `M ${pl[0].x} ${pl[0].y}`
  for (let q = 1; q < pl.length - 1; q++) {
    const pv = pl[q - 1], p = pl[q], nx = pl[q + 1]
    const l1 = Math.hypot(p.x - pv.x, p.y - pv.y)
    const l2 = Math.hypot(nx.x - p.x, nx.y - p.y)
    const r = Math.min(R, l1 / 2, l2 / 2)
    const u1 = { x: (p.x - pv.x) / (l1 || 1), y: (p.y - pv.y) / (l1 || 1) }
    const u2 = { x: (nx.x - p.x) / (l2 || 1), y: (nx.y - p.y) / (l2 || 1) }
    d += ` L ${p.x - u1.x * r} ${p.y - u1.y * r} Q ${p.x} ${p.y} ${p.x + u2.x * r} ${p.y + u2.y * r}`
  }
  d += ` L ${pl[pl.length - 1].x} ${pl[pl.length - 1].y}`
  return d
}

function midpoint(pl) {
  const lens = []
  let total = 0
  for (let i = 0; i < pl.length - 1; i++) {
    const l = Math.hypot(pl[i + 1].x - pl[i].x, pl[i + 1].y - pl[i].y)
    lens.push(l)
    total += l
  }
  let target = total / 2
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i]) {
      const f = lens[i] ? target / lens[i] : 0
      return {
        x: pl[i].x + (pl[i + 1].x - pl[i].x) * f,
        y: pl[i].y + (pl[i + 1].y - pl[i].y) * f,
        total,
      }
    }
    target -= lens[i]
  }
  return { ...pl[pl.length - 1], total }
}

/* ---------------- theming ---------------- */

// Semantic category colors, tuned per theme for contrast on the deck's
// light-grey / developer-blue scene backgrounds.
function categoryColors(isDark) {
  return isDark
    ? { collect: '#4C8DFF', process: '#FEC514', store: '#48EFCF', serve: '#F04E98', ops: '#8A9BB4' }
    : { collect: '#0B64DD', process: '#B7791F', store: '#0E8C7F', serve: '#F04E98', ops: '#64748B' }
}

/* ---------------- component ---------------- */

function EnterpriseDeploymentScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [hover, setHover] = useState(null)
  const frameRef = useRef(null)
  const [scale, setScale] = useState(0.5)

  const eyebrow = metadata.eyebrow || 'Reference Architecture'
  const titlePlain = metadata.titlePlain || 'Enterprise deployment '
  const titleAccent = metadata.titleAccent || 'components'
  const subtitle =
    metadata.subtitle ||
    'Informational only. Not all components may be necessary — work with your account team to right-size. All product names, logos, and brands are property of their respective owners.'

  const COLORS = useMemo(() => categoryColors(isDark), [isDark])
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const edges = useMemo(
    () =>
      EDGES.map((ed, i) => {
        const pl = polyline(ed)
        const mid = midpoint(pl)
        return { ...ed, i, d: roundedPath(pl), mid, len: mid.total }
      }),
    []
  )

  // Fit the fixed 1760×1120 stage into the available frame (width & height).
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const fit = () => setScale(Math.min(el.clientWidth / VIEW.w, el.clientHeight / VIEW.h))
    fit()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Entrance reveal for the header, controls, and diagram frame.
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 460,
      delay: stagger(60),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  const connected = useMemo(() => {
    if (!hover) return null
    const keep = new Set([hover])
    for (const ed of edges)
      if (ed.s === hover || ed.e === hover) { keep.add(ed.s); keep.add(ed.e) }
    return keep
  }, [hover, edges])

  const edgeOn = (ed) => hover && (ed.s === hover || ed.e === hover)
  const hoverNode = hover ? byId[hover] : null
  const ins = hover ? edges.filter((x) => x.e === hover).length : 0
  const outs = hover ? edges.filter((x) => x.s === hover).length : 0

  const legend = [
    ['collect', 'Collect'],
    ['process', 'Transform'],
    ['store', 'Index & store'],
    ['serve', 'Serve & act'],
  ]

  return (
    <div className="h-full w-full flex flex-col px-2 pt-1 pb-1 overflow-hidden">
      <div ref={rootRef} className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className={'ea-root' + (hover ? ' ea-tracing' : '')} style={eaVars(isDark, COLORS, accent)}>
          <style>{CSS}</style>

          <div className="ea-main reveal">
            <div className="ea-frame" ref={frameRef}>
            <div className="ea-stage" style={{ width: VIEW.w, height: VIEW.h, transform: `scale(${scale})` }}>
            <div className="ea-plane" style={{ width: W, height: H, transform: `translate(${-VIEW.x}px, ${-VIEW.y}px)` }}>
              {/* wires (under nodes) */}
              <svg className="ea-wires" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
                <defs>
                  {Object.entries(COLORS).map(([k, col]) => (
                    <marker key={k} id={`ea-arr-${k}`} viewBox="0 0 10 10" refX="8" refY="5"
                      markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                      <path d="M0,0 L10,5 L0,10 z" fill={col} />
                    </marker>
                  ))}
                </defs>
                {edges.map((ed) => (
                  <path key={ed.i} id={`ea-edge-${ed.i}`} d={ed.d}
                    className={'ea-edge' + (ed.dash ? ' ea-dash' : '') + (edgeOn(ed) ? ' on' : '')}
                    stroke={COLORS[ed.c]}
                    markerEnd={`url(#ea-arr-${ed.c})`}
                    markerStart={ed.both ? `url(#ea-arr-${ed.c})` : undefined} />
                ))}
                {edges.flatMap((ed) => {
                  const n = ed.p || 0
                  const dur = Math.max(3.2, ed.len / 95)
                  return Array.from({ length: n }, (_, j) => (
                    <circle key={`${ed.i}-${j}`} r="3.4" fill={COLORS[ed.c]}
                      className={'ea-particle' + (edgeOn(ed) ? ' on' : '')}
                      style={{ filter: `drop-shadow(0 0 4px ${COLORS[ed.c]})` }}>
                      <animateMotion dur={`${dur.toFixed(2)}s`} repeatCount="indefinite"
                        begin={`${-(j * dur / n) - (ed.i % 5) * 0.6}s`}>
                        <mpath href={`#ea-edge-${ed.i}`} />
                      </animateMotion>
                    </circle>
                  ))
                })}
              </svg>

              {/* group panels */}
              {GROUPS.map((g) => (
                <div key={g.id}
                  className={'ea-gpanel' + (g.monitor ? ' ea-monitor' : '') + (connected && [...connected].some((id) => byId[id] && byId[id].group === g.id) ? ' on' : '')}
                  style={{ left: g.x, top: g.y, width: g.w, height: g.h }}
                  onMouseEnter={g.monitor ? () => setHover('monitor') : undefined}
                  onMouseLeave={g.monitor ? () => setHover(null) : undefined}>
                  <span className="ea-glabel">{g.label}</span>
                </div>
              ))}

              {/* nodes */}
              {NODES.map((n) => (
                <div key={n.id}
                  className={
                    `ea-node ea-t-${n.t}` +
                    (n.ghost ? ' ea-ghost' : '') +
                    (n.custom === 'monitor' ? ' ea-bare' : '') +
                    (connected && connected.has(n.id) ? ' on' : '')
                  }
                  style={{ left: n.x, top: n.y, width: n.w, height: n.h }}
                  onMouseEnter={() => setHover(n.id)}
                  onMouseLeave={() => setHover(null)}>
                  {n.custom === 'es' ? <EsBody accent={accent} /> :
                    n.custom === 'monitor' ? <MonitorBody /> : (
                      <>
                        <h3>{n.title}</h3>
                        {n.sub && <div className="ea-sub">{n.sub}</div>}
                        {n.chips && (
                          <div className="ea-chips">
                            {n.chips.map((c) => <span key={c} className="ea-chip">{c}</span>)}
                          </div>
                        )}
                      </>
                    )}
                </div>
              ))}

              {/* labels (over nodes) */}
              <svg className="ea-wires ea-top" viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
                {edges.filter((ed) => ed.lbl).map((ed) => (
                  <text key={ed.i} x={ed.mid.x} y={ed.mid.y - 7} textAnchor="middle"
                    className={'ea-elabel' + (edgeOn(ed) ? ' on' : '')}>
                    {ed.lbl}
                  </text>
                ))}
              </svg>
            </div>
            </div>
            </div>
          </div>

          <div className="ea-overlay reveal">
            <div className="ea-legend">
              {legend.map(([k, l]) => (
                <span key={k}><i style={{ background: COLORS[k] }} />{l}</span>
              ))}
              <span><i className="ea-dashed" />Operations</span>
            </div>
            <div className="ea-infobar">
              <span className="ea-k">Trace</span>
              {hoverNode ? (
                <span>
                  <b>{hoverNode.title}</b> {hoverNode.desc}{' '}
                  <span className="ea-io">{ins} in / {outs} out</span>
                </span>
              ) : (
                <span>Hover any component to isolate its data paths.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EsBody({ accent }) {
  return (
    <>
      <div className="ea-es-head"><h3>Elasticsearch</h3><span className="ea-k2">CLUSTER</span></div>
      <div className="ea-row"><span className="ea-name">Master Nodes</span><span className="ea-count">×3 · quorum</span></div>
      <div className="ea-row" style={{ marginBottom: 6 }}><span className="ea-name">Data Nodes</span><span className="ea-count">tiered ILM</span></div>
      <div className="ea-tiers">
        {TIERS.map((t) => (
          <div key={t.label} className="ea-tier">
            <span className="ea-dot" style={{ background: t.color }} />
            {t.note ? <span>{t.label}<small>{t.note}</small></span> : t.label}
          </div>
        ))}
      </div>
      <div className="ea-row"><span className="ea-name">ML Nodes</span><span className="ea-count">×2+</span></div>
      <div className="ea-row"><span className="ea-name">Ingest Nodes</span><span className="ea-count">pipelines</span></div>
      <div className="ea-es-foot" style={{ borderColor: `${accent}55` }}>Node roles scale independently. ILM moves indices across tiers as data ages.</div>
    </>
  )
}

function MonitorBody() {
  return (
    <div className="ea-mini">
      <div className="ea-col ea-e"><h4>Elasticsearch</h4>
        <div className="ea-row"><span className="ea-name" style={{ fontSize: 12.5 }}>Master Nodes</span><span className="ea-count">×3</span></div>
        <div className="ea-row" style={{ marginBottom: 0 }}><span className="ea-name" style={{ fontSize: 12.5 }}>Data Nodes</span><span className="ea-count" style={{ color: '#F04E98' }}>hot tier</span></div>
      </div>
      <div className="ea-col ea-kb"><h4>Kibana</h4>
        <div className="ea-sub" style={{ lineHeight: 1.5 }}>Stack monitoring dashboards, alerting on cluster health, capacity trends.</div>
      </div>
    </div>
  )
}

// Theme-aware CSS custom properties injected on the root wrapper.
function eaVars(isDark, COLORS, accent) {
  return {
    '--ea-bg': isDark ? '#101C3F' : '#F5F7FA',
    '--ea-panel': isDark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
    '--ea-panel2': isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.75)',
    '--ea-line': isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,28,63,0.14)',
    '--ea-ink': isDark ? '#FFFFFF' : '#1C1E23',
    '--ea-muted': isDark ? 'rgba(255,255,255,0.66)' : 'rgba(28,30,35,0.66)',
    '--ea-faint': isDark ? 'rgba(255,255,255,0.42)' : 'rgba(28,30,35,0.48)',
    '--ea-accent': accent,
    '--ea-collect': COLORS.collect,
    '--ea-process': COLORS.process,
    '--ea-store': COLORS.store,
    '--ea-serve': COLORS.serve,
    '--ea-ops': COLORS.ops,
    '--ea-shadow': isDark ? '0 2px 12px rgba(0,0,0,0.40)' : '0 8px 22px rgba(16,28,63,0.10)',
  }
}

/* Scoped styles — every selector is prefixed with .ea-root. Colors and
   fonts are driven by the brand tokens set in eaVars() above.            */
const CSS = `
.ea-root{
  position:relative;
  font-family:'Inter',system-ui,sans-serif;
  color:var(--ea-ink);
  display:flex; flex-direction:column; min-height:0; flex:1;
  --ea-display:'Mier B','Inter',system-ui,sans-serif;
  --ea-body:'Inter',system-ui,sans-serif;
  --ea-mono:'Space Mono',monospace;
}
.ea-main{ flex:1; min-height:0; display:flex; }
.ea-overlay{ position:absolute; left:6px; bottom:6px; width:550px; max-width:64%;
  display:flex; flex-direction:column; gap:8px; z-index:10; pointer-events:none; }
.ea-infobar{ border:1px solid var(--ea-line); border-radius:10px;
  background:color-mix(in srgb, var(--ea-bg) 82%, transparent); backdrop-filter:blur(6px);
  padding:9px 12px; font-size:12px; line-height:1.5; color:var(--ea-muted);
  display:flex; flex-direction:column; align-items:flex-start; gap:5px; }
.ea-infobar b{ color:var(--ea-ink); font-family:var(--ea-display); font-weight:700; }
.ea-k{ font-family:var(--ea-mono); font-size:10.5px; color:var(--ea-accent); letter-spacing:.08em; text-transform:uppercase; }
.ea-io{ display:block; margin-top:3px; font-family:var(--ea-mono); font-size:10.5px; color:var(--ea-faint); }
.ea-legend{ border:1px solid var(--ea-line); border-radius:10px;
  background:color-mix(in srgb, var(--ea-bg) 82%, transparent); backdrop-filter:blur(6px); padding:9px 12px;
  display:flex; flex-wrap:wrap; gap:7px 14px; font-family:var(--ea-mono); font-size:10.5px;
  color:var(--ea-muted); }
.ea-legend span{ display:inline-flex; align-items:center; gap:7px; }
.ea-legend i{ width:22px; height:3px; border-radius:2px; display:inline-block; }
.ea-legend .ea-dashed{ background:repeating-linear-gradient(90deg,var(--ea-ops) 0 5px,transparent 5px 9px); }
.ea-frame{ flex:1; min-width:0; min-height:0; overflow:hidden; display:flex; align-items:center; justify-content:center; }
.ea-stage{ position:relative; transform-origin:center center; flex:none; overflow:hidden; }
.ea-plane{ position:absolute; top:0; left:0; }
.ea-wires{ position:absolute; inset:0; pointer-events:none; }
.ea-top{ z-index:5; }
.ea-edge{ fill:none; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round;
  opacity:.9; transition:opacity .25s, stroke-width .25s; }
.ea-dash{ stroke-dasharray:5 6; }
.ea-elabel{ font-family:var(--ea-mono); font-size:11px; fill:var(--ea-muted);
  paint-order:stroke; stroke:var(--ea-bg); stroke-width:4px; stroke-linejoin:round; transition:opacity .25s; }
.ea-particle{ transition:opacity .25s; }
.ea-gpanel{ position:absolute; border:1px solid var(--ea-line); border-radius:14px;
  background:var(--ea-panel2); transition:opacity .25s; }
.ea-glabel{ position:absolute; top:-11px; left:16px; padding:2px 10px; background:var(--ea-bg);
  border:1px solid var(--ea-line); border-radius:99px; font-family:var(--ea-mono); font-size:11px;
  letter-spacing:.12em; text-transform:uppercase; color:var(--ea-muted); }
.ea-monitor{ border-style:dashed; border-color:color-mix(in srgb, var(--ea-process) 60%, transparent); }
.ea-monitor .ea-glabel{ color:var(--ea-process); border-color:color-mix(in srgb, var(--ea-process) 60%, transparent); }
.ea-node{ position:absolute; border:1px solid var(--ea-line); border-radius:10px;
  background:var(--ea-panel); padding:12px 14px 11px; cursor:default;
  box-shadow:var(--ea-shadow); transition:opacity .25s, border-color .25s, transform .25s; }
.ea-node::before{ content:""; position:absolute; left:-1px; top:10px; bottom:10px; width:3px;
  border-radius:3px; background:var(--ea-tag,var(--ea-ops)); }
.ea-node h3{ font-family:var(--ea-display); font-weight:700; font-size:15px; line-height:1.2; margin:0; color:var(--ea-ink); }
.ea-sub{ margin-top:4px; font-size:12px; color:var(--ea-muted); line-height:1.45; }
.ea-chips{ margin-top:7px; display:flex; flex-wrap:wrap; gap:5px; }
.ea-chip{ font-family:var(--ea-mono); font-size:10.5px; padding:2px 8px; border-radius:99px;
  border:1px solid var(--ea-line); color:var(--ea-muted); background:var(--ea-panel2); }
.ea-node:hover{ border-color:var(--ea-tag,var(--ea-ops)); transform:translateY(-1px); }
.ea-t-collect{ --ea-tag:var(--ea-collect); } .ea-t-process{ --ea-tag:var(--ea-process); }
.ea-t-store{ --ea-tag:var(--ea-store); }  .ea-t-serve{ --ea-tag:var(--ea-serve); } .ea-t-ops{ --ea-tag:var(--ea-ops); }
.ea-ghost{ background:transparent; border-style:dotted; box-shadow:none; }
.ea-bare{ background:transparent !important; border:none !important; box-shadow:none !important; padding:0 !important; }
.ea-bare::before{ display:none; }
.ea-es-head{ margin:-12px -14px 12px; padding:10px 14px; border-radius:10px 10px 0 0;
  background:linear-gradient(90deg,color-mix(in srgb, var(--ea-accent) 18%, transparent),color-mix(in srgb, var(--ea-accent) 4%, transparent));
  border-bottom:1px solid color-mix(in srgb, var(--ea-accent) 30%, transparent); display:flex; align-items:baseline; justify-content:space-between; }
.ea-es-head h3{ color:var(--ea-accent); font-size:18px; margin:0; font-family:var(--ea-display); font-weight:700; }
.ea-k2{ font-family:var(--ea-mono); font-size:10.5px; color:var(--ea-faint); letter-spacing:.1em; }
.ea-row{ display:flex; align-items:center; justify-content:space-between; gap:10px; padding:9px 10px;
  border:1px solid var(--ea-line); border-radius:8px; background:var(--ea-panel2); margin-bottom:8px; }
.ea-name{ font-family:var(--ea-display); font-weight:700; font-size:14px; color:var(--ea-ink); }
.ea-count{ font-family:var(--ea-mono); font-size:11px; color:var(--ea-accent); }
.ea-tiers{ display:flex; flex-direction:column; align-items:flex-end; gap:5px; margin:2px 0 10px; }
.ea-tier{ width:85%; display:flex; align-items:center; justify-content:flex-start; gap:7px; padding:6px 9px;
  border:1px solid var(--ea-line); border-radius:7px; background:var(--ea-panel2);
  font-family:var(--ea-mono); font-size:11px; color:var(--ea-muted); }
.ea-dot{ width:8px; height:8px; border-radius:99px; flex:none; }
.ea-tier small{ display:block; font-size:9.5px; color:var(--ea-faint); }
.ea-es-foot{ position:absolute; left:14px; right:14px; bottom:12px; border-top:1px dashed var(--ea-line);
  padding-top:10px; font-family:var(--ea-mono); font-size:10.5px; color:var(--ea-faint); line-height:1.6; }
.ea-mini{ display:flex; gap:12px; padding:14px 16px 12px; height:100%; box-sizing:border-box; }
.ea-col{ flex:1; border:1px solid var(--ea-line); border-radius:10px; background:var(--ea-panel); padding:10px 12px; }
.ea-col h4{ font-family:var(--ea-display); font-weight:700; font-size:14px; margin:0 0 8px; color:var(--ea-ink); }
.ea-col.ea-kb h4{ color:var(--ea-serve); } .ea-col.ea-e h4{ color:var(--ea-accent); }
.ea-tracing .ea-node, .ea-tracing .ea-gpanel{ opacity:.16; }
.ea-tracing .ea-edge, .ea-tracing .ea-elabel, .ea-tracing .ea-particle{ opacity:.05; }
.ea-tracing .ea-node.on, .ea-tracing .ea-gpanel.on{ opacity:1; }
.ea-tracing .ea-edge.on{ opacity:1; stroke-width:2.4; }
.ea-tracing .ea-elabel.on, .ea-tracing .ea-particle.on{ opacity:1; }
@media (prefers-reduced-motion: reduce){
  .ea-particle{ display:none; }
  .ea-node, .ea-node:hover{ transform:none; }
}
`

export default EnterpriseDeploymentScene
