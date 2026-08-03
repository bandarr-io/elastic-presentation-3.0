import { describe, it, expect, vi, afterEach } from 'vitest'
import { presenterBridge } from './presenterBridge'
import { createPresenterChannel } from './presenterChannel'
import { executePresenterCommand } from './usePresenterSync'

function makeSceneHandlers() {
  return {
    onNextScene: vi.fn(),
    onPrevScene: vi.fn(),
    onGoToScene: vi.fn(),
  }
}

function makeBridgeControls(beat, beatCount) {
  return {
    beat,
    beatCount,
    beatLabels: [],
    isPlaying: false,
    goTo: vi.fn(),
    replay: vi.fn(),
    toggleAutoplay: vi.fn(),
  }
}

describe('executePresenterCommand', () => {
  it('advances the beat before crossing to the next scene', () => {
    const handlers = makeSceneHandlers()
    const bridge = makeBridgeControls(0, 3)
    executePresenterCommand({ action: 'next' }, { bridge, stageControls: null, ...handlers })
    expect(bridge.goTo).toHaveBeenCalledWith(1)
    expect(handlers.onNextScene).not.toHaveBeenCalled()
  })

  it('moves to the next scene from the last beat', () => {
    const handlers = makeSceneHandlers()
    const bridge = makeBridgeControls(2, 3)
    executePresenterCommand({ action: 'next' }, { bridge, stageControls: null, ...handlers })
    expect(bridge.goTo).not.toHaveBeenCalled()
    expect(handlers.onNextScene).toHaveBeenCalled()
  })

  it('steps back through beats before going to the previous scene', () => {
    const handlers = makeSceneHandlers()
    const bridge = makeBridgeControls(1, 3)
    executePresenterCommand({ action: 'prev' }, { bridge, stageControls: null, ...handlers })
    expect(bridge.goTo).toHaveBeenCalledWith(0)
    expect(handlers.onPrevScene).not.toHaveBeenCalled()

    const atStart = makeBridgeControls(0, 3)
    executePresenterCommand({ action: 'prev' }, { bridge: atStart, stageControls: null, ...handlers })
    expect(handlers.onPrevScene).toHaveBeenCalled()
  })

  it('drives lifted stage controls when no bridge is registered', () => {
    const handlers = makeSceneHandlers()
    const stageControls = { stage: 0, count: 3, setStage: vi.fn() }
    executePresenterCommand({ action: 'next' }, { bridge: null, stageControls, ...handlers })
    expect(stageControls.setStage).toHaveBeenCalledWith(1)
    expect(handlers.onNextScene).not.toHaveBeenCalled()

    const atLastStage = { stage: 2, count: 3, setStage: vi.fn() }
    executePresenterCommand({ action: 'next' }, { bridge: null, stageControls: atLastStage, ...handlers })
    expect(atLastStage.setStage).not.toHaveBeenCalled()
    expect(handlers.onNextScene).toHaveBeenCalled()
  })

  it('falls through to scene navigation for beat-less scenes', () => {
    const handlers = makeSceneHandlers()
    executePresenterCommand({ action: 'next' }, { bridge: null, stageControls: null, ...handlers })
    expect(handlers.onNextScene).toHaveBeenCalled()
  })

  it('clamps goToBeat on lifted stages and routes goToScene', () => {
    const handlers = makeSceneHandlers()
    const stageControls = { stage: 0, count: 3, setStage: vi.fn() }
    executePresenterCommand({ action: 'goToBeat', beatIndex: 99 }, { bridge: null, stageControls, ...handlers })
    expect(stageControls.setStage).toHaveBeenCalledWith(2)

    executePresenterCommand({ action: 'goToScene', sceneId: 'security' }, { bridge: null, stageControls: null, ...handlers })
    expect(handlers.onGoToScene).toHaveBeenCalledWith('security')
  })
})

describe('presenterBridge', () => {
  afterEach(() => {
    const current = presenterBridge.get()
    if (current) presenterBridge.unregister(current)
  })

  it('exposes the latest registered controls and notifies subscribers', () => {
    const listener = vi.fn()
    const unsubscribe = presenterBridge.subscribe(listener)

    const controls = makeBridgeControls(0, 2)
    presenterBridge.register(controls)
    expect(presenterBridge.get()).toBe(controls)
    expect(listener).toHaveBeenCalledTimes(1)

    presenterBridge.unregister(controls)
    expect(presenterBridge.get()).toBeNull()
    expect(listener).toHaveBeenCalledTimes(2)
    unsubscribe()
  })

  it('ignores unregister calls from stale registrations', () => {
    const stale = makeBridgeControls(0, 2)
    const fresh = makeBridgeControls(1, 2)
    presenterBridge.register(stale)
    presenterBridge.register(fresh)
    presenterBridge.unregister(stale)
    expect(presenterBridge.get()).toBe(fresh)
  })
})

describe('presenterChannel', () => {
  it('delivers messages between two channel instances', async () => {
    const received = []
    const receiver = createPresenterChannel((msg) => received.push(msg))
    const sender = createPresenterChannel(() => {})

    sender.post({ type: 'command', action: 'next' })
    await vi.waitFor(() => {
      expect(received).toEqual([{ type: 'command', action: 'next' }])
    })

    receiver.close()
    sender.close()
  })
})
