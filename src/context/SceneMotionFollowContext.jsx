import { createContext, useContext, useMemo } from 'react'

/**
 * Puts every `useSceneMotion` instance underneath into follow mode: instead of
 * owning its beat locally, the scene mirrors the provided beat (and replays on
 * playKey bumps). The presenter view wraps its current-scene miniature in this
 * so the preview tracks the exact beat the audience tab is showing.
 */
const SceneMotionFollowContext = createContext(null)

export function SceneMotionFollow({ beat = 0, playKey = 0, children }) {
  const value = useMemo(() => ({ beat, playKey }), [beat, playKey])
  return (
    <SceneMotionFollowContext.Provider value={value}>
      {children}
    </SceneMotionFollowContext.Provider>
  )
}

export function useSceneMotionFollow() {
  return useContext(SceneMotionFollowContext)
}
