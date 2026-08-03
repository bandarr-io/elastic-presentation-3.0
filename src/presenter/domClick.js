// Forwarding clicks from the presenter's scene preview to the audience tab.
//
// Both tabs render the same scene component inside an element marked with
// `data-scene-root`, so a clicked element can be described as the chain of
// child indices from that root and re-resolved on the other side. Text content
// is carried along as a fallback in case the trees drift slightly.

export const CLICKABLE_SELECTOR = 'button, [role="button"], summary'

const TEXT_LIMIT = 80

function clickableText(el) {
  return (el.textContent || '').trim().slice(0, TEXT_LIMIT)
}

/**
 * Describe the clickable element containing `target`, relative to `root`.
 * Returns { path, tag, text } or null when the click wasn't on a clickable.
 */
export function buildClickPath(target, root) {
  const clickable = target?.closest?.(CLICKABLE_SELECTOR)
  if (!clickable || !root || !root.contains(clickable)) return null
  const path = []
  let el = clickable
  while (el !== root) {
    const parent = el.parentElement
    if (!parent) return null
    path.unshift(Array.prototype.indexOf.call(parent.children, el))
    el = parent
  }
  return { path, tag: clickable.tagName, text: clickableText(clickable) }
}

/**
 * Resolve a description produced by buildClickPath against `root`.
 * Falls back to a unique text match among clickables when the path is stale.
 */
export function resolveClickPath(root, { path, tag, text } = {}) {
  let el = root
  for (const index of path || []) {
    el = el?.children?.[index]
    if (!el) break
  }
  if (el && el.tagName === tag) return el

  if (text) {
    const matches = Array.from(root.querySelectorAll(CLICKABLE_SELECTOR))
      .filter((candidate) => clickableText(candidate) === text)
    if (matches.length === 1) return matches[0]
  }
  return null
}
