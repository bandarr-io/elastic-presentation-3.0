import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass as faSearch, faChartColumn, faBrain, faDna } from '@fortawesome/free-solid-svg-icons'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'

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
    icon: resolveIcon(metadata.features?.[index]?.icon, feature.icon),
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

export default AboutScene
