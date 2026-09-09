import { describe, it, expect } from 'vitest'
import { baseSceneId, isDuplicateSceneId, nextDuplicateId } from './sceneIdentity'

describe('sceneIdentity', () => {
  it('returns a registry id unchanged', () => {
    expect(baseSceneId('about')).toBe('about')
  })

  it('strips the duplicate suffix', () => {
    expect(baseSceneId('about~2')).toBe('about')
    expect(baseSceneId('search-catalog~12')).toBe('search-catalog')
  })

  it('treats only tildes as the suffix marker', () => {
    expect(isDuplicateSceneId('about')).toBe(false)
    expect(isDuplicateSceneId('about~2')).toBe(true)
  })

  it('allocates the next unused copy id after the source', () => {
    expect(nextDuplicateId('about', ['about'])).toBe('about~2')
    expect(nextDuplicateId('about', ['about', 'about~2'])).toBe('about~3')
    expect(nextDuplicateId('about~2', ['about', 'about~2'])).toBe('about~3')
  })
})
