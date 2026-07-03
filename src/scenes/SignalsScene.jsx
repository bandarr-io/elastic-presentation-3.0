import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SceneStepper from '../components/SceneStepper'
import {
  faFileLines, faGaugeHigh, faDiagramProject, faStopwatch, faFire,
  faDatabase, faBolt, faChartLine, faCode, faRightLeft,
} from '@fortawesome/free-solid-svg-icons'

// Source: signals-intro.html + logs-pitch.html + metrics-pitch.html + promql.html
const SIGNALS = [
  { name: 'Logs', icon: faFileLines, desc: 'Structure, search, analyze at scale', tags: ['LogsDB', 'ES|QL', 'Pattern analysis'] },
  { name: 'Metrics', icon: faGaugeHigh, desc: 'Prometheus-native, columnar, any scale', tags: ['PromQL', 'Columnar store'] },
  { name: 'Traces', icon: faDiagramProject, desc: 'Distributed tracing & service maps', tags: ['OTel-native', 'Trace→log'] },
  { name: 'Synthetics', icon: faStopwatch, desc: 'Proactive uptime & performance', tags: ['Browser & API', 'SLAs'] },
  { name: 'Profiles', icon: faFire, desc: 'Always-on continuous profiling', tags: ['Flamegraphs', 'Correlated'] },
]

const EFFICIENCY = [
  { value: 65, format: (n) => `${n}%`, icon: faDatabase, label: 'smaller log storage', note: 'LogsDB vs standard Elasticsearch · 50% lower TCO' },
  { value: 30, format: (n) => `${n}×`, icon: faBolt, label: 'faster metrics', note: 'vs Prometheus & Mimir (ES 9.4 benchmarks)' },
  { value: 40, format: (n) => `~${n}%`, icon: faChartLine, label: 'faster queries', note: 'Compounding 9.x engineering, since Jan 2026' },
  { value: 80, format: (n) => `${n}%`, icon: faCode, label: 'of top-100 Grafana queries', note: 'PromQL runs natively in Kibana — up to 30× faster' },
]

const BEATS = [
  { key: 'signals', step: 'Signals', titlePlain: 'Every observability experience, ', titleAccent: 'one platform.', subtitle: 'Logs, Metrics, Traces, Synthetics, and Profiles — unified, correlated, and ready for the agent.' },
  { key: 'efficiency', step: 'Efficiency', titlePlain: 'Best-in-class efficiency, ', titleAccent: 'proven by benchmarks.', subtitle: 'The most efficient datastore for logs and metrics — faster investigations at a lower bill.' },
]

function SignalsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · Signals'
  const signals = metadata.signals || SIGNALS
  const efficiency = metadata.efficiency || EFFICIENCY
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

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
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {beat === 0 ? (
            <div className="flex-1 min-h-0 flex items-center">
            <div className="w-full grid grid-cols-2 md:grid-cols-5 gap-4">
              {signals.map((s, i) => (
                <div key={i} className={`reveal rounded-2xl border flex flex-col p-5 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: accent }}>
                  <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                    <FontAwesomeIcon icon={s.icon} />
                  </span>
                  <h3 className={`font-bold text-xl leading-tight mb-1.5 ${headText}`}>{s.name}</h3>
                  <p className={`text-base leading-snug mb-3 ${mutedText}`}>{s.desc}</p>
                  <div className="flex flex-nowrap gap-1 mt-auto">
                    {s.tags.map((t, j) => (
                      <span key={j} className="text-[11px] font-semibold rounded-full px-1.5 py-0.5 whitespace-nowrap" style={{ backgroundColor: `${accent}18`, color: accent }}>{t}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {efficiency.map((s, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col p-6 ${cardBase}`}>
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={s.icon} />
                    </span>
                    <div className="font-headline font-extrabold text-5xl leading-none mb-2" style={{ color: accent }}>
                      <CountUp value={s.value} format={s.format} duration={1200} replayKey={playKey} />
                    </div>
                    <div className={`text-base font-semibold leading-tight mb-2 ${headText}`}>{s.label}</div>
                    <div className={`text-sm leading-snug mt-auto ${mutedText}`}>{s.note}</div>
                  </div>
                ))}
              </div>
              <div className="reveal flex items-center justify-center gap-3 rounded-2xl border px-6 py-3.5 shrink-0"
                style={{ borderColor: `${accent}45`, backgroundColor: `${accent}12` }}>
                <FontAwesomeIcon icon={faRightLeft} style={{ color: accent }} />
                <p className={`text-base md:text-lg font-semibold ${headText}`}>
                  Migrate from Datadog or Grafana in <span style={{ color: accent }}>1 day</span> — dashboards and alerts converted automatically.
                </p>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={() => setPlayKey((k) => k + 1)} />
      </div>
    </div>
  )
}

export default SignalsScene
