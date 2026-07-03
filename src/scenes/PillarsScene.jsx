import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { resolveIcon } from '../data/iconOptions'
import { faStream, faWaveSquare, faMoon, faArrowRightLong } from '@fortawesome/free-solid-svg-icons'

// Source: fy27-pillars.html — Streams, Signals, Nightshift define the Observability roadmap.
// Brand palette: distinct accents in dark mode, all collapse to Elastic blue in light.
const COLORS = { streams: '#0B64DD', signals: '#48EFCF', nightshift: '#F04E98' }

const DEFAULT_PILLARS = [
  {
    id: 'streams', number: '01', name: 'Streams', icon: faStream, color: COLORS.streams,
    tagline: 'The telemetry pipeline for all your data',
    description: 'Open-standard ingestion at any scale — OTel, Prometheus, and custom sources through one universal pipeline.',
    tags: ['Ingest', 'Route', 'Store'],
  },
  {
    id: 'signals', number: '02', name: 'Signals', icon: faWaveSquare, color: COLORS.signals,
    tagline: 'Every observability experience, unified',
    description: 'Logs, Metrics, Traces, Synthetics, and Profiles in one place — on the most efficient datastore for each.',
    tags: ['Logs', 'Metrics', 'Traces', 'Synthetics', 'Profiles'],
  },
  {
    id: 'nightshift', number: '03', name: 'Nightshift', icon: faMoon, color: COLORS.nightshift,
    tagline: 'Fix it before you wake up',
    description: 'An autonomous AI SRE that investigates, runs playbooks, and remediates — without waiting for a page.',
    tags: ['Detect', 'Investigate', 'Remediate'],
  },
]

function PillarsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · The Roadmap'
  const titlePlain = metadata.titlePlain || 'Three pillars. '
  const titleAccent = metadata.titleAccent || 'One platform.'
  const subtitle = metadata.subtitle ||
    'From an open-standard data pipeline, to unified signal experiences, to autonomous AI action.'
  const callout = metadata.callout ||
    'Together, these pillars take you from raw telemetry to autonomous resolution — on a single platform.'
  const pillars = (metadata.pillars || DEFAULT_PILLARS).map((p, i) => {
    const merged = { ...(DEFAULT_PILLARS[i] || {}), ...p }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_PILLARS[i]?.icon || faStream) }
  })

  const accentFor = (c) => (isDark ? c : '#0B64DD')
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/65'
  const cardBg = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.85)'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [18, 0], duration: 500, delay: stagger(90), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-6 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 flex flex-col justify-center gap-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((p) => {
            const color = accentFor(p.color)
            return (
              <div
                key={p.id}
                className="reveal relative overflow-hidden rounded-2xl border flex flex-col p-6"
                style={{ borderColor: `${color}55`, background: cardBg, borderTopWidth: '4px', borderTopColor: color }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${color}22`, color }}>
                    <FontAwesomeIcon icon={p.icon} />
                  </span>
                  <span className="font-headline font-extrabold text-5xl leading-none select-none" style={{ color: `${color}33` }}>{p.number}</span>
                </div>

                <h3 className={`font-headline font-extrabold text-2xl leading-none mb-2 ${headText}`}>{p.name}</h3>
                <p className="text-sm font-semibold mb-3" style={{ color }}>{p.tagline}</p>
                <p className={`text-sm leading-snug mb-4 ${mutedText}`}>{p.description}</p>

                <div className="flex flex-wrap gap-2 mt-auto">
                  {p.tags.map((t, i) => (
                    <span key={i} className="text-xs font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: `${color}1c`, color }}>{t}</span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div
          className="reveal flex items-center justify-center gap-4 rounded-2xl border px-6 py-4 shrink-0"
          style={{ borderColor: `${accentFor(COLORS.signals)}45`, background: `linear-gradient(135deg, ${accentFor(COLORS.streams)}14, ${accentFor(COLORS.nightshift)}14)` }}
        >
          <FontAwesomeIcon icon={faArrowRightLong} style={{ color: accentFor(COLORS.signals) }} />
          <p className={`text-base md:text-lg font-semibold leading-snug text-center ${headText}`}>{callout}</p>
        </div>
        </div>
      </div>
    </div>
  )
}

export default PillarsScene
