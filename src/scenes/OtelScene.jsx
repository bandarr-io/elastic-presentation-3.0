import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCloud, faServer, faCircleNodes, faArrowRightLong, faTrophy, faDatabase,
} from '@fortawesome/free-solid-svg-icons'

// Source: 13-otel-collection.html — EDOT meets your data wherever it lives.
const SOURCES = [
  { name: 'Cloud', icon: faCloud, sub: 'AWS · Azure · GCP', path: 'Cloud Forwarder or Agentless — triggers on cloud events, no infra' },
  { name: 'On-Premise', icon: faServer, sub: 'Kubernetes · Linux · Windows', path: 'EDOT Collector + Gateway — edge collection with OTTL processing' },
  { name: 'Any OTel', icon: faCircleNodes, sub: 'SDKs · Libraries · 3rd-party', path: 'Direct OTLP — send straight to Elastic, no collector needed' },
]

const SIGNALS = ['Logs', 'Metrics', 'Traces', 'Profiles']

function OtelScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Streams · Open Standards'
  const titlePlain = metadata.titlePlain || 'Collect everything, '
  const titleAccent = metadata.titleAccent || 'from everywhere.'
  const subtitle = metadata.subtitle ||
    'EDOT — the Elastic Distribution of OpenTelemetry — meets your data wherever it lives, then hands it to a managed ingest layer Elastic scales for you.'
  const sources = metadata.sources || SOURCES

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const sky = isDark ? '#48EFCF' : '#0B64DD'
  const gold = isDark ? '#FEC514' : '#0B64DD'
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

        {/* #1 contributor badge */}
        <div className="reveal flex justify-center mb-4 shrink-0">
          <div className="inline-flex items-center gap-3 rounded-2xl border px-5 py-2.5" style={{ borderColor: `${gold}66`, backgroundColor: `${gold}14` }}>
            <FontAwesomeIcon icon={faTrophy} style={{ color: gold }} />
            <span className={`text-sm md:text-base font-bold ${headText}`}>
              <span style={{ color: gold }}>#1 OpenTelemetry contributor</span> — we build the standard we support.
            </span>
          </div>
        </div>

        {/* Architecture flow */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1.4fr_auto_0.9fr_auto_0.8fr] gap-3 items-stretch">
          {/* Sources + paths */}
          <div className="flex flex-col gap-3 min-h-0">
            {sources.map((s, i) => (
              <div key={i} className={`reveal rounded-2xl border flex items-center gap-3 p-3.5 flex-1 min-h-0 ${cardBase}`}>
                <span className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${sky}1f`, color: sky }}>
                  <FontAwesomeIcon icon={s.icon} />
                </span>
                <div className="min-w-0">
                  <div className={`font-bold text-sm leading-tight ${headText}`}>{s.name} <span className={`font-normal text-xs ${mutedText}`}>· {s.sub}</span></div>
                  <p className={`text-xs leading-snug mt-0.5 ${mutedText}`}>{s.path}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="reveal hidden lg:flex items-center justify-center">
            <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} />
          </div>

          {/* OTLP endpoint */}
          <div className="reveal rounded-2xl border flex flex-col items-center justify-center text-center p-4 min-h-0"
            style={{ borderColor: `${accent}66`, background: `linear-gradient(160deg, ${accent}1f, ${accent}08)` }}>
            <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>OTLP Endpoint</div>
            <div className={`text-sm font-semibold mb-3 ${headText}`}>Single entry for all OTel signals</div>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {SIGNALS.map((s, i) => (
                <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: `${accent}22`, color: accent }}>{s}</span>
              ))}
            </div>
            <div className={`text-[11px] leading-snug mt-3 ${mutedText}`}>Managed Ingest — Elastic scales the pipeline for you, no infra to manage.</div>
          </div>

          <div className="reveal hidden lg:flex items-center justify-center">
            <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}99` }} />
          </div>

          {/* Elastic */}
          <div className="reveal rounded-2xl border flex flex-col items-center justify-center text-center p-4 min-h-0" style={{ borderColor: `${accent}66`, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.9)' }}>
            <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-3" style={{ backgroundColor: `${accent}1f`, color: accent }}>
              <FontAwesomeIcon icon={faDatabase} />
            </span>
            <div className={`font-bold text-base leading-tight ${headText}`}>Elastic Observability</div>
            <div className={`text-xs leading-snug mt-1 ${mutedText}`}>Stored, correlated, and agent-ready.</div>
          </div>
        </div>

        <div className="reveal text-center text-xs font-semibold uppercase tracking-wider mt-3 shrink-0" style={{ color: `${accent}cc` }}>
          Customer environment&nbsp;&nbsp;→&nbsp;&nbsp;Elastic Cloud
        </div>
      </div>
    </div>
  )
}

export default OtelScene
