import { useEffect, useRef, useCallback } from 'react'
import { animate } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { scaleHover } from '../animations/interactions/hoverEffects'
import { pressDownEffect } from '../animations/interactions/clickEffects'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { easingPresets } from '../animations/utils/easing'

function Navigation({ scenes, currentScene, onNavigate, onNext, onPrev }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const dotsRef = useRef([])
  const { shouldAnimate, getDuration } = useReducedMotion()

  // Animate active dot with pulse effect
  useEffect(() => {
    if (!shouldAnimate()) return

    dotsRef.current.forEach((dot, index) => {
      if (!dot) return
      
      const isActive = index === currentScene
      
      animate(dot, {
        scale: isActive ? 1.4 : 1,
        opacity: isActive ? 1 : 0.6,
        duration: getDuration(250),
        easing: easingPresets.snappy
      })

      // Add subtle pulse to active dot
      if (isActive) {
        animate(dot, {
          scale: [1.4, 1.5, 1.4],
          duration: getDuration(2000),
          easing: 'easeInOutQuad',
          loop: true
        })
      }
    })
  }, [currentScene, shouldAnimate, getDuration])

  const handleDotHover = useCallback((index, isEntering) => {
    const dot = dotsRef.current[index]
    if (!dot || index === currentScene || !shouldAnimate()) return

    scaleHover(dot, isEntering, {
      scale: 1.25,
      duration: getDuration(150)
    })
  }, [currentScene, shouldAnimate, getDuration])

  const handleDotClick = useCallback(async (index) => {
    const dot = dotsRef.current[index]
    if (!dot || !shouldAnimate()) {
      onNavigate(index)
      return
    }

    await pressDownEffect(dot, {
      scale: 0.9,
      duration: getDuration(100)
    })

    onNavigate(index)
  }, [onNavigate, shouldAnimate, getDuration])

  return (
    <>
      {/* Bottom navigation bar - subtle and minimal */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 opacity-40 hover:opacity-80 transition-opacity duration-300">
        {/* Prev arrow */}
        <button
          onClick={onPrev}
          disabled={currentScene === 0}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isDark 
              ? 'hover:bg-white/10' 
              : 'hover:bg-elastic-dev-blue/10'
          } ${currentScene === 0 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
        >
          <svg className={`w-3 h-3 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Scene dots */}
        <div className="flex items-center gap-1.5 px-2 py-1">
          {scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => handleDotClick(index)}
              onMouseEnter={() => handleDotHover(index, true)}
              onMouseLeave={() => handleDotHover(index, false)}
              className="group relative"
            >
              {/* Tooltip */}
              <span className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 backdrop-blur-sm rounded text-[10px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none ${
                isDark 
                  ? 'bg-white/10 text-white/80' 
                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/80'
              }`}>
                {scene.title}
              </span>
              
              {/* Dot */}
              <div
                ref={el => dotsRef.current[index] = el}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  index === currentScene
                    ? isDark ? 'bg-white/80' : 'bg-elastic-dev-blue/80'
                    : isDark 
                      ? 'bg-white/25 hover:bg-white/50'
                      : 'bg-elastic-dev-blue/25 hover:bg-elastic-dev-blue/50'
                }`}
                style={{ transform: 'scale(1)' }}
              />
            </button>
          ))}
        </div>

        {/* Next arrow */}
        <button
          onClick={onNext}
          disabled={currentScene === scenes.length - 1}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            isDark 
              ? 'hover:bg-white/10' 
              : 'hover:bg-elastic-dev-blue/10'
          } ${currentScene === scenes.length - 1 ? 'opacity-30 cursor-not-allowed' : 'opacity-100'}`}
        >
          <svg className={`w-3 h-3 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>


    </>
  )
}

export default Navigation
