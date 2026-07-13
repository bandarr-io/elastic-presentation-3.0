import { useCallback, useEffect, useRef, useState } from 'react'
import { useReducedMotion } from './useReducedMotion'

/**
 * Beat + motion controller shared by the multi-step Observability scenes.
 *
 * Gives every scene two ways to drive its motion:
 * - Auto-play: `toggleAutoplay()` walks through the beats on a timer, re-firing
 *   each beat's entrance. Single-beat scenes gently loop their entrance instead.
 * - Manual replay: `replay()` re-fires the current beat's entrance on demand,
 *   and `goTo(i)` jumps to a specific beat (also re-firing it).
 *
 * `beat` selects the visible step, `playKey` is the value scenes watch to
 * re-run their anime.js entrances (bump it => replay).
 *
 * @param {Array|number} beats - beat descriptors (may carry a per-beat `hold` ms) or a count
 * @param {Object} [opts]
 * @param {number} [opts.holdMs=3400] - default dwell time per beat while auto-playing
 * @param {boolean} [opts.loop=false] - restart from the first beat after the last
 */
export function useSceneMotion(beats = [], { holdMs = 3400, loop = false } = {}) {
  const count = Array.isArray(beats) ? beats.length : beats
  const beatList = Array.isArray(beats) ? beats : []
  const { prefersReducedMotion } = useReducedMotion()

  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef(null)

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const goTo = useCallback(
    (i) => {
      const next = Math.max(0, Math.min(i, count - 1))
      setBeat(next)
      setPlayKey((k) => k + 1)
    },
    [count],
  )

  const replay = useCallback(() => setPlayKey((k) => k + 1), [])

  const stop = useCallback(() => {
    setIsPlaying(false)
    clearTimer()
  }, [])

  const play = useCallback(() => {
    // Restart from the top when kicking off from the final beat.
    setBeat((b) => (b >= count - 1 ? 0 : b))
    setPlayKey((k) => k + 1)
    setIsPlaying(true)
  }, [count])

  const toggleAutoplay = useCallback(() => {
    setIsPlaying((playing) => {
      if (playing) {
        clearTimer()
        return false
      }
      setBeat((b) => (b >= count - 1 ? 0 : b))
      setPlayKey((k) => k + 1)
      return true
    })
  }, [count])

  // Advance (or loop the entrance for single-beat scenes) while auto-playing.
  useEffect(() => {
    if (!isPlaying) return undefined
    const hold = beatList[beat]?.hold || holdMs
    const delay = prefersReducedMotion ? Math.min(hold, 700) : hold

    clearTimer()
    timerRef.current = setTimeout(() => {
      if (count <= 1) {
        setPlayKey((k) => k + 1) // gentle loop of the entrance
        return
      }
      if (beat >= count - 1) {
        if (loop) {
          setBeat(0)
          setPlayKey((k) => k + 1)
        } else {
          setIsPlaying(false)
        }
        return
      }
      setBeat(beat + 1)
      setPlayKey((k) => k + 1)
    }, delay)

    return clearTimer
  }, [isPlaying, beat, playKey, count, holdMs, loop, prefersReducedMotion, beatList])

  useEffect(() => clearTimer, [])

  return { beat, playKey, isPlaying, goTo, replay, play, stop, toggleAutoplay, beatCount: count }
}
