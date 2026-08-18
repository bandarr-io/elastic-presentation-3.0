import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { toPng } from 'html-to-image'
import ErrorBoundary from './ErrorBoundary'
import { markThumbnailFailed, setThumbnail } from '../utils/sceneThumbnails'

const STAGE_W = 1280
const STAGE_H = 720
const SETTLE_MS = 480

function waitForImages(root) {
  const images = [...(root?.querySelectorAll('img') || [])]
  return Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })
    }),
  )
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
}

export default function SceneThumbnailBooth({ scene, previewProps, cacheKey, stageClass, backgroundColor, onSettled }) {
  const stageRef = useRef(null)
  const Scene = scene?.component

  useEffect(() => {
    if (!scene || !cacheKey || !Scene) return undefined
    let cancelled = false

    const run = async () => {
      await nextFrame()
      await new Promise((resolve) => setTimeout(resolve, SETTLE_MS))
      const node = stageRef.current
      if (cancelled || !node) return
      await waitForImages(node)
      if (cancelled) return
      try {
        const dataUrl = await toPng(node, {
          width: STAGE_W,
          height: STAGE_H,
          pixelRatio: 0.4,
          cacheBust: false,
          skipFonts: true,
          backgroundColor: backgroundColor || '#101C3F',
        })
        if (cancelled) return
        setThumbnail(cacheKey, dataUrl)
        onSettled?.(scene.id, dataUrl)
      } catch {
        if (cancelled) return
        markThumbnailFailed(cacheKey)
        onSettled?.(scene.id, null)
      }
    }

    run()
    return () => {
      cancelled = true
    }
    // Capture once per cache key. previewProps is read from this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, scene.id])

  if (!scene || !Scene) return null

  return createPortal(
    <div
      aria-hidden
      className="fixed top-0 pointer-events-none"
      style={{ left: -STAGE_W - 40, width: STAGE_W, height: STAGE_H, zIndex: 1 }}
    >
      <div
        ref={stageRef}
        className={`overflow-hidden ${stageClass || ''}`}
        style={{ width: STAGE_W, height: STAGE_H }}
      >
        <ErrorBoundary>
          <Scene {...previewProps} />
        </ErrorBoundary>
      </div>
    </div>,
    document.body,
  )
}
