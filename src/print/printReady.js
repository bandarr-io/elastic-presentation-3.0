// Resolves once fonts and every <img> inside `root` have settled, so a print
// never captures half-loaded content. Never rejects: failures are counted and
// returned so the caller can warn the user. Safe to call repeatedly.

const IMAGE_TIMEOUT_MS = 8000

function settleImage(img) {
  // Slides lazy-load screenshots. Off-screen ones would not load by themselves
  // before the print dialog opens, so load them now.
  if (img.loading === 'lazy') img.loading = 'eager'
  if (img.complete) return Promise.resolve(img.naturalWidth > 0)
  return new Promise((resolve) => {
    const done = (ok) => {
      clearTimeout(timer)
      img.removeEventListener('load', onLoad)
      img.removeEventListener('error', onError)
      resolve(ok)
    }
    const onLoad = () => done(true)
    const onError = () => done(false)
    const timer = setTimeout(() => done(false), IMAGE_TIMEOUT_MS)
    img.addEventListener('load', onLoad)
    img.addEventListener('error', onError)
  })
}

export async function waitForPrintReady(root) {
  try {
    if (document.fonts?.ready) await document.fonts.ready
  } catch {
    // Fonts are best effort; carry on.
  }
  const images = root ? Array.from(root.querySelectorAll('img')) : []
  const results = await Promise.all(images.map(settleImage))
  const missing = root ? root.querySelectorAll('[data-print-missing="true"]').length : 0
  return { total: images.length, failed: results.filter((ok) => !ok).length + missing }
}
