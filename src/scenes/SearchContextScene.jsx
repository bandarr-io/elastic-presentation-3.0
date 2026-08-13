import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const BEATS = [
  {
    key: 'missing',
    step: 'Missing Layer',
    titlePlain: 'The Context Layer Is the ',
    titleAccent: 'Missing Layer',
    subtitle: 'Most architectures jump from data straight to models — leaving retrieval, memory, and governance hand-rolled.',
    hold: 4800,
  },
  {
    key: 'inside',
    step: 'Inside',
    titlePlain: 'Inside Elastic’s ',
    titleAccent: 'Context Layer',
    subtitle: 'Agent Builder and the Context Engine curate what AI sees and enforce permissions before the model.',
    hold: 5600,
  },
  {
    key: 'flow',
    step: 'Benefits',
    titlePlain: 'What the Context Engine ',
    titleAccent: 'Delivers',
    subtitle: 'Sources converge; governed, citable, agent-ready outcomes radiate out.',
    hold: 5600,
  },
]

const LAYERS = [
  { id: 'agents', name: 'Agents & AI Experiences', sub: 'research UIs · chat · agentic workflows' },
  { id: 'models', name: 'AI Models', sub: 'LLM · vector embeddings · rerankers' },
  { id: 'data', name: 'Datastore', sub: 'vectors · documents · time series · hybrid' },
]

const AGENT_BUILDER = ['Tool registry', 'Skills registry', 'Workflows', 'Prompt management']
const CONTEXT_ENGINE = ['Semantic metadata', 'Memory management', 'Knowledge bases', 'Entity graphs']

const SOURCES = [
  'Documents & knowledge bases',
  'Databases & warehouses',
  'SaaS & APIs',
  'Observability signals',
  'Streams & events',
]

const BENEFITS = [
  'Grounded retrieval',
  'Governed access — DLS before LLM',
  'Citable, auditable results',
  'Usage & cost attribution',
  'MCP-native agent substrate',
]

function chipWidth(label) {
  return Math.min(240, Math.max(88, label.length * 7.2 + 28))
}

function curve(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mx.toFixed(1)} ${y1.toFixed(1)}, ${mx.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function StackTrack({ color, leak, prefersReducedMotion }) {
  return (
    <div className="relative h-9 shrink-0">
      <div
        className="absolute left-1/2 -translate-x-1/2 w-px h-full"
        style={{ background: `${color}55` }}
      />
      {!prefersReducedMotion && [0, 1, 2].map((i) => (
        <span
          key={i}
          className={leak ? 'ctx-token-leak' : 'ctx-token-up'}
          style={{
            animationDelay: `${i * 0.55}s`,
            background: '#ffffff',
            border: `1.4px solid ${color}`,
          }}
        />
      ))}
    </div>
  )
}

function LayerBand({ name, sub, color, panel, headText, mutedText }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-3.5 ${panel}`}
      style={{ borderColor: `${color}88` }}
    >
      <div className={`text-sm font-bold leading-tight ${headText}`}>{name}</div>
      <div className={`text-xs mt-0.5 ${mutedText}`}>{sub}</div>
    </div>
  )
}

function GapSlot({ accent, mono }) {
  return (
    <div
      className="ctx-gap rounded-2xl border-2 border-dashed px-5 py-5 text-center"
      style={{ borderColor: `${accent}77`, color: accent }}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold" style={mono}>
        Missing
      </div>
      <div className="text-base font-bold mt-0.5">Context Layer</div>
      <div className="text-xs mt-1 opacity-70">retrieval · memory · ontology · skills · tools</div>
    </div>
  )
}

function InsideLayer({ accent, engineColor, panel, mono, prefersReducedMotion, playKey }) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const chips = [...el.querySelectorAll('.ctx-chip')]
    if (prefersReducedMotion) {
      chips.forEach((c) => { c.style.opacity = '1' })
      el.style.opacity = '1'
      el.style.transform = 'none'
      return undefined
    }
    el.style.opacity = '0'
    el.style.transform = 'translateY(16px)'
    const layerAnim = animate(el, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: 620,
      ease: 'outCubic',
    })
    const chipAnim = animate(chips, {
      opacity: [0, 1],
      duration: 380,
      delay: stagger(40, { start: 280 }),
      ease: 'outCubic',
    })
    return () => {
      layerAnim?.pause?.()
      chipAnim?.pause?.()
    }
  }, [playKey, prefersReducedMotion])

  return (
    <div
      ref={ref}
      className={`rounded-2xl border-2 px-5 py-4 ${panel}`}
      style={{ borderColor: accent }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-8 h-8 object-contain" />
        <div>
          <div className="text-sm font-bold" style={{ color: accent }}>Context Layer</div>
          <div className="text-[10px] uppercase tracking-wider" style={{ color: accent, ...mono }}>
            permissions fire before the model
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: accent, ...mono }}>
            Agent Builder
          </div>
          <div className="flex flex-wrap gap-1.5">
            {AGENT_BUILDER.map((t) => (
              <span
                key={t}
                className="ctx-chip text-xs rounded-full px-2.5 py-1 border"
                style={{ borderColor: `${accent}99`, color: accent }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: engineColor, ...mono }}>
            Context Engine
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CONTEXT_ENGINE.map((t) => (
              <span
                key={t}
                className="ctx-chip text-xs rounded-full px-2.5 py-1 border"
                style={{ borderColor: `${engineColor}99`, color: engineColor }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function CtxChip({ label, color, x, y, width, live = false }) {
  return (
    <span
      className={`ctx-flow-chip absolute text-xs rounded-full px-2.5 py-1 border whitespace-nowrap ${live ? 'inf-chip-live' : ''}`}
      style={{
        left: x,
        top: y,
        width,
        transform: 'translate(0, -50%)',
        boxSizing: 'border-box',
        display: 'inline-flex',
        justifyContent: 'center',
        borderColor: `${color}${live ? 'ff' : '99'}`,
        color,
        background: 'transparent',
        boxShadow: live ? `0 0 0 1px ${color}, 0 0 16px ${color}` : 'none',
        zIndex: live ? 20 : 10,
      }}
    >
      {label}
    </span>
  )
}

function ConvergeRadiate({ accent, isDark, mono, playKey, prefersReducedMotion }) {
  const wrapRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(0)
  const sourceColor = isDark ? '#7EB4FF' : '#0B64DD'
  const benefitColor = isDark ? '#FEC514' : '#153385'

  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const measure = () => {
      const r = el.getBoundingClientRect()
      setBox({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const w = box.w
  const h = box.h
  const cx = w / 2
  const cy = h / 2
  const hubR = 86
  const srcW = Math.max(...SOURCES.map(chipWidth))
  const benW = Math.max(...BENEFITS.map(chipWidth))
  const srcX = 24
  const benX = w - 24 - benW
  const gap = Math.min(44, h * 0.14)

  const sources = SOURCES.map((label, i) => ({
    label,
    x: srcX,
    y: cy + (i - (SOURCES.length - 1) / 2) * gap,
    color: sourceColor,
    width: srcW,
  }))
  const benefits = BENEFITS.map((label, i) => ({
    label,
    x: benX,
    y: cy + (i - (BENEFITS.length - 1) / 2) * gap,
    color: benefitColor,
    width: benW,
  }))

  const inPaths = sources.map((s) => curve(s.x + s.width, s.y, cx - hubR, cy))
  const outPaths = benefits.map((b) => curve(cx + hubR, cy, b.x, b.y))
  const flowPaths = [...inPaths, ...outPaths]
  const flowColors = [...inPaths.map(() => sourceColor), ...outPaths.map(() => benefitColor)]
  const allChips = [...sources, ...benefits]

  useEffect(() => {
    const root = wrapRef.current
    if (!root || w === 0) return undefined
    const paths = [...root.querySelectorAll('.ctx-flow-path')]
    const chips = [...root.querySelectorAll('.ctx-flow-chip')]
    const hub = root.querySelector('.ctx-flow-hub')
    if (prefersReducedMotion) {
      paths.forEach((p) => { p.style.strokeDashoffset = '0' })
      chips.forEach((c) => { c.style.opacity = '1' })
      if (hub) hub.style.opacity = '1'
      return undefined
    }
    paths.forEach((p) => {
      const len = p.getTotalLength()
      p.style.strokeDasharray = `${len}`
      p.style.strokeDashoffset = `${len}`
    })
    const pathAnim = animate(paths, {
      strokeDashoffset: 0,
      duration: 780,
      delay: stagger(45),
      ease: 'outCubic',
    })
    const chipAnim = animate(chips, {
      opacity: [0, 1],
      duration: 400,
      delay: stagger(36, { start: 220 }),
      ease: 'outCubic',
    })
    const hubAnim = hub
      ? animate(hub, { opacity: [0, 1], duration: 480, ease: 'outCubic' })
      : null
    return () => {
      pathAnim?.pause?.()
      chipAnim?.pause?.()
      hubAnim?.pause?.()
    }
  }, [w, h, playKey, prefersReducedMotion])

  useEffect(() => {
    if (w === 0 || prefersReducedMotion) return undefined
    const id = setInterval(() => setLive((n) => (n + 1) % allChips.length), 1100)
    return () => clearInterval(id)
  }, [w, allChips.length, playKey, prefersReducedMotion])

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0">
      {w > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
            {flowPaths.map((d, i) => (
              <path
                key={`glow-${i}`}
                d={d}
                fill="none"
                stroke={flowColors[i]}
                strokeWidth="6"
                strokeOpacity="0.12"
                strokeLinecap="round"
              />
            ))}
            {flowPaths.map((d, i) => (
              <path
                key={`path-${i}`}
                className="ctx-flow-path"
                d={d}
                fill="none"
                stroke={flowColors[i]}
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ))}
            {!prefersReducedMotion && flowPaths.map((d, i) => (
              [0, 1].map((slot) => (
                <circle key={`dot-${i}-${slot}`} r="4.5" fill="#ffffff" stroke={flowColors[i]} strokeWidth="1.4">
                  <animateMotion
                    dur={`${2.1 + (i % 4) * 0.18}s`}
                    repeatCount="indefinite"
                    begin={`${(0.8 + slot * 1.05 + i * 0.14).toFixed(2)}s`}
                    path={d}
                    rotate="0"
                  />
                </circle>
              ))
            ))}
          </svg>

          <div
            className="absolute text-[10px] uppercase tracking-wider font-semibold pointer-events-none"
            style={{ left: srcX, top: Math.max(10, sources[0].y - 56), color: sourceColor, ...mono }}
          >
            Data sources
          </div>
          {sources.map((s, i) => (
            <CtxChip key={s.label} {...s} live={i === live} />
          ))}

          <div
            className="absolute text-[10px] uppercase tracking-wider font-semibold pointer-events-none"
            style={{ left: benX, top: Math.max(10, benefits[0].y - 56), color: benefitColor, ...mono }}
          >
            Benefits
          </div>
          {benefits.map((b, i) => (
            <CtxChip key={b.label} {...b} live={i + SOURCES.length === live} />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className="ctx-flow-hub inf-hub relative rounded-full border-2 flex flex-col items-center justify-center text-center px-4 w-[172px] h-[172px]"
              style={{ borderColor: accent, background: `${accent}14`, '--inf-accent': accent }}
            >
              <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-12 h-12 object-contain" />
              <div className="text-[10px] uppercase tracking-wider font-semibold mt-1.5" style={{ color: accent, ...mono }}>
                Context Engine
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function SearchContextScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const engineColor = isDark ? '#FEC514' : '#153385'
  const bandColor = isDark ? '#7EB4FF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const panel = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-elastic-dev-blue/12 shadow-sm'
  const eyebrow = metadata.eyebrow || 'Search · Context Layer'
  const mono = { fontFamily: 'Space Mono, ui-monospace, monospace' }

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: prefersReducedMotion ? 1 : 400,
      delay: prefersReducedMotion ? 0 : stagger(40),
      ease: 'outCubic',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  const agents = LAYERS[0]
  const models = LAYERS[1]
  const data = LAYERS[2]

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal shrink-0">
            <SceneHeader
              eyebrow={eyebrow}
              titlePlain={current.titlePlain}
              titleAccent={current.titleAccent}
              subtitle={current.subtitle}
            />
          </div>

          {(beat === 0 || beat === 1) && (
            <div className="flex-1 min-h-0 flex flex-col mt-1">
              <div className="reveal flex-1 min-h-0 flex flex-col justify-center max-w-3xl mx-auto w-full">
                <LayerBand {...agents} color={bandColor} panel={panel} headText={headText} mutedText={mutedText} />
                <StackTrack color={bandColor} leak={false} prefersReducedMotion={prefersReducedMotion} />
                <LayerBand {...models} color={bandColor} panel={panel} headText={headText} mutedText={mutedText} />
                <StackTrack color={accent} leak={beat === 0} prefersReducedMotion={prefersReducedMotion} />
                {beat === 0 ? (
                  <GapSlot accent={accent} mono={mono} />
                ) : (
                  <InsideLayer
                    accent={accent}
                    engineColor={engineColor}
                    panel={panel}
                    mono={mono}
                    prefersReducedMotion={prefersReducedMotion}
                    playKey={playKey}
                  />
                )}
                <StackTrack color={accent} leak={beat === 0} prefersReducedMotion={prefersReducedMotion} />
                <LayerBand {...data} color={isDark ? '#F990C6' : '#101C3F'} panel={panel} headText={headText} mutedText={mutedText} />
              </div>
              <p className="reveal shrink-0 text-center text-lg mt-3 mb-1" style={{ color: accent }}>
                {beat === 0
                  ? 'Jump the gap and retrieval stays a DIY project.'
                  : 'What the model sees is curated — and governed.'}
              </p>
            </div>
          )}

          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col mt-1">
              <div className="reveal shrink-0 flex justify-center gap-5 mb-2">
                {[
                  { short: 'Data sources', color: isDark ? '#7EB4FF' : '#0B64DD' },
                  { short: 'Benefits', color: isDark ? '#FEC514' : '#153385' },
                ].map((g) => (
                  <div key={g.short} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: g.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                    {g.short}
                  </div>
                ))}
              </div>
              <ConvergeRadiate
                accent={accent}
                isDark={isDark}
                mono={mono}
                playKey={playKey}
                prefersReducedMotion={prefersReducedMotion}
              />
              <p className="reveal shrink-0 text-center text-lg mt-2 mb-1" style={{ color: accent }}>
                Governed context in. Agent-ready answers out.
              </p>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default SearchContextScene
