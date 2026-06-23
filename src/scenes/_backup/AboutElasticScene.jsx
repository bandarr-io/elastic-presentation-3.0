import { animate } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faChartColumn, faBrain, faCodeBranch } from '@fortawesome/free-solid-svg-icons'

const stats = [
  { value: '5B+', label: 'Downloads', description: 'Open source downloads worldwide' },
  { value: '54%', label: 'Fortune 500', description: 'Trust Elastic for their data needs' },
  { value: '40+', label: 'Countries', description: 'Global presence and support' },
  { value: '3,000+', label: 'Employees', description: 'Distributed across the globe' },
]

const highlights = [
  { icon: faMagnifyingGlass, title: 'Search Pioneer', desc: 'Built on Apache Lucene, the gold standard for search', color: '#48EFCF' },
  { icon: faChartColumn, title: 'Data at Scale', desc: 'Petabytes of data processed daily by our customers', color: '#0B64DD' },
  { icon: faBrain, title: 'AI-Native', desc: 'Vector search & ML built into the platform from day one', color: '#F04E98' },
  { icon: faCodeBranch, title: 'Open Source DNA', desc: 'Transparent, extensible, community-driven', color: '#FEC514' },
]

function AboutElasticScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const headerRef = useRef(null)
  const statsRef = useRef(null)
  const statsItemsRef = useRef([])
  const highlightsRef = useRef(null)
  const highlightItemsRef = useRef([])

  useEffect(() => {
    if (headerRef.current) {
      animate(headerRef.current, {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        ease: 'out'
      })
    }

    if (statsRef.current) {
      animate(statsRef.current, {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        delay: 200,
        ease: 'out'
      })
    }

    statsItemsRef.current.forEach((item, index) => {
      if (item) {
        animate(item, {
          opacity: [0, 1],
          scale: [0.9, 1],
          duration: 500,
          delay: 300 + index * 100,
          ease: 'out'
        })
      }
    })

    if (highlightsRef.current) {
      animate(highlightsRef.current, {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 600,
        delay: 600,
        ease: 'out'
      })
    }

    highlightItemsRef.current.forEach((item, index) => {
      if (item) {
        animate(item, {
          opacity: [0, 1],
          translateY: [20, 0],
          duration: 500,
          delay: 700 + index * 100,
          ease: 'out'
        })
      }
    })
  }, [])

  const handleStatHover = (index, isEntering) => {
    const item = statsItemsRef.current[index]
    if (item) {
      animate(item, {
        scale: isEntering ? 1.03 : 1,
        duration: 200,
        ease: 'out'
      })
    }
  }

  const handleHighlightHover = (index, isEntering) => {
    const item = highlightItemsRef.current[index]
    if (item) {
      animate(item, {
        translateY: isEntering ? -3 : 0,
        duration: 200,
        ease: 'out'
      })
    }
  }

  return (
    <div className="scene">
      <div className="max-w-6xl mx-auto w-full">
        {/* Header */}
        <div
          ref={headerRef}
          className="text-center"
          style={{ opacity: 0 }}
        >
          <span className={`text-eyebrow text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            Who We Are
          </span>
          <h2 className={`text-headline text-4xl md:text-5xl font-extrabold mt-4 mb-5 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            About <span className="gradient-text">Elastic</span>
          </h2>
          <p className={`text-paragraph text-lg md:text-xl mx-auto ${isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'}`}>
            The Search AI Company — powering search, observability, and security for thousands of organizations worldwide.
          </p>
        </div>

        {/* Stats Grid */}
        <div
          ref={statsRef}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
          style={{ opacity: 0 }}
        >
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              ref={el => statsItemsRef.current[index] = el}
              className={`relative p-6 rounded-2xl border text-center overflow-hidden group ${
                isDark 
                  ? 'bg-white/[0.03] border-white/10' 
                  : 'bg-white/80 border-elastic-dev-blue/10'
              }`}
              style={{ opacity: 0 }}
              onMouseEnter={() => handleStatHover(index, true)}
              onMouseLeave={() => handleStatHover(index, false)}
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `radial-gradient(circle at 50% 50%, ${isDark ? 'rgba(72, 239, 207, 0.1)' : 'rgba(11, 100, 221, 0.1)'}, transparent 70%)`,
                }}
              />
              
              <div className={`text-code text-5xl md:text-6xl font-bold mb-2 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                {stat.value}
              </div>
              <div className={`text-headline text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                {stat.label}
              </div>
              <div className={`text-paragraph text-base ${isDark ? 'text-elastic-light-grey/60' : 'text-elastic-ink/70'}`}>
                {stat.description}
              </div>
            </div>
          ))}
        </div>

        {/* Highlights */}
        <div
          ref={highlightsRef}
          className="grid md:grid-cols-4 gap-4"
          style={{ opacity: 0 }}
        >
          {highlights.map((item, index) => (
            <div
              key={item.title}
              ref={el => highlightItemsRef.current[index] = el}
              className={`p-6 rounded-xl border transition-all ${
                isDark 
                  ? 'bg-white/[0.02] border-white/10 hover:bg-white/[0.05]' 
                  : 'bg-white/60 border-elastic-dev-blue/10 hover:bg-white'
              }`}
              style={{ opacity: 0 }}
              onMouseEnter={() => handleHighlightHover(index, true)}
              onMouseLeave={() => handleHighlightHover(index, false)}
            >
              <div className="text-2xl mb-3" style={{ color: isDark ? item.color : '#0B64DD' }}>
                <FontAwesomeIcon icon={item.icon} />
              </div>
              <h3 className={`text-headline text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                {item.title}
              </h3>
              <p className={`text-paragraph text-base ${isDark ? 'text-elastic-light-grey/70' : 'text-elastic-ink'}`}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AboutElasticScene
