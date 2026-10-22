import { describe, it, expect } from 'vitest'
import {
  clampStepHold,
  buildTourSteps,
  resolvePages,
  effectiveBeats,
  PAGE_HOLD_MS,
  STEP_MIN_MS,
  STEP_MAX_MS,
} from './tourSteps'

const registry = {
  a: { title: 'A', component: () => null },
  b: { title: 'B', component: () => null, beats: [{ hold: 6000 }, { hold: 7000 }] },
  c: { title: 'C', component: () => null, hold: 9000 },
}

const defaults = [
  { sceneId: 'a' },
  { sceneId: 'b' },
  { sceneId: 'c' },
]

describe('constants', () => {
  it('exports the original timing values', () => {
    expect(PAGE_HOLD_MS).toBe(12000)
    expect(STEP_MIN_MS).toBe(5000)
    expect(STEP_MAX_MS).toBe(10000)
  })
})

describe('clampStepHold', () => {
  it('clamps to the default band', () => {
    expect(clampStepHold(1000)).toBe(5000)
    expect(clampStepHold(7000)).toBe(7000)
    expect(clampStepHold(40000)).toBe(10000)
  })

  it('honours custom bounds', () => {
    expect(clampStepHold(100, { minHold: 200, maxHold: 300 })).toBe(200)
    expect(clampStepHold(250, { minHold: 200, maxHold: 300 })).toBe(250)
    expect(clampStepHold(900, { minHold: 200, maxHold: 300 })).toBe(300)
  })

  it('uses defaults for any bound not given', () => {
    expect(clampStepHold(100, { maxHold: 20000 })).toBe(5000)
    expect(clampStepHold(30000, { maxHold: 20000 })).toBe(20000)
  })
})

describe('buildTourSteps', () => {
  it('matches the original semantics when called with one argument', () => {
    const steps = buildTourSteps([
      { id: 'single', title: 'Single', component: () => null },
      { id: 'beats', title: 'Beats', component: () => null, beats: [{ hold: 1200 }, { hold: 40000 }] },
      { id: 'props', title: 'Props', component: () => null, stepProps: [{}, {}], hold: 7500 },
    ])

    expect(steps).toEqual([
      { key: 'single-0', step: 'Single', pageIndex: 0, stepIndex: 0, hold: 12000 },
      { key: 'beats-0', step: 'Beats 1', pageIndex: 1, stepIndex: 0, hold: 5000 },
      { key: 'beats-1', step: 'Beats 2', pageIndex: 1, stepIndex: 1, hold: 10000 },
      { key: 'props-0', step: 'Props 1', pageIndex: 2, stepIndex: 0, hold: 7500 },
      { key: 'props-1', step: 'Props 2', pageIndex: 2, stepIndex: 1, hold: 7500 },
    ])
  })

  it('gives one step per beat and one step per stepProps entry', () => {
    const steps = buildTourSteps([
      { id: 'a', title: 'A', component: () => null, beats: [{}, {}, {}] },
      { id: 'b', title: 'B', component: () => null, stepProps: [{}, {}] },
      { id: 'c', title: 'C', component: () => null },
    ])
    expect(steps.map((s) => `${s.pageIndex}:${s.stepIndex}`)).toEqual([
      '0:0', '0:1', '0:2', '1:0', '1:1', '2:0',
    ])
  })

  it('uses the bare title for single-step pages', () => {
    const steps = buildTourSteps([{ id: 'x', title: 'Only', component: () => null }])
    expect(steps).toHaveLength(1)
    expect(steps[0].step).toBe('Only')
  })

  it('labels multi-step pages Title 1, Title 2', () => {
    const steps = buildTourSteps([
      { id: 'x', title: 'Title', component: () => null, beats: [{ hold: 6000 }, { hold: 6000 }] },
    ])
    expect(steps.map((s) => s.step)).toEqual(['Title 1', 'Title 2'])
  })

  it('uses page.hold ?? 12000 for non-beat pages', () => {
    const steps = buildTourSteps([
      { id: 'plain', title: 'Plain', component: () => null },
      { id: 'held', title: 'Held', component: () => null, hold: 9000 },
    ])
    expect(steps.map((s) => s.hold)).toEqual([12000, 9000])
  })

  it('honours minHold and maxHold for beat holds', () => {
    const pages = [{ id: 'b', title: 'B', component: () => null, beats: [{ hold: 1000 }, { hold: 50000 }, { hold: 3000 }] }]
    const steps = buildTourSteps(pages, { minHold: 2000, maxHold: 20000 })
    expect(steps.map((s) => s.hold)).toEqual([2000, 20000, 3000])
  })

  it('honours pageHold for pages without a hold, but not for pages with one', () => {
    const pages = [
      { id: 'plain', title: 'Plain', component: () => null },
      { id: 'held', title: 'Held', component: () => null, hold: 9000 },
    ]
    const steps = buildTourSteps(pages, { pageHold: 4000 })
    expect(steps.map((s) => s.hold)).toEqual([4000, 9000])
  })

  it('uses pageHold as the fallback for beats without a hold', () => {
    const pages = [{ id: 'b', title: 'B', component: () => null, beats: [{}] }]
    const steps = buildTourSteps(pages, { pageHold: 6000 })
    expect(steps[0].hold).toBe(6000)
  })
})

describe('resolvePages', () => {
  it('returns defaults when metadata is undefined or null', () => {
    expect(resolvePages(undefined, registry, defaults).map((p) => p.id)).toEqual(['a', 'b', 'c'])
    expect(resolvePages(null, registry, defaults).map((p) => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('resolves each page with registry fields and unique ids', () => {
    const [a, b] = resolvePages(undefined, registry, defaults)
    expect(a).toMatchObject({ id: 'a', sceneId: 'a', title: 'A' })
    expect(b.beats).toEqual([{ hold: 6000 }, { hold: 7000 }])
    expect(b.hold).toBeUndefined()
    expect(a).not.toHaveProperty('enabled')
  })

  it('respects list order in list mode', () => {
    const pages = resolvePages(
      { pages: [{ sceneId: 'c' }, { sceneId: 'a' }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.sceneId)).toEqual(['c', 'a'])
  })

  it('skips entries with enabled: false', () => {
    const pages = resolvePages(
      { pages: [{ sceneId: 'a' }, { sceneId: 'b', enabled: false }, { sceneId: 'c' }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.sceneId)).toEqual(['a', 'c'])
  })

  it('applies title and hold overrides in list mode', () => {
    const [page] = resolvePages(
      { pages: [{ sceneId: 'c', title: 'Renamed', hold: 4000 }] },
      registry,
      defaults,
    )
    expect(page.title).toBe('Renamed')
    expect(page.hold).toBe(4000)
    expect(page.component).toBe(registry.c.component)
  })

  it('keeps the registry hold when the override hold is not finite', () => {
    const [page] = resolvePages(
      { pages: [{ sceneId: 'c', hold: 'soon' }] },
      registry,
      defaults,
    )
    expect(page.hold).toBe(9000)
  })

  it('keeps the registry hold when the override hold is zero or negative', () => {
    for (const hold of [0, -3000, 500]) {
      const [page] = resolvePages({ pages: [{ sceneId: 'c', hold }] }, registry, defaults)
      expect(page.hold).toBe(9000)
    }
  })

  it('drops unknown sceneIds', () => {
    const pages = resolvePages(
      { pages: [{ sceneId: 'nope' }, { sceneId: 'a' }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.id)).toEqual(['a'])
  })

  it('gives duplicate sceneIds unique ids', () => {
    const pages = resolvePages(
      { pages: [{ sceneId: 'a' }, { sceneId: 'b' }, { sceneId: 'a' }, { sceneId: 'a' }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.id)).toEqual(['a', 'b', 'a-2', 'a-3'])
    expect(pages.map((p) => p.sceneId)).toEqual(['a', 'b', 'a', 'a'])
  })

  it('merges index overrides onto defaults in legacy mode', () => {
    const pages = resolvePages(
      { pages: [{ title: 'Renamed' }, { enabled: false }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.sceneId)).toEqual(['a', 'c'])
    expect(pages[0].title).toBe('Renamed')
    expect(pages[1].title).toBe('C')
  })

  it('falls back to defaults when list mode resolves to nothing', () => {
    const pages = resolvePages(
      { pages: [{ sceneId: 'nope' }, { sceneId: 'a', enabled: false }] },
      registry,
      defaults,
    )
    expect(pages.map((p) => p.sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('falls back to defaults when metadata.pages is not an array', () => {
    const pages = resolvePages({ pages: 'oops' }, registry, defaults)
    expect(pages.map((p) => p.sceneId)).toEqual(['a', 'b', 'c'])
  })

  it('returns an empty array when defaults are also unusable', () => {
    expect(resolvePages(undefined, registry, [])).toEqual([])
    expect(resolvePages(undefined, registry, [{ sceneId: 'nope' }])).toEqual([])
    expect(resolvePages(undefined, registry, undefined)).toEqual([])
  })

  it('does not mutate its inputs', () => {
    const metadata = { pages: [{ title: 'Renamed' }, { enabled: false }] }
    const defaultPages = [{ sceneId: 'a' }, { sceneId: 'b' }, { sceneId: 'c' }]
    const registryCopy = Object.fromEntries(
      Object.entries(registry).map(([key, value]) => [key, { ...value }]),
    )
    const metadataCopy = structuredClone(metadata)
    const defaultsCopy = structuredClone(defaultPages)

    resolvePages(metadata, registry, defaultPages)
    resolvePages({ pages: [{ sceneId: 'a', enabled: false }, { sceneId: 'c', title: 'X' }] }, registry, defaultPages)

    expect(metadata).toEqual(metadataCopy)
    expect(defaultPages).toEqual(defaultsCopy)
    expect(registry).toEqual(registryCopy)
  })
})

describe('effectiveBeats', () => {
  const base = [{ key: 'one', hold: 6000 }, { key: 'two', hold: 7000 }]

  it('returns undefined for a page without registry beats', () => {
    expect(effectiveBeats(undefined, { beats: [{ hold: 1 }] })).toBeUndefined()
  })

  it('returns the registry beats when the metadata has none', () => {
    expect(effectiveBeats(base, {})).toEqual(base)
    expect(effectiveBeats(base, undefined)).toEqual(base)
  })

  it('follows a custom beat count and merges each over its default by index', () => {
    const result = effectiveBeats(base, { beats: [{ hold: 9000 }] })
    expect(result).toEqual([{ key: 'one', hold: 9000 }])
  })

  it('keeps extra custom beats that have no default', () => {
    const result = effectiveBeats(base, { beats: [{}, {}, { key: 'three', hold: 5500 }] })
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ key: 'three', hold: 5500 })
  })

  it('does not mutate its inputs', () => {
    const meta = { beats: [{ hold: 9000 }] }
    effectiveBeats(base, meta)
    expect(base[0].hold).toBe(6000)
    expect(meta.beats).toEqual([{ hold: 9000 }])
  })
})
