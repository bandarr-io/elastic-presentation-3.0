import { animate, stagger } from 'animejs'
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import SceneHeader from '../components/SceneHeader'
import { easingPresets } from '../animations/utils/easing'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase, faMagnifyingGlass, faMemory, faHardDrive, faBolt,
  faCircleNodes, faWarehouse, faWater, faCopy, faGlobe,
  faCheck, faTimes, faDollarSign, faClock,
  faSnowflake, faPlay, faLayerGroup, faArrowUp,
  faCircleQuestion, faTriangleExclamation, faWrench, faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'

const STAGES = [
  { id: 'question',       label: 'The Question',    icon: faCircleQuestion      },
  { id: 'dilemma',        label: 'The Dilemma',     icon: faCodeBranch          },
  { id: 'problems',       label: 'The Problems',    icon: faTriangleExclamation },
  { id: 'workarounds',    label: 'The Workarounds', icon: faWrench              },
  { id: 'transformation', label: 'The Solution',    icon: faCircleNodes         },
]

const ARCH = {
  catalog:    { label: 'Metadata Catalog',  subtitle: 'The Dewey Decimal approach', color: '#FEC514', lightColor: '#0B64DD', icon: faLayerGroup, problems: ["Only stores pointers, not data", "Can't actually query the data", "Requires manual discovery", "No unified access layer"] },
  federation: { label: 'Federated Search',  subtitle: 'Query translator',           color: '#0B64DD', lightColor: '#0B64DD', icon: faCopy,       problems: ["Bridges incompatible systems", "Slow cross-system queries", "Inconsistent results", "No unified schema"] },
  lake:       { label: 'Data Lake',         subtitle: 'Store everything raw',       color: '#48EFCF', lightColor: '#0B64DD', icon: faWater,      problems: ["Data goes in, rarely comes out", "Only data scientists can use it", "Requires ETL to be useful", "Becomes a data swamp"] },
  warehouse:  { label: 'Data Warehouse',    subtitle: 'Rigid structured storage',   color: '#F04E98', lightColor: '#0B64DD', icon: faWarehouse,  problems: ["Rigid schema limits flexibility", "Expensive to scale", "Slow for real-time queries", "Can't handle all data types"] },
}

const SILO_POSITIONS = [
  { x: '11%', y: '16%', label: 'US-East',  color: '#48EFCF' },
  { x: '76%', y: '13%', label: 'EU-West',  color: '#0B64DD' },
  { x: '20%', y: '72%', label: 'APAC',     color: '#F04E98' },
  { x: '57%', y: '78%', label: 'Archive',  color: '#FEC514' },
  { x: '40%', y: '42%', label: '???',      color: '#FF957D' },
  { x: '87%', y: '60%', label: 'Legacy',   color: '#9B59B6' },
  { x: '6%',  y: '50%', label: 'On-Prem',  color: '#3498DB' },
  { x: '63%', y: '28%', label: 'Cloud',    color: '#1ABC9C' },
  { x: '33%', y: '8%',  label: 'Logs',     color: '#E74C3C' },
]

const QM_POSITIONS = [
  { x: '34%', y: '38%', size: 'text-3xl' }, { x: '59%', y: '18%', size: 'text-2xl' },
  { x: '22%', y: '62%', size: 'text-xl'  }, { x: '82%', y: '44%', size: 'text-2xl' },
  { x: '56%', y: '60%', size: 'text-3xl' }, { x: '91%', y: '26%', size: 'text-xl'  },
  { x: '43%', y: '86%', size: 'text-2xl' }, { x: '77%', y: '70%', size: 'text-xl'  },
]

const DEFAULT_SEARCH_ITEMS = [
  { text: 'Query instantly', good: true  },
  { text: 'Pivot & explore', good: true  },
  { text: 'Milliseconds',    good: true  },
  { text: '$4+ per GB',      good: false },
]

const DEFAULT_STORAGE_ITEMS = [
  { text: 'Batch scan only',  good: false },
  { text: 'Rehydrate first',  good: false },
  { text: 'Minutes to hours', good: false },
  { text: '$0.02 per GB',     good: true  },
]

const DEFAULT_PROBLEMS_CARDS = [
  { icon: faDatabase, title: 'Data Silos',    desc: "Isolated pools that can't talk to each other",  darkColor: '#FF957D', lightColor: '#0B64DD' },
  { icon: faClock,    title: 'Slow Insights', desc: 'Minutes to hours before you can query',         darkColor: '#F04E98', lightColor: '#153385' },
  { icon: faGlobe,    title: 'No Visibility', desc: "Can't see across the enterprise",               darkColor: '#FEC514', lightColor: '#0B64DD' },
  { icon: faCopy,     title: 'Data Sprawl',   desc: 'Copies everywhere, truth nowhere',              darkColor: '#48EFCF', lightColor: '#153385' },
]

const DEFAULT_MESH_NODES = [
  { x: '9%',    y: '16%', label: 'Site 1', color: '#48EFCF', lightColor: '#0B64DD' },
  { x: '44.5%', y: '16%', label: 'Site 2', color: '#F04E98', lightColor: '#0B64DD' },
  { x: '80%',   y: '16%', label: 'Site N', color: '#FEC514', lightColor: '#0B64DD' },
]

const SEARCH_ITEM_ICONS  = [faBolt, faMagnifyingGlass, faClock, faDollarSign]
const STORAGE_ITEM_ICONS = [faLayerGroup, faClock, faClock, faDollarSign]

const MAX_MESH_BALLS = 12

function DataMeshScene({ scenes = [], onNavigate, metadata = {}, runQuerySignal = 0, onQueryStateChange, playSignal = 0, onPlayStateChange, summarySignal = 0, onSummaryStateChange, activateMeshSignal = 0, onActivateMeshStateChange }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const navigateToSceneById = useCallback((sceneId) => {
    const index = scenes.findIndex(s => s.id === sceneId)
    if (index !== -1 && onNavigate) onNavigate(index)
  }, [scenes, onNavigate])

  // ── State ─────────────────────────────────────────────────────────────────
  const [stage,          setStage]          = useState(0)
  const [showAnswer,     setShowAnswer]     = useState(false)
  const [meshActive,     setMeshActive]     = useState(false)
  const [queryActive,    setQueryActive]    = useState(false)
  const [queryRan,       setQueryRan]       = useState(false)
  const [isTyping,       setIsTyping]       = useState(false)
  const [searchComplete, setSearchComplete] = useState(false)
  const [selectedArch,   setSelectedArch]   = useState(null)
  const [showSummary,    setShowSummary]    = useState(false)

  // ── Refs ──────────────────────────────────────────────────────────────────
  const stageRef          = useRef(null)
  const particleRef       = useRef(null)
  const meshVizRef        = useRef(null)
  const meshPathRefs      = useRef([])
  const meshBallPoolRef   = useRef([])
  const nodeRefs          = useRef([null, null, null])
  const timersRef         = useRef([])
  const isDarkRef         = useRef(isDark)
  useEffect(() => { isDarkRef.current = isDark }, [isDark])

  const [arrowLines, setArrowLines] = useState(null)
  const meshInnerRef    = useRef(null)
  const searchBarRef        = useRef(null)
  const cursorRef           = useRef(null)
  const textSpanRef         = useRef(null)
  const searchBarAnimatedRef = useRef(false)
  const answerCardRef    = useRef(null)
  const answerHeadRef    = useRef(null)
  const answerBodyRef    = useRef(null)
  const answerFootRef    = useRef(null)
  const problemsPanelRef = useRef(null)

  const { shouldAnimate, getDuration } = useReducedMotion()

  // ── Content config ────────────────────────────────────────────────────────

  // Header
  const eyebrow    = metadata.eyebrow    || 'Data Architecture'
  const titlePart1 = metadata.titlePart1 || 'From Chaos to '
  const titlePart2 = metadata.titlePart2 || 'Clarity'
  const subtitle   = metadata.subtitle   || 'How Elastic creates an enterprise-wide data mesh to search and act on data at scale.'

  // Stage nav — allow per-stage label overrides
  const stages = STAGES.map((s, i) => ({ ...s, label: (metadata.stageLabels || [])[i] || s.label }))

  // Stage 0 — The Question
  const questionText  = metadata.question      || 'Why do we collect data?'
  const answerHeading = metadata.answerHeading || 'To use it.'
  const answerBody    = metadata.answerBody    || null
  const answerFooter  = metadata.answerFooter  || null

  // Stage 1 — The Dilemma
  const dilemmaIntro            = metadata.dilemmaIntro            || 'The industry faced a choice...'
  const dilemmaLeftTitle        = metadata.dilemmaLeftTitle        || 'Search'
  const dilemmaLeftSubtitle     = metadata.dilemmaLeftSubtitle     || 'Like memory'
  const dilemmaLeftItems        = (metadata.dilemmaLeftItems  || DEFAULT_SEARCH_ITEMS).map((item, i) => ({ ...item, icon: SEARCH_ITEM_ICONS[i]  }))
  const dilemmaLeftFooter       = metadata.dilemmaLeftFooter       || 'Fast & flexible, but expensive'
  const dilemmaRightTitle       = metadata.dilemmaRightTitle       || 'Storage'
  const dilemmaRightSubtitle    = metadata.dilemmaRightSubtitle    || 'Like disk'
  const dilemmaRightItems       = (metadata.dilemmaRightItems || DEFAULT_STORAGE_ITEMS).map((item, i) => ({ ...item, icon: STORAGE_ITEM_ICONS[i] }))
  const dilemmaRightFooter      = metadata.dilemmaRightFooter      || 'Cheap but slow'
  const dilemmaCalloutPrefix    = metadata.dilemmaCalloutPrefix    || 'Cost won. The industry went'
  const dilemmaCalloutHighlight = metadata.dilemmaCalloutHighlight || 'storage-first'
  const dilemmaCalloutSub       = metadata.dilemmaCalloutSub       || 'But that created new problems...'

  // Stage 2 — The Problems
  const problemsIntro   = metadata.problemsIntro   || 'Storage-first seemed smart… until the cracks appeared'
  const problemsCards   = DEFAULT_PROBLEMS_CARDS.map((d, i) => ({ ...d, ...(metadata.problemsCards?.[i] || {}) }))
  const problemsCallout = metadata.problemsCallout || 'The industry needed solutions. Workarounds emerged…'

  // Stage 3 — The Workarounds
  const workaroundsEyebrow       = metadata.workaroundsEyebrow       || "The Industry's Attempts"
  const workaroundsHeadingPrefix = metadata.workaroundsHeadingPrefix || 'Workarounds emerged… but data stayed'
  const workaroundsHighlight     = metadata.workaroundsHighlight     || 'trapped'
  const workaroundsEmptyState    = metadata.workaroundsEmptyState    || 'Select a workaround to see why it falls short'
  const workaroundsFallsShort    = metadata.workaroundsFallsShort    || 'Why it falls short'
  const summaryCallout           = metadata.summaryCallout           || null
  const arch = Object.fromEntries(
    ['catalog', 'warehouse', 'lake', 'federation'].map((key, i) => [
      key,
      { ...ARCH[key], ...(metadata.archItems?.[i] || {}) }
    ])
  )

  // Stage 4 — The Transformation
  const siloTitle = metadata.siloTitle || 'What if you could search everywhere without copying anything?'
  const meshTitle = metadata.meshTitle || 'The Elastic Data Mesh: Query globally, store locally'
  const silos     = metadata.silos     || SILO_POSITIONS
  const meshNodes = DEFAULT_MESH_NODES.map((d, i) => ({ ...d, ...(metadata.meshNodes?.[i] || {}) }))

  // ── Stable particle positions ─────────────────────────────────────────────
  const particles = useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 5 + Math.random() * 5,
      color: ['#48EFCF', '#0B64DD', '#F04E98', '#FEC514', '#FF957D'][i % 5],
      dx: (Math.random() - 0.5) * 60,
      dy: (Math.random() - 0.5) * 60,
      dur: 3000 + Math.random() * 4000,
    })), []
  )

  // ── Reset search bar animation state when leaving stage 0 ───────────────
  useEffect(() => {
    if (stage !== 0) searchBarAnimatedRef.current = false
  }, [stage])

  // ── Blinking cursor (from HeroScene) ─────────────────────────────────────
  useEffect(() => {
    if (cursorRef.current && !searchComplete && shouldAnimate(true)) {
      animate(cursorRef.current, {
        opacity: [1, 0, 1],
        duration: getDuration(1200),
        easing: 'linear',
        loop: true,
      })
    }
  }, [searchComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Answer card staged reveal ─────────────────────────────────────────────
  useEffect(() => {
    if (!showAnswer) return
    const card = answerCardRef.current
    const head = answerHeadRef.current
    const body = answerBodyRef.current
    const foot = answerFootRef.current
    if (!card) return

    card.style.opacity   = '0'
    card.style.transform = 'translateY(24px)'
    if (head) { head.style.opacity = '0'; head.style.transform = 'translateY(16px)' }
    if (body) { body.style.opacity = '0'; body.style.transform = 'translateY(12px)' }
    if (foot) { foot.style.opacity = '0'; foot.style.transform = 'translateY(10px)' }

    if (!shouldAnimate()) {
      ;[card, head, body, foot].forEach(el => {
        if (el) { el.style.opacity = '1'; el.style.transform = 'none' }
      })
      return
    }

    // Card container fades in first
    animate(card, {
      opacity:    [0, 1],
      translateY: [24, 0],
      duration:   getDuration(400),
      easing:     easingPresets.entrance,
    })
    // Headline slams in with a slight overshoot
    if (head) animate(head, {
      opacity:    [0, 1],
      translateY: [16, 0],
      duration:   getDuration(500),
      delay:      getDuration(120),
      easing:     'easeOutBack',
    })
    // Body follows
    if (body) animate(body, {
      opacity:    [0, 1],
      translateY: [12, 0],
      duration:   getDuration(400),
      delay:      getDuration(280),
      easing:     easingPresets.entrance,
    })
    // Footer last
    if (foot) animate(foot, {
      opacity:    [0, 1],
      translateY: [10, 0],
      duration:   getDuration(400),
      delay:      getDuration(420),
      easing:     easingPresets.entrance,
    })
  }, [showAnswer, shouldAnimate, getDuration])

  // ── Problems panel slide-up when arch selected ───────────────────────────
  useEffect(() => {
    const panel = problemsPanelRef.current
    if (!panel) return
    if (selectedArch) {
      panel.style.opacity   = '0'
      panel.style.transform = 'translateY(16px)'
      animate(panel, {
        opacity:    [0, 1],
        translateY: [16, 0],
        duration:   getDuration(350),
        easing:     easingPresets.entrance,
      })
    }
  }, [selectedArch]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stage entrance — pre-hide items before browser paint ─────────────────
  useLayoutEffect(() => {
    const items = Array.from(stageRef.current?.querySelectorAll('[data-ani]') ?? [])
    items.forEach(item => { item.style.opacity = '0'; item.style.transform = 'translateY(18px)' })
    // Hide the search bar on stage 0 mount so it waits for the play-button trigger
    if (stage === 0 && searchBarRef.current && !searchBarAnimatedRef.current) {
      searchBarRef.current.style.opacity = '0'
      searchBarRef.current.style.transform = 'translateY(40px)'
    }
  }, [stage, showAnswer, meshActive, selectedArch])

  // ── Stage entrance — animate items in after paint ─────────────────────────
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      const items = Array.from(el.querySelectorAll('[data-ani]'))
      if (!items.length) return
      animate(items, {
        opacity:    [0, 1],
        translateY: [18, 0],
        delay:      stagger(65),
        duration:   420,
        easing:     'easeOutCubic',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [stage, showAnswer, meshActive, selectedArch])

  // ── Summary view entrance — pre-hide ──────────────────────────────────────
  useLayoutEffect(() => {
    if (!showSummary) return
    const items = Array.from(stageRef.current?.querySelectorAll('[data-ani]') ?? [])
    items.forEach(item => { item.style.opacity = '0'; item.style.transform = 'translateY(18px)' })
  }, [showSummary])

  // ── Summary view entrance — animate in ───────────────────────────────────
  useEffect(() => {
    if (!showSummary) return
    const el = stageRef.current
    if (!el) return
    const id = requestAnimationFrame(() => {
      const items = Array.from(el.querySelectorAll('[data-ani]'))
      if (!items.length) return
      animate(items, {
        opacity:    [0, 1],
        translateY: [18, 0],
        delay:      stagger(65),
        duration:   420,
        easing:     'easeOutCubic',
      })
    })
    return () => cancelAnimationFrame(id)
  }, [showSummary])

  // ── Particle entrance + float (stage 0) ──────────────────────────────────
  useEffect(() => {
    if (stage !== 0) return
    const container = particleRef.current
    if (!container) return
    const dots = Array.from(container.querySelectorAll('.dp'))
    const animations = []
    dots.forEach((el, i) => {
      const p = particles[i]
      if (!p) return
      const entranceDelay = i * 60
      const floatDelay    = entranceDelay + getDuration(700)
      // Phase 1: staggered entrance
      animations.push(animate(el, {
        opacity: [0, 0.3],
        scale:   [0, 1],
        duration: getDuration(600),
        delay:    entranceDelay,
        easing:   easingPresets.entrance,
      }))
      // Phase 2: continuous float loop
      animations.push(animate(el, {
        translateX: [0, p.dx, 0],
        translateY: [0, p.dy, 0],
        opacity:    [0.2, 0.5, 0.2],
        duration:   p.dur,
        delay:      floatDelay,
        loop:       true,
        easing:     'easeInOutSine',
      }))
    })
    return () => animations.forEach(a => a?.pause?.())
  }, [stage, particles]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Mesh arrow measurement ────────────────────────────────────────────────
  useEffect(() => {
    if (!meshActive) { setArrowLines(null); return }
    const id = setTimeout(() => {
      const inner = meshInnerRef.current
      const nodes = nodeRefs.current
      if (!inner || nodes.some(n => !n)) return

      const innerRect = inner.getBoundingClientRect()
      const getImgRect = (nodeEl) => {
        const img = nodeEl?.querySelector('img')
        if (!img) return null
        const r = img.getBoundingClientRect()
        return {
          left:   r.left   - innerRect.left,
          right:  r.right  - innerRect.left,
          top:    r.top    - innerRect.top,
          bottom: r.bottom - innerRect.top,
        }
      }

      const b1 = getImgRect(nodes[0])
      const b2 = getImgRect(nodes[1])
      const bN = getImgRect(nodes[2])
      if (!b1 || !b2 || !bN) return

      const GAP        = 10
      const logoCenter = (b1.top + b1.bottom) / 2
      const spread     = 18 // px between each arrow line
      setArrowLines({
        ys:   [logoCenter - spread, logoCenter, logoCenter + spread],
        seg1: { x1: b1.right + GAP, x2: b2.left - GAP },
        seg2: { x1: b2.right + GAP, x2: bN.left - GAP },
      })
    }, 80)
    return () => clearTimeout(id)
  }, [meshActive])

  // ── Mesh arrow entrance animation ─────────────────────────────────────────
  useEffect(() => {
    if (!arrowLines) return
    const id = setTimeout(() => {
      const lines = meshPathRefs.current.filter(Boolean)
      lines.forEach(el => { el.style.opacity = '0' })
      animate(lines, {
        opacity: [0, 0.8],
        delay:   stagger(90),
        duration: 500,
        easing:  'easeOutCubic',
      })
    }, 30)
    return () => clearTimeout(id)
  }, [arrowLines])

  // ── Typing animation — writes directly to DOM to avoid re-renders ─────────
  const startTyping = useCallback(() => {
    if (isTyping || searchComplete) return
    setIsTyping(true)
    if (textSpanRef.current) textSpanRef.current.textContent = ''

    const beginTyping = () => {
      let idx = 0
      const id = setInterval(() => {
        idx++
        if (textSpanRef.current) textSpanRef.current.textContent = questionText.slice(0, idx)
        if (idx >= questionText.length) {
          clearInterval(id)
          setIsTyping(false)
          setSearchComplete(true)
        }
      }, 75)
      timersRef.current.push(id)
    }

    if (!searchBarAnimatedRef.current && searchBarRef.current) {
      searchBarAnimatedRef.current = true
      if (shouldAnimate()) {
        animate(searchBarRef.current, {
          opacity: [0, 1],
          translateY: [40, 0],
          scale: [0.95, 1],
          duration: getDuration(800),
          easing: easingPresets.entrance,
          onComplete: beginTyping,
        })
      } else {
        searchBarRef.current.style.opacity = '1'
        beginTyping()
      }
    } else {
      beginTyping()
    }
  }, [isTyping, searchComplete, questionText, shouldAnimate, getDuration])

  // ── Stage navigation ──────────────────────────────────────────────────────
  const goToStage = useCallback((i) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
    setStage(i)
    setShowAnswer(false)
    setMeshActive(false)
    setQueryActive(false)
    if (textSpanRef.current) textSpanRef.current.textContent = ''
    setSearchComplete(false)
    setIsTyping(false)
    setSelectedArch(null)
    setShowSummary(false)
  }, [])

  // ── Query animation (Stage 4) ─────────────────────────────────────────────
  const runQuery = useCallback(() => {
    if (queryActive || !arrowLines) return
    setQueryActive(true)

    const BALL_DUR    = 1400
    const ROW_STAGGER = 120  // ms between each of the 3 rows
    const SEG_OFFSET  = 200  // seg2 starts slightly after seg1
    const RETURN_DELAY = BALL_DUR + 500

    const COLORS = ['#48EFCF', '#F04E98', '#FEC514']
    const segs = [
      { x1: arrowLines.seg1.x1, x2: arrowLines.seg1.x2 },
      { x1: arrowLines.seg2.x1, x2: arrowLines.seg2.x2 },
    ]

    // Each of the 6 lanes (2 segs × 3 rows) gets 2 dedicated pool slots:
    // slot laneIdx*2 for forward balls, slot laneIdx*2+1 for return balls.
    // setTimeout is used instead of animejs delay so that animate() is only called
    // once per element at a time — calling it twice synchronously cancels the first.
    const launchBall = (slot, sx, sy, tx, delay, color) => {
      const tid = setTimeout(() => {
        const ball = meshBallPoolRef.current[slot]
        if (!ball) return
        ball.style.left            = `${sx}px`
        ball.style.top             = `${sy}px`
        ball.style.transform       = ''
        ball.style.opacity         = '0'
        ball.style.backgroundColor = color
        ball.style.boxShadow       = `0 0 8px 3px ${color}60`
        animate(ball, {
          translateX: tx - sx,
          translateY: 0,
          opacity:    [0, 1, 1, 0],
          duration:   BALL_DUR,
          easing:     'easeInOutCubic',
          onComplete: () => { ball.style.opacity = '0'; ball.style.transform = '' },
        })
      }, delay)
      timersRef.current.push(tid)
    }

    const ROUND_TRIP = RETURN_DELAY + BALL_DUR + 300

    segs.forEach((seg, si) => {
      arrowLines.ys.forEach((y, ri) => {
        const laneIdx   = si * 3 + ri
        const fwdSlot   = laneIdx * 2
        const retSlot   = laneIdx * 2 + 1
        const color     = isDarkRef.current ? COLORS[ri] : '#0B64DD'
        const baseDelay = si * SEG_OFFSET + ri * ROW_STAGGER
        // Round trip 1
        launchBall(fwdSlot, seg.x1, y, seg.x2, baseDelay, color)
        launchBall(retSlot, seg.x2, y, seg.x1, baseDelay + RETURN_DELAY, color)
        // Round trip 2
        launchBall(fwdSlot, seg.x1, y, seg.x2, baseDelay + ROUND_TRIP, color)
        launchBall(retSlot, seg.x2, y, seg.x1, baseDelay + ROUND_TRIP + RETURN_DELAY, color)
      })
    })

    const lastStart = SEG_OFFSET + 2 * ROW_STAGGER + ROUND_TRIP + RETURN_DELAY
    const id = setTimeout(() => { setQueryActive(false); setQueryRan(true) }, lastStart + BALL_DUR + 300)
    timersRef.current.push(id)
  }, [queryActive, arrowLines])

  useEffect(() => () => { timersRef.current.forEach(clearTimeout) }, [])

  // ── Notify parent of query button state ───────────────────────────────────
  useEffect(() => {
    onQueryStateChange?.({ canRun: stage === 4 && meshActive, isRunning: queryActive })
  }, [stage, meshActive, queryActive, onQueryStateChange])

  // ── Notify parent of activate mesh button state ──────────────────────────
  useEffect(() => {
    onActivateMeshStateChange?.({ canActivate: stage === 4 && !meshActive })
  }, [stage, meshActive, onActivateMeshStateChange])

  // ── Respond to activate mesh signal from toolbar ──────────────────────────
  useEffect(() => {
    if (activateMeshSignal > 0) setMeshActive(true)
  }, [activateMeshSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notify parent of summary button state ────────────────────────────────
  useEffect(() => {
    onSummaryStateChange?.({ canToggle: stage === 3, isShowing: showSummary })
  }, [stage, showSummary, onSummaryStateChange])

  // ── Respond to summary signal from toolbar ────────────────────────────────
  useEffect(() => {
    if (summarySignal > 0) {
      setShowSummary(s => {
        if (!s) setSelectedArch(null)
        return !s
      })
    }
  }, [summarySignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Notify parent of play button state ────────────────────────────────────
  useEffect(() => {
    // Two presenter beats on stage 0: first play types the question,
    // second play reveals the answer. Button stays available until both fire.
    onPlayStateChange?.({ canPlay: stage === 0 && !isTyping && !showAnswer })
  }, [stage, isTyping, showAnswer, onPlayStateChange])

  // ── Respond to run query signal from nav bar ──────────────────────────────
  useEffect(() => {
    if (runQuerySignal > 0) runQuery()
  }, [runQuerySignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Respond to play signal from nav bar ───────────────────────────────────
  useEffect(() => {
    if (playSignal === 0) return
    if (!searchComplete) startTyping()
    else if (!showAnswer) setShowAnswer(true)
  }, [playSignal]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full flex flex-col px-8 pt-4 pb-4 overflow-hidden">
      <div className="max-w-7xl mx-auto w-full h-full flex flex-col gap-1">

        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePart1}
          titleAccent={titlePart2}
          subtitle={subtitle}
        />

        {/* Main row */}
        <div className="flex gap-3 flex-1 min-h-0">

          {/* Stage content column */}
          <div className="flex-1 min-h-0 flex flex-col gap-2 h-[500px] self-center">

            {/* Stage area */}
            <div
              ref={stageRef}
              className={`flex-1 min-h-0 relative rounded-2xl border overflow-hidden ${
                isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'
              }`}
            >

              {/* ── STAGE 0 — The Question ───────────────────────────────── */}
              {stage === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
                  {/* Floating particles */}
                  <div ref={particleRef} className="absolute inset-0 overflow-hidden pointer-events-none">
                    {particles.map((p) => (
                      <div key={p.id} className="dp absolute rounded-full"
                        style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%`, backgroundColor: p.color, opacity: 0.08 }} />
                    ))}
                  </div>

                  {/* Beat-1 idle hint — blank canvas before the question is revealed */}
                  {!isTyping && !searchComplete && !showAnswer && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
                      <div className={`flex items-center gap-2 text-base font-medium ${
                        isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'
                      }`}>
                        <FontAwesomeIcon icon={faPlay} className="text-xs" />
                        <span>Press play to begin</span>
                      </div>
                    </div>
                  )}

                  {/* Beat-2 hint — question is up, prompt to reveal the answer */}
                  {searchComplete && !showAnswer && (
                    <div className="absolute inset-x-0 bottom-6 z-20 flex items-center justify-center pointer-events-none">
                      <div className={`flex items-center gap-2 text-sm font-medium ${
                        isDark ? 'text-elastic-teal/70' : 'text-elastic-blue/70'
                      }`}>
                        <FontAwesomeIcon icon={faPlay} className="text-xs" />
                        <span>Press play to reveal</span>
                      </div>
                    </div>
                  )}

                  <div className="relative z-10 w-full max-w-3xl flex flex-col items-center gap-6">
                    {/* The Question — types in on the first play beat */}
                    <div ref={searchBarRef} className="w-full text-center" style={{ opacity: 0 }}>
                      <p className={`font-headline text-4xl md:text-6xl font-extrabold leading-headline ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                        <span ref={textSpanRef} />
                        {!searchComplete && (
                          <span
                            ref={cursorRef}
                            className={`inline-block w-1 h-9 md:h-12 ml-1 align-middle ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`}
                          />
                        )}
                      </p>
                    </div>

                    {showAnswer && (
                      <div
                        ref={answerCardRef}
                        className={`w-full px-6 py-5 rounded-2xl border-2 ${
                          isDark ? 'bg-white/[0.03] border-white/20' : 'bg-white border-elastic-dev-blue/20 shadow-sm'
                        }`}
                        style={{ opacity: 0 }}
                      >
                        <p
                          ref={answerHeadRef}
                          className={`text-4xl md:text-5xl font-bold mb-3 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}
                          style={{ opacity: 0 }}
                        >
                          {answerHeading}
                        </p>
                        <p
                          ref={answerBodyRef}
                          className={`text-lg ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}
                          style={{ opacity: 0 }}
                        >
                          {answerBody ?? <>Data is a <span className="italic">strategic asset</span>. We need to retrieve, connect, and act on it —<span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}> fast</span>.</>}
                        </p>
                        <div
                          ref={answerFootRef}
                          className={`mt-4 pt-4 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}
                          style={{ opacity: 0 }}
                        >
                          <p className={`text-lg ${isDark ? 'text-elastic-pink' : 'text-elastic-blue'}`}>
                            {answerFooter ?? <>But data is generated <span className="font-medium">everywhere</span>.{' '}How do you get total visibility at speed, at scale, without breaking the bank?</>}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── STAGE 1 — The Dilemma ────────────────────────────────── */}
              {stage === 1 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center px-3 py-5 gap-2">
                  <p data-ani className={`text-xl text-center pb-[18px] ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                    {dilemmaIntro}
                  </p>

                  <div className="flex items-stretch gap-6 w-full max-w-4xl">
                    {/* Left side */}
                    <div data-ani
                      className={`flex-1 rounded-2xl border-2 p-3 ${isDark ? 'bg-elastic-teal/5' : 'bg-elastic-blue/5'}`}
                      style={{ borderColor: isDark ? '#48EFCF' : '#0B64DD' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-elastic-teal/20' : 'bg-elastic-blue/20'}`}>
                          <FontAwesomeIcon icon={faMemory} className={`text-base ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                        </div>
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{dilemmaLeftTitle}</h3>
                          <p className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{dilemmaLeftSubtitle}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {dilemmaLeftItems.map((item, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-white/60'}`}>
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={item.icon} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>{item.text}</span>
                            </div>
                            <FontAwesomeIcon icon={item.good ? faCheck : faTimes}
                              className={`text-sm ${item.good ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : 'text-elastic-pink'}`} />
                          </div>
                        ))}
                      </div>
                      <p className={`text-sm italic text-center mt-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        {dilemmaLeftFooter}
                      </p>
                    </div>

                    {/* VS */}
                    <div data-ani className="flex items-center justify-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold ${
                        isDark ? 'bg-white/10 text-white' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue'
                      }`}>vs</div>
                    </div>

                    {/* Right side */}
                    <div data-ani
                      className={`flex-1 rounded-2xl border-2 p-3 ${isDark ? 'bg-orange-500/5' : 'bg-elastic-midnight/5'}`}
                      style={{ borderColor: isDark ? '#FF957D' : '#153385' }}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDark ? 'bg-orange-500/20' : 'bg-elastic-midnight/15'}`}>
                          <FontAwesomeIcon icon={faHardDrive} className={`text-base ${isDark ? 'text-orange-400' : 'text-elastic-midnight'}`} />
                        </div>
                        <div>
                          <h3 className={`text-base font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{dilemmaRightTitle}</h3>
                          <p className={`text-xs ${isDark ? 'text-orange-400' : 'text-elastic-midnight'}`}>{dilemmaRightSubtitle}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {dilemmaRightItems.map((item, i) => (
                          <div key={i} className={`flex items-center justify-between px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.05]' : 'bg-white/60'}`}>
                            <div className="flex items-center gap-2">
                              <FontAwesomeIcon icon={item.icon} className={`text-sm ${isDark ? 'text-orange-400' : 'text-elastic-midnight'}`} />
                              <span className={`text-sm ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>{item.text}</span>
                            </div>
                            <FontAwesomeIcon icon={item.good ? faCheck : faTimes}
                              className={`text-sm ${item.good ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : 'text-elastic-pink'}`} />
                          </div>
                        ))}
                      </div>
                      <p className={`text-sm italic text-center mt-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        {dilemmaRightFooter}
                      </p>
                    </div>
                  </div>

                  <div data-ani className={`px-5 py-2 rounded-xl border text-center max-w-2xl mt-[18px] ${
                    isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/50 border-elastic-dev-blue/10'
                  }`}>
                    <p className={`text-base ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      <FontAwesomeIcon icon={faDollarSign} className={`mr-2 ${isDark ? 'text-elastic-yellow' : 'text-elastic-blue'}`} />
                      {dilemmaCalloutPrefix} <span className={`font-bold ${isDark ? 'text-orange-400' : 'text-elastic-midnight'}`}>{dilemmaCalloutHighlight}</span>.
                    </p>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                      {dilemmaCalloutSub}
                    </p>
                  </div>
                </div>
              )}

              {/* ── STAGE 2 — The Problems ───────────────────────────────── */}
              {stage === 2 && (
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col items-center p-4 gap-4 mt-[18px]">
                  <p data-ani className={`text-xl text-center mb-[18px] ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                    {problemsIntro}
                  </p>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl w-full">
                    {problemsCards.map((p, i) => {
                      const color = isDark ? p.darkColor : p.lightColor
                      return (
                        <div data-ani key={i}
                          className={`p-5 rounded-xl border-2 text-center ${isDark ? 'bg-white/[0.03]' : 'bg-white/60'}`}
                          style={{ borderColor: `${color}40` }}
                        >
                          <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                            <FontAwesomeIcon icon={p.icon} className="text-xl" style={{ color }} />
                          </div>
                          <h4 className={`text-base font-bold mb-1 ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{p.title}</h4>
                          <p className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>{p.desc}</p>
                        </div>
                      )
                    })}
                  </div>

                  <div data-ani className={`px-5 py-3 mt-[18px] rounded-xl border text-center max-w-2xl ${
                    isDark ? 'bg-elastic-pink/10 border-elastic-pink/30' : 'bg-elastic-blue/5 border-elastic-blue/20'
                  }`}>
                    <p className={`text-base ${isDark ? 'text-elastic-pink' : 'text-elastic-blue'}`}>
                      {problemsCallout}
                    </p>
                  </div>
                </div>
              )}

              {/* ── STAGE 3 — The Workarounds ────────────────────────────── */}
              {stage === 3 && (
                <div className="absolute inset-0 flex flex-col p-4 gap-2">
                  <div className="text-center flex-shrink-0">
                    <p className={`text-sm uppercase tracking-wider mb-0.5 ${isDark ? 'text-elastic-teal/60' : 'text-elastic-blue/70'}`}>
                      {workaroundsEyebrow}
                    </p>
                    <h3 className={`text-xl mb-[18px] font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      {workaroundsHeadingPrefix} <span className={isDark ? 'text-orange-400' : 'text-elastic-blue'}>{workaroundsHighlight}</span>
                    </h3>
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col gap-3">
                    {showSummary ? (
                      <div className="flex-1 min-h-0 flex flex-col gap-3">
                        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                          {['catalog', 'warehouse', 'lake', 'federation'].map((type) => {
                            const d = ARCH[type]
                            const c = isDark ? d.color : d.lightColor
                            return (
                              <div data-ani key={type}
                                className={`p-3 rounded-xl border-2 ${isDark ? 'bg-white/[0.02]' : 'bg-white/60'}`}
                                style={{ borderColor: `${c}40` }}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${c}20` }}>
                                    <FontAwesomeIcon icon={d.icon} className="text-sm" style={{ color: c }} />
                                  </div>
                                  <div>
                                    <p className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{d.label}</p>
                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{d.subtitle}</p>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  {d.problems.map((prob, j) => (
                                    <div key={j} className={`flex items-start gap-1.5 text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue'}`}>
                                      <FontAwesomeIcon icon={faTimes} className="text-elastic-pink mt-0.5 text-xs flex-shrink-0" />
                                      <span>{prob}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                        <div className={`px-5 py-3 rounded-xl text-center flex-shrink-0 ${
                          isDark ? 'bg-white/[0.02] border border-white/10' : 'bg-white/50 border border-elastic-dev-blue/10'
                        }`}>
                          <p className={`text-base ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                            {summaryCallout ?? <>The problem isn't <span className={`font-semibold ${isDark ? 'text-orange-400' : 'text-elastic-blue'}`}>where</span> data lives… It's whether you can{' '}<span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>search it all at once</span>.</>}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* ── Persistent card strip ── */}
                        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
                          {['catalog', 'warehouse', 'lake', 'federation'].map((type) => {
                            const d    = ARCH[type]
                            const c    = isDark ? d.color : d.lightColor
                            const active = selectedArch === type
                            return (
                              <div key={type}
                                className={`rounded-xl border-2 p-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                                  active
                                    ? isDark ? 'bg-white/[0.06]' : 'bg-white/80'
                                    : isDark ? 'bg-white/[0.02] opacity-60 hover:opacity-100' : 'bg-white/40 opacity-60 hover:opacity-100'
                                }`}
                                style={{ borderColor: active ? c : `${c}30` }}
                                onClick={() => setSelectedArch(active ? null : type)}
                              >
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${c}20` }}>
                                  <FontAwesomeIcon icon={d.icon} className="text-xl" style={{ color: c }} />
                                </div>
                                <div className="text-center">
                                  <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{d.label}</p>
                                  <p className={`text-sm mt-0.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{d.subtitle}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* ── Problems panel (slides up on selection) ── */}
                        <div className="flex-shrink-0">
                          {selectedArch ? (
                            <div
                              ref={problemsPanelRef}
                              className={`rounded-xl border-2 p-5 ${isDark ? 'bg-white/[0.02]' : 'bg-white/70'}`}
                              style={{ borderColor: `${isDark ? ARCH[selectedArch].color : ARCH[selectedArch].lightColor}40`, opacity: 0 }}
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                                  style={{ backgroundColor: `${isDark ? ARCH[selectedArch].color : ARCH[selectedArch].lightColor}20` }}>
                                  <FontAwesomeIcon icon={ARCH[selectedArch].icon}
                                    style={{ color: isDark ? ARCH[selectedArch].color : ARCH[selectedArch].lightColor }} />
                                </div>
                                <div>
                                  <p className={`text-base font-semibold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                                    {ARCH[selectedArch].label}
                                  </p>
                                  <p className={`text-sm ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{workaroundsFallsShort}</p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {ARCH[selectedArch].problems.map((prob, i) => (
                                  <div key={i} className={`flex items-start gap-2 px-3 py-2.5 rounded-lg ${isDark ? 'bg-red-500/10' : 'bg-elastic-pink/10'}`}>
                                    <FontAwesomeIcon icon={faTimes} className={`mt-0.5 text-xs flex-shrink-0 ${isDark ? 'text-red-400' : 'text-elastic-pink'}`} />
                                    <span className={`text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{prob}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="h-full flex items-center justify-center">
                              <p className={`text-sm ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                                {workaroundsEmptyState}
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── STAGE 4 — The Transformation ────────────────────────── */}
              {stage === 4 && (
                <div className="absolute inset-0 flex flex-col p-4 gap-2">
                  <div data-ani className="text-center flex-shrink-0">
                    <p className={`text-lg font-bold ${isDark ? 'text-white/70' : 'text-elastic-blue'}`}>
                      {meshActive ? meshTitle : siloTitle}
                    </p>
                  </div>

                  <div ref={meshVizRef} className="flex-1 min-h-0 relative">
                    {!meshActive ? (
                      /* Before: scattered silos */
                      <div className="absolute inset-0">
                        {silos.map((silo, i) => (
                          <div data-ani key={i} className="absolute" style={{ left: silo.x, top: silo.y, transform: 'translate(-50%, -50%)' }}>
                            <div className={`px-2 py-2 rounded-lg border-2 text-center ${isDark ? 'bg-white/[0.05]' : 'bg-white/70'}`}
                              style={{ borderColor: isDark ? `${silo.color}60` : '#0B64DD40' }}>
                              <FontAwesomeIcon icon={faDatabase} style={{ color: isDark ? silo.color : '#0B64DD' }} className="text-sm" />
                              <span className={`block text-xs font-medium mt-1 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                                {silo.label}
                              </span>
                            </div>
                          </div>
                        ))}
                        {QM_POSITIONS.map((qm, i) => (
                          <div key={i} className={`absolute select-none ${qm.size} font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue/20'}`}
                            style={{ left: qm.x, top: qm.y, transform: 'translate(-50%, -50%)' }}>?
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* After: connected mesh */
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div ref={meshInnerRef} className="relative w-full max-w-5xl h-72">

                          {/* SVG — pixel-coordinate lines with bidirectional arrows */}
                          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                            <defs>
                              {(isDark
                                ? [{ id: 'teal', color: '#48EFCF' }, { id: 'pink', color: '#F04E98' }, { id: 'yellow', color: '#FEC514' }]
                                : [{ id: 'teal', color: '#0B64DD' }, { id: 'pink', color: '#0B64DD' }, { id: 'yellow', color: '#0B64DD' }]
                              ).map(({ id, color }) => (
                                <Fragment key={id}>
                                  <marker id={`al-${id}`} markerWidth="10" markerHeight="8"
                                    refX="0" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                                    <path d="M10,0 L0,4 L10,8" fill="none" stroke={color} strokeWidth="1.5" />
                                  </marker>
                                  <marker id={`ar-${id}`} markerWidth="10" markerHeight="8"
                                    refX="10" refY="4" orient="auto" markerUnits="userSpaceOnUse">
                                    <path d="M0,0 L10,4 L0,8" fill="none" stroke={color} strokeWidth="1.5" />
                                  </marker>
                                </Fragment>
                              ))}
                            </defs>

                            {arrowLines && [
                              { id: 'teal',   color: isDark ? '#48EFCF' : '#0B64DD', idx: 0 },
                              { id: 'pink',   color: isDark ? '#F04E98' : '#0B64DD', idx: 1 },
                              { id: 'yellow', color: isDark ? '#FEC514' : '#0B64DD', idx: 2 },
                            ].map(({ id, color, idx }) => (
                              <Fragment key={id}>
                                {/* S1 ↔ S2 */}
                                <line
                                  ref={el => meshPathRefs.current[idx] = el}
                                  x1={arrowLines.seg1.x1} y1={arrowLines.ys[idx]}
                                  x2={arrowLines.seg1.x2} y2={arrowLines.ys[idx]}
                                  stroke={color} strokeWidth="1.5" strokeLinecap="round"
                                  markerStart={`url(#al-${id})`} markerEnd={`url(#ar-${id})`}
                                  opacity="0"
                                />
                                {/* S2 ↔ SN */}
                                <line
                                  ref={el => meshPathRefs.current[idx + 3] = el}
                                  x1={arrowLines.seg2.x1} y1={arrowLines.ys[idx]}
                                  x2={arrowLines.seg2.x2} y2={arrowLines.ys[idx]}
                                  stroke={color} strokeWidth="1.5" strokeLinecap="round"
                                  markerStart={`url(#al-${id})`} markerEnd={`url(#ar-${id})`}
                                  opacity="0"
                                />
                              </Fragment>
                            ))}
                          </svg>

                          {/* Ball pool */}
                          {Array.from({ length: MAX_MESH_BALLS }, (_, i) => (
                            <div key={i}
                              ref={el => meshBallPoolRef.current[i] = el}
                              className="absolute rounded-full pointer-events-none"
                              style={{ width: 10, height: 10, marginLeft: -5, marginTop: -5, opacity: 0, zIndex: 10 }}
                            />
                          ))}

                          {/* Site nodes */}
                          {meshNodes.map((site, i) => {
                            const c = isDark ? site.color : site.lightColor
                            return (
                              <div data-ani key={i}
                                ref={el => nodeRefs.current[i] = el}
                                className="absolute flex flex-col items-center"
                                style={{ left: site.x, top: site.y }}
                              >
                                <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-24 h-24 object-contain" />
                                <div className="my-4">
                                  <FontAwesomeIcon icon={faArrowUp} className="text-2xl" style={{ color: c }} />
                                </div>
                                <div className="w-28 h-16 relative" style={{ transform: 'perspective(150px) rotateX(35deg)' }}>
                                  <div className="absolute inset-0 grid grid-cols-4 gap-0.5">
                                    {Array.from({ length: 16 }).map((_, j) => (
                                      <div key={j} className="w-full h-2 border"
                                        style={{ borderColor: `${c}50`, backgroundColor: `${c}10` }} />
                                    ))}
                                  </div>
                                </div>
                                <span className={`mt-6 text-sm font-medium ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>
                                  {site.label}
                                </span>
                              </div>
                            )
                          })}

                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>{/* end stage area */}


          </div>{/* end stage column */}

          {/* ── Right-side stage navigator ──────────────────────────────── */}
          <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center relative select-none">
            {/* Track line */}
            <div className={`absolute w-px top-[20%] bottom-[20%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
            {/* Progress fill */}
            <div
              className={`absolute w-px top-[20%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
              style={{ height: `${(stage / (stages.length - 1)) * 60}%` }}
            />
            {stages.map((s, i) => {
              const isActive = i === stage
              const isDone   = i < stage
              return (
                <button
                  key={s.id}
                  onClick={() => goToStage(i)}
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
          </div>

        </div>{/* end main row */}
      </div>
    </div>
  )
}

export default DataMeshScene
