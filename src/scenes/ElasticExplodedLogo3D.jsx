import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { useSceneMotion } from '../hooks/useSceneMotion'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTimeline, faGear, faDatabase, faMagnifyingGlass,
  faBrain, faChartLine, faArrowsRotate,
} from '@fortawesome/free-solid-svg-icons'

// ─────────────────────────────────────────────────────────────────────────────
// Official Elastic logo paths (from @elastic/eui `logo_elastic`, viewBox 0 0 32 32).
// Each piece is extruded into a 3D slab (stacked layers) and, when exploded,
// travels along ONE shared assembly axis — the scene's Z axis — so with the
// camera tilted isometrically, all parts track along the same dotted "raycast"
// like an iFixit teardown.
//   d      – SVG path        fill – brand hex
//   cx,cy  – centroid (0–32) → where the numbered chip anchors
//   pos    – px along the assembly axis when exploded (0 = center,
//            negative = near/front end, positive = far end)
//   name   – legend label   icon – FontAwesome icon shown in the legend
//            (same capability icons the unified-strategy scene uses)
// Array order = numbering; pos = physical position on the raycast.
// ─────────────────────────────────────────────────────────────────────────────
const PIECES = [
  {
    d: "M11.934 13.152l7.353 3.356 7.42-6.507c.107-.537.16-1.072.16-1.633 0-4.578-3.721-8.303-8.295-8.303a8.288 8.288 0 0 0-6.84 3.61l-1.234 6.409 1.436 3.068z",
    fill: "#FDD009", pos: -224, chipAngle: 45, name: "Ingestion", sub: "Agents · integrations · pipelines", icon: faTimeline, cx: 19.5, cy: 5.5,
  },
  {
    d: "M3.838 9.41c-2.251.747-3.817 2.907-3.817 5.284 0 2.314 1.43 4.38 3.576 5.198l7.07-6.398-1.298-2.776-5.53-1.308z",
    fill: "#17A7E0", pos: -168, chipAngle: -45, chipDist: 70, name: "Processing", sub: "Transform · enrich · route", icon: faGear, cx: 5.3, cy: 14.6,
  },
  {
    d: "M20.642 27.284a3.945 3.945 0 0 0 2.4.822 3.977 3.977 0 0 0 3.972-3.975c0-.484-.08-.948-.24-1.383l-5.036-1.18-1.096 5.716z",
    fill: "#92C73D", pos: -124, chipAngle: 45, chipDist: 28, name: "Storage", sub: "Indices · tiers · snapshots", icon: faDatabase, cx: 23.6, cy: 25,
  },
  {
    // internal: lives inside the assembly, only visible in the teardown.
    // fillDark: the brand mark renders this piece white on dark backgrounds.
    d: "M16 9.5a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0 -13z",
    fill: "#37424E", fillDark: "#FFFFFF", pos: 0, chipAngle: 45, name: "Search", sub: "Query · relevance · vectors", icon: faMagnifyingGlass, cx: 16, cy: 16, internal: true,
  },
  {
    d: "M4.276 8.208L9.315 9.4l1.104-5.736a3.976 3.976 0 0 0-2.413-.815 3.978 3.978 0 0 0-3.971 3.976c0 .484.08.948.24 1.383",
    fill: "#EE5097", pos: 124, chipAngle: -45, chipDist: 46, chipZ: -12, name: "Visualization", sub: "Dashboards · reports", icon: faChartLine, cx: 7, cy: 6.2,
  },
  {
    d: "M21.667 20.247l5.543 1.298c2.252-.745 3.818-2.907 3.818-5.284a5.553 5.553 0 0 0-3.583-5.19l-7.25 6.36 1.472 2.816z",
    fill: "#0678A0", pos: 168, chipAngle: 45, chipDist: 36, name: "AI & ML", sub: "Anomaly detection · GenAI", icon: faBrain, cx: 25.5, cy: 15.7,
  },
  {
    d: "M4.322 20.947a8.461 8.461 0 0 0-.162 1.657c0 4.59 3.731 8.326 8.317 8.326a8.288 8.288 0 0 0 6.873-3.646l1.224-6.387-1.634-3.127-7.383-3.368-7.235 6.545z",
    fill: "#23BAB1", pos: 224, chipAngle: -135, chipDist: 26, name: "Automation", sub: "Rules · actions · workflows", icon: faArrowsRotate, cx: 12, cy: 24,
  },
]

// ── Tuning knobs ─────────────────────────────────────────────────────────────
const SIZE = 340         // px, square stage each piece's SVG fills
const LAYERS = 14        // stacked copies per piece → extrusion thickness
const LAYER_GAP = 1.15   // px between layers (thickness ≈ LAYERS × LAYER_GAP)
const AXIS_ROLL = -135   // deg, screen angle of the assembly axis
const TILT_X = 56        // deg, how far the assembly leans back when exploded
const TILT_Z = -AXIS_ROLL // counter-rotation keeps the artwork upright
const EASE = "cubic-bezier(0.34, 1.35, 0.4, 1)"

function ElasticExplodedLogo3D({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)
  const [exploded, setExploded] = useState(false)
  const [hovered, setHovered] = useState(null)

  const eyebrow = metadata.eyebrow || 'The Elastic Search AI Platform'
  const titlePlain = metadata.titlePlain || 'From ingest to action. '
  const titleAccent = metadata.titleAccent || 'One engine.'
  const subtitle = metadata.subtitle
    || 'Ingestion, search, ML, and automation are usually separate products held together by connectors and sync jobs. In Elastic, they are layers of the same engine, working on the same data in place.'

  const { playKey, isPlaying, replay, toggleAutoplay } = useSceneMotion(1, { holdMs: 5000 })

  const moveMs = prefersReducedMotion ? 1 : 750
  const fadeMs = prefersReducedMotion ? 1 : 400

  const ink = isDark ? '#FFFFFF' : '#1C1E23'
  const muted = isDark ? 'rgba(255,255,255,0.55)' : '#8A8F98'
  const faint = isDark ? 'rgba(255,255,255,0.35)' : '#B0B4BB'
  const chipBg = isDark ? '#101C3F' : '#FFFFFF'
  // Pieces with a dark-mode variant (the Search core is white on dark, per the brand mark).
  const pieceFill = (p) => (isDark && p.fillDark ? p.fillDark : p.fill)

  // Entrance + reset on replay.
  useEffect(() => {
    setExploded(false)
    setHovered(null)
    const el = rootRef.current
    if (!el || prefersReducedMotion) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(90), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [playKey, prefersReducedMotion])

  const toggle = () => setExploded((v) => !v)
  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div ref={rootRef} className="max-w-[1240px] mx-auto w-full flex-1 flex flex-col min-h-0 xlogo3d">
        <style>{`
          .xlogo3d .piece {
            position: absolute;
            inset: 0;
            transform-style: preserve-3d;
            transition: transform ${moveMs}ms ${EASE}, opacity ${fadeMs}ms ease;
            pointer-events: none;
          }
        `}</style>

        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        <div className="flex-1 min-h-0 flex items-center justify-center">
          {/* Legend — left rail. Collapses to zero width when assembled so the
              logo sits dead-center in both states; expanding on explode
              recenters the legend + diagram as one group. */}
          <div
            style={{
              width: exploded ? 360 : 0,
              flexShrink: 0,
              overflow: 'hidden',
              opacity: exploded ? 1 : 0,
              pointerEvents: exploded ? 'auto' : 'none',
              transition: prefersReducedMotion
                ? 'none'
                : `width ${moveMs}ms ${EASE}, opacity 350ms ease 400ms`,
            }}
          >
          <div
            style={{
              width: 315,
              display: 'flex',
              flexDirection: 'column',
              gap: 22,
            }}
          >
            {PIECES.map((p, i) => (
              <div
                key={p.name}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  fontSize: 17,
                  color: ink,
                  transition: 'opacity 150ms ease',
                  cursor: 'default',
                  opacity: hovered === null || hovered === i ? 1 : 0.35,
                }}
              >
                <span style={{ font: "600 14px ui-monospace, SFMono-Regular, Menlo, monospace", color: muted, width: 24, marginTop: 9 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    background: `${pieceFill(p)}22`,
                    color: pieceFill(p),
                    fontSize: 17,
                  }}
                >
                  <FontAwesomeIcon icon={p.icon} />
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, gap: 2 }}>
                  <span style={{ fontWeight: p.internal ? 700 : 500 }}>{p.name}</span>
                  <span style={{ font: "500 12.5px ui-monospace, SFMono-Regular, Menlo, monospace", color: faint, whiteSpace: 'nowrap' }}>
                    {p.sub}
                  </span>
                </span>
              </div>
            ))}
          </div>
          </div>

          {/* Stage column */}
          <div className="flex flex-col items-center min-h-0" style={{ flex: '0 1 auto' }}>
          {/* Viewport — camera flat when assembled, isometric when exploded */}
          <div
            className="reveal"
            role="button"
            tabIndex={0}
            onClick={toggle}
            onKeyDown={onKeyDown}
            aria-pressed={exploded}
            aria-label={exploded ? 'Reassemble the Elastic logo' : 'Explode the Elastic logo into its parts'}
            style={{
              width: SIZE + 240,
              maxWidth: '100%',
              flex: '1 1 auto',
              minHeight: 0,
              maxHeight: SIZE + 220,
              perspective: 1400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              outline: 'none',
            }}
          >
            <div
              style={{
                width: SIZE,
                height: SIZE,
                position: 'relative',
                transformStyle: 'preserve-3d',
                // The leftmost rotateZ pins the Z assembly axis to a fixed screen
                // diagonal (AXIS_ROLL) so the raycast never wanders.
                transform: exploded
                  ? `rotateZ(${AXIS_ROLL}deg) rotateX(${TILT_X}deg) rotateZ(${TILT_Z}deg)`
                  : 'none',
                transition: `transform ${moveMs}ms ${EASE}`,
              }}
            >
              {PIECES.map((p, i) => {
                const z = exploded ? p.pos : 0
                const lift = hovered === i ? 14 : 0
                const tucked = p.internal && !exploded // hidden inside the assembly
                return (
                  <div
                    key={p.name}
                    className="piece"
                    style={{
                      transform: `translateZ(${z + lift}px) scale(${tucked ? 0.4 : 1})`,
                      opacity: tucked ? 0 : 1,
                      transitionDelay: prefersReducedMotion
                        ? '0ms'
                        : exploded
                          ? `${i * 50}ms`
                          : `${(PIECES.length - 1 - i) * 45}ms`,
                    }}
                  >
                    {/* extrusion: stacked layers; lower layers darkened = side walls */}
                    {Array.from({ length: LAYERS }, (_, k) => {
                      const top = k === LAYERS - 1
                      return (
                        <svg
                          key={k}
                          viewBox="0 0 32 32"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            pointerEvents: 'none',
                            transform: `translateZ(${k * LAYER_GAP}px)`,
                            filter: top ? 'none' : 'brightness(0.68)',
                          }}
                        >
                          <path
                            d={p.d}
                            fill={pieceFill(p)}
                            style={top ? { pointerEvents: 'auto', cursor: 'pointer' } : undefined}
                            onMouseEnter={top ? () => setHovered(i) : undefined}
                            onMouseLeave={top ? () => setHovered(null) : undefined}
                          />
                        </svg>
                      )
                    })}

                    {/* numbered chip, billboarded to face the camera.
                        Explode fade lives on this anchor (all chips snap on
                        together after the parts settle — no per-piece trickle);
                        hover dimming lives on the inner chip so it stays instant. */}
                    <div
                      style={{
                        position: 'absolute',
                        width: 0,
                        height: 0,
                        transformStyle: 'preserve-3d',
                        transition: 'opacity 180ms ease',
                        pointerEvents: 'none',
                        left: `${(p.cx / 32) * 100}%`,
                        top: `${(p.cy / 32) * 100}%`,
                        opacity: exploded ? 1 : 0,
                        transitionDelay: exploded && !prefersReducedMotion ? '380ms' : '0ms',
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          transformOrigin: 'center bottom',
                          opacity: hovered === null || hovered === i ? 1 : 0.25,
                          transition: 'opacity 150ms ease',
                          // chipAngle fans the callout off the artwork; the number is
                          // counter-rotated below so it always reads upright.
                          // chipDist = anchor→chip distance; chipZ lifts the chip off
                          // the piece plane (positive = toward camera). Default 40.
                          transform: `translate(-50%, -50%) rotateZ(${-TILT_Z}deg) rotateX(${-TILT_X}deg) rotateZ(${-AXIS_ROLL + (p.chipAngle || 0)}deg) translateY(${-(p.chipDist || 46)}px) translateZ(${p.chipZ ?? 40}px)`,
                        }}
                      >
                        <div style={{ width: 1, height: 22, background: ink }} />
                        <div
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            background: chipBg,
                            border: `1.5px solid ${ink}`,
                            color: ink,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            font: "600 12px ui-monospace, SFMono-Regular, Menlo, monospace",
                            order: -1,
                            transform: `rotate(${-(p.chipAngle || 0)}deg)`,
                          }}
                        >
                          {i + 1}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          </div>
        </div>

        <SceneStepper onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} hidePills />
      </div>
    </div>
  )
}

export default ElasticExplodedLogo3D
