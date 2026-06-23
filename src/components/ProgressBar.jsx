import { useEffect, useRef } from 'react'
import { animate } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { easingPresets } from '../animations/utils/easing'

function ProgressBar({ current, total }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const progress = ((current + 1) / total) * 100
  const barRef = useRef(null)
  const glowRef = useRef(null)
  const { shouldAnimate, getDuration } = useReducedMotion()

  // Animate progress bar with smooth easing
  useEffect(() => {
    if (!barRef.current) return

    animate(barRef.current, {
      width: `${progress}%`,
      duration: getDuration(600),
      easing: easingPresets.smooth
    })

    // Add subtle glow animation if animations are enabled
    if (shouldAnimate(true) && glowRef.current) {
      animate(glowRef.current, {
        opacity: [0.8, 0.4, 0.8],
        scale: [1, 1.05, 1],
        duration: getDuration(1500),
        easing: 'easeInOutQuad',
        loop: true
      })
    }
  }, [progress, shouldAnimate, getDuration])

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 h-1 ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
      <div
        ref={barRef}
        className={`relative h-full ${isDark ? 'bg-gradient-to-r from-elastic-teal via-elastic-blue to-elastic-pink' : 'bg-gradient-to-r from-elastic-dev-blue to-elastic-blue'}`}
        style={{ width: 0, transformOrigin: 'left' }}
      >
        {/* Animated glow effect at the progress edge */}
        {shouldAnimate(true) && (
          <div
            ref={glowRef}
            className={`absolute right-0 top-0 h-full w-20 ${isDark ? 'bg-gradient-to-l from-elastic-teal/40 to-transparent' : 'bg-gradient-to-l from-elastic-dev-blue/40 to-transparent'}`}
            style={{ filter: 'blur(8px)' }}
          />
        )}
      </div>
    </div>
  )
}

export default ProgressBar

