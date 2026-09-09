import { useEffect, useState } from 'react'

/**
 * Trailing-edge debounce. Returns the last value that stayed unchanged for
 * `delay` ms, so rapidly-changing state (a text field being typed into) can
 * drive expensive work without firing it on every change.
 */
export function useDebouncedValue(value, delay) {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
