import { animate } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase,
  faCalendarDays,
  faLayerGroup,
  faGaugeHigh,
  faChartLine,
  faShieldHalved,
  faMagnifyingGlassChart,
  faClipboardCheck,
  faBrain,
  faArrowDown,
} from '@fortawesome/free-solid-svg-icons'

const COLORS = {
  teal: '#48EFCF',
  blue: '#0B64DD',
  pink: '#F04E98',
  poppy: '#FF957D',
}

// Each mode describes the same dataset under two different logging strategies.
// Toggling between them is the core presenter beat for this scene.
const DEFAULT_MODES = {
  standard: {
    label: 'Standard Logging',
    storagePct: 100,
    storageNote: 'Raw _source · full replicas',
    retentionPct: 25,
    retentionLabel: 'Months',
    retentionNote: 'Limited by storage cost',
    tooling: '51 tools',
    toolingNote: 'Siloed logging, APM & monitoring across the state',
    footer: 'Costly to scale · short retention · siloed tools',
  },
  logsdb: {
    label: 'Elastic LogsDB',
    storagePct: 35,
    storageNote: 'Synthetic _source + index sorting + compression',
    storageBadge: '50–75% smaller',
    retentionPct: 96,
    retentionLabel: 'Years',
    retentionNote: 'Compliance + AI-ready history',
    tooling: '1 platform',
    toolingNote: 'Logs · APM · Metrics · Security — up to $2–3M avoided',
    footer: 'Observability at scale. Built for today. Ready for tomorrow.',
  },
}

const SILOED_TOOLS = [
  { icon: faDatabase, label: 'Logging' },
  { icon: faGaugeHigh, label: 'APM' },
  { icon: faChartLine, label: 'Metrics' },
  { icon: faShieldHalved, label: 'Security' },
]

const DEFAULT_OUTCOMES = [
  { icon: faMagnifyingGlassChart, color: COLORS.teal, title: 'Better Investigations', desc: 'Find answers faster with more data.' },
  { icon: faClipboardCheck, color: COLORS.blue, title: 'Better Compliance', desc: 'Meet requirements with longer retention.' },
  { icon: faBrain, color: COLORS.pink, title: 'Better AI Outcomes', desc: 'More data. More context. Smarter insights.' },
]

// Animates its displayed number whenever `value` changes (on mode toggle).
function AnimatedNumber({ value, suffix = '' }) {
  const ref = useRef(null)
  const prev = useRef(value)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const state = { v: prev.current }
    const anim = animate(state, {
      v: value,
      duration: 650,
      easing: 'easeOutCubic',
      onUpdate: () => {
        el.textContent = `${Math.round(state.v)}${suffix}`
      },
    })
    prev.current = value
    return () => anim?.pause?.()
  }, [value, suffix])

  return <span ref={ref}>{`${Math.round(prev.current)}${suffix}`}</span>
}

function LogsDBScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [mode, setMode] = useState('standard')

  const titleParts = metadata.titleParts || ['More Data.', 'Lower Cost.', 'Better Visibility.']
  const eyebrow = metadata.eyebrow || 'Store More. Spend Less.'
  const outcomes = metadata.outcomes || DEFAULT_OUTCOMES
  const modes = {
    standard: { ...DEFAULT_MODES.standard, ...(metadata.modes?.standard || {}) },
    logsdb: { ...DEFAULT_MODES.logsdb, ...(metadata.modes?.logsdb || {}) },
  }

  const isLogsDB = mode === 'logsdb'
  const m = modes[mode]

  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const trackBase = isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'

  // Light theme is monochrome blue; dark theme uses the full accent palette.
  const accent = (darkColor) => (isDark ? darkColor : COLORS.blue)
  const toolingColor = accent(COLORS.pink)
  const pinkAccent = accent(COLORS.pink)

  // Standard logging reads as "cost pain" (Poppy in dark); LogsDB lights up teal.
  const storageColor = isDark ? (isLogsDB ? COLORS.teal : COLORS.poppy) : COLORS.blue

  return (
    <div className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1180px] mx-auto w-full">
        {/* Eyebrow + title + subtitle — shared SceneHeader for consistent spacing */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={`${titleParts[0]} `}
          titleAccent={
            <>
              <span style={{ color: pinkAccent }}>{titleParts[1]} </span>
              <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>{titleParts[2]}</span>
            </>
          }
          subtitle={
            metadata.subtitle || (
              <>
                <span className="font-semibold" style={{ color: pinkAccent }}>Elastic LogsDB</span> keeps the data your teams depend on — for{' '}
                <span className="font-semibold" style={{ color: pinkAccent }}>a fraction of the cost</span>,{' '}
                <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>retained for years</span>{' '}
                — on the platform you already run.
              </>
            )
          }
        />

        {/* Content — adjust mt-* to tune the gap between the header and content */}
        <div className="mt-2">
        {/* Presenter toggle: Standard vs LogsDB */}
        <div className="flex justify-center mb-5">
          <div className={`relative flex p-1 rounded-full border ${cardBase}`} style={{ minWidth: 480 }}>
            <div
              className="absolute top-1 bottom-1 rounded-full transition-all duration-500 ease-out"
              style={{
                width: 'calc(50% - 4px)',
                left: isLogsDB ? 'calc(50% + 0px)' : '4px',
                background: isLogsDB
                  ? COLORS.blue
                  : isDark ? 'rgba(255,255,255,0.12)' : 'rgba(11,28,56,0.12)',
              }}
            />
            {['standard', 'logsdb'].map((key) => {
              const active = mode === key
              return (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className="relative z-10 flex-1 px-8 py-2.5 rounded-full text-base font-bold transition-colors duration-300 flex items-center justify-center gap-2"
                  style={{ color: active ? (key === 'logsdb' ? '#fff' : headTextColor(isDark)) : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(11,28,56,0.55)') }}
                >
                  {key === 'logsdb' && (
                    <img src="/logo-elastic-glyph-color.png" alt="" className="h-4 w-4 object-contain" />
                  )}
                  {modes[key].label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Three animated dimensions */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          {/* Storage footprint */}
          <DimensionCard cardBase={cardBase} color={storageColor} icon={faDatabase} title="Storage Footprint" mutedText={mutedText} note={m.storageNote}>
            <div className="flex items-end justify-center gap-2 mb-3">
              <span className="font-headline text-6xl font-extrabold leading-none" style={{ color: storageColor }}>
                <AnimatedNumber value={m.storagePct} suffix="%" />
              </span>
              {isLogsDB && m.storageBadge && (
                <span className="flex items-center gap-1 text-base font-bold mb-1" style={{ color: accent(COLORS.teal) }}>
                  <FontAwesomeIcon icon={faArrowDown} /> {m.storageBadge}
                </span>
              )}
            </div>
            <div className={`h-4 rounded-full overflow-hidden ${trackBase}`}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${m.storagePct}%`, backgroundColor: storageColor }}
              />
            </div>
          </DimensionCard>

          {/* Retention window */}
          <DimensionCard cardBase={cardBase} color={COLORS.blue} icon={faCalendarDays} title="Retention Window" mutedText={mutedText} note={m.retentionNote}>
            <div className="text-center mb-3">
              <span className="font-headline text-5xl font-extrabold leading-none" style={{ color: COLORS.blue }}>
                {m.retentionLabel}
              </span>
            </div>
            <div className={`relative h-4 rounded-full overflow-hidden ${trackBase}`}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${m.retentionPct}%`, backgroundColor: COLORS.blue }}
              />
            </div>
            <div className={`flex justify-between text-sm uppercase tracking-wider mt-1 ${mutedText}`}>
              <span>Day 0</span>
              <span>Years</span>
            </div>
          </DimensionCard>

          {/* Tooling / consolidation */}
          <DimensionCard cardBase={cardBase} color={toolingColor} icon={faLayerGroup} title="Tooling" mutedText={mutedText} note={m.toolingNote}>
            <div className="relative h-[72px] mb-2">
              {/* Standard: four siloed tools */}
              <div
                className="absolute inset-0 grid grid-cols-2 gap-2 transition-opacity duration-500"
                style={{ opacity: isLogsDB ? 0 : 1, pointerEvents: isLogsDB ? 'none' : 'auto' }}
              >
                {SILOED_TOOLS.map((t) => (
                  <div key={t.label} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${isDark ? 'bg-white/[0.04]' : 'bg-elastic-dev-blue/[0.04]'}`}>
                    <FontAwesomeIcon icon={t.icon} className={mutedText} style={{ fontSize: 14 }} />
                    <span className={`text-sm font-semibold ${mutedText}`}>{t.label}</span>
                  </div>
                ))}
              </div>
              {/* LogsDB: one unified platform */}
              <div
                className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl transition-opacity duration-500"
                style={{
                  opacity: isLogsDB ? 1 : 0,
                  pointerEvents: isLogsDB ? 'auto' : 'none',
                  background: `${toolingColor}14`,
                  border: `1px solid ${toolingColor}40`,
                }}
              >
                <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="h-8 w-8 object-contain" />
                <div className={`text-base font-bold ${headText}`}>One Elastic Platform</div>
              </div>
            </div>
            <div className="text-center font-headline text-3xl font-extrabold" style={{ color: toolingColor }}>
              {m.tooling}
            </div>
          </DimensionCard>
        </div>

        {/* Outcomes — dim under Standard, light up under LogsDB */}
        <div className={`rounded-2xl border p-3 transition-colors duration-500 ${cardBase}`}>
          <div className="grid grid-cols-3 gap-3">
            {outcomes.map((o) => {
              // Single accent across all three outcomes; icons differentiate them.
              const outcomeColor = isDark ? COLORS.teal : COLORS.blue
              return (
              <div key={o.title} className="flex items-center gap-3 transition-opacity duration-500" style={{ opacity: isLogsDB ? 1 : 0.62 }}>
                <span
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-500 text-lg"
                  style={{
                    backgroundColor: isLogsDB ? `${outcomeColor}22` : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,28,56,0.06)'),
                    color: isLogsDB ? outcomeColor : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(11,28,56,0.45)'),
                  }}
                >
                  <FontAwesomeIcon icon={o.icon} />
                </span>
                <div>
                  <div className={`text-base font-bold ${headText}`}>{o.title}</div>
                  <div className={`text-sm ${mutedText}`}>{o.desc}</div>
                </div>
              </div>
              )
            })}
          </div>
        </div>

        {/* Footer changes with mode */}
        <p
          className="text-center text-lg font-semibold mt-4 transition-colors duration-500"
          style={{ color: isLogsDB ? (isDark ? COLORS.teal : COLORS.blue) : (isDark ? 'rgba(255,255,255,0.5)' : 'rgba(11,28,56,0.5)') }}
        >
          {m.footer}
        </p>
        </div>
      </div>
    </div>
  )
}

function DimensionCard({ cardBase, color, icon, title, note, mutedText, children }) {
  return (
    <div className={`rounded-2xl border-2 p-5 ${cardBase}`} style={{ borderTopColor: color, borderTopWidth: '4px' }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}22`, color }}>
          <FontAwesomeIcon icon={icon} style={{ fontSize: 15 }} />
        </span>
        <span className="text-base font-bold" style={{ color }}>{title}</span>
      </div>
      {children}
      <p className={`text-sm leading-snug mt-3 ${mutedText}`}>{note}</p>
    </div>
  )
}

function headTextColor(isDark) {
  return isDark ? '#FFFFFF' : '#0B1C38'
}

export default LogsDBScene
