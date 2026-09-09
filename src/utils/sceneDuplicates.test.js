import { describe, it, expect } from 'vitest'
import { CUSTOM_PRESET_ID } from '../data/deckPresets'
import { presetConfig } from '../data/deckPresets'
import {
  aliasSceneEditorProps,
  deleteDuplicateFromConfig,
  duplicateSceneInConfig,
  materializeScenes,
  mergeDuplicatesIntoMigration,
} from './sceneDuplicates'

const initialScenes = [
  { id: 'hero', title: 'Hero', component: 'Hero' },
  { id: 'about', title: 'About Elastic', component: 'About' },
]

function baseConfig() {
  return {
    enabledIds: ['hero', 'about'],
    order: ['hero', 'about'],
    durations: { about: '3 min' },
    sceneMetadata: {
      about: { title: 'About Elastic', eyebrow: 'Who We Are', nested: { n: 1 } },
    },
    duplicates: [],
    activePreset: 'new-prospect',
  }
}

describe('materializeScenes', () => {
  it('appends virtual copies that share the source component', () => {
    const scenes = materializeScenes(initialScenes, [
      { id: 'about~2', sourceId: 'about', label: 'About Elastic (copy)' },
    ])
    expect(scenes.map((s) => s.id)).toEqual(['hero', 'about', 'about~2'])
    expect(scenes[2].component).toBe('About')
    expect(scenes[2].isDuplicate).toBe(true)
    expect(scenes[2].sourceTitle).toBe('About Elastic')
  })

  it('drops copies whose source is gone', () => {
    const scenes = materializeScenes(initialScenes, [{ id: 'gone~2', sourceId: 'missing' }])
    expect(scenes.map((s) => s.id)).toEqual(['hero', 'about'])
  })
})

describe('duplicateSceneInConfig', () => {
  it('inserts an independent metadata clone after the source', () => {
    const next = duplicateSceneInConfig(baseConfig(), 'about', initialScenes)
    expect(next.duplicates).toEqual([
      { id: 'about~2', sourceId: 'about', label: 'About Elastic (copy)' },
    ])
    expect(next.order).toEqual(['hero', 'about', 'about~2'])
    expect(next.enabledIds).toEqual(['hero', 'about', 'about~2'])
    expect(next.durations['about~2']).toBe('3 min')
    expect(next.sceneMetadata['about~2'].eyebrow).toBe('Who We Are')
    expect(next.activePreset).toBe(CUSTOM_PRESET_ID)

    next.sceneMetadata['about~2'].eyebrow = 'Changed'
    next.sceneMetadata['about~2'].nested.n = 9
    expect(next.sceneMetadata.about.eyebrow).toBe('Who We Are')
    expect(next.sceneMetadata.about.nested.n).toBe(1)
  })

  it('allocates about~3 when about~2 already exists', () => {
    const withCopy = duplicateSceneInConfig(baseConfig(), 'about', initialScenes)
    const again = duplicateSceneInConfig(withCopy, 'about', initialScenes)
    expect(again.duplicates.map((d) => d.id)).toEqual(['about~2', 'about~3'])
  })
})

describe('deleteDuplicateFromConfig', () => {
  it('removes a copy from every config collection and leaves the source', () => {
    const withCopy = duplicateSceneInConfig(baseConfig(), 'about', initialScenes)
    const next = deleteDuplicateFromConfig(withCopy, 'about~2')
    expect(next.duplicates).toEqual([])
    expect(next.order).toEqual(['hero', 'about'])
    expect(next.enabledIds).toEqual(['hero', 'about'])
    expect(next.sceneMetadata['about~2']).toBeUndefined()
    expect(next.sceneMetadata.about.eyebrow).toBe('Who We Are')
  })

  it('does not delete a registry scene', () => {
    const config = baseConfig()
    expect(deleteDuplicateFromConfig(config, 'about')).toBe(config)
  })
})

describe('presetConfig with copies', () => {
  it('keeps copies in remaining (disabled) when a preset is applied', () => {
    const allIds = ['hero', 'about', 'about~2']
    const preset = presetConfig('no-scenes', allIds)
    expect(preset.enabledIds).toEqual(['hero'])
    expect(preset.order).toEqual(['hero', 'about', 'about~2'])
  })
})

describe('mergeDuplicatesIntoMigration', () => {
  it('appends copy ids and restores those that were enabled', () => {
    const migrated = {
      order: ['hero', 'about'],
      enabledIds: ['hero'],
    }
    const parsed = {
      duplicates: [{ id: 'about~2', sourceId: 'about', label: 'About Elastic (copy)' }],
      enabledIds: ['hero', 'about~2'],
    }
    const next = mergeDuplicatesIntoMigration(migrated, parsed)
    expect(next.order).toEqual(['hero', 'about', 'about~2'])
    expect(next.enabledIds).toEqual(['hero', 'about~2'])
    expect(next.duplicates).toEqual(parsed.duplicates)
  })
})

describe('aliasSceneEditorProps', () => {
  it('rewrites base-id reads and writes onto the copy', () => {
    const writes = []
    const { sceneMetadata, onUpdateSceneMetadata } = aliasSceneEditorProps(
      'about~2',
      { about: { eyebrow: 'source' }, 'about~2': { eyebrow: 'copy' } },
      (id, metadata) => writes.push([id, metadata]),
    )
    expect(sceneMetadata.about.eyebrow).toBe('copy')
    onUpdateSceneMetadata('about', { eyebrow: 'edited' })
    expect(writes).toEqual([['about~2', { eyebrow: 'edited' }]])
  })

  it('leaves registry scenes untouched', () => {
    const onUpdate = (id, metadata) => [id, metadata]
    const meta = { about: { eyebrow: 'source' } }
    const aliased = aliasSceneEditorProps('about', meta, onUpdate)
    expect(aliased.sceneMetadata).toBe(meta)
    expect(aliased.onUpdateSceneMetadata('about', { eyebrow: 'x' })).toEqual(['about', { eyebrow: 'x' }])
  })
})
