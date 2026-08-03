/**
 * Cross-tab messaging between the audience deck and the presenter view.
 *
 * Message shapes:
 * - Presenter -> audience:
 *   { type: 'command', action: 'next' | 'prev' | 'goToScene' | 'goToBeat' | 'replay' | 'toggleAutoplay', sceneId?, beatIndex? }
 *   { type: 'sync-request' }                     // ask the audience for its current state
 * - Audience -> presenter:
 *   { type: 'state', sceneId, sceneIndex, sceneCount, beat, beatCount, beatLabels, isPlaying }
 */
const CHANNEL_NAME = 'elastic-deck-sync'

export function createPresenterChannel(onMessage) {
  const channel = new BroadcastChannel(CHANNEL_NAME)
  channel.onmessage = (event) => onMessage(event.data)
  return {
    post: (message) => channel.postMessage(message),
    close: () => channel.close(),
  }
}
