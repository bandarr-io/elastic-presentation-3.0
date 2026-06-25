import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faFire,
  faThermometerHalf,
  faThermometerQuarter,
  faDatabase,
  faSnowflake,
  faCheckCircle,
  faClock,
  faHardDrive,
  faBolt,
  faSliders,
  faMagnifyingGlassChart,
  faLayerGroup,
  faServer,
} from '@fortawesome/free-solid-svg-icons'

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_TIERS = [
  { id: 'hot', name: 'Hot', icon: faFire, color: '#F04E98', costSymbol: '$$$', costPerGB: 0.50, latencyShort: 'Now', volume: 10, description: 'Real-time analytics', retention: '1-7 days', storage: 'NVMe SSD', latency: 'Milliseconds', useCase: 'Active investigations' },
  { id: 'warm', name: 'Warm', icon: faThermometerHalf, color: '#FF957D', costSymbol: '$$', costPerGB: 0.20, latencyShort: 'In a second', volume: 20, description: 'Recent historical', retention: '1-4 weeks', storage: 'SSD', latency: 'Sub-second', useCase: 'Trend analysis' },
  { id: 'cold', name: 'Cold', icon: faThermometerQuarter, color: '#0B64DD', costSymbol: '$', costPerGB: 0.05, latencyShort: 'In a minute', volume: 30, description: 'Searchable archives', retention: '1-12 months', storage: 'HDD', latency: 'Seconds', useCase: 'Audit trails' },
  { id: 'frozen', name: 'Frozen', icon: faSnowflake, color: '#48EFCF', costSymbol: '¢', costPerGB: 0.01, latencyShort: 'In minutes', volume: 40, description: 'Long-term compliance', retention: '1-7+ years', storage: 'Object Storage', latency: 'Minutes', useCase: 'Forensics' },
]

const DEFAULT_ELASTIC_DISPLAY = {
  hot: {
    costSymbol: '$$$$',
    latencyShort: 'Milliseconds',
    subtitle: 'Real-time indexing & search',
    suitableFor: 'Dashboards, alerts, active queries',
    keyBenefit: 'Fastest performance for read/write',
  },
  warm: {
    costSymbol: '$$',
    latencyShort: 'Seconds',
    subtitle: 'Frequently accessed data',
    suitableFor: 'Recent historical, trend analysis',
    keyBenefit: 'Cost-effective, consistent performance',
  },
  cold: {
    costSymbol: '$',
    latencyShort: 'Seconds',
    subtitle: 'Read-only data',
    suitableFor: 'Historical lookbacks, audit trails',
    keyBenefit: 'Single replica, instant queries',
  },
  frozen: {
    costSymbol: '¢',
    latencyShort: 'Minutes',
    subtitle: 'Searchable archives',
    suitableFor: 'Compliance, legal hold, deep archives',
    keyBenefit: 'Searchable snapshots on object storage',
  },
}

const DEFAULT_TRADITIONAL_DISPLAY = {
  hot: {
    costSymbol: '$$$$$',
    latencyShort: 'Seconds',
    subtitle: 'All searchable data here',
    suitableFor: 'Everything that needs to be queryable',
    keyBenefit: null,
    painPoint: 'Expensive to scale',
  },
  warm: {
    costSymbol: '$$$$',
    latencyShort: 'Minutes',
    subtitle: 'Read-only cache',
    suitableFor: 'Recently accessed data only',
    keyBenefit: null,
    painPoint: 'Limited utility',
  },
  cold: {
    costSymbol: '$$$',
    latencyShort: '24+ hours',
    subtitle: 'Archive storage',
    suitableFor: 'Data you hope you never need',
    keyBenefit: null,
    painPoint: 'Restore required',
  },
  frozen: {
    costSymbol: '$$',
    latencyShort: 'Days',
    subtitle: 'Manual rehydration',
    suitableFor: 'Compliance checkbox only',
    keyBenefit: null,
    painPoint: 'Days to access, essentially unusable',
  },
}

const DEFAULT_SIMPLIFIED_DISPLAY = {
  hot: {
    name: 'Index',
    icon: faServer,
    costSymbol: '$$$$',
    latencyShort: '~12 Hours',
    subtitle: 'Real-time ingest & search',
    keyBenefit: 'Millisecond queries on live data',
  },
  warm: {
    name: 'Search',
    icon: faMagnifyingGlassChart,
    costSymbol: '$$',
    latencyShort: '1–3 Days',
    subtitle: 'Query recent historical data',
    keyBenefit: 'Sub-second search on warm data',
  },
  cold: {
    name: 'Store',
    icon: faHardDrive,
    costSymbol: '$',
    latencyShort: '10% Cache',
    subtitle: 'Cost-efficient object storage',
    keyBenefit: 'Single replica on object store',
  },
  frozen: {
    name: 'Searchable',
    icon: faCheckCircle,
    costSymbol: '¢',
    latencyShort: '1–365+ Days',
    subtitle: 'Full search across all archives',
    keyBenefit: 'Searchable snapshots without restore',
  },
}

const DEFAULT_SUBTITLES = {
  default: {
    accent: 'Hot, warm, cold, frozen.',
    plain: ' One platform across every stage — pick a path on the right to compare.',
  },
  elastic: {
    accent: 'No more restores. No more rehydration.',
    plain: ' — Search everything, instantly.',
  },
  simplified: {
    accent: 'Index. Search. Store.',
    plain: " — One platform, every stage of your data's life.",
  },
  traditional: {
    accent: 'Restores required. Data invisible until rehydrated.',
    plain: ' Resulting in hours to days of waiting.',
  },
}

const DEFAULT_TRADITIONAL_OVERLAYS = {
  cold: { title: 'Restore', subtitle: 'On Request' },
  frozen: { title: 'Manual', subtitle: 'Rehydration' },
}

const DEFAULT_DATA_FLOW = {
  newestLabel: 'Newest Data →',
  oldestLabel: 'Oldest Data →',
}

const DEFAULT_COMPARISON_SIMPLIFIED = [
  { title: 'Index', description: 'Real-time ingest with millisecond search response' },
  { title: 'Search', description: 'Sub-second queries across recent historical data' },
  { title: 'Store', description: 'Cost-efficient object storage, single replica' },
  { title: 'Searchable', description: 'Full search across snapshots — no rehydration needed' },
]

const DEFAULT_COMPARISON_ELASTIC = [
  { title: 'Searchable Snapshots', description: 'Cold & Frozen data queryable without restore' },
  { title: 'Unlimited Lookback', description: 'Query years of historical data instantly' },
  { title: '50% Storage Savings', description: 'Cold tier uses object store for replicas' },
  { title: 'Never Delete Data', description: 'Frozen tier so cheap you can keep everything' },
]

const DEFAULT_COMPARISON_TRADITIONAL = [
  { title: '24+ Hour Restores', description: 'Cold data requires support ticket to access' },
  { title: 'Data Invisible', description: "Frozen data can't be searched until rehydrated" },
  { title: 'Limited Lookback', description: 'No visibility into historical data' },
  { title: 'Forced Deletion', description: 'Cost forces deletion of valuable data' },
]

const DEFAULT_ARCHITECTURE_PATTERNS = [
  { id: 'all', label: 'All Tiers' },
  { id: 'hot-cold-frozen', label: 'Hot → Cold → Frozen' },
  { id: 'hot-frozen', label: 'Hot → Frozen' },
]

const DEFAULT_NAV = {
  traditional: 'Traditional',
  elastic: 'Elastic ILM',
  simplified: 'Index / Search / Store',
}

const TIER_IDS = ['hot', 'warm', 'cold', 'frozen']

const TIER_CONFIG = [
  { slots: 9, rows: 3, cols: 3 },
  { slots: 12, rows: 4, cols: 3 },
  { slots: 15, rows: 5, cols: 3 },
  { slots: 18, rows: 6, cols: 3 },
]

const SNAKE_PATHS = {
  9: [9, 8, 7, 4, 5, 6, 3, 2, 1],
  12: [12, 11, 10, 7, 8, 9, 6, 5, 4, 1, 2, 3],
  15: [15, 14, 13, 10, 11, 12, 9, 8, 7, 4, 5, 6, 3, 2, 1],
  18: [18, 17, 16, 13, 14, 15, 12, 11, 10, 7, 8, 9, 6, 5, 4, 1, 2, 3],
}

const SIMPLIFIED_ICONS = {
  hot: faServer,
  warm: faMagnifyingGlassChart,
  cold: faHardDrive,
  frozen: faCheckCircle,
}

// ============================================================================
// HELPERS
// ============================================================================

function mergeTierKeyedDisplay(defaults, overrides) {
  return Object.fromEntries(
    TIER_IDS.map((id) => [id, { ...defaults[id], ...(overrides?.[id] || {}) }])
  )
}

function getExitSlot(tierIndex) {
  const maxSlots = TIER_CONFIG[tierIndex].slots
  const path = SNAKE_PATHS[maxSlots]
  return path[path.length - 1]
}

const SLOT_SIZE = 40
const SLOT_GAP = 9
const TIER_PADDING = 16
const STEP_DELAY = 700

function getSlotPosition(slot, tierIndex) {
  const { rows, cols } = TIER_CONFIG[tierIndex]
  const row = rows - 1 - Math.floor((slot - 1) / cols)
  const col = cols - 1 - ((slot - 1) % cols)
  return {
    x: TIER_PADDING + col * (SLOT_SIZE + SLOT_GAP),
    y: TIER_PADDING + row * (SLOT_SIZE + SLOT_GAP),
  }
}

function getTierDimensions(tierIndex) {
  const { rows, cols } = TIER_CONFIG[tierIndex]
  return {
    width: TIER_PADDING * 2 + cols * SLOT_SIZE + (cols - 1) * SLOT_GAP,
    height: TIER_PADDING * 2 + rows * SLOT_SIZE + (rows - 1) * SLOT_GAP,
  }
}

function shiftTier(slots, tierIndex) {
  const maxSlots = TIER_CONFIG[tierIndex].slots
  const snakePath = SNAKE_PATHS[maxSlots]
  const newSlots = Array(maxSlots).fill(null)

  for (let i = 1; i < snakePath.length; i++) {
    const currentSlot = snakePath[i]
    const previousSlot = snakePath[i - 1]
    newSlots[currentSlot - 1] = slots[previousSlot - 1]
  }

  return newSlots
}

function countBalls(slots) {
  return slots.filter(s => s !== null).length
}

function isFull(slots, tierIndex) {
  return countBalls(slots) >= TIER_CONFIG[tierIndex].slots
}

function renderSubtitle(subtitle, isDark) {
  return (
    <>
      <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{subtitle.accent}</span>
      <span className={`${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{subtitle.plain}</span>
    </>
  )
}

function renderTraditionalSubtitle(subtitle, isDark) {
  return (
    <>
      <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-dev-blue'}`}>{subtitle.accent}</span>
      <span className={`${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{subtitle.plain}</span>
    </>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function DataTieringScene({ isRunning = false, setIsRunning = () => { }, resetSignal = 0, metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const dataTiers = (metadata.tiers || DEFAULT_TIERS).map((t, i) => ({ ...(DEFAULT_TIERS[i] || {}), ...t }))
  const elasticDisplay = mergeTierKeyedDisplay(DEFAULT_ELASTIC_DISPLAY, metadata.elasticDisplay)
  const traditionalDisplay = mergeTierKeyedDisplay(DEFAULT_TRADITIONAL_DISPLAY, metadata.traditionalDisplay)
  const simplifiedDisplayRaw = mergeTierKeyedDisplay(DEFAULT_SIMPLIFIED_DISPLAY, metadata.simplifiedDisplay)
  const simplifiedDisplay = Object.fromEntries(
    TIER_IDS.map((id) => [id, { ...simplifiedDisplayRaw[id], icon: SIMPLIFIED_ICONS[id] }])
  )
  const subtitles = {
    default: { ...DEFAULT_SUBTITLES.default, ...(metadata.subtitles?.default || {}) },
    elastic: { ...DEFAULT_SUBTITLES.elastic, ...(metadata.subtitles?.elastic || {}) },
    simplified: { ...DEFAULT_SUBTITLES.simplified, ...(metadata.subtitles?.simplified || {}) },
    traditional: { ...DEFAULT_SUBTITLES.traditional, ...(metadata.subtitles?.traditional || {}) },
  }
  const traditionalOverlays = {
    cold: { ...DEFAULT_TRADITIONAL_OVERLAYS.cold, ...(metadata.traditionalOverlays?.cold || {}) },
    frozen: { ...DEFAULT_TRADITIONAL_OVERLAYS.frozen, ...(metadata.traditionalOverlays?.frozen || {}) },
  }
  const dataFlow = { ...DEFAULT_DATA_FLOW, ...(metadata.dataFlow || {}) }
  const comparisonSimplified = (metadata.comparisonSimplified || DEFAULT_COMPARISON_SIMPLIFIED).map((item, i) => ({
    ...(DEFAULT_COMPARISON_SIMPLIFIED[i] || {}),
    ...item,
  }))
  const comparisonElastic = (metadata.comparisonElastic || DEFAULT_COMPARISON_ELASTIC).map((item, i) => ({
    ...(DEFAULT_COMPARISON_ELASTIC[i] || {}),
    ...item,
  }))
  const comparisonTraditional = (metadata.comparisonTraditional || DEFAULT_COMPARISON_TRADITIONAL).map((item, i) => ({
    ...(DEFAULT_COMPARISON_TRADITIONAL[i] || {}),
    ...item,
  }))
  const architecturePatterns = (metadata.architecturePatterns || DEFAULT_ARCHITECTURE_PATTERNS).map((p, i) => ({
    ...(DEFAULT_ARCHITECTURE_PATTERNS[i] || {}),
    ...p,
  }))
  const nav = { ...DEFAULT_NAV, ...(metadata.nav || {}) }
  const eyebrow = metadata.eyebrow || 'Intelligent Data Lifecycle'
  const titlePlain = metadata.titlePlain || 'Your data ages. '
  const titleAccent = metadata.titleAccent || "Your insights shouldn't wait."

  const [tiers, setTiers] = useState(() => TIER_CONFIG.map(c => Array(c.slots).fill(null)))
  const nextBallIdRef = useRef(1)

  const [activeTier, setActiveTier] = useState(null) // kept for architecture-pattern guard
  // Default to clean tiers; the comparison panel is revealed only when a mode is picked.
  const [comparisonMode, setComparisonMode] = useState(null)
  const [architecturePattern, setArchitecturePattern] = useState('all')

  const runStep = () => {
    setTiers(prevTiers => {
      const newTiers = prevTiers.map(t => [...t])

      let ballToPass = { id: nextBallIdRef.current }
      nextBallIdRef.current++

      for (let tierIdx = 0; tierIdx <= 3; tierIdx++) {
        const exitSlot = getExitSlot(tierIdx)
        const exitingBall = newTiers[tierIdx][exitSlot - 1]

        newTiers[tierIdx] = shiftTier(newTiers[tierIdx], tierIdx)

        const entryIndex = TIER_CONFIG[tierIdx].slots - 1
        newTiers[tierIdx][entryIndex] = ballToPass

        ballToPass = exitingBall
      }

      return newTiers
    })
  }

  useEffect(() => {
    if (!isRunning) return
    const timer = setInterval(runStep, STEP_DELAY)
    return () => clearInterval(timer)
  }, [isRunning])

  const reset = () => {
    setTiers(TIER_CONFIG.map(c => Array(c.slots).fill(null)))
    nextBallIdRef.current = 1
  }

  useEffect(() => {
    if (resetSignal > 0) reset()
  }, [resetSignal])

  const headerSubtitle =
    comparisonMode === null
      ? renderSubtitle(subtitles.default, isDark)
      : comparisonMode === 'elastic'
        ? renderSubtitle(subtitles.elastic, isDark)
        : comparisonMode === 'simplified'
          ? renderSubtitle(subtitles.simplified, isDark)
          : renderTraditionalSubtitle(subtitles.traditional, isDark)

  const simplifiedComparisonIcons = [faServer, faMagnifyingGlassChart, faHardDrive, faCheckCircle]
  const elasticComparisonIcons = [faMagnifyingGlassChart, faBolt, faClock, faCheckCircle]
  const traditionalComparisonIcons = [faClock, faDatabase, faSliders, faHardDrive]

  return (
    <div className="scene !py-4 w-full h-full">
      <div className="max-w-[95%] mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePlain}
          titleAccent={titleAccent}
          subtitle={headerSubtitle}
        />



        {/* Main row: visualization + side nav */}
        <div className="flex gap-3 flex-1 min-h-0">

          {/* Main Visualization */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 relative rounded-2xl overflow-hidden mx-4">
              {/* Background */}
              <div className={`absolute inset-0 ${isDark ? 'bg-gradient-to-r from-pink-500/20 via-orange-400/15 via-blue-500/15 to-teal-400/20' : 'bg-gradient-to-r from-white to-elastic-blue/10'}`} />
              <div className={` inset-0 ${isDark ? 'bg-elastic-dev-blue/50' : 'bg-white/30'}`} />

              {/* Tier Columns */}
              <div className="absolute inset-0 flex items-end">
                {dataTiers
                  .filter((tier) => {
                    if (comparisonMode === 'traditional' || comparisonMode === 'simplified') return true
                    if (architecturePattern === 'all') return true
                    if (architecturePattern === 'hot-cold-frozen') return tier.id !== 'warm'
                    if (architecturePattern === 'hot-frozen') return tier.id === 'hot' || tier.id === 'frozen'
                    return true
                  })
                  .map((tier) => {
                    const tierIndex = dataTiers.findIndex(t => t.id === tier.id)
                    const { width, height } = getTierDimensions(tierIndex)
                    const config = TIER_CONFIG[tierIndex]
                    const slots = tiers[tierIndex]

                    return (
                      <button
                        key={tier.id}
                        className={`flex-1 relative flex flex-col items-center p-6 border-r last:border-r-0 ${isDark ? 'border-white/5' : 'border-black/5'}`}
                      >
                        {/* Ball grid wrapper */}
                        <div className="flex-1 w-full flex items-end justify-center">
                          <div
                            className="relative rounded-lg"
                            style={{
                              width, height,
                              backgroundColor: isDark ? `${tier.color}15` : 'rgba(11,100,221,0.05)',
                              border: isDark ? `2px solid ${tier.color}40` : '2px solid rgba(11,100,221,0.15)',
                            }}
                          >
                            {/* Slot backgrounds */}
                            {Array.from({ length: config.slots }, (_, i) => {
                              const slot = i + 1
                              const { x, y } = getSlotPosition(slot, tierIndex)
                              return (
                                <div
                                  key={`bg-${slot}`}
                                  className="absolute rounded-full opacity-20"
                                  style={{ width: SLOT_SIZE, height: SLOT_SIZE, left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, backgroundColor: isDark ? tier.color : 'rgb(11,100,221)' }}
                                />
                              )
                            })}

                            {/* Balls — sorted by id so DOM order is stable and transforms always animate */}
                            {slots
                              .map((ball, slotIndex) => ball ? { ball, slotIndex } : null)
                              .filter(Boolean)
                              .sort((a, b) => a.ball.id - b.ball.id)
                              .map(({ ball, slotIndex }) => {
                                const slot = slotIndex + 1
                                const { x, y } = getSlotPosition(slot, tierIndex)
                                return (
                                  <div
                                    key={ball.id}
                                    className="absolute rounded-full"
                                    style={{
                                      width: SLOT_SIZE,
                                      height: SLOT_SIZE,
                                      left: 0,
                                      top: 0,
                                      transform: `translate(${x}px, ${y}px)`,
                                      backgroundColor: isDark ? tier.color : 'rgb(11,100,221)',
                                      transition: 'transform 0.65s ease-in-out',
                                    }}
                                  />
                                )
                              })
                            }

                            {/* Traditional mode overlay for Cold tier */}
                            {comparisonMode === 'traditional' && tierIndex === 2 && (
                              <div className="absolute inset-0 rounded-lg bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center">
                                <FontAwesomeIcon icon={faClock} className="text-white text-2xl mb-1" />
                                <span className="text-white text-xs font-bold text-center">{traditionalOverlays.cold.title}</span>
                                <span className="text-white text-xs text-center">{traditionalOverlays.cold.subtitle}</span>
                              </div>
                            )}

                            {/* Traditional mode overlay for Frozen tier */}
                            {comparisonMode === 'traditional' && tierIndex === 3 && (
                              <div className="absolute inset-0 rounded-lg bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                                <FontAwesomeIcon icon={faClock} className="text-white text-2xl mb-1" />
                                <span className="text-white text-sm font-bold text-center">{traditionalOverlays.frozen.title}</span>
                                <span className="text-white text-sm text-center">{traditionalOverlays.frozen.subtitle}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Tier Info */}
                        <div className="text-center mt-6 w-full">
                          {comparisonMode === 'simplified' ? (
                            <>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <FontAwesomeIcon icon={simplifiedDisplay[tier.id]?.icon} className="text-2xl" style={{ color: isDark ? tier.color : 'rgb(11,100,221)' }} />
                                <span className="font-bold text-3xl" style={{ color: isDark ? tier.color : 'rgb(11,100,221)' }}>{simplifiedDisplay[tier.id]?.name}</span>
                              </div>
                              <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                                {simplifiedDisplay[tier.id]?.costSymbol}<span className="text-2xl font-normal opacity-50">/GB</span>
                              </div>
                              <div className={`text-xl mt-1 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                                {simplifiedDisplay[tier.id]?.latencyShort}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-center gap-2 mb-2">
                                <FontAwesomeIcon icon={tier.icon} className="text-2xl" style={{ color: isDark ? tier.color : 'rgb(11,100,221)' }} />
                                <span className="font-bold text-3xl" style={{ color: isDark ? tier.color : 'rgb(11,100,221)' }}>{tier.name}</span>
                              </div>
                              <div className={`text-4xl font-black ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                                {comparisonMode === 'traditional'
                                  ? traditionalDisplay[tier.id]?.costSymbol
                                  : elasticDisplay[tier.id]?.costSymbol
                                }<span className="text-2xl font-normal opacity-50">/GB</span>
                              </div>
                              <div className={`text-xl mt-1 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                                {comparisonMode === 'traditional'
                                  ? traditionalDisplay[tier.id]?.latencyShort
                                  : elasticDisplay[tier.id]?.latencyShort
                                }
                              </div>
                            </>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>

            </div>

            {/* Data Flow Arrow */}
            <div className="mx-8 mt-2 flex items-center justify-between">
              <span className={`text-xs font-mono uppercase ${isDark ? 'text-elastic-pink' : 'text-elastic-pink'}`}>{dataFlow.newestLabel}</span>
              <div className="flex-1 mx-4 h-px bg-gradient-to-r from-pink-500/40 via-blue-500/40 to-teal-400/40" />
              <span className={`text-xs font-mono uppercase ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{dataFlow.oldestLabel}</span>
            </div>

            {/* Comparison Panel — revealed once a mode is selected */}
            {comparisonMode && (
            <div className="mt-2 mx-4">
              <div className={`p-4 rounded-2xl ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.04]'}`}>
                {comparisonMode === 'simplified' ? (
                  <div key="simplified" className="grid grid-cols-4 gap-4">
                    {comparisonSimplified.map((card, i) => (
                      <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-elastic-teal/10 border border-elastic-teal/30' : 'bg-elastic-dev-blue/[0.04] border border-elastic-dev-blue/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={simplifiedComparisonIcons[i]} className={isDark ? 'text-elastic-teal' : 'text-elastic-dev-blue/50'} />
                          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{card.title}</span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : comparisonMode === 'elastic' ? (
                  <div key="elastic" className="grid grid-cols-4 gap-4">
                    {comparisonElastic.map((card, i) => (
                      <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-elastic-teal/10 border border-elastic-teal/30' : 'bg-elastic-dev-blue/[0.04] border border-elastic-dev-blue/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={elasticComparisonIcons[i]} className={isDark ? 'text-elastic-teal' : 'text-elastic-dev-blue/50'} />
                          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{card.title}</span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div key="traditional" className="grid grid-cols-4 gap-4">
                    {comparisonTraditional.map((card, i) => (
                      <div key={i} className={`p-3 rounded-xl ${isDark ? 'bg-elastic-pink/10 border border-elastic-pink/30' : 'bg-elastic-dev-blue/[0.04] border border-elastic-dev-blue/10'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <FontAwesomeIcon icon={traditionalComparisonIcons[i]} className={isDark ? 'text-elastic-pink' : 'text-elastic-dev-blue/50'} />
                          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{card.title}</span>
                        </div>
                        <p className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                          {card.description}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            )}
          </div>{/* /Main Visualization */}

          {/* Right-side mode navigator */}
          <div className="w-12 flex-shrink-0 flex flex-col items-center relative select-none">

            {/* Track line */}
            <div className={`absolute w-px top-[8%] bottom-[28%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
            {/* Progress fill */}
            <div
              className={`absolute w-px top-[8%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
              style={{ height: comparisonMode === 'elastic' ? '30%' : comparisonMode === 'simplified' ? '60%' : '0%' }}
            />

            {/* Traditional */}
            <button
              onClick={() => setComparisonMode('traditional')}
              className="relative z-10 group flex flex-col items-center py-7"
            >
              <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border ${isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'} shadow-lg`}>
                {nav.traditional}
              </span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${comparisonMode === 'traditional'
                  ? isDark
                    ? 'bg-elastic-dev-blue border-orange-400 text-orange-400 scale-110 shadow-[0_0_14px_rgba(251,146,60,0.3)]'
                    : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                  : isDark
                    ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                    : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                }`}>
                <FontAwesomeIcon icon={faDatabase} className="text-xs" />
              </div>
            </button>

            {/* Elastic ILM */}
            <button
              onClick={() => setComparisonMode('elastic')}
              className="relative z-10 group flex flex-col items-center py-7"
            >
              <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border ${isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'} shadow-lg`}>
                {nav.elastic}
              </span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${comparisonMode === 'elastic'
                  ? isDark
                    ? 'bg-elastic-dev-blue border-elastic-teal text-elastic-teal scale-110 shadow-[0_0_14px_rgba(72,239,207,0.3)]'
                    : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                  : isDark
                    ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                    : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                }`}>
                <FontAwesomeIcon icon={faMagnifyingGlassChart} className="text-xs" />
              </div>
            </button>

            {/* Architecture pattern sub-dots (Elastic mode only) */}
            {comparisonMode === 'elastic' && (
              <div className={`relative z-10 flex flex-col items-center gap-2.5 mb-3 px-2 py-1 rounded-full ${isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'}`}>
                {architecturePatterns.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setArchitecturePattern(p.id)
                      if (p.id === 'hot-cold-frozen' && activeTier === 'warm') setActiveTier(null)
                      if (p.id === 'hot-frozen' && (activeTier === 'warm' || activeTier === 'cold')) setActiveTier(null)
                    }}
                    className={`group relative w-3 h-3 rounded-full transition-all duration-200 border ${architecturePattern === p.id
                        ? isDark
                          ? 'bg-elastic-teal/60 border-elastic-teal scale-125'
                          : 'bg-elastic-blue/60 border-elastic-blue scale-125'
                        : isDark
                          ? 'bg-white/10 border-white/20 hover:bg-white/25'
                          : 'bg-elastic-dev-blue/10 border-elastic-dev-blue/20 hover:bg-elastic-dev-blue/25'
                      }`}
                  >
                    <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border ${isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'} shadow-lg`}>
                      {p.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Index / Search / Store */}
            <button
              onClick={() => setComparisonMode('simplified')}
              className="relative z-10 group flex flex-col items-center py-7"
            >
              <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border ${isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'} shadow-lg`}>
                {nav.simplified}
              </span>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${comparisonMode === 'simplified'
                  ? isDark
                    ? 'bg-elastic-dev-blue border-elastic-teal text-elastic-teal scale-110 shadow-[0_0_14px_rgba(72,239,207,0.3)]'
                    : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                  : isDark
                    ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                    : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                }`}>
                <FontAwesomeIcon icon={faLayerGroup} className="text-xs" />
              </div>
            </button>

            {/* Spacer */}
            <div className="flex-1" />

          </div>{/* /Right nav */}

        </div>{/* /Main row */}
      </div>
    </div>
  )
}

export default DataTieringScene
