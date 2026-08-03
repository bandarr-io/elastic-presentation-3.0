import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faForward, faBackward, faPlay, faPause,
  faRotateRight, faCircle, faUpRightFromSquare, faStopwatch,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { SceneMotionFollow } from '../context/SceneMotionFollowContext'
import { useSceneConfiguration } from '../components/SceneSettings'
import { SCENE_REGISTRY } from '../data/sceneRegistry'
import { createPresenterChannel } from './presenterChannel'
import ScenePreview from './ScenePreview'

/**
 * Preview instances get inert stand-ins for the interactive props AppContent
 * normally supplies. `stage` lets the current-scene preview mirror the
 * audience's lifted stage (broadcast as `beat` for those scenes).
 */
function buildPreviewProps(sceneId, { sceneMetadata, orderedScenes, customDurations, enabledScenes }, stage = 0) {
  const metadata = sceneMetadata?.[sceneId] || {}
  const noop = () => {}
  switch (sceneId) {
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
}

const LIFTED_STAGE_SCENES = new Set(['security', 'schema', 'esql', 'services', 'elastic-overview'])

function formatElapsed(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function PresenterView() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const {
    enabledScenes,
    orderedScenes,
    customDurations,
    sceneMetadata,
    updateSceneMetadata,
  } = useSceneConfiguration(SCENE_REGISTRY)

  // Latest state broadcast by the audience tab (null until one is received).
  const [deckState, setDeckState] = useState(null)
  const channelRef = useRef(null)

  useEffect(() => {
    // Re-request until the audience tab answers (it may not be open yet).
    let retry = null
    const stopRetry = () => {
      if (retry) {
        clearInterval(retry)
        retry = null
      }
    }
    const channel = createPresenterChannel((msg) => {
      if (msg?.type === 'state') {
        stopRetry()
        setDeckState(msg)
      }
    })
    channelRef.current = channel
    channel.post({ type: 'sync-request' })
    retry = setInterval(() => channel.post({ type: 'sync-request' }), 2000)
    return () => {
      stopRetry()
      channel.close()
      channelRef.current = null
    }
  }, [])

  const connected = deckState !== null

  // ── Scene resolution (local config, keyed by the broadcast scene id) ──────
  const sceneTitle = (scene) => sceneMetadata?.[scene.id]?.title || scene.title
  const fallbackScene = enabledScenes[0]
  const currentIndex = deckState
    ? Math.max(0, enabledScenes.findIndex((s) => s.id === deckState.sceneId))
    : 0
  const currentScene = enabledScenes[currentIndex] || fallbackScene
  const nextScene = enabledScenes[currentIndex + 1] || null

  const beat = deckState?.beat ?? 0
  const beatCount = deckState?.beatCount ?? 0
  const beatLabels = deckState?.beatLabels ?? []
  const hasBeats = beatCount > 1

  // ── Timer + clock ──────────────────────────────────────────────────────────
  const [now, setNow] = useState(() => new Date())
  const [timerRunning, setTimerRunning] = useState(false)
  const [elapsedMs, setElapsedMs] = useState(0)
  const timerStartedRef = useRef(false)
  const lastTickRef = useRef(null)

  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!timerRunning) return undefined
    lastTickRef.current = Date.now()
    const iv = setInterval(() => {
      const t = Date.now()
      setElapsedMs((ms) => ms + (t - lastTickRef.current))
      lastTickRef.current = t
    }, 1000)
    return () => clearInterval(iv)
  }, [timerRunning])

  const startTimerIfIdle = () => {
    if (!timerStartedRef.current) {
      timerStartedRef.current = true
      setTimerRunning(true)
    }
  }

  const resetTimer = () => {
    setTimerRunning(false)
    setElapsedMs(0)
    timerStartedRef.current = false
  }

  // ── Commands ───────────────────────────────────────────────────────────────
  const sendCommand = (action, extra = {}) => {
    channelRef.current?.post({ type: 'command', action, ...extra })
    if (action === 'next' || action === 'prev' || action === 'goToScene' || action === 'goToBeat') {
      startTimerIfIdle()
    }
  }

  const goToSceneId = (sceneId) => sendCommand('goToScene', { sceneId })

  useEffect(() => {
    const onKeyDown = (e) => {
      const el = e.target
      const tag = el?.tagName
      if (el?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        sendCommand('next')
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        sendCommand('prev')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Notes ──────────────────────────────────────────────────────────────────
  // Scene-level notes plus optional per-beat notes (beatNotes[beatIndex]).
  const sceneNotes = sceneMetadata?.[currentScene?.id]?.speakerNotes || ''
  const beatNotes = sceneMetadata?.[currentScene?.id]?.beatNotes || []
  const beatNote = beatNotes[beat] || ''

  // Which note the textarea shows: follows the beat by default (step note when
  // one exists), but a tab click pins the choice until the beat/scene changes.
  const [pinnedNotesTab, setPinnedNotesTab] = useState(null)
  useEffect(() => {
    setPinnedNotesTab(null)
  }, [currentScene?.id, beat])
  const notesTab = hasBeats ? (pinnedNotesTab ?? (beatNote ? 'step' : 'scene')) : 'scene'

  const setSceneNotes = (value) => {
    if (currentScene) updateSceneMetadata(currentScene.id, { speakerNotes: value })
  }
  const setBeatNote = (value) => {
    if (!currentScene) return
    const next = [...beatNotes]
    while (next.length <= beat) next.push('')
    next[beat] = value
    updateSceneMetadata(currentScene.id, { beatNotes: next })
  }

  // ── Next-step hint ─────────────────────────────────────────────────────────
  const nextStepHint = (() => {
    if (hasBeats && beat < beatCount - 1) {
      return `Step: ${beatLabels[beat + 1] || `Beat ${beat + 2}`}`
    }
    if (nextScene) return `Scene: ${sceneTitle(nextScene)}`
    return 'End of deck'
  })()

  const previewContext = { sceneMetadata, orderedScenes, customDurations, enabledScenes }
  const CurrentComponent = currentScene?.component
  const NextComponent = nextScene?.component
  const currentStage = LIFTED_STAGE_SCENES.has(currentScene?.id) ? beat : 0

  const panelClass = isDark
    ? 'bg-white/[0.04] border border-white/10'
    : 'bg-white border border-elastic-dev-blue/10 shadow-sm'
  const mutedText = isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'
  const strongText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const accentText = isDark ? 'text-elastic-teal' : 'text-elastic-blue'
  const controlBtn = `w-11 h-11 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:hover:scale-100 ${
    isDark
      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
  }`

  return (
    <div className="min-h-screen flex flex-col bg-elastic-light-grey dark:bg-elastic-dev-blue transition-colors duration-300">
      {/* ── Header: status, scene position, timer, clock ── */}
      <header className={`flex items-center justify-between px-6 py-3 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-bold uppercase tracking-eyebrow ${accentText}`}>Presenter</span>
          <span className="flex items-center gap-2 text-xs font-medium">
            <FontAwesomeIcon
              icon={faCircle}
              className={`text-[8px] ${connected ? 'text-green-400' : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}
            />
            <span className={mutedText}>{connected ? 'Connected to presentation' : 'Waiting for presentation tab…'}</span>
          </span>
          {!connected && (
            <button
              onClick={() => window.open(`${window.location.origin}${window.location.pathname}#/`, 'elastic-deck-stage')}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                isDark ? 'bg-elastic-teal/20 text-elastic-teal hover:bg-elastic-teal/30' : 'bg-elastic-blue/10 text-elastic-blue hover:bg-elastic-blue/20'
              }`}
            >
              <FontAwesomeIcon icon={faUpRightFromSquare} className="text-[10px]" />
              Open presentation
            </button>
          )}
        </div>

        <div className="flex items-center gap-6">
          {/* Elapsed timer */}
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faStopwatch} className={`text-sm ${mutedText}`} />
            <span className={`font-mono text-xl tabular-nums font-semibold ${strongText}`}>{formatElapsed(elapsedMs)}</span>
            <button
              onClick={() => { timerStartedRef.current = true; setTimerRunning((r) => !r) }}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/60'}`}
              title={timerRunning ? 'Pause timer' : 'Start timer'}
            >
              <FontAwesomeIcon icon={timerRunning ? faPause : faPlay} className="text-xs" />
            </button>
            <button
              onClick={resetTimer}
              className={`w-7 h-7 rounded-full flex items-center justify-center ${isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/60'}`}
              title="Reset timer"
            >
              <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
            </button>
          </div>
          {/* Wall clock */}
          <span className={`font-mono text-xl tabular-nums font-semibold ${accentText}`}>
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </header>

      {/* ── Main: previews + notes ── */}
      <main className="flex-1 min-h-0 grid grid-cols-3 gap-4 p-4">
        {/* Current scene */}
        <section className="col-span-2 flex flex-col gap-3 min-h-0">
          <div className="flex items-baseline justify-between">
            <h2 className={`text-lg font-bold ${strongText}`}>
              {currentScene ? sceneTitle(currentScene) : '—'}
              <span className={`ml-3 text-sm font-mono font-normal tabular-nums ${accentText}`}>
                {currentIndex + 1} / {enabledScenes.length}
              </span>
            </h2>
            {currentScene?.duration && (
              <span className={`text-xs font-medium ${mutedText}`}>Target: {customDurations?.[currentScene.id] || currentScene.duration}</span>
            )}
          </div>

          <div className={`rounded-2xl overflow-hidden ${panelClass}`}>
            {CurrentComponent && (
              <SceneMotionFollow beat={beat} playKey={0}>
                <div key={currentScene.id} className="h-full w-full">
                  <ScenePreview>
                    <div className="h-full w-full flex items-center justify-center bg-elastic-light-grey dark:bg-elastic-dev-blue">
                      <CurrentComponent {...buildPreviewProps(currentScene.id, previewContext, currentStage)} />
                    </div>
                  </ScenePreview>
                </div>
              </SceneMotionFollow>
            )}
          </div>

          {/* Beat pills */}
          {beatCount > 1 && (
            <div className="flex items-center flex-wrap gap-2">
              {Array.from({ length: beatCount }, (_, i) => {
                const isActive = i === beat
                return (
                  <button
                    key={i}
                    onClick={() => sendCommand('goToBeat', { beatIndex: i })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      isActive
                        ? isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue'
                        : isDark ? 'text-white/55 hover:text-white/80 bg-white/[0.04]' : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue/80 bg-white'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                      isActive
                        ? isDark ? 'border-elastic-teal' : 'border-elastic-blue'
                        : isDark ? 'border-white/20' : 'border-elastic-dev-blue/20'
                    }`}>
                      {i + 1}
                    </span>
                    {beatLabels[i] || `Step ${i + 1}`}
                  </button>
                )
              })}
              <button
                onClick={() => sendCommand('replay')}
                className={`ml-1 px-3 py-1.5 rounded-full text-xs font-semibold ${
                  isDark ? 'text-white/55 hover:text-white/80 bg-white/[0.04]' : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue/80 bg-white'
                }`}
                title="Replay current step's animation"
              >
                <FontAwesomeIcon icon={faRotateRight} className="mr-1.5 text-[10px]" />
                Replay
              </button>
            </div>
          )}
        </section>

        {/* Right column: next scene + notes */}
        <section className="flex flex-col gap-4 min-h-0">
          <div className="flex flex-col gap-2">
            <h3 className={`text-xs font-bold uppercase tracking-eyebrow ${mutedText}`}>
              Next scene{nextScene ? `: ${sceneTitle(nextScene)}` : ''}
            </h3>
            <div className={`rounded-xl overflow-hidden ${panelClass}`}>
              {NextComponent ? (
                <div key={nextScene.id}>
                  <ScenePreview>
                    <div className="h-full w-full flex items-center justify-center bg-elastic-light-grey dark:bg-elastic-dev-blue">
                      <NextComponent {...buildPreviewProps(nextScene.id, previewContext)} />
                    </div>
                  </ScenePreview>
                </div>
              ) : (
                <div className={`flex items-center justify-center text-sm font-medium ${mutedText}`} style={{ aspectRatio: '16 / 9' }}>
                  End of deck
                </div>
              )}
            </div>
          </div>

          {/* Speaker notes */}
          <div className={`flex-1 min-h-0 flex flex-col rounded-xl p-4 gap-2 ${panelClass}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className={`text-xs font-bold uppercase tracking-eyebrow ${mutedText}`}>Speaker notes</h3>
              {hasBeats && (
                <div className="flex items-center gap-1">
                  {[
                    { id: 'scene', label: 'Scene', hasContent: Boolean(sceneNotes) },
                    { id: 'step', label: beatLabels[beat] || `Step ${beat + 1}`, hasContent: Boolean(beatNote) },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setPinnedNotesTab(tab.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                        notesTab === tab.id
                          ? isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue'
                          : isDark ? 'text-white/45 hover:text-white/75' : 'text-elastic-dev-blue/45 hover:text-elastic-dev-blue/75'
                      }`}
                    >
                      {tab.label}
                      {tab.hasContent && (
                        <span className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`} />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <textarea
              key={notesTab === 'step' ? `step-${currentScene?.id}-${beat}` : `scene-${currentScene?.id}`}
              value={notesTab === 'step' ? beatNote : sceneNotes}
              onChange={(e) => (notesTab === 'step' ? setBeatNote(e.target.value) : setSceneNotes(e.target.value))}
              placeholder={
                notesTab === 'step'
                  ? `Notes for this step (${beatLabels[beat] || `step ${beat + 1}`}) — shown when the step is active.`
                  : 'Notes for this scene — visible only here. Edits are saved to the deck config.'
              }
              className={`flex-1 min-h-0 w-full resize-none bg-transparent outline-none text-lg leading-relaxed ${
                isDark ? 'text-white placeholder:text-white/25' : 'text-elastic-dark-ink placeholder:text-elastic-dev-blue/30'
              }`}
            />
          </div>
        </section>
      </main>

      {/* ── Footer: transport controls ── */}
      <footer className={`flex items-center justify-between px-6 py-3 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
        {/* Scene jump */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { const prev = enabledScenes[currentIndex - 1]; if (prev) goToSceneId(prev.id) }}
            disabled={currentIndex <= 0}
            className={controlBtn}
            title="Previous scene (skips steps)"
          >
            <FontAwesomeIcon icon={faBackward} className="text-sm" />
          </button>
          <button
            onClick={() => { if (nextScene) goToSceneId(nextScene.id) }}
            disabled={!nextScene}
            className={controlBtn}
            title="Next scene (skips steps)"
          >
            <FontAwesomeIcon icon={faForward} className="text-sm" />
          </button>
        </div>

        {/* Step-first prev / next */}
        <div className="flex items-center gap-3">
          <button onClick={() => sendCommand('prev')} className={controlBtn} title="Back (step-first) — ←">
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <button
            onClick={() => sendCommand('next')}
            className={`h-11 px-6 rounded-full flex items-center gap-3 font-semibold transition-all hover:scale-105 ${
              isDark ? 'bg-elastic-teal text-elastic-dev-blue hover:bg-elastic-teal/90' : 'bg-elastic-blue text-white hover:bg-elastic-blue/90'
            }`}
            title="Advance (step-first) — Space / →"
          >
            Next
            <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
          </button>
        </div>

        {/* Up-next hint */}
        <div className={`text-sm font-medium ${mutedText}`}>
          Up next — <span className={strongText}>{nextStepHint}</span>
        </div>
      </footer>
    </div>
  )
}

export default PresenterView
