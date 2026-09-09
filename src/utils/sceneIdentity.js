/**
 * Scene ids are registry keys (`about`) or duplicates (`about~2`).
 * Comparisons against the catalog, editor map, and App.jsx wiring must use
 * the base id so a copy inherits the source scene's component and editors.
 */
export function baseSceneId(id) {
  if (typeof id !== 'string' || id.length === 0) return id
  const cut = id.indexOf('~')
  return cut === -1 ? id : id.slice(0, cut)
}

export function isDuplicateSceneId(id) {
  return typeof id === 'string' && id.includes('~')
}

export function nextDuplicateId(sourceId, existingIds) {
  const base = baseSceneId(sourceId)
  const taken = new Set(existingIds)
  let n = 2
  while (taken.has(`${base}~${n}`)) n += 1
  return `${base}~${n}`
}
