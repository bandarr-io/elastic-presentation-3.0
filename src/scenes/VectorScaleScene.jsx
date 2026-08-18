import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, createTimeline, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved, faShuffle, faHardDrive, faBolt, faPlay, faRotateRight } from '@fortawesome/free-solid-svg-icons'

const BEATS = [
  {
    key: 'claim',
    step: 'Vector DB',
    titlePlain: 'Elasticsearch Is a ',
    titleAccent: 'Vector Database',
    subtitle: 'Hybrid search, multimodal & multilingual retrieval, and GPU-accelerated indexing — in the same platform.',
    hold: 4000,
  },
  {
    key: 'factors',
    step: 'Scale',
    titlePlain: 'Four Factors That Decide Whether AI ',
    titleAccent: 'Actually Scales',
    subtitle: 'Confidence, model agnosticism, disk-scale efficiency, and raw GPU speed.',
    hold: 5600,
  },
  {
    key: 'diskbbq',
    step: 'DiskBBQ',
    titlePlain: 'High Volume. Low RAM. ',
    titleAccent: 'DiskBBQ.',
    subtitle: 'Better Binary Quantization plus a disk-resident vector index — high recall without saturating memory.',
    hold: 5200,
  },
]

const PILLS = [
  { label: 'Hybrid Search', color: '#48EFCF' },
  { label: 'Multimodal / Multilingual', color: '#F5A623' },
  { label: 'GPU-Accelerated', color: '#7EE787' },
]

const FACTORS = [
  {
    num: '01',
    name: 'Confidence',
    icon: faShieldHalved,
    color: '#48EFCF',
    title: 'Governed access, fully auditable',
    body: 'Access controls enforce at the query layer — before the model sees context. DLS, FLS, and RBAC hold across every retrieval.',
  },
  {
    num: '02',
    name: 'Agnosticism',
    icon: faShuffle,
    color: '#F5A623',
    title: 'LLM-neutral by design',
    body: 'Bring fine-tuned, procured, or open-weight models. The platform cannot bake in a preference for any LLM.',
  },
  {
    num: '03',
    name: 'Efficiency',
    icon: faHardDrive,
    color: '#7EE787',
    title: 'Scale far beyond RAM',
    body: 'Dense indexes hit a memory ceiling. The platform must operate at full scale on disk — DiskBBQ is Elastic’s answer.',
    callout: '→ DiskBBQ — covered next',
  },
  {
    num: '04',
    name: 'Raw Speed',
    icon: faBolt,
    color: '#60A5FA',
    title: 'GPU-accelerated vector search',
    body: 'Instrument streams and machine datasets need GPU-accelerated vector operations that match the pace of the data.',
  },
]

// DiskBBQ diagram: centroids in RAM map to columnar partitions on disk.
const DISK_COLS = 7
const DISK_ROWS = 4
const DISK_BOX_X = 10
const DISK_BOX_W = 400
const DISK_GRID_X = 26
const DISK_COL_W = 368 / DISK_COLS
const DISK_CELL_W = 40
const DISK_CELL_H = 14
const DISK_CELL_GAP_Y = 5
const DISK_GRID_Y = 96
const DISK_RAM_CY = 34
const DISK_PACKET_Y = 58
const DISK_PARTITION_COUNT = 4096
const DISK_PROBED_COUNT = 2
const DISK_CELL_FILL = 'rgba(128,128,128,0.08)'
const DISK_CAPTIONS = {
  find: 'Find the nearest neighborhood',
  read: 'Read only those slices',
  done: `${DISK_PROBED_COUNT} of ${DISK_PARTITION_COUNT.toLocaleString()} slices read`,
}

const CENTROIDS = Array.from({ length: DISK_COLS }, (_, i) => (
  DISK_GRID_X + DISK_COL_W * i + DISK_COL_W / 2
))
const NEAREST_CENTROID = 3
const PROBED_ROWS = [1, 2]

const PARTITIONS = Array.from({ length: DISK_COLS * DISK_ROWS }, (_, i) => {
  const col = Math.floor(i / DISK_ROWS)
  const row = i % DISK_ROWS
  const x = DISK_GRID_X + col * DISK_COL_W + (DISK_COL_W - DISK_CELL_W) / 2
  const y = DISK_GRID_Y + row * (DISK_CELL_H + DISK_CELL_GAP_Y)
  return {
    id: `${col}-${row}`,
    x,
    y,
    cx: x + DISK_CELL_W / 2,
    cy: y + DISK_CELL_H / 2,
    hot: col === NEAREST_CENTROID && PROBED_ROWS.includes(row),
  }
})
const PROBED_PARTITIONS = PARTITIONS.filter((p) => p.hot)
const DISK_QUERY_CX = CENTROIDS[NEAREST_CENTROID]
const DISK_QUERY_POINTS = [
  `${DISK_QUERY_CX},${DISK_RAM_CY - 7}`,
  `${DISK_QUERY_CX + 7},${DISK_RAM_CY}`,
  `${DISK_QUERY_CX},${DISK_RAM_CY + 7}`,
  `${DISK_QUERY_CX - 7},${DISK_RAM_CY}`,
].join(' ')

function queryDiskElements(root) {
  const probeLines = [...root.querySelectorAll('.disk-probe-line')]
  return {
    queryGroup: root.querySelector('.disk-query-group'),
    queryLabel: root.querySelector('.disk-query-label'),
    pulseRing: root.querySelector('.disk-pulse'),
    activeCentroid: root.querySelector('.disk-centroid-active'),
    inactiveCentroids: [...root.querySelectorAll('.disk-centroid:not(.disk-centroid-active)')],
    coldPartitions: [...root.querySelectorAll('.disk-partition-cold')],
    hotPartitions: [...root.querySelectorAll('.disk-partition-hot')],
    allPartitions: [...root.querySelectorAll('.disk-partition')],
    probeLines,
    readPackets: [...root.querySelectorAll('.disk-read-packet')],
    caption: root.querySelector('.disk-caption'),
    lineLengths: probeLines.map((line) => line.getTotalLength()),
  }
}

function setDiskCaption(el, text, visible) {
  if (!el) return
  el.textContent = text
  el.style.opacity = visible ? '1' : '0'
  el.style.transform = visible ? 'translateY(0px)' : 'translateY(6px)'
}

function resetDiskDiagram(els, svgFaint) {
  if (els.queryGroup) {
    els.queryGroup.style.opacity = '0'
    els.queryGroup.style.transform = 'scale(0.45)'
  }
  if (els.queryLabel) els.queryLabel.style.opacity = '0'
  if (els.pulseRing) {
    els.pulseRing.style.opacity = '0'
    els.pulseRing.style.transform = 'scale(0.6)'
  }
  if (els.activeCentroid) els.activeCentroid.setAttribute('opacity', '0.4')
  els.inactiveCentroids.forEach((dot) => { dot.setAttribute('opacity', '0.4') })
  els.allPartitions.forEach((part) => {
    part.style.opacity = '1'
    part.style.transform = 'scale(1)'
    const rect = part.querySelector('rect')
    rect?.setAttribute('fill', DISK_CELL_FILL)
    rect?.setAttribute('stroke', svgFaint)
  })
  els.probeLines.forEach((line, i) => {
    line.style.opacity = '0'
    line.classList.remove('diskbbq-flow')
    line.style.strokeDasharray = `${els.lineLengths[i]}`
    line.style.strokeDashoffset = `${els.lineLengths[i]}`
  })
  els.readPackets.forEach((pkt) => {
    pkt.style.opacity = '0'
    pkt.style.transform = 'translate(0px, 0px)'
  })
  setDiskCaption(els.caption, DISK_CAPTIONS.find, false)
}

function finalizeDiskDiagram(els, accent, svgFaint) {
  if (els.queryGroup) {
    els.queryGroup.style.opacity = '1'
    els.queryGroup.style.transform = 'scale(1)'
  }
  if (els.queryLabel) els.queryLabel.style.opacity = '1'
  if (els.pulseRing) {
    els.pulseRing.style.opacity = '0.4'
    els.pulseRing.style.transform = 'scale(1)'
  }
  if (els.activeCentroid) els.activeCentroid.setAttribute('opacity', '1')
  els.inactiveCentroids.forEach((dot) => { dot.setAttribute('opacity', '0.22') })
  els.coldPartitions.forEach((part) => {
    part.style.opacity = '0.22'
    const rect = part.querySelector('rect')
    rect?.setAttribute('fill', DISK_CELL_FILL)
    rect?.setAttribute('stroke', svgFaint)
  })
  els.hotPartitions.forEach((part) => {
    part.style.opacity = '1'
    part.style.transform = 'scale(1)'
    const rect = part.querySelector('rect')
    rect?.setAttribute('fill', `${accent}28`)
    rect?.setAttribute('stroke', accent)
  })
  els.probeLines.forEach((line, i) => {
    line.style.opacity = '0.8'
    line.style.strokeDashoffset = '0'
    line.style.strokeDasharray = `${els.lineLengths[i]}`
    line.classList.add('diskbbq-flow')
  })
  els.readPackets.forEach((pkt, i) => {
    const target = PROBED_PARTITIONS[i]
    if (!target) return
    pkt.style.opacity = '1'
    pkt.style.transform = `translate(${target.cx - DISK_QUERY_CX}px, ${target.cy - DISK_PACKET_Y}px)`
  })
  setDiskCaption(els.caption, DISK_CAPTIONS.done, true)
}

const BIT_COUNT = 32
const BIT_PITCH = 12
const BIT_WIDTH = 10
const BIT_ROW_X = 14
const BIT_ROW_Y = 48
const BIT_ROW_H = 30
const STORE_SCALE = 1 / BIT_COUNT

function VectorScaleScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { prefersReducedMotion } = useReducedMotion()
  const rootRef = useRef(null)
  const bbqBeatRef = useRef(null)
  const bbqTimelineRef = useRef(null)
  const [bbqAnimKey, setBbqAnimKey] = useState(0)
  const [bbqHasPlayed, setBbqHasPlayed] = useState(false)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const runBbqAnimation = useCallback(() => {
    bbqTimelineRef.current?.pause?.()
    setBbqHasPlayed(false)
    setBbqAnimKey((k) => k + 1)
  }, [])

  const handleReplay = useCallback(() => {
    replay()
    if (beat === 2) runBbqAnimation()
  }, [beat, replay, runBbqAnimation])

  const bbqStepAction = useMemo(() => {
    if (beat !== 2) return undefined
    return {
      onClick: runBbqAnimation,
      icon: bbqHasPlayed ? faRotateRight : faPlay,
      title: bbqHasPlayed ? 'Replay animation' : 'Animate diagram',
    }
  }, [beat, bbqHasPlayed, runBbqAnimation])

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const panel = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white border-elastic-dev-blue/12 shadow-sm'
  const svgMuted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(26,26,26,0.5)'
  const svgFaint = isDark ? 'rgba(255,255,255,0.26)' : 'rgba(26,26,26,0.2)'
  const mono = { fontFamily: 'Space Mono, ui-monospace, monospace' }
  const eyebrow = metadata.eyebrow || 'Search · Vector Database'
  const pills = metadata.pills?.length
    ? metadata.pills.map((label, i) => ({
        ...(PILLS[i] || PILLS[PILLS.length - 1]),
        label: typeof label === 'string' ? label : label.label,
      }))
    : PILLS
  const factors = FACTORS.map((f, i) => {
    const override = metadata.factors?.[i] || {}
    return { ...f, ...override, icon: f.icon, color: f.color, num: f.num }
  })

  useEffect(() => {
    if (beat !== 2) {
      setBbqAnimKey(0)
      setBbqHasPlayed(false)
      return undefined
    }

    let cancelled = false
    const raf = requestAnimationFrame(() => {
      if (cancelled) return
      const root = bbqBeatRef.current
      if (!root) return

      const dimRow = root.querySelector('.bbq-dim-row')
      const dimLabel = root.querySelector('.bbq-dim-label')
      const singleGroup = root.querySelector('.bbq-single')
      const multLabel = root.querySelector('.bbq-mult')
      const storeWrap = root.querySelector('.bbq-store-wrap')
      const storeBefore = root.querySelector('.bbq-store-before')
      const storeAfter = root.querySelector('.bbq-store-after')
      const disk = queryDiskElements(root)

      bbqTimelineRef.current?.pause?.()

      if (dimRow) {
        dimRow.style.opacity = '1'
        dimRow.style.transform = 'scaleX(1)'
      }
      if (dimLabel) dimLabel.style.opacity = '1'
      if (singleGroup) singleGroup.style.opacity = '0'
      if (multLabel) {
        multLabel.style.opacity = '0'
        multLabel.style.transform = 'scale(0.4)'
      }
      if (storeWrap) storeWrap.style.transform = 'scaleX(1)'
      if (storeBefore) storeBefore.style.opacity = '1'
      if (storeAfter) storeAfter.style.opacity = '0'
      resetDiskDiagram(disk, svgFaint)
    })

    return () => {
      cancelled = true
      bbqTimelineRef.current?.pause?.()
    }
  }, [beat, playKey, svgFaint])

  useEffect(() => {
    if (beat !== 2 || bbqAnimKey === 0) return undefined

    let cancelled = false
    const raf = requestAnimationFrame(() => {
      if (cancelled) return
      const root = bbqBeatRef.current
      if (!root) return

      const dimRow = root.querySelector('.bbq-dim-row')
      const dimLabel = root.querySelector('.bbq-dim-label')
      const singleGroup = root.querySelector('.bbq-single')
      const multLabel = root.querySelector('.bbq-mult')
      const storeWrap = root.querySelector('.bbq-store-wrap')
      const storeBefore = root.querySelector('.bbq-store-before')
      const storeAfter = root.querySelector('.bbq-store-after')
      const disk = queryDiskElements(root)

      const resetState = () => {
        if (dimRow) {
          dimRow.style.opacity = '1'
          dimRow.style.transform = 'scaleX(1)'
        }
        if (dimLabel) dimLabel.style.opacity = '1'
        if (singleGroup) singleGroup.style.opacity = '0'
        if (multLabel) {
          multLabel.style.opacity = '0'
          multLabel.style.transform = 'scale(0.4)'
        }
        if (storeWrap) storeWrap.style.transform = 'scaleX(1)'
        if (storeBefore) storeBefore.style.opacity = '1'
        if (storeAfter) storeAfter.style.opacity = '0'
        resetDiskDiagram(disk, svgFaint)
      }

      const setFinalState = () => {
        if (dimRow) {
          dimRow.style.opacity = '0'
          dimRow.style.transform = `scaleX(${STORE_SCALE})`
        }
        if (dimLabel) dimLabel.style.opacity = '0'
        if (singleGroup) singleGroup.style.opacity = '1'
        if (multLabel) {
          multLabel.style.opacity = '1'
          multLabel.style.transform = 'scale(1)'
        }
        if (storeWrap) storeWrap.style.transform = `scaleX(${STORE_SCALE})`
        if (storeBefore) storeBefore.style.opacity = '0'
        if (storeAfter) storeAfter.style.opacity = '1'
        finalizeDiskDiagram(disk, accent, svgFaint)
        setBbqHasPlayed(true)
      }

      bbqTimelineRef.current?.pause?.()
      resetState()

      if (prefersReducedMotion) {
        setFinalState()
        return
      }

      const tl = createTimeline({
        autoplay: false,
        defaults: { ease: 'outCubic', persist: true },
        onComplete: setFinalState,
      })

      // One dimension: 32 float32 bits compress to a single BBQ bit — then index size follows.
      tl.add(dimRow, {
        scaleX: [1, STORE_SCALE],
        duration: 900,
        ease: 'inOutCubic',
      })

      tl.add(dimRow, {
        opacity: [1, 0],
        duration: 220,
      }, '-=180')

      tl.add(singleGroup, {
        opacity: [0, 1],
        duration: 320,
      }, '-=160')

      tl.add(dimLabel, {
        opacity: [1, 0],
        duration: 280,
      }, '-=280')

      tl.add(multLabel, {
        opacity: [0, 1],
        scale: [0.45, 1.12, 1],
        duration: 520,
        ease: 'outBack',
      }, '-=220')

      tl.add(storeWrap, {
        scaleX: [1, STORE_SCALE],
        duration: 820,
        ease: 'inOutCubic',
      }, '-=720')

      tl.add(storeBefore, {
        opacity: [1, 0],
        duration: 320,
      }, '-=420')

      tl.add(storeAfter, {
        opacity: [0, 1],
        duration: 320,
      }, '-=320')

      // Disk: lock onto a neighborhood, pause, then fetch only its slices.
      tl.add(disk.queryGroup, {
        opacity: [0, 1],
        scale: [0.45, 1.12, 1],
        duration: 560,
        ease: 'outBack',
        onBegin: () => setDiskCaption(disk.caption, DISK_CAPTIONS.find, true),
      }, '+=280')

      tl.add(disk.queryLabel, {
        opacity: [0, 1],
        duration: 280,
      }, '-=80')

      tl.add(disk.activeCentroid, {
        opacity: [0.4, 1],
        duration: 280,
      }, '-=240')

      tl.add(disk.inactiveCentroids, {
        opacity: [0.4, 0.22],
        duration: 360,
      }, '-=240')

      tl.add(disk.pulseRing, {
        opacity: [0, 0.7, 0.4],
        scale: [0.55, 1.3, 1],
        duration: 520,
        ease: 'outQuad',
      }, '-=200')

      disk.probeLines.forEach((line, i) => {
        tl.add(line, {
          strokeDashoffset: [disk.lineLengths[i], 0],
          opacity: [0, 0.8],
          duration: 480,
          ease: 'outCubic',
          onBegin: i === 0
            ? () => setDiskCaption(disk.caption, DISK_CAPTIONS.read, true)
            : undefined,
        }, i === 0 ? '+=320' : '-=400')
      })

      disk.readPackets.forEach((pkt, i) => {
        const target = PROBED_PARTITIONS[i]
        if (!target) return
        tl.add(pkt, {
          opacity: [0, 1],
          translateX: [0, target.cx - DISK_QUERY_CX],
          translateY: [0, target.cy - DISK_PACKET_Y],
          duration: 520,
          ease: 'inCubic',
        }, i === 0 ? '-=280' : '-=440')
      })

      disk.hotPartitions.forEach((part) => {
        const rect = part.querySelector('rect')
        if (rect) {
          tl.add(part, {
            scale: [1, 1.12, 1],
            duration: 420,
            ease: 'outBack',
          }, '-=220')
          tl.add(rect, {
            fill: [DISK_CELL_FILL, `${accent}28`],
            stroke: [svgFaint, accent],
            duration: 320,
          }, '-=420')
        }
      })

      tl.add(disk.coldPartitions, {
        opacity: [1, 0.18],
        duration: 480,
      }, '-=280')

      if (disk.caption) {
        tl.add(disk.caption, {
          opacity: [1, 1],
          duration: 320,
          onBegin: () => setDiskCaption(disk.caption, DISK_CAPTIONS.done, true),
        }, '+=80')
      }

      bbqTimelineRef.current = tl
      tl.play()
    })

    return () => {
      cancelled = true
      bbqTimelineRef.current?.pause?.()
    }
  }, [beat, bbqAnimKey, prefersReducedMotion, accent, svgFaint])

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: prefersReducedMotion ? 1 : 420,
      delay: prefersReducedMotion ? 0 : stagger(55),
      easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey, prefersReducedMotion])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          {/* The claim beat carries no diagram, so the header itself is the centrepiece. */}
          {beat !== 0 && (
            <div className="reveal shrink-0">
              <SceneHeader
                eyebrow={eyebrow}
                titlePlain={current.titlePlain}
                titleAccent={current.titleAccent}
                subtitle={current.subtitle}
              />
            </div>
          )}

          {beat === 0 && (
            <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-10">
              <div className="reveal">
                <SceneHeader
                  eyebrow={eyebrow}
                  titlePlain={current.titlePlain}
                  titleAccent={current.titleAccent}
                  subtitle={current.subtitle}
                  size="hero"
                />
              </div>

              <div className="reveal flex flex-wrap justify-center gap-3">
                {pills.map((p) => {
                  // The per-pill accents only read on the dark stage; light mode stays Elastic blue.
                  const tone = isDark ? p.color : accent
                  return (
                    <span
                      key={p.label}
                      className="rounded-full border px-5 py-2.5 text-sm font-semibold"
                      style={{ borderColor: `${tone}66`, color: isDark ? '#fff' : tone }}
                    >
                      <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ background: tone }} />
                      {p.label}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {beat === 1 && (
            <div className="flex-1 min-h-0 w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 content-center">
              {factors.map((f) => {
                // The per-factor accents only read on the dark stage; light mode stays Elastic blue.
                const tone = isDark ? f.color : accent
                return (
                  <div
                    key={f.name}
                    className={`reveal rounded-2xl border p-6 transition-all duration-500 ${panel}`}
                    style={{
                      borderColor: `${tone}55`,
                      boxShadow: `0 0 0 1px ${tone}22, 0 12px 40px ${tone}12`,
                    }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `${tone}22`, color: tone }}
                      >
                        <FontAwesomeIcon icon={f.icon} />
                      </span>
                      <div>
                        <div className={`text-xs uppercase tracking-wider ${mutedText}`}>{f.num} · {f.name}</div>
                        <div className={`text-xl font-bold ${headText}`}>
                          {f.title.split(',').map((part, j) => (
                            <span key={j}>{j > 0 ? ', ' : ''}{j === 1 ? <span style={{ color: tone }}>{part.trim()}</span> : part}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className={`text-base leading-relaxed ${mutedText}`}>{f.body}</p>
                    {f.callout && (
                      <div className="mt-3 text-sm font-bold uppercase tracking-wider" style={{ color: tone }}>
                        {f.callout}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {beat === 2 && (
            <div ref={bbqBeatRef} className="flex-1 min-h-0 w-full max-w-6xl mx-auto flex flex-col justify-center gap-4 mt-2">
              <p className={`reveal text-center text-base ${headText}`}>
                Smaller vectors, then most of them stay on disk.
              </p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className={`reveal rounded-2xl border p-5 ${panel}`} style={{ borderColor: `${accent}44` }}>
                  <div className={`text-xl font-bold mb-1 ${headText}`}>Better Binary Quantization</div>
                  <p className={`text-base leading-relaxed ${mutedText}`}>
                    One bit per dimension instead of thirty-two — then a rescore against the full vectors to hold recall.
                  </p>
                  <svg viewBox="0 0 420 96" className="w-full mt-4 min-h-[112px]" aria-hidden>
                    <text className="bbq-dim-label" x="14" y="20" fill={svgMuted} fontSize="14" letterSpacing="1" style={mono}>
                      ONE DIMENSION · FLOAT32 · 32 BITS
                    </text>

                    <g transform={`translate(${BIT_ROW_X} ${BIT_ROW_Y})`}>
                      <g
                        className="bbq-dim-row"
                        style={{ transformOrigin: `0px ${BIT_ROW_H / 2}px`, transformBox: 'fill-box' }}
                      >
                        {Array.from({ length: BIT_COUNT }).map((_, i) => (
                          <rect
                            key={i}
                            x={i * BIT_PITCH}
                            y={0}
                            width={BIT_WIDTH}
                            height={BIT_ROW_H}
                            rx="3"
                            fill={svgFaint}
                          />
                        ))}
                      </g>
                    </g>

                    <g className="bbq-single" opacity="0">
                      <rect x={BIT_ROW_X} y={BIT_ROW_Y} width={BIT_WIDTH} height={BIT_ROW_H} rx="3" fill={accent} />
                      <text x="38" y={BIT_ROW_Y + 21} fill={accent} fontSize="14" letterSpacing="1" style={mono}>
                        1 BIT / DIMENSION · BBQ
                      </text>
                    </g>
                  </svg>

                  <div className="flex items-end gap-6 mt-3">
                    <div className="bbq-index-copy flex-1 min-w-0 space-y-3">
                      <p className={`text-sm uppercase tracking-wider ${mutedText}`} style={mono}>
                        INDEX SIZE · 1B VECTORS × 1024d
                      </p>
                      <div className="h-5">
                        <div
                          className="bbq-store-wrap h-full w-full rounded-md origin-left"
                          style={{ backgroundColor: svgFaint }}
                        />
                      </div>
                      <div className="relative h-10">
                        <span className="bbq-store-before text-3xl" style={{ ...mono, color: accent }}>
                          ≈4 TB
                        </span>
                        <span
                          className="bbq-store-after absolute left-0 top-0 text-3xl opacity-0"
                          style={{ ...mono, color: accent }}
                        >
                          ~128 GB
                        </span>
                      </div>
                    </div>
                    <div
                      className="bbq-mult shrink-0 text-6xl font-bold leading-none opacity-0 origin-center"
                      style={{ color: accent, transform: 'scale(0.4)' }}
                    >
                      32×
                    </div>
                  </div>
                </div>

                <div className={`reveal rounded-2xl border p-5 ${panel}`} style={{ borderColor: `${accent}44` }}>
                  <div className={`text-xl font-bold mb-1 ${headText}`}>DiskBBQ</div>
                  <p className={`text-base leading-relaxed ${mutedText}`}>
                    The catalog lives on disk. Memory only keeps a map of neighborhoods. A query opens the nearest slices — not the whole index.
                  </p>
                  <svg viewBox="0 0 420 186" className="w-full mt-4" aria-hidden>
                    <rect x={DISK_BOX_X} y="6" width={DISK_BOX_W} height="56" rx="12" fill={`${accent}10`} stroke={`${accent}44`} strokeWidth="1.2" />
                    <text x="24" y="22" fill={accent} fontSize="12" letterSpacing="1.4" style={mono}>RAM</text>
                    <text x="394" y="22" textAnchor="end" fill={svgMuted} fontSize="12" letterSpacing="1" style={mono}>NEIGHBORHOOD MAP</text>

                    {CENTROIDS.map((cx, i) => (
                      <circle
                        key={cx}
                        cx={cx}
                        cy={DISK_RAM_CY}
                        r="5.5"
                        fill={accent}
                        opacity="0.4"
                        className={`disk-centroid${i === NEAREST_CENTROID ? ' disk-centroid-active' : ''}`}
                      />
                    ))}

                    <g
                      className="disk-query-group"
                      opacity="0"
                      style={{
                        transform: 'scale(0.45)',
                        transformOrigin: `${DISK_QUERY_CX}px ${DISK_RAM_CY}px`,
                        transformBox: 'fill-box',
                      }}
                    >
                      <polygon
                        points={DISK_QUERY_POINTS}
                        fill={accent}
                      />
                    </g>
                    <text
                      className="disk-query-label"
                      x={DISK_QUERY_CX + 12}
                      y={DISK_RAM_CY + 4}
                      fill={accent}
                      fontSize="10"
                      letterSpacing="0.8"
                      opacity="0"
                      style={mono}
                    >
                      Query
                    </text>

                    <circle
                      className="disk-pulse"
                      cx={CENTROIDS[NEAREST_CENTROID]}
                      cy={DISK_RAM_CY}
                      r="13"
                      fill="none"
                      stroke={accent}
                      strokeWidth="1.2"
                      opacity="0"
                      style={{
                        transform: 'scale(0.6)',
                        transformOrigin: `${CENTROIDS[NEAREST_CENTROID]}px ${DISK_RAM_CY}px`,
                        transformBox: 'fill-box',
                      }}
                    />

                    <rect x={DISK_BOX_X} y="72" width={DISK_BOX_W} height="106" rx="12" fill="none" stroke={svgFaint} strokeWidth="1.2" />
                    <text x="24" y="90" fill={svgMuted} fontSize="12" letterSpacing="1.4" style={mono}>DISK</text>
                    <text x="394" y="90" textAnchor="end" fill={svgMuted} fontSize="12" letterSpacing="1" style={mono}>SLICES</text>

                    {PARTITIONS.map((p) => (
                      <g
                        key={p.id}
                        className={`disk-partition${p.hot ? ' disk-partition-hot' : ' disk-partition-cold'}`}
                        style={p.hot ? {
                          transformOrigin: `${p.cx}px ${p.cy}px`,
                          transformBox: 'fill-box',
                        } : undefined}
                      >
                        <rect
                          x={p.x}
                          y={p.y}
                          width={DISK_CELL_W}
                          height={DISK_CELL_H}
                          rx="3"
                          fill={DISK_CELL_FILL}
                          stroke={svgFaint}
                          strokeWidth="1"
                        />
                      </g>
                    ))}

                    {PROBED_PARTITIONS.map((p) => (
                      <line
                        key={`probe-${p.id}`}
                        className="disk-probe-line"
                        x1={DISK_QUERY_CX}
                        y1="62"
                        x2={p.cx}
                        y2={p.y}
                        stroke={accent}
                        strokeWidth="1.2"
                        opacity="0"
                      />
                    ))}

                    {PROBED_PARTITIONS.map((p) => (
                      <g
                        key={`pkt-${p.id}`}
                        className="disk-read-packet"
                        opacity="0"
                        style={{ transform: 'translate(0px, 0px)' }}
                      >
                        <circle cx={DISK_QUERY_CX} cy={DISK_PACKET_Y} r="3.5" fill={accent} />
                      </g>
                    ))}
                  </svg>
                  <p
                    className="disk-caption mt-3 text-center text-sm font-semibold min-h-5 opacity-0"
                    style={{ ...mono, color: accent }}
                  >
                    {DISK_CAPTIONS.find}
                  </p>
                </div>
              </div>

              <p className={`reveal text-center text-sm ${mutedText}`}>
                Billions of vectors, past the memory ceiling.
              </p>
            </div>
          )}
        </div>

        <SceneStepper
          beats={beats}
          beat={beat}
          onGo={goTo}
          onReplay={handleReplay}
          isPlaying={isPlaying}
          onTogglePlay={toggleAutoplay}
          action={bbqStepAction}
        />
      </div>
    </div>
  )
}

export default VectorScaleScene
