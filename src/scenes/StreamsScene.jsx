import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SceneStepper from '../components/SceneStepper'
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

const STREAM_PATHS = ['/logs', '/metrics', '/traces']
const SUB_PATHS = ['/logs/aws/eks/nginx', '/metrics/k8s/pods', '/traces/services/api']
const ENTITIES = ['AWS', 'k8s', 'EKS', 'nginx', 'istio', 'postgres', 'redis', 'kafka', 'prometheus']
const EVENTS = ['Severe errors & crashes', 'Version updates', 'Change in pattern distribution']

const BEATS = [
  { key: 'pipeline', step: 'Pipeline', titlePlain: 'Five stages. ', titleAccent: 'One pipeline.', subtitle: 'Every signal from any source to Elasticsearch — parsed, routed, and tiered along the way.' },
  { key: 'insight', step: 'Raw → Insight', titlePlain: 'From raw data to ', titleAccent: 'immediate insight.', subtitle: 'Real-time, zero configuration — Elastic turns telemetry into agent-ready significant events.' },
]

function StreamsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Pillar 01 · Streams'
  const stages = metadata.stages || STAGES
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const sky = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const monoPill = isDark ? 'bg-white/[0.06] text-white/80' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/80'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(60), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const goTo = (i) => { setBeat(i); setPlayKey((k) => k + 1) }

  const Column = ({ title, color, children }) => (
    <div className="reveal flex flex-col min-h-0">
      <div className="text-sm font-bold uppercase tracking-wider mb-2 text-center" style={{ color }}>{title}</div>
      <div className={`flex-1 rounded-2xl border p-3 flex flex-col gap-2 min-h-0 ${cardBase}`}>{children}</div>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1380px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {beat === 0 ? (
            <div className="my-auto flex items-stretch gap-2">
              {stages.map((s, i) => (
                <div key={i} className="flex items-stretch gap-2 flex-1 min-w-0">
                  <div className={`reveal relative rounded-2xl border flex flex-col p-4 flex-1 min-w-0 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: sky }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ backgroundColor: `${sky}1f`, color: sky }}>
                        <FontAwesomeIcon icon={s.icon} />
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: sky }}>{s.num} · {s.label}</span>
                    </div>
                    <h3 className={`font-bold text-base leading-tight mb-1 ${headText}`}>{s.name}</h3>
                    <p className={`text-sm leading-snug mb-2 ${mutedText}`}>{s.desc}</p>
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {s.tags.map((t, j) => (
                        <span key={j} className={`text-xs font-medium rounded px-1.5 py-0.5 ${monoPill}`} style={{ fontFamily: t.startsWith('/') ? 'Space Mono, monospace' : undefined }}>{t}</span>
                      ))}
                    </div>
                  </div>
                  {i < stages.length - 1 && (
                    <div className="reveal flex items-center shrink-0">
                      <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${sky}99` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex items-center">
            <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3">
              <Column title="Top-Level Streams" color={sky}>
                {STREAM_PATHS.map((p, i) => (
                  <span key={i} className={`text-base font-medium rounded-lg px-3 py-2 text-center ${monoPill}`} style={{ fontFamily: 'Space Mono, monospace' }}>{p}</span>
                ))}
                <p className={`text-sm leading-snug mt-1 ${mutedText}`}>Central input destinations for every signal.</p>
              </Column>
              <Column title="Sub Streams" color={sky}>
                {SUB_PATHS.map((p, i) => (
                  <span key={i} className={`text-xs rounded-lg px-2.5 py-1.5 ${monoPill}`} style={{ fontFamily: 'Space Mono, monospace' }}>{p}</span>
                ))}
                <p className={`text-sm leading-snug mt-1 ${mutedText}`}>Schema · lifecycle · access per path.</p>
              </Column>
              <Column title="KIs & Entities" color={accent}>
                <div className="flex flex-wrap gap-1.5">
                  {ENTITIES.map((e, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}1c`, color: accent }}>{e}</span>
                  ))}
                </div>
                <p className={`text-sm leading-snug mt-auto ${mutedText}`}>Topology & dependencies auto-mapped in real time.</p>
              </Column>
              <Column title="Significant Events" color={accent}>
                {EVENTS.map((e, i) => (
                  <div key={i} className={`text-sm font-medium leading-snug rounded-lg px-2.5 py-1.5 ${headText}`} style={{ backgroundColor: `${accent}14` }}>{e}</div>
                ))}
                <div className="flex items-center gap-2 mt-auto text-sm font-bold" style={{ color: accent }}>
                  <FontAwesomeIcon icon={faRobot} /> Agent-ready
                </div>
              </Column>
            </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={() => setPlayKey((k) => k + 1)} />
      </div>
    </div>
  )
}

export default StreamsScene
