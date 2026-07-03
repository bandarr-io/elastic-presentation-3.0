import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRobot, faBoltLightning } from '@fortawesome/free-solid-svg-icons'

// Source: 02-track-record.html — heritage timeline culminating in the Agentic Era.
const DEFAULT_ERAS = [
  { years: '2011 – 2014', name: 'The Origin', points: ['Elasticsearch open-sourced · ELK Stack', 'Beats · first log & infra monitoring'] },
  { years: '2015 – 2017', name: 'The Platform Era', points: ['Prelert ML & anomaly detection', 'X-Pack · Watcher · first AIOps foundations'] },
  { years: '2018 – 2020', name: 'The Intelligence Layer', points: ['Elastic APM · native OpenTelemetry', 'RUM · Uptime · unified Observability UIs'] },
  { years: '2021 – 2024', name: 'The Optimization Era', points: ['Universal Profiling · SLOs · ES|QL', 'LogsDB — 65% storage reduction vs standard ES'] },
]

const DEFAULT_FEATURED = {
  years: '2025 →',
  status: 'Now shipping',
  name: 'The Agentic Era',
  lead: 'Observability that investigates and fixes — not just dashboards that watch.',
  points: [
    'Streams — the telemetry pipeline for all your data',
    'Serverless observability & LLM Observability at scale',
    'Agentic SRE — AI that investigates and remediates',
  ],
  tags: ['Streams', 'Serverless', 'Agentic SRE', 'Zero on-call pages'],
}

function HeritageScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · Track Record'
  const titlePlain = metadata.titlePlain || 'A proven track record of '
  const titleAccent = metadata.titleAccent || 'innovation.'
  const subtitle = metadata.subtitle ||
    'From the origins of the ELK Stack to autonomous remediation — every era compounding on the last.'
  const eras = metadata.eras || DEFAULT_ERAS
  const featured = { ...DEFAULT_FEATURED, ...(metadata.featured || {}) }

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const gold = isDark ? '#FEC514' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const lineColor = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(16,28,63,0.14)'

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
      <div ref={rootRef} className="max-w-[1380px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-6">
          {/* Timeline */}
          <div className="relative flex flex-col min-h-0 pl-7">
            <span className="absolute left-[9px] top-1 bottom-1 w-px" style={{ backgroundColor: lineColor }} />
            <div className="flex-1 flex flex-col justify-between py-1">
              {eras.map((e, i) => (
                <div key={i} className="reveal relative">
                  <span
                    className="absolute -left-[27px] top-1.5 w-4 h-4 rounded-full border-2"
                    style={{ borderColor: accent, backgroundColor: isDark ? '#0B1628' : '#fff' }}
                  />
                  <div className="text-sm font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>{e.years}</div>
                  <div className={`font-bold text-lg md:text-xl leading-tight mb-1 ${headText}`}>{e.name}</div>
                  <div className={`text-sm md:text-base leading-snug ${mutedText}`}>{e.points.join(' · ')}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Featured era */}
          <div
            className="reveal relative flex flex-col justify-center lg:border-l lg:pl-10"
            style={{ borderColor: lineColor }}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0" style={{ backgroundColor: `${gold}26`, color: gold }}>
                <FontAwesomeIcon icon={faRobot} />
              </span>
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider" style={{ color: gold }}>
                  <FontAwesomeIcon icon={faBoltLightning} className="text-[10px]" />
                  {featured.status} · {featured.years}
                </div>
                <div className={`font-headline font-extrabold text-3xl md:text-4xl leading-none ${headText}`}>{featured.name}</div>
              </div>
            </div>

            <p className={`text-base md:text-lg leading-snug mb-4 ${headText}`}>{featured.lead}</p>

            <ul className="space-y-2.5 mb-5">
              {featured.points.map((p, i) => (
                <li key={i} className={`flex items-start gap-2.5 text-sm md:text-base leading-snug ${mutedText}`}>
                  <span className="mt-1.5 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: gold }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-2">
              {featured.tags.map((t, i) => (
                <span
                  key={i}
                  className="text-xs font-bold rounded-full px-3 py-1.5"
                  style={{ backgroundColor: `${gold}22`, color: gold }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HeritageScene
