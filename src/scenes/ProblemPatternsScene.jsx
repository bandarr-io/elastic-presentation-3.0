import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartLine } from '@fortawesome/free-solid-svg-icons'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'

const PROBLEM_PATTERNS_DEFAULT_CATEGORIES = [
  {
    label: 'Observability',
    icon: 'chart-line',
    problems: [
      'Disconnected logs, metrics, traces',
      'MTTR stays high despite lots of data',
      'Tool sprawl and cost pressure',
      'Weak correlation to customer impact',
    ],
  },
  {
    label: 'Security',
    icon: 'shield',
    problems: [
      'Alert fatigue and signal-to-noise ratio',
      'Blind spots across cloud and on-prem',
      'Tool sprawl and cost pressure',
      'Manual investigation slows response',
    ],
  },
  {
    label: 'Search',
    icon: 'magnifying-glass',
    problems: [
      'Slow or irrelevant search results',
      'Limited semantic or vector search',
      'Tool sprawl and cost pressure',
      'Difficulty scaling search infrastructure',
    ],
  },
]

const ProblemPatternsScene = ({ metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const eyebrow        = metadata.eyebrow        || 'Problem Orientation'
  const title          = metadata.title          || 'Common'
  const titleHighlight = metadata.titleHighlight || 'Problem Patterns'
  const subtitle       = metadata.subtitle       || "Elastic is broad, so rather than walk through everything, let's orient around the problems teams typically solve with it."

  const categories =
    Array.isArray(metadata.categories) && metadata.categories.length
      ? metadata.categories
      : PROBLEM_PATTERNS_DEFAULT_CATEGORIES

  const [selected, setSelected] = useState(0)
  const activeIndex = Math.min(selected, categories.length - 1)
  const active = categories[activeIndex] || {}
  const accentHex = isDark ? '#48EFCF' : '#0B64DD'

  const problems = (active.problems || []).filter((p) => (p ?? '').trim() !== '')

  return (
    <div className="flex flex-col h-full w-full py-4 overflow-hidden">
      <div className="w-full max-w-[1400px] px-12 md:px-24 mx-auto flex-1 flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={`${title} `}
          titleAccent={titleHighlight}
          subtitle={subtitle}
        />

        <div className="flex-1 flex flex-col justify-center gap-10">
          {/* Segmented category selector */}
          <div className="flex justify-center">
            <div className={`inline-flex items-center gap-1 rounded-2xl border p-1 ${
              isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-elastic-dev-blue/10'
            }`}>
              {categories.map((cat, i) => {
                const isActive = i === activeIndex
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`rounded-xl px-6 py-2.5 flex items-center gap-2.5 text-base font-semibold transition-all duration-200 ${
                      isActive
                        ? 'shadow-sm'
                        : isDark
                          ? 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                          : 'text-elastic-dev-blue/70 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/[0.05]'
                    }`}
                    style={isActive ? { backgroundColor: accentHex, color: isDark ? '#0B1628' : '#fff' } : undefined}
                  >
                    <FontAwesomeIcon icon={resolveIcon(cat.icon, faChartLine)} />
                    {cat.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Problem cards — vertical cards side by side, capped height, centered */}
          <div key={activeIndex} className="flex-1 min-h-0 max-h-[320px] flex gap-4">
            {problems.map((problem, i) => (
              <div
                key={i}
                className={`group relative overflow-hidden rounded-2xl border p-6 flex-1 min-w-0 flex flex-col gap-4 transition-all duration-300 hover:-translate-y-1 ${
                  isDark
                    ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                    : 'bg-white border-elastic-dev-blue/10 hover:shadow-lg'
                }`}
              >
                {/* Accent top bar */}
                <span className="absolute left-0 right-0 top-0 h-1.5" style={{ backgroundColor: accentHex }} />

                {/* Top: index + category */}
                <div className="flex flex-col gap-3 min-w-0">
                  <span
                    className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-2xl"
                    style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.12)' : 'rgba(11,100,221,0.1)', color: accentHex }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex items-center gap-2">
                    <FontAwesomeIcon icon={resolveIcon(active.icon, faChartLine)} className="text-sm" style={{ color: accentHex }} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-elastic-ink/70'}`}>
                      {active.label}
                    </span>
                  </div>
                </div>

                {/* Middle: problem title */}
                <div className="flex-1 flex items-center min-w-0">
                  <h3 className={`text-2xl md:text-3xl font-bold leading-snug ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                    {problem}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProblemPatternsScene
