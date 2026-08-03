import { useEffect, useRef } from 'react'
import { createPresenterChannel } from './presenterChannel'
import { presenterBridge } from './presenterBridge'

/**
 * Executes one presenter command against the audience deck. Beat-first:
 * `next`/`prev` walk the active scene's beats (bridge) or lifted stage before
 * crossing scene boundaries. Exported for unit testing.
 */
export function executePresenterCommand(msg, { bridge, stageControls, onNextScene, onPrevScene, onGoToScene }) {
  switch (msg.action) {
    case 'next':
      if (bridge && bridge.beat < bridge.beatCount - 1) {
        bridge.goTo(bridge.beat + 1)
      } else if (stageControls && stageControls.stage < stageControls.count - 1) {
        stageControls.setStage(stageControls.stage + 1)
      } else {
        onNextScene()
      }
      break
    case 'prev':
      if (bridge && bridge.beat > 0) {
        bridge.goTo(bridge.beat - 1)
      } else if (stageControls && stageControls.stage > 0) {
        stageControls.setStage(stageControls.stage - 1)
      } else {
        onPrevScene()
      }
      break
    case 'goToScene':
      onGoToScene(msg.sceneId)
      break
    case 'goToBeat':
      if (bridge) {
        bridge.goTo(msg.beatIndex)
      } else if (stageControls) {
        stageControls.setStage(Math.max(0, Math.min(msg.beatIndex, stageControls.count - 1)))
      }
      break
    case 'replay':
      bridge?.replay()
      break
    case 'toggleAutoplay':
      bridge?.toggleAutoplay()
      break
  }
}

/**
 * Audience-side half of the presenter link. Mounted once in AppContent, it:
 * - executes commands from the presenter tab (scene nav, beat nav, replay),
 * - broadcasts { sceneId, beat, ... } state whenever the scene, the registered
 *   beat controls, or a lifted stage changes, and on presenter sync-requests.
 *
 * Beat-first advancement: `next`/`prev` step through the active scene's beats
 * (via the presenter bridge, or the scene's lifted stage controls) before
 * moving between scenes.
 *
 * @param {Object} state
 * @param {string} state.sceneId
 * @param {number} state.sceneIndex
 * @param {number} state.sceneCount
 * @param {Function} state.onNextScene
 * @param {Function} state.onPrevScene
 * @param {Function} state.onGoToScene - (sceneId) => void
 * @param {Object|null} state.stageControls - { stage, count, setStage } for
 *   scenes whose step state is lifted into App instead of useSceneMotion.
 */
export function usePresenterSync(state) {
  const stateRef = useRef(state)
  stateRef.current = state

  const broadcastRef = useRef(() => {})

  useEffect(() => {
    const broadcast = () => {
      const s = stateRef.current
      const bridge = presenterBridge.get()
      const beatState = bridge
        ? {
            beat: bridge.beat,
            beatCount: bridge.beatCount,
            beatLabels: bridge.beatLabels,
            isPlaying: bridge.isPlaying,
          }
        : s.stageControls
          ? {
              beat: s.stageControls.stage,
              beatCount: s.stageControls.count,
              beatLabels: [],
              isPlaying: false,
            }
          : { beat: 0, beatCount: 0, beatLabels: [], isPlaying: false }

      channel.post({
        type: 'state',
        sceneId: s.sceneId,
        sceneIndex: s.sceneIndex,
        sceneCount: s.sceneCount,
        ...beatState,
      })
    }
    broadcastRef.current = broadcast

    const handleCommand = (msg) => {
      const s = stateRef.current
      executePresenterCommand(msg, {
        bridge: presenterBridge.get(),
        stageControls: s.stageControls,
        onNextScene: s.onNextScene,
        onPrevScene: s.onPrevScene,
        onGoToScene: s.onGoToScene,
      })
    }

    const channel = createPresenterChannel((msg) => {
      if (msg?.type === 'sync-request') broadcast()
      else if (msg?.type === 'command') handleCommand(msg)
    })

    // Beat changes re-register with the bridge, so this keeps the presenter
    // current while the audience navigates beats locally too.
    const unsubscribe = presenterBridge.subscribe(broadcast)
    broadcast()

    return () => {
      unsubscribe()
      channel.close()
      broadcastRef.current = () => {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-broadcast on scene changes and lifted-stage changes (bridge changes
  // notify via the subscription above).
  useEffect(() => {
    broadcastRef.current()
  }, [state.sceneId, state.stageControls?.stage, state.stageControls?.count])
}
