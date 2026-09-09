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

  // Runs last: filling the cache evicts keys stored by the tests above.
  it('caps the cache so metadata edits cannot grow it without bound', () => {
    const first = thumbnailKey('hero', 'dark', { edit: 0 })
    setThumbnail(first, 'data:image/png;base64,first')

    for (let i = 1; i <= 200; i += 1) {
      setThumbnail(thumbnailKey('hero', 'dark', { edit: i }), `data:image/png;base64,${i}`)
    }

    expect(getThumbnail(first)).toBe(null)
    expect(getThumbnail(thumbnailKey('hero', 'dark', { edit: 200 }))).toBe('data:image/png;base64,200')
  })
})
