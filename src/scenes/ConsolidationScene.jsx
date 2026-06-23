import { animate } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faLayerGroup,
  faPlug,
  faCircleNodes,
  faShield,
  faChartLine,
  faMagnifyingGlass,
  faBrain,
  faDollarSign,
  faClock,
  faDatabase,
  faExclamationTriangle,
  faCheck,
  faArrowRight,
  faBolt,
  faGear,
  faArrowsRotate
} from '@fortawesome/free-solid-svg-icons'

// All the scattered tools in "before" state (default — overridable via scene settings)
const allToolsDefault = [
  { name: 'Splunk', category: 'SIEM', type: 'consolidate' },
  { name: 'QRadar', category: 'SIEM', type: 'consolidate' },
  { name: 'Datadog', category: 'APM', type: 'consolidate' },
  { name: 'CrowdStrike', category: 'EDR', type: 'consolidate' },
  { name: 'Snowflake', category: 'Data', type: 'consolidate' },
  { name: 'Pinecone', category: 'Vector', type: 'consolidate' },
  { name: 'Palo Alto', category: 'Firewall', type: 'integrate' },
  { name: 'Okta', category: 'Identity', type: 'integrate' },
  { name: 'ServiceNow', category: 'ITSM', type: 'integrate' },
  { name: 'Tines', category: 'SOAR', type: 'integrate' },
  { name: 'Zscaler', category: 'ZeroTrust', type: 'integrate' },
  { name: 'Databricks', category: 'Analytics', type: 'integrate' },
]

// Scattered positions for the chaotic "before" state. Laid out as a loose
// 4-column x 3-row stagger (with jitter + rotation) so the cards read as
// disorganized while still never overlapping at their scaled-up size.
const chaosPositions = [
  { x: '5%',  y: '9%',  rotate: -8 },     // Splunk
  { x: '30%', y: '5%',  rotate: 6 },      // QRadar
  { x: '54%', y: '10%', rotate: -5 },     // Datadog
  { x: '77%', y: '6%',  rotate: 8 },      // CrowdStrike
  { x: '7%',  y: '37%', rotate: 5 },      // Snowflake
  { x: '31%', y: '33%', rotate: -10 },    // Pinecone
  { x: '54%', y: '38%', rotate: 7 },      // Palo Alto
  { x: '76%', y: '34%', rotate: -6 },     // Okta
  { x: '5%',  y: '65%', rotate: 10 },     // ServiceNow
  { x: '30%', y: '61%', rotate: -12 },    // Tines
  { x: '53%', y: '66%', rotate: -5 },     // Zscaler
  { x: '75%', y: '62%', rotate: 8 },      // Databricks
]

const solutions = [
  { id: 'elasticsearch', label: 'Elasticsearch', tagline: 'Build Your Own', color: '#FEC514' },
  { id: 'observability', label: 'Observability', tagline: 'Out-of-the-Box', color: '#F04E98' },
  { id: 'security', label: 'Security', tagline: 'Out-of-the-Box', color: '#FF957D' },
]

const platformCapabilities = [
  { id: 'ingest', label: 'Ingestion', icon: faBolt },
  { id: 'process', label: 'Processing', icon: faGear },
  { id: 'storage', label: 'Storage', icon: faDatabase, core: true },
  { id: 'search', label: 'Search', icon: faMagnifyingGlass, core: true },
  { id: 'ai', label: 'AI & ML', icon: faBrain, core: true },
  { id: 'viz', label: 'Visualization', icon: faChartLine },
  { id: 'workflow', label: 'Automation', icon: faArrowsRotate },
]

const beforePainPoints = [
  'Multiple licenses & contracts',
  'Data silos & duplication',
  'Context switching',
  'Integration overhead',
  'Inconsistent alerting',
]

const afterBenefits = [
  { icon: faDollarSign, text: 'Reduced licensing costs', color: '#48EFCF' },
  { icon: faClock, text: 'Faster triage & response', color: '#0B64DD' },
  { icon: faLayerGroup, text: 'Unified data layer', color: '#F04E98' },
  { icon: faDatabase, text: 'No data duplication', color: '#FEC514' },
  { icon: faCircleNodes, text: 'Shared context', color: '#FF957D' },
]

function ConsolidationScene({ tools: toolsProp, metadata = {} } = {}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const allTools = toolsProp || allToolsDefault

  const eyebrow        = metadata.eyebrow        || 'Unified Platform'
  const headingPlain   = metadata.headingPlain   || 'Consolidate Point Solutions, '
  const headingAccent  = metadata.headingAccent  || 'Centralize Data Workflows'
  const subtitle       = metadata.subtitle       || 'Comprehensive capabilities to replace disparate tools while integrating with your broader ecosystem'
  const beforeTitle    = metadata.beforeTitle    || 'Tool Sprawl'
  const painPoints     = metadata.painPoints     || beforePainPoints
  const beforeStatValue  = metadata.beforeStatValue  || '76+'
  const beforeStatLabel  = metadata.beforeStatLabel  || 'Avg. security tools per org'
  const beforeStatSource = metadata.beforeStatSource || 'IBM / Palo Alto Networks'
  const chaosLabel     = metadata.chaosLabel     || 'Disconnected tools • Duplicated data • Fragmented workflows'
  const afterTitle     = metadata.afterTitle     || 'With Elastic'
  const benefitTexts   = metadata.benefitTexts   || afterBenefits.map(b => b.text)
  const afterStatValue = metadata.afterStatValue || '3-5'
  const afterStatLabel = metadata.afterStatLabel || 'Vendors eliminated on average'

  const resolvedAfterBenefits = afterBenefits.map((b, i) => ({
    ...b,
    text: benefitTexts[i] ?? b.text,
  }))
  const [isConsolidated, setIsConsolidated] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const toolRefs = useRef([])
  const floatAnimsRef = useRef([])
  const vizRef = useRef(null)
  const consolidatedRef = useRef(null)

  // Floating effect on "before" state
  useEffect(() => {
    if (isConsolidated || isAnimating) return
    floatAnimsRef.current = toolRefs.current
      .filter(Boolean)
      .map((el, i) => animate(el, {
        translateY: [-6, 6],
        duration: 2400 + (i * 317) % 1400,
        loop: true,
        alternate: true,
        ease: 'inOutSine',
        delay: i * 160,
      }))
    return () => floatAnimsRef.current.forEach(a => a.pause())
  }, [isConsolidated, isAnimating])

  // Entrance animation for consolidated view
  useEffect(() => {
    if (!isConsolidated || !consolidatedRef.current) return
    const children = Array.from(consolidatedRef.current.children)
    children.forEach(el => { el.style.opacity = '0' })
    animate(children, {
      opacity: [0, 1],
      duration: 450,
      ease: 'outQuad',
      delay: (_, i) => i * 90,
    })
  }, [isConsolidated])

  const handleConsolidate = () => {
    if (isAnimating) return

    if (isConsolidated) {
      setIsConsolidated(false)
      return
    }

    // Stop floating
    floatAnimsRef.current.forEach(a => a.pause())
    setIsAnimating(true)

    const tools = toolRefs.current.filter(Boolean)
    const vizEl = vizRef.current
    const vizRect = vizEl.getBoundingClientRect()
    const centerX = vizRect.width / 2
    const centerY = vizRect.height / 2

    // Each card converges toward center, scales and fades out
    tools.forEach((el, i) => {
      const elRect = el.getBoundingClientRect()
      const dx = centerX - (elRect.left - vizRect.left) - elRect.width / 2
      const dy = centerY - (elRect.top - vizRect.top) - elRect.height / 2
      animate(el, {
        translateX: [0, dx],
        translateY: [0, dy],
        scale: [1, 0],
        opacity: [1, 0],
        duration: 480,
        ease: 'inQuad',
        delay: i * 35,
      })
    })

    const totalDuration = 480 + tools.length * 35 + 60
    setTimeout(() => {
      tools.forEach(el => { if (el) { el.style.transform = ''; el.style.opacity = '' } })
      setIsConsolidated(true)
      setIsAnimating(false)
    }, totalDuration)
  }

  return (
    <div className="scene !py-4 w-full h-full">
      <div className="max-w-[95%] mx-auto w-full h-full flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={headingPlain}
          titleAccent={headingAccent}
          subtitle={subtitle}
          titleMaxWidth="max-w-4xl"
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Top row: sidebar + visualization */}
          <div className="flex-1 flex gap-6 min-h-0 justify-center">
            {/* Left sidebar - changes based on state */}
            <div 
              className="w-64 flex flex-col gap-3 flex-shrink-0"
            >
            
              {!isConsolidated ? (
                <div
                  key="before-sidebar"
                  className={`flex-1 p-4 rounded-2xl border ${isDark ? 'border-red-500/30 bg-red-500/5' : 'border-elastic-dev-blue/20 bg-elastic-dev-blue/[0.04]'}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faExclamationTriangle} className={isDark ? 'text-red-400' : 'text-elastic-blue'} />
                    <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      {beforeTitle}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {painPoints.map((point, i) => (
                      <div
                        key={point}
                        className="flex items-center gap-2"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-red-400' : 'bg-elastic-dev-blue'}`} />
                        <span className={`text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                          {point}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
                    <div className={`text-3xl font-bold ${isDark ? 'text-red-400' : 'text-elastic-blue'}`}>{beforeStatValue}</div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                      {beforeStatLabel}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                      {beforeStatSource}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  key="after-sidebar"
                  className={`flex-1 p-4 rounded-2xl border ${isDark ? 'border-elastic-teal/30 bg-elastic-teal/5' : 'border-elastic-blue/20 bg-elastic-blue/[0.04]'}`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faCheck} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
                    <span className={`font-bold text-lg ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      {afterTitle}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {resolvedAfterBenefits.map((benefit, i) => (
                      <div
                        key={benefit.text}
                        className="flex items-center gap-3"
                      >
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: isDark ? `${benefit.color}20` : 'rgba(11,100,221,0.08)' }}
                        >
                          <FontAwesomeIcon icon={benefit.icon} style={{ color: isDark ? benefit.color : 'rgb(11,100,221)' }} className="text-sm" />
                        </div>
                        <span className={`text-sm ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>
                          {benefit.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-6 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
                    <div className={`text-3xl font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{afterStatValue}</div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                      {afterStatLabel}
                    </div>
                  </div>
                </div>
              )}
            

            {/* Toggle button */}
            <button
              onClick={handleConsolidate}
              className={`p-4 rounded-2xl font-bold text-lg transition-all ${
                isConsolidated
                  ? 'bg-elastic-blue text-white hover:bg-elastic-blue/80'
                  : isDark
                    ? 'bg-elastic-teal text-elastic-dev-blue hover:bg-elastic-teal/80'
                    : 'bg-elastic-blue text-white hover:bg-elastic-blue/80'
              }`}
            >
              {isConsolidated ? '← Show Before' : 'Consolidate →'}
            </button>
          </div>

          {/* Center - Visualization */}
          <div
            ref={vizRef}
            className={`flex-1 rounded-2xl border p-6 relative overflow-hidden ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'}`}
          >
            {/* Before state - Chaotic scattered tools */}
            
              {!isConsolidated && (
                <div 
                  className="absolute inset-0 p-6"
                >
                  {allTools.map((tool, i) => (
                    <div
                      key={tool.name}
                      ref={el => toolRefs.current[i] = el}
                      className={`absolute px-4 py-3 rounded-xl border-2 ${
                        isDark ? 'bg-elastic-dev-blue/80' : 'bg-white/90'
                      } ${
                        isDark
                          ? tool.type === 'consolidate' ? 'border-red-400/50' : 'border-orange-400/50'
                          : 'border-elastic-blue/50'
                      }`}
                      style={{
                        left: chaosPositions[i].x,
                        top: chaosPositions[i].y,
                        rotate: `${chaosPositions[i].rotate}deg`,
                      }}
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        rotate: chaosPositions[i].rotate 
                      }}
                      animate={{ 
                        opacity: 1, 
                        scale: 1,
                        rotate: chaosPositions[i].rotate,
                        y: [0, -5, 0, 5, 0],
                      }}
                      transition={{ 
                        delay: 0.2 + i * 0.05,
                        y: {
                          duration: 3 + Math.random() * 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }
                      }}
                    >
                      <div className={`font-semibold text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                        {tool.name}
                      </div>
                      <div className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                        {tool.category}
                      </div>
                    </div>
                  ))}
                  
                  {/* Chaos indicator */}
                  <div
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center"
                  >
                    <div className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                      {chaosLabel}
                    </div>
                  </div>
                </div>
              )}
            

            {/* After state - Organized with Elastic at center */}
            
              {isConsolidated && (
                <div
                  ref={consolidatedRef}
                  className="absolute inset-0 p-6 flex items-center justify-center gap-4"
                >
                  {/* Consolidated tools - left side */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className="text-base font-bold text-elastic-blue mb-2 text-center">Consolidated</div>
                    {allTools.filter(t => t.type === 'consolidate').map((tool, i) => (
                      <div
                        key={tool.name}
                        className={`px-4 py-3 rounded-xl border-2 border-elastic-blue/30 ${
                          isDark ? 'bg-elastic-blue/10' : 'bg-elastic-blue/5'
                        }`}
                      >
                        <div className={`font-medium text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                          {tool.name}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Arrows flowing in */}
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon icon={faArrowRight} className="text-3xl text-elastic-blue" />
                  </div>

                  {/* Platform Stack - Similar to UnifiedStrategyScene */}
                  <div
                    className="flex flex-col items-center flex-1 min-w-0 max-w-[760px]"
                  >
                    {/* Solutions Row */}
                    <div className="grid grid-cols-3 gap-3 mb-4 w-full">
                      {solutions.map((solution, index) => (
                        <div
                          key={solution.id}
                          className={`relative px-5 py-4 rounded-xl border-2 text-center ${
                            isDark ? 'bg-white/[0.03]' : 'bg-white/90'
                          }`}
                          style={{ 
                            borderColor: solution.color,
                            borderTopWidth: '4px',
                          }}
                        >
                          <div className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                            {solution.tagline}
                          </div>
                          <div className={`font-semibold text-lg ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                            {solution.label}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Main Platform Box */}
                    <div
                      className={`relative p-5 rounded-2xl border-2 w-full ${
                        isDark 
                          ? 'bg-elastic-dev-blue/50 border-elastic-blue/30' 
                          : 'bg-white border-elastic-blue/20 shadow-lg'
                      }`}
                    >
                      <div className={`text-center text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                        Search AI Platform
                      </div>

                      {/* Capabilities Row */}
                      <div className="grid grid-cols-7 gap-2 items-end">
                        {platformCapabilities.map((cap, index) => (
                          <div
                            key={cap.id}
                            className={`relative px-1.5 py-3 rounded-lg text-center ${
                              cap.core 
                                ? isDark 
                                  ? 'bg-elastic-blue/30 border border-elastic-blue/50' 
                                  : 'bg-elastic-blue/10 border border-elastic-blue/30'
                                : isDark 
                                  ? 'bg-white/[0.05] border border-white/10' 
                                  : 'bg-elastic-light-grey border border-elastic-dev-blue/10'
                            }`}
                          >
                            <div className={`text-xl mb-1.5 ${cap.core ? (isDark ? 'text-white' : 'text-elastic-blue') : (isDark ? 'text-white/60' : 'text-elastic-dev-blue/60')}`}>
                              <FontAwesomeIcon icon={cap.icon} />
                            </div>
                            <div className={`text-xs leading-tight break-words hyphens-auto ${
                              cap.core 
                                ? isDark ? 'text-white font-medium' : 'text-elastic-blue font-medium'
                                : isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'
                            }`}>
                              {cap.label}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Search AI Lake Badge */}
                      <div className="grid grid-cols-7 gap-2 mt-3">
                        <div className="col-span-2" />
                        <div
                          className="col-span-3"
                        >
                          <div className={`w-full py-2 rounded-full text-sm font-medium text-center ${
                            isDark 
                              ? 'bg-elastic-teal/20 text-elastic-teal border border-elastic-teal/30' 
                              : 'bg-elastic-blue/10 text-elastic-blue border border-elastic-blue/30'
                          }`}>
                            Search AI Lake
                          </div>
                        </div>
                        <div className="col-span-2" />
                      </div>
                    </div>

                    {/* Deployment Options */}
                    <div
                      className="flex justify-center gap-3 mt-4"
                    >
                      {[
                        { label: 'Self-Managed', desc: 'Full control' },
                        { label: 'Elastic Cloud', desc: 'AWS, GCP, Azure' },
                        { label: 'Serverless', desc: 'Zero ops' },
                      ].map((option, index) => (
                        <div
                          key={option.label}
                          className={`px-4 py-3 rounded-xl border text-center ${
                            isDark 
                              ? 'bg-white/[0.02] border-white/10' 
                              : 'bg-white/60 border-elastic-dev-blue/10'
                          }`}
                        >
                          <div className={`text-base font-medium ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                            {option.label}
                          </div>
                          <div className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                            {option.desc}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Platform Capabilities legend */}
                    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 mt-4 pt-3 border-t border-white/10 w-full">
                      {[
                        { label: 'SIEM & Security Analytics', color: '#FF957D' },
                        { label: 'Observability & APM', color: '#F04E98' },
                        { label: 'Enterprise Search', color: '#FEC514' },
                        { label: 'AI-Driven Detection', color: '#48EFCF' },
                        { label: 'Unified Data Layer', color: '#0B64DD' },
                      ].map((cap) => (
                        <div key={cap.label} className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cap.color }} />
                          <span className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                            {cap.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Arrows flowing out */}
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon icon={faArrowRight} className={`text-3xl -scale-x-100 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                  </div>

                  {/* Integrated tools - right side */}
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <div className={`text-base font-bold mb-2 text-center ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Integrated</div>
                    {allTools.filter(t => t.type === 'integrate').map((tool, i) => (
                      <div
                        key={tool.name}
                        className={`px-4 py-3 rounded-xl border-2 ${
                          isDark ? 'border-elastic-teal/30 bg-elastic-teal/10' : 'border-elastic-blue/30 bg-elastic-blue/5'
                        }`}
                      >
                        <div className={`font-medium text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                          {tool.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            
          </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default ConsolidationScene
