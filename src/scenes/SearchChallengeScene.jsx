import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const MONO = { fontFamily: 'Space Mono, ui-monospace, monospace' }

const BEATS = [
  {
    key: 'tip',
    step: 'Surface',
    titlePlain: 'What you can see ',
    titleAccent: 'is the tip.',
    subtitle: 'Structured, indexed, governed — a thin slice above the waterline.',
    hold: 5000,
  },
  {
    key: 'depth',
    step: 'Depth',
    titlePlain: '80% of data is ',
    titleAccent: 'unstructured.',
    subtitle: 'And it resists self-service by humans and agents.',
    hold: 7000,
  },
]

const STRUCTURED_SOURCES = [
  { label: 'Relational databases', tone: '#48EFCF' },
  { label: 'Data warehouses', tone: '#48EFCF' },
  { label: 'CRM & ERP records', tone: '#F5A623' },
  { label: 'Transactional tables', tone: '#F5A623' },
  { label: 'Metrics & KPIs', tone: '#7EE787' },
]

const UNSTRUCTURED_SOURCES = [
  { label: 'Documents', tone: '#48EFCF' },
  { label: 'PDFs', tone: '#48EFCF' },
  { label: 'Email', tone: '#48EFCF' },
  { label: 'Chat messages', tone: '#F5A623' },
  { label: 'Transcripts', tone: '#F5A623' },
  { label: 'Audio & video', tone: '#F5A623' },
  { label: 'Images', tone: '#7EE787' },
  { label: 'Presentations', tone: '#7EE787' },
  { label: 'Contracts', tone: '#F04E98' },
  { label: 'Support tickets', tone: '#F04E98' },
  { label: 'Source code', tone: '#A0AEC0' },
  { label: 'Log files', tone: '#A0AEC0' },
]

// Submerged ice, traced from the reference illustration into the 420x460 viewBox:
// waterline at y=152, tip at y=442. Nested subpaths are the cracks, so this needs evenodd fill.
const SUBMERGED_ICE =
  'M52 152L144 152L161.8 222.9L163.5 219.2L177.7 152L196.8 152L177.7 206.2L176 214.1L187.7 262.3L199.8 307.2L199.3 316.9L200.2 316.5L215.3 274.3L218.4 268.3L217.5 256.2L213.6 237.2L199.8 152L224.4 152L220.5 272L221.4 271.5L223.5 265L227.4 248.8L246.4 152.5L261.6 152L252.5 206.2L252.5 211.8L257.7 202L262 189.5L265.5 182.6L275 152.5L295.3 152L272.4 180.7L268.9 184L267.6 186.7L258.1 285.9L245.6 341.5L246.4 341.5L274.5 290.1L275 281.2L272.8 231.7L272.8 210.4L296.6 155.2L298.3 152L310.8 152L304.8 177.9L301.8 195.1L302.2 196.5L313.4 165.4L317.3 152L322.9 152L322.9 153.4L308.2 188.6L309.1 188.6L313 182.6L331.1 152.5L332.4 152L300 205.3L298.7 228.9L275 272L275.8 289.1L274.1 292.8L244.3 347L222.7 397.1L214 397.1L213.2 398L196.3 442.5L195.5 441.5L179.9 375.8L179 375.8L178.2 379.9L176 398L175.6 399.8L174.7 399.4L160.9 362.8L154.8 358.6L152.2 354L138.4 316.9L129.8 308.6L126.8 297.5L111.6 253.5L87.9 219.6L81 188.1L74 185.4L80.1 185.8L70.1 162.7L69.3 162.2L69.3 164.5L72.7 182.6L74 184.4L73.2 184.9L52 152Z' +
  'M301.3 152.9L298.3 163.6L291.4 197.4L287.5 230.8L278 263.6L295.7 233.1L297.9 227.5L299.6 186.3L301.8 158.5L301.3 152.9Z' +
  'M103.4 153.9L103.9 157.1L146.6 251.6L153.5 268.7L161.3 284L161.8 279.9L157 222L103.4 153.9Z' +
  'M96.5 159.9L91.3 214.5L92.6 218.7L103.4 239.6L107.7 247L110.8 250.2L100.8 183L96.5 159.9Z' +
  'M259.4 200.2L228.3 274.8L212.3 315.5L209.7 320.2L214.5 361.4L215.3 360.9L220.5 343.8L225.7 322.5L255.1 218.7L259.4 200.2Z' +
  'M118.5 225.2L118.5 231.7L126.8 280.3L129.8 304.4L130.6 308.6L133.7 310.4L131.1 258.5L118.5 225.2Z' +
  'M172.1 247L171.3 249.7L170 307.7L186.4 351.7L185.1 332.2L181.2 300.2L172.1 247Z' +
  'M141 268.3L141 273.8L147.9 312.8L153.5 353.1L154.4 356.8L157.9 359.1L158.7 352.1L159.2 318.8L141 268.3Z' +
  'M242.6 284L241.3 287.3L229.6 353.1L226.1 367.9L221.8 395.2L242.1 349.8L242.6 284Z' +
  'M201.1 329.9L201.1 394.3L197.2 436L214 393.8L209.7 369.3L201.1 329.9Z' +
  'M166.1 331.7L165.6 333.1L172.1 378.1L174.3 391L175.6 393.8L179.5 367L166.1 331.7Z'

function overlaySourceList(defaults, labels) {
  if (!labels?.length) return defaults
  return labels.map((label, i) => ({
    ...(defaults[i] || { tone: defaults[defaults.length - 1]?.tone || '#A0AEC0' }),
    label,
  }))
}

function SearchChallengeScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]
  const deep = beat >= 1
  const structuredSources = overlaySourceList(STRUCTURED_SOURCES, metadata.structuredSources)
  const unstructuredSources = overlaySourceList(UNSTRUCTURED_SOURCES, metadata.unstructuredSources)
  const depthCaption = metadata.depthCaption || 'Unstructured · Siloed · Invisible to AI'

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const ink = isDark ? '#fff' : '#1a1a1a'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const eyebrow = metadata.eyebrow || 'Search · The Challenge'
  const ease = prefersReducedMotion ? 'opacity 0.25s' : '0.75s cubic-bezier(.22,.8,.24,1)'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: prefersReducedMotion ? 1 : 420,
      delay: prefersReducedMotion ? 0 : stagger(45),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden relative">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isDark
            ? 'radial-gradient(ellipse 70% 55% at 70% 55%, rgba(72,239,207,0.07) 0%, transparent 55%)'
            : 'radial-gradient(ellipse 70% 55% at 70% 55%, rgba(11,100,221,0.06) 0%, transparent 55%)',
        }}
        aria-hidden
      />

      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0 relative z-10">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal shrink-0">
            <SceneHeader
              eyebrow={eyebrow}
              titlePlain={current.titlePlain}
              titleAccent={current.titleAccent}
              subtitle={current.subtitle}
            />
          </div>

          <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 sm:gap-4">
            <div className="reveal flex-1 min-h-0 w-full flex items-center justify-center">
              <svg
                viewBox="-40 46 600 406"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full"
                aria-hidden
              >
                <defs>
                  <linearGradient id="sc-ice-face" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={isDark ? '#F2FFFC' : '#FFFFFF'} />
                    <stop offset="100%" stopColor={isDark ? '#CDEFE7' : '#E4F1FB'} />
                  </linearGradient>
                  <linearGradient id="sc-shard" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity="0.92" />
                    <stop offset="100%" stopColor={accent} stopOpacity="0.62" />
                  </linearGradient>
                </defs>

                {/* Submerged mass — fractured ice below the waterline */}
                <path
                  d={SUBMERGED_ICE}
                  fillRule="evenodd"
                  fill="url(#sc-shard)"
                  stroke={accent}
                  strokeOpacity="0.5"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                  style={{
                    opacity: deep ? 1 : 0.12,
                    transition: ease,
                  }}
                />

                {/* Waterline */}
                <line
                  x1="-34"
                  y1="151"
                  x2="552"
                  y2="151"
                  stroke={accent}
                  strokeWidth="2"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Above water — wide faceted ridge */}
                <g>
                  <path
                    d="M52 151 L78 126 L92 138 L108 110 L124 124 L140 92 L158 104 L176 62 L196 84 L206 66 L218 96 L232 86 L246 118 L258 104 L272 128 L286 116 L300 136 L314 128 L330 151 Z"
                    fill="url(#sc-ice-face)"
                    stroke={accent}
                    strokeOpacity="0.5"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                  <g fill={isDark ? 'rgba(72,239,207,0.16)' : 'rgba(11,100,221,0.07)'}>
                    <path d="M176 62 L200 120 L196 84 Z" />
                    <path d="M232 86 L228 130 L246 118 Z" />
                    <path d="M108 110 L100 132 L92 138 Z" />
                    <path d="M286 116 L292 138 L300 136 Z" />
                  </g>
                  <g
                    fill="none"
                    stroke={accent}
                    strokeOpacity="0.45"
                    strokeWidth="1"
                    strokeLinejoin="round"
                  >
                    <path d="M176 62 L162 151" />
                    <path d="M176 62 L150 116 L124 124" />
                    <path d="M150 116 L140 92" />
                    <path d="M150 116 L156 151" />
                    <path d="M176 62 L200 120 L206 66" />
                    <path d="M200 120 L204 151" />
                    <path d="M200 120 L218 96" />
                    <path d="M232 86 L228 130 L246 118" />
                    <path d="M228 130 L226 151" />
                    <path d="M228 130 L204 151" />
                    <path d="M108 110 L100 132 L92 138" />
                    <path d="M100 132 L96 151" />
                    <path d="M100 132 L124 124" />
                    <path d="M258 104 L262 140 L272 128" />
                    <path d="M262 140 L258 151" />
                    <path d="M286 116 L292 138 L300 136" />
                    <path d="M292 138 L288 151" />
                    <path d="M314 128 L310 151" />
                    <path d="M78 126 L84 151" />
                  </g>
                </g>

                {/* Above-water label */}
                <g transform="translate(300 48)">
                  <rect
                    width="250"
                    height="40"
                    rx="20"
                    fill={isDark ? 'rgba(7,11,18,0.92)' : 'rgba(255,255,255,0.96)'}
                    stroke={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,100,221,0.25)'}
                    strokeWidth="1.3"
                  />
                  <text
                    x="125"
                    y="26"
                    textAnchor="middle"
                    fill={ink}
                    fontSize="12"
                    fontFamily="Space Mono, monospace"
                    fontWeight="600"
                  >
                    Structured · Indexed · Governed
                  </text>
                </g>

                {/* 80% callout */}
                <g
                  style={{
                    opacity: deep ? 1 : 0,
                    transition: prefersReducedMotion ? 'opacity 0.2s' : 'opacity 0.55s ease 0.12s',
                  }}
                >
                  <text
                    x="-24"
                    y="388"
                    fill={accent}
                    fontSize="52"
                    fontWeight="700"
                    fontFamily="Space Mono, monospace"
                  >
                    80%
                  </text>
                  <text
                    x="-22"
                    y="412"
                    fill={isDark ? 'rgba(255,255,255,0.55)' : 'rgba(26,26,26,0.5)'}
                    fontSize="11"
                    fontFamily="Space Mono, monospace"
                  >
                    below the waterline
                  </text>
                </g>

                {/* Below-water label */}
                <g
                  transform="translate(282 410)"
                  style={{
                    opacity: deep ? 1 : 0,
                    transition: prefersReducedMotion ? 'opacity 0.2s' : 'opacity 0.55s ease 0.22s',
                  }}
                >
                  <rect
                    width="268"
                    height="40"
                    rx="20"
                    fill={isDark ? 'rgba(7,11,18,0.92)' : 'rgba(255,255,255,0.96)'}
                    stroke={accent}
                    strokeWidth="1.4"
                    strokeOpacity="0.7"
                  />
                  <text
                    x="134"
                    y="26"
                    textAnchor="middle"
                    fill={accent}
                    fontSize="10.5"
                    fontFamily="Space Mono, monospace"
                    fontWeight="600"
                  >
                    {depthCaption}
                  </text>
                </g>
              </svg>
            </div>

            <div className="reveal shrink-0 flex flex-wrap justify-center gap-2 max-w-4xl">
              {(deep ? unstructuredSources : structuredSources).map((t) => {
                // The multi-hue palette only carries on the dark canvas; on light it washes out.
                const tone = isDark ? t.tone : accent
                return (
                  <span
                    key={t.label}
                    className="text-[11px] sm:text-xs font-semibold rounded-full px-3 py-1.5 border"
                    style={{
                      borderColor: `${tone}${deep ? '99' : '55'}`,
                      color: tone,
                      opacity: deep ? 1 : 0.65,
                      transition: ease,
                      ...MONO,
                    }}
                  >
                    {t.label}
                  </span>
                )
              })}
            </div>

            <p className={`reveal shrink-0 text-center text-sm leading-relaxed max-w-3xl ${mutedText}`}>
              Organizations still run separate data governance regimes. Without a common retrieval
              layer, every AI query crosses a trust boundary it was never designed to cross —
              unstructured content stays{' '}
              <span className={headText}>siloed and invisible to agents</span>.
            </p>
          </div>
        </div>

        <div className="shrink-0 relative z-20">
          <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
        </div>
      </div>
    </div>
  )
}

export default SearchChallengeScene
