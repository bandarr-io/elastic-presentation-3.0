import { animate, stagger } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { useTeamConfig } from '../context/TeamContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBullseye, faWrench, faPlaneDeparture,
  faUsers, faDesktop, faBook, faPlug,
  faGraduationCap, faMedal,
  faEnvelope, faPhone,
} from '@fortawesome/free-solid-svg-icons'

// ─── Data ─────────────────────────────────────────────────────────────────────

const journeySteps = [
  { phase: '01', title: 'Initial Introductions', description: 'Meet the team & set the stage',    color: '#48EFCF' },
  { phase: '02', title: 'Executive Alignment',   description: 'Business priorities & pain points', color: '#0B64DD' },
  { phase: '03', title: 'Use Case Discovery',    description: 'Technical requirements & scope',    color: '#F04E98' },
  { phase: '04', title: 'Technical Validation',  description: 'Architecture review & pilot',       color: '#FEC514' },
  { phase: '05', title: 'Business Value Review', description: 'Quantifying impact & ROI',          color: '#FF957D' },
]

const primaryActions = [
  { title: 'Start a Free Trial',  desc: '14-day full-platform access — no credit card', icon: faBullseye,      color: '#48EFCF' },
  { title: 'Book a Workshop',     desc: 'Hands-on session with our Solutions Architects', icon: faWrench,       color: '#0B64DD' },
  { title: 'Run a Pilot',         desc: 'Validate on your own data & infrastructure',    icon: faPlaneDeparture, color: '#F04E98' },
]

// Trimmed to 6 focal resources (was 9) to remove the scroll and tile-competition.
// Dropped: Explore Our Labs, Register for Events, Learn More (elastic.co dupes the footer).
const deRiskingOptions = [
  { title: 'Customer Success Stories',       desc: 'elastic.co/customers',            icon: faUsers         },
  { title: 'Hands-on Demos',                 desc: 'elastic.co/demo-gallery',         icon: faDesktop       },
  { title: 'Explore Integrations',           desc: 'elastic.co/integrations',         icon: faPlug          },
  { title: 'Read Our Docs',                  desc: 'elastic.co/docs',                 icon: faBook          },
  { title: 'Get Trained Up',                 desc: 'elastic.co/training',             icon: faGraduationCap },
  { title: 'Veterans Resources',             desc: 'elastic.co/veterans',             icon: faMedal         },
]

// ─── Component ────────────────────────────────────────────────────────────────

function NextStepsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  // Single shared accent — the phase numbers carry the sequence, not color.
  const accentColor = isDark ? '#48EFCF' : '#0B64DD'
  const { teamConfig } = useTeamConfig()
  const contentRef = useRef(null)
  const [activeStep, setActiveStep] = useState(null)

  const eyebrow       = metadata.eyebrow       || 'What Comes Next'
  const headingPlain  = metadata.headingPlain  || 'Ready to '
  const headingAccent = metadata.headingAccent || 'Get Started?'
  const subtitle      = metadata.subtitle      || "Here's a clear path forward — we'll guide you every step of the way."
  const ctaHeading    = metadata.ctaHeading    || "Let's keep the momentum going."

  // Pull AE, SA, and CA from team config, matching by role keyword
  const teamContacts = teamConfig?.members?.filter(m =>
    /account executive/i.test(m.role) ||
    /solutions architect/i.test(m.role) ||
    /customer architect/i.test(m.role)
  ) ?? []

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    animate(el.querySelectorAll('.stagger-in'), {
      opacity:   [0, 1],
      translateY: [16, 0],
      duration:  500,
      delay:     stagger(80),
      ease:      'outCubic',
    })
  }, [])

  return (
    <div className="scene !py-4 w-full h-full">
      <div className="max-w-7xl px-4 mx-auto w-full h-full flex flex-col gap-4" ref={contentRef}>

        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={headingPlain}
          titleAccent={headingAccent}
          subtitle={subtitle}
        />

        {/* Journey steps */}
        <div className="stagger-in flex-shrink-0">
          <div className="relative grid grid-cols-5 gap-3">
            {/* Connecting line */}
            <div className={`absolute top-6 left-[10%] right-[10%] h-px ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
            <div
              className={`absolute top-6 left-[10%] h-px ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`}
              style={{ width: '80%' }}
            />

            {journeySteps.map((step, i) => {
              const isActive = activeStep === i
              const activeColor = accentColor
              return (
                <div
                  key={step.phase}
                  className="flex flex-col items-center text-center gap-2 cursor-pointer group"
                  onClick={() => setActiveStep(isActive ? null : i)}
                >
                  {/* Phase bubble */}
                  <div
                    className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center font-mono font-bold text-sm text-white shadow-lg transition-all duration-300"
                    style={{
                      backgroundColor: activeColor,
                      boxShadow: isActive
                        ? `0 0 24px ${activeColor}80`
                        : isDark ? `0 0 16px ${accentColor}50` : '0 0 16px rgba(11,100,221,0.25)',
                      transform: isActive ? 'scale(1.15)' : 'scale(1)',
                    }}
                  >
                    {step.phase}
                  </div>
                  {/* Label */}
                  <div
                    className={`px-3 py-2 rounded-xl w-full border transition-all duration-300 ${
                      isActive
                        ? isDark ? 'bg-white/[0.08] border-white/20' : 'bg-white border-elastic-blue/30'
                        : isDark ? 'bg-white/[0.04] border-white/8' : 'bg-white/70 border-elastic-dev-blue/8'
                    }`}
                    style={isActive ? { borderColor: `${activeColor}50` } : {}}
                  >
                    <p
                      className={`text-base font-bold leading-snug transition-colors duration-300 ${!isActive && (isDark ? 'text-white' : 'text-elastic-dev-blue')}`}
                      style={isActive ? { color: activeColor } : {}}
                    >
                      {step.title}
                    </p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Primary CTAs */}
        <div className="stagger-in flex gap-3 flex-shrink-0">
          {primaryActions.map((action) => (
            <div
              key={action.title}
              className={`flex-1 rounded-2xl border-2 px-4 py-2.5 flex items-center gap-3 transition-all ${isDark ? 'bg-white/[0.03]' : 'bg-white/80'}`}
              style={{ borderColor: isDark ? `${accentColor}40` : 'rgba(11,100,221,0.25)' }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: isDark ? `${accentColor}20` : 'rgba(11,100,221,0.1)',
                  color: accentColor,
                }}
              >
                <FontAwesomeIcon icon={action.icon} className="text-base" />
              </div>
              <div className="min-w-0">
                <p className={`font-bold text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{action.title}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{action.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary resources + Contact strip */}
        <div className="stagger-in flex gap-3 flex-1 min-h-0">

          {/* De-risking options grid */}
          <div className={`rounded-2xl border p-4 flex flex-col min-h-0 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`} style={{ flex: '3 3 60%' }}>
            <p className={`text-sm font-semibold uppercase tracking-wider mb-3 flex-shrink-0 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
              Explore on your own
            </p>
            <div className="grid grid-cols-3 gap-3 flex-1 content-start">
              {deRiskingOptions.map((option) => (
                <div
                  key={option.title}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${
                    isDark ? 'bg-white/5 hover:bg-white/8' : 'bg-elastic-blue/5 hover:bg-elastic-blue/10'
                  }`}
                >
                  <FontAwesomeIcon
                    icon={option.icon}
                    className={`text-base flex-shrink-0 ${isDark ? 'text-white/40' : 'text-elastic-blue'}`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-tight truncate ${isDark ? 'text-white/80' : 'text-elastic-dev-blue'}`}>{option.title}</p>
                    <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{option.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Elastic logo footer */}
            <div className="flex items-center justify-between mt-3 pt-3 border-t flex-shrink-0" style={{ borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(11,100,221,0.1)' }}>
              <img
                src={isDark ? '/Elastic-Logo-tagline-secondary-white.svg' : '/Elastic-Logo-tagline-secondary-black.png'}
                alt="Elastic"
                className="h-8 w-auto"
              />
              <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>elastic.co</span>
            </div>
          </div>

          {/* Contact / CTA strip */}
          <div className={`rounded-2xl border p-4 flex flex-col gap-3 ${isDark ? 'bg-elastic-teal/10 border-elastic-teal/20' : 'bg-elastic-blue/5 border-elastic-blue/20'}`} style={{ flex: '2 2 40%' }}>
            <div>
              <p className={`text-sm font-semibold uppercase tracking-wider pb-1 ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'}`}>
                Your Elastic Team
              </p>
              <p className={`text-lg font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{ctaHeading}</p>
            </div>

            <div className="space-y-2">
              {teamContacts.length > 0 ? teamContacts.map(member => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl ${isDark ? 'bg-white/5' : 'bg-white/70'}`}
                >
                  {/* Avatar */}
                  {member.photo ? (
                    <img
                      src={member.photo}
                      alt={member.name}
                      className="w-11 h-11 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                      style={{ backgroundColor: accentColor }}
                    >
                      {member.initials}
                    </div>
                  )}
                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <p className={`text-base font-bold leading-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{member.name}</p>
                    <p className={`text-sm truncate ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{member.role}</p>
                  </div>
                  {/* Contact icons */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {member.email && (
                      <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                        <FontAwesomeIcon icon={faEnvelope} className="text-xs" />{member.email}
                      </span>
                    )}
                    {member.phone && (
                      <span className={`text-sm flex items-center gap-1 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                        <FontAwesomeIcon icon={faPhone} className="text-xs" />{member.phone}
                      </span>
                    )}
                  </div>
                </div>
              )) : (
                <p className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                  Add an Account Executive or Solutions Architect in Team Settings.
                </p>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}

export default NextStepsScene
