const cache = new Map()
const failed = new Set()

// Keys include the scene's metadata, so editing content mints a new key per
// settled change and the cache would grow for the life of the tab. Cap it at
// roughly twice a full deck so every visible thumb still hits.
const MAX_CACHED = 120

export function thumbnailKey(sceneId, theme, metadata) {
  let meta = ''
  try {
    meta = JSON.stringify(metadata || {})
  } catch {
    meta = ''
  }
  return `${theme}:${sceneId}:${meta}`
}

export function getThumbnail(key) {
  return cache.get(key) || null
}

export function setThumbnail(key, dataUrl) {
  if (!key || !dataUrl) return
  cache.set(key, dataUrl)
  failed.delete(key)
  while (cache.size > MAX_CACHED) {
    cache.delete(cache.keys().next().value)
  }
}

export function markThumbnailFailed(key) {
  if (key) failed.add(key)
}

export function thumbnailFailed(key) {
  return failed.has(key)
}
