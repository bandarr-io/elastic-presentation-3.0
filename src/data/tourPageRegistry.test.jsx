// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { TOUR_PAGE_REGISTRY, TOUR_PAGE_GROUPS, DEFAULT_TOUR_PAGES } from './tourPageRegistry'

const EXPECTED_ORDER = [
  'about',
  'unified-strategy',
  'data-explosion',
  'search-challenge',
  'search-context',
  'video-knowledge',
]

const isComponent = (value) =>
  typeof value === 'function' || (typeof value === 'object' && value !== null)

describe('TOUR_PAGE_REGISTRY', () => {
  const entries = Object.entries(TOUR_PAGE_REGISTRY)

  it('has a non-empty string title and a component for every entry', () => {
    expect(entries.length).toBeGreaterThan(0)
    for (const [id, entry] of entries) {
      expect(typeof entry.title, id).toBe('string')
      expect(entry.title.length, id).toBeGreaterThan(0)
      expect(isComponent(entry.component), id).toBe(true)
    }
  })

  it('has a group from TOUR_PAGE_GROUPS for every entry', () => {
    for (const [id, entry] of entries) {
      expect(TOUR_PAGE_GROUPS, id).toContain(entry.group)
    }
  })

  it('has a non-empty beats array when beats is present', () => {
    for (const [id, entry] of entries) {
      if ('beats' in entry) {
        expect(Array.isArray(entry.beats), id).toBe(true)
        expect(entry.beats.length, id).toBeGreaterThan(0)
      }
    }
  })

  it('has an array stepProps when stepProps is present', () => {
    for (const [id, entry] of entries) {
      if ('stepProps' in entry) {
        expect(Array.isArray(entry.stepProps), id).toBe(true)
      }
    }
  })

  it('has a positive finite hold when hold is present', () => {
    for (const [id, entry] of entries) {
      if ('hold' in entry) {
        expect(Number.isFinite(entry.hold), id).toBe(true)
        expect(entry.hold, id).toBeGreaterThan(0)
      }
    }
  })
})

describe('DEFAULT_TOUR_PAGES', () => {
  it('is exactly the six scene ids in the default order', () => {
    expect(DEFAULT_TOUR_PAGES.map((page) => page.sceneId)).toEqual(EXPECTED_ORDER)
  })

  it('references only ids that exist in TOUR_PAGE_REGISTRY', () => {
    for (const { sceneId } of DEFAULT_TOUR_PAGES) {
      expect(TOUR_PAGE_REGISTRY).toHaveProperty([sceneId])
    }
  })

  it('has unique scene ids', () => {
    const ids = DEFAULT_TOUR_PAGES.map((page) => page.sceneId)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
