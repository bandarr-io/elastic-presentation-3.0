import { describe, it, expect } from 'vitest'
import { thumbnailKey, getThumbnail, setThumbnail, markThumbnailFailed, thumbnailFailed } from './sceneThumbnails'

describe('sceneThumbnails', () => {
  it('keys thumbs by theme, scene, and metadata', () => {
    const a = thumbnailKey('hero', 'dark', { title: 'A' })
    const b = thumbnailKey('hero', 'light', { title: 'A' })
    const c = thumbnailKey('hero', 'dark', { title: 'B' })
    expect(a).not.toBe(b)
    expect(a).not.toBe(c)
  })

  it('stores and retrieves a captured thumb', () => {
    const key = thumbnailKey('hero', 'dark', { n: 1 })
    setThumbnail(key, 'data:image/png;base64,abc')
    expect(getThumbnail(key)).toBe('data:image/png;base64,abc')
  })

  it('remembers failed captures so the queue can skip them', () => {
    const key = thumbnailKey('broken', 'dark', {})
    markThumbnailFailed(key)
    expect(thumbnailFailed(key)).toBe(true)
  })
})
