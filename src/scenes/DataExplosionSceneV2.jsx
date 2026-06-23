import { animate } from 'animejs'
import { useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'

// Bar heights in px — designed to fit within ~200px chart container
const eras = [
  { name: 'Mainframe',    year: '1960s',  structuredH: 20,  unstructuredH: 0   },
  { name: 'PC / Client',  year: '1980s',  structuredH: 26,  unstructuredH: 2   },
  { name: 'Internet',     year: '1990s',  structuredH: 34,  unstructuredH: 14  },
  { name: 'Cloud/Mobile', year: '2010s',  structuredH: 44,  unstructuredH: 46  },
  { name: 'AI Era',       year: '2020s+', structuredH: 58,  unstructuredH: 130, isActive: true },
]

const stats = [
  { end: 175, suffix: 'ZB', label: 'of data generated in 2025',         source: 'IDC / Seagate "Data Age 2025"' },
  { end: 90,  suffix: '%',   label: 'of enterprise data is unstructured', source: 'IBM Research'                  },
  { end: 68,  suffix: '%',   label: 'is "dark data" — never analyzed',    source: 'Seagate / IDC Research'        },
]

function DataExplosionSceneV2({ metadata = {}, verdictSignal = 0 }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const eyebrow    = metadata.eyebrow    || 'The Challenge'
  const verdictLine1 = metadata.verdictLine1 || null
  const verdictLine2 = metadata.verdictLine2 || null

  const resolvedStats = stats.map((stat, i) => ({
    ...stat,
    end:    metadata.stats?.[i]?.end    != null ? Number(metadata.stats[i].end) : stat.end,
    suffix: metadata.stats?.[i]?.suffix || stat.suffix,
    label:  metadata.stats?.[i]?.label  || stat.label,
    source: metadata.stats?.[i]?.source || stat.source,
  }))

  const chartRef        = useRef(null)
  const barRefs         = useRef([])
  const labelRefs       = useRef([])
  const statRefs        = useRef([])
  const counterRefs     = useRef([])
  const verdictLine1Ref = useRef(null)
  const verdictLine2Ref = useRef(null)

  const unstructuredColor = isDark ? '#48EFCF' : '#0B64DD'
  const structuredColor   = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(16,28,63,0.10)'

  useEffect(() => {
    const animations = []

    // Act 1 — Chart section fades in
    animations.push(
      animate(chartRef.current, {
        opacity: [0, 1],
        duration: 400,
        delay: 300,
        easing: 'easeOutCubic',
      })
    )

    // Act 2b — Era bars grow upward from bottom, staggered left to right
    barRefs.current.forEach((bar, i) => {
      if (!bar) return
      animations.push(
        animate(bar, {
          scaleY: [0, 1],
          duration: 700,
          delay: 400 + i * 130,
          easing: 'easeOutCubic',
        })
      )
    })

    // Act 2d — Era labels appear below the bars
    labelRefs.current.forEach((label, i) => {
      if (!label) return
      animations.push(
        animate(label, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 400,
          delay: 600 + i * 130,
          easing: 'easeOutCubic',
        })
      )
    })

    // Act 3 — Stat cards slide up, staggered
    statRefs.current.forEach((card, i) => {
      if (!card) return
      animations.push(
        animate(card, {
          opacity: [0, 1],
          translateY: [24, 0],
          duration: 500,
          delay: 1500 + i * 120,
          easing: 'easeOutCubic',
        })
      )
    })

    // Act 3b — Counters count up sequentially (each waits for the previous)
    counterRefs.current.forEach((el, i) => {
      if (!el) return
      const state = { value: 0 }
      animations.push(
        animate(state, {
          value: resolvedStats[i].end,
          duration: 1100,
          delay: 1700 + i * 500,
          easing: 'easeOutCubic',
          onUpdate: () => {
            el.textContent = `${Math.round(state.value)}${resolvedStats[i].suffix}`
          },
        })
      )
    })

    return () => animations.forEach(a => a?.pause?.())
  }, [])

  // Reveal verdict box when signal fires
  useEffect(() => {
    if (verdictSignal === 0 || !verdictLine2Ref.current) return
    animate(verdictLine2Ref.current, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 500,
      easing: 'easeOutCubic',
    })
  }, [verdictSignal])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-4 pb-4 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-4">

        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain="An Unprecedented "
          titleAccent="Data Explosion"
          subtitle={verdictLine1 ?? (
            <>
              Most data goes{' '}
              <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>unsearched</span>,{' '}
              <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>unanalyzed</span>,{' '}
              <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>unutilized</span>.
            </>
          )}
        />

        {/* Era Chart — fills available space between header and stats */}
        <div ref={chartRef} className="flex-1 min-h-0 flex flex-col" style={{ opacity: 0 }}>
          <div className="flex items-center gap-6 mb-2">
            <p className={`text-xs font-semibold uppercase tracking-widest ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
              The Evolution of Data
            </p>
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: unstructuredColor }} />
                <span className={`text-xs ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>Unstructured</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2 h-2 rounded-sm"
                  style={{
                    backgroundColor: structuredColor,
                    outline: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(16,28,63,0.2)',
                  }}
                />
                <span className={`text-xs ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>Structured</span>
              </div>
            </div>
          </div>

          {/* Bars + labels — flex-1 fills remaining chart space */}
          <div className="flex-1 min-h-0 flex items-end gap-3">
            {eras.map((era, i) => {
              const totalH = era.structuredH + era.unstructuredH
              return (
                <div key={era.name} className="flex-1 flex flex-col items-center">
                  <div
                    ref={el => { barRefs.current[i] = el }}
                    className={`w-full flex flex-col rounded-t-md overflow-hidden origin-bottom ${
                      era.isActive ? (isDark ? 'ring-2 ring-elastic-teal/60' : 'ring-2 ring-elastic-blue/50') : ''
                    }`}
                    style={{ height: totalH }}
                  >
                    <div style={{ flex: `0 0 ${era.unstructuredH}px`, backgroundColor: unstructuredColor }} />
                    <div style={{ flex: `0 0 ${era.structuredH}px`, backgroundColor: structuredColor }} />
                  </div>

                  <div
                    ref={el => { labelRefs.current[i] = el }}
                    className="mt-1.5 text-center"
                    style={{ opacity: 0 }}
                  >
                    <div className={`text-xs font-semibold ${
                      era.isActive
                        ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue')
                        : (isDark ? 'text-white/70' : 'text-elastic-dev-blue/70')
                    }`}>
                      {era.name}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                      {era.year}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Stats — 3 columns, numbers front and center */}
        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          {resolvedStats.map((stat, i) => (
            <div
              key={stat.label}
              ref={el => { statRefs.current[i] = el }}
              className={`px-5 py-4 rounded-xl border text-center ${
                isDark
                  ? 'bg-white/[0.04] border-white/10'
                  : 'bg-white border-elastic-dev-blue/10 shadow-sm'
              }`}
              style={{ opacity: 0 }}
            >
              <div className={`text-4xl md:text-5xl font-extrabold font-mono tracking-tight ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                <span ref={el => { counterRefs.current[i] = el }}>
                  0{stat.suffix}
                </span>
              </div>
              <p className={`text-sm mt-2 leading-paragraph ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                {stat.label}
              </p>
              <p className={`text-xs mt-1 italic ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                {stat.source}
              </p>
            </div>
          ))}
        </div>

        {/* Verdict line 2 — lands last */}
        <div
          ref={verdictLine2Ref}
          className={`flex-shrink-0 px-6 py-4 rounded-xl border ${
            isDark
              ? 'bg-elastic-teal/5 border-elastic-teal/20'
              : 'bg-elastic-blue/5 border-elastic-blue/20'
          }`}
          style={{ opacity: 0 }}
        >
          <p
            className={`text-lg md:text-xl text-center font-medium ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}
          >
            {verdictLine2 ?? (
              <>
                Speed. Scale. Flexibility.{' '}
                <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                  Innovation demands all three — simultaneously.
                </span>
              </>
            )}
          </p>
        </div>

      </div>
    </div>
  )
}

export default DataExplosionSceneV2
