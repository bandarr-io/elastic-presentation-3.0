// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, cleanup, act } from '@testing-library/react'
import { TOUR_PAGE_REGISTRY } from './tourPageRegistry'
import { presenterBridge } from '../presenter/presenterBridge'
import { ThemeProvider } from '../context/ThemeContext'
import { SceneMotionProvider } from '../context/SceneMotionContext'

// jsdom lacks these browser APIs. Stub them so scenes can mount standalone.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (!globalThis.ResizeObserver) globalThis.ResizeObserver = NoopObserver
if (!globalThis.IntersectionObserver) globalThis.IntersectionObserver = NoopObserver
if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })
}

// jsdom has no canvas implementation. Returning null from getContext crashes
// canvas scenes (for example VectorSpaceCanvas calls ctx.setTransform), so hand
// back a no-op 2D context instead.
const noopCanvasContext = new Proxy(
  {},
  {
    get: (target, prop) => {
      if (prop in target) return target[prop]
      if (prop === 'canvas') return null
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'createLinearGradient' || prop === 'createRadialGradient' || prop === 'createPattern') {
        return () => ({ addColorStop() {} })
      }
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })
      return () => undefined
    },
    set: (target, prop, value) => {
      target[prop] = value
      return true
    },
  },
)
HTMLCanvasElement.prototype.getContext = () => noopCanvasContext

// Ids that cannot mount in jsdom, mapped to the reason. Keep this empty if possible.
const SKIP_MOUNT = {}

const entries = Object.entries(TOUR_PAGE_REGISTRY)
const beatEntries = entries.filter(([, entry]) => 'beats' in entry)

function renderStandalone(entry) {
  const { component: Component, stepProps } = entry
  const extra = stepProps?.[0] || {}
  return render(
    <ThemeProvider>
      <SceneMotionProvider>
        <Component metadata={{}} {...extra} />
      </SceneMotionProvider>
    </ThemeProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe.each(entries)('%s mounts standalone', (id, entry) => {
  const skipReason = SKIP_MOUNT[id]
  const testFn = skipReason ? it.skip : it

  testFn(`mounts standalone with only metadata${skipReason ? ` (skipped: ${skipReason})` : ''}`, () => {
    let result
    expect(() => {
      result = renderStandalone(entry)
    }).not.toThrow()
    expect(result.container.firstChild).not.toBeNull()
  })
})

describe.each(beatEntries)('%s beat count', (id, entry) => {
  const skipReason = SKIP_MOUNT[id]
  const testFn = skipReason ? it.skip : it

  testFn(`registry beats length matches the live beat count${skipReason ? ` (skipped: ${skipReason})` : ''}`, () => {
    let result
    act(() => {
      result = renderStandalone(entry)
    })
    const live = presenterBridge.get()
    expect(live, `${id} did not publish beat controls`).not.toBeNull()
    expect(live.beatCount, id).toBe(entry.beats.length)
    result.unmount()
  })
})
