import { useEffect, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'

/**
 * Eased count-up number. Animates from 0 → `value` once on mount (and whenever
 * `value` or `replayKey` changes). Respects reduced-motion preferences.
 *
 * Props:
 * - value: target number
 * - duration: ms (default 1100)
 * - format: (n) => string, applied to the current integer each frame
 * - replayKey: change this to replay the animation (e.g. on stepper click)
 */
function CountUp({ value = 0, duration = 1100, format = (n) => `${n}`, replayKey = 0, className, style }) {
  const { prefersReducedMotion: reduceMotion } = useReducedMotion()
  const [n, setN] = useState(0)

  useEffect(() => {
    if (reduceMotion) {
      setN(value)
      return
    }
    let raf
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min((t - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * value))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration, replayKey, reduceMotion])

  return (
    <span className={`tabular-nums ${className || ''}`} style={style}>
      {format(n)}
    </span>
  )
}

export default CountUp
