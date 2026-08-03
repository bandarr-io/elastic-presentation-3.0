import { useLayoutEffect, useRef, useState } from 'react'
import { buildClickPath } from './domClick'

// Scenes are laid out for a full 16:9 stage; previews render them at this
// virtual size and scale the whole tree down to fit the container.
const BASE_WIDTH = 1280
const BASE_HEIGHT = 720

/**
 * @param {boolean} interactive - allow clicking through to the scene; clicks
 *   on buttons are also described and passed to `onClickableClick` so the
 *   presenter can forward them to the audience tab.
 * @param {boolean} fill - fill the container's height as well as its width,
 *   scaling the stage to fit whichever dimension is tighter (centered).
 *   Default sizes the container itself to 16:9 from its width.
 */
function ScenePreview({ children, className = '', interactive = false, onClickableClick, fill = false }) {
  const containerRef = useRef(null)
  const [box, setBox] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setBox({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scale = fill
    ? Math.min(box.width / BASE_WIDTH, box.height / BASE_HEIGHT)
    : box.width / BASE_WIDTH
  const offsetX = fill ? (box.width - BASE_WIDTH * scale) / 2 : 0
  const offsetY = fill ? (box.height - BASE_HEIGHT * scale) / 2 : 0

  // The click is deliberately not swallowed: the local preview instance reacts
  // too, keeping scene-internal state in step with the audience.
  const handleClickCapture = (e) => {
    if (!interactive || !onClickableClick) return
    const root = containerRef.current?.querySelector('[data-scene-root]')
    if (!root) return
    const info = buildClickPath(e.target, root)
    if (info) onClickableClick(info)
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${fill ? 'h-full' : ''} ${className}`}
      style={fill ? undefined : { aspectRatio: '16 / 9' }}
    >
      {scale > 0 && (
        <div
          className={`absolute top-0 left-0 origin-top-left select-none ${interactive ? '' : 'pointer-events-none'}`}
          style={{
            width: BASE_WIDTH,
            height: BASE_HEIGHT,
            transform: `translate(${offsetX}px, ${offsetY}px) scale(${scale})`,
          }}
          onClickCapture={handleClickCapture}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default ScenePreview
