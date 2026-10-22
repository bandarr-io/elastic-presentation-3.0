// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSceneConfiguration } from '../components/SceneSettings'
import { SCENE_REGISTRY } from './sceneRegistry'
import { DECK_PRESETS, DEFAULT_PRESET_ID, presetConfig } from './deckPresets'

const STORAGE_KEY = 'presentation-scene-config'
const ALL_IDS = SCENE_REGISTRY.map((s) => s.id)

/**
 * Registering a scene is not enough to make it visible. A fresh config, and any
 * config rebuilt by an ORDER_VERSION migration, takes its enabled set from the
 * default preset alone, so a scene missing from that preset never appears no
 * matter what `defaultDisabled` says.
 *
 * These scenes are in that state already. The list only shrinks: either add the
 * scene to the default preset or mark it `defaultDisabled` so its absence is
 * deliberate. Nothing new may join it.
 */
const KNOWN_UNREACHABLE = [
  'ai-assistant',
  'elastic-value',
  'security',
  'security-capabilities',
  'security-narrative-visual',
  'security-soc-model',
  'security-use-cases',
  'value-by-team',
  'video-knowledge',
]

function enabledIdsFor(saved) {
  localStorage.clear()
  if (saved) localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
  const { result } = renderHook(() => useSceneConfiguration(SCENE_REGISTRY))
  return result.current.enabledSceneIds
}

const shouldBeVisible = SCENE_REGISTRY.filter(
  (s) => !s.defaultDisabled && !KNOWN_UNREACHABLE.includes(s.id),
).map((s) => s.id)

beforeEach(() => localStorage.clear())

describe('scene reachability', () => {
  it.each(shouldBeVisible)('%s is enabled on a first visit', (id) => {
    expect(enabledIdsFor(null)).toContain(id)
  })

  it.each(shouldBeVisible)('%s is enabled after a config-version migration', (id) => {
    expect(enabledIdsFor({ orderVersion: 1, order: ['hero'], enabledIds: ['hero'] })).toContain(id)
  })

  it.each(shouldBeVisible)('%s survives being dropped from a saved order', (id) => {
    const stale = presetConfig(DEFAULT_PRESET_ID, ALL_IDS)
    expect(
      enabledIdsFor({
        orderVersion: 9,
        order: stale.order.filter((s) => s !== id),
        enabledIds: stale.enabledIds.filter((s) => s !== id),
      }),
    ).toContain(id)
  })

  it('keeps the unreachable list honest: a scene that got fixed must leave it', () => {
    const firstVisit = enabledIdsFor(null)
    expect(KNOWN_UNREACHABLE.filter((id) => firstVisit.includes(id))).toEqual([])
    expect(KNOWN_UNREACHABLE.filter((id) => !ALL_IDS.includes(id))).toEqual([])
  })

  it('every preset names only scenes that exist', () => {
    for (const preset of DECK_PRESETS) {
      expect(preset.sceneIds.filter((id) => !ALL_IDS.includes(id))).toEqual([])
    }
  })
})
