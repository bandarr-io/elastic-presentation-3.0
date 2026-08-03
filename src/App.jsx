import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { TeamProvider } from './context/TeamContext'
import { SceneMotionProvider, useSceneMotionControls } from './context/SceneMotionContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon, faMagnifyingGlass, faGear, faShield, faForwardStep, faPlay, faPause, faRotateRight, faChevronRight, faChevronLeft, faBolt, faLayerGroup, faTimes, faCircleNodes, faChalkboardUser } from '@fortawesome/free-solid-svg-icons'
import SceneSettings, { useSceneConfiguration } from './components/SceneSettings'
import HeroScene from './scenes/HeroScene'
import { SCENE_REGISTRY } from './data/sceneRegistry'
import { usePresenterSync } from './presenter/usePresenterSync'
import PresenterView from './presenter/PresenterView'

function AppContent() {
  const { theme, toggleTheme } = useTheme()
  const { controls: motionControls } = useSceneMotionControls()
  

  const {
    enabledScenes,
    enabledSceneIds,
    orderedScenes,
    customDurations,
    sceneMetadata,
    activePreset,
    presets,
    applyPreset,
    toggleScene,
    updateDuration,
    updateSceneMetadata,
    updateOrder,
    resetToDefault
  } = useSceneConfiguration(SCENE_REGISTRY)

  const navigate = useNavigate()
  const location = useLocation()

  const scenes = enabledScenes

  const sceneIdFromUrl = location.pathname.slice(1)
  const currentScene = (() => {
    const idx = scenes.findIndex(s => s.id === sceneIdFromUrl)
    return idx >= 0 ? idx : 0
  })()

  // Redirect to first enabled scene if URL is missing or unrecognised
  useEffect(() => {
    const idx = scenes.findIndex(s => s.id === sceneIdFromUrl)
    if (idx === -1 && scenes.length > 0) {
      navigate(`/${scenes[0].id}`, { replace: true })
    }
  }, [sceneIdFromUrl, scenes, navigate])

  const navigateToScene = (index) => {
    const clamped = Math.max(0, Math.min(index, scenes.length - 1))
    navigate(`/${scenes[clamped].id}`)
  }

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sceneMenuOpen, setSceneMenuOpen] = useState(false)
  const [sceneQuery, setSceneQuery] = useState('')
  const [securityStage, setSecurityStage] = useState(0)
  const [securityPlaySignal, setSecurityPlaySignal] = useState(0)
  const [securityAlertPhase, setSecurityAlertPhase] = useState('idle')
  const [securityPhaseSignal, setSecurityPhaseSignal] = useState(0)
  const [schemaPlaySignal, setSchemaPlaySignal] = useState(0)
  const [schemaStage, setSchemaStage] = useState(0)
  const SECURITY_STAGE_COUNT = 3
  const SCHEMA_STAGE_COUNT = 2
  const ESQL_STAGE_COUNT = 6
  const SERVICES_STAGE_COUNT = 4
  const [esqlStage, setEsqlStage] = useState(0)
  const ELASTIC_OVERVIEW_STAGE_COUNT = 4
  const [elasticOverviewStage, setElasticOverviewStage] = useState(0)
  const [servicesStage, setServicesStage] = useState(0)
  const [demoPhase, setDemoPhase] = useState('idle')

  const handleDemoAdvance = () => {
    const next = { idle: 'deployed', deployed: 'preparing', preparing: 'stopping', stopping: 'validating', validating: 'usecases', usecases: 'complete' }
    setDemoPhase(p => next[p] ?? p)
  }
  const handleDemoBack = () => {
    const prev = { deployed: 'idle', preparing: 'deployed', stopping: 'preparing', validating: 'stopping', usecases: 'validating', complete: 'usecases' }
    setDemoPhase(p => prev[p] ?? p)
  }
  const [businessValueSelectedCard, setBusinessValueSelectedCard] = useState(null)
  const [businessValueShowUnified, setBusinessValueShowUnified] = useState(false)
  const [dataExplosionVerdictSignal, setDataExplosionVerdictSignal] = useState(0)
  const [dataMeshRunQuerySignal, setDataMeshRunQuerySignal] = useState(0)
  const [dataMeshQueryState, setDataMeshQueryState] = useState({ canRun: false, isRunning: false })
  const [dataMeshPlaySignal, setDataMeshPlaySignal] = useState(0)
  const [dataMeshPlayState, setDataMeshPlayState] = useState({ canPlay: false })
  const [dataMeshSummarySignal, setDataMeshSummarySignal] = useState(0)
  const [dataMeshSummaryState, setDataMeshSummaryState] = useState({ canToggle: false, isShowing: false })
  const [dataMeshActivateMeshSignal, setDataMeshActivateMeshSignal] = useState(0)
  const [dataMeshActivateMeshState, setDataMeshActivateMeshState] = useState({ canActivate: false })
  const [dataTieringIsRunning, setDataTieringIsRunning] = useState(false)
  const [dataTieringResetSignal, setDataTieringResetSignal] = useState(0)
  const [agendaExpanded, setAgendaExpanded] = useState({})
  const [agendaExpandAllSignal, setAgendaExpandAllSignal] = useState(0)
  const agendaAnyExpanded = Object.values(agendaExpanded).some(Boolean)
  
  // Pass props to scenes
  const Scene = scenes[currentScene]?.component || HeroScene
  const currentSceneId = scenes[currentScene]?.id
  
  let sceneProps = {}
  if (currentSceneId === 'agenda') {
    sceneProps = {
      scenes: orderedScenes,
      sceneMetadata,
      customDurations,
      metadata: sceneMetadata?.agenda || {},
      expanded: agendaExpanded,
      setExpanded: setAgendaExpanded,
      expandAllSignal: agendaExpandAllSignal,
    }
  } else if (currentSceneId === 'hero') {
    sceneProps = { metadata: sceneMetadata?.hero || {} }
  } else if (currentSceneId === 'about') {
    sceneProps = { metadata: sceneMetadata?.about || {} }
  } else if (currentSceneId === 'business-value') {
    sceneProps = {
      selectedCard: businessValueSelectedCard,
      setSelectedCard: setBusinessValueSelectedCard,
      showUnifiedMessage: businessValueShowUnified,
      setShowUnifiedMessage: setBusinessValueShowUnified,
      metadata: sceneMetadata?.['business-value'] || {}
    }
  } else if (currentSceneId === 'problem-patterns') {
    sceneProps = { metadata: sceneMetadata?.['problem-patterns'] || {} }
  } else if (currentSceneId === 'logsdb') {
    sceneProps = { metadata: sceneMetadata?.logsdb || {} }
  } else if (currentSceneId === 'ai-assistant') {
    sceneProps = { metadata: sceneMetadata?.['ai-assistant'] || {} }
  } else if (currentSceneId === 'customer-architect') {
    sceneProps = { metadata: sceneMetadata?.['customer-architect'] || {} }
  } else if (currentSceneId === 'elastic-exploded') {
    sceneProps = { metadata: sceneMetadata?.['elastic-exploded'] || {} }
  } else if (currentSceneId === 'unified-strategy') {
    sceneProps = { metadata: sceneMetadata?.['unified-strategy'] || {} }
  } else if (currentSceneId === 'data-explosion') {
    sceneProps = {
      metadata: sceneMetadata?.['data-explosion'] || {},
      verdictSignal: dataExplosionVerdictSignal,
    }
  } else if (currentSceneId === 'data-mesh') {
    sceneProps = {
      scenes: enabledScenes,
      onNavigate: (i) => navigateToScene(i),
      metadata: sceneMetadata?.['data-mesh'] || {},
      runQuerySignal: dataMeshRunQuerySignal,
      onQueryStateChange: setDataMeshQueryState,
      playSignal: dataMeshPlaySignal,
      onPlayStateChange: setDataMeshPlayState,
      summarySignal: dataMeshSummarySignal,
      onSummaryStateChange: setDataMeshSummaryState,
      activateMeshSignal: dataMeshActivateMeshSignal,
      onActivateMeshStateChange: setDataMeshActivateMeshState,
    }
  } else if (currentSceneId === 'cross-cluster') {
    sceneProps = { metadata: sceneMetadata?.['cross-cluster'] || {} }
  } else if (currentSceneId === 'security-narrative-visual') {
    sceneProps = { metadata: sceneMetadata?.['security-narrative-visual'] || {} }
  } else if (currentSceneId === 'security-soc-model') {
    sceneProps = { metadata: sceneMetadata?.['security-soc-model'] || {} }
  } else if (currentSceneId === 'security-capabilities') {
    sceneProps = { metadata: sceneMetadata?.['security-capabilities'] || {} }
  } else if (currentSceneId === 'security') {
    sceneProps = {
      externalStage: securityStage,
      onStageChange: setSecurityStage,
      playSignal: securityPlaySignal,
      phaseAdvanceSignal: securityPhaseSignal,
      onAlertPhaseChange: setSecurityAlertPhase,
      metadata: sceneMetadata?.security || {},
    }
  } else if (currentSceneId === 'licensing') {
    sceneProps = { metadata: sceneMetadata?.licensing || {} }
  } else if (currentSceneId === 'pricing-rom') {
    sceneProps = { metadata: sceneMetadata?.['pricing-rom'] || {} }
  } else if (currentSceneId === 'elastic-value') {
    sceneProps = { metadata: sceneMetadata?.['elastic-value'] || {} }
  } else if (currentSceneId === 'platform-operations') {
    sceneProps = { metadata: sceneMetadata?.['platform-operations'] || {} }
  } else if (currentSceneId === 'platform-value') {
    sceneProps = { metadata: sceneMetadata?.['platform-value'] || {} }
  } else if (currentSceneId === 'value-by-team') {
    sceneProps = { metadata: sceneMetadata?.['value-by-team'] || {} }
  } else if (currentSceneId === 'security-use-cases') {
    sceneProps = { metadata: sceneMetadata?.['security-use-cases'] || {} }
  } else if (currentSceneId === 'schema') {
    sceneProps = {
      externalStage: schemaStage,
      onStageChange: setSchemaStage,
      playSignal: schemaPlaySignal,
      metadata: sceneMetadata?.schema || {},
    }
  } else if (currentSceneId === 'access-control') {
    sceneProps = {
      metadata: sceneMetadata?.['access-control'] || {},
    }
  } else if (currentSceneId === 'data-tiering') {
    sceneProps = {
      isRunning: dataTieringIsRunning,
      setIsRunning: setDataTieringIsRunning,
      resetSignal: dataTieringResetSignal,
      metadata: sceneMetadata?.['data-tiering'] || {},
    }
  } else if (currentSceneId === 'consolidation') {
    sceneProps = {
      tools: sceneMetadata?.consolidation?.tools,
      metadata: sceneMetadata?.consolidation || {},
    }
  } else if (currentSceneId === 'esql') {
    sceneProps = {
      metadata: sceneMetadata?.esql || {},
      externalStage: esqlStage,
      onStageChange: setEsqlStage,
    }
  } else if (currentSceneId === 'services') {
    sceneProps = {
      externalStage: servicesStage,
      onStageChange: (s) => { setServicesStage(s); if (s !== 2) setDemoPhase('idle') },
      demoPhase,
      metadata: sceneMetadata?.services || {},
    }
  } else if (currentSceneId === 'next-steps') {
    sceneProps = {
      metadata: sceneMetadata?.['next-steps'] || {},
    }
  } else if (currentSceneId === 'panel') {
    sceneProps = {
      metadata: sceneMetadata?.panel || {},
    }
  } else if (currentSceneId === 'obs-ai-scale') {
    sceneProps = { metadata: sceneMetadata?.['obs-ai-scale'] || {} }
  } else if (currentSceneId === 'obs-heritage') {
    sceneProps = { metadata: sceneMetadata?.['obs-heritage'] || {} }
  } else if (currentSceneId === 'obs-three-layers') {
    sceneProps = { metadata: sceneMetadata?.['obs-three-layers'] || {} }
  } else if (currentSceneId === 'obs-pillars') {
    sceneProps = { metadata: sceneMetadata?.['obs-pillars'] || {} }
  } else if (currentSceneId === 'obs-signals') {
    sceneProps = { metadata: sceneMetadata?.['obs-signals'] || {} }
  } else if (currentSceneId === 'nightshift-sre') {
    sceneProps = { metadata: sceneMetadata?.['nightshift-sre'] || {} }
  } else if (currentSceneId === 'obs-streams') {
    sceneProps = { metadata: sceneMetadata?.['obs-streams'] || {} }
  } else if (currentSceneId === 'obs-otel') {
    sceneProps = { metadata: sceneMetadata?.['obs-otel'] || {} }
  } else if (currentSceneId === 'obs-kubernetes') {
    sceneProps = { metadata: sceneMetadata?.['obs-kubernetes'] || {} }
  } else if (currentSceneId === 'obs-mcp-app') {
    sceneProps = { metadata: sceneMetadata?.['obs-mcp-app'] || {} }
  } else if (currentSceneId === 'obs-agentic') {
    sceneProps = { metadata: sceneMetadata?.['obs-agentic'] || {} }
  } else if (currentSceneId === 'obs-discovery') {
    sceneProps = { metadata: sceneMetadata?.['obs-discovery'] || {} }
  } else if (currentSceneId === 'obs-surfaces') {
    sceneProps = { metadata: sceneMetadata?.['obs-surfaces'] || {} }
  } else if (currentSceneId === 'nightshift-arch') {
    sceneProps = { metadata: sceneMetadata?.['nightshift-arch'] || {} }
  } else if (currentSceneId === 'core-components') {
    sceneProps = { metadata: sceneMetadata?.['core-components'] || {} }
  } else if (currentSceneId === 'node-types') {
    sceneProps = { metadata: sceneMetadata?.['node-types'] || {} }
  } else if (currentSceneId === 'elastic-overview') {
    sceneProps = {
      metadata: sceneMetadata?.['elastic-overview'] || {},
      externalStage: elasticOverviewStage,
      onStageChange: setElasticOverviewStage,
    }
  } else if (currentSceneId === 'enterprise-deployment') {
    sceneProps = { metadata: sceneMetadata?.['enterprise-deployment'] || {} }
  }

  const handleNext = () => {
    setSecurityStage(0)
    setSchemaStage(0)
    setEsqlStage(0)
    setServicesStage(0)
    setElasticOverviewStage(0)
    navigateToScene(currentScene + 1)
  }

  const handlePrev = () => {
    setSecurityStage(0)
    setSchemaStage(0)
    setElasticOverviewStage(0)
    navigateToScene(currentScene - 1)
  }

  const sceneTitle = (scene) => sceneMetadata?.[scene.id]?.title || scene.title

  // Step controls for scenes whose stage state is lifted into App (instead of
  // useSceneMotion), so the presenter view can drive them too.
  const liftedStageControls = (() => {
    switch (currentSceneId) {
      case 'security':
        return { stage: securityStage, count: SECURITY_STAGE_COUNT, setStage: setSecurityStage }
      case 'schema':
        return { stage: schemaStage, count: SCHEMA_STAGE_COUNT, setStage: setSchemaStage }
      case 'esql':
        return { stage: esqlStage, count: ESQL_STAGE_COUNT, setStage: setEsqlStage }
      case 'elastic-overview':
        return { stage: elasticOverviewStage, count: ELASTIC_OVERVIEW_STAGE_COUNT, setStage: setElasticOverviewStage }
      case 'services':
        return { stage: servicesStage, count: SERVICES_STAGE_COUNT, setStage: (s) => { setServicesStage(s); if (s !== 2) setDemoPhase('idle') } }
      default:
        return null
    }
  })()

  usePresenterSync({
    sceneId: currentSceneId,
    sceneIndex: currentScene,
    sceneCount: scenes.length,
    onNextScene: handleNext,
    onPrevScene: handlePrev,
    onGoToScene: (sceneId) => {
      const idx = scenes.findIndex(s => s.id === sceneId)
      if (idx >= 0) navigateToScene(idx)
    },
    stageControls: liftedStageControls,
  })

  const openPresenterView = () => {
    window.open(`${window.location.origin}${window.location.pathname}#/presenter`, 'elastic-deck-presenter')
  }

  // Global keyboard navigation for live presenting (ignored while typing or in Settings).
  useEffect(() => {
    const onKeyDown = (e) => {
      if (settingsOpen) return
      const el = e.target
      const tag = el?.tagName
      if (el?.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        if (currentScene < scenes.length - 1) { e.preventDefault(); handleNext() }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (currentScene > 0) { e.preventDefault(); handlePrev() }
      } else if (e.key === 'Escape') {
        setSceneMenuOpen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScene, scenes.length, settingsOpen])

  // Close the jump menu whenever the active scene changes.
  useEffect(() => {
    setSceneMenuOpen(false)
    setSceneQuery('')
  }, [currentSceneId])

  // Reset scene-specific state when navigating away
  useEffect(() => {
    if (currentSceneId !== 'business-value') {
      setBusinessValueSelectedCard(null)
      setBusinessValueShowUnified(false)
    }
    if (currentSceneId !== 'data-explosion') {
      setDataExplosionVerdictSignal(0)
    }
    if (currentSceneId !== 'security') {
      setSecurityStage(0)
      setSecurityPlaySignal(0)
      setSecurityAlertPhase('idle')
      setSecurityPhaseSignal(0)
    }
    if (currentSceneId !== 'schema') {
      setSchemaPlaySignal(0)
      setSchemaStage(0)
    }
    if (currentSceneId !== 'elastic-overview') {
      setElasticOverviewStage(0)
    }
  }, [currentSceneId])

  return (
    <div className="min-h-screen bg-elastic-light-grey dark:bg-elastic-dev-blue transition-colors duration-300">
      {/* Scene Settings */}
      <SceneSettings
        scenes={orderedScenes}
        enabledSceneIds={enabledSceneIds}
        customDurations={customDurations}
        sceneMetadata={sceneMetadata}
        onToggle={toggleScene}
        onUpdateDuration={updateDuration}
        onUpdateSceneMetadata={updateSceneMetadata}
        onUpdateOrder={updateOrder}
        onReset={resetToDefault}
        presets={presets}
        activePreset={activePreset}
        onApplyPreset={applyPreset}
        isOpen={settingsOpen}
        onOpenChange={setSettingsOpen}
      />

      {/* Scene Container */}
      <div className="h-[calc(100vh-76px)] flex items-center justify-center">
        <Scene {...sceneProps} />
      </div>
      
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 w-full py-4 border-t backdrop-blur-md bg-elastic-light-grey/85 dark:bg-elastic-dev-blue/85 border-elastic-dev-blue/10 dark:border-white/10 shadow-[0_-4px_20px_rgba(11,22,40,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
        {/* Tiny credit line, centered and out of the way of the controls */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden lg:block text-[5px] tracking-wide whitespace-nowrap text-elastic-dev-blue/40 dark:text-white/40">
          Built and managed by Daniel Barr | <a href="https://elastic.co" target="_blank" rel="noreferrer" className="pointer-events-auto hover:underline">elastic.co</a> | 2026
        </div>
        <div className="flex items-center justify-between max-w-[95%] mx-auto">
          {/* Left: Theme Toggle and Settings */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
              }`}
              aria-label="Toggle theme"
            >
              <FontAwesomeIcon 
                icon={theme === 'dark' ? faSun : faMoon} 
                className="text-lg"
              />
            </button>
            
            <button
              onClick={() => setSettingsOpen(true)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
              }`}
              title="Settings"
            >
              <FontAwesomeIcon icon={faGear} className="text-lg" />
            </button>

            <button
              onClick={openPresenterView}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                theme === 'dark' 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
              }`}
              title="Open presenter view"
            >
              <FontAwesomeIcon icon={faChalkboardUser} className="text-base" />
            </button>

            {/* Custom content toggle - only scenes that repurpose the toggle with a
                bespoke icon (e.g. reveal/hide). Generic auto-play is not shown. */}
            {motionControls?.onTogglePlay && motionControls?.toggleIcon && (
              <button
                onClick={motionControls.onTogglePlay}
                aria-pressed={motionControls.isPlaying}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  motionControls.isPlaying
                    ? theme === 'dark'
                      ? 'bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/20 text-elastic-blue'
                    : theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={motionControls.isPlaying
                  ? (motionControls.toggleTitleActive || 'Pause auto-play')
                  : (motionControls.toggleTitle || 'Auto-play')}
              >
                <FontAwesomeIcon
                  icon={motionControls.isPlaying
                    ? (motionControls.toggleIconActive || faPause)
                    : (motionControls.toggleIcon || faPlay)}
                  className={`text-sm ${motionControls.isPlaying || motionControls.toggleIcon ? '' : 'ml-0.5'}`}
                />
              </button>
            )}

            {/* Per-beat action button - narrative scenes that publish one (e.g. trigger an in-scene event) */}
            {motionControls?.action && (
              <button
                onClick={motionControls.action.onClick}
                disabled={motionControls.action.disabled}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-40 disabled:hover:scale-100 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={motionControls.action.title}
              >
                <FontAwesomeIcon icon={motionControls.action.icon} className="text-sm" />
              </button>
            )}

            {/* Expand/collapse all agenda blocks - only visible on Agenda scene */}
            {currentSceneId === 'agenda' && (
              <button
                onClick={() => {
                  if (agendaAnyExpanded) setAgendaExpanded({})
                  else setAgendaExpandAllSignal(n => n + 1)
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={agendaAnyExpanded ? 'Collapse all scenes' : 'Expand all scenes'}
              >
                <FontAwesomeIcon icon={faLayerGroup} className="text-base" />
              </button>
            )}

            {/* Air-gapped toggle - only visible on Enterprise Deployment scene */}
            {currentSceneId === 'enterprise-deployment' && (() => {
              const airGapped = !!sceneMetadata?.['enterprise-deployment']?.airGapped
              return (
                <button
                  onClick={() => updateSceneMetadata('enterprise-deployment', { airGapped: !airGapped })}
                  className={`h-10 px-4 rounded-full flex items-center gap-2 text-sm font-semibold transition-all hover:scale-105 ${
                    airGapped
                      ? theme === 'dark'
                        ? 'bg-elastic-teal/25 text-elastic-teal border border-elastic-teal/40'
                        : 'bg-elastic-blue/15 text-elastic-blue border border-elastic-blue/30'
                      : theme === 'dark'
                        ? 'bg-white/10 text-white/60 border border-white/15 hover:text-white/80'
                        : 'bg-white text-elastic-dev-blue/60 border border-elastic-dev-blue/15 hover:text-elastic-dev-blue'
                  }`}
                  title="Toggle air-gapped support services"
                  aria-pressed={airGapped}
                >
                  <FontAwesomeIcon icon={faShield} className="text-sm" />
                  Air-gapped {airGapped ? 'On' : 'Off'}
                </button>
              )
            })()}

            {/* Data-path legend - only visible on Enterprise Deployment scene */}
            {currentSceneId === 'enterprise-deployment' && (() => {
              const c = theme === 'dark'
                ? { collect: '#4C8DFF', process: '#FEC514', store: '#48EFCF', serve: '#F04E98', ops: '#8A9BB4' }
                : { collect: '#0B64DD', process: '#B7791F', store: '#0E8C7F', serve: '#F04E98', ops: '#64748B' }
              const items = [
                ['Collect', c.collect, false],
                ['Transform', c.process, false],
                ['Index & store', c.store, false],
                ['Serve & act', c.serve, false],
                ['Operations', c.ops, true],
              ]
              return (
                <div
                  className={`h-10 px-4 rounded-full flex items-center gap-3.5 text-xs font-medium ${
                    theme === 'dark'
                      ? 'bg-white/10 text-white/70 border border-white/15'
                      : 'bg-white text-elastic-dev-blue/70 border border-elastic-dev-blue/10'
                  }`}
                >
                  {items.map(([label, col, dashed]) => (
                    <span key={label} className="flex items-center gap-1.5 whitespace-nowrap">
                      <i
                        className="inline-block w-4 h-[3px] rounded-sm"
                        style={dashed
                          ? { backgroundImage: `repeating-linear-gradient(90deg, ${col} 0 4px, transparent 4px 8px)` }
                          : { background: col }}
                      />
                      {label}
                    </span>
                  ))}
                </div>
              )
            })()}

            {/* Reveal button - only visible on Data Explosion scene */}
            {currentSceneId === 'data-explosion' && (
              <button
                onClick={() => setDataExplosionVerdictSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Reveal verdict"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Play Button - only visible on Security scene, triggers current stage animation */}
            {currentSceneId === 'security' && (
              <button
                onClick={() => setSecurityPlaySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Play animation"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Phase Advance Button - appears when correlation is running; advances to attack story cards */}
            {currentSceneId === 'security' && (securityAlertPhase === 'flooding' || securityAlertPhase === 'connecting') && (
              <button
                onClick={() => setSecurityPhaseSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal border border-elastic-teal/30 glow-delayed-dark'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue border border-elastic-blue/20 glow-delayed-light'
                }`}
                title="Show attack story cards"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            )}

            {/* Play Button - only visible on Data Mesh scene stage 0 before typing starts */}
            {currentSceneId === 'data-mesh' && dataMeshPlayState.canPlay && (
              <button
                onClick={() => setDataMeshPlaySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Play typing animation"
              >
                <FontAwesomeIcon icon={faPlay} className="text-sm ml-0.5" />
              </button>
            )}

            {/* Run Query Button - only visible on Data Mesh scene when stage 4 and mesh is active */}
            {currentSceneId === 'data-mesh' && dataMeshQueryState.canRun && (
              <button
                onClick={() => setDataMeshRunQuerySignal(n => n + 1)}
                disabled={dataMeshQueryState.isRunning}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={dataMeshQueryState.isRunning ? 'Running Query…' : 'Run Query'}
              >
                <FontAwesomeIcon
                  icon={dataMeshQueryState.isRunning ? faBolt : faPlay}
                  className={`text-sm ml-0.5 ${dataMeshQueryState.isRunning ? 'animate-pulse' : ''}`}
                />
              </button>
            )}

            {/* Activate Mesh Button - Data Mesh stage 4 before mesh is active */}
            {currentSceneId === 'data-mesh' && dataMeshActivateMeshState.canActivate && (
              <button
                onClick={() => setDataMeshActivateMeshSignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Activate Mesh"
              >
                <FontAwesomeIcon icon={faCircleNodes} className="text-sm" />
              </button>
            )}

            {/* Compare All Button - Data Mesh stage 3 */}
            {currentSceneId === 'data-mesh' && dataMeshSummaryState.canToggle && (
              <button
                onClick={() => setDataMeshSummarySignal(n => n + 1)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title={dataMeshSummaryState.isShowing ? 'Back to Cards' : 'Compare All'}
              >
                <FontAwesomeIcon icon={dataMeshSummaryState.isShowing ? faTimes : faLayerGroup} className="text-sm" />
              </button>
            )}

            {/* Start/Pause + Reset - Data Tiering scene */}
            {currentSceneId === 'data-tiering' && (
              <>
                <button
                  onClick={() => setDataTieringIsRunning(r => !r)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title={dataTieringIsRunning ? 'Pause' : 'Start Flow'}
                >
                  <FontAwesomeIcon icon={dataTieringIsRunning ? faPause : faPlay} className="text-sm ml-0.5" />
                </button>
                <button
                  onClick={() => { setDataTieringIsRunning(false); setDataTieringResetSignal(n => n + 1) }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Reset"
                >
                  <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
                </button>
              </>
            )}

            {/* How Button - only visible on Business Value scene when card is selected and unified message not shown */}
            {currentSceneId === 'business-value' && businessValueSelectedCard && !businessValueShowUnified && (
              <button
                onClick={() => setBusinessValueShowUnified(true)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
                  theme === 'dark' 
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal glow-once-dark' 
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue glow-once-light'
                }`}
                title="Show unified platform message"
              >
                <FontAwesomeIcon icon={faForwardStep} className="text-lg" />
              </button>
            )}

            {/* Stage Back/Forward - only visible on ES|QL scene */}
            {currentSceneId === 'esql' && (
              <>
                <button
                  onClick={() => setEsqlStage(s => Math.max(0, s - 1))}
                  disabled={esqlStage === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Previous stage"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                </button>
                <button
                  onClick={() => setEsqlStage(s => Math.min(ESQL_STAGE_COUNT - 1, s + 1))}
                  disabled={esqlStage === ESQL_STAGE_COUNT - 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Next stage"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                </button>
              </>
            )}

            {/* Stage Back/Forward - only visible on Elastic Overview scene */}
            {currentSceneId === 'elastic-overview' && (
              <>
                <button
                  onClick={() => setElasticOverviewStage(s => Math.max(0, s - 1))}
                  disabled={elasticOverviewStage === 0}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Previous stage"
                >
                  <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
                </button>
                <button
                  onClick={() => setElasticOverviewStage(s => Math.min(ELASTIC_OVERVIEW_STAGE_COUNT - 1, s + 1))}
                  disabled={elasticOverviewStage === ELASTIC_OVERVIEW_STAGE_COUNT - 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                      : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                  }`}
                  title="Next stage"
                >
                  <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
                </button>
              </>
            )}
          {/* Demo controls — Zero Downtime stage */}
          {currentSceneId === 'services' && servicesStage === 2 && (
            <>
              <button
                onClick={handleDemoBack}
                disabled={demoPhase === 'idle'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Previous step"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
              </button>
              <button
                onClick={() => setDemoPhase('idle')}
                disabled={demoPhase === 'idle'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 text-white/60'
                    : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/60'
                }`}
                title="Reset demo"
              >
                <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
              </button>
              <button
                onClick={handleDemoAdvance}
                disabled={demoPhase === 'complete'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 disabled:opacity-30 disabled:cursor-not-allowed ${
                  theme === 'dark'
                    ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal'
                    : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
                }`}
                title="Next step"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
              </button>
            </>
          )}
          </div>
          
          {/* Right: Navigation Controls */}
          <div className="flex items-center gap-2">
            {/* Prev */}
            <button
              onClick={handlePrev}
              disabled={currentScene === 0}
              aria-label="Previous scene"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                currentScene === 0
                  ? 'opacity-30 cursor-not-allowed border-transparent'
                  : theme === 'dark'
                    ? 'bg-white/[0.06] border-white/15 text-white/80 hover:text-white hover:bg-white/15 hover:scale-110'
                    : 'bg-white border-elastic-dev-blue/15 text-elastic-ink/80 hover:text-elastic-dark-ink hover:border-elastic-blue/40 hover:scale-110'
              }`}
            >
              <FontAwesomeIcon icon={faChevronLeft} className="text-sm" />
            </button>

            {/* Current scene readout + jump-to menu */}
            <div className="relative">
              <button
                onClick={() => setSceneMenuOpen((o) => !o)}
                className={`group flex items-center gap-2.5 pl-3.5 pr-3 py-2 rounded-full border shadow-sm transition-all ${
                  theme === 'dark'
                    ? 'bg-white/[0.08] border-white/20 hover:border-elastic-teal/50'
                    : 'bg-white border-elastic-dev-blue/20 hover:border-elastic-blue/40 hover:shadow'
                }`}
                title="Jump to scene"
              >
                <span className={`text-sm font-semibold leading-none ${theme === 'dark' ? 'text-white' : 'text-elastic-dark-ink'}`}>
                  {sceneTitle(scenes[currentScene] || {})}
                </span>
                <span className={`text-xs font-mono leading-none tabular-nums ${theme === 'dark' ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                  {currentScene + 1} / {scenes.length}
                </span>
                <FontAwesomeIcon
                  icon={faChevronRight}
                  className={`text-[10px] transition-transform duration-200 ${sceneMenuOpen ? '-rotate-90' : 'rotate-0'} ${theme === 'dark' ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}
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
                    className={`absolute bottom-full right-0 mb-3 z-50 w-72 rounded-2xl border shadow-2xl overflow-hidden ${
                      theme === 'dark' ? 'bg-elastic-dev-blue border-white/10' : 'bg-white border-elastic-dev-blue/10'
                    }`}
                  >
                    {/* Search */}
                    <div className={`flex items-center gap-2 px-3 py-2.5 border-b ${theme === 'dark' ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      <FontAwesomeIcon icon={faMagnifyingGlass} className={`text-xs ${theme === 'dark' ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
                      <input
                        autoFocus
                        value={sceneQuery}
                        onChange={(e) => setSceneQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Escape') setSceneMenuOpen(false) }}
                        placeholder="Jump to scene…"
                        className={`flex-1 bg-transparent text-sm outline-none ${theme === 'dark' ? 'text-white placeholder:text-white/30' : 'text-elastic-dark-ink placeholder:text-elastic-dev-blue/30'}`}
                      />
                    </div>

                    {/* Scene list */}
                    <div className="max-h-72 overflow-y-auto py-1">
                      {scenes
                        .map((scene, index) => ({ scene, index, title: sceneTitle(scene) }))
                        .filter(({ title }) => title.toLowerCase().includes(sceneQuery.trim().toLowerCase()))
                        .map(({ scene, index, title }) => {
                          const isActive = index === currentScene
                          return (
                            <button
                              key={scene.id}
                              onClick={() => { navigateToScene(index); setSceneMenuOpen(false) }}
                              className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                                isActive
                                  ? theme === 'dark' ? 'bg-elastic-teal/15' : 'bg-elastic-blue/10'
                                  : theme === 'dark' ? 'hover:bg-white/[0.06]' : 'hover:bg-elastic-dev-blue/[0.05]'
                              }`}
                            >
                              <span className={`w-6 text-right text-xs font-mono tabular-nums shrink-0 ${theme === 'dark' ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                                {index + 1}
                              </span>
                              <span className={`flex-1 min-w-0 truncate text-sm ${
                                isActive
                                  ? `font-semibold ${theme === 'dark' ? 'text-elastic-teal' : 'text-elastic-blue'}`
                                  : theme === 'dark' ? 'text-white/80' : 'text-elastic-dark-ink/80'
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

            {/* Next */}
            <button
              onClick={handleNext}
              disabled={currentScene === scenes.length - 1}
              aria-label="Next scene"
              className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                currentScene === scenes.length - 1
                  ? 'opacity-30 cursor-not-allowed border-transparent'
                  : theme === 'dark'
                    ? 'bg-white/[0.06] border-white/15 text-white/80 hover:text-white hover:bg-white/15 hover:scale-110'
                    : 'bg-white border-elastic-dev-blue/15 text-elastic-ink/80 hover:text-elastic-dark-ink hover:border-elastic-blue/40 hover:scale-110'
              }`}
            >
              <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
            </button>
          </div>
        </div>
      </nav>
      
      {/* Progress Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
        <div 
          className="h-full bg-elastic-blue dark:bg-elastic-teal transition-all duration-500"
          style={{ width: `${((currentScene + 1) / scenes.length) * 100}%` }}
        />
      </div>
    </div>
  )
}

function App() {
  const location = useLocation()
  const isPresenterView = location.pathname === '/presenter'

  return (
    <ThemeProvider>
      <TeamProvider>
        <SceneMotionProvider>
          {isPresenterView ? <PresenterView /> : <AppContent />}
        </SceneMotionProvider>
        <Analytics />
      </TeamProvider>
    </ThemeProvider>
  )
}

export default App
