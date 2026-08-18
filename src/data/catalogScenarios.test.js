import { describe, it, expect } from 'vitest'
import {
  CATALOG_SCENARIOS,
  DEFAULT_CATALOG_SCENARIO_ID,
  resolveCatalogScenario,
  catalogSpeakerNotes,
  buildCatalogBeats,
} from './catalogScenarios'

describe('catalogScenarios', () => {
  it('ships dib, government, and commercial packs', () => {
    expect(Object.keys(CATALOG_SCENARIOS).sort()).toEqual(['commercial', 'dib', 'government'])
    expect(DEFAULT_CATALOG_SCENARIO_ID).toBe('dib')
  })

  it('defaults to dib', () => {
    const s = resolveCatalogScenario({})
    expect(s.id).toBe('dib')
    expect(s.queryTerm).toBe('avionics')
  })

  it('resolves by scenarioId', () => {
    expect(resolveCatalogScenario({ scenarioId: 'government' }).queryTerm).toBe('eligibility')
    expect(resolveCatalogScenario({ scenarioId: 'commercial' }).queryTerm).toBe('refund')
  })

  it('builds speaker notes for the audience pack', () => {
    const notes = catalogSpeakerNotes('dib')
    expect(notes).toContain('Defense Industrial Base')
    expect(notes).toContain('avionics')
  })

  it('scan hits match the inverted-index posting list (docs 3, 7, 11)', () => {
    for (const s of Object.values(CATALOG_SCENARIOS)) {
      expect(s.scanHitIndices).toEqual([2, 6, 10])
      const hitRow = s.indexRows.find((r) => r.hit)
      expect(hitRow.docs).toBe('3, 7, 11')
    }
  })

  it('builds catalog beats from the audience pack', () => {
    const beats = buildCatalogBeats(CATALOG_SCENARIOS.dib)
    expect(beats).toHaveLength(9)
    expect(beats[0].titleAccent).toBe('AVIONICS')
    expect(beats[1].subtitle).toContain('avionics')
  })
})
