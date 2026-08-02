import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSceneMotion } from '../hooks/useSceneMotion'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserTie, faUsers, faUserGroup, faGears, faTriangleExclamation, faGem,
} from '@fortawesome/free-solid-svg-icons'

// Slide 4 — "Your SOC has to evolve": the triage pyramid morphs into the
// diamond model. Beats 0/1 reshape one figure; beat 2 shows both side by side.

const BEATS = [
  {
    key: 'pyramid', step: 'Pyramid', figLabel: 'Triage Pyramid',
    titlePlain: 'The triage ', titleAccent: 'pyramid.',
    caption: 'Slow, manual triage. Built on burnout \u2014 and mathematically impossible to scale against AI-speed adversaries.',
  },
  {
    key: 'diamond', step: 'Diamond', figLabel: 'Diamond Model',
    titlePlain: 'The ', titleAccent: 'diamond model.',
    caption: 'Triage drops to automation. Analysts rise to investigation and engineering. Machine speed, with human judgment.',
  },
  {
    key: 'compare', step: 'Compare', figLabel: 'Pyramid \u2192 Diamond',
    titlePlain: 'The shift, ', titleAccent: 'side by side.',
    caption: '',
  },
]

// Each vertical slot's config for the pyramid vs. diamond state. Each band is a
// trapezoid defined by its top/bottom edge widths (% of figure), so the stack
// forms a continuous sloped silhouette; `tone` resolves to a color.
const SLOTS = [
  {
    pyramid: { label: 'Leads', note: 'Strategy & oversight', topW: 0, botW: 33.3, tone: 'accent', icon: faUserTie },
    diamond: { label: 'Leads', note: 'Strategy & oversight', topW: 0, botW: 66.7, tone: 'accent', icon: faUserTie },
  },
  {
    pyramid: { label: 'Sr. Analysts', note: 'Deep investigation', topW: 33.3, botW: 66.7, tone: 'muted', icon: faUsers },
    diamond: { label: 'SOC Analysts', note: 'Investigation & engineering', topW: 66.7, midW: 100, botW: 66.7, tone: 'accent', icon: faUserGroup },
  },
  {
    pyramid: { label: 'Entry-level triage analysts', note: 'Drowning in alerts', topW: 66.7, botW: 100, tone: 'warn', icon: faUsers },
    diamond: { label: 'Automation layer', note: 'Machine-speed triage', topW: 66.7, botW: 0, tone: 'accent', icon: faGears },
  },
]

// 6-point clip-path (top, mid, bottom edge widths, centered). Adding a midpoint
// on each side lets a band bulge at its center (true rhombus), while straight
// bands just place the midpoint on the top->bottom line. midW defaults to the
// average so straight-sided tiers render as plain trapezoids.
const bandShape = (topW, botW, midW = (topW + botW) / 2) =>
  `polygon(${50 - topW / 2}% 0%, ${50 + topW / 2}% 0%, ${50 + midW / 2}% 50%, ${50 + botW / 2}% 100%, ${50 - botW / 2}% 100%, ${50 - midW / 2}% 50%)`

// Short captions used for the two figures in the side-by-side comparison beat.
const COMPARE = {
  pyramid: { figLabel: 'Triage Pyramid', caption: 'Junior-heavy. Burnout. Breaks at AI speed.' },
  diamond: { figLabel: 'Diamond Model', caption: 'Automated triage. Analysts elevated. Scales.' },
}

// The single flanking panel — content matches the current beat's model.
const PYRAMID_PANEL = { heading: 'The Pyramid', tone: 'warn', icon: faTriangleExclamation, items: ['Junior-heavy alert triage', 'Burnout, churn, and cost', 'Breaks at AI attack speed'] }
const DIAMOND_PANEL = { heading: 'The Diamond', tone: 'accent', icon: faGem, items: ['Triage pushed to automation', 'Analysts elevated to engineering', 'Scales with machine-speed threats'] }

function SidePanel({ heading, items, icon, color, headText, mutedText, cardBase }) {
  return (
    <div className={`reveal rounded-2xl border p-5 ${cardBase}`} style={{ borderColor: `${color}80`, backgroundColor: `${color}10` }}>
      <div className="flex items-center gap-2 mb-3">
        <FontAwesomeIcon icon={icon} style={{ color }} />
        <span className={`font-bold ${headText}`}>{heading}</span>
      </div>
      <ul className="space-y-2.5">
        {items.map((t, i) => (
          <li key={i} className={`flex items-start gap-2.5 text-sm leading-snug ${mutedText}`}>
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  )
}

// One SOC model figure: a label pill + a sloped 3-band silhouette (pyramid or
// diamond) with labels overlaid on each band + optional caption.
function ModelFigure({ variant, figLabel, caption, colors, headText, mutedText, transition, compact, height = 240, maxWidth = 440 }) {
  const { accent, warn, slate } = colors
  const pillColor = variant === 'diamond' ? accent : warn
  const tone = (t) => (t === 'accent' ? accent : t === 'warn' ? warn : slate)
  return (
    <div className="flex flex-col items-center w-full mx-auto" style={{ maxWidth }}>
      <span className="reveal text-[11px] font-bold uppercase tracking-wider mb-3 px-3 py-1 rounded-full" style={{ color: pillColor, backgroundColor: `${pillColor}18` }}>
        {figLabel}
      </span>
      <div className="w-full flex flex-col" style={{ height }}>
        {SLOTS.map((slot, i) => {
          const cfg = slot[variant]
          const c = tone(cfg.tone)
          // Top tier bottom-aligns to its wide base, bottom tier top-aligns to
          // its wide top, middle tier stays centered — keeps labels off the points.
          const isTop = i === 0
          const isBottom = i === SLOTS.length - 1
          // Top tier hugs its wide base, bottom tier hugs its wide top, middle
          // stays centered. Stacked icon + smaller text keeps the cluster short
          // enough to stay inside the diamond's tapering end tiers.
          const align = isTop ? 'justify-end pb-3' : isBottom ? 'justify-start pt-3' : 'justify-center'
          return (
            <div key={i} className="relative flex-1">
              {/* sloped trapezoid fill */}
              <div className="absolute inset-0" style={{ clipPath: bandShape(cfg.topW, cfg.botW, cfg.midW), backgroundColor: `${c}33`, transition }} />
              {/* overlaid label cluster (icon above text, never clipped) */}
              <div className={`absolute inset-0 flex flex-col items-center gap-1 text-center px-4 ${align}`}>
                <FontAwesomeIcon icon={cfg.icon} style={{ color: c }} className={`shrink-0 ${compact ? 'text-sm' : 'text-lg'}`} />
                <div className="min-w-0">
                  <div className={`font-bold leading-tight ${compact ? 'text-xs' : 'text-base'} ${headText}`}>{cfg.label}</div>
                  <div className={`leading-tight ${compact ? 'text-[11px]' : 'text-xs'} ${mutedText}`}>{cfg.note}</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      {caption && <p className={`reveal text-center text-sm leading-snug mt-4 ${mutedText}`}>{caption}</p>}
    </div>
  )
}

function SecuritySOCModelScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]
  const isCompare = beat === 2
  const isDiamond = beat === 1

  const eyebrow = metadata.eyebrow || 'Elastic Security \u00b7 SOC Operating Model'
  const subtitle = metadata.subtitle ||
    "The traditional SOC pyramid \u2014 masses of junior analysts triaging alerts \u2014 can't scale against AI-powered adversaries. The future is the diamond model."

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const warn = '#f59e0b'
  const slate = isDark ? '#94a3b8' : '#64748b'
  const colors = { accent, warn, slate }
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [14, 0], duration: 460, delay: stagger(60), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const bandTransition = prefersReducedMotion
    ? 'none'
    : 'clip-path 720ms cubic-bezier(0.4,0,0.2,1), background-color 500ms ease'

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1200px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col">
          <SceneHeader reveal eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={subtitle} />

          {isCompare ? (
            // Keyed so it mounts fresh (no cross-beat width morph on the figures).
            <div key="compare" className="flex-1 min-h-0 grid grid-cols-2 gap-8 items-center">
              <ModelFigure variant="pyramid" figLabel={COMPARE.pyramid.figLabel} caption={COMPARE.pyramid.caption} colors={colors} headText={headText} mutedText={mutedText} transition="none" height={340} maxWidth={580} />
              <ModelFigure variant="diamond" figLabel={COMPARE.diamond.figLabel} caption={COMPARE.diamond.caption} colors={colors} headText={headText} mutedText={mutedText} transition="none" height={340} maxWidth={580} />
            </div>
          ) : (
            <div key="single" className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8 items-center">
              <ModelFigure variant={isDiamond ? 'diamond' : 'pyramid'} figLabel={current.figLabel} caption={current.caption} colors={colors} headText={headText} mutedText={mutedText} transition={bandTransition} height={400} maxWidth={700} />
              {(() => {
                const p = isDiamond ? DIAMOND_PANEL : PYRAMID_PANEL
                return <SidePanel heading={p.heading} items={p.items} icon={p.icon} color={p.tone === 'accent' ? accent : warn} headText={headText} mutedText={mutedText} cardBase={cardBase} />
              })()}
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default SecuritySOCModelScene
