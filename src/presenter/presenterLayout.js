import { useCallback, useState } from 'react'

// Presenter view layout preferences, stored per browser so each presenter
// keeps their own arrangement.
//   notes   - speaker notes fill the left; current slide top right, next slide
//             bottom right.
//   classic - current slide fills the left; next slide and notes stack right.
export const PRESENTER_LAYOUTS = [
  { id: 'notes', label: 'Notes first', hint: 'Notes left, current and next slide right' },
  { id: 'classic', label: 'Slide first', hint: 'Current slide left, next slide and notes right' },
]

export const DEFAULT_LAYOUT = 'notes'
export const FONT_MIN = 14
export const FONT_MAX = 48
export const FONT_STEP = 2

// Notes text size per layout when the presenter has not picked one. Classic
// keeps the size the view always used.
export const DEFAULT_FONT_SIZE = { notes: 24, classic: 18 }

export const PRESENTER_LAYOUT_STORAGE_KEY = 'elastic-presenter-layout'

const clampFont = (n) => Math.min(FONT_MAX, Math.max(FONT_MIN, Math.round(n)))

/** Coerce anything read from storage into a valid prefs object. */
export function normalizeLayoutPrefs(raw) {
  const layout = PRESENTER_LAYOUTS.some((l) => l.id === raw?.layout) ? raw.layout : DEFAULT_LAYOUT
  const size = Number(raw?.fontSize)
  const fontSize = raw?.fontSize != null && Number.isFinite(size) ? clampFont(size) : null
  return { layout, fontSize }
}

/** Effective notes font size in px (null fontSize means the layout default). */
export function resolveFontSize(prefs) {
  return prefs.fontSize ?? DEFAULT_FONT_SIZE[prefs.layout]
}

/** Prefs after nudging the notes font size up or down by whole steps. */
export function stepFontSize(prefs, steps) {
  return { ...prefs, fontSize: clampFont(resolveFontSize(prefs) + steps * FONT_STEP) }
}

function loadPrefs() {
  try {
    return normalizeLayoutPrefs(JSON.parse(localStorage.getItem(PRESENTER_LAYOUT_STORAGE_KEY)))
  } catch {
    return normalizeLayoutPrefs(null)
  }
}

function savePrefs(prefs) {
  try {
    localStorage.setItem(PRESENTER_LAYOUT_STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Storage blocked or full: the layout still applies for this session.
  }
}

export function usePresenterLayout() {
  const [prefs, setPrefs] = useState(loadPrefs)

  const update = useCallback((compute) => {
    setPrefs((current) => {
      const next = normalizeLayoutPrefs(compute(current))
      savePrefs(next)
      return next
    })
  }, [])

  return {
    layout: prefs.layout,
    fontSize: resolveFontSize(prefs),
    canGrow: resolveFontSize(prefs) < FONT_MAX,
    canShrink: resolveFontSize(prefs) > FONT_MIN,
    setLayout: (layout) => update((p) => ({ ...p, layout })),
    growFont: () => update((p) => stepFontSize(p, 1)),
    shrinkFont: () => update((p) => stepFontSize(p, -1)),
    resetFont: () => update((p) => ({ ...p, fontSize: null })),
  }
}
