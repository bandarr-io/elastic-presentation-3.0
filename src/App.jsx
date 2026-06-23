import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faMagnifyingGlass, faGear, faMagnifyingGlass as faSearch, faChartColumn, faBrain, faDna, faShield, faClock, faRocket, faCoins, faForwardStep, faChartLine, faPlay, faPause, faRotateRight, faChevronRight, faChevronLeft, faBolt, faLayerGroup, faTimes, faCircleNodes } from '@fortawesome/free-solid-svg-icons'
import SceneSettings, { useSceneConfiguration } from './components/SceneSettings'
import SceneHeader from './components/SceneHeader'

import TeamScene from './scenes/TeamScene'
import UnifiedStrategyScene from './scenes/UnifiedStrategyScene'
import DataExplosionSceneV2 from './scenes/DataExplosionSceneV2'
import CrossClusterScene from './scenes/CrossClusterScene'
import SecurityScene from './scenes/SecurityScene'
import SchemaScene from './scenes/SchemaScene'
import AccessControlSceneDev from './scenes/AccessControlSceneDev'
import DataMeshScene from './scenes/DataMeshScene'
import LicensingScene from './scenes/LicensingScene'
import DataTieringScene from './scenes/DataTieringScene'
import ConsolidationScene from './scenes/ConsolidationScene'
import ESQLScene from './scenes/ESQLScene'
import ServicesScene from './scenes/ServicesScene'
import NextStepsScene from './scenes/NextStepsScene'
import PanelScene from './scenes/PanelScene'
import CurrentArchitectureScene from './scenes/CurrentArchitectureScene'
import LogsDBScene from './scenes/LogsDBScene'
import AIAssistantScene from './scenes/AIAssistantScene'
import CustomerArchitectScene from './scenes/CustomerArchitectScene'
import SecurityNarrativeVisualScene from './scenes/SecurityNarrativeVisualScene'
import SecurityUseCasesScene from './scenes/SecurityUseCasesScene'
import ElasticValueScene from './scenes/ElasticValueScene'
import PlatformOperationsScene from './scenes/PlatformOperationsScene'
import ValueByTeamScene from './scenes/ValueByTeamScene'
import { DEFAULT_AGENDA_ITEMS } from './data/agendaDefaults'

// Hero Scene with typing animation
const HeroScene = ({ metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [displayText, setDisplayText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [showCursor, setShowCursor] = useState(true)
  const [isTypingComplete, setIsTypingComplete] = useState(false)
  // Default to the revealed banner for live delivery; opt into the typing intro
  // via metadata.startWithSearch (kept as an optional easter egg).
  const [showBanner, setShowBanner] = useState(!metadata.startWithSearch)
  
  // Use metadata values or defaults
  const typingText = metadata.typingText || "The Elastic Search AI Platform"
  const bannerTitle = metadata.bannerTitle || "The Elastic Search AI Platform:"
  const bannerHighlight = metadata.bannerHighlight || "Transforming Data into Action"
  const bannerSubtitle = metadata.bannerSubtitle || "Unleash the Power of Real-Time Insights, Scale, and Innovation"
  
  const fullText = typingText

  // Handle search bar click
  const handleSearchBarClick = () => {
    if (!isClicked && !isTyping) {
      setIsClicked(true)
      // Wait 1 second before starting to type
      setTimeout(() => {
        setIsTyping(true)
      }, 1000)
    }
  }

  // Handle search button click (when typing is complete)
  const handleSearchButtonClick = () => {
    if (isTypingComplete) {
      setShowBanner(true)
    }
  }

  // Typing effect
  useEffect(() => {
    if (!isTyping) return

    if (displayText.length < fullText.length) {
      const timer = setTimeout(() => {
        setDisplayText(fullText.slice(0, displayText.length + 1))
      }, 80) // Type speed: 80ms per character

      return () => clearTimeout(timer)
    } else if (displayText.length === fullText.length && !isTypingComplete) {
      // Typing is complete
      setIsTypingComplete(true)
    }
  }, [displayText, isTyping, fullText, isTypingComplete])

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-16 md:px-24">
      {!showBanner ? (
        // Search Bar with Typing Animation
        <div className="w-full max-w-4xl mb-8">
          {/* Eyebrow text above search bar */}
          <p className={`text-base font-semibold uppercase tracking-eyebrow mb-4 text-center ${
            isDark ? 'text-elastic-teal' : 'text-elastic-blue'
          }`}>
            Click search to discover
          </p>

          <div
            onClick={handleSearchBarClick}
            className={`relative cursor-text transition-all duration-300 ${
              isClicked ? 'scale-[1.01]' : ''
            }`}
          >
            <div className={`relative flex items-center gap-4 px-8 py-6 rounded-full border-2 transition-all duration-300 ${
              isDark
                ? 'bg-white/[0.05] border-white/10 hover:border-elastic-teal/50'
                : 'bg-white border-elastic-dev-blue/10 hover:border-elastic-blue/30 shadow-lg'
            }`}>
              {/* Typing Text */}
              <div className={`flex-1 text-3xl font-semibold ${
                isDark ? 'text-white' : 'text-elastic-dark-ink'
              }`}>
                {displayText}
                {/* Blinking cursor */}
                {isClicked && (
                  <span className={`ml-1 inline-block w-0.5 h-8 ${
                    isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'
                  } ${showCursor ? 'opacity-100' : 'opacity-0'}`} style={{ verticalAlign: 'middle' }} />
                )}
              </div>

              {/* Search Icon */}
              <button
                onClick={handleSearchButtonClick}
                disabled={!isTypingComplete}
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'
                } ${isTypingComplete ? 'cursor-pointer hover:scale-110 ring-2 ' + (isDark ? 'ring-elastic-teal/60' : 'ring-elastic-blue/50') : 'cursor-default'}`}
              >
                <FontAwesomeIcon icon={faMagnifyingGlass} className="text-lg" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Large Banner
        <div className="text-center max-w-6xl">
          {/* Elastic Logo */}
          <div className="mb-12">
            <img 
              src={isDark ? '/Elastic-Logo-tagline-secondary-white.svg' : '/Elastic-Logo-tagline-secondary-black.png'}
              alt="Elastic - The Search AI Company" 
              className={`h-16 mx-auto`}
            />
          </div>
          
          <h1 className={`font-headline text-7xl font-extrabold mb-6 leading-headline ${
            isDark ? 'text-white' : 'text-elastic-dark-ink'
          }`}>
            {bannerTitle}
            <br />
            <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>
              {bannerHighlight}
            </span>
          </h1>
          <p className={`font-body text-2xl ${
            isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'
          } opacity-90`}>
            {bannerSubtitle}
          </p>
        </div>
      )}
    </div>
  )
}

const AboutScene = ({ metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // Use metadata values or defaults
  const eyebrow = metadata.eyebrow || "Who We Are"
  const subtitle = metadata.subtitle || "The Search AI Company — powering search, observability, and security for thousands of organizations worldwide."

  const defaultStats = [
    { value: '5B+', label: 'Downloads', description: 'Open source downloads worldwide' },
    { value: '54%', label: 'Fortune 500', description: 'Trust Elastic for their data needs' },
    { value: '40+', label: 'Countries', description: 'Global presence and support' },
    { value: '3,000+', label: 'Employees', description: 'Distributed across the globe' }
  ]

  const defaultFeatures = [
    { 
      icon: faSearch, 
      title: 'Search Pioneer', 
      description: 'Built on Apache Lucene, the gold standard for search' 
    },
    { 
      icon: faChartColumn, 
      title: 'Data at Scale', 
      description: 'Petabytes of data processed daily by our customers' 
    },
    { 
      icon: faBrain, 
      title: 'AI-Native', 
      description: 'Vector search & ML built into the platform from day one' 
    },
    { 
      icon: faDna, 
      title: 'Open Source DNA', 
      description: 'Transparent, extensible, community-driven' 
    }
  ]

  // Merge metadata with defaults
  const stats = defaultStats.map((stat, index) => ({
    ...stat,
    value: metadata.stats?.[index]?.value || stat.value,
    label: metadata.stats?.[index]?.label || stat.label,
    description: metadata.stats?.[index]?.description || stat.description
  }))

  const features = defaultFeatures.map((feature, index) => ({
    ...feature,
    title: metadata.features?.[index]?.title || feature.title,
    description: metadata.features?.[index]?.description || feature.description
  }))

  return (
    <div className="flex flex-col h-full w-full py-4 overflow-hidden">
      <div className="w-full max-w-[1600px] px-8 md:px-16 mx-auto flex-1 flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain="About "
          titleAccent="Elastic"
          subtitle={subtitle}
        />

        <div className="flex-1 flex flex-col justify-center gap-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 transition-all duration-300 border ${
                isDark
                  ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-elastic-teal/30'
                  : 'bg-white border-elastic-dev-blue/10 hover:border-elastic-blue/30 hover:shadow-lg'
              }`}
            >
              <div className={`text-6xl font-bold mb-3 ${
                isDark ? 'text-elastic-teal' : 'text-elastic-blue'
              }`}>
                {stat.value}
              </div>
              <div className={`text-2xl font-semibold mb-2 ${
                isDark ? 'text-white' : 'text-elastic-dark-ink'
              }`}>
                {stat.label}
              </div>
              <div className={`text-lg ${
                isDark ? 'text-white/70' : 'text-elastic-ink'
              }`}>
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`rounded-2xl p-8 transition-all duration-300 border ${
                isDark
                  ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05] hover:border-elastic-teal/30'
                  : 'bg-white border-elastic-dev-blue/10 hover:border-elastic-blue/30 hover:shadow-lg'
              }`}
            >
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center mb-6 ${
                isDark ? 'bg-elastic-teal/20' : 'bg-elastic-blue/10'
              }`}>
                <FontAwesomeIcon 
                  icon={feature.icon} 
                  className={`text-3xl ${
                    isDark ? 'text-elastic-teal' : 'text-elastic-blue'
                  }`}
                />
              </div>
              <h3 className={`text-2xl font-bold mb-3 ${
                isDark ? 'text-white' : 'text-elastic-dark-ink'
              }`}>
                {feature.title}
              </h3>
              <p className={`text-lg ${
                isDark ? 'text-white/70' : 'text-elastic-ink'
              }`}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

const BusinessValueScene = ({ selectedCard, setSelectedCard, showUnifiedMessage, setShowUnifiedMessage, metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const eyebrow     = metadata.eyebrow     || 'Business Value'
  const title       = metadata.title       || 'Delivering Measurable'
  const titleHighlight = metadata.titleHighlight || 'Business Value'
  const subtitle    = metadata.subtitle    || 'Elastic helps organizations in four key areas.'
  const summaryText = metadata.summaryText || 'Elastic delivers tangible impact across all four areas with a unified platform.'

  const defaultCards = [
    { title: 'Risk Reduction',  description: 'Reduce likelihood & severity of threats',  detailText: 'Elastic helps reduce your attack surface, detect threats faster, and improve your overall security posture.' },
    { title: 'Time Efficiency', description: 'Do more with less',                        detailText: 'Elastic helps you automate manual tasks, streamline workflows, and get insights faster so your teams can focus on what matters most.' },
    { title: 'Resilience',      description: 'Respond & recover faster',                 detailText: 'Elastic helps you quickly identify and resolve issues, minimize downtime, and maintain business continuity even during incidents.' },
    { title: 'Cost Savings',    description: 'Reduce expenses & prevent losses',          detailText: 'Elastic helps you consolidate tools, optimize resource usage, and prevent costly security breaches and operational incidents.' },
  ]

  // Single accent: cards differ by icon + label + weight, never hue.
  const accentHex = isDark ? '#48EFCF' : '#0B64DD'
  const cardIcons = [faShield, faClock, faRocket, faCoins]

  const valueCards = defaultCards.map((defaults, i) => ({
    id: ['risk', 'time', 'resilience', 'cost'][i],
    icon:        cardIcons[i],
    title:       metadata.cards?.[i]?.title       || defaults.title,
    description: metadata.cards?.[i]?.description || defaults.description,
    detailText:  metadata.cards?.[i]?.detailText  || defaults.detailText,
  }))

  return (
    <div className="flex flex-col h-full w-full py-4 overflow-hidden">
      <div className="w-full max-w-[1600px] px-8 md:px-16 mx-auto flex-1 flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={`${title} `}
          titleAccent={titleHighlight}
          subtitle={subtitle}
        />

        <div className="flex-1 flex flex-col justify-center gap-8">
        {/* Value Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {valueCards.map((card, index) => (
            <div
              key={index}
              onClick={() => {
                setSelectedCard(card)
                setShowUnifiedMessage(false)
              }}
              className={`rounded-2xl p-10 transition-all duration-300 border-2 cursor-pointer ${
                isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white hover:shadow-xl'
              } ${
                selectedCard?.id === card.id && !showUnifiedMessage
                  ? `scale-105 ring-2 ${isDark ? 'ring-elastic-teal/60 border-elastic-teal/60' : 'ring-elastic-blue/50 border-elastic-blue/50'}`
                  : `hover:scale-105 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`
              }`}
            >
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
                style={{ backgroundColor: isDark ? 'rgba(72, 239, 207, 0.1)' : 'rgba(11, 100, 221, 0.1)' }}
              >
                <FontAwesomeIcon
                  icon={card.icon}
                  className="text-4xl"
                  style={{ color: accentHex }}
                />
              </div>

              {/* Title */}
              <h3 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                {card.title}
              </h3>

              {/* Description */}
              <p className={`text-xl ${
                isDark ? 'text-white/70' : 'text-elastic-ink'
              }`}>
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Section — fixed height so cards never shift */}
        <div className="text-center relative min-h-[160px] flex flex-col items-center justify-center">
          {showUnifiedMessage ? (
            // Unified Platform Message
            <div className="flex flex-col items-center gap-6">
              {/* Four Icons */}
              <div className="flex items-center gap-4">
                {valueCards.map((card) => (
                  <div
                    key={card.id}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(72, 239, 207, 0.1)' : 'rgba(11, 100, 221, 0.1)' }}
                  >
                    <FontAwesomeIcon
                      icon={card.icon}
                      className="text-xl"
                      style={{ color: accentHex }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Message */}
              <p className={`text-2xl font-semibold max-w-4xl ${
                isDark ? 'text-white' : 'text-elastic-dark-ink'
              }`}>
                {summaryText}
              </p>
            </div>
          ) : !selectedCard ? (
            <p className={`text-xl font-medium ${isDark ? 'text-white/70' : 'text-elastic-ink'}`}>
              Select a value area to see how Elastic delivers it.
            </p>
          ) : (
            // Selected Card Details
            <div className="flex flex-col items-center">
              {/* Detail Text */}
              <p className={`text-3xl font-medium max-w-5xl ${
                isDark ? 'text-white/90' : 'text-elastic-ink/90'
              }`}>
                {selectedCard.detailText}
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

const ProblemPatternsScene = ({ metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [selectedFilter, setSelectedFilter] = useState('observability')

  // Default problem titles
  const defaultProblems = {
    observability: [
      'Disconnected logs, metrics, traces',
      'MTTR stays high despite lots of data',
      'Tool sprawl and cost pressure',
      'Weak correlation to customer impact'
    ],
    security: [
      'Alert fatigue and signal-to-noise ratio',
      'Blind spots across cloud and on-prem',
      'Tool sprawl and cost pressure',
      'Manual investigation slows response'
    ],
    search: [
      'Slow or irrelevant search results',
      'Limited semantic or vector search',
      'Tool sprawl and cost pressure',
      'Difficulty scaling search infrastructure'
    ]
  }

  const eyebrow        = metadata.eyebrow        || 'Problem Orientation'
  const title          = metadata.title          || 'Common'
  const titleHighlight = metadata.titleHighlight || 'Problem Patterns'
  const subtitle       = metadata.subtitle       || "Elastic is broad, so rather than walk through everything, let's orient around the problems teams typically solve with it."

  // Use custom problems from metadata or defaults
  const customProblems = metadata.problems || {}
  
  const filters = [
    { id: 'observability', label: 'Observability',     icon: faChartLine },
    { id: 'security',      label: 'Security',          icon: faShield    },
    { id: 'search',        label: 'Search',  icon: faSearch    },
  ]

  const currentFilter = filters.find(f => f.id === selectedFilter)
  const accentHex = isDark ? '#48EFCF' : '#0B64DD'

  // Build problems array - use custom titles from metadata or defaults
  const problems = []
  
  // Observability problems
  for (let i = 0; i < 4; i++) {
    const customTitle = customProblems.observability?.[i]
    const defaultTitle = defaultProblems.observability[i]
    problems.push({
      id: `obs-${i}`,
      number: String(i + 1).padStart(2, '0'),
      title: customTitle || defaultTitle,
      categories: ['observability']
    })
  }
  
  // Security problems
  for (let i = 0; i < 4; i++) {
    const customTitle = customProblems.security?.[i]
    const defaultTitle = defaultProblems.security[i]
    problems.push({
      id: `sec-${i}`,
      number: String(i + 1).padStart(2, '0'),
      title: customTitle || defaultTitle,
      categories: ['security']
    })
  }
  
  // Search problems
  for (let i = 0; i < 4; i++) {
    const customTitle = customProblems.search?.[i]
    const defaultTitle = defaultProblems.search[i]
    problems.push({
      id: `search-${i}`,
      number: String(i + 1).padStart(2, '0'),
      title: customTitle || defaultTitle,
      categories: ['search']
    })
  }

  const filteredProblems = problems.filter(p => p.categories.includes(selectedFilter))

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

        <div className="flex-1 flex flex-col justify-center gap-12">
        {/* Filter Buttons */}
        <div className="flex items-center justify-center gap-4">
          {filters.map((filter) => (
            <button
              key={filter.id}
              onClick={() => setSelectedFilter(filter.id)}
              className={`flex items-center gap-3 px-8 py-4 rounded-full text-lg font-semibold transition-all duration-300 ${
                selectedFilter === filter.id
                  ? `scale-105 ${isDark ? 'bg-elastic-teal text-elastic-dev-blue' : 'bg-elastic-blue text-white shadow-lg'}`
                  : isDark
                    ? 'bg-white/[0.05] text-white/70 hover:bg-white/[0.08] hover:text-white'
                    : 'bg-white/50 text-elastic-ink hover:bg-white shadow'
              }`}
            >
              <FontAwesomeIcon icon={filter.icon} />
              <span>{filter.label}</span>
            </button>
          ))}
        </div>

        {/* Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProblems.map((problem) => (
            <div
              key={problem.id}
              className={`rounded-2xl p-8 pr-20 transition-all duration-300 border-2 relative ${
                isDark
                  ? 'bg-white/[0.03] border-white/10 hover:bg-white/[0.05]'
                  : 'bg-white border-elastic-dev-blue/10 hover:shadow-lg'
              }`}
            >
              <div className="flex items-start gap-6">
                {/* Bullet Point */}
                <div
                  className="flex-shrink-0 w-3 h-3 rounded-full mt-2"
                  style={{ backgroundColor: accentHex }}
                />
                
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FontAwesomeIcon icon={currentFilter.icon} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/70' : 'text-elastic-ink'}`}>
                      {currentFilter.label}
                    </span>
                  </div>
                  <h3 className={`text-2xl font-bold ${
                    isDark ? 'text-white' : 'text-elastic-dark-ink'
                  }`}>
                    {problem.title}
                  </h3>
                </div>
              </div>

              {/* Number Badge - Circular */}
              <div 
                className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-sm font-mono font-semibold"
                style={{
                  backgroundColor: isDark ? 'rgba(72, 239, 207, 0.12)' : 'rgba(11, 100, 221, 0.1)',
                  color: accentHex
                }}
              >
                {problem.number}
              </div>
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  )
}

// Session schedule (edit in Scene Settings).
// `sceneIds` maps each block to the web-app scenes shown during it (used for expand-to-show).
// Default schedule lives in a shared module so the settings panel can edit it.
// (imported as DEFAULT_AGENDA_ITEMS at the top of this file)

const AgendaScene = ({ scenes = [], sceneMetadata = {}, customDurations = {}, metadata = {}, expanded = {}, setExpanded = () => {}, expandAllSignal = 0 }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const eyebrow = metadata.eyebrow || 'Session Schedule'
  const subtitle = metadata.subtitle || 'Date · Time · Venue'
  const items = Array.isArray(metadata.items) && metadata.items.length ? metadata.items : DEFAULT_AGENDA_ITEMS

  // Resolve a block's scene ids into displayable scene records (title/duration), skipping any not in the deck.
  const sceneById = new Map(scenes.map((s) => [s.id, s]))
  const resolveScenes = (item) =>
    (item.sceneIds || [])
      .map((id) => {
        const scene = sceneById.get(id)
        if (!scene) return null
        const meta = sceneMetadata?.[id] || {}
        return {
          id,
          title: meta.title || scene.title,
          duration: customDurations?.[id] || scene.duration || '',
        }
      })
      .filter(Boolean)

  const expandableIndices = items.map((it, i) => (resolveScenes(it).length > 0 ? i : -1)).filter((i) => i >= 0)

  // Expand-all is triggered from the nav bar via an incrementing signal.
  useEffect(() => {
    if (expandAllSignal > 0) {
      setExpanded(Object.fromEntries(expandableIndices.map((i) => [i, true])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAllSignal])

  const toggleOne = (i) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="flex flex-col h-full w-full px-6 py-4 overflow-hidden">
      {/* Header */}
      <SceneHeader
        eyebrow={eyebrow}
        titlePlain="Today's "
        titleAccent="Agenda"
        subtitle={subtitle}
      />

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col">
        <div className="flex flex-col gap-3 my-auto py-2">
          {items.map((item, index) => {
            const blockScenes = resolveScenes(item)
            const hasScenes = blockScenes.length > 0
            const isOpen = !!expanded[index]
            return (
              <div
                key={`${item.time}-${item.title}`}
                className={`relative flex items-stretch gap-3 rounded-xl p-4 transition-all duration-300 ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.05]'
                    : 'bg-white border border-elastic-dev-blue/10 hover:border-elastic-blue/20 hover:shadow-md'
                }`}
              >
                {/* Accent bar */}
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r" style={{ backgroundColor: accent }} />

                {/* Time */}
                <div
                  className="flex-shrink-0 w-36 pl-3 flex items-start pt-0.5 font-mono text-sm font-semibold whitespace-nowrap"
                  style={{ color: accent }}
                >
                  {item.time}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => hasScenes && toggleOne(index)}
                    className={`flex items-start justify-between gap-2 w-full text-left ${hasScenes ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="min-w-0">
                      <h3 className={`font-bold leading-snug text-lg ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className={`text-sm leading-paragraph mt-0.5 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {hasScenes && (
                      <span className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-elastic-blue/60'}`}>
                          {blockScenes.length} scene{blockScenes.length > 1 ? 's' : ''}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-elastic-blue/60'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    )}
                  </button>

                  {/* Expanded scene list */}
                  {hasScenes && isOpen && (
                    <ul className={`mt-2.5 space-y-1.5 border-t pt-2.5 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      {blockScenes.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                          <span className={`text-sm ${isDark ? 'text-white/80' : 'text-elastic-dark-ink/80'}`}>{s.title}</span>
                          {s.duration && (
                            <span className={`text-xs ml-auto flex-shrink-0 ${isDark ? 'text-white/70' : 'text-elastic-blue/60'}`}>
                              {s.duration}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { theme, toggleTheme } = useTheme()
  
  const allScenes = [
    // ── Act 1 — Open & reconnect ────────────────────────────────────────────
    {
      id: 'hero',
      component: HeroScene,
      title: 'Hero',
      duration: '2 min',
      description: ''
    },
    {
      id: 'agenda',
      component: AgendaScene,
      title: 'Agenda',
      duration: '5 min',
      description: ''
    },
    {
      id: 'team',
      component: TeamScene,
      title: 'Team Introductions',
      duration: '4 min',
      description: 'The people here to support you'
    },
    {
      id: 'about',
      component: AboutScene,
      title: 'About Elastic',
      duration: '3 min',
      description: 'Who we are and what we do'
    },
    // ── Act 2 — Where the customer is today ─────────────────────────────────
    {
      id: 'business-value',
      component: BusinessValueScene,
      title: 'Desired Outcomes',
      duration: '4 min',
      description: 'Key areas where Elastic delivers value'
    },
    {
      id: 'current-architecture',
      component: CurrentArchitectureScene,
      title: 'Current Architecture',
      duration: '5 min',
      description: 'Where Elastic already sits in the environment today'
    },
    {
      id: 'elastic-value',
      component: ElasticValueScene,
      title: 'Value Delivered',
      duration: '3 min',
      description: 'The on-prem Elastic platform by the numbers \u2014 scale, efficiency, and consolidation'
    },
    {
      id: 'value-by-team',
      component: ValueByTeamScene,
      title: 'By Team',
      duration: '4 min',
      description: 'How every team relies on Elastic \u2014 SOC/CTI, Identity, Help Desk, Web App, Risk & Compliance, newly onboarded business units'
    },
    {
      id: 'security-use-cases',
      component: SecurityUseCasesScene,
      title: 'Security Use Cases',
      duration: '5 min',
      description: 'Live Elastic security dashboards, AI workflows, and investigations across your environment'
    },
    // ── Act 3 — Platform (bridge to partner deep-dive) ──────────────────────
    {
      id: 'unified-strategy',
      component: UnifiedStrategyScene,
      title: 'Platform Overview',
      duration: '4 min',
      description: 'All your data, real-time, at scale'
    },
    // ── Act 4 — AI & Security (the differentiation peak) ────────────────────
    {
      id: 'ai-assistant',
      component: AIAssistantScene,
      title: 'AI Capability Map',
      duration: '4 min',
      description: 'Reactive today, agentic now, autonomous next'
    },
    {
      id: 'security-narrative-visual',
      component: SecurityNarrativeVisualScene,
      title: 'Security: Why Now',
      duration: '4 min',
      description: 'Count-up threat stats, attack-path kill-chain, bolt-on vs native, and the Senses/Brain/Hands platform model'
    },
    {
      id: 'security',
      component: SecurityScene,
      title: 'Security',
      duration: '4 min',
      description: 'AI-driven security operations: attack discovery, investigation, and automated response'
    },
    // ── Act 5 — Commercials & close ─────────────────────────────────────────
    {
      id: 'licensing',
      component: LicensingScene,
      title: 'Licensing',
      duration: '3 min',
      description: 'Subscription tiers and what comes with each'
    },
    {
      id: 'customer-architect',
      component: CustomerArchitectScene,
      title: 'Customer Architect',
      duration: '3 min',
      description: 'Your dedicated Customer Architect — we walk this journey with you',
    },
    {
      id: 'services',
      component: ServicesScene,
      title: 'Services',
      duration: '4 min',
      description: 'Transform faster with Elastic Professional Services',
    },
    {
      id: 'next-steps',
      component: NextStepsScene,
      title: 'Next Steps',
      duration: '2 min',
      description: "Close the conversation and drive to action",
    },
    // ── Disabled by default — platform/data deep-dives handed to a partner deck,
    //    plus Run On-Prem. Toggle any of these on in Scene Settings. ─────────
    {
      id: 'panel',
      component: PanelScene,
      title: 'Panel',
      duration: '2 min',
      description: 'Featured panel discussion',
      defaultDisabled: true
    },
    {
      id: 'problem-patterns',
      component: ProblemPatternsScene,
      title: 'Problem Patterns',
      duration: '5 min',
      description: 'Common challenges teams solve with Elastic',
      defaultDisabled: true
    },
    {
      id: 'data-explosion',
      component: DataExplosionSceneV2,
      title: 'Data Explosion',
      duration: '3 min',
      description: 'The unprecedented scale of modern data',
      defaultDisabled: true
    },
    {
      id: 'logsdb',
      component: LogsDBScene,
      title: 'LogsDB',
      duration: '3 min',
      description: 'More data, lower cost, better visibility',
      defaultDisabled: true
    },
    {
      id: 'data-mesh',
      component: DataMeshScene,
      title: 'Data Mesh',
      duration: '4 min',
      description: 'From data chaos to clarity — the Elastic data mesh story',
      defaultDisabled: true
    },
    {
      id: 'cross-cluster',
      component: CrossClusterScene,
      title: 'Cross-Cluster',
      duration: '3 min',
      description: 'Distributed search and replication across environments',
      defaultDisabled: true
    },
    {
      id: 'schema',
      component: SchemaScene,
      title: 'Schema',
      duration: '2 min',
      description: 'Schema on Read vs Schema on Write — why ECS matters',
      defaultDisabled: true
    },
    {
      id: 'access-control',
      component: AccessControlSceneDev,
      title: 'Access Control',
      duration: '3 min',
      description: 'Role and attribute-based controls — every user sees exactly what they need',
      defaultDisabled: true
    },
    {
      id: 'data-tiering',
      component: DataTieringScene,
      title: 'Data Tiering',
      duration: '3 min',
      description: 'Hot, warm, cold, and frozen — intelligent lifecycle management for your data',
      defaultDisabled: true
    },
    {
      id: 'consolidation',
      component: ConsolidationScene,
      title: 'Consolidation',
      duration: '3 min',
      description: 'Replace fragmented tooling with a unified Elastic platform',
      defaultDisabled: true
    },
    {
      id: 'esql',
      component: ESQLScene,
      title: 'ES|QL',
      duration: '4 min',
      description: 'One pipeline from raw data to answers — ES|QL query language',
      defaultDisabled: true
    },
    {
      id: 'platform-operations',
      component: PlatformOperationsScene,
      title: 'Run On-Prem',
      duration: '3 min',
      description: 'What the customer manages self-managed end to end \u2014 architecture, ingestion, security & lifecycle',
      defaultDisabled: true
    },
  ]

  const {
    enabledScenes,
    enabledSceneIds,
    orderedScenes,
    customDurations,
    sceneMetadata,
    toggleScene,
    updateDuration,
    updateSceneMetadata,
    updateOrder,
    resetToDefault
  } = useSceneConfiguration(allScenes)

  const navigate = useNavigate()
  const location = useLocation()

  const scenes = enabledScenes

  const sceneIdFromUrl = location.pathname.slice(1)
  const currentScene = (() => {
    const idx = scenes.findIndex(s => s.id === sceneIdFromUrl)
    return idx >= 0 ? idx : 0
  })()

  // Redirect to first enabled scene if URL is missing or unrecognised
  useEffect(() => {
    const idx = scenes.findIndex(s => s.id === sceneIdFromUrl)
    if (idx === -1 && scenes.length > 0) {
      navigate(`/${scenes[0].id}`, { replace: true })
    }
  }, [sceneIdFromUrl, scenes, navigate])

  const navigateToScene = (index) => {
    const clamped = Math.max(0, Math.min(index, scenes.length - 1))
    navigate(`/${scenes[clamped].id}`)
  }

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [securityStage, setSecurityStage] = useState(0)
  const [securityPlaySignal, setSecurityPlaySignal] = useState(0)
  const [securityAlertPhase, setSecurityAlertPhase] = useState('idle')
  const [securityPhaseSignal, setSecurityPhaseSignal] = useState(0)
  const [schemaPlaySignal, setSchemaPlaySignal] = useState(0)
  const [schemaStage, setSchemaStage] = useState(0)
  const SECURITY_STAGE_COUNT = 3
  const SCHEMA_STAGE_COUNT = 2
  const ESQL_STAGE_COUNT = 6
  const [esqlStage, setEsqlStage] = useState(0)
  const [servicesStage, setServicesStage] = useState(0)
  const [demoPhase, setDemoPhase] = useState('idle')

  const handleDemoAdvance = () => {
    const next = { idle: 'deployed', deployed: 'preparing', preparing: 'stopping', stopping: 'validating', validating: 'usecases', usecases: 'complete' }
    setDemoPhase(p => next[p] ?? p)
  }
  const handleDemoBack = () => {
    const prev = { deployed: 'idle', preparing: 'deployed', stopping: 'preparing', validating: 'stopping', usecases: 'validating', complete: 'usecases' }
    setDemoPhase(p => prev[p] ?? p)
  }
  const [businessValueSelectedCard, setBusinessValueSelectedCard] = useState(null)
  const [businessValueShowUnified, setBusinessValueShowUnified] = useState(false)
  const [dataExplosionVerdictSignal, setDataExplosionVerdictSignal] = useState(0)
  const [dataMeshRunQuerySignal, setDataMeshRunQuerySignal] = useState(0)
  const [dataMeshQueryState, setDataMeshQueryState] = useState({ canRun: false, isRunning: false })
  const [dataMeshPlaySignal, setDataMeshPlaySignal] = useState(0)
  const [dataMeshPlayState, setDataMeshPlayState] = useState({ canPlay: false })
  const [dataMeshSummarySignal, setDataMeshSummarySignal] = useState(0)
  const [dataMeshSummaryState, setDataMeshSummaryState] = useState({ canToggle: false, isShowing: false })
  const [dataMeshActivateMeshSignal, setDataMeshActivateMeshSignal] = useState(0)
  const [dataMeshActivateMeshState, setDataMeshActivateMeshState] = useState({ canActivate: false })
  const [dataTieringIsRunning, setDataTieringIsRunning] = useState(false)
  const [dataTieringResetSignal, setDataTieringResetSignal] = useState(0)
  const [agendaExpanded, setAgendaExpanded] = useState({})
  const [agendaExpandAllSignal, setAgendaExpandAllSignal] = useState(0)
  const agendaAnyExpanded = Object.values(agendaExpanded).some(Boolean)
  
  // Pass props to scenes
  const Scene = scenes[currentScene]?.component || HeroScene
  const currentSceneId = scenes[currentScene]?.id
  
  let sceneProps = {}
  if (currentSceneId === 'agenda') {
    sceneProps = {
      scenes: orderedScenes,
      sceneMetadata,
      customDurations,
      metadata: sceneMetadata?.agenda || {},
      expanded: agendaExpanded,
      setExpanded: setAgendaExpanded,
      expandAllSignal: agendaExpandAllSignal,
    }
  } else if (currentSceneId === 'hero') {
    sceneProps = { metadata: sceneMetadata?.hero || {} }
  } else if (currentSceneId === 'about') {
    sceneProps = { metadata: sceneMetadata?.about || {} }
  } else if (currentSceneId === 'business-value') {
    sceneProps = {
      selectedCard: businessValueSelectedCard,
      setSelectedCard: setBusinessValueSelectedCard,
      showUnifiedMessage: businessValueShowUnified,
      setShowUnifiedMessage: setBusinessValueShowUnified,
      metadata: sceneMetadata?.['business-value'] || {}
    }
  } else if (currentSceneId === 'problem-patterns') {
    sceneProps = { metadata: sceneMetadata?.['problem-patterns'] || {} }
  } else if (currentSceneId === 'current-architecture') {
    sceneProps = { metadata: sceneMetadata?.['current-architecture'] || {} }
  } else if (currentSceneId === 'logsdb') {
    sceneProps = { metadata: sceneMetadata?.logsdb || {} }
  } else if (currentSceneId === 'ai-assistant') {
    sceneProps = { metadata: sceneMetadata?.['ai-assistant'] || {} }
  } else if (currentSceneId === 'customer-architect') {
    sceneProps = { metadata: sceneMetadata?.['customer-architect'] || {} }
  } else if (currentSceneId === 'unified-strategy') {
    sceneProps = { metadata: sceneMetadata?.['unified-strategy'] || {} }
  } else if (currentSceneId === 'data-explosion') {
    sceneProps = {
      metadata: sceneMetadata?.['data-explosion'] || {},
      verdictSignal: dataExplosionVerdictSignal,
    }
  } else if (currentSceneId === 'data-mesh') {
    sceneProps = {
      scenes: enabledScenes,
      onNavigate: (i) => navigateToScene(i),
      metadata: sceneMetadata?.['data-mesh'] || {},
      runQuerySignal: dataMeshRunQuerySignal,
      onQueryStateChange: setDataMeshQueryState,
      playSignal: dataMeshPlaySignal,
      onPlayStateChange: setDataMeshPlayState,
      summarySignal: dataMeshSummarySignal,
      onSummaryStateChange: setDataMeshSummaryState,
      activateMeshSignal: dataMeshActivateMeshSignal,
      onActivateMeshStateChange: setDataMeshActivateMeshState,
    }
  } else if (currentSceneId === 'cross-cluster') {
    sceneProps = { metadata: sceneMetadata?.['cross-cluster'] || {} }
  } else if (currentSceneId === 'security-narrative-visual') {
    sceneProps = { metadata: sceneMetadata?.['security-narrative-visual'] || {} }
  } else if (currentSceneId === 'security') {
    sceneProps = {
      externalStage: securityStage,
      onStageChange: setSecurityStage,
      playSignal: securityPlaySignal,
      phaseAdvanceSignal: securityPhaseSignal,
      onAlertPhaseChange: setSecurityAlertPhase,
    }
  } else if (currentSceneId === 'elastic-value') {
    sceneProps = { metadata: sceneMetadata?.['elastic-value'] || {} }
  } else if (currentSceneId === 'platform-operations') {
    sceneProps = { metadata: sceneMetadata?.['platform-operations'] || {} }
  } else if (currentSceneId === 'value-by-team') {
    sceneProps = { metadata: sceneMetadata?.['value-by-team'] || {} }
  } else if (currentSceneId === 'security-use-cases') {
    sceneProps = { metadata: sceneMetadata?.['security-use-cases'] || {} }
  } else if (currentSceneId === 'schema') {
    sceneProps = {
      externalStage: schemaStage,
      onStageChange: setSchemaStage,
      playSignal: schemaPlaySignal,
      metadata: sceneMetadata?.schema || {},
    }
  } else if (currentSceneId === 'access-control') {
    sceneProps = {
      metadata: sceneMetadata?.['access-control'] || {},
    }
  } else if (currentSceneId === 'data-tiering') {
    sceneProps = {
      isRunning: dataTieringIsRunning,
      setIsRunning: setDataTieringIsRunning,
      resetSignal: dataTieringResetSignal,
    }
  } else if (currentSceneId === 'consolidation') {
    sceneProps = {
      tools: sceneMetadata?.consolidation?.tools,
      metadata: sceneMetadata?.consolidation || {},
    }
  } else if (currentSceneId === 'esql') {
    sceneProps = {
      metadata: sceneMetadata?.esql || {},
      externalStage: esqlStage,
      onStageChange: setEsqlStage,
    }
  } else if (currentSceneId === 'services') {
    sceneProps = {
      externalStage: servicesStage,
      onStageChange: (s) => { setServicesStage(s); if (s !== 2) setDemoPhase('idle') },
      demoPhase,
      metadata: sceneMetadata?.services || {},
    }
  } else if (currentSceneId === 'next-steps') {
    sceneProps = {
      metadata: sceneMetadata?.['next-steps'] || {},
    }
  } else if (currentSceneId === 'panel') {
    sceneProps = {
      metadata: sceneMetadata?.panel || {},
    }
  }

  const handleNext = () => {
    setSecurityStage(0)
    setSchemaStage(0)
    setEsqlStage(0)
    setServicesStage(0)
    navigateToScene(currentScene + 1)
  }

  const handlePrev = () => {
    setSecurityStage(0)
    setSchemaStage(0)
    navigateToScene(currentScene - 1)
  }

  // Reset scene-specific state when navigating away
  useEffect(() => {
    if (currentSceneId !== 'business-value') {
      setBusinessValueSelectedCard(null)
      setBusinessValueShowUnified(false)
    }
    if (currentSceneId !== 'data-explosion') {
      setDataExplosionVerdictSignal(0)
    }
    if (currentSceneId !== 'security') {
      setSecurityStage(0)
      setSecurityPlaySignal(0)
      setSecurityAlertPhase('idle')
      setSecurityPhaseSignal(0)
    }
    if (currentSceneId !== 'schema') {
      setSchemaPlaySignal(0)
      setSchemaStage(0)
    }
  }, [currentSceneId])

  return (
    <div className="min-h-screen bg-elastic-light-grey dark:bg-elastic-dev-blue transition-colors duration-300">
      {/* Scene Settings */}
      <SceneSettings
        scenes={orderedScenes}
        enabledSceneIds={enabledSceneIds}
        customDurations={customDurations}
        sceneMetadata={sceneMetadata}
        onToggle={toggleScene}
        onUpdateDuration={updateDuration}
        onUpdateSceneMetadata={updateSceneMetadata}
        onUpdateOrder={updateOrder}
        onReset={resetToDefault}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Scene Container */}
      <div className="h-[calc(100vh-76px)] flex items-center justify-center">
        <Scene {...sceneProps} />
      </div>
      
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-elastic-light-grey dark:bg-elastic-dev-blue w-full py-4">
        <div className="flex items-center justify-between max-w-[95%] mx-auto">
          {/* Left: Theme Toggle and Settings */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
              }`}
              aria-label="Toggle theme"
            >
              <FontAwesomeIcon 
                icon={theme === 'dark' ? faSun : faMoon} 
                className="text-lg"
              />
            </button>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
              }`}
              title="Settings"
            >
              <FontAwesomeIcon icon={faGear} className="text-lg" />
            </button>
            

            {/* Expand/collapse all agenda blocks - only visible on Agenda scene */}
            {currentSceneId === 'agenda' && (
              <button
                onClick={() => {
                  if (agendaAnyExpanded) setAgendaExpanded({})
                  else setAgendaExpandAllSignal(n => n + 1)
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={agendaAnyExpanded ? 'Collapse all scenes' : 'Expand all scenes'}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="text-base" />
              </button>
            )}

            {/* Reveal button - only visible on Data Explosion scene */}
            {currentSceneId === 'data-explosion' && (
              <button
                onClick={() => setDataExplosionVerdictSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Reveal verdict"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Play Button - only visible on Security scene, triggers current stage animation */}
            {currentSceneId === 'security' && (
              <button
                onClick={() => setSecurityPlaySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Play animation"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Phase Advance Button - appears when correlation is running; advances to attack story cards */}
            {currentSceneId === 'security' && (securityAlertPhase === 'flooding' || securityAlertPhase === 'connecting') && (
              <button
                onClick={() => setSecurityPhaseSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal border border-elastic-teal/30 glow-delayed-dark'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border border-elastic-blue/20 glow-delayed-light'
                }`}
                title="Show attack story cards"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            )}

            {/* Play Button - only visible on Data Mesh scene stage 0 before typing starts */}
            {currentSceneId === 'data-mesh' && dataMeshPlayState.canPlay && (
              <button
                onClick={() => setDataMeshPlaySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Play typing animation"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Run Query Button - only visible on Data Mesh scene when stage 4 and mesh is active */}
            {currentSceneId === 'data-mesh' && dataMeshQueryState.canRun && (
              <button
                onClick={() => setDataMeshRunQuerySignal(n => n + 1)}
                disabled={dataMeshQueryState.isRunning}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={dataMeshQueryState.isRunning ? 'Running Query…' : 'Run Query'}
              >
                <FontAwesomeIcon
                  icon={dataMeshQueryState.isRunning ? faBolt : faPlay}
                  className={`text-sm ml-0.5 ${dataMeshQueryState.isRunning ? 'animate-pulse' : ''}`}
                />
              </button>
            )}

            {/* Activate Mesh Button - Data Mesh stage 4 before mesh is active */}
            {currentSceneId === 'data-mesh' && dataMeshActivateMeshState.canActivate && (
              <button
                onClick={() => setDataMeshActivateMeshSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Activate Mesh"
              >
                <FontAwesomeIcon icon={faCircleNodes} className="text-sm" />
              </button>
            )}

            {/* Compare All Button - Data Mesh stage 3 */}
            {currentSceneId === 'data-mesh' && dataMeshSummaryState.canToggle && (
              <button
                onClick={() => setDataMeshSummarySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={dataMeshSummaryState.isShowing ? 'Back to Cards' : 'Compare All'}
              >
                <FontAwesomeIcon icon={dataMeshSummaryState.isShowing ? faTimes : faLayerGroup} className="text-sm" />
              </button>
            )}

            {/* Start/Pause + Reset - Data Tiering scene */}
            {currentSceneId === 'data-tiering' && (
              <>
                <button
                  onClick={() => setDataTieringIsRunning(r => !r)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title={dataTieringIsRunning ? 'Pause' : 'Start Flow'}
                >
                  <FontAwesomeIcon icon={dataTieringIsRunning ? faPause : faPlay} className="text-sm ml-0.5" />
                </button>
                <button
                  onClick={() => { setDataTieringIsRunning(false); setDataTieringResetSignal(n => n + 1) }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Reset"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
                </button>
              </>
            )}

            {/* How Button - only visible on Business Value scene when card is selected and unified message not shown */}
            {currentSceneId === 'business-value' && businessValueSelectedCard && !businessValueShowUnified && (
              <button
                onClick={() => setBusinessValueShowUnified(true)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark' 
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal glow-once-dark' 
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue glow-once-light'
                }`}
                title="Show unified platform message"
              >
                <FontAwesomeIcon icon={faForwardStep} className="text-lg" />
              </button>
            )}

            {/* Stage Back/Forward - only visible on ES|QL scene */}
            {currentSceneId === 'esql' && (
              <>
                <button
                  onClick={() => setEsqlStage(s => Math.max(0, s - 1))}
                  disabled={esqlStage === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Previous stage"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                </button>
                <button
                  onClick={() => setEsqlStage(s => Math.min(ESQL_STAGE_COUNT - 1, s + 1))}
                  disabled={esqlStage === ESQL_STAGE_COUNT - 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Next stage"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                </button>
              </>
            )}
          {/* Demo controls — Zero Downtime stage */}
          {currentSceneId === 'services' && servicesStage === 2 && (
            <>
              <button
                onClick={handleDemoBack}
                disabled={demoPhase === 'idle'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Previous step"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
              </button>
              <button
                onClick={() => setDemoPhase('idle')}
                disabled={demoPhase === 'idle'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 text-white/60'
                    : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/60'
                }`}
                title="Reset demo"
              >
                <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
              </button>
              <button
                onClick={handleDemoAdvance}
                disabled={demoPhase === 'complete'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Next step"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            </>
          )}
          </div>
          
          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-6">
            <button 
              onClick={handlePrev} 
              disabled={currentScene === 0}
              className={`text-sm font-medium transition-all hover:scale-105 ${
                currentScene === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'text-white/60 hover:text-white'
                    : 'text-elastic-ink/60 hover:text-elastic-dark-ink'
              }`}
            >
              Previous
            </button>
            
            {/* Scene Dots */}
            <div className="flex gap-3">
              {scenes.map((scene, index) => (
                <div key={scene.id} className="relative group flex flex-col items-center">
                  <button
                    onClick={() => navigateToScene(index)}
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      index === currentScene 
                        ? 'bg-elastic-blue dark:bg-elastic-teal scale-125' 
                        : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                    }`}
                    aria-label={`Go to ${scene.title}`}
                  />
                  <span className={`pointer-events-none absolute top-full mt-2 whitespace-nowrap text-xs px-2 py-1 rounded-md border opacity-0 group-hover:opacity-100 transition-opacity duration-150 ${theme === 'dark' ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'} shadow-md`}>
                    {scene.title}
                  </span>
                </div>
              ))}
            </div>
            
            <button 
              onClick={handleNext} 
              disabled={currentScene === scenes.length - 1}
              className={`text-sm font-medium transition-all hover:scale-105 ${
                currentScene === scenes.length - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : theme === 'dark'
                    ? 'text-white/60 hover:text-white'
                    : 'text-elastic-ink/60 hover:text-elastic-dark-ink'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      </nav>
      
      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-elastic-blue dark:bg-elastic-teal transition-all duration-500"
          style={{ width: `${((currentScene + 1) / scenes.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <TeamProvider>
        <AppContent />
      </TeamProvider>
    </ThemeProvider>
  )
}

export default App
