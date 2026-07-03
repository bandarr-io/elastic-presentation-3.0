import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCubes, faHeartPulse, faServer, faGaugeHigh, faCircleCheck,
  faTerminal, faTriangleExclamation, faLightbulb,
} from '@fortawesome/free-solid-svg-icons'

// Source: kubernetes.html — OOTB OTel dashboards + autonomous root-cause analysis.
const FEATURES = [
  'Revamped dashboards & alerts',
  'OOTB SLOs & Agent Skills',
  'Kubernetes workflows',
]

const STATS = [
  { icon: faCubes, label: 'Clusters', value: '5 / 5', sub: 'Healthy' },
  { icon: faServer, label: 'Nodes', value: '29 / 29', sub: 'Ready' },
  { icon: faGaugeHigh, label: 'Cluster CPU', value: '62%', sub: 'avg · max 101%' },
  { icon: faHeartPulse, label: 'Memory', value: '62%', sub: 'avg · max 71%' },
]

const RCA = {
  title: 'elastic-ai · root cause',
  hypothesis: 'checkout-service OOMKilling under memory pressure from upstream cart-service latency.',
  confidence: 'high',
  evidence: ['exit code 137 (OOMKilled)', 'memory at 98% of 512Mi', 'cart-service errors: 14%', 'p99 latency 7.6× elevated'],
  nextSteps: ['Check cart-service logs', 'Review CPU throttling', 'Increase checkout memory'],
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
  const stats = metadata.stats || STATS
  const rca = { ...RCA, ...(metadata.rca || {}) }

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const green = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-6 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr_1fr] gap-4">
          {/* Context */}
          <div className={`reveal rounded-2xl border flex flex-col p-6 min-h-0 ${cardBase}`}>
            <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4" style={{ backgroundColor: `${accent}1f`, color: accent }}>
              <FontAwesomeIcon icon={faCubes} />
            </span>
            <div className="font-headline font-extrabold text-5xl leading-none mb-1" style={{ color: accent }}>
              <CountUp value={93} format={(n) => `${n}%`} duration={1200} />
            </div>
            <p className={`text-sm font-semibold mb-4 ${headText}`}>of companies are using or evaluating Kubernetes</p>
            <ul className="space-y-2.5 mt-auto">
              {features.map((f, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-sm leading-snug ${mutedText}`}>
                  <FontAwesomeIcon icon={faCircleCheck} className="mt-0.5 shrink-0" style={{ color: accent }} />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Dashboard snapshot */}
          <div className={`reveal rounded-2xl border flex flex-col p-5 min-h-0 ${cardBase}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>K8s Overview · Last 15 min</span>
              <span className="flex items-center gap-1.5 text-xs font-bold" style={{ color: green }}>
                <FontAwesomeIcon icon={faCircleCheck} /> All healthy
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              {stats.map((s, i) => (
                <div key={i} className="rounded-xl border flex flex-col justify-center p-4" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(16,28,63,0.08)' }}>
                  <span className="text-base mb-1" style={{ color: accent }}><FontAwesomeIcon icon={s.icon} /></span>
                  <span className={`text-[11px] font-semibold uppercase tracking-wider ${mutedText}`}>{s.label}</span>
                  <span className={`font-headline font-extrabold text-2xl leading-none ${headText}`}>{s.value}</span>
                  <span className={`text-xs mt-0.5 ${mutedText}`}>{s.sub}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Autonomous RCA console */}
          <div className="reveal rounded-2xl border flex flex-col p-0 min-h-0 overflow-hidden" style={{ borderColor: `${accent}45`, backgroundColor: isDark ? '#0a1422' : '#0B1628' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${accent}26` }}>
              <FontAwesomeIcon icon={faTerminal} className="text-xs" style={{ color: accent }} />
              <span className="font-mono text-xs text-white/80">{rca.title}</span>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden p-4 font-mono text-xs leading-relaxed">
              <div className="text-white/40 mb-2">&gt; Scanning cluster metrics…</div>
              <div className="flex items-center gap-2 mb-1">
                <FontAwesomeIcon icon={faLightbulb} style={{ color: accent }} />
                <span className="font-bold" style={{ color: accent }}>Root cause hypothesis</span>
                <span className="text-white/50">(confidence: {rca.confidence})</span>
              </div>
              <p className="text-white/90 mb-3">{rca.hypothesis}</p>
              <div className="text-white/50 mb-1 flex items-center gap-1.5"><FontAwesomeIcon icon={faTriangleExclamation} /> Evidence</div>
              <ul className="mb-3 space-y-0.5">
                {rca.evidence.map((e, i) => <li key={i} className="text-white/75">• {e}</li>)}
              </ul>
              <div className="text-white/50 mb-1">Next steps</div>
              <ol className="space-y-0.5">
                {rca.nextSteps.map((s, i) => <li key={i} className="text-white/75">{i + 1}. {s}</li>)}
              </ol>
              <div className="mt-3 font-bold" style={{ color: green }}>&gt; Analysis complete ✓</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default KubernetesScene
