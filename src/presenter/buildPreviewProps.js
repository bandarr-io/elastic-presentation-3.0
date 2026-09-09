import { baseSceneId } from '../utils/sceneIdentity'

/**
 * Preview instances get inert stand-ins for the interactive props AppContent
 * normally supplies. `stage` lets a follower preview mirror a lifted stage
 * (broadcast as `beat` for those scenes), and `live` overlays interactive
 * state (signals, demo phase…) so trigger-driven animations can play too.
 */
export function buildPreviewProps(sceneId, { sceneMetadata, orderedScenes, customDurations, enabledScenes }, stage = 0, live = null) {
  const metadata = sceneMetadata?.[sceneId] || {}
  const noop = () => {}
  const base = (() => {
    switch (baseSceneId(sceneId)) {
    case 'agenda':
      return { scenes: orderedScenes, sceneMetadata, customDurations, metadata, expanded: {}, setExpanded: noop, expandAllSignal: 0 }
    case 'business-value':
      return { selectedCard: null, setSelectedCard: noop, showUnifiedMessage: false, setShowUnifiedMessage: noop, metadata }
    case 'data-mesh':
      return {
        scenes: enabledScenes, onNavigate: noop, metadata,
        runQuerySignal: 0, onQueryStateChange: noop, playSignal: 0, onPlayStateChange: noop,
        summarySignal: 0, onSummaryStateChange: noop, activateMeshSignal: 0, onActivateMeshStateChange: noop,
      }
    case 'security':
      return { externalStage: stage, onStageChange: noop, playSignal: 0, phaseAdvanceSignal: 0, onAlertPhaseChange: noop, metadata }
    case 'schema':
      return { externalStage: stage, onStageChange: noop, playSignal: 0, metadata }
    case 'esql':
      return { metadata, externalStage: stage, onStageChange: noop }
    case 'services':
      return { externalStage: stage, onStageChange: noop, demoPhase: 'idle', metadata }
    case 'elastic-overview':
      return { metadata, externalStage: stage, onStageChange: noop }
    case 'data-tiering':
      return { isRunning: false, setIsRunning: noop, resetSignal: 0, metadata }
    case 'consolidation':
      return { tools: metadata.tools, metadata }
    default:
      return { metadata }
    }
  })()
  return live ? { ...base, ...live } : base
}
