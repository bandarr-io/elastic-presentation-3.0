import { useEffect, useMemo, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCubes, faCircleCheck, faTerminal, faTriangleExclamation, faLightbulb,
  faMagnifyingGlass, faRotateRight, faChevronDown, faCircleInfo,
} from '@fortawesome/free-solid-svg-icons'

// Source: kubernetes.html — OOTB OTel dashboards + autonomous root-cause analysis.
const FEATURES = [
  'Revamped dashboards & alerts',
  'OOTB SLOs & Agent Skills',
  'Kubernetes workflows',
]

// Kibana-style overview: per-section health stats + a health donut and the
// three "Top 10 …" metric charts (CPU / memory / disk), each with an
// Avg/Min/Max legend — mirroring the Kibana Kubernetes Overview dashboard.
const DASH = [
  {
    label: 'Clusters',
    totalLabel: 'Total clusters',
    notLabel: 'Unhealthy',
    breakdown: 'Clusters breakdown by health',
    donut: { value: 5, total: 5, label: 'Healthy' },
    charts: [
      { title: 'Top 10 clusters by CPU utilization', seed: 11, series: [
        { name: 'unknown_k8s_cluster', avg: '62%', min: '54%', max: '101%' },
        { name: 'oteldemo-esyox', avg: '22%', min: '6%', max: '52%' },
        { name: 'jmiller-robot-shop', avg: '9%', min: '4%', max: '18%' },
      ] },
      { title: 'Top 10 clusters by memory working set', seed: 23, series: [
        { name: 'unknown_k8s_cluster', avg: '62%', min: '60%', max: '71%' },
        { name: 'oteldemo-esyox', avg: '43%', min: '31%', max: '57%' },
        { name: 'jmiller-robot-shop', avg: '28%', min: '25%', max: '33%' },
      ] },
      { title: 'Top 10 clusters by disk usage', seed: 31, series: [
        { name: 'unknown_k8s_cluster', avg: '15%', min: '15%', max: '15%' },
        { name: 'oteldemo-esyox', avg: '15%', min: '12%', max: '16%' },
        { name: 'jmiller-robot-shop', avg: '16%', min: '16%', max: '16%' },
      ] },
    ],
  },
  {
    label: 'Nodes',
    totalLabel: 'Total nodes',
    notLabel: 'Not ready',
    breakdown: 'Nodes breakdown by readiness',
    donut: { value: 29, total: 29, label: 'Ready' },
    charts: [
      { title: 'Top 10 nodes by CPU utilization', seed: 41, series: [
        { name: 'gke-ensemble-ense…', avg: '103%', min: '98%', max: '104%' },
        { name: 'gke-ensemble-ense…', avg: '54%', min: '48%', max: '61%' },
        { name: 'gke-jmiller-bookinfo…', avg: '5%', min: '4%', max: '6%' },
      ] },
      { title: 'Top 10 nodes by memory working set', seed: 53, series: [
        { name: 'gke-ensemble-ense…', avg: '83%', min: '83%', max: '84%' },
        { name: 'gke-ensemble-ense…', avg: '52%', min: '49%', max: '55%' },
        { name: 'gke-jmiller-bookinfo…', avg: '17%', min: '17%', max: '18%' },
      ] },
      { title: 'Top 10 nodes by disk usage', seed: 61, series: [
        { name: 'gke-ensemble-ense…', avg: '17%', min: '17%', max: '17%' },
        { name: 'gke-ensemble-ense…', avg: '14%', min: '14%', max: '14%' },
        { name: 'gke-jmiller-bookinfo…', avg: '12%', min: '12%', max: '12%' },
      ] },
    ],
  },
]

const KIBANA_TABS = ['Overview', 'Clusters', 'Nodes', 'Namespaces', 'Workload resources', 'Pods']
const DATASET_FILTER = 'data_stream.dataset: k8sclusterreceiver.otel, kubeletstatereceiver.otel'

const RCA = {
  title: 'elastic-ai · root cause',
  hypothesis: 'checkout-service OOMKilling under memory pressure from upstream cart-service latency.',
  confidence: 'high',
  evidence: ['exit code 137 (OOMKilled)', 'memory at 98% of 512Mi', 'cart-service errors: 14%', 'p99 latency 7.6× elevated'],
  nextSteps: ['Check cart-service logs', 'Review CPU throttling', 'Increase checkout memory'],
}

// Deterministic PRNG so each chart's line stays stable across renders.
function mulberry32(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const CHART_W = 100
const CHART_H = 40

// Build `count` seamless line paths: each spans two identical halves so a
// -50% CSS scroll loops without a seam (last point == first point).
function buildLines(seed, count) {
  const rand = mulberry32(seed)
  const K = 13
  const stepW = CHART_W / (K - 1)
  return Array.from({ length: count }, () => {
    const ys = []
    let y = 8 + rand() * (CHART_H - 16)
    for (let i = 0; i < K; i++) {
      y += (rand() - 0.5) * (CHART_H * 0.55)
      y = Math.max(5, Math.min(CHART_H - 5, y))
      ys.push(y)
    }
    ys[K - 1] = ys[0]
    const first = ys.map((yy, i) => `${i === 0 ? 'M' : 'L'} ${(i * stepW).toFixed(1)} ${yy.toFixed(1)}`).join(' ')
    const second = ys.map((yy, i) => `L ${(CHART_W + i * stepW).toFixed(1)} ${yy.toFixed(1)}`).join(' ')
    return `${first} ${second}`
  })
}

function LiveChart({ seed, colors, gridColor = 'rgba(148,163,184,0.28)', rows = 4 }) {
  const lines = useMemo(() => buildLines(seed, colors.length), [seed, colors.length])
  const gridYs = Array.from({ length: rows + 1 }, (_, i) => (CHART_H / rows) * i)
  return (
    <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="w-full h-full block">
      {/* Static dashboard gridlines behind the series */}
      {gridYs.map((y, i) => (
        <line
          key={i}
          x1="0" x2={CHART_W} y1={y} y2={y}
          stroke={gridColor}
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <g className="motion-chart-scroll">
        {/* Faint filled area under each series for a dashboard feel */}
        {lines.map((d, i) => (
          <path
            key={`area-${i}`}
            d={`${d} L ${CHART_W * 2} ${CHART_H} L 0 ${CHART_H} Z`}
            fill={colors[i]}
            fillOpacity="0.1"
            stroke="none"
          />
        ))}
        {lines.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke={colors[i]}
            strokeWidth="1.2"
            strokeOpacity="0.9"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  )
}

// One "Top 10 …" panel: title, a live line chart, and an Avg/Min/Max legend.
function MetricChart({ chart, colors, mutedText, headText, divider }) {
  return (
    <div className="rounded-lg border p-2 flex flex-col min-w-0 min-h-0" style={{ borderColor: divider }}>
      <div className={`text-[10px] font-semibold leading-tight truncate mb-1.5 ${mutedText}`}>{chart.title}</div>
      <div className="flex gap-1.5 flex-1 min-h-0">
        <div className={`flex flex-col justify-between text-[8px] leading-none text-right w-7 shrink-0 py-px ${mutedText}`}>
          <span>100%</span>
          <span>50%</span>
          <span>0%</span>
        </div>
        <div className="relative flex-1 min-w-0">
          <LiveChart seed={chart.seed} colors={colors} gridColor={divider} />
        </div>
      </div>
      <div className="mt-1.5 flex flex-col gap-0.5">
        <div className={`flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wide ${mutedText}`}>
          <span className="flex-1" />
          <span className="w-8 text-right">Avg</span>
          <span className="w-8 text-right">Min</span>
          <span className="w-8 text-right">Max</span>
        </div>
        {chart.series.map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px] leading-tight">
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
            <span className={`flex-1 truncate ${mutedText}`}>{s.name}</span>
            <span className="w-8 text-right font-bold" style={{ color: colors[i] }}>{s.avg}</span>
            <span className={`w-8 text-right ${mutedText}`}>{s.min}</span>
            <span className={`w-8 text-right ${mutedText}`}>{s.max}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Donut({ value, total, sub, color, track, size = 150, stroke = 16 }) {
  const c = size / 2
  const r = (size - stroke) / 2 - 1
  const circ = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${circ * pct} ${circ}`} transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center leading-none">
        <span className="font-semibold text-sm" style={{ color }}>{sub} {value}</span>
      </div>
    </div>
  )
}

function KubernetesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Signals · Kubernetes'
  const titlePlain = metadata.titlePlain || 'Kubernetes, '
  const titleAccent = metadata.titleAccent || 'out of the box.'
  const subtitle = metadata.subtitle ||
    'The most widely deployed cloud infrastructure deserves monitoring that just works — with an agent that explains incidents for you.'
  const features = metadata.features || FEATURES
  const rca = { ...RCA, ...(metadata.rca || {}) }

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const green = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const divider = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)'
  const chartColors = isDark
    ? ['#48EFCF', '#FEC514', '#FF957D']
    : ['#0B64DD', '#00A0B0', '#F04E98']

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(70), easing: 'easeOutQuad',
    })
    // Stream the RCA console output one line at a time, like terminal stdout —
    // a deliberate cadence with a beat of setup before the findings land.
    const lines = el.querySelectorAll('.term-line')
    let lineAnim
    if (lines.length) {
      lineAnim = animate(lines, {
        opacity: [0, 1],
        translateX: [-6, 0],
        duration: 240,
        delay: stagger(300, { start: 900 }),
        easing: 'easeOutQuad',
      })
    }
    return () => { anim?.pause?.(); lineAnim?.pause?.() }
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-6 overflow-hidden">
      <div ref={rootRef} className="max-w-[1760px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 mt-2 grid grid-cols-1 lg:grid-cols-[0.6fr_1.9fr_0.8fr] gap-4">
          {/* Context */}
          <div className={`reveal rounded-2xl border flex flex-col p-6 min-h-0 ${cardBase}`}>
            <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4" style={{ backgroundColor: `${accent}1f`, color: accent }}>
              <FontAwesomeIcon icon={faCubes} />
            </span>
            <div className="font-headline font-extrabold text-5xl leading-none mb-1" style={{ color: accent }}>
              <CountUp value={93} format={(n) => `${n}%`} duration={1200} />
            </div>
            <p className={`text-lg font-semibold mb-4 ${headText}`}>of companies are using or evaluating Kubernetes</p>
            <ul className="space-y-3 mt-auto">
              {features.map((f, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-lg leading-snug ${mutedText}`}>
                  <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Live overview dashboard — Kibana Kubernetes Overview */}
          <div className={`reveal rounded-2xl border flex flex-col min-h-0 overflow-hidden ${cardBase}`}>
            {/* Toolbar */}
            <div className="flex items-center gap-2 px-3 py-2 border-b flex-shrink-0" style={{ borderColor: divider }}>
              <div className={`flex-1 min-w-0 flex items-center gap-1.5 rounded-md border px-2 py-1 ${mutedText}`} style={{ borderColor: divider }}>
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[9px] opacity-50" />
                <span className="text-[10px] truncate">Filter your data using KQL syntax</span>
              </div>
              <span className={`flex items-center gap-1 text-[10px] rounded-md border px-2 py-1 whitespace-nowrap ${mutedText}`} style={{ borderColor: divider }}>
                Last 15 minutes <FontAwesomeIcon icon={faChevronDown} className="text-[7px] opacity-60" />
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold rounded-md px-2 py-1 whitespace-nowrap" style={{ backgroundColor: accent, color: isDark ? '#0B1628' : '#fff' }}>
                <FontAwesomeIcon icon={faRotateRight} className="text-[8px]" /> Refresh
              </span>
            </div>
            {/* Dataset filter chip */}
            <div className="px-3 pt-2 flex-shrink-0">
              <span className="inline-block max-w-full truncate align-top text-[9px] font-mono rounded px-1.5 py-0.5" style={{ backgroundColor: `${accent}1f`, color: accent }}>{DATASET_FILTER}</span>
            </div>
            {/* Tabs */}
            <div className="flex items-center gap-3 px-3 mt-2 border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: divider }}>
              {KIBANA_TABS.map((t) => {
                const active = t === 'Overview'
                return (
                  <span key={t} className={`text-[11px] pb-1.5 whitespace-nowrap ${active ? 'font-bold' : mutedText}`} style={active ? { color: accent, borderBottom: `2px solid ${accent}` } : undefined}>{t}</span>
                )
              })}
            </div>
            {/* Sections */}
            <div className="flex-1 min-h-0 overflow-hidden p-3 flex flex-col gap-3">
              {DASH.map((s) => (
                <div key={s.label} className="flex flex-col min-h-0 flex-1">
                  <div className={`flex items-center gap-2 mb-2 flex-shrink-0 ${headText}`}>
                    <FontAwesomeIcon icon={faChevronDown} className="text-[11px] opacity-70" />
                    <span className="text-lg font-bold">{s.label}</span>
                  </div>
                  <div className="grid grid-cols-[15rem_1fr] gap-4 flex-1 min-h-0">
                    {/* Health stats + donut */}
                    <div className="flex flex-col min-h-0">
                      <div className="flex items-start gap-3 flex-shrink-0">
                        {[
                          { n: s.donut.total, l: s.totalLabel, muted: false },
                          { n: s.donut.value, l: s.donut.label, muted: false },
                          { n: '\u2205', l: s.notLabel, muted: true },
                        ].map((st, i) => (
                          <div key={i} className="flex flex-col min-w-0 w-[4.5rem]">
                            <span className={`font-headline font-extrabold text-3xl leading-none ${st.muted ? mutedText : headText}`}>{st.n}</span>
                            <span className={`text-[11px] leading-tight mt-1 ${mutedText}`}>{st.l}</span>
                          </div>
                        ))}
                      </div>
                      <div className={`flex items-center gap-2 mt-3 mb-2 flex-shrink-0 ${mutedText}`}>
                        <span className="text-[11px] leading-tight">{s.breakdown}</span>
                        <FontAwesomeIcon icon={faCircleInfo} className="text-[10px] opacity-50 shrink-0" />
                      </div>
                      <div className="flex-1 min-h-0 flex items-center justify-center">
                        <Donut value={s.donut.value} total={s.donut.total} sub={s.donut.label} color={green} track={divider} size={124} stroke={13} />
                      </div>
                    </div>
                    {/* Top-N metric charts */}
                    <div className="grid grid-cols-3 gap-2 min-w-0 min-h-0">
                      {s.charts.map((ch, ci) => (
                        <MetricChart key={ci} chart={ch} colors={chartColors} mutedText={mutedText} headText={headText} divider={divider} />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Autonomous RCA console */}
          <div className="reveal rounded-2xl border flex flex-col p-0 min-h-0 overflow-hidden" style={{ borderColor: `${accent}45`, backgroundColor: isDark ? '#0a1422' : '#0B1628' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${accent}26` }}>
              <FontAwesomeIcon icon={faTerminal} className="text-xs" style={{ color: accent }} />
              <span className="font-mono text-sm text-white/80">{rca.title}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-4 font-mono text-sm leading-relaxed">
              <div className="term-line text-white/40 mb-2">&gt; Scanning cluster metrics…</div>
              <div className="term-line flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faLightbulb} style={{ color: accent }} />
                <span className="font-bold" style={{ color: accent }}>Root cause hypothesis</span>
                <span className="text-white/50">(confidence: {rca.confidence})</span>
              </div>
              <p className="term-line text-white/90 mb-3">{rca.hypothesis}</p>
              <div className="term-line text-white/50 mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={faTriangleExclamation} /> Evidence</div>
              <ul className="mb-3 space-y-0.5">
                {rca.evidence.map((e, i) => <li key={i} className="term-line text-white/75">• {e}</li>)}
              </ul>
              <div className="term-line text-white/50 mb-1">Next steps</div>
              <ol className="space-y-0.5">
                {rca.nextSteps.map((s, i) => <li key={i} className="term-line text-white/75">{i + 1}. {s}</li>)}
              </ol>
              <div className="term-line mt-3 font-bold" style={{ color: green }}>&gt; Analysis complete ✓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KubernetesScene
