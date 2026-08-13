import { useEffect, useRef } from 'react'
import { animate, createTimeline, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import CountUp from '../components/CountUp'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const BEATS = [
  {
    key: 'bottleneck',
    step: 'Bottleneck',
    titlePlain: 'CPU Indexing Is the ',
    titleAccent: 'Choke Point',
    subtitle: 'Vectors arrive faster than CPU can build HNSW graphs. The rest of the pipeline waits.',
    hold: 5200,
  },
  {
    key: 'gpu',
    step: 'GPU',
    titlePlain: 'NVIDIA Builds the Graph. ',
    titleAccent: 'Elasticsearch Serves It.',
    subtitle: 'cuVS constructs CAGRA on GPU, then converts to HNSW so the same cluster can search it.',
    hold: 6400,
  },
]

const NVIDIA = '#76B900'
const MEDIA_KINDS = ['doc', 'image', 'video', 'audio']
const STATS = [
  { value: 12, suffix: '×', label: 'indexing throughput' },
  { value: 7, suffix: '×', label: 'faster merges' },
  { value: 5, suffix: '×', label: 'cost-adjusted throughput' },
]

function MediaGlyph({ kind }) {
  if (kind === 'image') {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
        <rect x="4" y="5" width="16" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="10" r="1.6" fill="currentColor" />
        <path d="M6 17l4.2-4.5 2.6 2.4L16 12l4 5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    )
  }
  if (kind === 'video') {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
        <rect x="3.5" y="6" width="17" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M10 9.5v5l5-2.5z" fill="currentColor" />
      </svg>
    )
  }
  if (kind === 'audio') {
    return (
      <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
        <rect x="4" y="11" width="2.4" height="5" rx="0.8" fill="currentColor" />
        <rect x="8.2" y="8" width="2.4" height="8" rx="0.8" fill="currentColor" />
        <rect x="12.4" y="6" width="2.4" height="12" rx="0.8" fill="currentColor" />
        <rect x="16.6" y="9" width="2.4" height="7" rx="0.8" fill="currentColor" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <path d="M7 3.5h7.2L19 8.2V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1-1.5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M14 3.5V8h5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 12h6M9 15.5h6M9 19h3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function VectorGlyph() {
  const cells = [0.25, 0.9, 0.45, 1, 0.35, 0.7, 0.2, 0.85, 0.55, 0.4, 0.95, 0.3]
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {cells.map((op, i) => (
        <rect
          key={i}
          x={5.2 + (i % 4) * 3.6}
          y={7.2 + Math.floor(i / 4) * 3.4}
          width="2.8"
          height="2.6"
          rx="0.4"
          fill="currentColor"
          opacity={op}
        />
      ))}
    </svg>
  )
}

function DatabaseGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <ellipse cx="12" cy="6" rx="7.5" ry="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function JsonGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-full h-full" aria-hidden>
      <path d="M9 4c-2.4 0-3 1.8-3 4.2v2.2c0 1.2-.8 1.6-1.6 1.6.8 0 1.6.4 1.6 1.6v2.2c0 2.4.6 4.2 3 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M15 4c2.4 0 3 1.8 3 4.2v2.2c0 1.2.8 1.6 1.6 1.6-.8 0-1.6.4-1.6 1.6v2.2c0 2.4-.6 4.2-3 4.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M9.5 9.5h5M9.5 14.5h3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  )
}

function TokenGlyph({ variant, kind }) {
  if (variant === 'vector') return <VectorGlyph />
  if (variant === 'json') return <JsonGlyph />
  return <MediaGlyph kind={kind} />
}

function IndexFunnel({ color, fill, label, sub, headText, mono }) {
  return (
    <div
      className="gpu-index-card relative w-[240px] shrink-0 h-[168px] self-center"
      style={{ filter: `drop-shadow(0 0 18px ${color}40)` }}
    >
      <svg viewBox="0 0 240 168" className="absolute inset-0 w-full h-full" aria-hidden>
        <path
          d="M8 8 L8 160 L214 90 L232 90 L232 78 L214 78 Z"
          fill={fill}
          stroke={color}
          strokeWidth="1.8"
          strokeLinejoin="miter"
          strokeMiterlimit="8"
        />
      </svg>
      <div className="relative z-10 h-full flex flex-col justify-center pl-5 pr-12">
        <div className={`text-lg font-bold leading-tight ${headText}`}>{label}</div>
        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color, ...mono }}>
          {sub}
        </div>
      </div>
    </div>
  )
}

function IndexPipe({ color, fill, face, hole, label, sub, headText, mono }) {
  return (
    <div
      className="gpu-index-card relative w-[248px] shrink-0 h-[148px] self-center"
      style={{ filter: `drop-shadow(0 0 18px ${color}40)` }}
    >
      <svg viewBox="0 0 248 148" className="absolute inset-0 w-full h-full" aria-hidden>
        <path
          d="M32 12 H216 A20 62 0 0 1 216 136 H32 A20 62 0 0 1 32 12 Z"
          fill={fill}
          stroke={color}
          strokeWidth="1.8"
        />
        <ellipse cx="32" cy="74" rx="20" ry="62" fill={face} stroke={color} strokeWidth="1.8" />
        <ellipse cx="32" cy="74" rx="12" ry="40" fill={hole} />
        <ellipse cx="216" cy="74" rx="20" ry="62" fill={face} stroke={color} strokeWidth="1.8" />
        <ellipse cx="216" cy="74" rx="12" ry="40" fill={hole} />
      </svg>
      <div className="relative z-10 h-full flex flex-col justify-center items-center px-14 text-center">
        <div className={`text-lg font-bold leading-tight ${headText}`}>{label}</div>
        <div className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color, ...mono }}>
          {sub}
        </div>
      </div>
    </div>
  )
}

function PipelineTrack({ variant, pace, color, gpuOn, choke, chip, lanes = 3, fromSpout = false }) {
  const perLane = gpuOn ? 3 : 2
  const laneHeight = 50
  const trackHeight = lanes * laneHeight
  const durations = fromSpout
    ? gpuOn
      ? [0.85, 0.7, 0.95]
      : [3.2, 2.8, 3.6]
    : gpuOn
      ? [1.45, 1.2, 1.65]
      : pace === 'stall'
        ? [5.4, 4.7, 5.9]
        : [2.6, 2.15, 2.9]
  const paceClass = fromSpout
    ? 'gpu-token-spout'
    : pace === 'stall'
      ? 'gpu-token-stall'
      : pace === 'drip'
        ? 'gpu-token-drip'
        : gpuOn
          ? 'gpu-token-fast'
          : 'gpu-token-seg'
  const delayStep = fromSpout ? (gpuOn ? 0.16 : 0.48) : gpuOn ? 0.28 : 0.6

  return (
    <div
      className={`relative flex-1 min-w-[120px] self-center${fromSpout ? ' z-20 -ml-8' : ''}`}
      style={{ height: trackHeight }}
    >
      {fromSpout ? (
        <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
          {Array.from({ length: lanes }).map((_, lane) => (
            <line
              key={`rail-${lane}`}
              x1="0%"
              y1={trackHeight / 2}
              x2="100%"
              y2={lane * laneHeight + 25}
              stroke={`${color}33`}
              strokeWidth="2"
            />
          ))}
        </svg>
      ) : (
        Array.from({ length: lanes }).map((_, lane) => (
          <div
            key={`rail-${lane}`}
            className="absolute left-0 right-0 h-[2px]"
            style={{ top: lane * laneHeight + 24, background: `${color}33` }}
          />
        ))
      )}
      {choke && (
        <div
          className="gpu-choke absolute right-0 h-4 w-8 rounded-full"
          style={{
            top: trackHeight / 2,
            background: choke,
            boxShadow: `0 0 18px ${choke}`,
          }}
        />
      )}
      {Array.from({ length: lanes * perLane }).map((_, i) => {
        const lane = i % lanes
        const slot = Math.floor(i / lanes)
        const laneY = lane * laneHeight + 1
        const railStart = trackHeight / 2
        const railEnd = lane * laneHeight + 25
        return (
          <div
            key={`${variant}-${i}`}
            className={`gpu-token absolute w-12 h-12 rounded-lg p-1.5 ${paceClass}`}
            style={{
              top: fromSpout ? railStart : laneY,
              color,
              background: chip,
              animationDuration: fromSpout
                ? `${durations[lane % durations.length]}s, ${durations[lane % durations.length]}s`
                : `${durations[lane % durations.length]}s`,
              animationDelay: fromSpout
                ? `${(slot * delayStep + lane * 0.18).toFixed(2)}s, ${(slot * delayStep + lane * 0.18).toFixed(2)}s`
                : `${(slot * delayStep + lane * 0.18).toFixed(2)}s`,
              ...(fromSpout
                ? {
                    '--rail-y0': `${railStart}px`,
                    '--rail-y1': `${railEnd}px`,
                  }
                : null),
            }}
          >
            <TokenGlyph variant={variant} kind={MEDIA_KINDS[i % MEDIA_KINDS.length]} />
          </div>
        )
      })}
    </div>
  )
}

function GpuVectorPipelineScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)
  const pipeRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]
  const gpuOn = beat >= 1

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const danger = isDark ? '#F04E98' : '#0B64DD'
  const nvidia = isDark ? NVIDIA : '#0B64DD'
  const embed = isDark ? '#F5A623' : '#0B64DD'
  const indexColor = gpuOn ? nvidia : danger
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const panel = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-elastic-dev-blue/12 shadow-sm'
  const tokenChip = isDark ? '#0A1628' : '#F4F6F8'
  const eyebrow = metadata.eyebrow || 'Search · GPU Acceleration'
  const mono = { fontFamily: 'Space Mono, ui-monospace, monospace' }

  const stations = [
    { label: 'Your data', sub: 'Unstructured', color: accent, kind: 'media' },
    { label: 'Embedding', sub: 'Vectors', color: embed, kind: 'vector' },
    {
      label: gpuOn ? 'NVIDIA cuVS' : 'CPU indexing',
      sub: gpuOn ? 'CAGRA → HNSW' : 'HNSW bottleneck',
      color: indexColor,
      hot: true,
      kind: 'json',
    },
    { label: 'Elasticsearch', sub: 'Vector DB', color: accent, kind: 'database' },
  ]

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [12, 0],
      duration: prefersReducedMotion ? 1 : 420,
      delay: prefersReducedMotion ? 0 : stagger(50),
      ease: 'outCubic',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  useEffect(() => {
    const root = pipeRef.current
    if (!root) return undefined

    const indexCard = root.querySelector('.gpu-index-card')
    const handoff = root.querySelector('.gpu-handoff')
    const stats = root.querySelector('.gpu-stats')

    if (handoff) handoff.style.opacity = gpuOn ? '1' : '0'
    if (stats) stats.style.opacity = gpuOn ? '1' : '0'

    if (prefersReducedMotion) return undefined

    const tl = createTimeline({
      autoplay: false,
      defaults: { ease: 'inOutCubic', persist: true },
    })

    if (!gpuOn) {
      if (indexCard) {
        tl.add(indexCard, {
          boxShadow: [`0 0 0 0 ${danger}00`, `0 0 28px ${danger}44`],
          duration: 900,
        })
      }
    } else {
      if (handoff) {
        tl.add(handoff, {
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 420,
        })
      }
      if (stats) {
        tl.add(stats, {
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 480,
        }, '-=120')
      }
    }

    tl.play()
    return () => tl.pause()
  }, [beat, playKey, prefersReducedMotion, gpuOn, danger])

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

          <div ref={pipeRef} className="flex-1 min-h-0 flex flex-col justify-center gap-7 mt-2">
            <div className="reveal relative">
              <div className="flex items-stretch justify-center gap-0 w-full">
                {stations.map((s, i) => (
                  <div key={s.label} className="contents">
                    {s.hot ? (
                      gpuOn ? (
                        <IndexPipe
                          color={s.color}
                          fill={isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'}
                          face={isDark ? 'rgba(255,255,255,0.07)' : '#ffffff'}
                          hole={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(10,22,40,0.14)'}
                          label={s.label}
                          sub={s.sub}
                          headText={headText}
                          mono={mono}
                        />
                      ) : (
                        <IndexFunnel
                          color={s.color}
                          fill={isDark ? 'rgba(255,255,255,0.04)' : '#ffffff'}
                          label={s.label}
                          sub={s.sub}
                          headText={headText}
                          mono={mono}
                        />
                      )
                    ) : (
                      <div
                        className={`w-[210px] shrink-0 min-h-[148px] rounded-2xl border px-5 py-5 ${panel}`}
                        style={{ borderColor: `${s.color}66` }}
                      >
                        <div className={`text-xl font-bold leading-tight ${headText}`}>{s.label}</div>
                        <div className="text-xs uppercase tracking-wider mt-1" style={{ color: s.color, ...mono }}>
                          {s.sub}
                        </div>
                        <div className="mt-4 flex items-end gap-1.5 h-14">
                          {s.kind === 'media' && MEDIA_KINDS.map((kind) => (
                            <div
                              key={kind}
                              className="w-10 h-10 rounded-md p-1"
                              style={{ color: s.color, background: tokenChip }}
                            >
                              <MediaGlyph kind={kind} />
                            </div>
                          ))}
                          {s.kind === 'vector' && (
                            <div
                              className="w-12 h-12 rounded-md p-1.5"
                              style={{ color: s.color, background: tokenChip }}
                            >
                              <VectorGlyph />
                            </div>
                          )}
                          {s.kind === 'database' && (
                            <div
                              className="w-12 h-12 rounded-md p-1.5"
                              style={{ color: s.color, background: tokenChip }}
                            >
                              <DatabaseGlyph />
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    {i === 0 && (
                      <PipelineTrack variant="media" pace="flow" color={accent} gpuOn={gpuOn} chip={tokenChip} />
                    )}
                    {i === 1 && (
                      <PipelineTrack
                        variant="vector"
                        pace={gpuOn ? 'flow' : 'stall'}
                        color={embed}
                        gpuOn={gpuOn}
                        choke={gpuOn ? null : danger}
                        chip={tokenChip}
                      />
                    )}
                    {i === 2 && (
                      <PipelineTrack
                        variant="json"
                        pace={gpuOn ? 'flow' : 'drip'}
                        color={indexColor}
                        gpuOn={gpuOn}
                        chip={tokenChip}
                        fromSpout
                      />
                    )}
                  </div>
                ))}
              </div>

              <div
                className="gpu-handoff mt-3 text-center text-sm uppercase tracking-wider opacity-0"
                style={{ color: nvidia, ...mono }}
              >
                CAGRA on GPU → HNSW in Elasticsearch
              </div>
            </div>

            {gpuOn && (
              <div className="gpu-stats grid grid-cols-3 gap-4 w-full opacity-0">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-2xl border px-5 py-5 text-center ${panel}`}
                    style={{ borderColor: `${nvidia}55` }}
                  >
                    <div className="text-5xl font-bold tabular-nums" style={{ color: nvidia, ...mono }}>
                      <CountUp value={stat.value} replayKey={playKey} duration={1100} />
                      {stat.suffix}
                    </div>
                    <div className={`mt-1 text-base ${mutedText}`}>{stat.label}</div>
                  </div>
                ))}
              </div>
            )}

            <p className={`reveal text-center text-lg ${gpuOn ? headText : mutedText}`}>
              {gpuOn
                ? 'Same cluster. No sidecar vector database.'
                : 'Graph construction on CPU is the stage that cannot keep up.'}
            </p>
          </div>
        </div>

        <SceneStepper
          beats={beats}
          beat={beat}
          onGo={goTo}
          onReplay={replay}
          isPlaying={isPlaying}
          onTogglePlay={toggleAutoplay}
        />
      </div>
    </div>
  )
}

export default GpuVectorPipelineScene
