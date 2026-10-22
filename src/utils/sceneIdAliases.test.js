// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { SCENE_ID_ALIASES, resolveSceneId, migrateSceneIds } from './sceneIdAliases'
import { SCENE_REGISTRY } from '../data/sceneRegistry'

describe('resolveSceneId', () => {
  it('maps a renamed id to its current id', () => {
    expect(resolveSceneId('platform-tour')).toBe('scene-tour')
  })

  it('keeps the copy suffix when mapping a duplicate', () => {
    expect(resolveSceneId('platform-tour~2')).toBe('scene-tour~2')
  })

  it('returns unknown ids unchanged', () => {
    expect(resolveSceneId('hero')).toBe('hero')
    expect(resolveSceneId('hero~3')).toBe('hero~3')
  })

  it('returns non-strings unchanged', () => {
    expect(resolveSceneId(undefined)).toBe(undefined)
    expect(resolveSceneId(null)).toBe(null)
    expect(resolveSceneId(7)).toBe(7)
  })
})

describe('migrateSceneIds', () => {
  const savedConfig = () => ({
    enabledIds: ['hero', 'platform-tour', 'agenda'],
    order: ['hero', 'platform-tour', 'agenda'],
    durations: { 'platform-tour': '3 min' },
    sceneMetadata: { 'platform-tour': { eyebrow: 'Keep me' } },
    duplicates: [{ id: 'platform-tour~2', sourceId: 'platform-tour', label: 'Copy' }],
    activePreset: 'custom',
    orderVersion: 9,
  })

  it('rewrites old ids in every scene field and keeps order positions', () => {
    const out = migrateSceneIds(savedConfig())
    expect(out.enabledIds).toEqual(['hero', 'scene-tour', 'agenda'])
    expect(out.order).toEqual(['hero', 'scene-tour', 'agenda'])
    expect(out.durations).toEqual({ 'scene-tour': '3 min' })
    expect(out.sceneMetadata).toEqual({ 'scene-tour': { eyebrow: 'Keep me' } })
    expect(out.duplicates).toEqual([
      { id: 'scene-tour~2', sourceId: 'scene-tour', label: 'Copy' },
    ])
    expect(out.activePreset).toBe('custom')
    expect(out.orderVersion).toBe(9)
  })

  it('returns the same reference for an already-migrated config', () => {
    const migrated = migrateSceneIds(savedConfig())
    expect(migrateSceneIds(migrated)).toBe(migrated)
  })

  it('is idempotent', () => {
    const once = migrateSceneIds(savedConfig())
    expect(migrateSceneIds(once)).toEqual(once)
  })

  it('keeps the new key value when old and new keys collide', () => {
    const input = {
      sceneMetadata: {
        'platform-tour': { eyebrow: 'old' },
        'scene-tour': { eyebrow: 'new' },
      },
    }
    expect(migrateSceneIds(input).sceneMetadata).toEqual({
      'scene-tour': { eyebrow: 'new' },
    })
  })

  it('de-duplicates arrays after rewriting, keeping the first occurrence', () => {
    const out = migrateSceneIds({ order: ['platform-tour', 'hero', 'scene-tour'] })
    expect(out.order).toEqual(['scene-tour', 'hero'])
  })

  it('keeps one duplicate entry when two copies now resolve to the same id', () => {
    const out = migrateSceneIds({
      duplicates: [
        { id: 'platform-tour~2', sourceId: 'platform-tour', label: 'Old' },
        { id: 'scene-tour~2', sourceId: 'scene-tour', label: 'New' },
      ],
    })
    expect(out.duplicates).toEqual([{ id: 'scene-tour~2', sourceId: 'scene-tour', label: 'Old' }])
  })

  it('does not mutate its input', () => {
    const input = savedConfig()
    const snapshot = JSON.parse(JSON.stringify(input))
    migrateSceneIds(input)
    expect(input).toEqual(snapshot)
  })

  it('returns null and undefined as they are', () => {
    expect(migrateSceneIds(null)).toBe(null)
    expect(migrateSceneIds(undefined)).toBe(undefined)
  })
})

describe('SCENE_ID_ALIASES', () => {
  it('every alias target is a registered scene id', () => {
    const ids = SCENE_REGISTRY.map((s) => s.id)
    for (const target of Object.values(SCENE_ID_ALIASES)) {
      expect(ids).toContain(target)
    }
  })
})
