import { animate, createMotionPath, stagger } from 'animejs'
import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faMagnifyingGlass, faCloud, faBuilding, faArrowsRotate,
  faServer, faDatabase, faNetworkWired, faCheck, faBell,
} from '@fortawesome/free-solid-svg-icons'

// ─── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP = {
  cloud:    faCloud,
  onprem:   faBuilding,
  server:   faServer,
  database: faDatabase,
  network:  faNetworkWired,
}

// ─── Stage 0 data ──────────────────────────────────────────────────────────────
const remoteClusters = [
  { id: 'onprem', name: 'On-Prem', type: 'onprem', darkColor: '#48EFCF', lightColor: '#0B64DD' },
  { id: 'aws',    name: 'AWS',     type: 'cloud',  darkColor: '#FF9900', lightColor: '#0B64DD' },
  { id: 'gcp',    name: 'GCP',     type: 'cloud',  darkColor: '#F04E98', lightColor: '#0B64DD' },
  { id: 'azure',  name: 'Azure',   type: 'cloud',  darkColor: '#60A5FA', lightColor: '#0B64DD' },
]

const benefits = [
  { text: 'Search across all data',        highlight: 'limit data transfer costs' },
  { text: 'Data privacy & sovereignty',    highlight: 'global compliance'         },
  { text: 'Faster, more responsive',       highlight: 'reduced app latency'       },
  { text: 'High availability for DR',      highlight: 'business continuity'       },
  { text: 'Seamless hybrid & multi-cloud', highlight: 'deployment flexibility'    },
]

const CLUSTER_COUNT      = remoteClusters.length  // 4
const REPL_COUNT         = CLUSTER_COUNT - 1      // 3
const CLUSTER_X_FRACTIONS = [0.125, 0.375, 0.625, 0.875]

// ─── Stage 1 data ──────────────────────────────────────────────────────────────
const DEFAULT_SITES = [
  { name: 'HQ Data Center',   type: 'onprem',   region: 'US-East',  docs: '2.4M' },
  { name: 'AWS us-east-1',    type: 'cloud',    region: 'US-East',  docs: '8.1M' },
  { name: 'Azure West EU',    type: 'cloud',    region: 'EU-West',  docs: '3.7M' },
  { name: 'GCP Asia Pacific', type: 'cloud',    region: 'APAC',     docs: '1.9M' },
  { name: 'DR Backup',        type: 'server',   region: 'US-West',  docs: '2.4M' },
  { name: 'Edge — LATAM',     type: 'network',  region: 'SA-East',  docs: '0.9M' },
  { name: 'On-Prem EU',       type: 'onprem',   region: 'EU-East',  docs: '1.5M' },
  { name: 'Singapore DC',     type: 'database', region: 'AP-South', docs: '2.1M' },
]

const SITE_DARK_COLORS  = ['#48EFCF', '#FF9900', '#60A5FA', '#F04E98', '#FEC514', '#FF957D', '#A78BFA', '#34D399']
const STAGES = [
  { id: 'overview',    label: 'Overview',     icon: faNetworkWired    },
  { id: 'in-practice', label: 'In Practice',  icon: faMagnifyingGlass },
]

// Hub sits at the top-center of the 0-100 viewBox coordinate space
const HUB_X = 50
const HUB_Y = 14

// ─── Helpers ───────────────────────────────────────────────────────────────────

// Two-column layout below the hub.
// Sites alternate left/right; if count is odd the last site sits centered.
// Returns { x, y, col, endX, endY } where endX/endY is the inner card edge
// that faces the hub — this is where paths and balls connect.
function computeSitePositions(count) {
  const colLeft = 24, colRight = 76
  const isOdd   = count % 2 !== 0
  const pairs   = Math.ceil(count / 2)
  const yStart  = 38, yEnd = 88
  // Approximate half-dimensions in SVG units (0–100 space).
  // Card is 190px wide, ~48px tall; container ~1200px × ~480px.
  const cardHalfW = 8
  const cardHalfH = 5

  return Array.from({ length: count }, (_, i) => {
    const pairIdx   = Math.floor(i / 2)
    const isRight   = i % 2 === 1
    const isLastOdd = isOdd && i === count - 1
    const y   = pairs <= 1 ? 63 : yStart + (pairIdx / (pairs - 1)) * (yEnd - yStart)
    const x   = isLastOdd ? 50 : (isRight ? colRight : colLeft)
    const col = isLastOdd ? 'center' : (isRight ? 'right' : 'left')
    // Inner edge facing the hub
    const endX = col === 'left' ? x + cardHalfW : col === 'right' ? x - cardHalfW : x
    const endY = col === 'center' ? y - cardHalfH : y
    return { x, y, col, endX, endY }
  })
}

// Evaluate a cubic bezier B(t) given the 4 control points
function cubicBezierPt(t, p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y) {
  const mt = 1 - t
  return {
    x: mt*mt*mt*p0x + 3*mt*mt*t*p1x + 3*mt*t*t*p2x + t*t*t*p3x,
    y: mt*mt*mt*p0y + 3*mt*mt*t*p1y + 3*mt*t*t*p2y + t*t*t*p3y,
  }
}

// Build keyframe point array for an S-curve (hub → site or reverse)
function buildKeyframes(sx, sy, c1x, c1y, c2x, c2y, ex, ey, steps = 9) {
  return Array.from({ length: steps }, (_, i) =>
    cubicBezierPt(i / (steps - 1), sx, sy, c1x, c1y, c2x, c2y, ex, ey)
  )
}

// ─── Main component ────────────────────────────────────────────────────────────
function CrossClusterScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  // ── Metadata: shared ─────────────────────────────────────────────────────
  const eyebrow    = metadata.eyebrow    || 'Distributed Architecture'
  const titlePart1 = metadata.titlePart1 || 'Distributed by Design, '
  const titlePart2 = metadata.titlePart2 || 'Connected by Elastic'

  const resolvedBenefits = benefits.map((b, i) => ({
    text:      metadata.benefits?.[i]?.text      || b.text,
    highlight: metadata.benefits?.[i]?.highlight || b.highlight,
  }))

  const resolvedClusters = remoteClusters.map((c, i) => ({
    ...c,
    label: metadata.clusters?.[i]?.label || 'elastic',
    name:  metadata.clusters?.[i]?.name  || c.name,
    type:  metadata.clusters?.[i]?.type  || c.type,
  }))

  // ── Metadata: Stage 1 ────────────────────────────────────────────────────
  const hubName     = metadata.stage1HubName     || 'Your Organization'
  const hubSubtitle = metadata.stage1HubSubtitle || 'Main Elastic Cluster'
  const searchQuery = metadata.stage1Query       || 'GET _remote/*:logs-*/_search'
  const siteCount   = Math.max(2, Math.min(8, parseInt(metadata.siteCount) || 8))

  const resolvedSites = useMemo(() =>
    Array.from({ length: siteCount }, (_, i) => {
      const def = DEFAULT_SITES[i] ?? { name: `Site ${i + 1}`, type: 'cloud', region: 'Global', docs: '1.0M' }
      return {
        name:   metadata.sites?.[i]?.name   || def.name,
        type:   metadata.sites?.[i]?.type   || def.type,
        region: metadata.sites?.[i]?.region || def.region,
        docs:   metadata.sites?.[i]?.docs   || def.docs,
      }
    }),
  [siteCount, metadata.sites])

  const sitePositions = useMemo(() => computeSitePositions(resolvedSites.length), [resolvedSites.length])

  // ── State ─────────────────────────────────────────────────────────────────
  const [stage,            setStage]            = useState(0)
  const [queryPhase,       setQueryPhase]       = useState('idle')
  const [replicationPhase, setReplicationPhase] = useState('idle')
  const [isAnimating,      setIsAnimating]      = useState(false)
  const [s1Phase,          setS1Phase]          = useState('idle')
  const [s1HasResults,     setS1HasResults]     = useState(false)
  const [s1Streaming,      setS1Streaming]      = useState(false)
  const [streamCategory,   setStreamCategory]   = useState('security')
  const [streamTotalEvts,  setStreamTotalEvts]  = useState(0)
  const [streamSiteRates,  setStreamSiteRates]  = useState([])
  const [streamAlerts,     setStreamAlerts]     = useState([])
  const [streamCorrelations, setStreamCorrelations] = useState(0)

  // Keep a live ref so animation closures always read the current theme
  const isDarkRef = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  // ── Refs: Stage 0 ─────────────────────────────────────────────────────────
  const benefitRefs       = useRef([])
  const mainClusterRef    = useRef(null)
  const remoteClusterRefs = useRef([])
  const connectionZoneRef = useRef(null)
  const queryPathRefs     = useRef([])
  const returnPathRefs    = useRef([])
  const replFwdPathRefs   = useRef([])
  const replBwdPathRefs   = useRef([])
  const queryBallRefs     = useRef([])
  const returnBallRefs    = useRef([])
  const replFwdBallRefs   = useRef([])
  const replBwdBallRefs   = useRef([])
  const timersRef         = useRef([])

  // ── Refs: Stage 1 ─────────────────────────────────────────────────────────
  const s1VizRef        = useRef(null)
  const s1HubRef        = useRef(null)
  const s1SiteRefs      = useRef([])
  const s1PathRefs      = useRef([])
  const s1RetPathRefs   = useRef([])
  const s1OutBallRefs   = useRef([])
  const s1RetBallRefs   = useRef([])
  const s1StreamBallRefs = useRef([])
  const s1StreamingRef  = useRef(false)   // tracks live streaming state
  const streamTimersRef = useRef([])      // separate pool so search doesn't cancel streams

  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
    return id
  }, [])

  // ── Stage 0: pixel-based path setup ───────────────────────────────────────
  const setupPaths = useCallback(() => {
    const zone = connectionZoneRef.current
    if (!zone) return false
    const W = zone.clientWidth
    const H = zone.clientHeight
    if (!W || !H) return false

    const midX      = W / 2
    const clusterXs = CLUSTER_X_FRACTIONS.map(f => W * f)

    clusterXs.forEach((endX, i) => {
      queryPathRefs.current[i]?.setAttribute('d',
        `M ${midX} 0 C ${midX} ${H * 0.45} ${endX} ${H * 0.55} ${endX} ${H}`)
      returnPathRefs.current[i]?.setAttribute('d',
        `M ${endX} ${H} C ${endX} ${H * 0.55} ${midX} ${H * 0.45} ${midX} 0`)
    })

    for (let i = 0; i < REPL_COUNT; i++) {
      const x1 = clusterXs[i], x2 = clusterXs[i + 1], archY = H * 0.78
      replFwdPathRefs.current[i]?.setAttribute('d', `M ${x1} ${H} C ${x1} ${archY} ${x2} ${archY} ${x2} ${H}`)
      replBwdPathRefs.current[i]?.setAttribute('d', `M ${x2} ${H} C ${x2} ${archY} ${x1} ${archY} ${x1} ${H}`)
    }
    return true
  }, [])

  // ── Stage 1: pixel-based path setup (mirrors setupPaths for Stage 0) ──────
  const setupS1Paths = useCallback(() => {
    const viz = s1VizRef.current
    const hub = s1HubRef.current
    if (!viz || !hub) return false
    const vizRect = viz.getBoundingClientRect()
    if (!vizRect.width || !vizRect.height) return false
    const hubRect = hub.getBoundingClientRect()
    const hubX = hubRect.left - vizRect.left + hubRect.width / 2
    const hubY = hubRect.top  - vizRect.top  + hubRect.height   // bottom edge of hub

    s1PathRefs.current.forEach((fwdEl, i) => {
      const retEl  = s1RetPathRefs.current[i]
      const siteEl = s1SiteRefs.current[i]
      if (!fwdEl || !siteEl) return
      const sr  = siteEl.getBoundingClientRect()
      const pos = sitePositions[i]
      let ex, ey
      if (pos.col === 'left')   { ex = sr.right - vizRect.left;                     ey = sr.top - vizRect.top + sr.height / 2 }
      else if (pos.col === 'right') { ex = sr.left - vizRect.left;                  ey = sr.top - vizRect.top + sr.height / 2 }
      else                          { ex = sr.left - vizRect.left + sr.width / 2;   ey = sr.top - vizRect.top }
      const dx = ex - hubX, dy = ey - hubY
      const cp1x = (hubX + dx * 0.053).toFixed(1), cp1y = (hubY + dy * 0.731).toFixed(1)
      const cp2x = (hubX + dx * 0.77).toFixed(1),  cp2y = (hubY + dy * 1.0).toFixed(1)
      fwdEl.setAttribute('d', `M ${hubX.toFixed(1)} ${hubY.toFixed(1)} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex.toFixed(1)} ${ey.toFixed(1)}`)
      retEl?.setAttribute('d', `M ${ex.toFixed(1)} ${ey.toFixed(1)} C ${cp2x} ${cp2y} ${cp1x} ${cp1y} ${hubX.toFixed(1)} ${hubY.toFixed(1)}`)
    })
    return true
  }, [sitePositions])

  // ── Stage 0: entrance ─────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 0) return
    const animations = []
    const init = () => {
      if (!setupPaths()) return

      animations.push(animate(benefitRefs.current.filter(Boolean), {
        opacity: [0, 1], translateX: [-20, 0],
        duration: 500, delay: stagger(150, { start: 250 }), easing: 'easeOutCubic',
      }))
      animations.push(animate(mainClusterRef.current, {
        opacity: [0, 1], translateY: [-14, 0], duration: 600, delay: 350, easing: 'easeOutCubic',
      }))
      animations.push(animate(remoteClusterRefs.current.filter(Boolean), {
        opacity: [0, 1], translateY: [14, 0],
        duration: 500, delay: stagger(125, { start: 600 }), easing: 'easeOutCubic',
      }))
      queryPathRefs.current.forEach((pathEl, i) => {
        if (!pathEl) return
        const len = pathEl.getTotalLength()
        if (!len) return
        pathEl.style.strokeDasharray  = String(len)
        pathEl.style.strokeDashoffset = String(len)
        animations.push(animate(pathEl, {
          strokeDashoffset: [len, 0], duration: 900, delay: 750 + i * 125, easing: 'easeInOutCubic',
          onComplete: () => { pathEl.style.strokeDasharray = '6 4'; pathEl.style.strokeDashoffset = '0' },
        }))
      })
    }
    requestAnimationFrame(init)
    return () => { animations.forEach(a => a?.pause?.()); timersRef.current.forEach(clearTimeout) }
  }, [stage, setupPaths])

  // ── Stage 1: entrance ─────────────────────────────────────────────────────
  useEffect(() => {
    if (stage !== 1) return
    const animations = []
    const init = () => {
      if (!setupS1Paths()) return
      if (s1HubRef.current) {
        s1HubRef.current.style.opacity = '0'
        animations.push(animate(s1HubRef.current, {
          opacity: [0, 1], translateY: [-12, 0], duration: 600, delay: 200, easing: 'easeOutCubic',
        }))
      }
      s1PathRefs.current.forEach((pathEl, i) => {
        if (!pathEl) return
        const len = pathEl.getTotalLength()
        if (!len) return
        pathEl.style.strokeDasharray  = String(len)
        pathEl.style.strokeDashoffset = String(len)
        animations.push(animate(pathEl, {
          strokeDashoffset: [len, 0], duration: 900, delay: 750 + i * 90, easing: 'easeInOutCubic',
          onComplete: () => { pathEl.style.strokeDasharray = '6 4'; pathEl.style.strokeDashoffset = '0' },
        }))
      })
      const siteCards = s1SiteRefs.current.filter(Boolean)
      if (siteCards.length) {
        siteCards.forEach(el => { el.style.opacity = '0' })
        animations.push(animate(siteCards, {
          opacity: [0, 1], translateY: [14, 0],
          duration: 500, delay: stagger(80, { start: 600 }), easing: 'easeOutCubic',
        }))
      }
    }
    requestAnimationFrame(init)
    return () => animations.forEach(a => a?.pause?.())
  }, [stage, setupS1Paths])

  // ── Stage 1: search animation ─────────────────────────────────────────────
  const runS1Search = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    if (!setupS1Paths()) return
    setS1HasResults(false)
    setS1Phase('searching')

    // Outbound: hub → sites (mirrors runSearch exactly)
    s1PathRefs.current.forEach((pathEl, i) => {
      const ball = s1OutBallRefs.current[i]
      if (!pathEl || !ball) return
      animate(ball, { ...createMotionPath(pathEl), opacity: [0, 1, 1, 0.85], duration: 900, easing: 'easeInCubic' })
    })

    addTimer(() => {
      s1OutBallRefs.current.forEach(ball => {
        if (ball) animate(ball, { opacity: 0, duration: 400, easing: 'easeOutCubic' })
      })
      s1SiteRefs.current.forEach((el, i) => {
        if (!el) return
        const color = isDark ? SITE_DARK_COLORS[i % SITE_DARK_COLORS.length] : '#0B64DD'
        animate(el, {
          boxShadow: [`0 0 0px ${color}00`, `0 0 22px ${color}88`, `0 0 8px ${color}33`],
          duration: 800, easing: 'easeOutCubic',
        })
      })

      addTimer(() => {
        // Return: sites → hub
        s1RetPathRefs.current.forEach((pathEl, i) => {
          const ball = s1RetBallRefs.current[i]
          if (!pathEl || !ball) return
          const color = isDark ? SITE_DARK_COLORS[i % SITE_DARK_COLORS.length] : '#0B64DD'
          animate(ball, { ...createMotionPath(pathEl), opacity: [0, 1, 1, 0.85], duration: 900, easing: 'easeOutCubic' })
          animate(ball, { backgroundColor: color, duration: 0 })
        })

        addTimer(() => {
          setS1Phase('results')
          setS1HasResults(true)
          if (s1HubRef.current) {
            const c = isDark ? 'rgba(72,239,207,' : 'rgba(11,100,221,'
            animate(s1HubRef.current, {
              boxShadow: [`0 0 0px ${c}0)`, `0 0 30px ${c}0.55)`, `0 0 10px ${c}0.2)`],
              duration: 1000, easing: 'easeOutCubic',
            })
          }
          addTimer(() => {
            setS1Phase('idle')
            s1OutBallRefs.current.forEach(ball => { if (ball) animate(ball, { opacity: 0, duration: 0 }) })
            s1RetBallRefs.current.forEach(ball => { if (ball) animate(ball, { opacity: 0, duration: 0 }) })
            s1HubRef.current && animate(s1HubRef.current, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 600 })
            s1SiteRefs.current.forEach(el => { el && animate(el, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 600 }) })
          }, 2000)
        }, 900)
      }, 2500)
    }, 900)
  }, [isDark, setupS1Paths, addTimer])

  // ── Stage 1: streaming animation ──────────────────────────────────────────
  const MAX_STREAM_BALLS = 20

  const stopS1Stream = useCallback(() => {
    s1StreamingRef.current = false
    setS1Streaming(false)
    streamTimersRef.current.forEach(clearTimeout)
    streamTimersRef.current = []
    s1StreamBallRefs.current.forEach(b => b && animate(b, { opacity: 0, duration: 300 }))
  }, [])

  const startS1Stream = useCallback(() => {
    if (!setupS1Paths()) return
    s1StreamingRef.current = true
    setS1Streaming(true)
    let poolIdx = 0

    const launch = () => {
      if (!s1StreamingRef.current) return
      const siteCount = s1RetPathRefs.current.filter(Boolean).length
      if (!siteCount) return

      const siteIdx = Math.floor(Math.random() * siteCount)
      const pathEl  = s1RetPathRefs.current[siteIdx]
      const ball    = s1StreamBallRefs.current[poolIdx % MAX_STREAM_BALLS]
      if (pathEl && ball) {
        const color = isDarkRef.current ? SITE_DARK_COLORS[siteIdx % SITE_DARK_COLORS.length] : '#0B64DD'
        ball.style.backgroundColor = color
        ball.style.boxShadow = `0 0 8px 2px ${color}80`
        ball.style.opacity = '0'
        animate(ball, {
          ...createMotionPath(pathEl),
          opacity: [0, 0.9, 0.9, 0],
          duration: 700 + Math.random() * 500,
          easing: 'easeInCubic',
          onComplete: () => { ball.style.opacity = '0' },
        })
        poolIdx = (poolIdx + 1) % MAX_STREAM_BALLS
      }

      const id = setTimeout(launch, 120 + Math.random() * 280)
      streamTimersRef.current.push(id)
    }
    launch()
  }, [isDark, setupS1Paths])

  // ── Stage 0: search animation ──────────────────────────────────────────────
  const runSearch = useCallback(() => {
    if (isAnimating || !setupPaths()) return
    setIsAnimating(true)
    setQueryPhase('sending')

    queryPathRefs.current.forEach((pathEl, i) => {
      const ball = queryBallRefs.current[i]
      if (!pathEl || !ball) return
      animate(ball, { ...createMotionPath(pathEl), opacity: [0, 1, 1, 0.85], duration: 900, easing: 'easeInCubic' })
    })

    addTimer(() => {
      setQueryPhase('processing')
      queryBallRefs.current.forEach(ball => {
        if (ball) animate(ball, { opacity: 0, duration: 400, easing: 'easeOutCubic' })
      })
      remoteClusterRefs.current.forEach((el, i) => {
        if (!el) return
        const color = isDark ? remoteClusters[i].darkColor : remoteClusters[i].lightColor
        animate(el, {
          boxShadow: [`0 0 0px ${color}00`, `0 0 22px ${color}88`, `0 0 8px ${color}33`],
          duration: 800, easing: 'easeOutCubic',
        })
      })

      addTimer(() => {
        setQueryPhase('returning')
        returnPathRefs.current.forEach((pathEl, i) => {
          const ball = returnBallRefs.current[i]
          if (!pathEl || !ball) return
          const color = isDark ? remoteClusters[i].darkColor : remoteClusters[i].lightColor
          animate(ball, { ...createMotionPath(pathEl), opacity: [0, 1, 1, 0.85], duration: 900, easing: 'easeOutCubic' })
          animate(ball, { backgroundColor: color, duration: 0 })
        })

        addTimer(() => {
          setQueryPhase('complete')
          if (mainClusterRef.current) {
            const c = isDark ? 'rgba(72,239,207,' : 'rgba(11,100,221,'
            animate(mainClusterRef.current, {
              boxShadow: [`0 0 0px ${c}0)`, `0 0 30px ${c}0.55)`, `0 0 10px ${c}0.2)`],
              duration: 1000, easing: 'easeOutCubic',
            })
          }
          addTimer(() => {
            setQueryPhase('idle')
            setIsAnimating(false)
            queryBallRefs.current.forEach(ball => { if (ball) animate(ball, { opacity: 0, duration: 0 }) })
            returnBallRefs.current.forEach(ball => {
              if (ball) animate(ball, { opacity: 0, backgroundColor: isDark ? '#48EFCF' : '#0B64DD', duration: 0 })
            })
            mainClusterRef.current && animate(mainClusterRef.current, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 600 })
            remoteClusterRefs.current.forEach(el => { el && animate(el, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 600 }) })
          }, 2000)
        }, 900)
      }, 2500)
    }, 900)
  }, [isAnimating, isDark, setupPaths, addTimer])

  // ── Stage 0: replication animation ────────────────────────────────────────
  const runReplicate = useCallback(() => {
    if (isAnimating || !setupPaths()) return
    setIsAnimating(true)
    setReplicationPhase('replicating')

    for (let i = 0; i < REPL_COUNT; i++) {
      const fwdPath = replFwdPathRefs.current[i], bwdPath = replBwdPathRefs.current[i]
      const fwdBall = replFwdBallRefs.current[i], bwdBall = replBwdBallRefs.current[i]
      if (fwdPath && fwdBall) animate(fwdBall, { ...createMotionPath(fwdPath), opacity: [0, 1, 1, 0], duration: 1300, easing: 'easeInOutCubic' })
      if (bwdPath && bwdBall) animate(bwdBall, { ...createMotionPath(bwdPath), opacity: [0, 1, 1, 0], duration: 1300, easing: 'easeInOutCubic' })
    }

    addTimer(() => {
      setReplicationPhase('syncing')
      animate(remoteClusterRefs.current.filter(Boolean), {
        boxShadow: ['0 0 0px rgba(254,197,20,0)', '0 0 20px rgba(254,197,20,0.6)', '0 0 6px rgba(254,197,20,0.2)'],
        duration: 900, easing: 'easeOutCubic',
      })
      addTimer(() => {
        setReplicationPhase('complete')
        addTimer(() => {
          setReplicationPhase('idle')
          setIsAnimating(false)
          remoteClusterRefs.current.forEach(el => { el && animate(el, { boxShadow: '0 0 0px rgba(0,0,0,0)', duration: 600 }) })
        }, 2000)
      }, 1300)
    }, 1300)
  }, [isAnimating, setupPaths, addTimer])

  // ── Streaming panel data ────────────────────────────────────────────────────
  const CATEGORY_META = {
    security:      { label: 'Threat Correlation Engine',     accent: '#F04E98' },
    observability: { label: 'Cross-Cluster Signal Analysis', accent: '#FEC514' },
    infrastructure:{ label: 'Unified Ops Intelligence',      accent: '#48EFCF' },
  }
  const catMeta = {
    ...(CATEGORY_META[streamCategory] ?? CATEGORY_META.security),
    accent: isDark ? (CATEGORY_META[streamCategory]?.accent ?? '#48EFCF') : '#0B64DD',
  }

  const STREAM_ALERT_POOLS = useMemo(() => ({
    security: [
      { title: 'Cross-Cluster Auth Spike',     severity: 'Critical', desc: 'Correlated authentication surge across 3 clusters — consistent with a coordinated credential stuffing campaign.',    count: 847  },
      { title: 'Lateral Movement Detected',    severity: 'High',     desc: 'Single threat actor pivoting between US-East and EU-West nodes using harvested service tokens.',                    count: 34   },
      { title: 'Data Exfiltration Attempt',    severity: 'Critical', desc: 'Unusually large bulk export queries issued against restricted indices from an external IP range.',                  count: 12   },
      { title: 'Policy Violation Pattern',     severity: 'High',     desc: 'Field-level access to PII-tagged documents attempted from 4 IPs across 2 clusters in a 60-second window.',         count: 19   },
      { title: 'Anomalous API Key Usage',      severity: 'Medium',   desc: 'Dormant API key reactivated and used from a new geographic region — key created 11 months ago.',                   count: 3    },
    ],
    observability: [
      { title: 'Latency Anomaly — APAC',       severity: 'Medium',   desc: 'P99 ingest latency exceeding 400ms threshold on GCP Asia Pacific and On-Prem EU nodes simultaneously.',           count: 42   },
      { title: 'Coordinated Error Spike',      severity: 'High',     desc: 'Identical 503 error stack traces appearing in EU-West and US-East — likely shared upstream dependency failure.',   count: 234  },
      { title: 'Drop in Log Volume',           severity: 'Medium',   desc: 'Log throughput from 2 remote clusters dropped 78% — possible agent disconnection or pipeline stall.',              count: 0    },
      { title: 'SLO Breach Approaching',       severity: 'High',     desc: 'Error budget burn rate at 4.2× across APAC sites — on track to exhaust 30-day SLO window in 6 hours.',            count: 1840 },
      { title: 'Trace Sampling Gap',           severity: 'Low',      desc: 'Distributed trace coverage fell below 10% for checkout service — sampler config drift detected on 3 nodes.',      count: 5501 },
    ],
    infrastructure: [
      { title: 'Shard Rebalance Cascade',      severity: 'Low',      desc: 'Index rotation events triggered in sequence across 5 clusters within a 90-second window — monitor disk pressure.', count: 1205 },
      { title: 'Cross-Cluster Shard Skew',     severity: 'Medium',   desc: 'Primary shard distribution uneven — 3 nodes carrying 72% of write load in US-East cluster.',                      count: 88   },
      { title: 'Replica Lag Detected',         severity: 'High',     desc: 'EU-West replica 2 falling 14 seconds behind primary; risk of stale reads during failover window.',                count: 306  },
      { title: 'Snapshot Failure Correlation', severity: 'High',     desc: 'Scheduled snapshot jobs failed on 4 clusters simultaneously — S3 throttle limit reached at shared endpoint.',    count: 4    },
      { title: 'Node Eviction Risk',           severity: 'Medium',   desc: 'JVM heap usage above 85% on primary nodes in 2 clusters; GC pauses increasing — scale-up recommended.',          count: 21   },
    ],
  }), [])

  useEffect(() => {
    if (!s1Streaming) {
      setStreamTotalEvts(0)
      setStreamSiteRates([])
      setStreamAlerts([])
      setStreamCorrelations(0)
      return
    }
    const pool = STREAM_ALERT_POOLS[streamCategory]

    // Seed per-site base rates
    const baseRates = resolvedSites.map(() => 20 + Math.random() * 70)
    setStreamSiteRates(baseRates.map(r => Math.round(r)))

    // Tick: increment total events, jitter site rates, accumulate correlations every 500ms
    const tickId = setInterval(() => {
      setStreamTotalEvts(n => n + Math.floor(800 + Math.random() * 600))
      setStreamCorrelations(n => n + Math.floor(1 + Math.random() * 3))
      setStreamSiteRates(() => baseRates.map(base => {
        const jitter = (Math.random() - 0.5) * 18
        return Math.max(5, Math.min(100, Math.round(base + jitter)))
      }))
    }, 500)

    // Surface pattern alerts at staggered intervals
    const alertTimers = pool.map((alert, i) => setTimeout(() => {
      setStreamAlerts(prev => [...prev, { ...alert, sites: resolvedSites.slice(0, 2 + (i % 4)).map(s => s.name) }])
    }, 4000 + i * 5000))

    return () => {
      clearInterval(tickId)
      alertTimers.forEach(clearTimeout)
    }
  }, [s1Streaming, streamCategory, resolvedSites, STREAM_ALERT_POOLS])

  // ── Status helpers ─────────────────────────────────────────────────────────
  const s0Status = (() => {
    if (queryPhase === 'sending')           return { dot: isDark ? '#48EFCF' : '#0B64DD', text: 'Sending query to all clusters…',     cls: isDark ? 'text-elastic-teal' : 'text-elastic-blue' }
    if (queryPhase === 'processing')        return { dot: '#FEC514',                       text: 'Clusters processing in parallel…',  cls: 'text-yellow-400'  }
    if (queryPhase === 'returning')         return { dot: '#F04E98',                       text: 'Aggregating results…',              cls: 'text-elastic-pink' }
    if (queryPhase === 'complete')          return { dot: null,                            text: '✓ Results from 4 clusters in 42ms', cls: isDark ? 'text-elastic-teal' : 'text-elastic-blue' }
    if (replicationPhase === 'replicating') return { dot: '#FEC514',                       text: 'Replicating data across clusters…', cls: 'text-yellow-400'  }
    if (replicationPhase === 'syncing')     return { dot: '#F04E98',                       text: 'Syncing all cluster nodes…',        cls: 'text-elastic-pink' }
    if (replicationPhase === 'complete')    return { dot: null,                            text: '✓ All clusters synchronized',       cls: isDark ? 'text-elastic-teal' : 'text-elastic-blue' }
    return { dot: null, text: 'Click Search All or Replicate', cls: isDark ? 'text-white/30' : 'text-elastic-dev-blue/30' }
  })()

  const s1Status = (() => {
    if (s1Phase === 'searching') return { dot: isDark ? '#48EFCF' : '#0B64DD', text: `Querying ${resolvedSites.length} remote sites…`, cls: isDark ? 'text-elastic-teal' : 'text-elastic-blue' }
    if (s1Phase === 'results')   return { dot: null,                            text: `✓ Results from ${resolvedSites.length} sites aggregated`, cls: isDark ? 'text-elastic-teal' : 'text-elastic-blue' }
    return { dot: null, text: 'Click Search All Sites to run a cross-cluster query', cls: isDark ? 'text-white/30' : 'text-elastic-dev-blue/30' }
  })()

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col px-8 pt-4 pb-3 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-1">

        {/* ── Shared header ──────────────────────────────────────────────── */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePart1}
          titleAccent={titlePart2}
          subtitle="Elastic powers distributed data access with secure, low-latency cross-cluster operations"
        />

        {/* ── Main row: stage content + right-side navigator ───────────── */}
        <div className="flex gap-3 flex-1 min-h-0">

        {/* ══════════════════ STAGE 0: OVERVIEW ══════════════════════════ */}
        {stage === 0 && (
          <div className="flex-1 min-h-0 flex gap-6 items-center">

            {/* Benefits sidebar */}
            <div className="w-64 flex-shrink-0 flex flex-col justify-center gap-3">
              {resolvedBenefits.map((b, i) => {
                const cluster = remoteClusters[i]
                const accent  = cluster ? (isDark ? cluster.darkColor : cluster.lightColor) : (isDark ? '#FEC514' : '#0B64DD')
                return (
                  <div
                    key={i}
                    ref={el => { benefitRefs.current[i] = el }}
                    className={`px-4 py-3 rounded-xl border-l-4 ${isDark ? 'bg-white/[0.03]' : 'bg-white/70 shadow-sm'}`}
                    style={{ borderLeftColor: accent, opacity: 0 }}
                  >
                    <p className={`text-sm ${isDark ? 'text-white/65' : 'text-elastic-dev-blue/65'}`}>{b.text}</p>
                    <p className="text-sm font-bold mt-0.5" style={{ color: accent }}>{b.highlight}</p>
                  </div>
                )
              })}
            </div>

            {/* Visualization panel */}
            <div className={`flex-1 flex flex-col rounded-2xl border overflow-hidden h-[420px] ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-elastic-dev-blue/10 shadow-sm'
            }`}>
              {/* Action bar */}
              <div className={`flex items-center justify-between px-5 py-2.5 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                <div className={`flex items-center gap-2 text-sm font-medium ${s0Status.cls}`}>
                  {s0Status.dot && <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: s0Status.dot }} />}
                  {s0Status.text}
                </div>
                <div className="flex gap-2">
                  <button onClick={runSearch} disabled={isAnimating}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
                      isDark ? 'bg-elastic-teal/15 hover:bg-elastic-teal/25 text-elastic-teal border-elastic-teal/30'
                             : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border-elastic-blue/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
                    {queryPhase !== 'idle' ? 'Searching…' : 'Search All'}
                  </button>
                  <button onClick={runReplicate} disabled={isAnimating}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
                      isDark ? 'bg-elastic-pink/15 hover:bg-elastic-pink/25 text-elastic-pink border-elastic-pink/30'
                             : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border-elastic-blue/20'
                    }`}
                  >
                    <FontAwesomeIcon icon={faArrowsRotate} className="text-xs" />
                    {replicationPhase !== 'idle' ? 'Syncing…' : 'Replicate'}
                  </button>
                </div>
              </div>

              {/* Inner column: main cluster → connection zone → remote clusters */}
              <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 pb-3">
                {/* Main cluster card */}
                <div className="flex justify-center flex-shrink-0">
                  <div ref={mainClusterRef}
                    className={`inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border-2 ${
                      isDark ? 'bg-elastic-dev-blue border-elastic-teal/40' : 'bg-white border-elastic-blue/30 shadow-md'
                    }`}
                    style={{ opacity: 0 }}
                  >
                    <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-9 h-9 object-contain" />
                    <div>
                      <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>elastic</div>
                      <div className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Main Cluster</div>
                    </div>
                  </div>
                </div>

                {/* Connection zone */}
                <div ref={connectionZoneRef} className="flex-1 relative min-h-0">
                  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    {Array.from({ length: CLUSTER_COUNT }, (_, i) => (
                      <path key={`qp-${i}`} ref={el => { queryPathRefs.current[i] = el }}
                        fill="none" stroke={isDark ? 'rgba(72,239,207,0.28)' : 'rgba(11,100,221,0.18)'}
                        strokeWidth="1.5" strokeLinecap="round" />
                    ))}
                    {Array.from({ length: CLUSTER_COUNT }, (_, i) => (
                      <path key={`rp-${i}`} ref={el => { returnPathRefs.current[i] = el }} fill="none" stroke="none" />
                    ))}
                    {Array.from({ length: REPL_COUNT }, (_, i) => (
                      <path key={`rfp-${i}`} ref={el => { replFwdPathRefs.current[i] = el }}
                        fill="none"
                        stroke={replicationPhase !== 'idle' ? 'rgba(254,197,20,0.45)' : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(11,100,221,0.06)'}
                        strokeWidth="1" strokeDasharray="4 3" />
                    ))}
                    {Array.from({ length: REPL_COUNT }, (_, i) => (
                      <path key={`rbp-${i}`} ref={el => { replBwdPathRefs.current[i] = el }} fill="none" stroke="none" />
                    ))}
                  </svg>

                  {Array.from({ length: CLUSTER_COUNT }, (_, i) => (
                    <div key={`qball-${i}`} ref={el => { queryBallRefs.current[i] = el }}
                      className="absolute rounded-full pointer-events-none"
                      style={{ width: 12, height: 12, left: 0, top: 0, marginLeft: -6, marginTop: -6,
                        backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                        boxShadow: isDark ? '0 0 10px 3px rgba(72,239,207,0.65)' : '0 0 10px 3px rgba(11,100,221,0.55)',
                        opacity: 0 }} />
                  ))}
                  {Array.from({ length: CLUSTER_COUNT }, (_, i) => (
                    <div key={`retball-${i}`} ref={el => { returnBallRefs.current[i] = el }}
                      className="absolute rounded-full pointer-events-none"
                      style={{ width: 12, height: 12, left: 0, top: 0, marginLeft: -6, marginTop: -6,
                        backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                        boxShadow: isDark ? '0 0 10px 3px rgba(72,239,207,0.65)' : '0 0 10px 3px rgba(11,100,221,0.55)',
                        opacity: 0 }} />
                  ))}
                  {Array.from({ length: REPL_COUNT }, (_, i) => (
                    <div key={`rfball-${i}`} ref={el => { replFwdBallRefs.current[i] = el }}
                      className="absolute rounded-full pointer-events-none"
                      style={{ width: 10, height: 10, left: 0, top: 0, marginLeft: -5, marginTop: -5,
                        backgroundColor: '#FEC514', boxShadow: '0 0 8px 3px rgba(254,197,20,0.65)', opacity: 0 }} />
                  ))}
                  {Array.from({ length: REPL_COUNT }, (_, i) => (
                    <div key={`rbball-${i}`} ref={el => { replBwdBallRefs.current[i] = el }}
                      className="absolute rounded-full pointer-events-none"
                      style={{ width: 10, height: 10, left: 0, top: 0, marginLeft: -5, marginTop: -5,
                        backgroundColor: '#FEC514', boxShadow: '0 0 8px 3px rgba(254,197,20,0.65)', opacity: 0 }} />
                  ))}
                </div>

                {/* Remote cluster cards */}
                <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                  {resolvedClusters.map((cluster, i) => {
                    const color       = isDark ? cluster.darkColor : cluster.lightColor
                    const isProcessing = queryPhase === 'processing'
                    return (
                      <div key={cluster.id} ref={el => { remoteClusterRefs.current[i] = el }}
                        className="relative rounded-xl overflow-hidden"
                        style={{ padding: '2px', opacity: 0 }}
                      >
                        <div className="absolute inset-0 rounded-xl overflow-hidden">
                          {isProcessing ? (
                            <div className="absolute animate-spin"
                              style={{ width: '200%', height: '200%', top: '-50%', left: '-50%',
                                background: `conic-gradient(from 0deg, ${color} 0%, ${color}88 30%, transparent 55%, transparent 100%)`,
                                animationDuration: '1.2s' }} />
                          ) : (
                            <div className="absolute inset-0" style={{ background: `${color}44` }} />
                          )}
                        </div>
                        <div className={`relative z-10 flex flex-col items-center p-3 rounded-[10px] ${isDark ? 'bg-elastic-dev-blue' : 'bg-white'}`}>
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ backgroundColor: `${color}20` }}>
                            <FontAwesomeIcon icon={ICON_MAP[cluster.type] ?? faCloud} style={{ color }} className="text-sm" />
                          </div>
                          <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{cluster.label}</div>
                          <div className="mt-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                            {cluster.name}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════ STAGE 1: IN PRACTICE ═══════════════════════ */}
        {stage === 1 && (
          <div className="flex-1 min-h-0 flex flex-col gap-2">

            {/* Toolbar */}
            <div className={`flex items-center justify-between px-4 py-1 rounded-xl border flex-shrink-0 ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-elastic-dev-blue/10 shadow-sm'
            }`}>
              {/* Left: status or result stats */}
              {s1HasResults && s1Phase !== 'searching' ? (
                <div className="flex items-center gap-6">
                  {[
                    { label: 'Sites Searched', value: String(resolvedSites.length) },
                    { label: 'Single Query',   value: '✓' },
                    { label: 'Data Locality',  value: '✓ Preserved' },
                  ].map((stat, j) => (
                    <div key={j} className="flex items-baseline gap-1.5">
                      <span className={`text-sm font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{stat.value}</span>
                      <span className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`flex items-center gap-2 text-sm font-medium ${s1Status.cls}`}>
                  {s1Status.dot && <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ backgroundColor: s1Status.dot }} />}
                  {s1Status.text}
                </div>
              )}
              <div className="flex items-center gap-2">
                {/* Category selector */}
                <div className={`flex items-center rounded-full border overflow-hidden text-xs ${
                  isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'
                }`}>
                  {[
                    { id: 'security',        label: 'Security'        },
                    { id: 'observability',   label: 'Observability'   },
                    { id: 'infrastructure',  label: 'AutoOps'  },
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setStreamCategory(cat.id)
                        if (s1Streaming) { stopS1Stream(); setTimeout(startS1Stream, 50) }
                      }}
                      className={`px-3 py-1.5 font-medium transition-all ${
                        streamCategory === cat.id
                          ? (isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue')
                          : (isDark ? 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]' : 'text-elastic-dev-blue/35 hover:text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/[0.04]')
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <button
                  onClick={s1Streaming ? stopS1Stream : startS1Stream}
                  disabled={s1Phase === 'searching'}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
                    s1Streaming
                      ? (isDark ? 'bg-elastic-pink/15 hover:bg-elastic-pink/25 text-elastic-pink border-elastic-pink/30'
                                : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border-elastic-blue/20')
                      : (isDark ? 'bg-white/[0.05] hover:bg-white/10 text-white/60 border-white/10'
                                : 'bg-elastic-dev-blue/[0.05] hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/60 border-elastic-dev-blue/10')
                  }`}
                >
                  <FontAwesomeIcon icon={faArrowsRotate} className={`text-xs ${s1Streaming ? 'animate-spin' : ''}`} />
                  {s1Streaming ? 'Stop Stream' : 'Stream Data'}
                </button>
                <button
                  onClick={runS1Search}
                  disabled={s1Phase !== 'idle'}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed border ${
                    isDark ? 'bg-elastic-teal/15 hover:bg-elastic-teal/25 text-elastic-teal border-elastic-teal/30'
                           : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border-elastic-blue/20'
                  }`}
                >
                  <FontAwesomeIcon icon={faMagnifyingGlass} className="text-xs" />
                  {s1Phase === 'searching' ? 'Searching…' : 'Search All Sites'}
                </button>
              </div>
            </div>

            {/* Main row: viz + results panel */}
            <div className="flex-1 min-h-0 flex gap-2">

            {/* Visualization */}
            <div ref={s1VizRef} className={`flex-1 min-h-0 relative rounded-2xl border overflow-hidden ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-elastic-dev-blue/10 shadow-sm'
            }`}>

              {/* SVG paths — pixel coords set by setupS1Paths(), same as Stage 0 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg" style={{ zIndex: 1 }}>
                {resolvedSites.map((_, i) => {
                  const color = isDark ? SITE_DARK_COLORS[i % SITE_DARK_COLORS.length] : '#0B64DD'
                  return (
                    <g key={`s1g-${i}`}>
                      <path
                        ref={el => { s1PathRefs.current[i] = el }}
                        fill="none"
                        stroke={isDark ? `${color}47` : 'rgba(11,100,221,0.28)'}
                        strokeWidth="1.5" strokeLinecap="round"
                      />
                      {/* Invisible return path for createMotionPath */}
                      <path ref={el => { s1RetPathRefs.current[i] = el }} fill="none" stroke="none" />
                    </g>
                  )
                })}
              </svg>

              {/* Hub card */}
              <div
                ref={s1HubRef}
                className={`absolute z-10 inline-flex items-center gap-3 px-6 py-3 rounded-2xl border-2 min-w-[320px] ${
                  isDark ? 'bg-elastic-dev-blue border-elastic-teal/40' : 'bg-white border-elastic-blue/30 shadow-lg'
                }`}
                style={{ left: `${HUB_X}%`, top: `${HUB_Y}%`, transform: 'translate(-50%, -50%)', opacity: 0 }}
              >
                <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-10 h-10 object-contain" />
                <div>
                  <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{hubName}</div>
                  <div className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{hubSubtitle}</div>
                  <div className={`mt-1 flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                    isDark ? 'bg-white/[0.06] border border-white/10 text-elastic-teal/70'
                           : 'bg-elastic-dev-blue/[0.04] border border-elastic-dev-blue/10 text-elastic-blue/70'
                  }`}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className="text-[8px]" />
                    {searchQuery}
                  </div>
                </div>
              </div>

              {/* Site cards */}
              {resolvedSites.map((site, i) => {
                const pos        = sitePositions[i]
                const color      = isDark ? SITE_DARK_COLORS[i % SITE_DARK_COLORS.length] : '#0B64DD'
                const isSearching = s1Phase === 'searching'
                return (
                  <div
                    key={`site-${i}`}
                    ref={el => { s1SiteRefs.current[i] = el }}
                    className="absolute z-10 rounded-2xl overflow-hidden"
                    style={{
                      left: `${pos.x}%`, top: `${pos.y}%`,
                      transform: 'translate(-50%, -50%)',
                      padding: '2px',
                      opacity: 0,
                    }}
                  >
                    {/* Animated border ring while searching */}
                    <div className="absolute inset-0 rounded-2xl overflow-hidden">
                      {isSearching ? (
                        <div className="absolute animate-spin"
                          style={{ width: '200%', height: '200%', top: '-50%', left: '-50%',
                            background: `conic-gradient(from 0deg, ${color} 0%, ${color}88 30%, transparent 55%, transparent 100%)`,
                            animationDuration: '1.2s' }} />
                      ) : (
                        <div className="absolute inset-0" style={{ background: `${color}44` }} />
                      )}
                    </div>
                    <div className={`relative z-10 flex items-center gap-2.5 px-3 py-2 rounded-[14px] w-[190px] ${
                      isDark ? 'bg-elastic-dev-blue' : 'bg-white'
                    }`}>
                      <div className="w-7 h-7 flex-shrink-0 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                        <FontAwesomeIcon icon={ICON_MAP[site.type] ?? faCloud} style={{ color }} className="text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                          {site.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-medium px-1.5 py-0 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
                            {site.region}
                          </span>
                          <span className={`text-[10px] ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>
                            {site.docs} docs
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* Outbound query balls — at 0,0; createMotionPath drives them */}
              {resolvedSites.map((_, i) => (
                <div key={`s1out-${i}`}
                  ref={el => { s1OutBallRefs.current[i] = el }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 12, height: 12, left: 0, top: 0, marginLeft: -6, marginTop: -6,
                    backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                    boxShadow: isDark ? '0 0 10px 3px rgba(72,239,207,0.65)' : '0 0 10px 3px rgba(11,100,221,0.55)',
                    opacity: 0, zIndex: 5,
                  }} />
              ))}

              {/* Streaming ball pool — shared across all sites */}
              {Array.from({ length: 20 }, (_, i) => (
                <div key={`s1stream-${i}`}
                  ref={el => { s1StreamBallRefs.current[i] = el }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 8, height: 8, left: 0, top: 0, marginLeft: -4, marginTop: -4,
                    backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                    opacity: 0, zIndex: 4,
                  }} />
              ))}

              {/* Return result balls */}
              {resolvedSites.map((_, i) => (
                <div key={`s1ret-${i}`}
                  ref={el => { s1RetBallRefs.current[i] = el }}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    width: 12, height: 12, left: 0, top: 0, marginLeft: -6, marginTop: -6,
                    backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                    boxShadow: isDark ? '0 0 10px 3px rgba(72,239,207,0.65)' : '0 0 10px 3px rgba(11,100,221,0.55)',
                    opacity: 0, zIndex: 5,
                  }} />
              ))}


            </div>{/* end viz */}

            {/* Results panel */}
            <div className={`w-[500px] flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden ${
              isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white border-elastic-dev-blue/10 shadow-sm'
            }`}>
              {/* Panel header */}
              <div className={`flex items-center justify-between px-4 py-2.5 border-b flex-shrink-0 ${
                isDark ? 'border-white/8' : 'border-elastic-dev-blue/8'
              }`}>
                <div className="flex items-center gap-2">
                  {s1Streaming && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ backgroundColor: catMeta.accent }} />
                      <span className="relative inline-flex rounded-full h-2 w-2"
                        style={{ backgroundColor: catMeta.accent }} />
                    </span>
                  )}
                  <div className={`text-xs font-semibold uppercase tracking-wider`}
                    style={s1Streaming ? { color: catMeta.accent, opacity: 0.8 } : {}}>
                    <span className={!s1Streaming ? (isDark ? 'text-white/40' : 'text-elastic-dev-blue/40') : ''}>
                      {s1Streaming ? catMeta.label : 'Search Results'}
                    </span>
                  </div>
                </div>
                {s1Streaming && streamTotalEvts > 0 && (
                  <div className={`text-xs font-mono tabular-nums ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'}`}>
                    {streamTotalEvts.toLocaleString()} events
                  </div>
                )}
                {!s1Streaming && s1HasResults && (
                  <div className={`text-xs font-mono ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'}`}>
                    {resolvedSites.reduce((sum, s) => sum + (parseFloat(s.docs) || 0), 0).toFixed(1)}M hits
                  </div>
                )}
              </div>

              {/* Panel body — Streaming view */}
              {s1Streaming && (
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">

                  {/* Funnel strip */}
                  <div className={`flex-shrink-0 px-3 pt-3 pb-2.5 border-b ${isDark ? 'border-white/8' : 'border-elastic-dev-blue/8'}`}>
                    <div className="flex items-stretch gap-0">
                      {/* Step 1 — Events */}
                      <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                        <div className="text-xl font-bold tabular-nums leading-none" style={{ color: catMeta.accent }}>
                          {streamTotalEvts >= 1000000
                            ? `${(streamTotalEvts / 1000000).toFixed(1)}M`
                            : `${(streamTotalEvts / 1000).toFixed(0)}K`}
                        </div>
                        <div className={`text-[9px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                          events
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center px-0.5">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                          <path d="M0 6 H14 M10 2 L14 6 L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={isDark ? 'text-white/15' : 'text-elastic-dev-blue/15'} />
                        </svg>
                      </div>

                      {/* Step 2 — Correlations */}
                      <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                        <div className={`text-xl font-bold tabular-nums leading-none ${isDark ? 'text-amber-400' : 'text-elastic-blue'}`}>
                          {streamCorrelations}
                        </div>
                        <div className={`text-[9px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                          correlated
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center px-0.5">
                        <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
                          <path d="M0 6 H14 M10 2 L14 6 L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                            className={isDark ? 'text-white/15' : 'text-elastic-dev-blue/15'} />
                        </svg>
                      </div>

                      {/* Step 3 — Alerts */}
                      <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                        <div className={`text-xl font-bold tabular-nums leading-none ${isDark ? 'text-elastic-pink' : 'text-elastic-blue'}`}>
                          {streamAlerts.length}
                        </div>
                        <div className={`text-[9px] uppercase tracking-widest mt-0.5 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>
                          alerts
                        </div>
                      </div>
                    </div>

                    {/* Cluster activity dots */}
                    <div className="flex items-center gap-x-2 gap-y-1.5 mt-3 flex-wrap justify-center">
                      {resolvedSites.map((site, si) => {
                        const rate  = streamSiteRates[si] ?? 0
                        const color = isDark ? SITE_DARK_COLORS[si % SITE_DARK_COLORS.length] : '#0B64DD'
                        const pulseDuration = `${Math.max(0.4, 2 - (rate / 100) * 1.6).toFixed(2)}s`
                        return (
                          <div key={si} className="flex items-center gap-1 group" title={site.name}>
                            <div className="w-1.5 h-1.5 rounded-full animate-pulse flex-shrink-0"
                              style={{ backgroundColor: color, animationDuration: pulseDuration }} />
                            <span className={`text-[9px] font-mono max-w-[56px] truncate transition-colors ${isDark ? 'text-white/25 group-hover:text-white/50' : 'text-elastic-dev-blue/25 group-hover:text-elastic-dev-blue/50'}`}>
                              {site.name.split(' ')[0]}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Alert cards */}
                  <div className="flex-1 min-h-0 p-3 flex flex-col gap-2.5">
                    {streamAlerts.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-8">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 rounded-full border-2 border-dashed animate-spin"
                            style={{ borderColor: `${catMeta.accent}35`, animationDuration: '3s' }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: catMeta.accent }} />
                          </div>
                        </div>
                        <div>
                          <div className={`text-xs font-medium ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                            Scanning for cross-cluster patterns
                          </div>
                          <div className={`text-[10px] mt-0.5 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                            Correlating events across {resolvedSites.length} clusters…
                          </div>
                        </div>
                      </div>
                    )}

                    {streamAlerts.slice(-4).map((alert, i, arr) => {
                      const sevColor = isDark
                        ? ( alert.severity === 'Critical' ? { border: '#F04E9840', text: '#F04E98', glow: '#F04E9812' }
                          : alert.severity === 'High'     ? { border: '#FEC51440', text: '#FEC514', glow: '#FEC51412' }
                          : alert.severity === 'Medium'   ? { border: '#FF7E4240', text: '#FF7E42', glow: '#FF7E4212' }
                          :                                  { border: `${catMeta.accent}40`, text: catMeta.accent, glow: `${catMeta.accent}10` } )
                        : { border: '#0B64DD40', text: '#0B64DD', glow: '#0B64DD08' }
                      const isHighRisk = alert.severity === 'Critical' || alert.severity === 'High'
                      // Use the global index (offset from total) as the key so React unmounts the oldest card cleanly
                      const globalIdx = streamAlerts.length - arr.length + i
                      return (
                        <div
                          key={globalIdx}
                          className="rounded-xl border flex flex-row gap-0 overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-500 flex-shrink-0 h-[66px]"
                          style={{ borderColor: sevColor.border, backgroundColor: sevColor.glow }}
                        >
                          {/* Left accent stripe */}
                          <div className="w-0.5 flex-shrink-0" style={{ backgroundColor: sevColor.text }} />

                          {/* Compact card content */}
                          <div className="flex-1 min-w-0 px-2.5 py-2 flex flex-col justify-between">

                            {/* Row 1: bell + ALERT + title | ⚠ isolated + severity badge */}
                            <div className="flex items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <FontAwesomeIcon icon={faBell} className="text-[8px] flex-shrink-0" style={{ color: sevColor.text }} />
                                <span className="text-[8px] font-bold uppercase tracking-wider flex-shrink-0" style={{ color: sevColor.text }}>
                                  Alert
                                </span>
                                <span className={`text-[11px] font-semibold flex-1 truncate min-w-0 ${isDark ? 'text-white/90' : 'text-elastic-dev-blue/90'}`}>
                                  {alert.title}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {isHighRisk && (
                                  <span className={`text-[8px] px-1 py-0.5 rounded ${isDark ? 'text-white/30 bg-white/[0.06]' : 'text-elastic-dev-blue/30 bg-elastic-dev-blue/[0.06]'}`}>
                                    ⚠ isolated
                                  </span>
                                )}
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full w-[54px] text-center"
                                  style={{ color: sevColor.text, backgroundColor: `${sevColor.text}20`, border: `1px solid ${sevColor.text}35` }}>
                                  {alert.severity}
                                </span>
                              </div>
                            </div>

                            {/* Row 2: description, single line truncated */}
                            <p className={`text-[10px] leading-snug truncate ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                              {alert.desc}
                            </p>

                            {/* Row 3: cluster dots + event count */}
                            <div className="flex items-center gap-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                                {alert.sites.map((s, j) => {
                                  const c = isDark ? SITE_DARK_COLORS[j % SITE_DARK_COLORS.length] : '#0B64DD'
                                  return (
                                    <div key={j} className="flex items-center gap-0.5 flex-shrink-0" title={s}>
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: c }} />
                                      <span className="text-[8px] font-mono max-w-[52px] truncate" style={{ color: c }}>{s.split(' ')[0]}</span>
                                    </div>
                                  )
                                })}
                              </div>
                              <span className={`ml-auto text-[8px] font-mono tabular-nums flex-shrink-0 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                                {alert.count.toLocaleString()} events
                              </span>
                            </div>

                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Cumulative stats footer */}
                  <div className={`flex-shrink-0 border-t px-4 py-2 flex items-center gap-5 ${isDark ? 'border-white/8 bg-black/20' : 'border-elastic-dev-blue/8 bg-elastic-dev-blue/[0.03]'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-bold tabular-nums" style={{ color: catMeta.accent }}>
                        {streamTotalEvts >= 1000000
                          ? `${(streamTotalEvts / 1000000).toFixed(2)}M`
                          : `${(streamTotalEvts / 1000).toFixed(1)}K`}
                      </span>
                      <span className={`text-[9px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>ingested</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xs font-bold tabular-nums ${isDark ? 'text-amber-400' : 'text-elastic-blue'}`}>{streamCorrelations}</span>
                      <span className={`text-[9px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>correlated</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-xs font-bold tabular-nums ${isDark ? 'text-elastic-pink' : 'text-elastic-blue'}`}>{streamAlerts.length}</span>
                      <span className={`text-[9px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>surfaced</span>
                    </div>
                  </div>

                </div>
              )}

              {/* Panel body — Search / idle view */}
              {!s1Streaming && (
                <div className="flex-1 min-h-0 overflow-hidden">
                  {s1Phase === 'idle' && !s1HasResults && (
                    <div className="h-full flex flex-col items-center justify-center gap-3 px-6 text-center">
                      <FontAwesomeIcon icon={faMagnifyingGlass} className={`text-2xl ${isDark ? 'text-white/15' : 'text-elastic-dev-blue/15'}`} />
                      <p className={`text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                        Run a search to see results aggregated from all remote sites
                      </p>
                    </div>
                  )}

                  {s1Phase === 'searching' && (
                    <div className="p-3 space-y-2">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className={`h-10 rounded-lg animate-pulse ${isDark ? 'bg-white/[0.04]' : 'bg-elastic-dev-blue/[0.04]'}`}
                          style={{ animationDelay: `${i * 80}ms` }} />
                      ))}
                    </div>
                  )}

                  {s1HasResults && s1Phase !== 'searching' && (
                    <div className="p-2 space-y-1">
                      {resolvedSites.flatMap((site, si) =>
                        Array.from({ length: Math.max(1, Math.min(4, Math.round(parseFloat(site.docs) || 1))) }, (_, ri) => ({
                          site, si, ri,
                          ts: `2024-01-${String(15 + si).padStart(2,'0')}T${String(8 + ri).padStart(2,'0')}:${String(si * 7 + ri * 13).padStart(2,'0')}:00Z`,
                          level: ['INFO','WARN','INFO','ERROR','INFO'][(si + ri) % 5],
                          msg:   ['Connection established','Auth token refreshed','Index shard rotated','Query timeout retry','Snapshot completed'][(si * 3 + ri) % 5],
                        }))
                      ).slice(0, 8).map(({ site, si, ri, ts, level, msg }) => {
                        const color = isDark ? SITE_DARK_COLORS[si % SITE_DARK_COLORS.length] : '#0B64DD'
                        const levelColor = level === 'ERROR' ? '#F04E98' : level === 'WARN' ? '#FEC514' : (isDark ? '#48EFCF' : '#0B64DD')
                        return (
                          <div key={`${si}-${ri}`} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-mono ${
                            isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-elastic-dev-blue/[0.03]'
                          }`}>
                            <span className="flex-shrink-0 font-bold text-[10px] mt-0.5" style={{ color: levelColor }}>{level}</span>
                            <div className="flex-1 min-w-0">
                              <div className={`truncate ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{msg}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] px-1 rounded" style={{ backgroundColor: `${color}20`, color }}>{site.name}</span>
                                <span className={`text-[9px] ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{ts.slice(11, 19)}</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>{/* end results panel */}

            </div>{/* end main row */}
          </div>
        )}

          {/* ── Right-side stage navigator ──────────────────────────────── */}
          <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center relative select-none">
            {/* Track line */}
            <div className={`absolute w-px top-[20%] bottom-[20%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
            {/* Progress fill */}
            <div
              className={`absolute w-px top-[20%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
              style={{ height: `${(stage / (STAGES.length - 1)) * 60}%` }}
            />
            {STAGES.map((s, i) => {
              const isActive = i === stage
              const isDone   = i < stage
              return (
                <button
                  key={s.id}
                  onClick={() => { stopS1Stream(); setStage(i) }}
                  className="relative z-10 group flex flex-col items-center py-7"
                  title={s.label}
                >
                  {/* Hover label (appears to the left) */}
                  <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border shadow-lg ${
                    isDark ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10' : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'
                  }`}>
                    {s.label}
                  </span>
                  {/* Circle */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                    isActive
                      ? isDark
                        ? 'bg-elastic-dev-blue border-elastic-teal text-elastic-teal scale-110 shadow-[0_0_14px_rgba(72,239,207,0.3)]'
                        : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                      : isDone
                        ? isDark
                          ? 'bg-elastic-dev-blue border-elastic-teal/40 text-elastic-teal/70'
                          : 'bg-elastic-light-grey border-elastic-blue/30 text-elastic-blue/60'
                        : isDark
                          ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                          : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                  }`}>
                    {isDone
                      ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                      : <FontAwesomeIcon icon={s.icon} className="text-xs" />
                    }
                  </div>
                </button>
              )
            })}
          </div>{/* /Right nav */}

        </div>{/* /Main row */}

      </div>
    </div>
  )
}

export default CrossClusterScene
