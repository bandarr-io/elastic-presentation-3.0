import { useEffect, useMemo, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneStepper from '../components/SceneStepper'
import CountUp from '../components/CountUp'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHeartPulse, faWaveSquare, faDiagramProject,
  faLightbulb, faArrowLeftLong, faArrowRightLong, faPlus,
  faAsterisk, faChevronRight,
} from '@fortawesome/free-solid-svg-icons'

// Recreation of the "Elastic MCP App for Kubernetes" demo (mcp-demo app):
// a Claude window driven by natural-language tool calls that steps through
// Health Summary -> Anomaly Explorer -> Anomaly Explainer -> Blast Radius.

// ── Shared status palette ──────────────────────────────────────────────────
const SEV = {
  ok:       { color: '#34d399', label: 'ok' },
  degraded: { color: '#f59e0b', label: 'degraded' },
  critical: { color: '#ef4444', label: 'critical' },
  major:    { color: '#f59e0b', label: 'major' },
  minor:    { color: '#3b82f6', label: 'minor' },
}

const BEATS = [
  { key: 'health',   step: 'Health Summary' },
  { key: 'explorer', step: 'Anomaly Explorer' },
  { key: 'explainer', step: 'Explainer' },
  { key: 'blast',    step: 'Blast Radius' },
]

const FEATURES = [
  { name: 'Health Summary', desc: 'Real-time system health across services and pods', color: SEV.ok.color, icon: faHeartPulse },
  { name: 'Anomaly Explorer', desc: 'ML-powered deviation detection with risk scoring', color: SEV.degraded.color, icon: faWaveSquare },
  { name: 'Blast Radius', desc: 'Impact analysis when a service or node goes down', color: SEV.critical.color, icon: faDiagramProject },
]

const CHAT_TURNS = [
  { user: 'check health for prod-us', tool: 'elastic_health_summary', response: 'prod-us is degraded: memory 84%, 3 pod restarts detected in the last hour.' },
  { user: 'show me the anomalies', tool: 'get_anomaly_explainer', response: '12 anomalies across 4 services. Checkout has a critical p99 latency spike at 93/100.' },
  { user: 'drill into the checkout anomaly', tool: 'get_anomaly_detail', response: 'p99 spiked 2.8\u00d7 typical (520ms vs 185ms). Deviation +181%. High confidence root cause.' },
  { user: "what's the blast radius?", tool: 'get_blast_radius', response: 'Node ip-10-0-12-84 at risk. 2 full outages, 4 degraded, 31 unaffected. Rescheduling infeasible.' },
]

// ── Sparkline helper ─────────────────────────────────────────────────────────
const SPARK_W = 100
const SPARK_H = 36
function sparkPaths(vals) {
  const step = SPARK_W / (vals.length - 1)
  const y = (v) => SPARK_H - v * (SPARK_H - 4) - 2
  const line = vals.map((v, i) => `${i ? 'L' : 'M'} ${(i * step).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  return { line, area: `${line} L ${SPARK_W} ${SPARK_H} L 0 ${SPARK_H} Z` }
}

function Sparkline({ vals, color }) {
  const { line, area } = useMemo(() => sparkPaths(vals), [vals])
  return (
    <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" className="w-full h-full block">
      <path d={area} fill={color} fillOpacity="0.14" stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// Multi-segment donut for the anomaly severity breakdown.
function SeverityDonut({ segments, total, size = 92, stroke = 12 }) {
  const c = size / 2
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ
          const el = (
            <circle
              key={i}
              cx={c} cy={c} r={r} fill="none" stroke={seg.color} strokeWidth={stroke}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${c} ${c})`}
            />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="font-headline font-extrabold text-2xl text-white">{total}</span>
        <span className="text-[9px] uppercase tracking-wider text-white/45 mt-0.5">total</span>
      </div>
    </div>
  )
}

// ── Small building blocks ─────────────────────────────────────────────────────
function Badge({ text, color, solid = false }) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-wide rounded px-1.5 py-0.5 whitespace-nowrap"
      style={solid
        ? { backgroundColor: color, color: '#0b1220' }
        : { backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {text}
    </span>
  )
}

function Chip({ children, muted }) {
  return (
    <span className={`text-[11px] font-mono rounded px-2 py-1 whitespace-nowrap ${muted ? 'text-white/45' : 'text-white/70'}`} style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
      {children}
    </span>
  )
}

function MetricCard({ label, value, display, unit, sev, spark, footer, replayKey }) {
  const s = SEV[sev]
  return (
    <div className="reveal rounded-lg p-3 flex flex-col min-w-0" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/45 truncate">{label}</span>
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="font-headline font-extrabold text-2xl leading-none text-white">
          {display != null
            ? display
            : <CountUp value={value} duration={1100} format={(n) => `${n}`} replayKey={replayKey} />}
        </span>
        {unit && <span className="text-[11px] text-white/45">{unit}</span>}
      </div>
      {spark
        ? <div className="h-8 mt-2"><Sparkline vals={spark} color={s.color} /></div>
        : footer && <div className="text-[10px] mt-2" style={{ color: sev === 'ok' ? s.color : 'rgba(255,255,255,0.5)' }}>{footer}</div>}
    </div>
  )
}

// ── Panel: Health Summary (beat 0) ────────────────────────────────────────────
const APP_METRICS = [
  { label: 'Throughput', display: '13.7K', unit: 'rpm', sev: 'ok', spark: [.5, .62, .45, .7, .55, .66, .5, .62, .72, .55, .66, .6] },
  { label: 'P99 Latency', value: 612, unit: 'ms', sev: 'degraded', spark: [.3, .32, .35, .33, .4, .38, .46, .52, .64, .76, .86, .96] },
  { label: 'Error Rate', display: '0.61', unit: '%', sev: 'ok', spark: [.2, .22, .2, .25, .22, .28, .3, .34, .4, .5, .6, .7] },
  { label: 'Services', value: 18, sev: 'critical', footer: '3 degraded' },
]
const K8S_METRICS = [
  { label: 'CPU', value: 62, unit: '%', sev: 'ok', spark: [.5, .55, .5, .6, .55, .62, .58, .6, .63, .6, .62, .6] },
  { label: 'Memory', value: 84, unit: '%', sev: 'degraded', spark: [.4, .45, .5, .55, .6, .65, .7, .75, .78, .8, .82, .84] },
  { label: 'Restarts', value: 3, sev: 'degraded', footer: 'last 1h' },
  { label: 'Nodes', value: 5, sev: 'ok', footer: 'all ready' },
]
const HEATMAP_ROWS = [
  { name: 'checkout', cells: [0, 0, 1, 0, 2, 3, 0, 1, 2, 3, 3, 1, 0, 2] },
  { name: 'shipping', cells: [0, 1, 0, 0, 1, 2, 0, 0, 2, 1, 2, 0, 1, 0] },
  { name: 'payments', cells: [0, 0, 0, 1, 0, 2, 1, 0, 1, 0, 2, 1, 0, 0] },
  { name: 'node-us-east-4', cells: [0, 0, 1, 0, 0, 1, 0, 2, 0, 1, 0, 0, 1, 0] },
  { name: 'node-us-west-1', cells: [0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0] },
]
const HEAT_COLORS = ['rgba(255,255,255,0.06)', SEV.minor.color, SEV.major.color, SEV.critical.color]

function HealthPanel({ playKey, headingBlock }) {
  return (
    <div className="flex flex-col gap-3 min-h-0">
      {headingBlock}
      <div className="reveal flex items-center gap-2 flex-wrap text-[11px] font-mono text-white/50">
        <span>cluster: prod-us-east-1</span><span className="text-white/20">·</span>
        <span>namespace: prod-us</span><span className="text-white/20">·</span>
        <span>10 services</span><span className="text-white/20">·</span>
        <span>42 pods</span>
      </div>

      <div className="reveal">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Application</div>
        <div className="grid grid-cols-4 gap-2.5">
          {APP_METRICS.map((m, i) => <MetricCard key={i} {...m} replayKey={playKey} />)}
        </div>
      </div>

      <div className="reveal">
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-1.5">Kubernetes</div>
        <div className="grid grid-cols-4 gap-2.5">
          {K8S_METRICS.map((m, i) => <MetricCard key={i} {...m} replayKey={playKey} />)}
        </div>
      </div>

      <div className="reveal flex items-start gap-2.5 rounded-lg px-3 py-2.5" style={{ backgroundColor: `${SEV.degraded.color}14`, border: `1px solid ${SEV.degraded.color}3a` }}>
        <FontAwesomeIcon icon={faLightbulb} className="mt-0.5" style={{ color: SEV.degraded.color }} />
        <span className="text-[12px] text-white/80">Investigate <b className="text-white">checkout</b>: p99 latency and error rate both breached baseline in the last 15 minutes.</span>
      </div>

      <div className="reveal grid grid-cols-[auto_1fr] gap-5 items-center rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <SeverityDonut total={11} segments={[
            { value: 2, color: SEV.critical.color },
            { value: 4, color: SEV.major.color },
            { value: 5, color: SEV.minor.color },
          ]} />
          <div className="flex flex-col gap-1 text-[11px]">
            {[['critical', 2, SEV.critical.color], ['major', 4, SEV.major.color], ['minor', 5, SEV.minor.color]].map(([l, n, c]) => (
              <span key={l} className="flex items-center gap-1.5 text-white/60">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
                <b className="text-white">{n}</b> {l}
              </span>
            ))}
          </div>
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">Top entities · last 60m</div>
          <div className="flex flex-col gap-1">
            {HEATMAP_ROWS.map((row) => (
              <div key={row.name} className="grid grid-cols-[92px_1fr] items-center gap-2">
                <span className="text-[10px] font-mono text-white/55 truncate">{row.name}</span>
                <div className="flex gap-1">
                  {row.cells.map((v, i) => (
                    <span key={i} className="flex-1 h-3 rounded-sm" style={{ backgroundColor: HEAT_COLORS[v] }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Panel: Anomaly Explorer list (beat 1) ─────────────────────────────────────
const ANOMALIES = [
  { svc: 'checkout', sev: 'critical', meta: 'apm-p99-latency · 4/23/2026', score: 93 },
  { svc: 'shipping', sev: 'major', meta: 'apm-p99-latency · 4/23/2026', score: 78 },
  { svc: 'payments', sev: 'major', meta: 'apm-error-rate · 4/23/2026', score: 64 },
  { svc: 'checkout', sev: 'minor', meta: 'apm-error-rate · 4/23/2026', score: 55 },
  { svc: 'node-us-east-4', sev: 'minor', meta: 'infra-memory-utilization · 4/23/2026', score: 48 },
]

function ExplorerPanel({ playKey, headingBlock }) {
  return (
    <div className="flex flex-col gap-3 min-h-0">
      {headingBlock}
      <div className="reveal flex items-center gap-4 rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <SeverityDonut total={6} size={80} stroke={11} segments={[
          { value: 1, color: SEV.critical.color },
          { value: 2, color: SEV.major.color },
          { value: 3, color: SEV.minor.color },
        ]} />
        <div className="flex flex-col gap-1 text-[12px]">
          {[['critical', 1, SEV.critical.color], ['major', 2, SEV.major.color], ['minor', 3, SEV.minor.color]].map(([l, n, c]) => (
            <span key={l} className="flex items-center gap-1.5 text-white/60">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} /> <b className="text-white">{n}</b> {l}
            </span>
          ))}
        </div>
      </div>

      <div className="reveal flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40">
        <span>Showing 5 anomalies</span>
        <span>Sort by: <span className="text-white/70">Risk score</span></span>
      </div>

      <div className="flex flex-col gap-2">
        {ANOMALIES.map((a, i) => (
          <div key={i} className="reveal flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${SEV[a.sev].color}` }}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white text-[14px]">{a.svc}</span>
                <Badge text={SEV[a.sev].label} color={SEV[a.sev].color} />
              </div>
              <div className="text-[11px] font-mono text-white/45 mt-0.5">{a.meta}</div>
            </div>
            <div className="text-right shrink-0">
              <div className="font-headline font-extrabold text-2xl leading-none" style={{ color: SEV[a.sev].color }}>
                <CountUp value={a.score} duration={1000} format={(n) => `${n}`} replayKey={playKey} />
              </div>
              <div className="text-[9px] uppercase tracking-wider text-white/40">score</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel: Anomaly Explainer detail (beat 2) ──────────────────────────────────
const DETAIL_FIELDS = [
  { l: 'Function', v: 'high_mean' },
  { l: 'Field', v: 'transaction.duration.us' },
  { l: 'Entity', v: 'checkout' },
  { l: 'Detected', v: '4/23/2026' },
  { l: 'Current P99', v: '520 ms' },
  { l: 'Typical', v: '185 ms' },
  { l: 'Deviation', v: '+181.0%', accent: true },
  { l: 'Host name', v: 'node-us-east-4' },
  { l: 'Environment', v: 'production' },
]
// Flat baseline then a sharp spike at the end (p99 latency).
const LATENCY_SERIES = [.28, .3, .27, .29, .31, .28, .3, .29, .32, .3, .34, .32, .36, .4, .58, .82, .9, .86, .88]

function ExplainerPanel({ playKey, headingBlock, onViewBlast }) {
  const { line, area } = useMemo(() => sparkPaths(LATENCY_SERIES), [])
  return (
    <div className="flex flex-col gap-3 min-h-0">
      {headingBlock}
      <div className="reveal flex items-center gap-4">
        <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
          <svg width="84" height="84" viewBox="0 0 84 84">
            <circle cx="42" cy="42" r="36" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" />
            <circle cx="42" cy="42" r="36" fill="none" stroke={SEV.critical.color} strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36 * 0.93} ${2 * Math.PI * 36}`} transform="rotate(-90 42 42)" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
            <span className="font-headline font-extrabold text-2xl" style={{ color: SEV.critical.color }}>
              <CountUp value={93} duration={1100} format={(n) => `${n}`} replayKey={playKey} />
            </span>
            <span className="text-[8px] uppercase tracking-wider text-white/45">/100</span>
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1"><Badge text="critical" color={SEV.critical.color} /></div>
          <div className="font-headline font-bold text-lg text-white leading-tight">checkout · p99 latency spiked 2.8&times; typical</div>
          <div className="text-[11px] font-mono text-white/45 mt-0.5">4/23/2026 · high_mean(transaction.duration.us)</div>
        </div>
      </div>

      <div className="reveal grid grid-cols-3 gap-x-5 gap-y-2.5 rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {DETAIL_FIELDS.map((f) => (
          <div key={f.l} className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wider text-white/40">{f.l}</div>
            <div className={`text-[13px] font-mono truncate ${f.accent ? 'font-bold' : 'text-white/85'}`} style={f.accent ? { color: SEV.critical.color } : undefined}>{f.v}</div>
          </div>
        ))}
      </div>

      <div className="reveal rounded-lg p-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2">P99 latency · last 30m</div>
        <div className="relative h-32">
          <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} preserveAspectRatio="none" className="w-full h-full block">
            <line x1="0" x2={SPARK_W} y1={SPARK_H - 0.32 * (SPARK_H - 4) - 2} y2={SPARK_H - 0.32 * (SPARK_H - 4) - 2} stroke="rgba(255,255,255,0.25)" strokeWidth="0.5" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
            <path d={area} fill={SEV.degraded.color} fillOpacity="0.16" stroke="none" />
            <path d={line} fill="none" stroke={SEV.degraded.color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="absolute top-0 right-1 text-[10px] font-mono text-white/50">520 ms</span>
          <span className="absolute bottom-6 left-1 text-[10px] font-mono text-white/40">185 ms baseline</span>
        </div>
      </div>

      <button onClick={onViewBlast} className="reveal self-start flex items-center gap-2 text-[13px] font-semibold rounded-lg px-3.5 py-2 transition-colors" style={{ color: SEV.critical.color, backgroundColor: `${SEV.critical.color}18`, border: `1px solid ${SEV.critical.color}44` }}>
        <FontAwesomeIcon icon={faArrowRightLong} /> View Blast Radius
      </button>
    </div>
  )
}

// ── Panel: Blast Radius graph (beat 3) ────────────────────────────────────────
const BLAST_NODES = [
  { id: 'frontend', label: 'frontend', state: 'degraded', x: 24, y: 22 },
  { id: 'payments', label: 'payments', state: 'degraded', x: 76, y: 20 },
  { id: 'inventory', label: 'inventory', state: 'degraded', x: 84, y: 54 },
  { id: 'shipping', label: 'shipping', state: 'degraded', x: 70, y: 84 },
  { id: 'checkout-api', label: 'checkout-api', state: 'full outage', x: 30, y: 86 },
  { id: 'redis-cache', label: 'redis-cache', state: 'full outage', x: 15, y: 54 },
]
const STATE_COLOR = { 'full outage': SEV.critical.color, degraded: SEV.degraded.color }
const BLAST_SUMMARY = [
  ['2 deployments', 'full outage', SEV.critical.color],
  ['4 deployments', 'degraded', SEV.degraded.color],
  ['31 deployments', 'unaffected', SEV.ok.color],
  ['34 pods', 'at risk', SEV.critical.color],
  ['4 downstream services', 'user-facing', SEV.degraded.color],
  ['rescheduling', 'infeasible', SEV.critical.color],
]
const SAFE_SERVICES = ['checkout', 'frontend', 'payments', 'shipping']

function BlastPanel({ headingBlock }) {
  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1">
      {headingBlock}
      <div className="reveal relative flex-1 min-h-0 rounded-lg overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
        {/* connector lines */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          {BLAST_NODES.map((n) => (
            <line key={n.id} x1="50" y1="50" x2={n.x} y2={n.y} stroke={`${STATE_COLOR[n.state]}66`} strokeWidth="0.4" strokeDasharray="1.5 1.5" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>

        {/* central at-risk node */}
        <div className="absolute" style={{ left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          <div className="rounded-full flex flex-col items-center justify-center text-center animate-pulse" style={{ width: 132, height: 132, backgroundColor: `${SEV.critical.color}1f`, border: `2px solid ${SEV.critical.color}` }}>
            <span className="font-mono text-[10px] text-white/80 px-2 leading-tight">ip-10-0-12-84</span>
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1" style={{ color: SEV.critical.color }}>at risk</span>
          </div>
        </div>

        {/* surrounding nodes */}
        {BLAST_NODES.map((n) => (
          <div key={n.id} className="absolute" style={{ left: `${n.x}%`, top: `${n.y}%`, transform: 'translate(-50%,-50%)' }}>
            <div className="rounded-full flex flex-col items-center justify-center text-center" style={{ width: 76, height: 76, backgroundColor: `${STATE_COLOR[n.state]}14`, border: `1.5px solid ${STATE_COLOR[n.state]}` }}>
              <span className="font-mono text-[9px] text-white/85 leading-tight px-1">{n.label}</span>
              <span className="text-[7px] uppercase tracking-wide mt-0.5" style={{ color: STATE_COLOR[n.state] }}>{n.state}</span>
            </div>
          </div>
        ))}

        {/* summary overlay */}
        <div className="absolute top-3 left-3 rounded-lg p-3 font-mono text-[10px] leading-relaxed max-w-[220px]" style={{ backgroundColor: 'rgba(11,18,32,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="text-white/45 uppercase tracking-wider mb-1.5 text-[9px] font-bold">Blast radius summary</div>
          {BLAST_SUMMARY.map(([k, v, c]) => (
            <div key={k} className="flex items-center gap-1.5">
              <span className="text-white/70">{k}:</span>
              <span style={{ color: c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* safe list */}
        <div className="absolute top-3 right-3 rounded-lg p-2.5 text-[10px]" style={{ backgroundColor: 'rgba(11,18,32,0.7)', border: `1px solid ${SEV.ok.color}33` }}>
          <div className="flex items-center gap-1.5 mb-1" style={{ color: SEV.ok.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: SEV.ok.color }} /> safe · 31 unaffected
          </div>
          {SAFE_SERVICES.map((s) => <div key={s} className="font-mono text-white/50 pl-3.5">{s}</div>)}
        </div>
      </div>
    </div>
  )
}

// ── Chat sidebar ──────────────────────────────────────────────────────────────
function ChatSidebar({ beat }) {
  const turns = CHAT_TURNS.slice(0, beat + 1)
  return (
    <div className="flex flex-col min-h-0 border-r" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Chat</span>
        <span className="flex items-center gap-1 text-[10px] text-white/45 rounded px-1.5 py-0.5" style={{ border: '1px solid rgba(255,255,255,0.1)' }}><FontAwesomeIcon icon={faPlus} className="text-[7px]" /> New</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
        {turns.map((t, i) => (
          <div key={i} className="flex flex-col gap-2 motion-msg-in">
            <div className="self-end rounded-lg rounded-tr-sm px-2.5 py-1.5 text-[12px] text-white max-w-[85%]" style={{ backgroundColor: 'rgba(72,239,207,0.14)' }}>{t.user}</div>
            <div className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[10px] font-mono text-white/60" style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <FontAwesomeIcon icon={faChevronRight} className="text-[7px] text-white/35" /> {t.tool}
            </div>
            <div className="text-[11px] leading-snug text-white/60">{t.response}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Panel heading helper ───────────────────────────────────────────────────────
function PanelHeading({ icon, title, badges, back }) {
  return (
    <div className="reveal flex items-center justify-between gap-2 flex-shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <FontAwesomeIcon icon={icon} style={{ color: '#48EFCF' }} />
        <span className="font-headline font-bold text-lg text-white truncate">{title}</span>
        {badges}
      </div>
      {back && <span className="flex items-center gap-1 text-[11px] text-white/45 rounded px-2 py-1 whitespace-nowrap" style={{ border: '1px solid rgba(255,255,255,0.12)' }}><FontAwesomeIcon icon={faArrowLeftLong} className="text-[9px]" /> {back}</span>}
    </div>
  )
}

function KubernetesMCPScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const beats = metadata.beats || BEATS
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats, { holdMs: 5200 })

  const eyebrow = metadata.eyebrow || 'Elastic for Claude · MCP Integration'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const activeFeature = beat === 0 ? 0 : beat === 3 ? 2 : 1

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [14, 0], duration: 460, delay: stagger(55), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  // Main-panel content per beat.
  let panel = null
  if (beat === 0) {
    panel = (
      <HealthPanel playKey={playKey} headingBlock={
        <PanelHeading icon={faHeartPulse} title="Health summary" badges={
          <span className="flex items-center gap-1.5 ml-1">
            <Badge text="degraded" color={SEV.degraded.color} />
            <Chip muted>namespace: prod-us</Chip>
            <Chip muted>lookback: 1h</Chip>
          </span>
        } />
      } />
    )
  } else if (beat === 1) {
    panel = (
      <ExplorerPanel playKey={playKey} headingBlock={
        <PanelHeading icon={faWaveSquare} title="Anomaly Explorer" back="Health" badges={
          <span className="ml-1 text-[12px] text-white/50 truncate">12 anomalies · 4 services · prod-us · last hour</span>
        } />
      } />
    )
  } else if (beat === 2) {
    panel = (
      <ExplainerPanel playKey={playKey} onViewBlast={() => goTo(3)} headingBlock={
        <PanelHeading icon={faWaveSquare} title="Anomaly Explainer" back="Anomalies" badges={
          <span className="hidden xl:flex items-center gap-1.5 ml-1">
            <Chip muted>job: apm-p99-latency</Chip>
            <Chip muted>entity: service.name=checkout</Chip>
          </span>
        } />
      } />
    )
  } else {
    panel = (
      <BlastPanel headingBlock={
        <PanelHeading icon={faDiagramProject} title="Blast radius" back="Anomaly" badges={
          <span className="flex items-center gap-1.5 ml-1">
            <Chip muted>node: ip-10-0-12-84</Chip>
            <Badge text="at risk" color={SEV.critical.color} />
          </span>
        } />
      } />
    )
  }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full flex-1 flex flex-col min-h-0">
        {/* App header */}
        <div className="flex items-end justify-between flex-shrink-0 pt-4 pb-3">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-eyebrow mb-2 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{eyebrow}</p>
            <h2 className={`font-headline text-3xl md:text-4xl font-extrabold leading-none ${headText}`}>
              Elastic <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>MCP</span> App for Kubernetes
            </h2>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Badge text="Health: Degraded" color={SEV.degraded.color} />
            <Badge text="namespace: prod-us" color={SEV.ok.color} />
            <Badge text="ML Anomalies: 12" color={SEV.ok.color} />
          </div>
        </div>

        <div ref={rootRef} className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5" key={`${beat}-${playKey}`}>
          {/* Left rail */}
          <div className="hidden lg:flex flex-col gap-4 min-h-0">
            <p className={`text-sm leading-relaxed ${mutedText}`}>
              Elastic's <b className={headText}>MCP server</b> brings full observability into Claude: health dashboards, ML anomaly detection, and blast radius analysis, all through <b className={headText}>natural language</b>.
            </p>
            <div className="flex flex-col gap-3">
              {FEATURES.map((f, i) => {
                const active = i === activeFeature
                return (
                  <div key={f.name} className={`rounded-xl border p-3.5 transition-all ${cardBase}`} style={active ? { borderColor: `${f.color}88`, backgroundColor: `${f.color}12` } : undefined}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                      <span className={`font-bold text-sm ${headText}`}>{f.name}</span>
                    </div>
                    <p className={`text-xs leading-snug ${mutedText}`}>{f.desc}</p>
                  </div>
                )
              })}
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: isDark ? '#48EFCF' : '#0B64DD' }}>
              <FontAwesomeIcon icon={faArrowRightLong} /> advance through the demo flow
            </span>
          </div>

          {/* Claude window */}
          <div className="rounded-2xl border flex flex-col min-h-0 overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#0b1220' }}>
            <div className="flex items-center px-4 py-2.5 border-b flex-shrink-0 relative" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <span className="flex gap-1.5 absolute left-4">
                <span className="w-3 h-3 rounded-full bg-[#FF5F57]" /><span className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><span className="w-3 h-3 rounded-full bg-[#28C840]" />
              </span>
              <span className="flex items-center gap-2 mx-auto">
                <span className="w-4 h-4 rounded flex items-center justify-center text-[8px]" style={{ backgroundColor: '#D97757', color: '#fff' }}><FontAwesomeIcon icon={faAsterisk} /></span>
                <span className="font-semibold text-sm text-white/80">Claude</span>
              </span>
              <span className="absolute right-4 font-mono text-[10px] text-white/35">claude-sonnet-4-5</span>
            </div>
            <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr]">
              <ChatSidebar beat={beat} />
              <div className="min-h-0 overflow-y-auto p-4 flex flex-col">{panel}</div>
            </div>
          </div>
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default KubernetesMCPScene
