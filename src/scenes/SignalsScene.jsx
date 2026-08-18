import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFileLines, faGaugeHigh, faDiagramProject, faStopwatch, faFire,
  faRightLeft, faArrowTrendUp,
} from '@fortawesome/free-solid-svg-icons'

// Source: signals-intro.html + logs-pitch.html + metrics-pitch.html + promql.html
const SIGNALS = [
  { name: 'Logs', icon: faFileLines, desc: 'Structure, search, and analyze every log at scale.', bullets: ['LogsDB — 65% smaller storage', 'ES|QL for fast ad-hoc queries', 'Pattern analysis & clustering'] },
  { name: 'Metrics', icon: faGaugeHigh, desc: 'Prometheus-native. Columnar storage. At any scale.', bullets: ['Native PromQL support', '30× faster than Prometheus', 'Kubernetes & cloud out of the box'] },
  { name: 'Traces', icon: faDiagramProject, desc: 'Distributed tracing and service dependency mapping.', bullets: ['OTel-native ingestion', 'Service map & topology', 'Trace-to-log correlation'] },
  { name: 'Synthetics', icon: faStopwatch, desc: 'Proactive uptime and performance monitoring.', bullets: ['Browser & API monitors', 'SLA tracking & alerting', 'Global monitoring locations'] },
  { name: 'Profiles', icon: faFire, desc: 'Continuous profiling for CPU, memory, and latency.', bullets: ['Always-on, low overhead', 'Flamegraphs in context', 'Correlated with traces & logs'] },
]

const SIGNALS_PANELS = [
  {
    eyebrow: 'Datastore efficiency',
    title: 'The most efficient store for logs and metrics',
    body: 'LogsDB and columnar metrics storage deliver dramatic cost reduction without sacrificing query speed.',
    stats: [
      { value: 65, format: (n) => `${n}%`, label: 'log storage reduction' },
      { value: 30, format: (n) => `${n}×`, label: 'faster metrics vs Prometheus' },
      { value: 40, format: (n) => `~${n}%`, label: 'faster query time' },
    ],
  },
  {
    eyebrow: 'GTM focus · Metrics',
    title: 'Winning the Prometheus migration',
    body: 'Native PromQL, remote write, and Kubernetes integrations make Elastic the obvious destination for teams moving off Prometheus.',
    chips: [{ k: 'PromQL', v: 'fully native' }, { k: 'OTel', v: 'standard ingestion' }, { k: 'k8s', v: 'out of the box' }],
  },
]

// Logs efficiency (image 8 · logs-pitch.html)
const LOGS_CARDS = [
  {
    title: 'LogsDB Index Mode', status: 'GA · 8.17+', ga: true,
    body: 'A purpose-built index mode for log data. Smart sorting by host.name and @timestamp places similar records adjacent, dramatically improving compression. Synthetic _source reconstructs fields on demand — no redundant storage.',
    stats: [
      { value: '65%', label: 'storage reduction vs standard Elasticsearch' },
      { value: '50%', label: 'TCO reduction for long-term log retention' },
      { value: '30%', label: 'additional savings from smart index sorting alone' },
    ],
    footer: 'Read the deep dive →',
  },
  {
    title: 'Columnar datastore mode', status: 'In development', ga: false,
    body: 'By skipping inverted indexes and BKD trees entirely and using compressed binary doc-values, Elasticsearch reaches near-columnar storage density for high-volume analytics workloads where every byte counts.',
    stats: [
      { value: '168 B', label: 'per record in doc-values mode' },
      { value: '~5×', label: 'improvement vs standard Elasticsearch (805 B/record)' },
      { value: 'Near parity', label: 'with best-in-class columnar stores' },
    ],
    footer: 'Full columnar logs will close the gap entirely.',
  },
]

const LOGS_BARS = [
  { name: 'LuceneSource DOC partitioning', mult: '3× avg', pct: 55 },
  { name: 'Skipper competitive iterator', mult: '11× avg', pct: 100 },
  { name: 'Swiss hashtables', mult: '1.4× avg', pct: 26 },
  { name: 'Wildcard query rewrite', mult: '3.3× avg', pct: 60 },
]

// Metrics efficiency (image 7 · metrics-pitch.html)
const METRICS_CARDS = [
  {
    title: 'Blazing Fast Query Performance', hero: '30×', heroNote: 'faster: Prometheus & Mimir',
    chips: ['up to 30× faster vs Prometheus', 'up to 30× faster vs Mimir', '7× faster vs ClickHouse'],
    why: 'Delivers faster AI investigations.', status: 'GA', ga: true,
  },
  {
    title: 'Significant Storage Efficiency Gain', hero: '6.6–8×', heroNote: 'overall vs ES 8.x',
    chips: ['2.6× better vs Prometheus', '2× better vs ClickHouse'],
    why: 'Faster root cause. Store more for richer AI context at lower cost.', status: 'GA in 9.4', ga: true,
  },
  {
    title: 'Prometheus-native Ingest & PromQL', hero: 'on par', heroNote: 'with Mimir (404K) & Prometheus',
    chips: ['on par with Mimir & Prometheus', '1.4× better vs ClickHouse'],
    why: 'Zero friction to switch. Engineers using Grafana feel right at home.', status: 'Tech preview', ga: false,
  },
]

const BEATS = [
  { key: 'signals', step: 'Signals', titlePlain: 'Every observability experience, ', titleAccent: 'one platform.', subtitle: 'Logs, Metrics, Traces, Synthetics, and Profiles — unified, correlated, and ready for the agent.' },
  { key: 'logs', step: 'Logs', titlePlain: 'Best-in-class efficiency for ', titleAccent: 'logs.', subtitle: 'Three compounding engineering bets: LogsDB, a columnar datastore, and ~40% faster queries since Jan 2026.', hold: 4200 },
  { key: 'metrics', step: 'Metrics', titlePlain: 'Best-in-class efficiency for ', titleAccent: 'metrics.', subtitle: 'Elasticsearch 9.4 benchmarks — faster investigations at a lower bill, with zero-friction Prometheus migration.', hold: 4200 },
]

function SignalsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Observability · Signals'
  const signals = metadata.signals || SIGNALS
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const amber = isDark ? '#FEC514' : '#B7791F'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(60), easing: 'easeOutQuad',
    })
    // Grow the logs query-latency bars from 0 to target.
    const bars = el.querySelectorAll('[data-bar]')
    let barAnim
    if (bars.length) {
      barAnim = animate(bars, {
        width: (b) => [`0%`, `${b.getAttribute('data-bar')}%`],
        duration: 900, delay: stagger(120, { start: 300 }), easing: 'easeOutCubic',
      })
    }
    return () => { anim?.pause?.(); barAnim?.pause?.() }
  }, [beat, playKey])

  const statusPill = (label, ga) => (
    <span className="text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5 self-start" style={{ backgroundColor: `${ga ? accent : amber}1f`, color: ga ? accent : amber }}>
      {label}
    </span>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1360px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {/* Beat 1 — Signals + efficiency/GTM panels */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {signals.map((s, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col p-4 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: accent }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2.5" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={s.icon} />
                    </span>
                    <h3 className={`font-bold text-xl leading-tight mb-1 ${headText}`}>{s.name}</h3>
                    <p className={`text-sm leading-snug mb-2.5 ${mutedText}`}>{s.desc}</p>
                    <ul className="mt-auto flex flex-col gap-1">
                      {s.bullets.map((b, j) => (
                        <li key={j} className={`flex items-start gap-1.5 text-xs leading-snug ${mutedText}`}>
                          <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
                {/* Datastore efficiency */}
                <div className="reveal rounded-2xl border p-4" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0d` }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>{SIGNALS_PANELS[0].eyebrow}</div>
                  <div className={`font-bold text-lg leading-tight mb-1 ${headText}`}>{SIGNALS_PANELS[0].title}</div>
                  <p className={`text-sm leading-snug mb-2 ${mutedText}`}>{SIGNALS_PANELS[0].body}</p>
                  <div className="flex gap-5">
                    {SIGNALS_PANELS[0].stats.map((s, i) => (
                      <div key={i}>
                        <div className="font-headline font-extrabold text-2xl leading-none" style={{ color: accent }}>
                          <CountUp value={s.value} format={s.format} duration={1100} replayKey={playKey} />
                        </div>
                        <div className={`text-[11px] leading-tight mt-1 ${mutedText}`}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* GTM focus */}
                <div className={`reveal rounded-2xl border p-4 ${cardBase}`}>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: amber }}>{SIGNALS_PANELS[1].eyebrow}</div>
                  <div className={`font-bold text-lg leading-tight mb-1 ${headText}`}>{SIGNALS_PANELS[1].title}</div>
                  <p className={`text-sm leading-snug mb-2.5 ${mutedText}`}>{SIGNALS_PANELS[1].body}</p>
                  <div className="flex flex-wrap gap-2">
                    {SIGNALS_PANELS[1].chips.map((c, i) => (
                      <span key={i} className="text-sm rounded-lg px-2.5 py-1" style={{ backgroundColor: `${accent}14` }}>
                        <span className="font-bold" style={{ color: accent }}>{c.k}</span> <span className={mutedText}>{c.v}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 2 — Logs efficiency */}
          {beat === 1 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
              {LOGS_CARDS.map((c, i) => (
                <div key={i} className={`reveal rounded-2xl border flex flex-col p-5 ${cardBase}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-bold text-lg leading-tight ${headText}`}>{c.title}</h3>
                  </div>
                  {statusPill(c.status, c.ga)}
                  <p className={`text-sm leading-snug my-3 ${mutedText}`}>{c.body}</p>
                  <div className="mt-auto flex flex-col gap-2">
                    {c.stats.map((s, j) => (
                      <div key={j} className="flex items-baseline gap-2.5 rounded-lg px-3 py-2" style={{ backgroundColor: `${accent}10` }}>
                        <span className="font-headline font-extrabold text-2xl leading-none shrink-0" style={{ color: accent }}>{s.value}</span>
                        <span className={`text-xs leading-tight ${mutedText}`}>{s.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className={`text-xs font-semibold mt-3 ${c.footer.includes('→') ? '' : 'italic'}`} style={{ color: c.footer.includes('→') ? accent : undefined }}>
                    <span className={c.footer.includes('→') ? '' : mutedText}>{c.footer}</span>
                  </div>
                </div>
              ))}
              {/* Query latency card */}
              <div className={`reveal rounded-2xl border flex flex-col p-5 ${cardBase}`}>
                <h3 className={`font-bold text-lg leading-tight mb-2 ${headText}`}>Query Latency: ~40% faster since Jan 2026</h3>
                {statusPill('ES 0.4', true)}
                <p className={`text-sm leading-snug my-3 ${mutedText}`}>Three focused engineering investments compounded across 9.x to cut average query execution time — each stacks on the last.</p>
                <div className="mt-auto flex flex-col gap-2.5">
                  {LOGS_BARS.map((b, j) => (
                    <div key={j}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs ${headText}`}>{b.name}</span>
                        <span className="text-xs font-bold" style={{ color: accent }}>{b.mult}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,28,63,0.08)' }}>
                        <div className="h-full rounded-full" data-bar={b.pct} style={{ width: 0, backgroundColor: accent }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold mt-3" style={{ color: accent }}>
                  <FontAwesomeIcon icon={faArrowTrendUp} /> ~40% faster average query time since Jan 2026
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Beat 3 — Metrics efficiency */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {METRICS_CARDS.map((c, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col p-5 ${cardBase}`}>
                    <h3 className={`font-bold text-lg leading-tight mb-3 ${headText}`}>{c.title}</h3>
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="font-headline font-extrabold text-5xl leading-none" style={{ color: accent }}>{c.hero}</span>
                      <span className={`text-sm ${mutedText}`}>{c.heroNote}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 mb-3">
                      {c.chips.map((chip, j) => (
                        <span key={j} className="text-sm font-semibold rounded-lg px-2.5 py-1 self-start" style={{ backgroundColor: `${accent}14`, color: accent }}>{chip}</span>
                      ))}
                    </div>
                    <div className="mt-auto">
                      <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>Why it matters</div>
                      <p className={`text-sm leading-snug mb-2.5 ${mutedText}`}>{c.why}</p>
                      <div className="flex items-center gap-2 pt-2.5 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,28,63,0.08)' }}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.ga ? accent : amber }} />
                        {statusPill(c.status, c.ga)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="reveal flex items-center justify-center gap-3 rounded-2xl border px-6 py-3 shrink-0" style={{ borderColor: `${accent}45`, backgroundColor: `${accent}12` }}>
                <FontAwesomeIcon icon={faRightLeft} style={{ color: accent }} />
                <p className={`text-base md:text-lg font-semibold ${headText}`}>
                  Migrate in <span style={{ color: accent }}>1 day</span> from Datadog and Grafana → Elastic.
                </p>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default SignalsScene
