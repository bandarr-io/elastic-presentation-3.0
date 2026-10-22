// Scenes renamed over time map their old id to the current id. Only ever add
// entries, never remove them, so old saved decks, imported deck files and
// deep links keep working.
export const SCENE_ID_ALIASES = {
  'platform-tour': 'scene-tour',
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Resolve a scene id (possibly a copy such as `platform-tour~2`) to its
 * current id. Non-strings and unknown ids are returned unchanged.
 */
export function resolveSceneId(id) {
  if (typeof id !== 'string') return id
  const cut = id.indexOf('~')
  const base = cut === -1 ? id : id.slice(0, cut)
  const suffix = cut === -1 ? '' : id.slice(cut)
  const target = hasOwn(SCENE_ID_ALIASES, base) ? SCENE_ID_ALIASES[base] : base
  return target + suffix
}

// Rewrites an id array, de-duplicating while keeping the first occurrence.
// Returns the input array itself when nothing changed.
function rewriteIdArray(arr) {
  if (!Array.isArray(arr)) return arr
  const out = []
  const seen = new Set()
  for (const raw of arr) {
    const id = resolveSceneId(raw)
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  const unchanged = out.length === arr.length && out.every((v, i) => v === arr[i])
  return unchanged ? arr : out
}

// Rewrites the keys of an object map. When both the old and the new key
// exist, the value under the new key wins. Returns the input when unchanged.
function rewriteKeyedObject(obj) {
  if (!isPlainObject(obj)) return obj
  const out = {}
  let changed = false
  for (const key of Object.keys(obj)) {
    const newKey = resolveSceneId(key)
    if (newKey === key) {
      out[key] = obj[key]
      continue
    }
    changed = true
    // The new key already holds its own value: drop the old one.
    if (hasOwn(obj, newKey)) continue
    // Another alias already wrote this key: keep the first one.
    if (!hasOwn(out, newKey)) out[newKey] = obj[key]
  }
  return changed ? out : obj
}

function rewriteDuplicates(list) {
  if (!Array.isArray(list)) return list
  let changed = false
  const seen = new Set()
  const out = []
  for (const entry of list) {
    if (!isPlainObject(entry)) {
      out.push(entry)
      continue
    }
    const id = resolveSceneId(entry.id)
    const sourceId = resolveSceneId(entry.sourceId)
    // Two copies that now resolve to the same id would collide: keep the first.
    if (typeof id === 'string') {
      if (seen.has(id)) {
        changed = true
        continue
      }
      seen.add(id)
    }
    if (id === entry.id && sourceId === entry.sourceId) {
      out.push(entry)
      continue
    }
    changed = true
    const copy = { ...entry }
    if (id !== entry.id) copy.id = id
    if (sourceId !== entry.sourceId) copy.sourceId = sourceId
    out.push(copy)
  }
  return changed ? out : list
}

/**
 * Rewrite old scene ids in a saved scene config. Pure and idempotent: the
 * input is never mutated, and the same object is returned when nothing needed
 * to change (including null, undefined and non-object input).
 */
export function migrateSceneIds(config) {
  if (!isPlainObject(config)) return config
  let changed = false
  const next = {}
  for (const key of Object.keys(config)) {
    const value = config[key]
    let migrated = value
    if (key === 'enabledIds' || key === 'order') migrated = rewriteIdArray(value)
    else if (key === 'durations' || key === 'sceneMetadata') migrated = rewriteKeyedObject(value)
    else if (key === 'duplicates') migrated = rewriteDuplicates(value)
    if (migrated !== value) changed = true
    next[key] = migrated
  }
  return changed ? next : config
}
