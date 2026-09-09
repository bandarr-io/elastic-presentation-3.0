import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faXmark,
  faPlus,
  faArrowUp,
  faArrowDown,
  faGripVertical,
  faLayerGroup,
  faMagnifyingGlass,
  faRotateLeft,
  faClock,
  faTrash,
  faTableCells,
  faPenToSquare,
  faPalette,
  faCopy,
  faChevronLeft,
  faChevronRight,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import ScenePreview from '../presenter/ScenePreview'
import { buildPreviewProps } from '../presenter/buildPreviewProps'
import ErrorBoundary from './ErrorBoundary'
import SceneThumbnailBooth from './SceneThumbnailBooth'
import { catalogSpeakerNotes, resolveCatalogScenario } from '../data/catalogScenarios'
import { getThumbnail, thumbnailFailed, thumbnailKey } from '../utils/sceneThumbnails'
import { baseSceneId, isDuplicateSceneId, nextDuplicateId } from '../utils/sceneIdentity'
import { aliasSceneEditorProps } from '../utils/sceneDuplicates'
import { MODULAR_SCENE_EDITORS } from './sceneEditors'
import TeamEditorPanel from './TeamEditorPanel'
import AgendaEditorPanel from './AgendaEditorPanel'

function parseMinutes(duration) {
  const m = String(duration || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

function sceneTitle(scene, sceneMetadata) {
  return sceneMetadata?.[scene.id]?.title || scene.title
}

function SceneCard({
  index,
  title,
  duration,
  active,
  isDark,
  stageBg,
  text,
  muted,
  canMoveUp,
  canMoveDown,
  canRemove,
  onSelect,
  onOpen,
  onMoveUp,
  onMoveDown,
  onRemove,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOver,
  sceneId,
  thumbnail,
  capturing,
  isDuplicate,
  sourceTitle,
}) {
  const stop = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }
  const chip = active
    ? (isDark ? 'bg-elastic-teal text-elastic-dev-blue' : 'bg-elastic-blue text-white')
    : (isDark ? 'bg-white/10 text-white/70' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/70')
  const btn = `w-5 h-5 rounded flex items-center justify-center text-[9px] transition-colors ${
    isDark ? 'text-white/55 hover:text-white hover:bg-white/15' : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/10'
  }`

  return (
    <div
      data-deck-card={sceneId}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onSelect}
      onDoubleClick={onOpen}
      className={`group rounded-xl overflow-hidden cursor-pointer border transition-all ${
        dragOver
          ? (isDark ? 'ring-2 ring-elastic-teal' : 'ring-2 ring-elastic-blue')
          : ''
      } ${
        active
          ? (isDark ? 'border-elastic-teal/60 ring-1 ring-elastic-teal/40' : 'border-elastic-blue/50 ring-1 ring-elastic-blue/30')
          : (isDark ? 'border-white/10 hover:border-white/25' : 'border-elastic-dev-blue/10 hover:border-elastic-dev-blue/25')
      }`}
    >
      <div className={`relative aspect-video ${stageBg}`}>
        {thumbnail ? (
          <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
        ) : capturing ? (
          <div className={`absolute inset-0 animate-pulse ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`} />
        ) : null}
        {thumbnail ? (
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/65 to-transparent pointer-events-none" />
        ) : null}
        <div className="absolute inset-0 p-2.5 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <span className={`text-[11px] font-mono font-semibold px-1.5 py-0.5 rounded shrink-0 ${chip}`}>
              {String(index + 1).padStart(2, '0')}
            </span>
            <div
              className={`flex items-center gap-0.5 rounded-md px-0.5 ${thumbnail ? (isDark ? 'bg-black/40' : 'bg-white/75') : ''}`}
              onMouseDown={stop}
            >
              <button
                type="button"
                onClick={(e) => { stop(e); onMoveUp() }}
                disabled={!canMoveUp}
                className={`${btn} ${!canMoveUp ? 'opacity-25 pointer-events-none' : ''}`}
                title="Move earlier"
              >
                <FontAwesomeIcon icon={faArrowUp} />
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); onMoveDown() }}
                disabled={!canMoveDown}
                className={`${btn} ${!canMoveDown ? 'opacity-25 pointer-events-none' : ''}`}
                title="Move later"
              >
                <FontAwesomeIcon icon={faArrowDown} />
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); onDuplicate?.() }}
                className={btn}
                title="Duplicate this scene"
              >
                <FontAwesomeIcon icon={faCopy} />
              </button>
              <button
                type="button"
                onClick={(e) => { stop(e); onRemove() }}
                disabled={!canRemove}
                className={`${btn} ${!canRemove ? 'opacity-25 pointer-events-none' : (isDark ? 'hover:text-red-400' : 'hover:text-red-500')}`}
                title={
                  isDuplicate
                    ? 'Delete this copy'
                    : canRemove
                      ? 'Remove from deck'
                      : 'At least one scene must stay in the deck'
                }
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
              <span className={`w-5 h-5 rounded flex items-center justify-center opacity-40 group-hover:opacity-80 cursor-grab active:cursor-grabbing ${muted}`}>
                <FontAwesomeIcon icon={faGripVertical} className="text-[10px]" />
              </span>
            </div>
          </div>
          <div>
            <div className={`text-sm font-bold leading-tight line-clamp-2 ${
              thumbnail ? 'text-white drop-shadow-md' : text
            }`}>{title}</div>
            {isDuplicate && sourceTitle ? (
              <div className={`text-[10px] mt-0.5 ${thumbnail ? 'text-white/80 drop-shadow' : muted}`}>
                Copy of {sourceTitle}
              </div>
            ) : null}
            {duration ? (
              <div className={`text-[10px] mt-1 ${thumbnail ? 'text-white/80 drop-shadow' : muted}`}>
                <FontAwesomeIcon icon={faClock} className="mr-1" />
                {duration}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DeckBuilder({
  scenes,
  deckScenes,
  libraryScenes,
  customDurations,
  sceneMetadata,
  onUpdateDuration,
  onUpdateSceneMetadata,
  onAdd,
  onRemove,
  onDuplicate,
  onDeleteDuplicate,
  onMoveUp,
  onMoveDown,
  onReorder,
  onReset,
  onClose,
  initialSceneId,
  initialViewMode = 'edit',
  totalTime = 0,
}) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [rail, setRail] = useState('deck')
  const [railCollapsed, setRailCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState(initialViewMode)
  const [librarySearch, setLibrarySearch] = useState('')
  const [selectedId, setSelectedId] = useState(initialSceneId || deckScenes[0]?.id || null)
  const [dragOverId, setDragOverId] = useState(null)
  const [thumbTick, setThumbTick] = useState(0)
  const filmstripRef = useRef(null)
  const panelRef = useRef(null)
  const onThumbSettled = useCallback(() => setThumbTick((n) => n + 1), [])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (initialSceneId) setSelectedId(initialSceneId)
  }, [initialSceneId])

  useEffect(() => {
    if (selectedId && deckScenes.some((s) => s.id === selectedId)) return
    setSelectedId(deckScenes[0]?.id || null)
  }, [deckScenes, selectedId])

  useEffect(() => {
    const el = panelRef.current?.querySelector(`[data-deck-card="${selectedId}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedId, viewMode])

  const selected = deckScenes.find((s) => s.id === selectedId) || null
  const selectedIndex = selected ? deckScenes.findIndex((s) => s.id === selected.id) : -1
  const metadata = selected ? (sceneMetadata?.[selected.id] || {}) : {}
  const displayTitle = selected ? sceneTitle(selected, sceneMetadata) : ''
  const durationValue = selected ? (customDurations?.[selected.id] || '') : ''
  const durationMin = parseMinutes(durationValue)

  const catalogDefaultNotes = baseSceneId(selected?.id) === 'search-catalog'
    ? catalogSpeakerNotes(resolveCatalogScenario(sceneMetadata?.[selected.id] || {}))
    : ''
  const speakerNotes = metadata.speakerNotes || catalogDefaultNotes

  const searchQuery = librarySearch.trim().toLowerCase()
  const filteredLibrary = searchQuery
    ? libraryScenes.filter((s) => {
        const title = sceneTitle(s, sceneMetadata).toLowerCase()
        const desc = (s.description || '').toLowerCase()
        return title.includes(searchQuery) || desc.includes(searchQuery) || s.id.toLowerCase().includes(searchQuery)
      })
    : libraryScenes

  const previewContext = useMemo(
    () => ({
      sceneMetadata,
      orderedScenes: scenes,
      customDurations,
      enabledScenes: deckScenes,
    }),
    [sceneMetadata, scenes, customDurations, deckScenes],
  )

  // Thumbnail keys hash the whole metadata blob, and a miss costs a full
  // offscreen render plus an html-to-image encode. Editing content in this
  // panel would queue one capture per keystroke, so thumbnails track a settled
  // copy of the metadata while the live copy drives the preview.
  const settledMetadata = useDebouncedValue(sceneMetadata, 500)
  const thumbnailContext = useMemo(
    () => ({
      sceneMetadata: settledMetadata,
      orderedScenes: scenes,
      customDurations,
      enabledScenes: deckScenes,
    }),
    [settledMetadata, scenes, customDurations, deckScenes],
  )

  const thumbs = useMemo(() => {
    const next = {}
    for (const scene of deckScenes) {
      next[scene.id] = getThumbnail(thumbnailKey(scene.id, theme, settledMetadata?.[scene.id]))
    }
    return next
  }, [deckScenes, theme, settledMetadata, thumbTick])

  const captureScene = deckScenes.find((scene) => {
    const key = thumbnailKey(scene.id, theme, settledMetadata?.[scene.id])
    return !getThumbnail(key) && !thumbnailFailed(key)
  }) || null

  const SceneComponent = selected?.component
  const previewProps = selected
    ? buildPreviewProps(selected.id, previewContext)
    : null

  const text = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const muted = isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'
  const panelBg = isDark ? 'bg-elastic-dev-blue' : 'bg-white'
  const surface = isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.03]'
  const inputClass = `w-full px-3 py-2 text-sm rounded-lg border ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`
  const textareaClass = `w-full px-3 py-2 text-sm rounded-lg border resize-none ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`
  const ContentEditor = selected ? MODULAR_SCENE_EDITORS[baseSceneId(selected.id)] : null
  const editorProps = selected
    ? aliasSceneEditorProps(selected.id, sceneMetadata, onUpdateSceneMetadata)
    : { sceneMetadata, onUpdateSceneMetadata }
  const isTeamScene = selected ? baseSceneId(selected.id) === 'team' : false
  const isAgendaScene = selected ? baseSceneId(selected.id) === 'agenda' : false
  const teamEditor = isTeamScene ? (
    <div className="mt-6">
      <TeamEditorPanel isDark={isDark} />
    </div>
  ) : null
  const agendaEditor = isAgendaScene ? (
    <div className="mt-6">
      <AgendaEditorPanel
        isDark={isDark}
        scenes={scenes}
        sceneMetadata={editorProps.sceneMetadata}
        onUpdateSceneMetadata={editorProps.onUpdateSceneMetadata}
      />
    </div>
  ) : null
  const extraEditor = ContentEditor ? (
    <ContentEditor
      sceneMetadata={editorProps.sceneMetadata}
      onUpdateSceneMetadata={editorProps.onUpdateSceneMetadata}
      isDark={isDark}
      inputClass={inputClass}
      textareaClass={textareaClass}
    />
  ) : teamEditor || agendaEditor || (selected ? (
    <p className={`text-sm ${muted}`}>
      {displayTitle} has no editable content fields yet.
    </p>
  ) : null)
  const tabActive = isDark ? 'bg-elastic-teal text-elastic-dev-blue' : 'bg-elastic-blue text-white'
  const tabIdle = isDark ? 'text-white/60 hover:text-white/80' : 'text-elastic-dev-blue/60 hover:text-elastic-dev-blue/80'
  const stageBg = isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'

  const handleDragStart = (e, id) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }
  const handleDrop = (e, targetId) => {
    e.preventDefault()
    setDragOverId(null)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== targetId) onReorder?.(draggedId, targetId)
  }

  const addAndSelect = (id) => {
    onAdd?.(id)
    setSelectedId(id)
    setRail('deck')
  }

  const openSpecialScene = (baseId) => {
    const inDeck = deckScenes.find((s) => baseSceneId(s.id) === baseId)
    const inLibrary = libraryScenes.find((s) => baseSceneId(s.id) === baseId)
    const scene = inDeck || inLibrary
    if (!scene) return
    if (!inDeck) addAndSelect(scene.id)
    else setSelectedId(scene.id)
    setViewMode('content')
    setRailCollapsed(false)
    setRail('deck')
  }

  const removeScene = (id) => {
    if (deckScenes.length <= 1) return
    const i = deckScenes.findIndex((s) => s.id === id)
    const next = deckScenes[i + 1] || deckScenes[i - 1]
    if (isDuplicateSceneId(id)) onDeleteDuplicate?.(id)
    else onRemove?.(id)
    if (selectedId === id && next) setSelectedId(next.id)
  }

  const copyScene = (id) => {
    const newId = nextDuplicateId(id, scenes.map((s) => s.id))
    onDuplicate?.(id)
    setSelectedId(newId)
    setRail('deck')
  }

  const cardProps = (scene, i) => ({
    sceneId: scene.id,
    index: i,
    title: sceneTitle(scene, sceneMetadata),
    duration: parseMinutes(customDurations?.[scene.id]) > 0 ? customDurations[scene.id] : '',
    active: scene.id === selectedId,
    isDark,
    stageBg,
    text,
    muted,
    canMoveUp: i > 0,
    canMoveDown: i < deckScenes.length - 1,
    canRemove: deckScenes.length > 1,
    onSelect: () => setSelectedId(scene.id),
    onOpen: () => {
      setSelectedId(scene.id)
      setViewMode('edit')
    },
    onMoveUp: () => onMoveUp?.(scene.id),
    onMoveDown: () => onMoveDown?.(scene.id),
    onRemove: () => removeScene(scene.id),
    onDuplicate: () => copyScene(scene.id),
    isDuplicate: !!scene.isDuplicate || isDuplicateSceneId(scene.id),
    sourceTitle: scene.sourceTitle,
    onDragStart: (e) => handleDragStart(e, scene.id),
    onDragOver: (e) => {
      e.preventDefault()
      setDragOverId(scene.id)
    },
    onDragLeave: () => setDragOverId(null),
    onDrop: (e) => handleDrop(e, scene.id),
    dragOver: dragOverId === scene.id,
    thumbnail: thumbs[scene.id] || null,
    capturing: captureScene?.id === scene.id,
  })

  return createPortal(
    <>
    <div className="fixed inset-0 z-[70] flex flex-col">
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" aria-label="Close" onClick={onClose} />

      <div ref={panelRef} className={`relative m-3 md:m-5 flex-1 rounded-2xl shadow-2xl overflow-hidden flex flex-col border ${panelBg} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <FontAwesomeIcon icon={faLayerGroup} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
            <h2 className={`text-base font-bold ${text}`}>Deck Builder</h2>
            <span className={`text-xs truncate ${muted}`}>
              {deckScenes.length} scene{deckScenes.length === 1 ? '' : 's'}
              {totalTime > 0 ? ` · ~${totalTime} min` : ''}
              {' · drag to reorder · double-click a slide to edit'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex rounded-lg p-0.5 border ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
              <button
                onClick={() => setViewMode('edit')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${viewMode === 'edit' ? tabActive : tabIdle}`}
              >
                <FontAwesomeIcon icon={faPenToSquare} />
                Edit
              </button>
              <button
                onClick={() => setViewMode('content')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${viewMode === 'content' ? tabActive : tabIdle}`}
              >
                <FontAwesomeIcon icon={faPalette} />
                Content
              </button>
              <button
                onClick={() => openSpecialScene('team')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${isTeamScene && viewMode === 'content' ? tabActive : tabIdle}`}
              >
                <FontAwesomeIcon icon={faUsers} />
                Team
              </button>
              <button
                onClick={() => openSpecialScene('agenda')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${isAgendaScene && viewMode === 'content' ? tabActive : tabIdle}`}
              >
                <FontAwesomeIcon icon={faClock} />
                Agenda
              </button>
              <button
                onClick={() => setViewMode('sorter')}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 ${viewMode === 'sorter' ? tabActive : tabIdle}`}
              >
                <FontAwesomeIcon icon={faTableCells} />
                Slide sorter
              </button>
            </div>
            <button
              onClick={onReset}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${isDark ? 'border-white/10 text-white/70 hover:bg-white/10' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/10'}`}
            >
              <FontAwesomeIcon icon={faRotateLeft} className="mr-1.5" />
              Reset
            </button>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-elastic-dev-blue/70 hover:bg-elastic-dev-blue/10'}`}
              title="Close (Esc)"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>
        </div>

        {viewMode === 'sorter' ? (
          <div className="flex-1 min-h-0 flex">
            <div className="flex-1 min-h-0 overflow-y-auto p-5">
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deckScenes.map((scene, i) => (
                  <SceneCard key={scene.id} {...cardProps(scene, i)} />
                ))}
              </div>
              {libraryScenes.length > 0 && (
                <p className={`text-xs mt-4 ${muted}`}>
                  {libraryScenes.length} scene{libraryScenes.length === 1 ? '' : 's'} still in the library — switch to Edit to add them.
                </p>
              )}
            </div>
            <div
              className="w-[320px] shrink-0 flex flex-col border-l overflow-y-auto"
              style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}
            >
              <Inspector
                selected={selected}
                selectedIndex={selectedIndex}
                deckCount={deckScenes.length}
                displayTitle={displayTitle}
                durationValue={durationValue}
                durationMin={durationMin}
                speakerNotes={speakerNotes}
                muted={muted}
                inputClass={inputClass}
                onUpdateSceneMetadata={onUpdateSceneMetadata}
                onUpdateDuration={onUpdateDuration}
              />
            </div>
          </div>
        ) : (
        <div className="flex-1 min-h-0 flex">
          {/* Left rail — filmstrip + library */}
          <div
            className={`${railCollapsed ? 'w-12' : 'w-[280px]'} shrink-0 flex flex-col border-r transition-[width] duration-200`}
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}
          >
            <div className={`p-2 flex gap-1 border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
              {railCollapsed ? (
                <button
                  onClick={() => setRailCollapsed(false)}
                  className={`w-full py-1.5 rounded-lg text-xs ${tabIdle}`}
                  title="Show filmstrip"
                >
                  <FontAwesomeIcon icon={faChevronRight} />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setRail('deck')}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold ${rail === 'deck' ? tabActive : tabIdle}`}
                  >
                    In deck ({deckScenes.length})
                  </button>
                  <button
                    onClick={() => setRail('library')}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-semibold ${rail === 'library' ? tabActive : tabIdle}`}
                  >
                    Library ({libraryScenes.length})
                  </button>
                  <button
                    onClick={() => setRailCollapsed(true)}
                    className={`px-2 py-1.5 rounded-lg text-xs ${tabIdle}`}
                    title="Collapse filmstrip"
                  >
                    <FontAwesomeIcon icon={faChevronLeft} />
                  </button>
                </>
              )}
            </div>

            {railCollapsed ? (
              <div className="flex-1 overflow-y-auto p-1 space-y-1">
                {deckScenes.map((scene, i) => {
                  const active = scene.id === selectedId
                  return (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedId(scene.id)}
                      title={sceneTitle(scene, sceneMetadata)}
                      className={`w-full py-1.5 rounded-md text-[10px] font-mono font-semibold ${
                        active ? tabActive : tabIdle
                      }`}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
            {rail === 'library' && (
              <div className="px-2 pt-2">
                <div className="relative">
                  <FontAwesomeIcon icon={faMagnifyingGlass} className={`absolute left-3 top-1/2 -translate-y-1/2 text-xs ${muted}`} />
                  <input
                    type="text"
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search scenes…"
                    className={`${inputClass} pl-8`}
                  />
                </div>
              </div>
            )}

            <div ref={filmstripRef} className="flex-1 overflow-y-auto p-2 space-y-2">
              {rail === 'deck' ? (
                deckScenes.map((scene, i) => (
                  <SceneCard key={scene.id} {...cardProps(scene, i)} />
                ))
              ) : filteredLibrary.length === 0 ? (
                <p className={`text-xs text-center py-8 ${muted}`}>
                  {searchQuery ? 'No scenes match your search.' : 'Every scene is already in your deck.'}
                </p>
              ) : (
                filteredLibrary.map((scene) => {
                  const title = sceneTitle(scene, sceneMetadata)
                  return (
                    <button
                      key={scene.id}
                      onClick={() => addAndSelect(scene.id)}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${surface} ${isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-elastic-dev-blue/[0.06]'}`}
                    >
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>
                          <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
                        </span>
                        <div className="min-w-0">
                          <div className={`text-sm font-semibold truncate ${text}`}>{title}</div>
                          {scene.description ? (
                            <div className={`text-[11px] mt-0.5 line-clamp-2 ${muted}`}>{scene.description}</div>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
              </>
            )}
          </div>

          {/* Center + right: content mode is a wide form + preview; edit mode
              is a live preview with a narrow inspector. */}
          <div className="flex-1 min-w-0 flex">
          {viewMode === 'content' ? (
            <>
              <div
                className="w-[58%] min-w-0 flex flex-col border-r overflow-hidden"
                style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}
              >
                <div className="flex-1 overflow-y-auto">
                  <Inspector
                    selected={selected}
                    selectedIndex={selectedIndex}
                    deckCount={deckScenes.length}
                    displayTitle={displayTitle}
                    durationValue={durationValue}
                    durationMin={durationMin}
                    speakerNotes={speakerNotes}
                    muted={muted}
                    inputClass={inputClass}
                    onUpdateSceneMetadata={onUpdateSceneMetadata}
                    onUpdateDuration={onUpdateDuration}
                    compactNotes
                    extra={extraEditor}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col">
                <div className={`px-4 py-2 text-[10px] uppercase tracking-wider ${muted} border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                  {selected ? `Live preview · ${displayTitle}` : 'Select a scene'}
                </div>
                <div className="flex-1 min-h-0 p-4">
                  {SceneComponent && previewProps ? (
                    <ErrorBoundary key={selected.id}>
                      <div className={`h-full rounded-xl overflow-hidden ${isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'} ${isDark ? 'ring-1 ring-white/10' : 'ring-1 ring-elastic-dev-blue/10'}`}>
                        <ScenePreview fill className="h-full">
                          <div className={`h-full w-full ${stageBg}`}>
                            <SceneComponent {...previewProps} />
                          </div>
                        </ScenePreview>
                      </div>
                    </ErrorBoundary>
                  ) : (
                    <div className={`h-full rounded-xl border border-dashed flex items-center justify-center text-sm ${muted} ${isDark ? 'border-white/15' : 'border-elastic-dev-blue/15'}`}>
                      Add a scene from the library to start building.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
          {/* Center — live preview */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className={`px-4 py-2 text-[10px] uppercase tracking-wider ${muted} border-b ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
              {selected ? `Live preview · ${displayTitle}` : 'Select a scene'}
            </div>
            <div className="flex-1 min-h-0 p-4">
              {SceneComponent && previewProps ? (
                <ErrorBoundary key={selected.id}>
                  <div className={`h-full rounded-xl overflow-hidden ${isDark ? 'bg-elastic-dev-blue' : 'bg-elastic-light-grey'} ${isDark ? 'ring-1 ring-white/10' : 'ring-1 ring-elastic-dev-blue/10'}`}>
                    <ScenePreview fill className="h-full">
                      <div className={`h-full w-full ${stageBg}`}>
                        <SceneComponent {...previewProps} />
                      </div>
                    </ScenePreview>
                  </div>
                </ErrorBoundary>
              ) : (
                <div className={`h-full rounded-xl border border-dashed flex items-center justify-center text-sm ${muted} ${isDark ? 'border-white/15' : 'border-elastic-dev-blue/15'}`}>
                  Add a scene from the library to start building.
                </div>
              )}
            </div>
          </div>

          {/* Right — inspector */}
          <div
            className="w-[320px] shrink-0 flex flex-col border-l overflow-y-auto"
            style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}
          >
            <Inspector
              selected={selected}
              selectedIndex={selectedIndex}
              deckCount={deckScenes.length}
              displayTitle={displayTitle}
              durationValue={durationValue}
              durationMin={durationMin}
              speakerNotes={speakerNotes}
              muted={muted}
              inputClass={inputClass}
              onUpdateSceneMetadata={onUpdateSceneMetadata}
              onUpdateDuration={onUpdateDuration}
              extra={teamEditor || agendaEditor}
            />
          </div>
            </>
          )}
          </div>
        </div>
        )}
      </div>
    </div>
    {captureScene ? (
      <SceneThumbnailBooth
        scene={captureScene}
        previewProps={buildPreviewProps(captureScene.id, thumbnailContext)}
        cacheKey={thumbnailKey(captureScene.id, theme, settledMetadata?.[captureScene.id])}
        stageClass={stageBg}
        backgroundColor={isDark ? '#101C3F' : '#F5F7FA'}
        onSettled={onThumbSettled}
      />
    ) : null}
    </>,
    document.body,
  )
}

function Inspector({
  selected,
  selectedIndex,
  deckCount,
  displayTitle,
  durationValue,
  durationMin,
  speakerNotes,
  muted,
  inputClass,
  onUpdateSceneMetadata,
  onUpdateDuration,
  compactNotes = false,
  extra = null,
}) {
  if (!selected) {
    return <div className={`p-6 text-sm ${muted}`}>Select a scene to edit notes and timing.</div>
  }

  return (
    <div className="p-4 space-y-4">
      <span className={`text-[10px] uppercase tracking-wider font-semibold ${muted}`}>
        Scene {selectedIndex + 1} of {deckCount}
      </span>

      <div>
        <label className={`text-xs mb-1 block ${muted}`}>Title</label>
        <input
          type="text"
          value={displayTitle}
          onChange={(e) => onUpdateSceneMetadata?.(selected.id, { title: e.target.value })}
          className={inputClass}
          placeholder={selected.title}
        />
        <p className={`text-[11px] mt-1 ${muted}`}>Used in the nav bar and agenda.</p>
      </div>

      <div>
        <label className={`text-xs mb-1 block ${muted}`}>Duration (optional)</label>
        <input
          type="text"
          value={durationValue}
          onChange={(e) => onUpdateDuration?.(selected.id, e.target.value)}
          className={inputClass}
          placeholder="e.g. 5 min"
        />
        {durationMin > 0 ? (
          <p className={`text-[11px] mt-1 ${muted}`}>Shown on the agenda when set.</p>
        ) : (
          <p className={`text-[11px] mt-1 ${muted}`}>Leave blank to hide the time.</p>
        )}
      </div>

      <div>
        <label className={`text-xs mb-1 block ${muted}`}>Speaker notes</label>
        <textarea
          value={speakerNotes}
          onChange={(e) => onUpdateSceneMetadata?.(selected.id, { speakerNotes: e.target.value })}
          rows={compactNotes ? 4 : 12}
          className={`${inputClass} resize-y ${compactNotes ? 'min-h-[6rem]' : 'min-h-[12rem]'}`}
          placeholder="Talking points for this scene…"
        />
        <p className={`text-[11px] mt-1 ${muted}`}>
          Shown only in the presenter view.
          {baseSceneId(selected.id) === 'search-catalog' ? ' Audience pack details live here (not on the slide).' : ''}
        </p>
      </div>

      {extra}
    </div>
  )
}
