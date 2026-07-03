import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faBrain, faMagnifyingGlass, faWrench, faShareNodes } from '@fortawesome/free-solid-svg-icons'

// Source: 05-ai-driven.html — Agentic Observability as a four-quadrant strategy.
const SIGNAL_CHIPS = [
  { name: 'Logs', sub: 'carry context' },
  { name: 'Metrics', sub: 'carry state' },
  { name: 'Traces', sub: 'carry both' },
]

const QUADRANTS = [
  { num: '01', icon: faBrain, title: 'Infer Knowledge from Telemetry', desc: 'No configuration toil — auto-detect technologies, entities, and the relationships between them.' },
  { num: '02', icon: faMagnifyingGlass, title: 'Discover Significant Events', desc: 'Stitch raw alerts into a complete incident picture — before they reach business impact.' },
  { num: '03', icon: faWrench, title: 'Remediate with Human in the Loop', desc: 'Agentic and procedural workflows, grounded in operational knowledge and approved on your terms.' },
  { num: '04', icon: faShareNodes, title: 'Meet Customers Where They Are', desc: 'Deliver on any surface your team already uses.', chips: ['UI', 'Chat', 'Agent', 'API', 'Alerts', 'Mobile'] },
]

function AgenticScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · The North Star'
  const titlePlain = metadata.titlePlain || 'Agentic '
  const titleAccent = metadata.titleAccent || 'observability.'
  const subtitle = metadata.subtitle ||
    'Infer knowledge, discover what matters, remediate with judgment, and meet teams on every surface.'
  const signalChips = metadata.signalChips || SIGNAL_CHIPS
  const quadrants = (metadata.quadrants || QUADRANTS).map((q, i) => {
    const merged = { ...(QUADRANTS[i] || {}), ...q }
    return { ...merged, icon: resolveIcon(merged.icon, QUADRANTS[i]?.icon || faBrain) }
  })

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const chipBase = isDark ? 'bg-white/[0.06] text-white/75' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/80'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(80), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-6 overflow-hidden">
      <div ref={rootRef} className="max-w-[1280px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        {/* Signal chips */}
        <div className="reveal flex flex-wrap items-center justify-center gap-2 mb-4 shrink-0">
          {signalChips.map((c, i) => (
            <span key={i} className={`text-sm font-semibold rounded-full px-4 py-1.5 ${chipBase}`}>
              <span className={headText}>{c.name}</span> <span className={mutedText}>{c.sub}</span>
            </span>
          ))}
        </div>

        {/* Quadrants */}
        <div className="flex-1 min-h-0 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
          {quadrants.map((q) => (
            <div key={q.num} className={`reveal relative overflow-hidden rounded-2xl border flex flex-col p-5 ${cardBase}`}>
              <span className="absolute right-4 top-3 font-headline font-extrabold leading-none select-none" style={{ fontSize: '3.5rem', color: `${accent}1c` }}>{q.num}</span>
              <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                <FontAwesomeIcon icon={q.icon} />
              </span>
              <h3 className={`font-bold text-lg leading-tight mb-2 ${headText}`}>{q.title}</h3>
              <p className={`text-sm leading-snug ${mutedText}`}>{q.desc}</p>
              {q.chips && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {q.chips.map((c, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: `${accent}18`, color: accent }}>{c}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

export default AgenticScene
