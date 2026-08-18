const cache = new Map()
const failed = new Set()

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
}

export function markThumbnailFailed(key) {
  if (key) failed.add(key)
}

export function thumbnailFailed(key) {
  return failed.has(key)
}
