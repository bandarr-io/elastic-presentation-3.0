import { animate, stagger } from 'animejs'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMagnifyingGlass, faPlay } from '@fortawesome/free-solid-svg-icons'
import { useAnimationTimeline } from '../hooks/useAnimationTimeline'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { createEntranceTimeline, createMultiStageReveal } from '../animations/utils/timeline'
import { easingPresets } from '../animations/utils/easing'
import { fadeUpReveal, scaleBounceReveal } from '../animations/reveals/textReveals'
import { scaleHover, liftHover } from '../animations/interactions/hoverEffects'
import { pressDownEffect, rippleEffect } from '../animations/interactions/clickEffects'
import { chartDrawReveal } from '../animations/reveals/dataReveals'

// Search Bar Component
function HeroSearchBar({ text, isTyping, onShowAnswer, searchComplete, showCursor = true }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const searchBarRef = useRef(null)
  const cursorRef = useRef(null)
  const buttonRef = useRef(null)
  const { shouldAnimate, getDuration } = useReducedMotion()
  
  // Entrance animation with lift effect
  useEffect(() => {
    if (searchBarRef.current && shouldAnimate()) {
      animate(searchBarRef.current, {
        opacity: [0, 1],
        translateY: [40, 0],
        scale: [0.95, 1],
        duration: getDuration(800),
        easing: easingPresets.entrance
      })
    } else if (searchBarRef.current) {
      searchBarRef.current.style.opacity = '1'
    }
  }, [shouldAnimate, getDuration])

  // Blinking cursor animation
  useEffect(() => {
    if (cursorRef.current && showCursor && shouldAnimate(true)) {
      animate(cursorRef.current, {
        opacity: [1, 0, 1],
        duration: getDuration(1200),
        easing: 'linear',
        loop: true
      })
    }
  }, [showCursor, shouldAnimate, getDuration])

  const handleButtonHover = (isEntering) => {
    if (isTyping || !buttonRef.current || !shouldAnimate()) return
    
    liftHover(buttonRef.current, isEntering, {
      scale: 1.08,
      translateY: -2,
      duration: getDuration(200)
    })
  }

  const handleButtonClick = async () => {
    if (isTyping || !buttonRef.current) return
    
    if (shouldAnimate()) {
      await pressDownEffect(buttonRef.current, {
        scale: 0.95,
        duration: getDuration(150)
      })
    }
    
    onShowAnswer()
  }
  
  return (
    <div
      ref={searchBarRef}
      className={`relative flex items-center mx-auto px-8 py-5 rounded-full border-2 ${
        isDark 
          ? 'bg-white/[0.03] border-white/20' 
          : 'bg-white border-elastic-dev-blue/20'
      }`}
      style={{ width: '800px', opacity: 0 }}
    >
      {/* Text area with inline cursor */}
      <div className="flex-1 min-h-[40px] flex items-center">
        <span className={`text-2xl md:text-3xl font-light ${
          isDark ? 'text-white' : 'text-elastic-dev-blue'
        }`}>
          {text}
        </span>
        {/* Blinking cursor after text */}
        {showCursor && (
          <span
            ref={cursorRef}
            className={`inline-block w-0.5 h-8 ml-1 ${isDark ? 'bg-white' : 'bg-elastic-dev-blue'}`}
          />
        )}
      </div>
      
      {/* Search icon / button - shows answer */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        onMouseEnter={() => handleButtonHover(true)}
        onMouseLeave={() => handleButtonHover(false)}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
          isTyping 
            ? isDark 
              ? 'bg-elastic-teal/20 text-elastic-teal cursor-not-allowed'
              : 'bg-elastic-blue/20 text-elastic-blue cursor-not-allowed'
            : searchComplete
              ? isDark 
                ? 'bg-elastic-teal/30 text-elastic-teal hover:bg-elastic-teal hover:text-white animate-glow' 
                : 'bg-elastic-blue/20 text-elastic-blue hover:bg-elastic-blue hover:text-white animate-glow-blue'
              : isDark 
                ? 'bg-white/10 text-white/60 hover:bg-elastic-teal hover:text-white' 
                : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-blue hover:text-white'
        }`}
        disabled={isTyping}
        title="Show answer"
      >
        <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xl" />
      </button>
    </div>
  )
}

function HeroScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [searchText, setSearchText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchComplete, setSearchComplete] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)
  
  const particlesRef = useRef(null)
  const searchPhaseRef = useRef(null)
  const answerPhaseRef = useRef(null)
  const playButtonRef = useRef(null)
  const svgPathRef = useRef(null)

  // Animation hooks
  const { createTimeline } = useAnimationTimeline()
  const { shouldAnimate, getDuration } = useReducedMotion()

  // The question to type
  const questionText = "The Elastic Search AI Platform"

  // Memoize particles to prevent re-randomizing on re-render
  const particles = useMemo(() => 
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 20 + 10,
      delay: Math.random() * 5,
      xOffset: Math.random() * 50 - 25,
    })), []
  )

  // Cinematic particle entrance and floating
  useEffect(() => {
    if (!particlesRef.current || !shouldAnimate(true)) return

    const particleElements = particlesRef.current.querySelectorAll('.particle')
    const animations = []
    
    particleElements.forEach((particle, index) => {
      const data = particles[index]
      
      // Initial entrance
      const entranceAnim = animate(particle, {
        opacity: [0, 0.4],
        scale: [0, 1],
        duration: getDuration(800),
        delay: data.delay * 1000,
        easing: easingPresets.entrance
      })
      
      // Continuous floating animation
      const floatAnim = animate(particle, {
        translateY: [0, -100, 0],
        translateX: [0, data.xOffset, 0],
        opacity: [0.3, 0.8, 0.3],
        duration: data.duration * 1000,
        delay: data.delay * 1000 + getDuration(800),
        loop: true,
        easing: 'easeInOutSine'
      })
      
      animations.push(entranceAnim, floatAnim)
    })

    return () => {
      animations.forEach(anim => anim && anim.pause && anim.pause())
    }
  }, [particles, shouldAnimate, getDuration])

  // SVG path draw animation
  useEffect(() => {
    if (svgPathRef.current && shouldAnimate(true)) {
      animate(svgPathRef.current, {
        strokeDashoffset: [1000, 0],
        duration: getDuration(2500),
        delay: getDuration(800),
        easing: 'easeInOutQuad'
      })
    }
  }, [shouldAnimate, getDuration])

  // Animate play button on mount with subtle pulse
  useEffect(() => {
    if (playButtonRef.current && !searchComplete && !isTyping && shouldAnimate()) {
      animate(playButtonRef.current, {
        opacity: [0, 1],
        scale: [0.8, 1],
        duration: getDuration(400),
        easing: easingPresets.snappy
      })

      // Subtle pulse to draw attention
      animate(playButtonRef.current, {
        scale: [1, 1.1, 1],
        duration: getDuration(2000),
        delay: getDuration(1000),
        easing: 'easeInOutQuad',
        loop: true
      })
    }
  }, [searchComplete, isTyping, shouldAnimate, getDuration])

  // Typing animation
  const startTyping = useCallback(() => {
    if (isTyping || searchComplete) return
    
    setIsTyping(true)
    setSearchText('')
    let index = 0
    
    const typeInterval = setInterval(() => {
      if (index < questionText.length) {
        setSearchText(questionText.slice(0, index + 1))
        index++
      } else {
        clearInterval(typeInterval)
        setIsTyping(false)
        setSearchComplete(true)
      }
    }, 80) // Typing speed
    
    return () => clearInterval(typeInterval)
  }, [isTyping, searchComplete])

  // Cinematic answer reveal with multi-stage timeline
  useEffect(() => {
    if (!showAnswer || !shouldAnimate()) {
      if (showAnswer && answerPhaseRef.current) {
        answerPhaseRef.current.style.display = 'block'
        answerPhaseRef.current.style.opacity = '1'
      }
      return
    }

    const timeline = createEntranceTimeline({ autoplay: true })

    // Stage 1: Fade out search phase
    if (searchPhaseRef.current) {
      timeline.add({
        targets: searchPhaseRef.current,
        opacity: [1, 0],
        translateY: [0, -40],
        scale: [1, 0.95],
        duration: getDuration(500),
        easing: easingPresets.exit,
        complete: () => {
          if (searchPhaseRef.current) {
            searchPhaseRef.current.style.display = 'none'
          }
        }
      })
    }

    // Stage 2: Reveal answer phase with staggered elements
    if (answerPhaseRef.current) {
      answerPhaseRef.current.style.display = 'block'
      
      const logo = answerPhaseRef.current.querySelector('.answer-logo')
      const title = answerPhaseRef.current.querySelector('.answer-title')
      const subtitle = answerPhaseRef.current.querySelector('.answer-subtitle')
      const gradient = answerPhaseRef.current.querySelector('.answer-gradient')

      // Logo reveal
      if (logo) {
        timeline.add({
          targets: logo,
          opacity: [0, 1],
          scale: [0.8, 1],
          translateY: [30, 0],
          duration: getDuration(600),
          easing: easingPresets.dramatic
        }, `-=${getDuration(200)}`)
      }

      // Title reveal
      if (title) {
        timeline.add({
          targets: title,
          opacity: [0, 1],
          translateY: [40, 0],
          duration: getDuration(700),
          easing: easingPresets.entrance
        }, `-=${getDuration(300)}`)
      }

      // Gradient text reveal (delayed for emphasis)
      if (gradient) {
        timeline.add({
          targets: gradient,
          opacity: [0, 1],
          scale: [0.95, 1],
          duration: getDuration(800),
          easing: easingPresets.snappy
        }, `-=${getDuration(400)}`)
      }

      // Subtitle reveal
      if (subtitle) {
        timeline.add({
          targets: subtitle,
          opacity: [0, 1],
          translateY: [30, 0],
          duration: getDuration(600),
          easing: easingPresets.entrance
        }, `-=${getDuration(200)}`)
      }
    }

    return () => {
      if (timeline) {
        timeline.pause()
      }
    }
  }, [showAnswer, shouldAnimate, getDuration, createTimeline])

  return (
    <div className="scene relative overflow-hidden">
      {/* Animated data particles */}
      <div ref={particlesRef} className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={`particle absolute rounded-full ${isDark ? 'bg-elastic-blue/40' : 'bg-elastic-blue/30'}`}
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
            }}
          />
        ))}
      </div>

      {/* Animated connecting lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
        <path
          ref={svgPathRef}
          d="M0,50 Q25,30 50,50 T100,50"
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="1"
          style={{ strokeDasharray: 1000, strokeDashoffset: 1000 }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#48EFCF" />
            <stop offset="50%" stopColor="#0B64DD" />
            <stop offset="100%" stopColor="#F04E98" />
          </linearGradient>
        </defs>
      </svg>

      {/* Main content */}
      <div className="relative z-10 max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[500px]">
        {/* Search Phase */}
        <div
          ref={searchPhaseRef}
          className="w-full text-center"
          style={{ display: showAnswer ? 'none' : 'block' }}
        >
          {/* Search Bar */}
          <HeroSearchBar 
            text={searchText}
            isTyping={isTyping}
            searchComplete={searchComplete}
            onShowAnswer={() => {
              if (!showAnswer) {
                if (!searchComplete) {
                  setSearchText(questionText)
                  setSearchComplete(true)
                }
                setShowAnswer(true)
              }
            }}
            showCursor={!searchComplete}
          />
          
          {/* Prompt to click */}
          {!searchText && !isTyping && (
            <p
              className={`text-center mt-6 text-sm ${isDark ? 'text-white/40' : 'text-elastic-blue/60'}`}
              ref={el => {
                if (el && !searchText && !isTyping) {
                  animate(el, {
                    opacity: [0.4, 0.8, 0.4],
                    duration: 2000,
                    loop: true,
                    ease: 'inOut'
                  })
                }
              }}
            >
              Click search to discover...
            </p>
          )}
        </div>

        {/* Answer Phase - Logo and Content */}
        <div
          ref={answerPhaseRef}
          className="w-full text-center"
          style={{ display: 'none', opacity: 0 }}
        >
          {/* Elastic Logo */}
          <div className="answer-logo mb-8" style={{ opacity: 0 }}>
            <img 
              src={isDark 
                ? "/Elastic-Logo-tagline-secondary-white.svg" 
                : "/Elastic-Logo-tagline-secondary-black.png"
              }
              alt="Elastic - The Search AI Company" 
              className="h-16 w-auto mx-auto object-contain"
            />
          </div>

          {/* Main title */}
          <h1
            className="answer-title text-headline text-5xl md:text-7xl font-extrabold mb-6"
            style={{ opacity: 0 }}
          >
            <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}>The Elastic Search AI Platform:</span>
            <br />
            <span className="answer-gradient gradient-text" style={{ opacity: 0 }}>
              Transforming Data into Action
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className={`answer-subtitle text-paragraph text-xl md:text-2xl max-w-3xl mx-auto ${
              isDark ? 'text-elastic-light-grey' : 'text-elastic-blue'
            }`}
            style={{ opacity: 0 }}
          >
            Unleash the Power of Real-Time Insights, Scale, and Innovation
          </p>
        </div>
      </div>

      {/* Bottom decorative element */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent to-transparent ${
          isDark ? 'via-elastic-teal/50' : 'via-elastic-blue/30'
        }`}
        style={{ transform: 'scaleX(0)' }}
        ref={el => {
          if (el) {
            animate(el, {
              scaleX: [0, 1],
              duration: 1000,
              delay: 1500,
              ease: 'out'
            })
          }
        }}
      />

      {/* Floating play button - subtle, for starting typing animation */}
      {!searchComplete && !isTyping && (
        <button
          ref={playButtonRef}
          onClick={startTyping}
          onMouseEnter={() => {
            if (playButtonRef.current && shouldAnimate()) {
              scaleHover(playButtonRef.current, true, {
                scale: 1.15,
                duration: getDuration(200)
              })
            }
          }}
          onMouseLeave={() => {
            if (playButtonRef.current && shouldAnimate()) {
              scaleHover(playButtonRef.current, false, {
                duration: getDuration(200)
              })
            }
          }}
          className={`fixed bottom-4 right-14 z-40 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isDark 
              ? 'bg-white/5 hover:bg-white/15 text-white/30 hover:text-white/60' 
              : 'bg-elastic-dev-blue/5 hover:bg-elastic-dev-blue/15 text-elastic-dev-blue/30 hover:text-elastic-dev-blue/60'
          }`}
          style={{ opacity: 0, transform: 'scale(0.8)' }}
          title="Start typing animation"
        >
          <FontAwesomeIcon icon={faPlay} className="text-[10px] ml-0.5" />
        </button>
      )}
    </div>
  )
}

export default HeroScene
