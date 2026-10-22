// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSceneConfiguration } from './SceneSettings'
import { SCENE_REGISTRY } from '../data/sceneRegistry'

const STORAGE_KEY = 'presentation-scene-config'

function hookWithSaved(saved) {
  localStorage.clear()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  const { result } = renderHook(() => useSceneConfiguration(SCENE_REGISTRY))
  return result.current
}

beforeEach(() => localStorage.clear())

describe('scene id migration in useSceneConfiguration', () => {
  it('migrates a current-version saved config to the new scene id', () => {
    const result = hookWithSaved({
      orderVersion: 9,
      enabledIds: ['hero', 'platform-tour'],
      order: ['hero', 'platform-tour'],
      durations: {},
      sceneMetadata: { 'platform-tour': { eyebrow: 'Keep me' } },
      duplicates: [],
    })
    expect(result.enabledSceneIds).toContain('scene-tour')
    expect(result.enabledSceneIds).not.toContain('platform-tour')
    expect(result.sceneMetadata['scene-tour'].eyebrow).toBe('Keep me')
  })

  it('keeps metadata under the new id on a version-mismatch migration', () => {
    const result = hookWithSaved({
      orderVersion: 1,
      enabledIds: ['hero', 'platform-tour'],
      order: ['hero', 'platform-tour'],
      durations: {},
      sceneMetadata: { 'platform-tour': { eyebrow: 'Keep me' } },
      duplicates: [],
    })
    expect(result.sceneMetadata['scene-tour'].eyebrow).toBe('Keep me')
    expect(result.sceneMetadata['platform-tour']).toBeUndefined()
  })
})
