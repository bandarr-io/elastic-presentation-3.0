import { createContext, useContext, useState } from 'react'

/**
 * Lets the active narrative scene publish its auto-play / replay controls so the
 * global nav bar can render them alongside the other per-scene controls, instead
 * of floating them at the edges of the scene body.
 */
const SceneMotionContext = createContext(null)

export function SceneMotionProvider({ children }) {
  const [controls, setControls] = useState(null)
  return (
    <SceneMotionContext.Provider value={{ controls, setControls }}>
      {children}
    </SceneMotionContext.Provider>
  )
}

export function useSceneMotionControls() {
  return useContext(SceneMotionContext) || { controls: null, setControls: () => {} }
}
