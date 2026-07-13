import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useSceneMotionControls } from '../context/SceneMotionContext'

/**
 * Bottom stepper for the deck's narrative scenes: the numbered beat buttons.
 *
 * Auto-play (play/pause) and manual replay controls are published to the
 * SceneMotion context and rendered in the global nav bar alongside the other
 * per-scene controls (see App nav bar), so they no longer float at the edges
 * of the scene body.
 *
 * Props:
 * - beats: [{ key, step }]  (omit or length<=1 to render no pills)
 * - beat: active index
 * - onGo: (index) => void
 * - onReplay: () => void            manual replay of the current beat
 * - isPlaying: boolean              auto-play state (optional)
 * - onTogglePlay: () => void        toggle auto-play (optional)
 * - hidePills: boolean              force-hide the beat buttons (single-view scenes)
 */
function SceneStepper({ beats = [], beat = 0, onGo, onReplay, isPlaying = false, onTogglePlay, hidePills = false, action = null }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { setControls } = useSceneMotionControls()

  const showPills = !hidePills && beats.length > 1

  // Latest handlers, read lazily by the stable wrappers we publish. Publishing
  // the raw handlers would tie the effect to their identity — and scenes often
  // pass inline functions. Re-publishing calls setControls, which re-renders the
  // app (a context consumer that also renders the scene), which recreates the
  // inline handler, which re-publishes: an infinite loop that freezes the deck.
  // Wrappers backed by a ref keep the published identity stable, so we only
  // re-publish when something the nav actually renders changes.
  const handlersRef = useRef(null)
  handlersRef.current = { onReplay, onTogglePlay, action }

  const hasReplay = Boolean(onReplay)
  const hasToggle = Boolean(onTogglePlay)
  const actionSig = action
    ? `${action.title || ''}|${action.disabled ? 1 : 0}|${action.icon?.iconName || ''}`
    : ''

  // Publish auto-play / replay controls (and any per-beat action button) to the
  // nav bar for the active scene.
  useEffect(() => {
    if (!hasReplay && !hasToggle && !actionSig) return undefined
    const latest = () => handlersRef.current
    setControls({
      isPlaying,
      onReplay: hasReplay ? () => latest().onReplay?.() : undefined,
      onTogglePlay: hasToggle ? () => latest().onTogglePlay?.() : undefined,
      action: actionSig
        ? { ...latest().action, onClick: () => latest().action?.onClick?.() }
        : undefined,
    })
    return () => setControls(null)
  }, [hasReplay, hasToggle, actionSig, isPlaying, setControls])

  if (!showPills) return null

  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-3">
      {showPills &&
        beats.map((b, i) => {
          const isActive = i === beat
          return (
            <button
              key={b.key || i}
              onClick={() => onGo?.(i)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? isDark
                    ? 'bg-elastic-teal/20 text-elastic-teal'
                    : 'bg-elastic-blue/15 text-elastic-blue'
                  : isDark
                    ? 'text-white/55 hover:text-white/80'
                    : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue/80'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  isActive
                    ? isDark
                      ? 'border-elastic-teal'
                      : 'border-elastic-blue'
                    : isDark
                      ? 'border-white/20'
                      : 'border-elastic-dev-blue/20'
                }`}
              >
                {i + 1}
              </span>
              {b.step}
            </button>
          )
        })}
    </div>
  )
}

export default SceneStepper
