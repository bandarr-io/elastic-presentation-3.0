import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faLock, 
  faLockOpen,
  faRocket,
  faInfinity,
  faCubes,
  faMagnifyingGlass,
  faShieldHalved,
  faChartLine,
  faGears,
  faBrain,
  faRobot,
  faPlug,
  faUsers,
  faMapLocationDot,
  faEye,
  faKey,
  faFingerprint,
  faFileShield,
  faServer,
  faCloud,
  faHeadset,
  faDatabase,
  faNetworkWired,
  faBolt,
  faWandMagicSparkles,
  faLayerGroup,
  faSatelliteDish,
  faDiagramProject,
  faGaugeHigh,
  faMicrochip
} from '@fortawesome/free-solid-svg-icons'

const DEFAULT_FREE_OPEN_FEATURES = [
  { name: 'Elasticsearch', icon: faDatabase, desc: 'Distributed search & analytics' },
  { name: 'Kibana', icon: faChartLine, desc: 'Visualize & explore data' },
  { name: 'Logstash', icon: faGears, desc: 'Ingest & transform data' },
  { name: 'Elastic Agent', icon: faSatelliteDish, desc: 'Unified data collection' },
  { name: 'Security', icon: faShieldHalved, desc: 'Protect your data' },
  { name: 'Observability', icon: faEye, desc: 'Monitor everything' },
  { name: 'Full-text & Vector Search', icon: faMagnifyingGlass, desc: 'Find anything, fast' },
  { name: 'Community Support', icon: faUsers, desc: 'Global community' },
]

const DEFAULT_ENTERPRISE_FEATURES = [
  { name: 'Enterprise Support', icon: faHeadset, desc: '24/7 expert help' },
  { name: 'Cross Cluster Search', icon: faNetworkWired, desc: 'Global data access' },
  { name: 'Searchable Snapshots', icon: faDatabase, desc: 'Cost-effective searchable storage' },
  { name: 'Agent Builder', icon: faWandMagicSparkles, desc: 'Create custom agents' },
  { name: 'AutoOps', icon: faGears, desc: 'Supercharged Elasticstack Monitoring' },
  { name: 'Workflows', icon: faDiagramProject, desc: 'Orchestrate processes' },
  { name: 'Maps & Geospatial', icon: faMapLocationDot, desc: 'Location intelligence' },
  { name: 'Single Sign-On', icon: faFingerprint, desc: 'Seamless authentication' },
  { name: 'LDAP/AD/SAML', icon: faKey, desc: 'Identity provider integration' },
  { name: 'Field Level Security', icon: faFileShield, desc: 'Granular access control' },
  { name: 'Encryption at Rest', icon: faLock, desc: 'Data protection' },
  { name: 'Auditing', icon: faEye, desc: 'Complete audit trails' },
  { name: 'Machine Learning', icon: faBrain, desc: 'Anomaly detection & more' },
  { name: 'Orchestration (ECE/ECK)', icon: faServer, desc: 'Self-managed deployments' },
  { name: 'Cloud Security Posture', icon: faCloud, desc: 'K8s & cloud monitoring' },
  { name: 'Threat Intelligence', icon: faShieldHalved, desc: 'Proactive defense' },
  { name: 'AI Assistant', icon: faRobot, desc: 'Intelligent assistance' },
  { name: 'AIOps', icon: faBolt, desc: 'Automated operations' },
  { name: 'Reciprocal Rank Fusion', icon: faLayerGroup, desc: 'Hybrid search ranking' },
  { name: 'Semantic Search', icon: faBrain, desc: 'Understand meaning' },
  { name: 'GenAI Integrations', icon: faRobot, desc: 'AI-powered experiences' },
  { name: 'ELSER', icon: faWandMagicSparkles, desc: 'Semantic understanding' },
  { name: 'Integrations', icon: faPlug, desc: '400+ data sources' },
  { name: 'And More...', icon: faShieldHalved, desc: 'Additional features' },
]

// Features moving to a usage-based (VCU) consumption model in an upcoming release.
const DEFAULT_CONSUMPTION_FEATURES = [
  { name: 'On-Prem Jina Models', icon: faMicrochip, desc: 'Self-hosted embed & rerank' },
  { name: 'Workflows', icon: faDiagramProject, desc: 'Orchestrate processes on demand' },
]

// Progressive unlock: each tier includes everything in the tiers below it.
const TIER_RANK = { free: 0, enterprise: 1, consumption: 2 }

const RING_CIRCUMFERENCE = 2 * Math.PI * 56

// Append an 8-bit alpha channel to a 6-digit hex color (e.g. tint backgrounds).
function withAlpha(hex, alpha) {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
}

function useAnimatedCounter(target, duration = 600) {
  const [display, setDisplay] = useState(target)
  const startRef = useRef(target)
  const rafRef = useRef(null)

  useEffect(() => {
    const from = startRef.current
    if (from === target) return

    cancelAnimationFrame(rafRef.current)
    const startTime = performance.now()

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      const current = Math.round(from + (target - from) * eased)
      setDisplay(current)
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        startRef.current = target
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return display
}

function LicensingScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [selectedTier, setSelectedTier] = useState('free')
  const [hoveredFeature, setHoveredFeature] = useState(null)

  const eyebrow = metadata.eyebrow || 'Licensing & Pricing'
  const titlePlain = metadata.titlePlain || 'Pay for Outcomes, '
  const titleAccent = metadata.titleAccent || 'Not Overhead.'
  const subtitle = metadata.subtitle || 'Newer capabilities like Workflows are priced by usage: start with a generous monthly allocation at no cost, and only pay for the executions that succeed.'
  const platformUnlockedLabel = metadata.platformUnlockedLabel || 'Platform Unlocked'
  const noHiddenCostsItems = metadata.noHiddenCostsItems || [
    'No ingestion charges',
    'No per-user fees',
    'No data caps',
  ]
  const selectLicenseLabel = metadata.selectLicenseLabel || 'Select License'
  const freeOpenTierName = metadata.freeOpenTierName || 'Free & Open'
  const enterpriseTierName = metadata.enterpriseTierName || 'Enterprise'
  const consumptionTierName = metadata.consumptionTierName || 'Consumption'
  const freeOpenSectionSubtitle = metadata.freeOpenSectionSubtitle || '— Always included'
  const enterpriseSectionSubtitle = metadata.enterpriseSectionSubtitle || '— Unlock full potential'
  const consumptionSectionSubtitle = metadata.consumptionSectionSubtitle || '— Pay for what you use'
  const consumptionBadgeLabel = metadata.consumptionBadgeLabel || 'Coming Soon'
  const footnoteLine1 = metadata.footnoteLine1 || 'Full feature comparison at'
  const footnoteLine2 = metadata.footnoteLine2 || 'elastic.co/subscriptions'

  const mergeFeatures = (custom, defaults) =>
    (custom || defaults).map((f, i) => ({ ...(defaults[i] || {}), ...f }))

  const freeOpenFeatures = mergeFeatures(metadata.freeOpenFeatures, DEFAULT_FREE_OPEN_FEATURES)
  const enterpriseFeatures = mergeFeatures(metadata.enterpriseFeatures, DEFAULT_ENTERPRISE_FEATURES)
  const consumptionFeatures = mergeFeatures(metadata.consumptionFeatures, DEFAULT_CONSUMPTION_FEATURES)

  // Accent color per tier. Free follows the theme (teal on dark, blue on light);
  // Enterprise is pink and Consumption is yellow across both themes.
  const tierAccent = {
    free: isDark ? '#48EFCF' : '#0B64DD',
    enterprise: '#F04E98',
    consumption: '#FEC514',
  }
  // Readable icon color when sitting on a solid accent chip.
  const tierOnAccent = {
    free: isDark ? '#101C3F' : '#FFFFFF',
    enterprise: '#FFFFFF',
    consumption: '#101C3F',
  }

  const tiers = [
    { key: 'free', name: freeOpenTierName, icon: faCubes },
    { key: 'enterprise', name: enterpriseTierName, icon: faRocket },
    { key: 'consumption', name: consumptionTierName, icon: faGaugeHigh, badge: consumptionBadgeLabel },
  ]

  const selectedRank = TIER_RANK[selectedTier]
  const isTierUnlocked = (tierKey) => TIER_RANK[tierKey] <= selectedRank

  // Illustrative "platform unlocked" gauge value per tier; Consumption exceeds
  // 100% — the ring completes a full lap, then a gradient arc overdraws the
  // start to signal the "supercharged" extra capabilities.
  const TIER_UNLOCK_PCT = { free: 25, enterprise: 100, consumption: 110 }
  const percentage = TIER_UNLOCK_PCT[selectedTier]
  const displayPercentage = useAnimatedCounter(percentage)

  const overflowPct = Math.max(percentage - 100, 0)
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - Math.min(percentage, 100) / 100)
  const overflowArcLength = RING_CIRCUMFERENCE * (overflowPct / 100)
  const selectedAccent = tierAccent[selectedTier]

  const neutralCardClass = isDark
    ? 'border-white/10 bg-white/[0.02] hover:border-white/20'
    : 'border-elastic-dev-blue/10 bg-white hover:border-elastic-dev-blue/20'
  const lockedCardClass = isDark
    ? 'border-white/5 bg-white/[0.01]'
    : 'border-elastic-dev-blue/5 bg-elastic-dev-blue/[0.02]'

  // Single renderer for all three tier grids. `lockable` sections are dimmed and
  // masked with a lock until their tier is selected; the always-on Free tier is
  // rendered with `lockable={false}`.
  const renderFeatureSection = ({ tierKey, features, lockable }) => {
    const accent = tierAccent[tierKey]
    const onAccent = tierOnAccent[tierKey]
    const unlocked = isTierUnlocked(tierKey)

    return (
      <div className="grid grid-cols-4 gap-2">
        {features.map((feature) => {
          const isHovered = unlocked && hoveredFeature === feature.name
          return (
            <div
              key={feature.name}
              role="button"
              className={`p-2 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
                unlocked ? (isHovered ? '' : neutralCardClass) : lockedCardClass
              }`}
              style={{
                opacity: unlocked ? 1 : 0.6,
                zIndex: isHovered ? 20 : undefined,
                ...(isHovered
                  ? { borderColor: accent, backgroundColor: withAlpha(accent, 0.1), transform: 'scale(1.03)' }
                  : {}),
                transition: 'opacity 0.5s ease, border-color 0.3s ease, background-color 0.3s ease, transform 0.2s ease',
              }}
              onMouseEnter={() => unlocked && setHoveredFeature(feature.name)}
              onMouseLeave={() => setHoveredFeature(null)}
              onClick={() => !unlocked && setSelectedTier(tierKey)}
            >
              {lockable && (
                <div
                  className={`absolute inset-0 flex items-center justify-center z-10 ${isDark ? 'bg-elastic-dev-blue/70' : 'bg-white/70'}`}
                  style={{
                    opacity: unlocked ? 0 : 1,
                    pointerEvents: unlocked ? 'none' : 'auto',
                    transition: 'opacity 0.5s ease',
                  }}
                >
                  <FontAwesomeIcon icon={faLock} className="text-base" style={{ color: withAlpha(accent, 0.7) }} />
                </div>
              )}

              <div className="flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300"
                  style={{ backgroundColor: isHovered ? accent : withAlpha(accent, 0.2) }}
                >
                  <FontAwesomeIcon
                    icon={feature.icon}
                    className="text-xs transition-colors duration-300"
                    style={{ color: isHovered ? onAccent : accent }}
                  />
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                    {feature.name}
                  </div>
                  <div className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                    {feature.desc}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const renderSectionHeader = ({ tierKey, name, subtitle: sectionSubtitle, badge }) => (
    <div className="flex items-center gap-2 mb-2 flex-shrink-0">
      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tierAccent[tierKey] }} />
      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{name}</span>
      <span className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{sectionSubtitle}</span>
      {badge && (
        <span
          className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full"
          style={{ color: tierOnAccent[tierKey], backgroundColor: tierAccent[tierKey] }}
        >
          {badge}
        </span>
      )}
    </div>
  )

  return (
    <div className="h-full w-full pt-4 pb-3 overflow-hidden">
      <div className="max-w-7xl px-4 mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePlain}
          titleAccent={titleAccent}
          subtitle={subtitle}
        />

        {/* Main Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - License Toggle */}
          <div className="w-64 flex flex-col gap-3 flex-shrink-0">
            {/* Power Gauge */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'}`}>
              <div className="text-center mb-3">
                <div className="text-4xl font-bold tabular-nums" style={{ color: selectedAccent }}>
                  {displayPercentage}%
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  {platformUnlockedLabel}
                </div>
              </div>

              {/* Progress Ring */}
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  <defs>
                    <linearGradient id="gauge-overflow-gradient" x1="0" y1="0" x2="128" y2="128" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stopColor="#FEC514" />
                      <stop offset="100%" stopColor="#F04E98" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)'}
                    strokeWidth="12"
                  />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke={selectedAccent}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease' }}
                  />
                  {/* Second-lap overdraw arc for tiers beyond 100% */}
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke="url(#gauge-overflow-gradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={`${Math.max(overflowArcLength, 0.001)} ${RING_CIRCUMFERENCE}`}
                    style={{
                      opacity: overflowPct > 0 ? 1 : 0,
                      filter: overflowPct > 0 ? 'drop-shadow(0 0 6px rgba(254,197,20,0.6))' : 'none',
                      transition: 'stroke-dasharray 0.6s cubic-bezier(0.4,0,0.2,1) 0.45s, opacity 0.3s ease 0.45s',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={selectedTier === 'free' ? faLock : faLockOpen}
                    className="text-xl transition-all duration-500"
                    style={{ color: selectedTier === 'free' ? (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(16,28,63,0.4)') : selectedAccent }}
                  />
                </div>
              </div>

              {/* No Hidden Costs */}
              <div className="space-y-1.5">
                {noHiddenCostsItems.map((text) => (
                  <div key={text} className={`flex items-center gap-2 text-xs ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                    <FontAwesomeIcon icon={faInfinity} className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* License Toggle */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'}`}>
              <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                {selectLicenseLabel}
              </div>

              <div className="space-y-2">
                {tiers.map((tier) => {
                  const active = selectedTier === tier.key
                  const accent = tierAccent[tier.key]
                  return (
                    <button
                      key={tier.key}
                      onClick={() => setSelectedTier(tier.key)}
                      className={`w-full p-3 rounded-xl border-2 transition-all duration-300 text-left ${
                        active ? '' : isDark ? 'border-white/10 hover:border-white/20' : 'border-elastic-dev-blue/10 hover:border-elastic-dev-blue/20'
                      }`}
                      style={active ? { borderColor: accent, backgroundColor: withAlpha(accent, 0.1) } : {}}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300"
                          style={{ backgroundColor: active ? accent : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}
                        >
                          <FontAwesomeIcon
                            icon={tier.icon}
                            className="transition-colors duration-300"
                            style={{ color: active ? tierOnAccent[tier.key] : isDark ? 'rgba(255,255,255,0.6)' : 'rgba(16,28,63,0.6)' }}
                          />
                        </div>
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <span
                            className={`font-bold transition-colors duration-300 ${!active ? (isDark ? 'text-white' : 'text-elastic-dev-blue') : ''}`}
                            style={active ? { color: accent } : {}}
                          >
                            {tier.name}
                          </span>
                          {tier.badge && (
                            <span
                              className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: tierOnAccent[tier.key], backgroundColor: accent }}
                            >
                              {tier.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footnote */}
            <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-white/[0.02] text-white/60' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/60'}`}>
              <p>{footnoteLine1}</p>
              <p className={`font-medium ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{footnoteLine2}</p>
            </div>
          </div>

          {/* Right Panel - Feature Grid */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Free & Open Section */}
            <div className="flex-shrink-0">
              {renderSectionHeader({ tierKey: 'free', name: freeOpenTierName, subtitle: freeOpenSectionSubtitle })}
              {renderFeatureSection({ tierKey: 'free', features: freeOpenFeatures, lockable: false })}
            </div>

            {/* Enterprise Section */}
            <div className="flex-shrink-0 flex flex-col">
              {renderSectionHeader({ tierKey: 'enterprise', name: enterpriseTierName, subtitle: enterpriseSectionSubtitle })}
              {renderFeatureSection({ tierKey: 'enterprise', features: enterpriseFeatures, lockable: true })}
            </div>

            {/* Consumption Section */}
            <div className="flex-shrink-0">
              {renderSectionHeader({ tierKey: 'consumption', name: consumptionTierName, subtitle: consumptionSectionSubtitle, badge: consumptionBadgeLabel })}
              {renderFeatureSection({ tierKey: 'consumption', features: consumptionFeatures, lockable: true })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LicensingScene
