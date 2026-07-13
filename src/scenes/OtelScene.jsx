import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCloud, faServer, faCircleNodes, faArrowRightLong, faTrophy, faDatabase, faBolt,
} from '@fortawesome/free-solid-svg-icons'

// Source: 13-otel-collection.html — EDOT meets your data wherever it lives.
const SOURCES = [
  { name: 'Cloud', icon: faCloud, tags: ['AWS', 'Azure', 'GCP'] },
  { name: 'On-Premise', icon: faServer, tags: ['Kubernetes', 'Linux', 'Windows', 'Enterprise Apps'] },
  { name: 'Any OTel', icon: faCircleNodes, tags: ['SDKs', 'Libraries', 'Agents', '3rd-party'] },
]

const COLLECTION = [
  {
    primary: { name: 'EDOT Cloud Forwarder', sub: 'EDOT Collector as a function · serverless trigger' },
    secondary: { name: 'Agentless', sub: 'no agent install · API-based collection', prefix: 'or' },
  },
  {
    primary: { name: 'EDOT Collector', sub: 'on-host · sidecar · DaemonSet' },
    secondary: { name: 'EDOT Gateway', sub: 'RECV → PROC → EXPORT · multi-route', badge: 'OTTL', arrow: true },
  },
  {
    primary: { name: 'Direct OTLP', sub: 'any OTel SDK or agent · native protocol', muted: true },
    note: 'no collector needed',
  },
]

const RAIL_BULLETS = [
  { name: 'Cloud Forwarder & Agentless', desc: 'EDOT as a function — no infra, triggers on cloud events' },
  { name: 'EDOT Collector + Gateway', desc: 'Edge collectors with OTTL pipeline processing on-prem' },
  { name: 'Managed Ingest', desc: 'Send direct — Elastic scales the ingest layer for you' },
]

const SIGNALS = ['Logs', 'Metrics', 'Traces', 'Profiles']

function OtelScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · OpenTelemetry'
  const titlePlain = metadata.titlePlain || 'Collect everything, '
  const titleAccent = metadata.titleAccent || 'from everywhere.'
  const subtitle = metadata.subtitle ||
    'EDOT — the Elastic Distribution of OpenTelemetry — meets your data wherever it lives, then hands it to a managed ingest layer Elastic scales for you.'
  const sources = metadata.sources || SOURCES

  const { playKey, isPlaying, replay, toggleAutoplay } = useSceneMotion(1, { holdMs: 5000 })

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const amber = isDark ? '#FEC514' : '#B7791F'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateX: [-14, 0], duration: 460, delay: stagger(55), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [playKey])

  const chip = (t) => (
    <span key={t} className="text-[11px] font-semibold rounded-md px-1.5 py-0.5" style={{ backgroundColor: `${accent}18`, color: accent }}>{t}</span>
  )

  const collectionCard = ({ name, sub, muted, badge }) => (
    <div className={`rounded-xl border p-3 ${cardBase}`} style={muted ? { opacity: 0.92 } : { borderColor: `${accent}45` }}>
      <div className="flex items-center gap-2">
        <span className={`font-bold text-[13px] leading-tight ${headText}`}>{name}</span>
        {badge && <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5" style={{ backgroundColor: `${amber}22`, color: amber }}>{badge}</span>}
      </div>
      <div className={`text-[10px] leading-snug mt-0.5 ${mutedText}`}>{sub}</div>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={playKey}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
          </div>

          <div className="flex-1 min-h-0 flex gap-4">
            {/* Left rail */}
            <div className="reveal w-64 shrink-0 self-center flex flex-col gap-3">
              <p className={`text-[13px] leading-snug ${mutedText}`}>
                Cloud, on-prem, or mixed: <span className={`font-semibold ${headText}`}>EDOT meets your data wherever it lives</span> and lets you collect, process, or forward it at any scale.
              </p>
              <div className="flex flex-col gap-2">
                {RAIL_BULLETS.map((b, i) => (
                  <div key={i} className={`rounded-xl border p-2.5 ${cardBase}`}>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                      <span className={`text-xs font-bold ${headText}`}>{b.name}</span>
                    </div>
                    <div className={`text-[10px] leading-snug mt-0.5 pl-3.5 ${mutedText}`}>{b.desc}</div>
                  </div>
                ))}
              </div>
              <div className="rounded-xl border p-3 mt-1" style={{ borderColor: `${accent}59`, background: `linear-gradient(160deg, ${accent}1c, ${accent}06)` }}>
                <div className="flex items-center gap-2">
                  <FontAwesomeIcon icon={faTrophy} style={{ color: accent }} />
                  <span className="font-headline font-extrabold text-lg" style={{ color: accent }}>#1</span>
                  <span className={`text-xs font-bold ${headText}`}>OTel contributor</span>
                </div>
                <div className={`text-[10px] leading-snug mt-1 ${mutedText}`}>We build the standard we support.</div>
              </div>
            </div>

            {/* Flow */}
            <div className="flex-1 my-auto grid grid-cols-[1fr_auto_1.35fr_auto_1fr] gap-2.5 items-stretch">
              {/* Sources */}
              <div className="flex flex-col gap-2.5 min-h-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Sources</div>
                {sources.map((s, i) => (
                  <div key={i} className={`reveal rounded-xl border flex flex-col p-3 flex-1 justify-center ${cardBase}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                        <FontAwesomeIcon icon={s.icon} />
                      </span>
                      <span className={`font-bold text-sm ${headText}`}>{s.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">{s.tags.map(chip)}</div>
                  </div>
                ))}
              </div>

              <div className="reveal flex flex-col justify-around items-center py-2">
                {[0, 1, 2].map((i) => <FontAwesomeIcon key={i} icon={faArrowRightLong} style={{ color: `${accent}88` }} />)}
              </div>

              {/* Collection & processing */}
              <div className="flex flex-col gap-2.5 min-h-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Collection &amp; Processing · Customer Environment</div>
                {COLLECTION.map((c, i) => (
                  <div key={i} className="reveal flex-1 flex items-center gap-2 min-h-0">
                    <div className="flex-1">{collectionCard(c.primary)}</div>
                    {c.secondary && (
                      <>
                        {c.secondary.prefix
                          ? <span className={`text-[10px] italic ${mutedText}`}>{c.secondary.prefix}</span>
                          : <FontAwesomeIcon icon={faArrowRightLong} className="text-xs" style={{ color: `${accent}88` }} />}
                        <div className="flex-1">{collectionCard(c.secondary)}</div>
                      </>
                    )}
                    {c.note && <span className={`text-[10px] italic whitespace-nowrap ${mutedText}`}>{c.note}</span>}
                  </div>
                ))}
              </div>

              <div className="reveal flex flex-col justify-center items-center">
                <FontAwesomeIcon icon={faArrowRightLong} style={{ color: `${accent}88` }} />
              </div>

              {/* Elastic platform */}
              <div className="flex flex-col gap-2.5 min-h-0">
                <div className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Elastic Platform</div>
                <div className="reveal rounded-xl border flex flex-col p-3.5 flex-1 justify-center" style={{ borderColor: `${accent}66`, background: `linear-gradient(160deg, ${accent}1f, ${accent}08)` }}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>OTLP Endpoint</div>
                  <div className={`text-sm font-semibold mb-2 ${headText}`}>Single entry for all OTel signals</div>
                  <div className="flex flex-wrap gap-1.5">
                    {SIGNALS.map((s) => (
                      <span key={s} className="text-[11px] font-semibold rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}22`, color: accent }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div className={`reveal rounded-xl border flex items-center gap-2.5 p-3 ${cardBase}`}>
                  <FontAwesomeIcon icon={faBolt} style={{ color: accent }} />
                  <div>
                    <div className={`text-[13px] font-bold leading-tight ${headText}`}>Managed Ingest</div>
                    <div className={`text-[10px] leading-snug ${mutedText}`}>Elastic scales the pipeline — no infra to manage.</div>
                  </div>
                </div>
                <div className="reveal rounded-xl border flex items-center gap-2.5 p-3 flex-1" style={{ borderColor: `${accent}66`, backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)' }}>
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                    <FontAwesomeIcon icon={faDatabase} />
                  </span>
                  <div>
                    <div className={`text-sm font-bold leading-tight ${headText}`}>Elastic Observability</div>
                    <div className={`text-[10px] leading-snug ${mutedText}`}>Stored, correlated, agent-ready.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="reveal text-center text-[11px] font-semibold uppercase tracking-wider mt-2 shrink-0" style={{ color: `${accent}cc` }}>
            Customer environment&nbsp;&nbsp;→&nbsp;&nbsp;Elastic Cloud
          </div>
        </div>

        <SceneStepper onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} hidePills />
      </div>
    </div>
  )
}

export default OtelScene
