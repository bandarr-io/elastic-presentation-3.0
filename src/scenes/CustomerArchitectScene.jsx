import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserTie, faRoute, faCheck, faBullseye, faGraduationCap,
  faHandshake, faUsers, faChartLine, faHeadset, faRocket,
} from '@fortawesome/free-solid-svg-icons'

const COLORS = {
  teal: '#48EFCF',
  blue: '#0B64DD',
  pink: '#F04E98',
}

// What the named Customer Architect owns end-to-end.
const DEFAULT_PILLARS = [
  {
    title: 'Strategic Guidance',
    icon: faBullseye,
    color: COLORS.teal,
    items: ['Architecture & scaling reviews', 'Roadmap alignment', 'Best-practice design'],
  },
  {
    title: 'Proactive Enablement',
    icon: faGraduationCap,
    color: COLORS.pink,
    items: ['Champion certification', 'Hands-on workshops', 'Self-service playbooks'],
  },
  {
    title: 'Ongoing Partnership',
    icon: faHandshake,
    color: COLORS.blue,
    items: ['Quarterly business reviews', 'Success planning', 'Priority escalation'],
  },
]

// The phases your CA walks alongside you.
const DEFAULT_JOURNEY = ['Discover', 'Plan', 'Migrate', 'Optimize', 'Expand']

// The rest of the team that surrounds the CA.
const DEFAULT_SUPPORT = [
  { label: 'Account Team',          icon: faUsers },
  { label: 'Executive Alignment',   icon: faChartLine },
  { label: '24/7 Support & SLAs',   icon: faHeadset },
  { label: 'Professional Services', icon: faRocket },
]

function CustomerArchitectScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow     = metadata.eyebrow     || 'Your Customer Architect'
  const headingPlain  = metadata.headingPlain  || 'We Walk This Journey '
  const headingAccent = metadata.headingAccent || 'With You.'
  const subtitle    = metadata.subtitle    || 'A single, named technical partner dedicated to your organization — accountable for your success from POC through enterprise-wide expansion, with the full Elastic team behind them.'
  const caTagline   = metadata.caTagline   || 'Your dedicated partner'
  const caTitle     = metadata.caTitle     || 'Customer Architect'
  const caSubtitle  = metadata.caSubtitle  || 'Knows your environment, aligns your roadmap, and stays with you long after go-live.'
  const caJourney   = metadata.caJourney   || 'POC → Enterprise-wide'
  const caChampions = metadata.caChampions || 'Backed by your 35+ certified champions'

  const pillars = (metadata.caPillars || DEFAULT_PILLARS).map((p, i) => ({ ...DEFAULT_PILLARS[i], ...p }))
  const journey = metadata.caJourneyPhases || DEFAULT_JOURNEY
  const support = metadata.supportLayers || DEFAULT_SUPPORT

  // Light theme is monochrome blue; dark theme keeps the accent palette.
  const accent = (darkColor) => (isDark ? darkColor : COLORS.blue)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 480,
      delay: stagger(70),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  return (
    <div ref={rootRef} className="scene !py-4 w-full h-full">
      <div className="max-w-[1100px] mx-auto w-full h-full flex flex-col">

        {/* Header */}
        <SceneHeader
          reveal
          eyebrow={eyebrow}
          titlePlain={headingPlain}
          titleAccent={headingAccent}
          subtitle={subtitle}
        />

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center gap-4 min-h-0">

          {/* Hero: the named Customer Architect */}
          <div className={`reveal rounded-2xl border-2 p-5 flex items-center gap-5 ${isDark ? 'border-elastic-teal/30 bg-elastic-teal/5' : 'border-elastic-blue/30 bg-elastic-blue/5'}`}>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.15)' : 'rgba(11,100,221,0.1)' }}>
              <FontAwesomeIcon icon={faUserTie} className="text-2xl" style={{ color: accent(COLORS.teal) }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-bold uppercase tracking-eyebrow mb-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{caTagline}</p>
              <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{caTitle}</h3>
              <p className={`text-sm mt-0.5 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{caSubtitle}</p>
            </div>
            <div className={`flex-shrink-0 flex flex-col items-center gap-1 pl-5 border-l ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
              <FontAwesomeIcon icon={faRoute} className="text-xl" style={{ color: accent(COLORS.teal) }} />
              <span className={`text-xs font-bold whitespace-nowrap ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{caJourney}</span>
            </div>
          </div>

          {/* What the CA owns end-to-end */}
          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            {pillars.map(pillar => (
              <div
                key={pillar.title}
                className={`reveal p-4 rounded-2xl border-2 ${isDark ? 'bg-white/[0.02]' : 'bg-white/60'}`}
                style={{ borderColor: isDark ? 'rgba(72,239,207,0.25)' : 'rgba(11,100,221,0.2)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.15)' : 'rgba(11,100,221,0.1)' }}>
                    <FontAwesomeIcon icon={pillar.icon} className="text-sm" style={{ color: accent(COLORS.teal) }} />
                  </div>
                  <h4 className={`font-bold text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{pillar.title}</h4>
                </div>
                <div className="space-y-1.5">
                  {pillar.items.map(item => (
                    <div key={item} className="flex items-center gap-2">
                      <FontAwesomeIcon icon={faCheck} className="text-xs" style={{ color: accent(COLORS.teal) }} />
                      <span className={`text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Journey ribbon — the CA walks alongside every phase */}
          <div className={`reveal rounded-2xl border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
            <p className={`text-xs font-bold mb-3 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
              <FontAwesomeIcon icon={faRoute} className={`mr-2 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              With you at every step
            </p>
            <div className="relative flex items-center justify-between">
              <div className={`absolute left-4 right-4 top-4 h-0.5 ${isDark ? 'bg-elastic-teal/30' : 'bg-elastic-blue/20'}`} />
              {journey.map((phase, i) => (
                <div key={phase} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2"
                    style={{
                      backgroundColor: accent(COLORS.teal),
                      borderColor: accent(COLORS.teal),
                      color: isDark ? '#0A1628' : '#ffffff',
                    }}
                  >
                    {i + 1}
                  </div>
                  <span className={`text-sm font-semibold ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>{phase}</span>
                </div>
              ))}
            </div>
          </div>

          {/* The full team behind the CA */}
          <div className={`reveal rounded-2xl border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Backed by the full Elastic team</h4>
              <span className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{caChampions}</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {support.map(layer => (
                <div
                  key={layer.label}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl ${isDark ? 'bg-white/[0.04]' : 'bg-white/70'}`}
                >
                  <FontAwesomeIcon icon={layer.icon} className={`text-sm flex-shrink-0 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                  <span className={`text-sm font-medium ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{layer.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default CustomerArchitectScene
