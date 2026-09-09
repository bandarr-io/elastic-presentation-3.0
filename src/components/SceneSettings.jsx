import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTeamConfig } from '../context/TeamContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faGear, faXmark, faRotateLeft, faClock, faCheck,
  faUsers, faSliders, faPlus, faTrash, faGripVertical, faChevronDown,
  faDownload, faUpload, faPalette, faArrowUp, faArrowDown,
  faLayerGroup
} from '@fortawesome/free-solid-svg-icons'
import { DEFAULT_AGENDA_ITEMS } from '../data/agendaDefaults'
import { DECK_PRESETS, DEFAULT_PRESET_ID, CUSTOM_PRESET_ID, presetConfig } from '../data/deckPresets'
import { catalogSpeakerNotes, resolveCatalogScenario } from '../data/catalogScenarios'

import DeckBuilder from './DeckBuilder'

const STORAGE_KEY = 'presentation-scene-config'

// Bump whenever the canonical default scene order / enabled set changes. On a
// version mismatch we adopt the new order + enabled defaults while preserving
// the user's own durations and scene metadata.
const ORDER_VERSION = 8

function buildDefaultConfig(initialScenes) {
  const allIds = initialScenes.map(s => s.id)
  const preset = presetConfig(DEFAULT_PRESET_ID, allIds)
  return {
    enabledIds: preset ? preset.enabledIds : initialScenes.filter(s => !s.defaultDisabled).map(s => s.id),
    durations: {},
    sceneMetadata: {},
    order: preset ? preset.order : allIds,
    activePreset: preset ? DEFAULT_PRESET_ID : CUSTOM_PRESET_ID,
    orderVersion: ORDER_VERSION
  }
}

export function useSceneConfiguration(initialScenes) {
  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.orderVersion !== ORDER_VERSION) {
          // Migrate to the new canonical flow (default preset), keeping edits.
          const migrated = buildDefaultConfig(initialScenes)
          return {
            ...migrated,
            durations: parsed.durations || {},
            sceneMetadata: parsed.sceneMetadata || {}
          }
        }
        return parsed
      } catch {
        return buildDefaultConfig(initialScenes)
      }
    }
    return buildDefaultConfig(initialScenes)
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  // Cross-tab sync: adopt config written by another tab (e.g. the presenter
  // view saving speaker notes while the deck tab is open). The storage event
  // never fires in the tab that wrote the value, so this cannot loop.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return
      try {
        setConfig(JSON.parse(e.newValue))
      } catch {
        // Ignore malformed writes; the local config stays authoritative.
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const applyPreset = (presetId) => {
    const allIds = initialScenes.map(s => s.id)
    const preset = presetConfig(presetId, allIds)
    if (!preset) return
    setConfig(prev => ({
      ...prev,
      order: preset.order,
      enabledIds: preset.enabledIds,
      activePreset: presetId
    }))
  }

  const toggleScene = (sceneId) => {
    setConfig(prev => {
      if (prev.enabledIds.includes(sceneId)) {
        if (prev.enabledIds.length <= 1) return prev
        return { ...prev, enabledIds: prev.enabledIds.filter(id => id !== sceneId), activePreset: CUSTOM_PRESET_ID }
      }
      return { ...prev, enabledIds: [...prev.enabledIds, sceneId], activePreset: CUSTOM_PRESET_ID }
    })
  }

  const updateDuration = (sceneId, duration) => {
    setConfig(prev => ({
      ...prev,
      durations: { ...prev.durations, [sceneId]: duration }
    }))
  }

  const updateSceneMetadata = (sceneId, metadata) => {
    setConfig(prev => ({
      ...prev,
      sceneMetadata: {
        ...(prev.sceneMetadata || {}),
        [sceneId]: {
          ...(prev.sceneMetadata?.[sceneId] || {}),
          ...metadata
        }
      }
    }))
  }

  const updateOrder = (newOrder) => {
    setConfig(prev => ({
      ...prev,
      order: newOrder,
      activePreset: CUSTOM_PRESET_ID
    }))
  }

  const resetToDefault = () => {
    setConfig(buildDefaultConfig(initialScenes))
  }

  // Build ordered scenes
  const order = config.order || initialScenes.map(s => s.id)
  const orderedScenes = order
    .map(id => initialScenes.find(s => s.id === id))
    .filter(Boolean)
  
  // Add any new scenes not in the saved order. A scene missing from the saved
  // order is genuinely new (vs. one the user explicitly disabled), so default
  // it to enabled — otherwise newly registered scenes silently never appear.
  const newSceneIds = []
  initialScenes.forEach(scene => {
    if (!orderedScenes.find(s => s.id === scene.id)) {
      orderedScenes.push(scene)
      if (!(config.order || []).includes(scene.id)) {
        newSceneIds.push(scene.id)
      }
    }
  })

  // New scenes auto-enable, unless explicitly flagged defaultDisabled — those
  // stay off by default but remain visible in settings so they can be toggled on.
  const effectiveEnabledIds = [
    ...config.enabledIds,
    ...newSceneIds.filter(id => {
      if (config.enabledIds.includes(id)) return false
      const scene = initialScenes.find(s => s.id === id)
      return !(scene && scene.defaultDisabled)
    })
  ]

  const enabledScenes = orderedScenes
    .filter(s => effectiveEnabledIds.includes(s.id))
    .map(s => ({
      ...s,
      ...(config.sceneMetadata?.[s.id] || {}),
      duration: config.durations?.[s.id] || s.duration
    }))

  return {
    enabledSceneIds: effectiveEnabledIds,
    enabledScenes,
    orderedScenes,
    customDurations: config.durations,
    sceneMetadata: config.sceneMetadata || {},
    activePreset: config.activePreset || CUSTOM_PRESET_ID,
    presets: DECK_PRESETS,
    applyPreset,
    toggleScene,
    updateDuration,
    updateSceneMetadata,
    updateOrder,
    resetToDefault
  }
}


// Parse a leading integer out of a duration string ("5 min" -> 5). Returns 0
// when unset/blank — durations are opt-in and hidden until a positive value is
// entered.
function parseMinutes(duration) {
  const m = String(duration || '').match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 0
}

// A single scene row. `variant='deck'` renders a reorderable, removable row for
// scenes currently in the presentation; `variant='library'` renders a compact
// "add to deck" row for available scenes.
function SceneItem({
  scene,
  deckIndex = 0,
  variant = 'deck',
  isLastEnabled = false,
  onRemove,
  onAdd,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
  customDuration,
  onUpdateDuration,
  sceneMetadata,
  onUpdateSceneMetadata,
  onReorder,
  isDark,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [durationValue, setDurationValue] = useState(customDuration || '')
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const isDeck = variant === 'deck'

  const handleDurationSubmit = () => {
    onUpdateDuration?.(scene.id, durationValue)
    setIsEditingDuration(false)
  }

  const handleDragStart = (e) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', scene.id)
  }
  const handleDragEnd = () => setIsDragging(false)
  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }
  const handleDragLeave = () => setIsDragOver(false)
  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId !== scene.id) onReorder?.(draggedId, scene.id)
  }

  // Durations are opt-in: default to zero (hidden), only shown when explicitly
  // set to a positive value.
  const displayDuration = customDuration || ''
  const durationMin = parseMinutes(customDuration)
  const metadata = sceneMetadata?.[scene.id] || {}
  const displayTitle = metadata.title || scene.title
  const displayDescription = metadata.description || scene.description || ''

  const inputClass = `w-full px-3 py-2 text-sm rounded-lg border ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`

  // ── Library variant: compact "add to deck" row ────────────────────────────
  if (!isDeck) {
    return (
      <div className={`rounded-lg transition-all ${
        isDark ? 'bg-white/[0.03] hover:bg-white/[0.07]' : 'bg-elastic-dev-blue/[0.03] hover:bg-elastic-dev-blue/[0.07]'
      }`}>
        <div className="p-2.5 flex items-center gap-2.5">
          <button
            onClick={() => onAdd?.(scene.id)}
            title="Add to deck"
            className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
              isDark
                ? 'bg-elastic-teal/20 text-elastic-teal hover:bg-elastic-teal/35'
                : 'bg-elastic-blue/10 text-elastic-blue hover:bg-elastic-blue/25'
            }`}
          >
            <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
          <button onClick={() => onAdd?.(scene.id)} className="flex-1 min-w-0 text-left">
            <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white/85' : 'text-elastic-dev-blue'}`}>{displayTitle}</h3>
            {displayDescription && (
              <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{displayDescription}</p>
            )}
          </button>
          {durationMin > 0 && (
            <span className={`text-[11px] flex-shrink-0 ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>{displayDuration}</span>
          )}
        </div>
      </div>
    )
  }

  // ── Deck variant: reorderable, removable row ───────────────────────────────
  const arrows = [
    { key: 'up', icon: faArrowUp, fn: onMoveUp, can: canMoveUp },
    { key: 'down', icon: faArrowDown, fn: onMoveDown, can: canMoveDown },
  ]

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-lg transition-all ${isDragging ? 'opacity-50' : 'opacity-100'} ${
        isDragOver ? (isDark ? 'ring-2 ring-elastic-teal' : 'ring-2 ring-elastic-blue') : ''
      } ${isDark ? 'bg-elastic-teal/[0.12] border border-elastic-teal/30' : 'bg-elastic-blue/[0.06] border border-elastic-blue/20'}`}
    >
      <div className="p-2.5 flex items-center gap-2">
        {/* Drag handle */}
        <div className={`cursor-grab active:cursor-grabbing ${isDark ? 'text-white/30 hover:text-white/60' : 'text-elastic-dev-blue/30 hover:text-elastic-dev-blue/60'}`}>
          <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
        </div>
        {/* Up / down arrows */}
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          {arrows.map(({ key, icon, fn, can }) => (
            <button
              key={key}
              onClick={() => can && fn?.(scene.id)}
              disabled={!can}
              className={`w-5 h-4 rounded flex items-center justify-center transition-all ${
                can
                  ? (isDark ? 'text-white/50 hover:text-white hover:bg-white/10' : 'text-elastic-dev-blue/50 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/10 cursor-pointer')
                  : (isDark ? 'text-white/15 cursor-not-allowed' : 'text-elastic-dev-blue/15 cursor-not-allowed')
              }`}
            >
              <FontAwesomeIcon icon={icon} className="text-[9px]" />
            </button>
          ))}
        </div>
        {/* Number + title (click to expand) */}
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex-1 min-w-0 text-left flex items-center gap-2">
          <span className={`text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60'}`}>{deckIndex + 1}</span>
          <div className="flex-1 min-w-0">
            <h3 className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{displayTitle}</h3>
            {displayDescription && <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{displayDescription}</p>}
          </div>
          <FontAwesomeIcon icon={faChevronDown} className={`text-xs flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''} ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
        </button>
        {/* Duration — hidden by default; only shown once a positive time is set.
            Set/clear it from the expanded panel below. */}
        {(isEditingDuration || durationMin > 0) && (
          <div className="flex-shrink-0">
            {isEditingDuration ? (
              <input
                type="text"
                value={durationValue}
                onChange={(e) => setDurationValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDurationSubmit()
                  if (e.key === 'Escape') setIsEditingDuration(false)
                }}
                onBlur={handleDurationSubmit}
                autoFocus
                className={`w-16 px-2 py-1 text-xs rounded border ${
                  isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-white border-elastic-dev-blue/20 text-elastic-dev-blue'
                }`}
                placeholder="5 min"
              />
            ) : (
              <button
                onClick={() => setIsEditingDuration(true)}
                className={`flex items-center gap-1 text-[11px] px-1.5 py-1 rounded transition-all ${
                  isDark ? 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:bg-elastic-dev-blue/20'
                }`}
                title="Click to edit duration"
              >
                <FontAwesomeIcon icon={faClock} className="text-[9px]" />
                {displayDuration}
              </button>
            )}
          </div>
        )}
        {/* Remove from deck */}
        <button
          onClick={() => !isLastEnabled && onRemove?.(scene.id)}
          disabled={isLastEnabled}
          title={isLastEnabled ? 'At least one scene must stay in the deck' : 'Remove from deck'}
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            isLastEnabled
              ? (isDark ? 'text-white/15 cursor-not-allowed' : 'text-elastic-dev-blue/15 cursor-not-allowed')
              : (isDark ? 'text-white/40 hover:text-red-400 hover:bg-red-400/10' : 'text-elastic-dev-blue/40 hover:text-red-500 hover:bg-red-500/10')
          }`}
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>
      </div>

      {/* Expanded: rename the scene and set an optional duration */}
      {isExpanded && (
        <div className={`px-2.5 pb-3 pt-0 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
          <label className={`text-xs mb-1 block pt-3 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Scene Title</label>
          <input
            type="text"
            value={displayTitle}
            onChange={(e) => onUpdateSceneMetadata?.(scene.id, { title: e.target.value })}
            className={inputClass}
            placeholder={scene.title}
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
            Used in the nav bar and the agenda's expanded scene list.
          </p>

          <label className={`text-xs mb-1 block pt-3 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Duration (optional)</label>
          <input
            type="text"
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleDurationSubmit() }}
            onBlur={handleDurationSubmit}
            className={inputClass}
            placeholder="e.g. 5 min"
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
            Leave blank to hide the time. Shown on the scene row and in the agenda when set.
          </p>

          <label className={`text-xs mb-1 block pt-3 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Speaker Notes (optional)</label>
          <textarea
            value={
              metadata.speakerNotes
              || (scene.id === 'search-catalog'
                ? catalogSpeakerNotes(resolveCatalogScenario(metadata))
                : '')
            }
            onChange={(e) => onUpdateSceneMetadata?.(scene.id, { speakerNotes: e.target.value })}
            rows={scene.id === 'search-catalog' ? 6 : 3}
            className={`${inputClass} resize-y`}
            placeholder="Talking points for this scene…"
          />
          <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
            Shown only in the presenter view.
            {scene.id === 'search-catalog' ? ' Audience pack details live here (not on the slide).' : ''}
          </p>
        </div>
      )}
    </div>
  )
}


function TeamEditorPanel({ isDark }) {
  const { teamConfig, updateTeamConfig, resetTeamConfig } = useTeamConfig()
  const fileInputRefs = useRef({})
  
  const inputClass = `w-full px-3 py-2 text-sm rounded-lg border ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`

  // The Team scene renders every member with the theme accent, so avatars
  // here preview that same color rather than a per-member value.
  const accentColor = isDark ? '#48EFCF' : '#0B64DD'

  const handleMemberUpdate = (index, field, value) => {
    const newMembers = [...teamConfig.members]
    newMembers[index] = { ...newMembers[index], [field]: value }
    updateTeamConfig({ ...teamConfig, members: newMembers })
  }

  const handlePhotoUpload = async (index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = (e) => {
      handleMemberUpdate(index, 'photo', e.target.result)
    }
    reader.readAsDataURL(file)
  }

  const handleMemberDelete = (index) => {
    const newMembers = teamConfig.members.filter((_, i) => i !== index)
    updateTeamConfig({ ...teamConfig, members: newMembers })
  }

  const handleAddMember = () => {
    if (teamConfig.members.length >= 15) {
      return // Maximum of 15 team members
    }
    const newMember = {
      id: `member-${Date.now()}`,
      name: '',
      role: '',
      email: '',
      phone: '',
      initials: '',
      photo: null
    }
    updateTeamConfig({ ...teamConfig, members: [...teamConfig.members, newMember] })
  }

  return (
    <div className="space-y-4">
      {/* Header Settings */}
      <div className={`p-4 rounded-xl ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
        <h3 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
          Page Header
        </h3>
        <div className="space-y-3">
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input
              type="text"
              value={teamConfig.eyebrow ?? ''}
              onChange={(e) => updateTeamConfig({ ...teamConfig, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Your Support"
            />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
            <input
              type="text"
              value={teamConfig.title}
              onChange={(e) => updateTeamConfig({ ...teamConfig, title: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <input
              type="text"
              value={teamConfig.subtitle}
              onChange={(e) => updateTeamConfig({ ...teamConfig, subtitle: e.target.value })}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
            Team Members ({teamConfig.members.length}/15)
          </h3>
          <button
            onClick={handleAddMember}
            disabled={teamConfig.members.length >= 15}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
              teamConfig.members.length >= 15
                ? 'opacity-50 cursor-not-allowed bg-elastic-dev-blue/10 text-elastic-dev-blue/50'
                : isDark 
                  ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
                  : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
            }`}
            title={teamConfig.members.length >= 15 ? 'Maximum of 15 team members reached' : 'Add a new team member'}
          >
            <FontAwesomeIcon icon={faPlus} />
            Add Member
          </button>
        </div>

        <div className="space-y-3">
          {teamConfig.members.map((member, index) => (
            <div
              key={member.id}
              className={`p-4 rounded-xl border ${
                isDark ? 'bg-white/[0.03] border-white/10' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* Avatar with photo or initials */}
                  <button
                    onClick={() => fileInputRefs.current[member.id]?.click()}
                    className="relative group/avatar"
                  >
                    {member.photo ? (
                      <img
                        src={member.photo}
                        alt={member.name}
                        className="w-10 h-10 rounded-lg object-cover"
                        style={{ border: `2px solid ${accentColor}` }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold"
                        style={{
                          backgroundColor: `${accentColor}20`,
                          color: accentColor,
                          border: `2px solid ${accentColor}`
                        }}
                      >
                        {member.initials || '?'}
                      </div>
                    )}
                    <div className={`absolute inset-0 rounded-lg flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity ${
                      isDark ? 'bg-black/60' : 'bg-black/40'
                    }`}>
                      <FontAwesomeIcon icon={faUpload} className="text-white text-xs" />
                    </div>
                  </button>
                  <input
                    ref={(el) => fileInputRefs.current[member.id] = el}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handlePhotoUpload(index, file)
                      e.target.value = ''
                    }}
                    className="hidden"
                  />
                  <div>
                    <div className={`font-medium text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      {member.name || 'New Member'}
                    </div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                      {member.role || 'No role set'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.photo && (
                    <button
                      onClick={() => handleMemberUpdate(index, 'photo', null)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isDark ? 'hover:bg-orange-500/20 text-white/40 hover:text-orange-400' : 'hover:bg-orange-500/10 text-elastic-dev-blue/40 hover:text-orange-500'
                      }`}
                      title="Remove photo"
                    >
                      <FontAwesomeIcon icon={faXmark} className="text-xs" />
                    </button>
                  )}
                  <button
                    onClick={() => handleMemberDelete(index)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isDark ? 'hover:bg-red-500/20 text-white/40 hover:text-red-400' : 'hover:bg-red-500/10 text-elastic-dev-blue/40 hover:text-red-500'
                    }`}
                    title="Delete member"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Name</label>
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => handleMemberUpdate(index, 'name', e.target.value)}
                    className={inputClass}
                    placeholder="Full Name"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Initials</label>
                  <input
                    type="text"
                    value={member.initials}
                    onChange={(e) => handleMemberUpdate(index, 'initials', e.target.value.toUpperCase().slice(0, 3))}
                    className={inputClass}
                    placeholder="AB"
                    maxLength={3}
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Role</label>
                <input
                  type="text"
                  value={member.role}
                  onChange={(e) => handleMemberUpdate(index, 'role', e.target.value)}
                  className={inputClass}
                  placeholder="Job Title"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Email</label>
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => handleMemberUpdate(index, 'email', e.target.value)}
                    className={inputClass}
                    placeholder="email@elastic.co"
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Phone</label>
                  <input
                    type="text"
                    value={member.phone}
                    onChange={(e) => handleMemberUpdate(index, 'phone', e.target.value)}
                    className={inputClass}
                    placeholder="555.123.4567"
                  />
                </div>
              </div>

              <div className="mt-3">
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Photo URL</label>
                <input
                  type="text"
                  value={member.photo && !member.photo.startsWith('data:') ? member.photo : ''}
                  onChange={(e) => handleMemberUpdate(index, 'photo', e.target.value)}
                  className={inputClass}
                  placeholder="/photos/name.jpg"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                  Or click avatar to upload
                </p>
              </div>
            </div>
          ))}

          {teamConfig.members.length === 0 && (
            <div className={`text-center py-8 rounded-xl border-2 border-dashed ${
              isDark ? 'border-white/10 text-white/30' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/30'
            }`}>
              <FontAwesomeIcon icon={faUsers} className="text-2xl mb-2" />
              <p className="text-sm">No team members yet</p>
              <p className="text-xs mt-1">Click "Add Member" to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetTeamConfig}
        className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
          isDark 
            ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' 
            : 'bg-red-500/5 hover:bg-red-500/10 text-red-500'
        }`}
      >
        <FontAwesomeIcon icon={faRotateLeft} />
        Reset Team to Default
      </button>
    </div>
  )
}

export default function SceneSettings({ 
  scenes, 
  enabledSceneIds, 
  customDurations,
  sceneMetadata,
  onToggle, 
  onUpdateDuration,
  onUpdateSceneMetadata,
  onUpdateOrder,
  onReset,
  presets = [],
  activePreset,
  onApplyPreset,
  isOpen: externalIsOpen,
  onOpenChange
}) {
  const [internalIsOpen, setInternalIsOpen] = useState(false)
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen
  const setIsOpen = onOpenChange || setInternalIsOpen
  const [activeTab, setActiveTab] = useState('scenes')
  const [showAgendaEditor, setShowAgendaEditor] = useState(false)
  const [deckBuilderOpen, setDeckBuilderOpen] = useState(false)
  const [deckBuilderFocusId, setDeckBuilderFocusId] = useState(null)
  const [deckBuilderViewMode, setDeckBuilderViewMode] = useState('edit')
  const { theme } = useTheme()
  const { teamConfig, updateTeamConfig } = useTeamConfig()
  const isDark = theme === 'dark'
  const fileInputRef = useRef(null)

  const enabledCount = enabledSceneIds.length
  const totalCount = scenes.length

  // Scenes are split into the working deck (enabled, in play order) and the
  // library (everything else). The saved `order` is kept as [deck…, library…]
  // so the deck always reads off the front of the list.
  const deckScenes = scenes.filter(s => enabledSceneIds.includes(s.id))
  const libraryScenes = scenes.filter(s => !enabledSceneIds.includes(s.id))

  const commitDeckOrder = (deckIds) => {
    onUpdateOrder([...deckIds, ...libraryScenes.map(s => s.id)])
  }

  // Drag-and-drop reorder within the deck.
  const reorderDeck = (draggedId, targetId) => {
    const ids = deckScenes.map(s => s.id)
    const from = ids.indexOf(draggedId)
    const to = ids.indexOf(targetId)
    if (from === -1 || to === -1) return
    const next = [...ids]
    next.splice(from, 1)
    next.splice(to, 0, draggedId)
    commitDeckOrder(next)
  }

  // Arrow-button reorder (dir: -1 up, +1 down).
  const moveInDeck = (sceneId, dir) => {
    const ids = deckScenes.map(s => s.id)
    const i = ids.indexOf(sceneId)
    const j = i + dir
    if (i === -1 || j < 0 || j >= ids.length) return
    const next = [...ids]
    ;[next[i], next[j]] = [next[j], next[i]]
    commitDeckOrder(next)
  }

  const addToDeck = (sceneId) => {
    const deckIds = deckScenes.map(s => s.id)
    const rest = libraryScenes.map(s => s.id).filter(id => id !== sceneId)
    onUpdateOrder([...deckIds, sceneId, ...rest])
    onToggle(sceneId)
  }

  const removeFromDeck = (sceneId) => {
    if (deckScenes.length <= 1) return
    onToggle(sceneId)
  }

  const handleExportAll = () => {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      scenes: {
        enabled: enabledSceneIds,
        order: scenes.map(s => s.id),
        durations: customDurations,
        metadata: sceneMetadata,
        activePreset
      },
      team: teamConfig
    }

    const dataStr = JSON.stringify(config, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `presentation-config-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportAll = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const config = JSON.parse(e.target.result)
        
        // Import scene configuration. orderVersion must be stamped, or the
        // version check in useSceneConfiguration treats the import as stale and
        // rebuilds order/enabledIds from the default preset — silently dropping
        // the imported flow.
        if (config.scenes) {
          const sceneConfig = {
            enabledIds: config.scenes.enabled || [],
            order: config.scenes.order || [],
            durations: config.scenes.durations || {},
            sceneMetadata: config.scenes.metadata || {},
            activePreset: config.scenes.activePreset || CUSTOM_PRESET_ID,
            orderVersion: ORDER_VERSION
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(sceneConfig))
        }

        // Import team configuration
        if (config.team) {
          // Enforce maximum of 15 team members
          const teamConfigToImport = {
            ...config.team,
            members: config.team.members?.slice(0, 15) || []
          }
          updateTeamConfig(teamConfigToImport)
        }

        // Reload to apply changes
        window.location.reload()
      } catch (err) {
        alert('Invalid configuration file. Please check the JSON format.')
        console.error('Import error:', err)
      }
    }
    reader.readAsText(file)
    event.target.value = '' // Reset input
  }

  // Total presentation time — sums only explicitly-set durations (opt-in).
  const totalTime = deckScenes.reduce((acc, s) => acc + parseMinutes(customDurations?.[s.id]), 0)

  return (
    <>
      {/* Settings Button - only show if not externally controlled */}
      {externalIsOpen === undefined && (
        <button
          onClick={() => setIsOpen(true)}
          className={`fixed bottom-24 right-8 z-40 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg hover:scale-110 ${
            isDark 
              ? 'bg-elastic-teal/20 hover:bg-elastic-teal/30 text-elastic-teal' 
              : 'bg-elastic-blue/10 hover:bg-elastic-blue/20 text-elastic-blue'
          }`}
          title="Settings"
        >
          <FontAwesomeIcon icon={faGear} className="text-lg" />
        </button>
      )}

      {/* Settings Panel - Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-200"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Settings Panel - Content */}
      {isOpen && (
        <div
          className={`fixed right-0 top-0 bottom-0 w-[1240px] max-w-[95vw] z-50 shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ${
            isDark ? 'bg-elastic-dev-blue' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`p-6 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                  Settings
                </h2>
                <p className={`text-sm mt-1 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  {activeTab === 'scenes' 
                    ? `${enabledCount} of ${totalCount} scenes${totalTime > 0 ? ` • ~${totalTime} min total` : ''}`
                    : activeTab === 'team'
                    ? 'Customize your team'
                    : 'Customize scene content'}
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isDark ? 'hover:bg-white/10 text-white/60' : 'hover:bg-elastic-dev-blue/10 text-elastic-dev-blue/60'
                }`}
              >
                <FontAwesomeIcon icon={faXmark} className="text-xl" />
              </button>
            </div>

            {/* Import/Export Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={handleExportAll}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  isDark 
                    ? 'bg-white/10 hover:bg-white/20 text-white/70' 
                    : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/70'
                }`}
              >
                <FontAwesomeIcon icon={faDownload} />
                Export All
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  isDark 
                    ? 'bg-white/10 hover:bg-white/20 text-white/70' 
                    : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/70'
                }`}
              >
                <FontAwesomeIcon icon={faUpload} />
                Import All
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImportAll}
                className="hidden"
              />
            </div>

            {/* Tab Buttons */}
            <div className={`flex gap-2 p-1 rounded-xl ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
              <button
                onClick={() => setActiveTab('scenes')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'scenes'
                    ? isDark 
                      ? 'bg-elastic-teal text-elastic-dev-blue' 
                      : 'bg-elastic-blue text-white'
                    : isDark 
                      ? 'text-white/60 hover:text-white/80' 
                      : 'text-elastic-dev-blue/60 hover:text-elastic-dev-blue/80'
                }`}
              >
                <FontAwesomeIcon icon={faSliders} />
                Scenes & Agenda
              </button>
              <button
                onClick={() => setActiveTab('team')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'team'
                    ? isDark 
                      ? 'bg-elastic-teal text-elastic-dev-blue' 
                      : 'bg-elastic-blue text-white'
                    : isDark 
                      ? 'text-white/60 hover:text-white/80' 
                      : 'text-elastic-dev-blue/60 hover:text-elastic-dev-blue/80'
                }`}
              >
                <FontAwesomeIcon icon={faUsers} />
                Team
              </button>
              <button
                onClick={() => {
                  setDeckBuilderFocusId(deckScenes[0]?.id || null)
                  setDeckBuilderViewMode('content')
                  setDeckBuilderOpen(true)
                }}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  isDark
                    ? 'text-white/60 hover:text-white/80'
                    : 'text-elastic-dev-blue/60 hover:text-elastic-dev-blue/80'
                }`}
              >
                <FontAwesomeIcon icon={faPalette} />
                Content
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'scenes' ? (
              <>
                {/* Presentation flow presets */}
                {presets.length > 0 && (
                  <div className={`mb-4 rounded-xl border p-4 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                        <FontAwesomeIcon icon={faSliders} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
                        Default Flows
                      </span>
                      {activePreset === CUSTOM_PRESET_ID && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60'}`}>
                          Custom
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {presets.map((preset) => {
                        const isActive = activePreset === preset.id
                        return (
                          <button
                            key={preset.id}
                            onClick={() => onApplyPreset?.(preset.id)}
                            className={`text-left rounded-lg border p-3 transition-all ${
                              isActive
                                ? isDark
                                  ? 'border-elastic-teal/60 bg-elastic-teal/10'
                                  : 'border-elastic-blue/50 bg-elastic-blue/10'
                                : isDark
                                  ? 'border-white/10 bg-white/[0.02] hover:border-white/25'
                                  : 'border-elastic-dev-blue/10 bg-white hover:border-elastic-dev-blue/25'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className={`text-sm font-bold ${isActive ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : (isDark ? 'text-white' : 'text-elastic-dark-ink')}`}>
                                {preset.label}
                              </span>
                              {isActive && <FontAwesomeIcon icon={faCheck} className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />}
                            </div>
                            <p className={`text-[11px] leading-snug mt-1 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                              {preset.description}
                            </p>
                          </button>
                        )
                      })}
                    </div>
                    <p className={`text-[11px] mt-2.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Applying a flow re-enables and reorders scenes. Your durations and content edits are kept; toggling or reordering switches to Custom.
                    </p>
                  </div>
                )}

                {/* Agenda / Session Schedule editor (collapsible) */}
                <div className={`mb-4 rounded-xl border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                  <button
                    onClick={() => setShowAgendaEditor((v) => !v)}
                    className="w-full px-4 py-3 flex items-center justify-between"
                  >
                    <span className={`text-sm font-semibold flex items-center gap-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                      <FontAwesomeIcon icon={faClock} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
                      Session Schedule (Agenda)
                    </span>
                    <FontAwesomeIcon
                      icon={faChevronDown}
                      className={`text-xs transition-transform ${showAgendaEditor ? 'rotate-180' : ''} ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}
                    />
                  </button>
                  {showAgendaEditor && (
                    <div className={`px-4 pb-4 pt-1 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      <AgendaEditor
                        isDark={isDark}
                        scenes={scenes}
                        sceneMetadata={sceneMetadata}
                        onUpdateSceneMetadata={onUpdateSceneMetadata}
                      />
                    </div>
                  )}
                </div>

                {/* Deck builder */}
                <div className={`mb-4 rounded-xl border p-4 ${isDark ? 'border-elastic-teal/30 bg-elastic-teal/[0.06]' : 'border-elastic-blue/30 bg-elastic-blue/[0.05]'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>Deck</p>
                      <p className={`text-xs ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                        {deckScenes.length} scene{deckScenes.length === 1 ? '' : 's'}
                        {totalTime > 0 ? ` · ~${totalTime} min` : ''}
                        {libraryScenes.length > 0 ? ` · ${libraryScenes.length} in library` : ''}
                        {' · preview, notes, reorder'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={onReset}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                          isDark
                            ? 'bg-white/10 hover:bg-white/20 text-white/70'
                            : 'bg-elastic-dev-blue/10 hover:bg-elastic-dev-blue/20 text-elastic-dev-blue/70'
                        }`}
                      >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        Reset
                      </button>
                      <button
                        onClick={() => {
                          setDeckBuilderFocusId(deckScenes[0]?.id || null)
                          setDeckBuilderViewMode('edit')
                          setDeckBuilderOpen(true)
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                          isDark ? 'bg-elastic-teal text-elastic-dev-blue hover:bg-elastic-teal/90' : 'bg-elastic-blue text-white hover:bg-elastic-blue/90'
                        }`}
                      >
                        <FontAwesomeIcon icon={faLayerGroup} />
                        Open Deck Builder
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <TeamEditorPanel isDark={isDark} />
            )}
          </div>
        </div>
      )}

      {deckBuilderOpen && (
        <DeckBuilder
          scenes={scenes}
          deckScenes={deckScenes}
          libraryScenes={libraryScenes}
          customDurations={customDurations}
          sceneMetadata={sceneMetadata}
          onUpdateDuration={onUpdateDuration}
          onUpdateSceneMetadata={onUpdateSceneMetadata}
          onAdd={addToDeck}
          onRemove={removeFromDeck}
          onMoveUp={(id) => moveInDeck(id, -1)}
          onMoveDown={(id) => moveInDeck(id, 1)}
          onReorder={reorderDeck}
          onReset={onReset}
          onClose={() => setDeckBuilderOpen(false)}
          initialSceneId={deckBuilderFocusId}
          initialViewMode={deckBuilderViewMode}
          totalTime={totalTime}
        />
      )}
    </>
  )
}

// Agenda / Session Schedule editor — lives in the "Scenes & Agenda" tab
function AgendaEditor({ isDark, scenes = [], sceneMetadata, onUpdateSceneMetadata }) {
  const inputBase = `px-3 py-2 text-sm rounded-lg border ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`
  const inputClass = `w-full ${inputBase}`

  const agenda = sceneMetadata?.agenda || {}
  const agendaItems = Array.isArray(agenda.items) && agenda.items.length ? agenda.items : DEFAULT_AGENDA_ITEMS
  const sceneById = new Map(scenes.map((s) => [s.id, s]))
  const sceneLabel = (s) => sceneMetadata?.[s.id]?.title || s.title
  const labelFor = (id) => {
    const s = sceneById.get(id)
    return s ? sceneLabel(s) : id
  }

  const updateAgenda = (patch) => onUpdateSceneMetadata('agenda', { ...agenda, ...patch })
  const updateItems = (items) => updateAgenda({ items })
  const updateBlock = (i, patch) => updateItems(agendaItems.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const addBlock = () => updateItems([...agendaItems, { time: '', title: '', sceneIds: [] }])
  const removeBlock = (i) => updateItems(agendaItems.filter((_, idx) => idx !== i))
  const moveBlock = (i, dir) => {
    const j = i + dir
    if (j < 0 || j >= agendaItems.length) return
    const copy = [...agendaItems]
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
    updateItems(copy)
  }
  const addScene = (i, sceneId) => updateBlock(i, { sceneIds: [...(agendaItems[i].sceneIds || []), sceneId] })
  const removeScene = (i, sceneId) => updateBlock(i, { sceneIds: (agendaItems[i].sceneIds || []).filter((id) => id !== sceneId) })
  const moveScene = (i, idx, dir) => {
    const ids = [...(agendaItems[i].sceneIds || [])]
    const j = idx + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[idx], ids[j]] = [ids[j], ids[idx]]
    updateBlock(i, { sceneIds: ids })
  }

  const iconBtn = `w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all ${
    isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'
  }`
  const smIconBtn = `w-6 h-6 rounded-md flex items-center justify-center text-[10px] transition-all ${
    isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'
  }`

  // The displayed time is a range string ("8:00 – 8:15"); the pickers are native
  // single-time inputs (HH:MM), so we convert to/from that format.
  const toInputTime = (str) => {
    const m = (str || '').trim().match(/^(\d{1,2}):(\d{2})/)
    return m ? `${String(m[1]).padStart(2, '0')}:${m[2]}` : ''
  }
  const toDisplayTime = (val) => {
    if (!val) return ''
    const [h, mm] = val.split(':')
    return `${parseInt(h, 10)}:${mm}`
  }
  const parseRange = (time) => {
    const parts = (time || '').split(/[–-]/)
    return { start: toInputTime(parts[0]), end: toInputTime(parts[1]) }
  }
  const composeRange = (start, end) => {
    const s = toDisplayTime(start)
    const e = toDisplayTime(end)
    return s && e ? `${s} – ${e}` : s || e || ''
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
          Edit the session schedule shown on the Agenda scene
        </p>
        <button
          onClick={() => updateItems(JSON.parse(JSON.stringify(DEFAULT_AGENDA_ITEMS)))}
          className={`text-xs px-2 py-1 rounded-lg flex items-center gap-1.5 ${isDark ? 'bg-white/10 text-white/60 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/60 hover:bg-elastic-dev-blue/20'}`}
          title="Reset to the default roadshow schedule"
        >
          <FontAwesomeIcon icon={faRotateLeft} className="text-[10px]" />
          Reset schedule
        </button>
      </div>

      {/* Header text */}
      <div>
        <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
        <input
          type="text"
          value={agenda.eyebrow || ''}
          onChange={(e) => updateAgenda({ eyebrow: e.target.value })}
          className={inputClass}
          placeholder="Session Schedule"
        />
      </div>
      <div>
        <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
        <input
          type="text"
          value={agenda.subtitle || ''}
          onChange={(e) => updateAgenda({ subtitle: e.target.value })}
          className={inputClass}
          placeholder="Date · Time · Venue"
        />
      </div>

      {/* Time blocks */}
      <div>
        <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
          Time Blocks
        </label>
        <div className="space-y-3">
          {agendaItems.map((block, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 space-y-2 ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'}`}
            >
              {/* Row: reorder/delete + time */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-1">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className={`${iconBtn} ${i === 0 ? 'opacity-30 cursor-not-allowed' : ''}`} title="Move up">
                    <FontAwesomeIcon icon={faArrowUp} />
                  </button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === agendaItems.length - 1} className={`${iconBtn} ${i === agendaItems.length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`} title="Move down">
                    <FontAwesomeIcon icon={faArrowDown} />
                  </button>
                </div>
                {(() => {
                  const { start, end } = parseRange(block.time)
                  return (
                    <div className="flex-shrink-0 flex items-center gap-1.5">
                      <input
                        type="time"
                        value={start}
                        onChange={(e) => updateBlock(i, { time: composeRange(e.target.value, end) })}
                        className={`${inputBase} w-32`}
                      />
                      <span className={`text-sm ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>–</span>
                      <input
                        type="time"
                        value={end}
                        onChange={(e) => updateBlock(i, { time: composeRange(start, e.target.value) })}
                        className={`${inputBase} w-32`}
                      />
                    </div>
                  )
                })()}
                <div className="flex-1 space-y-1.5">
                  <input
                    type="text"
                    value={block.title || ''}
                    onChange={(e) => updateBlock(i, { title: e.target.value })}
                    className={inputClass}
                    placeholder="Block title"
                  />
                  <input
                    type="text"
                    value={block.subtitle || ''}
                    onChange={(e) => updateBlock(i, { subtitle: e.target.value })}
                    className={inputClass}
                    placeholder="Additional title (optional)"
                  />
                </div>
                <button onClick={() => removeBlock(i)} className={`${iconBtn} hover:!bg-red-500/20 hover:!text-red-400`} title="Remove block">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </div>

              {/* Selected scenes — ordered list */}
              <div>
                <p className={`text-[10px] mb-1.5 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/40'}`}>
                  Scenes shown when this block is expanded (in order)
                </p>
                {(block.sceneIds || []).length === 0 ? (
                  <p className={`text-[10px] italic ${isDark ? 'text-white/25' : 'text-elastic-dev-blue/30'}`}>
                    No scenes selected
                  </p>
                ) : (
                  <div className="space-y-1">
                    {(block.sceneIds || []).map((id, idx) => (
                      <div
                        key={id}
                        className={`flex items-center gap-2 px-2 py-1 rounded-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-elastic-dev-blue/5 border-elastic-dev-blue/10'}`}
                      >
                        <span className={`text-[10px] font-mono w-4 text-center flex-shrink-0 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{idx + 1}</span>
                        <span className={`flex-1 min-w-0 truncate text-[11px] ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>{labelFor(id)}</span>
                        <button onClick={() => moveScene(i, idx, -1)} disabled={idx === 0} className={`${smIconBtn} ${idx === 0 ? 'opacity-30 cursor-not-allowed' : ''}`} title="Move up">
                          <FontAwesomeIcon icon={faArrowUp} />
                        </button>
                        <button onClick={() => moveScene(i, idx, 1)} disabled={idx === (block.sceneIds || []).length - 1} className={`${smIconBtn} ${idx === (block.sceneIds || []).length - 1 ? 'opacity-30 cursor-not-allowed' : ''}`} title="Move down">
                          <FontAwesomeIcon icon={faArrowDown} />
                        </button>
                        <button onClick={() => removeScene(i, id)} className={`${smIconBtn} hover:!bg-red-500/20 hover:!text-red-400`} title="Remove scene">
                          <FontAwesomeIcon icon={faXmark} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add a scene */}
              {scenes.some((s) => !(block.sceneIds || []).includes(s.id)) && (
                <div>
                  <p className={`text-[10px] mb-1.5 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/40'}`}>Add a scene</p>
                  <div className="flex flex-wrap gap-1.5">
                    {scenes
                      .filter((s) => !(block.sceneIds || []).includes(s.id))
                      .map((s) => (
                        <button
                          key={s.id}
                          onClick={() => addScene(i, s.id)}
                          className={`text-[11px] px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                            isDark
                              ? 'bg-white/5 border-white/10 text-white/40 hover:text-white/70'
                              : 'bg-elastic-dev-blue/5 border-elastic-dev-blue/10 text-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'
                          }`}
                        >
                          <FontAwesomeIcon icon={faPlus} className="text-[8px]" />
                          {sceneLabel(s)}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addBlock}
          className={`mt-3 w-full py-2 rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs transition-all ${
            isDark ? 'border-white/20 text-white/50 hover:text-white/80 hover:border-white/40' : 'border-elastic-dev-blue/20 text-elastic-dev-blue/50 hover:text-elastic-dev-blue/80 hover:border-elastic-dev-blue/40'
          }`}
        >
          <FontAwesomeIcon icon={faPlus} className="text-[10px]" />
          Add time block
        </button>
      </div>
    </div>
  )
}
