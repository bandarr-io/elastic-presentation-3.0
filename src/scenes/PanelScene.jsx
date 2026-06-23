import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'

const defaultSpeakers = [
  { name: 'Panelist Name', role: 'Moderator', org: 'Your Organization', moderator: true },
  { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'CIO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'Senior Director Solutions Architecture', org: 'Elastic', highlight: true },
]

const defaultTopics = [
  'Securing operational & business networks end-to-end',
  'Infrastructure-to-edge cyber defense strategies',
  'Governing connected digital environments',
]

function PanelScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const contentRef = useRef(null)

  const eyebrow     = metadata.eyebrow     || 'Featured Panel'
  const title       = metadata.title       || 'Understanding Security in Linking Infrastructure to Governing'
  const titleAccent = metadata.titleAccent || 'Infrastructure to Governing'
  const date        = metadata.date        || 'March 11, 2025'
  const time        = metadata.time        || '10:45 AM – 11:30 AM'
  const description = metadata.description || [
    'Both Salt Typhoon and Volt Typhoon have showcased why it is important for cyber practitioners to think about securing their entire digital eco-system—both their operational and business networks and how they connect to the edge.',
    'This panel will discuss the cybersecurity and governing implications of protecting an increasingly complicated and connected digital environment.',
  ]

  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    animate(el.querySelectorAll('.stagger-in'), {
      opacity:    [0, 1],
      translateY: [16, 0],
      duration:   500,
      delay:      stagger(70),
      ease:       'outCubic',
    })
  }, [])

  return (
    <div className="scene !py-4 w-full h-full">
      <div className="max-w-7xl px-4 mx-auto w-full h-full flex flex-col gap-4" ref={contentRef}>

        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={`${title.replace(titleAccent, '').trimEnd()} `}
          titleAccent={titleAccent}
        />
        <div className="text-center flex-shrink-0 -mt-2">
          <div className={`inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-sm ${
            isDark ? 'bg-white/[0.03] border-white/10 text-white/60' : 'bg-white/80 border-elastic-dev-blue/10 text-elastic-ink'
          }`}>
            <svg className={`w-3.5 h-3.5 flex-shrink-0 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className={`font-semibold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{date}</span>
            <span className={isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}>|</span>
            <span>{time}</span>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex gap-6 flex-1 min-h-0">

          {/* Speakers */}
          <div className="stagger-in w-[45%] flex-shrink-0 flex flex-col min-h-0">
            <p className={`text-sm font-bold uppercase tracking-wider mb-3 flex-shrink-0 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
              Speakers
            </p>
            <div className="space-y-2 overflow-y-auto">
              {(metadata.speakers || defaultSpeakers).map((speaker) => (
                <div
                  key={speaker.name}
                  className={`p-4 rounded-xl border ${
                    speaker.highlight
                      ? isDark ? 'bg-elastic-teal/10 border-elastic-teal/30' : 'bg-elastic-blue/5 border-elastic-blue/20'
                      : isDark ? 'bg-white/[0.03] border-white/10'           : 'bg-white/80 border-elastic-dev-blue/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {speaker.avatar ? (
                      <img
                        src={speaker.avatar}
                        alt={speaker.name}
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold ${
                        speaker.highlight
                          ? isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue'
                          : isDark ? 'bg-white/10 text-white/60'             : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60'
                      }`}>
                        {speaker.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-bold text-lg ${
                          speaker.highlight
                            ? isDark ? 'text-elastic-teal' : 'text-elastic-blue'
                            : isDark ? 'text-white'         : 'text-elastic-dark-ink'
                        }`}>
                          {speaker.name}
                        </span>
                        {speaker.moderator && (
                          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60'
                          }`}>Moderator</span>
                        )}
                        {speaker.highlight && (
                          <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded-full ${
                            isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'
                          }`}>Elastic</span>
                        )}
                      </div>
                      <p className={`text-base mt-0.5 truncate ${isDark ? 'text-white/70' : 'text-elastic-ink/70'}`}>
                        {speaker.role}, {speaker.org}
                      </p>
                      {speaker.note && (
                        <p className={`text-xs mt-0.5 italic ${isDark ? 'text-white/55' : 'text-elastic-ink/55'}`}>
                          {speaker.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Description + Topics */}
          <div className="stagger-in flex-1 flex flex-col gap-4 min-h-0">
            <div>
              <p className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                About This Panel
              </p>
              <div className={`p-5 rounded-xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/80 border-elastic-dev-blue/10'}`}>
                {(Array.isArray(description) ? description : [description]).map((para, i) => (
                  <p key={i} className={`text-lg leading-relaxed ${i > 0 ? 'mt-3' : ''} ${isDark ? 'text-white/70' : 'text-elastic-ink'}`}>
                    {para}
                  </p>
                ))}
              </div>
            </div>

            <div>
              <p className={`text-sm font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                Key Topics
              </p>
              <div className="space-y-2">
                {defaultTopics.map((topic) => (
                  <div
                    key={topic}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg ${
                      isDark ? 'bg-white/[0.02]' : 'bg-elastic-blue/[0.03]'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`} />
                    <span className={`text-base ${isDark ? 'text-white/60' : 'text-elastic-ink'}`}>{topic}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default PanelScene
