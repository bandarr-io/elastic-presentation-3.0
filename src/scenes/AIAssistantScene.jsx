import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faWandMagicSparkles,
  faDiagramProject,
  faRobot,
  faArrowRightLong,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'
import { resolveIcon } from '../data/iconOptions'

const COLORS = {
  teal: '#48EFCF',
  blue: '#0B64DD',
  pink: '#F04E98',
  poppy: '#FF957D',
}

// The maturity spectrum: reactive (today) -> agentic (emerging today) -> autonomous (roadmap).
const DEFAULT_STAGES = [
  {
    key: 'reactive',
    phase: 'today',
    name: 'Reactive & Assistive',
    icon: faWandMagicSparkles,
    desc: 'Ask in plain language; get answers, context, and the next step.',
    items: ['Natural language → ES|QL', 'Alert & error explanation', 'Guided runbooks', 'ML anomaly detection'],
  },
  {
    key: 'agentic',
    phase: 'today',
    name: 'Agentic',
    icon: faDiagramProject,
    desc: 'Correlates signals and surfaces a recommended action — no manual queries.',
    items: ['Attack Discovery correlation', 'Cross-signal root cause', 'Recommended action surfaced', 'Workflow automation'],
  },
  {
    key: 'autonomous',
    phase: 'roadmap',
    name: 'Autonomous & Closed-Loop',
    icon: faRobot,
    desc: 'Investigate, decide, and remediate end-to-end with human oversight.',
    items: ['Multi-step autonomous investigation', 'Policy-guarded remediation', 'Closed-loop automation'],
  },
]

function AIAssistantScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const titleParts = metadata.titleParts || ['Reactive today.', 'Agentic now.', 'Autonomous next.']
  const eyebrow = metadata.eyebrow || 'From Answers to Action'
  const stages = (metadata.stages || DEFAULT_STAGES).map((item, i) => {
    const merged = { ...(DEFAULT_STAGES[i] || {}), ...item }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_STAGES[i]?.icon) }
  })
  const todayLabel = metadata.todayLabel || 'In production today'
  const roadmapLabel = metadata.roadmapLabel || 'Committed roadmap'

  // Light theme is monochrome blue; dark theme uses the full accent palette.
  const accent = (darkColor) => (isDark ? darkColor : COLORS.blue)
  const todayColor = accent(COLORS.teal)
  // Roadmap reads as "not yet active": neutral, with a dashed border + label as the real cue.
  const roadmapColor = isDark ? '#8E94A3' : '#6B7280'

  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'

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
    <div ref={rootRef} className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1200px] mx-auto w-full">
        {/* Eyebrow + title + subtitle — shared SceneHeader for consistent spacing */}
        <SceneHeader
          reveal
          eyebrow={eyebrow}
          titlePlain={`${titleParts[0]} `}
          titleAccent={
            <>
              <span className="italic">{titleParts[1]} </span>
              <span className="underline">{titleParts[2]}</span>
            </>
          }
          subtitle={
            metadata.subtitle || (
              <>
                More than a chat box — Elastic AI is{' '}
                <span className="font-semibold" style={{ color: todayColor }}>in production today</span>.
              </>
            )
          }
        />

        {/* Content — adjust mt-* to tune the gap between the header and content */}
        <div className="mt-2">
        {/* Phase rail */}
        <div className="reveal flex items-center justify-between mb-1 px-1">
          <span className="text-xs font-bold uppercase tracking-wider" style={{ color: todayColor }}>
            Available now · {todayLabel}
          </span>
          <span className={`text-xs font-bold uppercase tracking-wider ${mutedText}`}>
            {roadmapLabel}
          </span>
        </div>
        <div className="reveal h-1 rounded-full mb-4" style={{ background: `linear-gradient(90deg, ${todayColor}, ${todayColor} 62%, ${roadmapColor})`, opacity: 0.6 }} />

        {/* Capability spectrum */}
        <div className="flex items-stretch gap-2 mb-4">
          {stages.map((s, i) => {
            const isRoadmap = s.phase === 'roadmap'
            const color = isRoadmap ? roadmapColor : todayColor
            return (
              <div key={s.key} className="flex items-stretch flex-1 gap-2">
                <div
                  className={`reveal flex-1 rounded-2xl p-4 ${cardBase} ${isRoadmap ? 'border border-dashed' : 'border-2'}`}
                  style={{ borderTopColor: color, borderTopWidth: isRoadmap ? undefined : '4px', borderColor: isRoadmap ? `${color}80` : undefined }}
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ backgroundColor: `${color}22`, color }}>
                      <FontAwesomeIcon icon={s.icon} />
                    </span>
                    <div className={`font-bold text-lg leading-tight ${headText}`}>{s.name}</div>
                  </div>
                  <p className={`text-sm leading-snug mb-3 ${mutedText}`}>{s.desc}</p>
                  <ul className="space-y-2 mb-3">
                    {s.items.map((it) => (
                      <li key={it} className={`flex items-start gap-2 text-sm ${isDark ? 'text-elastic-light-grey/85' : 'text-elastic-ink'}`}>
                        <FontAwesomeIcon icon={faCircleCheck} className="mt-1 shrink-0" style={{ color, fontSize: 13 }} />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <span
                    className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-full"
                    style={{ backgroundColor: `${color}1A`, color }}
                  >
                    {isRoadmap ? roadmapLabel : todayLabel}
                  </span>
                </div>
                {i < stages.length - 1 && (
                  <div className="reveal flex items-center">
                    <FontAwesomeIcon icon={faArrowRightLong} className={mutedText} />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        </div>
      </div>
    </div>
  )
}

export default AIAssistantScene
