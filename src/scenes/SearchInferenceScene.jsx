import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'

const BEATS = [
  {
    key: 'providers',
    step: 'Any Model',
    titlePlain: 'One Platform, ',
    titleAccent: 'Any Model',
    subtitle: 'Vector, LLM, and rerank providers plug into /_inference. Swap hosting without re-indexing when the model stays the same.',
    hold: 5600,
  },
  {
    key: 'sovereign',
    step: 'Sovereign',
    titlePlain: 'Inference in ',
    titleAccent: 'Sovereign AI',
    subtitle: 'Experiences route through Elasticsearch /_inference — public cloud or self-managed GPU.',
    hold: 5200,
  },
]

const GROUPS = [
  {
    title: 'Hyperscalers',
    short: 'Hyperscalers',
    items: ['AWS Bedrock', 'Amazon SageMaker', 'Azure OpenAI', 'Azure AI Foundry', 'Google Vertex AI', 'Google AI Studio', 'IBM watsonx.ai'],
    colorLight: '#0B64DD',
    colorDark: '#7EB4FF',
  },
  {
    title: 'Model Providers & Specialists',
    short: 'Model Providers',
    items: ['OpenAI', 'Anthropic', 'Mistral', 'Cohere', 'AI21 Labs', 'Voyage AI', 'Jina AI', 'Contextual AI', 'Fireworks AI', 'Groq'],
    colorLight: '#153385',
    colorDark: '#48EFCF',
  },
  {
    title: 'Self-Managed & Open Source',
    short: 'Self-Managed',
    items: ['NVIDIA NIM', 'Hugging Face', 'Llama Stack', 'OpenShift AI', 'Custom REST: vLLM', 'Ollama'],
    colorLight: '#0A52B3',
    colorDark: '#F990C6',
  },
  {
    title: 'Elastic-Native',
    short: 'Elastic-Native',
    items: ['Elastic Inference Service', 'Jina On-Prem', 'ELSER', 'E5 / Eland-hosted'],
    native: true,
    colorLight: '#101C3F',
    colorDark: '#FEC514',
  },
]

const HUB_R = 96
const ORBIT_SCALE = 0.93
const RING_ORDER = [1, 3, 0, 2]
const SECTOR_GAP = 12

function groupColor(group, isDark) {
  return isDark ? group.colorDark : group.colorLight
}

function chipWidth(label) {
  return Math.min(210, Math.max(72, label.length * 7.2 + 28))
}

function groupWeight(group) {
  const gap = 18
  return group.items.reduce((sum, item) => sum + chipWidth(item), 0) + Math.max(0, group.items.length - 1) * gap
}

function spread(count, startDeg, endDeg) {
  if (count <= 1) return [(startDeg + endDeg) / 2]
  return Array.from({ length: count }, (_, i) => startDeg + ((endDeg - startDeg) * i) / (count - 1))
}

function spreadByWidth(items, startDeg, endDeg) {
  const widths = items.map(chipWidth)
  const gap = 18
  const total = widths.reduce((sum, w) => sum + w, 0) + Math.max(0, items.length - 1) * gap
  let cursor = 0
  return items.map((_, i) => {
    const center = cursor + widths[i] / 2
    const t = total > 0 ? center / total : 0.5
    cursor += widths[i] + gap
    return startDeg + t * (endDeg - startDeg)
  })
}

function polar(cx, cy, rx, ry, deg, scale) {
  const rad = (deg * Math.PI) / 180
  return {
    x: cx + Math.cos(rad) * rx * scale,
    y: cy + Math.sin(rad) * ry * scale,
    rad,
    deg,
  }
}

function sectorPath(cx, cy, rx, ry, start, end, innerScale, outerScale) {
  const steps = 18
  const outer = spread(steps, start, end).map((d) => polar(cx, cy, rx, ry, d, outerScale))
  const inner = spread(steps, end, start).map((d) => polar(cx, cy, rx, ry, d, innerScale))
  const draw = (pts, cmd) => pts.map((p, i) => `${i ? 'L' : cmd} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  return `${draw(outer, 'M')} ${draw(inner, 'L')} Z`
}

function buildSectors() {
  const weights = RING_ORDER.map((index) => Math.max(groupWeight(GROUPS[index]), 320))
  const sum = weights.reduce((a, b) => a + b, 0)
  const usable = 360 - SECTOR_GAP * GROUPS.length
  const firstSweep = (weights[0] / sum) * usable
  let angle = -firstSweep / 2
  return RING_ORDER.map((index, i) => {
    const group = GROUPS[index]
    const sweep = (weights[i] / sum) * usable
    const start = angle
    const end = angle + sweep
    angle = end + SECTOR_GAP
    return { group, start, end }
  })
}

function layoutConstellation(width, height, isDark) {
  const cx = width / 2
  const cy = height / 2
  const rx = Math.max(240, width / 2 - 100)
  const ry = Math.max(152, height / 2 - 28)
  const sectors = buildSectors()
  const nodes = []

  sectors.forEach(({ group, start, end }) => {
    const color = groupColor(group, isDark)
    const pad = 3
    spreadByWidth(group.items, start + pad, end - pad).forEach((deg, i) => {
      const item = group.items[i]
      const p = polar(cx, cy, rx, ry, deg, ORBIT_SCALE)
      const rad = (deg * Math.PI) / 180
      nodes.push({
        key: item,
        item,
        native: Boolean(group.native),
        group: group.short,
        color,
        x: p.x,
        y: p.y,
        x0: cx + Math.cos(rad) * HUB_R,
        y0: cy + Math.sin(rad) * HUB_R,
      })
    })
  })

  const labels = sectors.map(({ group, start, end }) => {
    const p = polar(cx, cy, rx, ry, (start + end) / 2, 1.18)
    return {
      short: group.short,
      color: groupColor(group, isDark),
      x: Math.min(width - 48, Math.max(48, p.x)),
      y: Math.min(height - 14, Math.max(14, p.y)),
    }
  })
  return { nodes, labels, sectors, cx, cy, rx, ry }
}

const EXPERIENCES = ['Chat / RAG', 'Agentic Search', 'Autonomous Agents']
const PUBLIC = ['Elastic Inference Service', 'AWS / Azure / GCP', 'OpenAI / Anthropic', 'Model Aggregators']
const PRIVATE = ['Jina On-Prem', 'NVIDIA NIM', 'vLLM', 'Ollama']
const HUB_SPLIT_R = 92
const WELL_R = 42

function curve(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${mx.toFixed(1)} ${y1.toFixed(1)}, ${mx.toFixed(1)} ${y2.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`
}

function clusterEllipse(left, right, halfH, pad = 18) {
  const rx = ((right - left) / 2 + pad) * Math.SQRT2
  const ry = (halfH + pad) * Math.SQRT2
  return { cx: (left + right) / 2, rx, ry }
}

function SovChip({ label, color, x, y, align = 'left', live = false, width }) {
  const transform = align === 'right'
    ? 'translate(-100%, -50%)'
    : align === 'center'
      ? 'translate(-50%, -50%)'
      : 'translate(0, -50%)'
  return (
    <span
      className={`inf-sov-chip absolute text-xs rounded-full px-2.5 py-1 border whitespace-nowrap ${live ? 'inf-chip-live' : ''}`}
      style={{
        left: x,
        top: y,
        width,
        transform,
        boxSizing: 'border-box',
        display: 'inline-flex',
        justifyContent: 'center',
        borderColor: `${color}${live ? 'ff' : '99'}`,
        color,
        background: '#ffffff',
        boxShadow: live ? `0 0 0 1px ${color}, 0 0 16px ${color}` : 'none',
        zIndex: live ? 20 : 10,
      }}
    >
      {label}
    </span>
  )
}

function ExperienceRow({ label, index, color, x, y, width, mono }) {
  return (
    <div
      className="inf-sov-chip absolute flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
      style={{
        left: x,
        top: y,
        width,
        transform: 'translate(0, -50%)',
        borderColor: `${color}99`,
        color,
        background: '#ffffff',
        zIndex: 10,
      }}
    >
      <span className="text-[10px] font-semibold tabular-nums shrink-0" style={{ opacity: 0.45, ...mono }}>
        {String(index).padStart(2, '0')}
      </span>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </div>
  )
}

function DestinationWell({ label, color, x, y, live, mono }) {
  return (
    <div
      className="inf-sov-well absolute z-20 flex items-center justify-center rounded-full border-2 pointer-events-none"
      style={{
        left: x,
        top: y,
        width: WELL_R * 2,
        height: WELL_R * 2,
        transform: 'translate(-50%, -50%)',
        borderColor: color,
        background: '#ffffff',
        boxShadow: live ? `0 0 0 1px ${color}, 0 0 22px ${color}` : `0 0 14px ${color}33`,
      }}
    >
      <div
        className="text-[10px] uppercase tracking-wider font-semibold leading-tight text-center px-1.5"
        style={{ color, ...mono }}
      >
        {label}
      </div>
    </div>
  )
}

function SovereignSplit({ accent, isDark, headText, mono, playKey, prefersReducedMotion }) {
  const wrapRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(0)
  const publicColor = isDark ? '#7EB4FF' : '#0B64DD'
  const privateColor = isDark ? '#FEC514' : '#153385'

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
  const expX = 24
  const expW = 196
  const expGap = 62
  const destChipW = Math.max(...PUBLIC.map(chipWidth), ...PRIVATE.map(chipWidth))
  const CHIP_H = 26
  const forkX = cx + HUB_SPLIT_R + 52
  const wellX = Math.min(w - destChipW - WELL_R - 32, forkX + Math.max(150, w * 0.16))
  const split = Math.min(148, h * 0.34)
  const publicY = cy - split
  const privateY = cy + split
  const chipGap = Math.min(36, Math.max(28, split / 2.1))
  const chipX = wellX + WELL_R + 14
  const clusterLeft = wellX - WELL_R
  const clusterRight = chipX + destChipW
  const stackHalf = ((PUBLIC.length - 1) / 2) * chipGap + CHIP_H / 2
  const { cx: ovalCx, rx: ovalRx, ry: ovalRy } = clusterEllipse(
    clusterLeft,
    clusterRight,
    Math.max(stackHalf, WELL_R),
  )

  const experiences = EXPERIENCES.map((label, i) => ({
    label,
    index: i + 1,
    x: expX,
    y: cy + (i - 1) * expGap,
    color: accent,
  }))
  const publicChips = PUBLIC.map((label, i) => ({
    label,
    x: chipX,
    y: publicY + (i - (PUBLIC.length - 1) / 2) * chipGap,
    color: publicColor,
  }))
  const privateChips = PRIVATE.map((label, i) => ({
    label,
    x: chipX,
    y: privateY + (i - (PRIVATE.length - 1) / 2) * chipGap,
    color: privateColor,
  }))
  const destChips = [...publicChips, ...privateChips]

  const inPaths = experiences.map((e) => curve(e.x + expW, e.y, cx - HUB_SPLIT_R, cy))
  const trunk = `M ${(cx + HUB_SPLIT_R).toFixed(1)} ${cy.toFixed(1)} L ${forkX.toFixed(1)} ${cy.toFixed(1)}`
  const outPublic = curve(forkX, cy, wellX - WELL_R, publicY)
  const outPrivate = curve(forkX, cy, wellX - WELL_R, privateY)
  const rays = destChips.map((c) => (
    `M ${(wellX + WELL_R * 0.72).toFixed(1)} ${(c.y < cy ? publicY : privateY).toFixed(1)} L ${c.x.toFixed(1)} ${c.y.toFixed(1)}`
  ))
  const flowPaths = [...inPaths, trunk, outPublic, outPrivate]
  const flowColors = [...inPaths.map(() => accent), accent, publicColor, privateColor]

  useEffect(() => {
    const root = wrapRef.current
    if (!root || w === 0) return undefined
    const paths = [...root.querySelectorAll('.inf-sov-path')]
    const chips = [...root.querySelectorAll('.inf-sov-chip')]
    const wells = [...root.querySelectorAll('.inf-sov-well')]
    if (prefersReducedMotion) {
      paths.forEach((p) => { p.style.strokeDashoffset = '0' })
      chips.forEach((c) => { c.style.opacity = '1' })
      wells.forEach((n) => { n.style.opacity = '1' })
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
      delay: stagger(55),
      ease: 'outCubic',
    })
    const chipAnim = animate([...chips, ...wells], {
      opacity: [0, 1],
      duration: 420,
      delay: stagger(36, { start: 260 }),
      ease: 'outCubic',
    })
    return () => {
      pathAnim?.pause?.()
      chipAnim?.pause?.()
    }
  }, [w, h, playKey, prefersReducedMotion])

  useEffect(() => {
    if (w === 0 || prefersReducedMotion) return undefined
    const id = setInterval(() => setLive((n) => (n + 1) % destChips.length), 1100)
    return () => clearInterval(id)
  }, [w, destChips.length, playKey, prefersReducedMotion])

  const liveLane = live < PUBLIC.length ? 'public' : 'private'

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0">
      {w > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
            <ellipse cx={ovalCx} cy={publicY} rx={ovalRx} ry={ovalRy} fill={publicColor} fillOpacity={isDark ? 0.08 : 0.06} />
            <ellipse cx={ovalCx} cy={privateY} rx={ovalRx} ry={ovalRy} fill={privateColor} fillOpacity={isDark ? 0.08 : 0.06} />
            {flowPaths.map((d, i) => (
              <path
                key={`glow-${i}`}
                d={d}
                fill="none"
                stroke={flowColors[i]}
                strokeWidth={i === inPaths.length ? 8 : 6}
                strokeOpacity="0.14"
                strokeLinecap="round"
              />
            ))}
            {flowPaths.map((d, i) => (
              <path
                key={`path-${i}`}
                className="inf-sov-path"
                d={d}
                fill="none"
                stroke={flowColors[i]}
                strokeWidth={i === inPaths.length ? 2.4 : 1.8}
                strokeLinecap="round"
              />
            ))}
            {rays.map((d, i) => (
              <path
                key={`ray-${i}`}
                className="inf-sov-path"
                d={d}
                fill="none"
                stroke={destChips[i].color}
                strokeWidth="1.15"
                strokeOpacity="0.45"
              />
            ))}
            {!prefersReducedMotion && flowPaths.map((d, i) => (
              [0, 1].map((slot) => (
                <circle key={`dot-${i}-${slot}`} r="4.5" fill="#ffffff" stroke={flowColors[i]} strokeWidth="1.4">
                  <animateMotion
                    dur={`${2.05 + (i % 3) * 0.22}s`}
                    repeatCount="indefinite"
                    begin={`${(0.85 + slot * 1.05 + i * 0.16).toFixed(2)}s`}
                    path={d}
                    rotate="0"
                  />
                </circle>
              ))
            ))}
          </svg>

          <div
            className="inf-sov-well absolute rounded-2xl border pointer-events-none"
            style={{
              left: expX - 12,
              top: experiences[0].y - 52,
              width: expW + 24,
              height: experiences[2].y - experiences[0].y + 96,
              borderColor: `${accent}44`,
              background: isDark ? `${accent}12` : `${accent}0a`,
            }}
          >
            <div
              className="absolute left-3 top-2.5 text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: accent, ...mono }}
            >
              Experiences
            </div>
          </div>
          {experiences.map((e) => (
            <ExperienceRow
              key={e.label}
              label={e.label}
              index={e.index}
              color={e.color}
              x={e.x}
              y={e.y}
              width={expW}
              mono={mono}
            />
          ))}

          <DestinationWell
            label={<>Elastic<br />Cloud</>}
            color={publicColor}
            x={wellX}
            y={publicY}
            live={liveLane === 'public'}
            mono={mono}
          />
          <DestinationWell
            label={<>Your<br />GPU</>}
            color={privateColor}
            x={wellX}
            y={privateY}
            live={liveLane === 'private'}
            mono={mono}
          />
          {destChips.map((c, i) => (
            <SovChip key={c.label} label={c.label} color={c.color} x={c.x} y={c.y} width={destChipW} live={i === live} />
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <InferenceHub accent={accent} headText={headText} mono={mono} size="lg" />
          </div>
        </>
      )}
    </div>
  )
}

function InferenceHub({ accent, mono, size = 'md', children }) {
  const box = size === 'lg' ? 'w-[184px] h-[184px]' : 'w-[112px] h-[112px]'
  const glyph = size === 'lg' ? 'w-16 h-16' : 'w-9 h-9'
  return (
    <div
      className={`inf-hub relative rounded-full border-2 flex flex-col items-center justify-center text-center px-4 ${box}`}
      style={{
        borderColor: accent,
        background: `${accent}14`,
        '--inf-accent': accent,
      }}
    >
      <img
        src="/logo-elastic-glyph-color.png"
        alt="Elastic"
        className={`${glyph} object-contain`}
      />
      <div
        className={`${size === 'lg' ? 'text-xl' : 'text-sm'} mt-1.5 tracking-wide`}
        style={{ color: accent, ...mono }}
      >
        /_inference
      </div>
      {children}
    </div>
  )
}

function ProviderConstellation({ accent, isDark, headText, mono, playKey, prefersReducedMotion }) {
  const wrapRef = useRef(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  const [live, setLive] = useState(0)

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

  const layout = useMemo(
    () => (box.w > 0 ? layoutConstellation(box.w, box.h, isDark) : null),
    [box, isDark],
  )
  const nodes = layout?.nodes || []
  const labels = layout?.labels || []
  const sectors = layout?.sectors || []
  const cx = layout?.cx || 0
  const cy = layout?.cy || 0
  const rx = layout?.rx || 0
  const ry = layout?.ry || 0

  useEffect(() => {
    const root = wrapRef.current
    if (!root || !nodes.length) return undefined
    const chips = [...root.querySelectorAll('.inf-chip')]
    const rays = [...root.querySelectorAll('.inf-ray')]
    if (prefersReducedMotion) {
      chips.forEach((chip, i) => {
        chip.style.left = `${nodes[i].x}px`
        chip.style.top = `${nodes[i].y}px`
        chip.style.opacity = '1'
      })
      rays.forEach((ray) => {
        ray.style.strokeDashoffset = '0'
      })
      return undefined
    }
    rays.forEach((ray) => {
      const len = Number(ray.getAttribute('data-len') || 0)
      ray.style.strokeDasharray = `${len}`
      ray.style.strokeDashoffset = `${len}`
    })
    const rayAnim = animate(rays, {
      strokeDashoffset: 0,
      duration: 720,
      delay: stagger(18),
      ease: 'outCubic',
    })
    chips.forEach((chip, i) => {
      chip.style.left = `${nodes[i].x0}px`
      chip.style.top = `${nodes[i].y0}px`
      chip.style.opacity = '0'
    })
    const chipAnim = animate(chips, {
      left: (el, i) => `${nodes[i].x}px`,
      top: (el, i) => `${nodes[i].y}px`,
      opacity: [0, 1],
      duration: 780,
      delay: stagger(22),
      ease: 'outCubic',
    })
    return () => {
      rayAnim?.pause?.()
      chipAnim?.pause?.()
    }
  }, [nodes, playKey, prefersReducedMotion])

  useEffect(() => {
    if (!nodes.length || prefersReducedMotion) return undefined
    const id = setInterval(() => setLive((n) => (n + 1) % nodes.length), 1100)
    return () => clearInterval(id)
  }, [nodes, playKey, prefersReducedMotion])

  return (
    <div ref={wrapRef} className="relative flex-1 min-h-0">
      {box.w > 0 && (
        <>
          <svg className="absolute inset-0 w-full h-full overflow-visible" aria-hidden>
            {sectors.map(({ group, start, end }) => (
              <path
                key={`wedge-${group.short}`}
                d={sectorPath(cx, cy, rx, ry, start, end, 0.2, 1.02)}
                fill={groupColor(group, isDark)}
                fillOpacity={isDark ? 0.07 : 0.06}
              />
            ))}
            <ellipse
              className="inf-ring-spin"
              cx={cx}
              cy={cy}
              rx={rx * 0.64}
              ry={ry * 0.64}
              fill="none"
              stroke={accent}
              strokeOpacity="0.12"
              strokeWidth="1"
              strokeDasharray="4 10"
              style={{ transformOrigin: `${cx}px ${cy}px` }}
            />
            <ellipse
              cx={cx}
              cy={cy}
              rx={rx * ORBIT_SCALE}
              ry={ry * ORBIT_SCALE}
              fill="none"
              stroke={accent}
              strokeOpacity="0.22"
              strokeWidth="1.2"
            />
            <circle cx={cx} cy={cy} r={HUB_R + 10} fill={accent} fillOpacity="0.06" />
            {nodes.map((node) => {
              const len = Math.hypot(node.x - node.x0, node.y - node.y0)
              return (
                <line
                  key={`ray-${node.key}`}
                  className="inf-ray"
                  x1={node.x0}
                  y1={node.y0}
                  x2={node.x}
                  y2={node.y}
                  stroke={node.color}
                  strokeWidth={node.native ? 1.6 : 1.15}
                  strokeOpacity={node.native ? 0.55 : 0.38}
                  data-len={len.toFixed(1)}
                />
              )
            })}
          </svg>

          {labels.map((label) => (
            <div
              key={`label-${label.short}`}
              className="absolute text-[10px] uppercase tracking-wider font-semibold pointer-events-none"
              style={{
                left: label.x,
                top: label.y,
                transform: 'translate(-50%, -50%)',
                color: label.color,
                ...mono,
                zIndex: 8,
              }}
            >
              {label.short}
            </div>
          ))}

          {nodes.map((node, i) => (
            <span
              key={node.key}
              className={`inf-chip absolute text-xs rounded-full px-2.5 py-1 border whitespace-nowrap ${i === live ? 'inf-chip-live' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                transform: 'translate(-50%, -50%)',
                borderColor: `${node.color}${i === live ? 'ff' : '99'}`,
                color: node.color,
                background: '#ffffff',
                boxShadow: i === live ? `0 0 0 1px ${node.color}, 0 0 16px ${node.color}` : 'none',
                zIndex: i === live ? 20 : 10,
              }}
            >
              {node.item}
            </span>
          ))}

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <InferenceHub accent={accent} headText={headText} mono={mono} size="lg" />
          </div>
        </>
      )}
    </div>
  )
}

function SearchInferenceScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const eyebrow = metadata.eyebrow || 'Search · Inference'
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

          {beat === 0 && (
            <div className="flex-1 min-h-0 flex flex-col mt-1">
              <div className="reveal shrink-0 flex justify-center gap-5 mb-2">
                {GROUPS.map((g) => {
                  const color = groupColor(g, isDark)
                  return (
                    <div key={g.short} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color }}>
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: color }}
                      />
                      {g.short}
                    </div>
                  )
                })}
              </div>
              <ProviderConstellation
                accent={accent}
                isDark={isDark}
                headText={headText}
                mono={mono}
                playKey={playKey}
                prefersReducedMotion={prefersReducedMotion}
              />
            </div>
          )}

          {beat === 1 && (
            <div className="flex-1 min-h-0 flex flex-col mt-1">
              <div className="reveal shrink-0 flex justify-center gap-5 mb-2">
                {[
                  { short: 'Public cloud', color: isDark ? '#7EB4FF' : '#0B64DD' },
                  { short: 'Self-managed GPU', color: isDark ? '#FEC514' : '#153385' },
                ].map((g) => (
                  <div key={g.short} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider" style={{ color: g.color }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: g.color }} />
                    {g.short}
                  </div>
                ))}
              </div>
              <SovereignSplit
                accent={accent}
                isDark={isDark}
                headText={headText}
                mono={mono}
                playKey={playKey}
                prefersReducedMotion={prefersReducedMotion}
              />
              <p className="reveal shrink-0 text-center text-lg mt-2 mb-1" style={{ color: accent }}>
                Air-gapped or Elastic Cloud. The call does not change.
              </p>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default SearchInferenceScene
