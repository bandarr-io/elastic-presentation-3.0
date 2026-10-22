// Pure helpers for the scene tour. No React here, so they can be tested
// and reused without rendering anything.

// A page that shows one static view dwells this long before the tour moves on.
export const PAGE_HOLD_MS = 12000

// A page whose scene has its own beats is stepped through beat by beat, reusing
// each beat's authored `hold`, which is already tuned to outlast that beat's
// entrance animation. Pinned into this band so nothing flashes past.
export const STEP_MIN_MS = 5000
export const STEP_MAX_MS = 10000

// The shortest per-slide hold a user override may set.
export const MIN_PAGE_HOLD_MS = 1000

/**
 * Clamps a step hold into [minHold, maxHold].
 */
export function clampStepHold(ms, { minHold = STEP_MIN_MS, maxHold = STEP_MAX_MS } = {}) {
  return Math.min(Math.max(ms, minHold), maxHold)
}

/**
 * The beat list a scene will actually run, given its registry beats and the
 * metadata it will be rendered with. Mirrors the scenes' own merge, so the tour
 * counts and times the same beats the scene shows:
 * `(metadata.beats || base).map((b, i) => ({ ...base[i], ...b }))`.
 *
 * Returns `undefined` for a page with no registry beats, because such a scene
 * does not step through beats at all.
 */
export function effectiveBeats(baseBeats, pageMetadata) {
  if (!Array.isArray(baseBeats)) return undefined
  const custom = pageMetadata?.beats
  const source = Array.isArray(custom) ? custom : baseBeats
  return source.map((beat, i) => ({ ...(baseBeats[i] || {}), ...beat }))
}

/**
 * Flattens the pages into the one-dimensional beat list `useSceneMotion` drives:
 * one entry per (page, step) pair, each carrying its own dwell.
 *
 * options: { minHold, maxHold, pageHold }
 */
export function buildTourSteps(pages, options = {}) {
  const pageHold = options.pageHold ?? PAGE_HOLD_MS
  return pages.flatMap((page, pageIndex) => {
    const stepCount = page.beats?.length || page.stepProps?.length || 1
    return Array.from({ length: stepCount }, (_, stepIndex) => ({
      key: `${page.id}-${stepIndex}`,
      step: stepCount > 1 ? `${page.title} ${stepIndex + 1}` : page.title,
      pageIndex,
      stepIndex,
      hold: page.beats
        ? clampStepHold(page.beats[stepIndex]?.hold ?? pageHold, options)
        : page.hold ?? pageHold,
    }))
  })
}

function resolveEntries(entries, registry) {
  const used = new Set()
  const resolved = []

  for (const entry of entries) {
    if (!entry || typeof entry !== 'object') continue
    const { sceneId } = entry
    if (typeof sceneId !== 'string') continue
    if (!Object.prototype.hasOwnProperty.call(registry, sceneId)) continue
    if (entry.enabled === false) continue

    const registryEntry = registry[sceneId]
    if (!registryEntry) continue

    let id = sceneId
    for (let n = 2; used.has(id); n++) {
      id = `${sceneId}-${n}`
    }
    used.add(id)

    const { enabled, ...rest } = entry
    resolved.push({
      ...registryEntry,
      ...rest,
      id,
      sceneId,
      title: entry.title || registryEntry.title,
      // A hold under a second would strobe, and 0 is treated by the motion hook
      // as "use the default", so only a hold of at least a second overrides the
      // registry.
      hold: Number.isFinite(entry.hold) && entry.hold >= MIN_PAGE_HOLD_MS ? entry.hold : registryEntry.hold,
    })
  }

  return resolved
}

/**
 * Resolves the tour pages from scene metadata and a scene registry.
 *
 * - List mode: `metadata.pages` has at least one entry with a string `sceneId`.
 *   That list is the source, in its order.
 * - Legacy mode: otherwise, `defaultPages` is the source, with each entry
 *   partially overridden by the `metadata.pages` entry at the same index.
 *
 * Falls back to `defaultPages` when the resolved list is empty.
 * Never mutates its inputs.
 */
export function resolvePages(metadata, registry, defaultPages) {
  const meta = metadata ?? {}
  const scenes = registry ?? {}
  const defaults = Array.isArray(defaultPages) ? defaultPages : []
  const configured = Array.isArray(meta.pages) ? meta.pages : []

  const listMode = configured.some((entry) => typeof entry?.sceneId === 'string')
  const source = listMode
    ? configured
    : defaults.map((entry, i) => ({ ...entry, ...(configured[i] || {}) }))

  const resolved = resolveEntries(source, scenes)
  if (resolved.length > 0) return resolved

  return resolveEntries(defaults, scenes)
}
