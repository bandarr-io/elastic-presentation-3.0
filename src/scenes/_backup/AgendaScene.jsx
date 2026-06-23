import { animate, stagger } from 'animejs'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAnimationTimeline } from '../hooks/useAnimationTimeline'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { createEntranceTimeline } from '../animations/utils/timeline'
import { easingPresets } from '../animations/utils/easing'
import { getGridStagger } from '../animations/utils/stagger'
import { fadeUpReveal } from '../animations/reveals/textReveals'
import { gridDataReveal } from '../animations/reveals/dataReveals'
import { liftHover, glowHover } from '../animations/interactions/hoverEffects'

// Color palette that cycles based on position in the agenda
const colorPalette = [
  '#0B64DD',  // Blue
  '#48EFCF',  // Teal
  '#F04E98',  // Pink
  '#FF957D',  // Light Poppy
  '#FEC514',  // Yellow
]

function AgendaScene({ scenes = [] }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [hoveredItem, setHoveredItem] = useState(null)
  const headerRef = useRef(null)
  const itemsRef = useRef([])

  // Animation hooks
  const { shouldAnimate, getDuration } = useReducedMotion()

  // Filter out scenes that shouldn't appear in the agenda
  // Colors are assigned based on position, cycling through the palette
  const agendaItems = scenes
    .filter(scene => !scene.hideFromAgenda)
    .map((scene, index) => ({
      id: index + 1,
      title: scene.title,
      description: scene.description || '',
      color: colorPalette[index % colorPalette.length],
      duration: scene.duration || '',
    }))

  // Cinematic entrance timeline: header → grid reveal
  useEffect(() => {
    if (!shouldAnimate()) {
      // Instant reveal for reduced motion
      if (headerRef.current) {
        headerRef.current.style.opacity = '1'
      }
      itemsRef.current.forEach(item => {
        if (item) item.style.opacity = '1'
      })
      return
    }

    const timeline = createEntranceTimeline({ autoplay: true })

    // Stage 1: Header reveal
    if (headerRef.current) {
      timeline.add({
        targets: headerRef.current,
        opacity: [0, 1],
        translateY: [50, 0],
        duration: getDuration(700),
        easing: easingPresets.entrance
      })
    }

    // Stage 2: Grid items reveal with alternating directions
    const validItems = itemsRef.current.filter(item => item)
    if (validItems.length > 0) {
      validItems.forEach((item, index) => {
        const direction = index % 2 === 0 ? -30 : 30
        timeline.add({
          targets: item,
          opacity: [0, 1],
          translateX: [direction, 0],
          scale: [0.95, 1],
          duration: getDuration(600),
          easing: easingPresets.entrance
        }, `-=${getDuration(450)}`) // Overlap for smoother flow
      })
    }

    return () => {
      if (timeline) {
        timeline.pause()
      }
    }
  }, [agendaItems.length, shouldAnimate, getDuration])

  const handleItemHover = (itemId, isEntering) => {
    setHoveredItem(isEntering ? itemId : null)
    
    if (!shouldAnimate()) return

    const index = agendaItems.findIndex(item => item.id === itemId)
    if (index !== -1 && itemsRef.current[index]) {
      liftHover(itemsRef.current[index], isEntering, {
        scale: 1.03,
        translateY: -6,
        shadowColor: isDark ? 'rgba(72, 239, 207, 0.2)' : 'rgba(11, 100, 221, 0.15)',
        duration: getDuration(250)
      })
    }
  }

  return (
    <div className="scene">
      <div className="max-w-5xl mx-auto w-full">
        {/* Header */}
        <div
          ref={headerRef}
          className="text-center"
          style={{ opacity: 0 }}
        >
          <span className={`text-eyebrow text-sm pt-8 mb-4 block ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            Overview
          </span>
          <h2 className={`text-headline text-4xl md:text-5xl font-extrabold mb-4 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Today's <span className="gradient-text">Agenda</span>
          </h2>
          <p className={`text-paragraph text-lg md:text-xl max-w-3xl mx-auto pt-1 pb-8 ${isDark ? 'text-elastic-light-grey' : 'text-elastic-ink'}`}>
            A roadmap for our conversation.
          </p>
        </div>

        {/* Agenda Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {agendaItems.map((item, index) => (
            <div
              key={item.id}
              ref={el => itemsRef.current[index] = el}
              className={`relative p-5 rounded-xl border overflow-hidden cursor-pointer group ${
                isDark 
                  ? 'bg-white/[0.03] border-white/10' 
                  : 'bg-white/80 border-elastic-dev-blue/10'
              }`}
              style={{ opacity: 0 }}
              onMouseEnter={() => handleItemHover(item.id, true)}
              onMouseLeave={() => handleItemHover(item.id, false)}
            >
              {/* Left accent bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                style={{ 
                  backgroundColor: isDark ? item.color : '#0B64DD',
                  transform: hoveredItem === item.id ? 'scaleY(1)' : 'scaleY(0.3)',
                  transition: 'transform 0.2s ease-out'
                }}
              />

              {/* Glow effect on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: isDark 
                    ? `radial-gradient(circle at 0% 50%, ${item.color}15, transparent 60%)`
                    : `radial-gradient(circle at 0% 50%, rgba(11, 100, 221, 0.1), transparent 60%)`,
                }}
              />

              <div className="relative flex items-center gap-4">
                {/* Number */}
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm text-code flex-shrink-0"
                  style={{ 
                    backgroundColor: isDark ? `${item.color}20` : 'rgba(11, 100, 221, 0.1)',
                    color: isDark ? item.color : '#0B64DD',
                  }}
                >
                  {String(item.id).padStart(2, '0')}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className={`text-headline text-lg font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className={`text-paragraph text-sm ${isDark ? 'text-elastic-light-grey/70' : 'text-elastic-ink'}`}>
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Duration badge */}
                {item.duration && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                    isDark ? 'bg-white/5 text-white/40' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/50'
                  }`}>
                    {item.duration}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AgendaScene
