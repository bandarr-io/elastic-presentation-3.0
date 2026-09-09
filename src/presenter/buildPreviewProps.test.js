import { describe, it, expect } from 'vitest'
import { buildPreviewProps } from './buildPreviewProps'

describe('buildPreviewProps', () => {
  const ctx = {
    sceneMetadata: { hero: { eyebrow: 'Hi' } },
    orderedScenes: [{ id: 'hero' }],
    customDurations: {},
    enabledScenes: [{ id: 'hero' }],
  }

  it('passes metadata for ordinary scenes', () => {
    expect(buildPreviewProps('hero', ctx)).toEqual({ metadata: { eyebrow: 'Hi' } })
  })

  it('gives agenda a scene list without interactive setters', () => {
    const props = buildPreviewProps('agenda', ctx)
    expect(props.scenes).toBe(ctx.orderedScenes)
    expect(props.expanded).toEqual({})
    props.setExpanded('nope')
  })

  it('overlays live preview state when provided', () => {
    const props = buildPreviewProps('hero', ctx, 0, { playSignal: 3 })
    expect(props.playSignal).toBe(3)
    expect(props.metadata.eyebrow).toBe('Hi')
  })

  it('uses the copy metadata and the source scene wiring', () => {
    const copyCtx = {
      sceneMetadata: { 'security~2': { eyebrow: 'Copy' } },
      orderedScenes: [],
      customDurations: {},
      enabledScenes: [],
    }
    const props = buildPreviewProps('security~2', copyCtx, 2)
    expect(props.metadata.eyebrow).toBe('Copy')
    expect(props.externalStage).toBe(2)
  })
})
