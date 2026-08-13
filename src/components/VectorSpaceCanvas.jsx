import { useEffect, useMemo, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/* Deterministic PRNG so the cloud is identical across mounts. */
function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

export const CATEGORIES = {
  ground: { id: 'ground', label: 'GROUND', color: '#FF957D', colorLight: '#C2410C' },
  air: { id: 'air', label: 'AIR', color: '#FEC514', colorLight: '#A16207' },
  space: { id: 'space', label: 'SPACE', color: '#B0A3FF', colorLight: '#6D28D9' },
  naval: { id: 'naval', label: 'NAVAL', color: '#48EFCF', colorLight: '#0F766E' },
  query: { id: 'query', label: 'SEARCH QUERY', color: '#7CFF6B', colorLight: '#15803D' },
}

function categoryColor(id, isDark) {
  const c = CATEGORIES[id]
  if (!c) return '#0B64DD'
  return isDark ? c.color : c.colorLight
}

/* 25 multimodal assets — same categories as the Atrium DOW demo. */
export const ASSETS = [
  { id: 'tank', label: 'tank', category: 'ground', icon: '🛡️' },
  { id: 'apc', label: 'apc', category: 'ground', icon: '🚙' },
  { id: 'howitzer', label: 'howitzer', category: 'ground', icon: '💥' },
  { id: 'military_truck', label: 'military_truck', category: 'ground', icon: '🚚' },
  { id: 'radar_truck', label: 'radar_truck', category: 'ground', icon: '📡' },
  { id: 'jeep', label: 'jeep', category: 'ground', icon: '🚙' },
  { id: 'helicopter', label: 'helicopter', category: 'air', icon: '🚁' },
  { id: 'fighter', label: 'fighter', category: 'air', icon: '✈️' },
  { id: 'transport', label: 'transport', category: 'air', icon: '🛩️' },
  { id: 'drone', label: 'drone', category: 'air', icon: '🛸' },
  { id: 'bomber', label: 'bomber', category: 'air', icon: '✈️' },
  { id: 'awacs', label: 'awacs', category: 'air', icon: '🛰️' },
  { id: 'satellite', label: 'satellite', category: 'space', icon: '🛰️' },
  { id: 'space_station', label: 'space_station', category: 'space', icon: '🌌' },
  { id: 'shuttle', label: 'shuttle', category: 'space', icon: '🚀' },
  { id: 'comms_sat', label: 'comms_sat', category: 'space', icon: '📡' },
  { id: 'recon_sat', label: 'recon_sat', category: 'space', icon: '🔭' },
  { id: 'probe', label: 'probe', category: 'space', icon: '☄️' },
  { id: 'submarine', label: 'submarine', category: 'naval', icon: '🚤' },
  { id: 'destroyer', label: 'destroyer', category: 'naval', icon: '🚢' },
  { id: 'patrol_boat', label: 'patrol_boat', category: 'naval', icon: '⛵' },
  { id: 'amphibious_ship', label: 'amphibious_ship', category: 'naval', icon: '🚢' },
  { id: 'aircraft_carrier', label: 'aircraft_carrier', category: 'naval', icon: '🛳️' },
  { id: 'frigate', label: 'frigate', category: 'naval', icon: '🚢' },
  { id: 'landing_craft', label: 'landing_craft', category: 'naval', icon: '⛴️' },
]

/* Query "floating runway for military aircraft" — curated neighbours so the
   demo ranks carrier / naval / aircraft, never ground artillery. */
export const DEMO_KNN_IDS = [
  'aircraft_carrier',
  'amphibious_ship',
  'destroyer',
  'frigate',
  'fighter',
]

const CLUSTER_CENTERS = {
  /* Ground kept clear of the naval query neighbourhood. */
  ground: { x: 0.55, y: 0.12, z: 0.35 },
  air: { x: -0.55, y: 0.55, z: 0.35 },
  space: { x: 0.55, y: -0.55, z: 0.45 },
  naval: { x: -0.28, y: -0.18, z: -0.55 },
}

/* Query sits in naval space; answer dots are placed by rank around it. */
export const QUERY_POINT = { x: -0.28, y: -0.16, z: -0.52 }

/* Distance from query for each ranked answer — #1 closest, #5 farthest-but-still-near. */
const ANSWER_DIST = [0.10, 0.16, 0.22, 0.28, 0.38]
/* Unit-ish directions so answers fan around the query (fighter lifts toward air). */
const ANSWER_DIR = [
  { x: 0.55, y: -0.15, z: -0.82 },
  { x: -0.70, y: 0.25, z: -0.65 },
  { x: 0.75, y: -0.35, z: 0.55 },
  { x: -0.55, y: 0.40, z: 0.75 },
  { x: 0.25, y: 0.85, z: 0.45 },
]

const AXIS = 1.25

function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z) || 1
  return { x: v.x / len, y: v.y / len, z: v.z / len }
}

function buildPoints(seed = 42) {
  const rand = mulberry32(seed)
  const answerIndex = Object.fromEntries(DEMO_KNN_IDS.map((id, i) => [id, i]))
  /* Anything not in the answer set must sit beyond the farthest answer. */
  const minOtherDist = ANSWER_DIST[ANSWER_DIST.length - 1] + 0.18

  return ASSETS.map((asset, i) => {
    const rank = answerIndex[asset.id]
    let x
    let y
    let z

    if (rank != null) {
      const dir = normalize(ANSWER_DIR[rank])
      const d = ANSWER_DIST[rank]
      x = QUERY_POINT.x + dir.x * d
      y = QUERY_POINT.y + dir.y * d
      z = QUERY_POINT.z + dir.z * d
    } else {
      const c = CLUSTER_CENTERS[asset.category]
      /* Tight ground cluster so howitzer stays with the other ground items. */
      const spread = asset.category === 'ground'
        ? 0.12 + rand() * 0.04
        : 0.22 + rand() * 0.08
      x = c.x + (rand() - 0.5) * spread * 2
      y = c.y + (rand() - 0.5) * spread * 2
      z = c.z + (rand() - 0.5) * spread * 2

      /* Push non-answers away from the query so knn geometry matches the ranking. */
      let d = dist3({ x, y, z }, QUERY_POINT)
      if (d < minOtherDist) {
        const away = normalize({
          x: x - QUERY_POINT.x,
          y: y - QUERY_POINT.y,
          z: z - QUERY_POINT.z,
        })
        x = QUERY_POINT.x + away.x * minOtherDist
        y = QUERY_POINT.y + away.y * minOtherDist
        z = QUERY_POINT.z + away.z * minOtherDist
      }
    }

    return {
      ...asset,
      index: i,
      x,
      y,
      z,
      color: CATEGORIES[asset.category].color,
      colorLight: CATEGORIES[asset.category].colorLight,
      dims: fakeDims(rand),
    }
  })
}

function fakeDims(rand) {
  return Array.from({ length: 6 }, () => {
    const v = (rand() * 2 - 1)
    return (v >= 0 ? '+' : '') + v.toFixed(3)
  })
}

function rotateY(p, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { ...p, x: p.x * cos - p.z * sin, z: p.x * sin + p.z * cos }
}

function rotateX(p, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return { ...p, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos }
}

/* Tall, large projection — height-weighted so the cloud reads vertically. */
function project(p, width, height, fov = 1.85) {
  const z = p.z + 2.05
  const scale = (height * 1.05) / (fov * Math.max(z, 0.4))
  return {
    sx: width / 2 + p.x * scale,
    sy: height / 2 - p.y * scale * 1.05,
    depth: z,
    scale,
  }
}

function dist3(a, b) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  const dz = a.z - b.z
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function hexAlpha(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`
}

const DEFAULT_YAW = 0.55
/* Near-level on the XZ plane, tipped slightly so we look down — not up. */
const DEFAULT_PITCH = -0.06

/**
 * Interactive 3D simplification of vector space.
 * Drag to rotate; hover a point to see its source image + label.
 */
function VectorSpaceCanvas({
  isDark = true,
  placedCount = 25,
  showQuery = false,
  queryLanding = false,
  knnK = 5,
  highlightId = null,
  className = '',
}) {
  const wrapRef = useRef(null)
  const canvasRef = useRef(null)
  const { prefersReducedMotion } = useReducedMotion()
  const points = useMemo(() => buildPoints(42), [])
  const [hover, setHover] = useState(null)
  const [userMoved, setUserMoved] = useState(false)

  const cameraRef = useRef({
    yaw: DEFAULT_YAW,
    pitch: DEFAULT_PITCH,
    dragging: false,
    lastX: 0,
    lastY: 0,
    idle: true,
  })
  const hitRef = useRef([])
  const placedRef = useRef(placedCount)
  const showQueryRef = useRef(showQuery)
  const queryLandingRef = useRef(queryLanding)
  const highlightRef = useRef(highlightId)
  placedRef.current = placedCount
  showQueryRef.current = showQuery
  queryLandingRef.current = queryLanding
  highlightRef.current = highlightId

  const knn = useMemo(() => {
    const byId = Object.fromEntries(points.map((p) => [p.id, p]))
    const curated = DEMO_KNN_IDS.map((id) => byId[id]).filter(Boolean)
    if (curated.length >= knnK) return curated.slice(0, knnK)
    /* Fallback: distance rank, but never surface ground artillery in this demo. */
    return [...points]
      .filter((p) => p.id !== 'howitzer')
      .map((p) => ({ ...p, d: dist3(p, QUERY_POINT) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, knnK)
  }, [points, knnK])
  const knnIds = useMemo(() => new Set(knn.map((p) => p.id)), [knn])
  const knnRef = useRef(knn)
  const knnIdsRef = useRef(knnIds)
  knnRef.current = knn
  knnIdsRef.current = knnIds

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return undefined
    const ctx = canvas.getContext('2d')
    let raf = 0
    let w = 0
    let h = 0
    let lastTs = performance.now()

    const resize = () => {
      const rect = wrap.getBoundingClientRect()
      w = Math.max(1, rect.width)
      h = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    resize()

    const bg = isDark ? '#070E1A' : '#EEF1F6'
    const gridStroke = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(16,28,63,0.14)'
    const axisX = isDark ? '#F04E98' : '#BE185D'
    const axisY = isDark ? '#48EFCF' : '#0F766E'
    const axisZ = isDark ? '#0B64DD' : '#1D4ED8'
    const queryColor = categoryColor('query', isDark)

    const drawFloorGrid = (yaw, pitch) => {
      const step = 0.28
      for (let i = -5; i <= 5; i++) {
        const a1 = project(rotateX(rotateY({ x: -AXIS, y: -AXIS * 0.7, z: i * step }, yaw), pitch), w, h)
        const a2 = project(rotateX(rotateY({ x: AXIS, y: -AXIS * 0.7, z: i * step }, yaw), pitch), w, h)
        const b1 = project(rotateX(rotateY({ x: i * step, y: -AXIS * 0.7, z: -AXIS }, yaw), pitch), w, h)
        const b2 = project(rotateX(rotateY({ x: i * step, y: -AXIS * 0.7, z: AXIS }, yaw), pitch), w, h)
        ctx.beginPath()
        ctx.moveTo(a1.sx, a1.sy)
        ctx.lineTo(a2.sx, a2.sy)
        ctx.moveTo(b1.sx, b1.sy)
        ctx.lineTo(b2.sx, b2.sy)
        ctx.strokeStyle = gridStroke
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    const drawArrow = (from, to, color) => {
      ctx.beginPath()
      ctx.moveTo(from.sx, from.sy)
      ctx.lineTo(to.sx, to.sy)
      ctx.strokeStyle = color
      ctx.lineWidth = 2.5
      ctx.stroke()
      const ang = Math.atan2(to.sy - from.sy, to.sx - from.sx)
      const size = 12
      ctx.beginPath()
      ctx.moveTo(to.sx, to.sy)
      ctx.lineTo(to.sx - size * Math.cos(ang - 0.4), to.sy - size * Math.sin(ang - 0.4))
      ctx.lineTo(to.sx - size * Math.cos(ang + 0.4), to.sy - size * Math.sin(ang + 0.4))
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }

    /* Full bipolar axes through the origin — positive and negative. */
    const drawAxes = (yaw, pitch) => {
      const o = project(rotateX(rotateY({ x: 0, y: 0, z: 0 }, yaw), pitch), w, h)
      const xp = project(rotateX(rotateY({ x: AXIS, y: 0, z: 0 }, yaw), pitch), w, h)
      const xn = project(rotateX(rotateY({ x: -AXIS, y: 0, z: 0 }, yaw), pitch), w, h)
      const yp = project(rotateX(rotateY({ x: 0, y: AXIS, z: 0 }, yaw), pitch), w, h)
      const yn = project(rotateX(rotateY({ x: 0, y: -AXIS, z: 0 }, yaw), pitch), w, h)
      const zp = project(rotateX(rotateY({ x: 0, y: 0, z: AXIS }, yaw), pitch), w, h)
      const zn = project(rotateX(rotateY({ x: 0, y: 0, z: -AXIS }, yaw), pitch), w, h)

      drawArrow(o, xp, axisX)
      drawArrow(o, xn, axisX)
      drawArrow(o, yp, axisY)
      drawArrow(o, yn, axisY)
      drawArrow(o, zp, axisZ)
      drawArrow(o, zn, axisZ)

      ctx.font = 'bold 15px Inter, system-ui, sans-serif'
      ctx.fillStyle = axisX
      ctx.fillText('+X', xp.sx + 8, xp.sy + 5)
      ctx.fillText('−X', xn.sx - 28, xn.sy + 5)
      ctx.fillStyle = axisY
      ctx.fillText('+Y', yp.sx + 5, yp.sy - 6)
      ctx.fillText('−Y', yn.sx + 5, yn.sy + 16)
      ctx.fillStyle = axisZ
      ctx.fillText('+Z', zp.sx + 8, zp.sy + 5)
      ctx.fillText('−Z', zn.sx - 28, zn.sy + 5)

      ctx.beginPath()
      ctx.arc(o.sx, o.sy, 6, 0, Math.PI * 2)
      ctx.fillStyle = isDark ? 'rgba(200,210,230,0.55)' : 'rgba(16,28,63,0.55)'
      ctx.fill()
    }

    const glowSphere = (x, y, r, color, alpha = 1) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4)
      g.addColorStop(0, hexAlpha(color, 0.95 * alpha))
      g.addColorStop(0.35, hexAlpha(color, 0.55 * alpha))
      g.addColorStop(1, hexAlpha(color, 0))
      ctx.beginPath()
      ctx.arc(x, y, r * 2.4, 0, Math.PI * 2)
      ctx.fillStyle = g
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fillStyle = hexAlpha(color, 0.9 * alpha)
      ctx.fill()
    }

    const frame = (now) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000)
      lastTs = now
      const cam = cameraRef.current
      if (cam.idle && !prefersReducedMotion && !cam.dragging) {
        cam.yaw += dt * 0.12
        cam.pitch = DEFAULT_PITCH + Math.sin(now / 1000 * 0.28) * 0.04
      }
      const { yaw, pitch } = cam
      const placed = placedRef.current
      const doQuery = showQueryRef.current
      const landing = queryLandingRef.current
      const hl = highlightRef.current
      const knnNow = knnRef.current
      const knnIdsNow = knnIdsRef.current

      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      drawFloorGrid(yaw, pitch)
      drawAxes(yaw, pitch)

      const visible = points
        .filter((p) => p.index < placed)
        .map((p) => {
          const rotated = rotateX(rotateY(p, yaw), pitch)
          const proj = project(rotated, w, h)
          const radius = 11 + (1 / proj.depth) * 12
          return { ...p, ...proj, radius }
        })
        .sort((a, b) => b.depth - a.depth)

      hitRef.current = [...visible].sort((a, b) => a.depth - b.depth)

      const origin = project(rotateX(rotateY({ x: 0, y: 0, z: 0 }, yaw), pitch), w, h)

      /* Faint raycast from origin → each placed point while embedding. */
      if (!doQuery && placed > 0) {
        visible.forEach((p) => {
          const isHighlight = hl && p.id === hl
          const col = isDark ? p.color : p.colorLight
          ctx.beginPath()
          ctx.moveTo(origin.sx, origin.sy)
          ctx.lineTo(p.sx, p.sy)
          ctx.strokeStyle = isHighlight
            ? hexAlpha(col, 0.65)
            : hexAlpha(col, isDark ? 0.18 : 0.35)
          ctx.lineWidth = isHighlight ? 1.75 : 1
          ctx.stroke()
        })
      }

      const qProj = doQuery
        ? project(rotateX(rotateY(QUERY_POINT, yaw), pitch), w, h)
        : null

      /* Animate query landing: bright ray from origin → query, then hold a faint one. */
      if (doQuery && qProj) {
        ctx.beginPath()
        ctx.moveTo(origin.sx, origin.sy)
        ctx.lineTo(qProj.sx, qProj.sy)
        ctx.strokeStyle = hexAlpha(queryColor, landing ? 0.8 : (isDark ? 0.28 : 0.4))
        ctx.lineWidth = landing ? 2.25 : 1.25
        ctx.stroke()
      }

      if (doQuery && qProj) {
        knnNow.forEach((n) => {
          const vp = visible.find((v) => v.id === n.id)
          if (!vp) return
          ctx.beginPath()
          ctx.moveTo(qProj.sx, qProj.sy)
          ctx.lineTo(vp.sx, vp.sy)
          ctx.setLineDash([3, 5])
          ctx.strokeStyle = isDark ? 'rgba(124,255,107,0.55)' : 'rgba(21,128,61,0.55)'
          ctx.lineWidth = 1.5
          ctx.stroke()
          ctx.setLineDash([])
        })
      }

      visible.forEach((p) => {
        const isNeighbor = doQuery && knnIdsNow.has(p.id)
        const isHighlight = hl && p.id === hl
        const depthFade = Math.max(0.35, 1 - (p.depth - 1.7) / 3.8)
        const dimOthers = doQuery && knnIdsNow.size > 0 && !isNeighbor
        let alpha = (dimOthers ? 0.35 : 0.85) * depthFade
        let radius = p.radius
        if (isNeighbor || isHighlight) {
          alpha = 1
          radius *= 1.25
        }
        const col = isDark ? p.color : p.colorLight
        glowSphere(p.sx, p.sy, radius, col, alpha)
      })

      if (doQuery && qProj) {
        const qRadius = landing ? 22 : 16
        glowSphere(qProj.sx, qProj.sy, qRadius, queryColor, 1)
        if (landing) {
          ctx.beginPath()
          ctx.arc(qProj.sx, qProj.sy, qRadius + 10, 0, Math.PI * 2)
          ctx.strokeStyle = hexAlpha(queryColor, 0.5)
          ctx.lineWidth = 2
          ctx.stroke()
        }
        knnNow.forEach((n, i) => {
          const vp = visible.find((v) => v.id === n.id)
          if (!vp) return
          const badgeR = 14
          ctx.beginPath()
          ctx.arc(vp.sx + 18, vp.sy - 18, badgeR, 0, Math.PI * 2)
          ctx.fillStyle = queryColor
          ctx.fill()
          ctx.fillStyle = isDark ? '#0B1628' : '#FFFFFF'
          ctx.font = 'bold 13px Inter, system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(i + 1), vp.sx + 18, vp.sy - 17.5)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        })
      }

      const legend = [
        CATEGORIES.ground,
        CATEGORIES.air,
        CATEGORIES.space,
        CATEGORIES.naval,
        ...(doQuery ? [CATEGORIES.query] : []),
      ]
      let ly = 18
      ctx.font = '600 11px Inter, system-ui, sans-serif'
      legend.forEach((c) => {
        const col = isDark ? c.color : c.colorLight
        ctx.beginPath()
        ctx.arc(w - 108, ly, 4.5, 0, Math.PI * 2)
        ctx.fillStyle = col
        ctx.fill()
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(16,28,63,0.85)'
        ctx.fillText(c.label, w - 98, ly + 3.5)
        ly += 18
      })

      raf = requestAnimationFrame(frame)
    }

    const localXY = (e) => {
      const rect = canvas.getBoundingClientRect()
      return { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }

    const hitTest = (x, y) => {
      for (const p of hitRef.current) {
        const dx = x - p.sx
        const dy = y - p.sy
        if (dx * dx + dy * dy <= (p.radius + 6) ** 2) return p
      }
      return null
    }

    const onPointerDown = (e) => {
      const cam = cameraRef.current
      cam.dragging = true
      cam.idle = false
      cam.lastX = e.clientX
      cam.lastY = e.clientY
      setUserMoved(true)
      canvas.setPointerCapture?.(e.pointerId)
      canvas.style.cursor = 'grabbing'
    }

    const onPointerMove = (e) => {
      const cam = cameraRef.current
      if (cam.dragging) {
        const dx = e.clientX - cam.lastX
        const dy = e.clientY - cam.lastY
        cam.lastX = e.clientX
        cam.lastY = e.clientY
        cam.yaw += dx * 0.008
        cam.pitch = Math.max(-0.85, Math.min(1.1, cam.pitch + dy * 0.008))
        return
      }
      const { x, y } = localXY(e)
      const hit = hitTest(x, y)
      canvas.style.cursor = hit ? 'pointer' : 'grab'
      if (hit) {
        setHover({
          id: hit.id,
          label: hit.label,
          icon: hit.icon,
          category: CATEGORIES[hit.category]?.label || hit.category,
          color: isDark ? hit.color : hit.colorLight,
          x: hit.sx,
          y: hit.sy,
        })
      } else {
        setHover(null)
      }
    }

    const onPointerUp = (e) => {
      cameraRef.current.dragging = false
      canvas.releasePointerCapture?.(e.pointerId)
      canvas.style.cursor = 'grab'
      /* Stay where the user left it — idle spin only resumes via Reset view. */
    }

    const onPointerLeave = () => {
      cameraRef.current.dragging = false
      setHover(null)
      canvas.style.cursor = 'grab'
    }

    canvas.style.cursor = 'grab'
    canvas.addEventListener('pointerdown', onPointerDown)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp)
    canvas.addEventListener('pointercancel', onPointerUp)
    canvas.addEventListener('pointerleave', onPointerLeave)

    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      canvas.removeEventListener('pointerdown', onPointerDown)
      canvas.removeEventListener('pointermove', onPointerMove)
      canvas.removeEventListener('pointerup', onPointerUp)
      canvas.removeEventListener('pointercancel', onPointerUp)
      canvas.removeEventListener('pointerleave', onPointerLeave)
    }
  }, [isDark, points, prefersReducedMotion])

  const resetView = () => {
    const cam = cameraRef.current
    cam.yaw = DEFAULT_YAW
    cam.pitch = DEFAULT_PITCH
    cam.idle = true
    cam.dragging = false
    setUserMoved(false)
    setHover(null)
  }

  return (
    <div ref={wrapRef} className={`relative w-full h-full min-h-[240px] overflow-hidden rounded-2xl ${className}`}>
      <canvas
        ref={canvasRef}
        className="block w-full h-full touch-none"
        aria-label="3D simplification of vector space — drag to rotate, hover a point for its source"
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 flex items-center gap-2.5 rounded-xl border px-3 py-2 shadow-lg"
          style={{
            left: Math.min(hover.x + 16, (wrapRef.current?.clientWidth || 400) - 180),
            top: Math.max(8, hover.y - 56),
            background: isDark ? 'rgba(10,18,32,0.94)' : 'rgba(255,255,255,0.96)',
            borderColor: hover.color,
          }}
        >
          <div
            className="w-11 h-11 rounded-lg flex items-center justify-center text-2xl shrink-0 border"
            style={{
              background: isDark ? '#fff' : '#F5F7FA',
              borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(16,28,63,0.1)',
            }}
          >
            {hover.icon}
          </div>
          <div className="min-w-0">
            <div className={`text-sm font-bold truncate ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
              {hover.label}
            </div>
            <div className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: hover.color }}>
              {hover.category}
            </div>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2">
        <span
          className={`pointer-events-none text-[10px] tracking-wide ${
            isDark ? 'text-white/35' : 'text-elastic-ink'
          }`}
        >
          Drag to rotate · Hover a point
        </span>
        {userMoved && (
          <button
            type="button"
            onClick={resetView}
            className={`text-[11px] font-semibold rounded-full px-2.5 py-1 border transition-opacity hover:opacity-90 ${
              isDark
                ? 'border-white/25 text-white/80 bg-black/40'
                : 'border-elastic-dev-blue/25 text-elastic-dark-ink bg-white shadow-sm'
            }`}
          >
            Reset view
          </button>
        )}
      </div>
    </div>
  )
}

export { buildPoints }
export default VectorSpaceCanvas
