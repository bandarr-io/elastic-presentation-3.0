import { useEffect, useMemo, useRef } from 'react'
import { faPause, faPlay } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../../context/ThemeContext'
import { useSceneMotion } from '../../hooks/useSceneMotion'
import { SceneMotionProvider, useSceneMotionControls } from '../../context/SceneMotionContext'
import { SceneMotionFollow, useSceneMotionFollow } from '../../context/SceneMotionFollowContext'
import { buildTourSteps, effectiveBeats, resolvePages } from './tourSteps'

const MONO = { fontFamily: 'Space Mono, ui-monospace, monospace' }
// Shared empty metadata so an embedded page with no copy gets a stable identity.
const NO_METADATA = {}

/**
 * A generic, configurable tour. The caller supplies a scene registry and the
 * default page list. `metadata` may override the eyebrow, the page list, the
 * hold times, and each page's own metadata.
 *
 * Pages are resolved first. With no pages to show, nothing renders, so the
 * runner below never mounts and its hooks never see zero steps.
 */
export default function SceneTour({ metadata = {}, sceneMetadata, registry, defaultPages, eyebrow = 'Tour' }) {
  const pages = useMemo(
    () => resolvePages({ pages: metadata.pages }, registry, defaultPages),
    [metadata.pages, registry, defaultPages],
  )

  if (pages.length === 0) return null

  return <TourRunner metadata={metadata} sceneMetadata={sceneMetadata} pages={pages} eyebrow={eyebrow} />
}

function TourRunner({ metadata, sceneMetadata, pages, eyebrow: defaultEyebrow }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const { setControls } = useSceneMotionControls()
  const following = useSceneMotionFollow() != null

  // A page's beats come from the metadata it renders with (deck copy, then the
  // tour's own override), as the scene itself resolves them. Using the registry
  // list alone would drift from what the scene shows once a copy edits its beats.
  const pageMetadata = metadata.pageMetadata
  const steps = useMemo(() => {
    const withBeats = pages.map((p) => {
      if (!p.beats) return p
      const layered = { ...(sceneMetadata?.[p.sceneId] || {}), ...(pageMetadata?.[p.sceneId] || {}) }
      return { ...p, beats: effectiveBeats(p.beats, layered) }
    })
    return buildTourSteps(withBeats, {
      minHold: metadata.minHold,
      maxHold: metadata.maxHold,
      pageHold: metadata.pageHold,
    })
  }, [pages, sceneMetadata, pageMetadata, metadata.minHold, metadata.maxHold, metadata.pageHold])

  const { beat, playKey, isPlaying, goTo, play, toggleAutoplay } = useSceneMotion(steps, {
    loop: true,
    // A dwell here is reading time for a whole page, not cover for an entrance
    // animation, so reduced motion must not collapse it to a strobe.
    shortenForReducedMotion: false,
  })

  // The tour is a self-running loop, so it starts itself rather than waiting for
  // the nav's play button. A presenter preview follows the audience tab's beat
  // and must never drive its own.
  const startedRef = useRef(false)
  useEffect(() => {
    if (following || startedRef.current) return
    startedRef.current = true
    play()
  }, [following, play])

  // Pause/resume for the nav bar. The deck only renders a toggle for scenes that
  // supply their own icon, and a self-running slide needs a visible stop.
  useEffect(() => {
    if (following) return undefined
    setControls({
      isPlaying,
      onTogglePlay: toggleAutoplay,
      toggleIcon: faPlay,
      toggleIconActive: faPause,
      toggleTitle: 'Resume the tour',
      toggleTitleActive: 'Pause the tour',
    })
    return () => setControls(null)
  }, [following, isPlaying, toggleAutoplay, setControls])

  const current = steps[beat] || steps[0]
  const page = pages[current.pageIndex]
  const PageComponent = page.component
  // Layering: the deck's saved copy for this slide comes first, and the tour's
  // own pageMetadata for it sits on top as an override. Memoised so a page sees
  // the same object across renders that change nothing relevant.
  const deckMeta = sceneMetadata?.[page.sceneId]
  const override = metadata.pageMetadata?.[page.sceneId]
  const pageMeta = useMemo(
    () => (deckMeta === undefined && override === undefined
      ? NO_METADATA
      : { ...(deckMeta || {}), ...(override || {}) }),
    [deckMeta, override],
  )

  // Remount the page each time the tour moves onto its first step from another
  // beat, so a loop wrap or a jump back replays the entrance and clears one-shot
  // reveals. Later steps keep the same key, so they step the live page. Keyed on
  // the beat, not playKey, so the autostart's playKey bump does not remount.
  const entryRef = useRef({ beat, count: 0 })
  if (entryRef.current.beat !== beat) {
    entryRef.current = {
      beat,
      count: entryRef.current.count + (current.stepIndex === 0 ? 1 : 0),
    }
  }

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const mutedText = isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'
  const eyebrow = metadata.eyebrow || defaultEyebrow

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Page rail: where we are in the loop, and a way to jump */}
      <div className="shrink-0 flex items-center justify-center gap-2 px-8 pt-2 flex-wrap">
        <span
          className={`text-[11px] font-bold uppercase tracking-eyebrow mr-1 ${mutedText}`}
          style={MONO}
        >
          {eyebrow}
        </span>
        {pages.map((p, i) => {
          const isActive = i === current.pageIndex
          const pageSteps = steps.filter((s) => s.pageIndex === i)
          return (
            <button
              key={p.id}
              onClick={() => goTo(steps.indexOf(pageSteps[0]))}
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? isDark
                    ? 'bg-elastic-teal/20 text-elastic-teal'
                    : 'bg-elastic-blue/15 text-elastic-blue'
                  : isDark
                    ? 'text-white/45 hover:text-white/75'
                    : 'text-elastic-dev-blue/45 hover:text-elastic-dev-blue/75'
              }`}
            >
              {p.title}
              {isActive && pageSteps.length > 1 && (
                <span className="flex items-center gap-1">
                  {pageSteps.map((s, stepIndex) => (
                    <i
                      key={s.key}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ background: accent, opacity: stepIndex === current.stepIndex ? 1 : 0.3 }}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* The page itself: a live scene, stepped by the tour.
          `key` remounts it on a page change so its entrance replays; its own
          SceneMotion provider keeps its stepper out of the deck's nav bar. */}
      <div className="flex-1 min-h-0">
        <SceneMotionProvider>
          <SceneMotionFollow beat={current.stepIndex} playKey={playKey}>
            <div key={`${page.id}:${entryRef.current.count}`} className="h-full w-full">
              <PageComponent
                metadata={pageMeta}
                {...(page.stepProps?.[current.stepIndex] || {})}
              />
            </div>
          </SceneMotionFollow>
        </SceneMotionProvider>
      </div>
    </div>
  )
}
