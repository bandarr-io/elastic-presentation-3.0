/**
 * Registration point (in the audience tab) for the active scene's beat
 * controls. `useSceneMotion` registers here on every beat change; the
 * audience-side presenter sync consults the bridge to execute beat commands
 * and to include beat state in broadcasts.
 *
 * In the presenter tab nothing consumes the bridge, so registrations made by
 * preview miniatures are inert.
 */
let activeControls = null
const listeners = new Set()

function notify() {
  listeners.forEach((listener) => listener())
}

export const presenterBridge = {
  /** controls: { beat, beatCount, beatLabels, isPlaying, goTo, replay, toggleAutoplay } */
  register(controls) {
    activeControls = controls
    notify()
  },
  unregister(controls) {
    if (activeControls === controls) {
      activeControls = null
      notify()
    }
  },
  get() {
    return activeControls
  },
  /** Notifies on every register/unregister; returns an unsubscribe function. */
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}
