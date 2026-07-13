import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import { animate } from 'animejs'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Animated SVG connector overlay. Measures node elements inside a container and
 * draws bezier paths between them, then animates `stroke-dashoffset` with
 * anime.js so each line "draws in" and settles into a subtle dashed connector —
 * matching the Cross Cluster Search scene's connector treatment.
 * Re-measures on resize and whenever `playKey` changes.
 *
 * Usage: give the connectable elements `data-node="<id>"`, make the container
 * `relative`, render <FlowConnectors containerRef={ref} edges={[...]} /> as a
 * child, and put the cards above it with `relative z-10`.
 *
 * edges: [{ from, to, fromSide?, toSide?, color?, width?, opacity?, arrowStart?, arrowEnd?, orthogonal? }]
 *   sides: 'left' | 'right' | 'top' | 'bottom' | 'center' (default from='right', to='left')
 *   arrowStart/arrowEnd: draw a directional arrowhead at that end (default off)
 *   orthogonal: route as a right-angle elbow instead of an S-curve (default off)
 * animateIn: when false, lines appear as settled dashed connectors with no
 *   draw-in sweep (they still fade with the container). Default true.
 */
function FlowConnectors({ containerRef, edges = [], playKey = 0, defaultColor = '#48EFCF', animateIn = true }) {
  const svgRef = useRef(null)
  const [paths, setPaths] = useState([])
  const { prefersReducedMotion } = useReducedMotion()

  // Measure nodes and build path data.
  useLayoutEffect(() => {
    const container = containerRef?.current
    if (!container) return undefined

    const anchor = (el, side, base) => {
      const r = el.getBoundingClientRect()
      const x = side === 'left' ? r.left : side === 'right' ? r.right : (r.left + r.right) / 2
      const y = side === 'top' ? r.top : side === 'bottom' ? r.bottom : (r.top + r.bottom) / 2
      return { x: x - base.left, y: y - base.top }
    }

    // Only push new path data when the geometry actually changed, so late
    // re-measures (fonts, layout settle, entrance animation) can correct the
    // anchors without needlessly restarting the draw-in animation.
    let lastSig = ''
    const measure = () => {
      const base = container.getBoundingClientRect()
      const next = []
      edges.forEach((e, i) => {
        const a = container.querySelector(`[data-node="${e.from}"]`)
        const b = container.querySelector(`[data-node="${e.to}"]`)
        if (!a || !b) return
        const fromSide = e.fromSide || 'right'
        const toSide = e.toSide || 'left'
        const p1 = anchor(a, fromSide, base)
        const p2 = anchor(b, toSide, base)
        const horizontal = fromSide === 'left' || fromSide === 'right'
        let d
        if (e.orthogonal) {
          // Right-angle routing with a small rounded elbow: exit along the
          // `from` side's axis, then turn once into the target.
          const dx = Math.sign(p2.x - p1.x) || 1
          const dy = Math.sign(p2.y - p1.y) || 1
          const r = Math.min(12, Math.abs(p2.x - p1.x) / 2 || 12, Math.abs(p2.y - p1.y) / 2 || 12)
          if (horizontal) {
            d = Math.abs(p2.y - p1.y) < 1
              ? `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
              : `M ${p1.x} ${p1.y} H ${p2.x - dx * r} Q ${p2.x} ${p1.y} ${p2.x} ${p1.y + dy * r} V ${p2.y}`
          } else {
            d = Math.abs(p2.x - p1.x) < 1
              ? `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
              : `M ${p1.x} ${p1.y} V ${p2.y - dy * r} Q ${p1.x} ${p2.y} ${p1.x + dx * r} ${p2.y} H ${p2.x}`
          }
        } else {
          // S-curve that eases most of the way along the travel axis before
          // swinging into the target edge (same feel as the CCS scene).
          d = horizontal
            ? `M ${p1.x} ${p1.y} C ${p1.x + (p2.x - p1.x) * 0.5} ${p1.y} ${p1.x + (p2.x - p1.x) * 0.5} ${p2.y} ${p2.x} ${p2.y}`
            : `M ${p1.x} ${p1.y} C ${p1.x} ${p1.y + (p2.y - p1.y) * 0.5} ${p2.x} ${p1.y + (p2.y - p1.y) * 0.5} ${p2.x} ${p2.y}`
        }
        next.push({
          key: e.key ?? i,
          d,
          color: e.color || defaultColor,
          width: e.width || 1.5,
          opacity: e.opacity ?? 0.4,
          arrowStart: !!e.arrowStart,
          arrowEnd: !!e.arrowEnd,
        })
      })
      const sig = next.map((n) => n.d).join('|')
      if (sig === lastSig) return
      lastSig = sig
      setPaths(next)
    }

    measure()
    // Re-measure across the frames/events where nested flex layout, web fonts,
    // and the scene's entrance animation settle into their final positions.
    const raf1 = requestAnimationFrame(() => requestAnimationFrame(measure))
    const timers = [120, 500, 950].map((ms) => setTimeout(measure, ms))
    document.fonts?.ready?.then?.(measure).catch?.(() => {})

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(container)
    container.querySelectorAll('[data-node]').forEach((n) => ro?.observe(n))
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf1)
      timers.forEach(clearTimeout)
      ro?.disconnect()
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef, JSON.stringify(edges), playKey])

  // Draw-in with anime.js (strokeDashoffset), settling into a dashed line —
  // mirrors CrossClusterScene's path entrance exactly.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return undefined
    const pathEls = svg.querySelectorAll('path')
    const anims = []
    pathEls.forEach((pathEl, i) => {
      const len = pathEl.getTotalLength()
      if (!len) return
      // Settle straight into the dashed connector without the draw-in sweep.
      if (!animateIn || prefersReducedMotion) {
        pathEl.style.strokeDasharray = '6 4'
        pathEl.style.strokeDashoffset = '0'
        return
      }
      pathEl.style.strokeDasharray = String(len)
      pathEl.style.strokeDashoffset = String(len)
      anims.push(
        animate(pathEl, {
          strokeDashoffset: [len, 0],
          duration: 900,
          delay: 250 + i * 110,
          easing: 'easeInOutCubic',
          onComplete: () => {
            pathEl.style.strokeDasharray = '6 4'
            pathEl.style.strokeDashoffset = '0'
          },
        }),
      )
    })
    return () => anims.forEach((a) => a?.pause?.())
  }, [paths, playKey, prefersReducedMotion, animateIn])

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      xmlns="http://www.w3.org/2000/svg"
      style={{ zIndex: 0 }}
    >
      <defs>
        {paths.map((p) => {
          if (!p.arrowStart && !p.arrowEnd) return null
          const fillOpacity = Math.min(1, p.opacity + 0.4)
          return (
            <Fragment key={`marker-${p.key}`}>
              {p.arrowEnd && (
                <marker id={`fc-end-${p.key}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={p.color} fillOpacity={fillOpacity} />
                </marker>
              )}
              {p.arrowStart && (
                <marker id={`fc-start-${p.key}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" fill={p.color} fillOpacity={fillOpacity} />
                </marker>
              )}
            </Fragment>
          )
        })}
      </defs>
      {paths.map((p) => (
        <path
          key={p.key}
          d={p.d}
          fill="none"
          stroke={p.color}
          strokeWidth={p.width}
          strokeOpacity={p.opacity}
          strokeLinecap="round"
          strokeLinejoin="round"
          markerStart={p.arrowStart ? `url(#fc-start-${p.key})` : undefined}
          markerEnd={p.arrowEnd ? `url(#fc-end-${p.key})` : undefined}
        />
      ))}
    </svg>
  )
}

export default FlowConnectors
