// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { DECK_PRESETS, presetConfig } from './deckPresets'
import { SCENE_REGISTRY } from './sceneRegistry.jsx'

const allSceneIds = SCENE_REGISTRY.map((s) => s.id)

describe('deck presets', () => {
  it('names only scenes that are actually registered', () => {
    for (const preset of DECK_PRESETS) {
      const unknown = preset.sceneIds.filter((id) => !allSceneIds.includes(id))
      expect(unknown, `preset "${preset.id}" points at unregistered scenes`).toEqual([])
    }
  })

  it('enables exactly the preset scenes and pushes the rest behind them', () => {
    for (const preset of DECK_PRESETS.filter((p) => !p.allScenes)) {
      const { order, enabledIds } = presetConfig(preset.id, allSceneIds)
      expect(enabledIds).toEqual(preset.sceneIds)
      expect(order.slice(0, preset.sceneIds.length)).toEqual(preset.sceneIds)
      expect(order).toHaveLength(allSceneIds.length)
    }
  })
})
