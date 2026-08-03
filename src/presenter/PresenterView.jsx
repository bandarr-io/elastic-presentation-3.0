import { useEffect, useRef, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft, faChevronRight, faForward, faBackward, faPlay, faPause,
  faRotateRight, faCircle, faUpRightFromSquare, faStopwatch, faBoltLightning,
  faMagnifyingGlass,
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
 * audience's lifted stage (broadcast as `beat` for those scenes), and `live`
 * overlays the audience's broadcast interactive state (signals, demo phase…)
 * so trigger-driven animations play in the preview too.
 */
function buildPreviewProps(sceneId, { sceneMetadata, orderedScenes, customDurations, enabledScenes }, stage = 0, live = null) {
  const metadata = sceneMetadata?.[sceneId] || {}
  const noop = () => {}
  const base = (() => {
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
  })()
  return live ? { ...base, ...live } : base
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
  const playKey = deckState?.playKey ?? 0
  const beatCount = deckState?.beatCount ?? 0
  const beatLabels = deckState?.beatLabels ?? []
  const hasBeats = beatCount > 1
  const hasNextStep = hasBeats && beat < beatCount - 1
  const hasPrevStep = hasBeats && beat > 0
  const canReplay = deckState?.canReplay ?? false
  const sceneActions = deckState?.actions ?? []

  // Broadcast `*Signal` values are cumulative counters. Rebase them to zero at
  // the moment this presenter first sees each scene, so mounting the preview
  // doesn't replay animations the audience triggered before we were watching.
  const signalBaseRef = useRef({ sceneId: null, base: {} })
  const livePreview = (() => {
    const raw = deckState?.preview
    if (!raw) return null
    if (signalBaseRef.current.sceneId !== deckState.sceneId) {
      const base = {}
      for (const [key, value] of Object.entries(raw)) {
        if (key.endsWith('Signal') && typeof value === 'number') base[key] = value
      }
      signalBaseRef.current = { sceneId: deckState.sceneId, base }
    }
    const rebased = { ...raw }
    for (const [key, offset] of Object.entries(signalBaseRef.current.base)) {
      if (typeof rebased[key] === 'number') rebased[key] = Math.max(0, rebased[key] - offset)
    }
    return rebased
  })()

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

  // ── Scene jump menu (mirrors the audience nav's selector) ─────────────────
  const [sceneMenuOpen, setSceneMenuOpen] = useState(false)
  const [sceneQuery, setSceneQuery] = useState('')
  const openSceneMenu = () => {
    setSceneQuery('')
    setSceneMenuOpen((open) => !open)
  }
  useEffect(() => {
    setSceneMenuOpen(false)
  }, [deckState?.sceneId])

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
  const sceneJumpBtn = `h-9 px-4 rounded-full flex items-center gap-2 text-xs font-semibold transition-all disabled:opacity-30 ${
    isDark
      ? 'bg-white/[0.06] hover:bg-white/[0.12] text-white/70'
      : 'bg-white hover:bg-elastic-blue/10 text-elastic-dev-blue/70 border border-elastic-dev-blue/10'
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
      <main className="flex-1 min-h-0 grid grid-cols-[minmax(0,5fr)_minmax(0,2fr)] gap-4 p-4">
        {/* Current scene */}
        <section className="flex flex-col gap-3 min-h-0">
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

          <div className={`flex-1 min-h-0 rounded-2xl overflow-hidden ${panelClass}`}>
            {CurrentComponent && (
              <SceneMotionFollow beat={beat} playKey={playKey}>
                <div key={currentScene.id} className="h-full w-full">
                  <ScenePreview
                    fill
                    interactive
                    onClickableClick={(info) => sendCommand('domClick', info)}
                  >
                    <div data-scene-root className="h-full w-full flex items-center justify-center bg-elastic-light-grey dark:bg-elastic-dev-blue">
                      <CurrentComponent {...buildPreviewProps(currentScene.id, previewContext, currentStage, livePreview)} />
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
              {canReplay && (
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
              )}
            </div>
          )}

          {/* In-scene triggers (animations, demos) available right now */}
          {sceneActions.length > 0 && (
            <div className="flex items-center flex-wrap gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-eyebrow ${mutedText}`}>Triggers</span>
              {sceneActions.map((action) => (
                <button
                  key={action.id}
                  onClick={() => sendCommand('sceneAction', { actionId: action.id })}
                  disabled={action.disabled}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 ${
                    isDark
                      ? 'border-elastic-teal/40 text-elastic-teal bg-elastic-teal/10 hover:bg-elastic-teal/20'
                      : 'border-elastic-blue/30 text-elastic-blue bg-elastic-blue/5 hover:bg-elastic-blue/15'
                  }`}
                >
                  <FontAwesomeIcon icon={faBoltLightning} className="text-[10px]" />
                  {action.label}
                </button>
              ))}
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
        {/* Scene jump (always skips remaining steps) */}
        <div className="flex items-center gap-2">
          <span className={`text-[11px] font-bold uppercase tracking-eyebrow mr-1 ${mutedText}`}>Scene</span>
          <button
            onClick={() => { const prev = enabledScenes[currentIndex - 1]; if (prev) goToSceneId(prev.id) }}
            disabled={currentIndex <= 0}
            className={sceneJumpBtn}
            title="Jump to previous scene (skips steps)"
          >
            <FontAwesomeIcon icon={faBackward} className="text-xs" />
            Prev scene
          </button>

          {/* Current scene readout + jump-to menu */}
          <div className="relative">
            <button
              onClick={openSceneMenu}
              className={`group flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-full border shadow-sm transition-all ${
                isDark
                  ? 'bg-white/[0.08] border-white/20 hover:border-elastic-teal/50'
                  : 'bg-white border-elastic-dev-blue/20 hover:border-elastic-blue/40 hover:shadow'
              }`}
              title="Jump to scene"
            >
              <span className={`text-sm font-semibold leading-none max-w-56 truncate ${strongText}`}>
                {currentScene ? sceneTitle(currentScene) : '—'}
              </span>
              <span className={`text-xs font-mono leading-none tabular-nums ${accentText}`}>
                {currentIndex + 1} / {enabledScenes.length}
              </span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className={`text-[10px] transition-transform duration-200 ${sceneMenuOpen ? '-rotate-90' : 'rotate-0'} ${
                  isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'
                }`}
              />
            </button>

            {sceneMenuOpen && (
              <>
                {/* Click-away backdrop */}
                <button
                  className="fixed inset-0 z-40 cursor-default"
                  aria-hidden="true"
                  tabIndex={-1}
                  onClick={() => setSceneMenuOpen(false)}
                />
                <div
                  className={`absolute bottom-full left-0 mb-3 z-50 w-72 rounded-2xl border shadow-2xl overflow-hidden ${
                    isDark ? 'bg-elastic-dev-blue border-white/10' : 'bg-white border-elastic-dev-blue/10'
                  }`}
                >
                  {/* Search */}
                  <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                    <FontAwesomeIcon icon={faMagnifyingGlass} className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
                    <input
                      autoFocus
                      value={sceneQuery}
                      onChange={(e) => setSceneQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Escape') setSceneMenuOpen(false) }}
                      placeholder="Jump to scene…"
                      className={`flex-1 bg-transparent text-sm outline-none ${
                        isDark ? 'text-white placeholder:text-white/30' : 'text-elastic-dark-ink placeholder:text-elastic-dev-blue/30'
                      }`}
                    />
                  </div>

                  {/* Scene list */}
                  <div className="max-h-72 overflow-y-auto py-1">
                    {enabledScenes
                      .map((scene, index) => ({ scene, index, title: sceneTitle(scene) }))
                      .filter(({ title }) => title.toLowerCase().includes(sceneQuery.trim().toLowerCase()))
                      .map(({ scene, index, title }) => {
                        const isActive = index === currentIndex
                        return (
                          <button
                            key={scene.id}
                            onClick={() => { goToSceneId(scene.id); setSceneMenuOpen(false) }}
                            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                              isActive
                                ? isDark ? 'bg-elastic-teal/15' : 'bg-elastic-blue/10'
                                : isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-elastic-dev-blue/[0.05]'
                            }`}
                          >
                            <span className={`w-6 text-right text-xs font-mono tabular-nums shrink-0 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                              {index + 1}
                            </span>
                            <span className={`flex-1 min-w-0 truncate text-sm ${
                              isActive
                                ? `font-semibold ${accentText}`
                                : isDark ? 'text-white/80' : 'text-elastic-dark-ink/80'
                            }`}>
                              {title}
                            </span>
                          </button>
                        )
                      })}
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            onClick={() => { if (nextScene) goToSceneId(nextScene.id) }}
            disabled={!nextScene}
            className={sceneJumpBtn}
            title="Jump to next scene (skips steps)"
          >
            Next scene
            <FontAwesomeIcon icon={faForward} className="text-xs" />
          </button>
        </div>

        {/* Step prev / next — only for scenes that have steps. Space / → still
            advance step-first (then scene) even when this group is hidden. */}
        {hasBeats && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => sendCommand('prev')}
              disabled={!hasPrevStep}
              className={controlBtn}
              title="Previous step — ←"
            >
              <FontAwesomeIcon icon={faChevronLeft} />
            </button>
            <button
              onClick={() => sendCommand('next')}
              disabled={!hasNextStep}
              className={`h-11 px-6 rounded-full flex items-center gap-3 font-semibold transition-all hover:scale-105 disabled:opacity-30 disabled:hover:scale-100 ${
                isDark ? 'bg-elastic-teal text-elastic-dev-blue hover:bg-elastic-teal/90' : 'bg-elastic-blue text-white hover:bg-elastic-blue/90'
              }`}
              title="Next step — Space / →"
            >
              Next step
              <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
            </button>
          </div>
        )}

        {/* Up-next hint */}
        <div className={`text-sm font-medium ${mutedText}`}>
          Up next — <span className={strongText}>{nextStepHint}</span>
        </div>
      </footer>
    </div>
  )
}

export default PresenterView
