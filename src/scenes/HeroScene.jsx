import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass } from '@fortawesome/free-solid-svg-icons'

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
  // Banner text alignment — configurable in Scene Settings (defaults to left).
  const align = metadata.align === 'center' ? 'center' : 'left'
  
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
        <div className={`max-w-6xl ${align === 'center' ? 'text-center' : 'text-left w-full self-start'}`}>
          {/* Elastic Logo */}
          <div className="mb-12">
            <img 
              src={isDark ? '/Elastic-Logo-tagline-secondary-white.svg' : '/Elastic-Logo-tagline-secondary-black.png'}
              alt="Elastic - The Search AI Company" 
              className={`h-16 ${align === 'center' ? 'mx-auto' : ''}`}
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

export default HeroScene
