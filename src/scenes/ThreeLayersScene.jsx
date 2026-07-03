import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faMoon, faBrain, faDatabase, faArrowRightLong } from '@fortawesome/free-solid-svg-icons'

// Source: 03-platform.html — Data → AI Index → Agent → Action; each layer feeds the next.
const DEFAULT_LAYERS = [
  {
    id: 'nightshift', number: '03', name: 'Nightshift', icon: faMoon,
    claim: 'Investigates incidents, generates hypotheses, and executes fixes — around the clock, without a page.',
    pills: ['Autonomous RCA', 'Auto-Remediation', 'Full Audit Trail', 'Configurable Trust'],
  },
  {
    id: 'ai-index', number: '02', name: 'AI Index', icon: faBrain,
    claim: 'A live model of your environment — topology, baselines, SLOs — so the agent never works blind.',
    pills: ['Knowledge Indicators', 'Live Topology', 'Significant Events'],
  },
  {
    id: 'elasticsearch', number: '01', name: 'Elasticsearch', icon: faDatabase,
    claim: 'The most efficient datastore for logs and metrics. Every signal, at scale.',
    pills: ['LogsDB', 'Columnar Metrics', 'ES|QL'],
    stats: [
      { value: 65, format: (n) => `${n}%`, label: 'less log storage' },
      { value: 40, format: (n) => `~${n}%`, label: 'faster queries' },
      { value: 30, format: (n) => `${n}×`, label: 'vs Prometheus & Mimir' },
    ],
  },
]

const DEFAULT_CHAIN = ['Data', 'AI Index', 'Agent', 'Action']

function ThreeLayersScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'The Structural Advantage'
  const titlePlain = metadata.titlePlain || 'Three layers, '
  const titleAccent = metadata.titleAccent || 'one structural advantage.'
  const subtitle = metadata.subtitle ||
    'Each layer feeds the next. You can’t skip the chain — and that’s exactly why it works.'
  const chain = metadata.chain || DEFAULT_CHAIN
  const layers = (metadata.layers || DEFAULT_LAYERS).map((l, i) => {
    const merged = { ...(DEFAULT_LAYERS[i] || {}), ...l }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_LAYERS[i]?.icon || faDatabase) }
  })

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/65'
  const ghost = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,28,63,0.06)'
  const pillBase = isDark ? 'bg-white/[0.06] text-white/75' : 'bg-elastic-dev-blue/[0.06] text-elastic-dev-blue/80'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(80), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-5 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {layers.map((l) => (
            <div
              key={l.id}
              className="reveal relative overflow-hidden rounded-2xl border flex items-center gap-5 px-6 py-4 flex-1 min-h-0"
              style={{ borderColor: `${accent}40`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.8)' }}
            >
              <span className="absolute right-4 top-1/2 -translate-y-1/2 font-headline font-extrabold leading-none select-none pointer-events-none"
                style={{ fontSize: 'clamp(4rem, 9vw, 7rem)', color: ghost }}>
                {l.number}
              </span>

              <span className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                <FontAwesomeIcon icon={l.icon} />
              </span>

              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-baseline gap-3 mb-1.5">
                  <h3 className={`font-headline font-extrabold text-3xl leading-none ${headText}`}>{l.name}</h3>
                </div>
                <p className={`text-base md:text-lg leading-snug mb-3 max-w-2xl ${mutedText}`}>{l.claim}</p>
                <div className="flex flex-wrap gap-2">
                  {l.pills.map((p, i) => (
                    <span key={i} className={`text-sm font-semibold rounded-full px-3 py-1 ${pillBase}`}>{p}</span>
                  ))}
                </div>
              </div>

              {l.stats && (
                <div className="relative z-10 hidden md:flex flex-col justify-center gap-2 pl-5 mr-32 shrink-0"
                  style={{ borderLeft: `1px solid ${accent}33` }}>
                  {l.stats.map((s, i) => (
                    <div key={i} className="flex items-baseline gap-2">
                      <div className="font-headline font-extrabold text-3xl leading-none shrink-0" style={{ color: accent }}>
                        <CountUp value={s.value} format={s.format} duration={1200} />
                      </div>
                      <div className={`text-sm leading-tight ${mutedText}`}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Value chain bar */}
          <div className="reveal flex items-center justify-center gap-3 rounded-2xl border px-6 py-3 shrink-0"
            style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
            {chain.map((c, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="font-bold text-base md:text-lg" style={{ color: accent }}>{c}</span>
                {i < chain.length - 1 && <FontAwesomeIcon icon={faArrowRightLong} className="text-sm" style={{ color: accent }} />}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ThreeLayersScene
