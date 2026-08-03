import { useLayoutEffect, useRef, useState } from 'react'

// Scenes are laid out for a full 16:9 stage; previews render them at this
// virtual size and scale the whole tree down to the container width.
const BASE_WIDTH = 1280
const BASE_HEIGHT = 720

function ScenePreview({ children, className = '' }) {
  const containerRef = useRef(null)
  const [scale, setScale] = useState(0)

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const observer = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / BASE_WIDTH)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: '16 / 9' }}
    >
      {scale > 0 && (
        <div
          className="absolute top-0 left-0 origin-top-left pointer-events-none select-none"
          style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${scale})` }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default ScenePreview
