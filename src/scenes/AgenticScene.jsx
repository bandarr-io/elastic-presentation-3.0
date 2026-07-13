import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faBrain, faMagnifyingGlass, faWrench, faShareNodes } from '@fortawesome/free-solid-svg-icons'

// Source: 05-ai-driven.html — Agentic Observability as a four-quadrant strategy.
const SIGNAL_CHIPS = [
  { name: 'Logs', sub: 'carries context' },
  { name: 'Metrics', sub: 'carries state' },
  { name: 'Traces', sub: 'carries both' },
]

const QUADRANTS = [
  { num: '01', icon: faBrain, title: 'Infer Knowledge from Telemetry', desc: 'No config toil — detect technologies, entities, and relationships automatically from every signal stream.' },
  { num: '02', icon: faMagnifyingGlass, title: 'Discover Significant Events', desc: 'Stitch alerts into a complete incident picture before the business feels the impact, with agentic investigations.' },
  { num: '03', icon: faWrench, title: 'Remediate with Human in the Loop', desc: 'Agentic and procedural workflows that fix issues immediately, grounded in your operational knowledge.' },
  { num: '04', icon: faShareNodes, title: 'Meet Customers Where They Are', desc: 'Any surface — actionable insights delivered via the interface your users already live in.', chips: ['UI', 'Chat', 'Agent', 'API', 'Alerts', 'Mobile'] },
]

function AgenticScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · Strategy'
  const titlePlain = metadata.titlePlain || 'Agentic '
  const titleAccent = metadata.titleAccent || 'observability.'
  const subtitle = metadata.subtitle ||
    'Infer knowledge, discover what matters, remediate with judgment, and meet teams on every surface.'
  const signalChips = metadata.signalChips || SIGNAL_CHIPS
  const quadrants = (metadata.quadrants || QUADRANTS).map((q, i) => {
    const merged = { ...(QUADRANTS[i] || {}), ...q }
    return { ...merged, icon: resolveIcon(merged.icon, QUADRANTS[i]?.icon || faBrain) }
  })

  const { playKey, isPlaying, replay, toggleAutoplay } = useSceneMotion(1, { holdMs: 5000 })

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/65'
  const divider = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,28,63,0.14)'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [18, 0], duration: 480, delay: stagger(90), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [playKey])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div ref={rootRef} className="max-w-[1280px] mx-auto w-full flex-1 flex flex-col min-h-0" key={playKey}>
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 flex items-center">
          <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-0">
            {quadrants.map((q, i) => {
              const cross = ['md:border-r md:border-b', 'md:border-b', 'md:border-r', ''][i] || ''
              return (
                <div key={q.num} className={`reveal relative flex flex-col justify-center px-7 py-6 md:px-9 ${cross}`} style={{ borderColor: divider }}>
                  <span className="absolute right-5 top-3 font-headline font-extrabold leading-none select-none" style={{ fontSize: '4rem', color: `${accent}1c` }}>{q.num}</span>
                  <span className="inline-flex items-center gap-2 self-start text-sm font-bold rounded-full px-2.5 py-1 mb-3" style={{ backgroundColor: `${accent}18`, color: accent }}>
                    <FontAwesomeIcon icon={q.icon} /> {q.num}
                  </span>
                  <h3 className={`font-bold text-2xl leading-tight mb-2 ${headText}`}>{q.title}</h3>
                  <p className={`text-base leading-snug ${mutedText}`}>{q.desc}</p>
                  {q.chips && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {q.chips.map((c, j) => (
                        <span key={j} className="text-sm font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: `${accent}18`, color: accent }}>{c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Signal legend — below the grid */}
        <div className="reveal flex items-center justify-center flex-wrap gap-5 mt-3 shrink-0">
          {signalChips.map((c, i) => (
            <span key={i} className="flex items-center gap-1.5 text-sm">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accent }} />
              <span className={`font-semibold ${headText}`}>{c.name}</span>
              <span className={`italic ${mutedText}`}>{c.sub}</span>
            </span>
          ))}
        </div>

        <SceneStepper onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} hidePills />
      </div>
    </div>
  )
}

export default AgenticScene
