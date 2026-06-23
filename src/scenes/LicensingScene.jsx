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
  faDiagramProject
} from '@fortawesome/free-solid-svg-icons'

const freeOpenFeatures = [
  { name: 'Elasticsearch', icon: faDatabase, desc: 'Distributed search & analytics' },
  { name: 'Kibana', icon: faChartLine, desc: 'Visualize & explore data' },
  { name: 'Logstash', icon: faGears, desc: 'Ingest & transform data' },
  { name: 'Elastic Agent', icon: faSatelliteDish, desc: 'Unified data collection' },
  { name: 'Security', icon: faShieldHalved, desc: 'Protect your data' },
  { name: 'Observability', icon: faEye, desc: 'Monitor everything' },
  { name: 'Full-text & Vector Search', icon: faMagnifyingGlass, desc: 'Find anything, fast' },
  { name: 'Community Support', icon: faUsers, desc: 'Global community' },
]

const enterpriseFeatures = [
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

const RING_CIRCUMFERENCE = 2 * Math.PI * 56

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

function LicensingScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [isEnterprise, setIsEnterprise] = useState(false)
  const [hoveredFeature, setHoveredFeature] = useState(null)

  const totalFeatures = freeOpenFeatures.length + enterpriseFeatures.length
  const unlockedFeatures = isEnterprise ? totalFeatures : freeOpenFeatures.length
  const percentage = Math.round((unlockedFeatures / totalFeatures) * 100)
  const displayPercentage = useAnimatedCounter(percentage)

  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - percentage / 100)

  return (
    <div className="h-full w-full pt-4 pb-3 overflow-hidden">
      <div className="max-w-7xl px-4 mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow="Licensing"
          titlePlain="One License. "
          titleAccent="Full Power."
          subtitle="One software SKU. No add-ons. No data caps."
        />

        {/* Main Content */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left Panel - License Toggle */}
          <div className="w-64 flex flex-col gap-3 flex-shrink-0">
            {/* Power Gauge */}
            <div className={`p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'}`}>
              <div className="text-center mb-3">
                <div className={`text-4xl font-bold tabular-nums ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                  {displayPercentage}%
                </div>
                <div className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Platform Unlocked
                </div>
              </div>

              {/* Progress Ring */}
              <div className="relative w-24 h-24 mx-auto mb-3">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 128 128">
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)'}
                    strokeWidth="12"
                  />
                  <circle
                    cx="64" cy="64" r="56"
                    fill="none"
                    stroke="url(#licenseGradient)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray={RING_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                  />
                  <defs>
                    <linearGradient id="licenseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor={isDark ? '#48EFCF' : '#0B64DD'} />
                      <stop offset="100%" stopColor={isDark ? '#48EFCF' : '#0B64DD'} />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <FontAwesomeIcon
                    icon={isEnterprise ? faLockOpen : faLock}
                    className={`text-xl transition-all duration-500 ${
                      isEnterprise
                        ? isDark ? 'text-elastic-teal' : 'text-elastic-blue'
                        : isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'
                    }`}
                  />
                </div>
              </div>

              {/* No Hidden Costs */}
              <div className="space-y-1.5">
                {['No ingestion charges', 'No per-user fees', 'No data caps'].map((text) => (
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
                Select License
              </div>

              <button
                onClick={() => setIsEnterprise(false)}
                className={`w-full p-3 rounded-xl mb-2 border-2 transition-all duration-300 text-left ${
                  !isEnterprise
                    ? isDark ? 'border-elastic-teal bg-elastic-teal/10' : 'border-elastic-blue bg-elastic-blue/10'
                    : isDark ? 'border-white/10 hover:border-white/20' : 'border-elastic-dev-blue/10 hover:border-elastic-dev-blue/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    !isEnterprise ? (isDark ? 'bg-elastic-teal' : 'bg-elastic-blue') : isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'
                  }`}>
                    <FontAwesomeIcon icon={faCubes} className={`transition-colors duration-300 ${
                      !isEnterprise ? (isDark ? 'text-elastic-dev-blue' : 'text-white') : isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                    }`} />
                  </div>
                  <div className={`font-bold transition-colors duration-300 ${
                    !isEnterprise ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : isDark ? 'text-white' : 'text-elastic-dev-blue'
                  }`}>
                    Free & Open
                  </div>
                </div>
              </button>

              <button
                onClick={() => setIsEnterprise(true)}
                className={`w-full p-3 rounded-xl border-2 transition-all duration-300 text-left ${
                  isEnterprise
                    ? 'border-elastic-pink bg-elastic-pink/10'
                    : isDark ? 'border-white/10 hover:border-white/20' : 'border-elastic-dev-blue/10 hover:border-elastic-dev-blue/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                    isEnterprise ? 'bg-elastic-pink' : isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'
                  }`}>
                    <FontAwesomeIcon icon={faRocket} className={`transition-colors duration-300 ${
                      isEnterprise ? 'text-white' : isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'
                    }`} />
                  </div>
                  <div className={`font-bold transition-colors duration-300 ${
                    isEnterprise ? 'text-elastic-pink' : isDark ? 'text-white' : 'text-elastic-dev-blue'
                  }`}>
                    Enterprise
                  </div>
                </div>
              </button>
            </div>

            {/* Footnote */}
            <div className={`p-3 rounded-xl text-xs ${isDark ? 'bg-white/[0.02] text-white/60' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/60'}`}>
              <p>Full feature comparison at</p>
              <p className={`font-medium ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>elastic.co/subscriptions</p>
            </div>
          </div>

          {/* Right Panel - Feature Grid */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            {/* Free & Open Section */}
            <div className="flex-shrink-0">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`} />
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Free & Open</span>
                <span className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>— Always included</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {freeOpenFeatures.map((feature) => (
                  <div
                    key={feature.name}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-200 ${
                      hoveredFeature === feature.name
                        ? isDark ? 'border-elastic-teal bg-elastic-teal/10 scale-105' : 'border-elastic-blue bg-elastic-blue/10 scale-105'
                        : isDark ? 'border-white/10 bg-white/[0.02] hover:border-white/20' : 'border-elastic-dev-blue/10 bg-white hover:border-elastic-dev-blue/20'
                    }`}
                    onMouseEnter={() => setHoveredFeature(feature.name)}
                    onMouseLeave={() => setHoveredFeature(null)}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                        isDark
                          ? hoveredFeature === feature.name ? 'bg-elastic-teal' : 'bg-elastic-teal/20'
                          : hoveredFeature === feature.name ? 'bg-elastic-blue' : 'bg-elastic-blue/20'
                      }`}>
                        <FontAwesomeIcon
                          icon={feature.icon}
                          className={`text-xs transition-colors duration-200 ${
                            isDark
                              ? hoveredFeature === feature.name ? 'text-elastic-dev-blue' : 'text-elastic-teal'
                              : hoveredFeature === feature.name ? 'text-white' : 'text-elastic-blue'
                          }`}
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
                ))}
              </div>
            </div>

            {/* Enterprise Section */}
            <div className="flex-1 min-h-0 flex flex-col">
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-elastic-pink" />
                <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Enterprise</span>
                <span className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>— Unlock full potential</span>
              </div>
              <div className="grid grid-cols-4 gap-2 overflow-hidden">
                {enterpriseFeatures.map((feature) => (
                  <div
                    key={feature.name}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${
                      isEnterprise
                        ? hoveredFeature === feature.name
                          ? 'border-elastic-pink bg-elastic-pink/10 scale-105'
                          : isDark ? 'border-white/10 bg-white/[0.02] hover:border-white/20' : 'border-elastic-dev-blue/10 bg-white hover:border-elastic-dev-blue/20'
                        : isDark ? 'border-white/5 bg-white/[0.01]' : 'border-elastic-dev-blue/5 bg-elastic-dev-blue/[0.02]'
                    }`}
                    style={{
                      opacity: isEnterprise ? 1 : 0.6,
                      transition: 'opacity 0.5s ease, border-color 0.3s ease, background-color 0.3s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={() => isEnterprise && setHoveredFeature(feature.name)}
                    onMouseLeave={() => setHoveredFeature(null)}
                    onClick={() => !isEnterprise && setIsEnterprise(true)}
                  >
                    {/* Solid locked mask */}
                    <div
                      className={`absolute inset-0 flex items-center justify-center z-10 ${isDark ? 'bg-elastic-dev-blue/70' : 'bg-white/70'}`}
                      style={{
                        opacity: isEnterprise ? 0 : 1,
                        pointerEvents: isEnterprise ? 'none' : 'auto',
                        transition: 'opacity 0.5s ease',
                      }}
                    >
                      <FontAwesomeIcon icon={faLock} className={`text-base ${isDark ? 'text-elastic-pink/70' : 'text-elastic-blue/60'}`} />
                    </div>

                    <div className="flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                        isEnterprise && hoveredFeature === feature.name ? 'bg-elastic-pink' : 'bg-elastic-pink/20'
                      }`}>
                        <FontAwesomeIcon
                          icon={feature.icon}
                          className={`text-xs transition-colors duration-300 ${
                            isEnterprise && hoveredFeature === feature.name ? 'text-white' : 'text-elastic-pink'
                          }`}
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
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LicensingScene
