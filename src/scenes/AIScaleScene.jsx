import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faCode, faFlask, faServer, faBolt } from '@fortawesome/free-solid-svg-icons'

// Source: 01-world.html — AI multiplies every observability problem.
const COLORS = { blue: '#0B64DD', teal: '#48EFCF', poppy: '#FF957D' }

const DEFAULT_BEFORE = [
  'Microservices complexity', 'Multi-cloud sprawl', 'High change velocity',
  'Manual toil', 'Alert fatigue', 'Observability cost',
]

const DEFAULT_STAGES = [
  {
    id: 'dev', badge: '01 · Development', icon: faCode, color: COLORS.blue,
    multiplier: 100, prefix: '×',
    title: 'Agents generate code in parallel, around the clock',
    points: [
      'Swarms of agents committing every second',
      'Ships without review — code no one has read',
      'Unknown dependencies, unknown risk surface',
    ],
  },
  {
    id: 'staging', badge: '02 · Testing & Staging', icon: faFlask, color: COLORS.teal,
    multiplier: 10, prefix: '×',
    title: 'Infra multiplies as fast as agents can provision it',
    points: [
      'Dozens of environments spun up in parallel',
      'Staging and prod permanently out of sync',
      'Ephemeral envs multiply observability spend',
    ],
  },
  {
    id: 'prod', badge: '03 · Production', icon: faServer, color: COLORS.poppy,
    multiplier: null, literal: '?×',
    title: 'Unread code ships fast. Incidents follow.',
    points: [
      'SREs paged for code they have never seen',
      'Alert volume explodes — runbooks are obsolete',
      '10× services = 10× logs, metrics, traces & the bill',
    ],
  },
]

const DEFAULT_RESULTS = [
  'More code. More infra. More signals.',
  'Faster failures. Zero context. No runbook.',
  'The observability bill grows as fast as the problem.',
  'Observability built for humans can’t keep up.',
]

function AIScaleScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Observability · The AI Era'
  const titlePlain = metadata.titlePlain || 'The challenge you know. '
  const titleAccent = metadata.titleAccent || 'At a scale you’ve never seen.'
  const subtitle = metadata.subtitle ||
    'We built observability for human-paced engineering. Then AI arrived — and multiplied every problem.'
  const before = metadata.before || DEFAULT_BEFORE
  const results = metadata.results || DEFAULT_RESULTS
  const stages = (metadata.stages || DEFAULT_STAGES).map((s, i) => {
    const merged = { ...(DEFAULT_STAGES[i] || {}), ...s }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_STAGES[i]?.icon || faBolt) }
  })

  const accentFor = (c) => (isDark ? c : COLORS.blue)
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/65'
  const chipBase = isDark ? 'bg-white/[0.05] border-white/10 text-white/70' : 'bg-elastic-dev-blue/[0.04] border-elastic-dev-blue/10 text-elastic-dev-blue/70'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-4 overflow-hidden">
      <div ref={rootRef} className="max-w-[1380px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        {/* "What we built for" chip row */}
        <div className="reveal flex flex-wrap items-center justify-center gap-2 mb-4 shrink-0">
          <span className={`text-xs font-semibold uppercase tracking-wider ${mutedText}`}>Built for:</span>
          {before.map((b, i) => (
            <span key={i} className={`text-xs font-medium rounded-full border px-3 py-1 ${chipBase}`}>{b}</span>
          ))}
        </div>

        {/* Stage grid */}
        <div className="flex-1 min-h-0 flex items-center">
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
          {stages.map((s) => {
            const color = accentFor(s.color)
            return (
              <div
                key={s.id}
                className="reveal relative overflow-hidden rounded-2xl border flex flex-col p-5 min-h-0"
                style={{ borderColor: `${color}55`, background: `linear-gradient(160deg, ${color}1a, ${color}06)` }}
              >
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{ backgroundColor: `${color}26`, color }}>
                    <FontAwesomeIcon icon={s.icon} />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>{s.badge}</span>
                </div>

                <div className="font-headline font-extrabold leading-none mb-3" style={{ color, fontSize: 'clamp(2.75rem, 5vw, 4rem)' }}>
                  {s.literal != null ? s.literal : <CountUp value={s.multiplier} format={(n) => `${s.prefix}${n}`} duration={1200} />}
                </div>

                <h3 className={`font-bold text-base leading-snug mb-3 ${headText}`}>{s.title}</h3>
                <ul className="space-y-2 mt-auto">
                  {s.points.map((p, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm leading-snug ${mutedText}`}>
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
        </div>

        {/* Result strip */}
        <div className="reveal mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          {results.map((r, i) => (
            <div
              key={i}
              className={`rounded-xl border px-4 py-3 text-sm font-semibold leading-snug ${headText}`}
              style={{
                borderColor: i === results.length - 1 ? `${accentFor(COLORS.poppy)}66` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)'),
                backgroundColor: i === results.length - 1 ? `${accentFor(COLORS.poppy)}14` : (isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.7)'),
              }}
            >
              {r}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AIScaleScene
