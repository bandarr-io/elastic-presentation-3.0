import { useState, useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTeamConfig } from '../context/TeamContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faGear, faXmark, faEye, faEyeSlash, faRotateLeft, faClock, faCheck,
  faUsers, faSliders, faPlus, faTrash, faGripVertical, faChevronDown,
  faDownload, faUpload, faImage, faPalette, faArrowUp, faArrowDown
} from '@fortawesome/free-solid-svg-icons'
import { DEFAULT_AGENDA_ITEMS } from '../data/agendaDefaults'
import { DECK_PRESETS, DEFAULT_PRESET_ID, CUSTOM_PRESET_ID, presetConfig } from '../data/deckPresets'

import ElasticValueEditor from './sceneEditors/ElasticValueEditor'
import ValueByTeamEditor from './sceneEditors/ValueByTeamEditor'
import SecurityUseCasesEditor from './sceneEditors/SecurityUseCasesEditor'
import AIAssistantEditor from './sceneEditors/AIAssistantEditor'
import LogsDBEditor from './sceneEditors/LogsDBEditor'
import CustomerArchitectEditor from './sceneEditors/CustomerArchitectEditor'
import PlatformOperationsEditor from './sceneEditors/PlatformOperationsEditor'
import PlatformValueEditor from './sceneEditors/PlatformValueEditor'
import ProblemPatternsEditor from './sceneEditors/ProblemPatternsEditor'
import SecurityNarrativeVisualEditor from './sceneEditors/SecurityNarrativeVisualEditor'
import LicensingEditor from './sceneEditors/LicensingEditor'
import DataTieringEditor from './sceneEditors/DataTieringEditor'
import SecurityEditor from './sceneEditors/SecurityEditor'
import IconSelect from './sceneEditors/IconSelect'

// Scenes whose content editors live in ./sceneEditors as standalone modules.
// Each receives ({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }).
const MODULAR_SCENE_EDITORS = {
  'elastic-value': ElasticValueEditor,
  'value-by-team': ValueByTeamEditor,
  'security-use-cases': SecurityUseCasesEditor,
  'ai-assistant': AIAssistantEditor,
  'logsdb': LogsDBEditor,
  'customer-architect': CustomerArchitectEditor,
  'platform-operations': PlatformOperationsEditor,
  'platform-value': PlatformValueEditor,
  'problem-patterns': ProblemPatternsEditor,
  'security-narrative-visual': SecurityNarrativeVisualEditor,
  'licensing': LicensingEditor,
  'data-tiering': DataTieringEditor,
  'security': SecurityEditor,
}

const STORAGE_KEY = 'presentation-scene-config'

// Bump whenever the canonical default scene order / enabled set changes. On a
// version mismatch we adopt the new order + enabled defaults while preserving
// the user's own durations and scene metadata.
const ORDER_VERSION = 6

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

const DEFAULT_TOOLS = [
  { name: 'Splunk',      category: 'SIEM',      type: 'consolidate' },
  { name: 'QRadar',      category: 'SIEM',      type: 'consolidate' },
  { name: 'Datadog',     category: 'APM',       type: 'consolidate' },
  { name: 'CrowdStrike', category: 'EDR',       type: 'consolidate' },
  { name: 'Snowflake',   category: 'Data',      type: 'consolidate' },
  { name: 'Pinecone',    category: 'Vector',    type: 'consolidate' },
  { name: 'Palo Alto',   category: 'Firewall',  type: 'integrate'   },
  { name: 'Okta',        category: 'Identity',  type: 'integrate'   },
  { name: 'ServiceNow',  category: 'ITSM',      type: 'integrate'   },
  { name: 'Tines',       category: 'SOAR',      type: 'integrate'   },
  { name: 'Zscaler',     category: 'ZeroTrust', type: 'integrate'   },
  { name: 'Databricks',  category: 'Analytics', type: 'integrate'   },
]

function ConsolidationToolEditor({ metadata, onUpdate, isDark, inputClass }) {
  const tools = metadata.tools || DEFAULT_TOOLS

  const updateTool = (index, field, value) => {
    const updated = tools.map((t, i) => i === index ? { ...t, [field]: value } : t)
    onUpdate(updated)
  }

  const addTool = (type) => {
    if (tools.length >= 12) return
    onUpdate([...tools, { name: '', category: '', type }])
  }

  const removeTool = (index) => {
    onUpdate(tools.filter((_, i) => i !== index))
  }

  const resetTools = () => onUpdate(DEFAULT_TOOLS)

  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const typeBtn = (tool, index, type) => (
    <button
      key={type}
      onClick={() => updateTool(index, 'type', type)}
      className={`px-2 py-0.5 rounded text-xs font-medium transition-all ${
        tool.type === type
          ? isDark ? 'bg-elastic-teal text-elastic-dev-blue' : 'bg-elastic-blue text-white'
          : isDark ? 'bg-white/10 text-white/50 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/40 hover:bg-elastic-dev-blue/20'
      }`}
    >
      {type === 'consolidate' ? 'Replace' : 'Integrate'}
    </button>
  )

  return (
    <div className="pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Tools ({tools.length}/12)</label>
        <button onClick={resetTools} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'text-white/40 hover:text-white/70' : 'text-elastic-dev-blue/40 hover:text-elastic-dev-blue/70'}`}>
          Reset defaults
        </button>
      </div>

      <div className="space-y-4">
        {/* Replace row */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Replace</p>
          <div className="grid grid-cols-6 gap-2">
            {tools.map((tool, i) => tool.type !== 'consolidate' ? null : (
              <div key={i} className={`p-2 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10'}`}>
                <input
                  type="text"
                  value={tool.name}
                  onChange={(e) => updateTool(i, 'name', e.target.value)}
                  placeholder="Tool name"
                  className={`w-full px-2 py-1 text-xs rounded border mb-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'}`}
                />
                <input
                  type="text"
                  value={tool.category}
                  onChange={(e) => updateTool(i, 'category', e.target.value)}
                  placeholder="Category"
                  className={`w-full px-2 py-1 text-xs rounded border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Integrate row */}
        <div>
          <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Integrate</p>
          <div className="grid grid-cols-6 gap-2">
            {tools.map((tool, i) => tool.type !== 'integrate' ? null : (
              <div key={i} className={`p-2 rounded-lg border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-elastic-dev-blue/[0.02] border-elastic-dev-blue/10'}`}>
                <input
                  type="text"
                  value={tool.name}
                  onChange={(e) => updateTool(i, 'name', e.target.value)}
                  placeholder="Tool name"
                  className={`w-full px-2 py-1 text-xs rounded border mb-1.5 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'}`}
                />
                <input
                  type="text"
                  value={tool.category}
                  onChange={(e) => updateTool(i, 'category', e.target.value)}
                  placeholder="Category"
                  className={`w-full px-2 py-1 text-xs rounded border ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-white/30' : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'}`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function SceneItem({ 
  scene, 
  index, 
  isEnabled, 
  isLastEnabled, 
  onToggle, 
  customDuration, 
  onUpdateDuration,
  sceneMetadata,
  onUpdateSceneMetadata,
  onReorder,
  isDark 
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditingDuration, setIsEditingDuration] = useState(false)
  const [durationValue, setDurationValue] = useState(customDuration || scene.duration || '')
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDurationSubmit = () => {
    onUpdateDuration(scene.id, durationValue)
    setIsEditingDuration(false)
  }

  const handleDragStart = (e) => {
    setIsDragging(true)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', scene.id)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId !== scene.id) {
      onReorder(draggedId, scene.id)
    }
  }

  const displayDuration = customDuration || scene.duration
  const metadata = sceneMetadata?.[scene.id] || {}
  const displayTitle = metadata.title || scene.title
  const displayDescription = metadata.description || ''
  const hasExpandableContent = true

  const inputClass = `w-full px-3 py-2 text-sm rounded-lg border ${
    isDark
      ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
      : 'bg-white border-elastic-dev-blue/10 text-elastic-dev-blue placeholder-elastic-dev-blue/30'
  }`

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-xl transition-all ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      } ${
        isDragOver ? (isDark ? 'ring-2 ring-elastic-teal' : 'ring-2 ring-elastic-blue') : ''
      } ${
        isEnabled
          ? isDark 
            ? 'bg-elastic-teal/20 border-2 border-elastic-teal/50' 
            : 'bg-elastic-blue/10 border-2 border-elastic-blue/30'
          : isDark
            ? 'bg-white/[0.03] border-2 border-transparent'
            : 'bg-elastic-dev-blue/[0.03] border-2 border-transparent'
      }`}
    >
      {/* Header - Always Visible */}
      <div className="p-4 flex items-center gap-3">
        {/* Drag Handle */}
        <div className={`cursor-grab active:cursor-grabbing p-1 ${
          isDark ? 'text-white/30 hover:text-white/60' : 'text-elastic-dev-blue/30 hover:text-elastic-dev-blue/60'
        }`}>
          <FontAwesomeIcon icon={faGripVertical} className="text-sm" />
        </div>
        {/* Toggle Button */}
        <button
          onClick={() => !isLastEnabled && onToggle(scene.id)}
          disabled={isLastEnabled}
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
            isEnabled
              ? isDark
                ? 'bg-elastic-teal text-elastic-dev-blue'
                : 'bg-elastic-blue text-white'
              : isDark ? 'bg-white/10 text-white/40 hover:bg-white/20' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/40 hover:bg-elastic-dev-blue/20'
          } ${isLastEnabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <FontAwesomeIcon icon={isEnabled ? faEye : faEyeSlash} className="text-sm" />
        </button>

        {/* Scene Info */}
        <button
          onClick={() => hasExpandableContent && setIsExpanded(!isExpanded)}
          className={`flex-1 min-w-0 text-left flex items-center gap-2 ${hasExpandableContent ? 'cursor-pointer' : ''}`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className={`text-xs font-mono px-2 py-0.5 rounded ${
              isDark ? 'bg-white/10 text-white/50' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/50'
            }`}>
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className={`font-semibold truncate ${
                  isEnabled
                    ? isDark ? 'text-white' : 'text-elastic-dev-blue'
                    : isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'
                }`}>
                  {displayTitle}
                </h3>
                {metadata.group && (
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    isDark ? 'bg-elastic-blue/20 text-elastic-blue' : 'bg-elastic-blue/10 text-elastic-blue'
                  }`}>
                    {metadata.group}
                  </span>
                )}
              </div>
              {displayDescription && (
                <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                  {displayDescription}
                </p>
              )}
            </div>
          </div>
          {hasExpandableContent && (
            <FontAwesomeIcon 
              icon={faChevronDown} 
              className={`text-xs transition-transform ${
                isExpanded ? 'rotate-180' : ''
              } ${
                isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'
              }`}
            />
          )}
        </button>

        {/* Duration Editor */}
        <div className="flex-shrink-0">
          {isEditingDuration ? (
            <div className="flex items-center gap-1">
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
                className={`w-20 px-2 py-1 text-xs rounded border ${
                  isDark 
                    ? 'bg-white/10 border-white/20 text-white' 
                    : 'bg-white border-elastic-dev-blue/20 text-elastic-dev-blue'
                }`}
                placeholder="e.g. 5 min"
              />
              <button
                onClick={handleDurationSubmit}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  isDark ? 'bg-elastic-teal text-elastic-dev-blue' : 'bg-elastic-blue text-white'
                }`}
              >
                <FontAwesomeIcon icon={faCheck} className="text-xs" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingDuration(true)}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-all ${
                isDark 
                  ? 'bg-white/10 text-white/50 hover:bg-white/20 hover:text-white/70' 
                  : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/50 hover:bg-elastic-dev-blue/20'
              }`}
              title="Click to edit duration"
            >
              <FontAwesomeIcon icon={faClock} className="text-[10px]" />
              {displayDuration || 'Set time'}
            </button>
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className={`px-4 pb-4 pt-0 space-y-3 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
          <div className="pt-3">
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Scene Title
            </label>
            <input
              type="text"
              value={displayTitle}
              onChange={(e) => onUpdateSceneMetadata(scene.id, { title: e.target.value })}
              className={inputClass}
              placeholder={scene.title}
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Used in the nav bar and the agenda's expanded scene list.
            </p>
          </div>
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
  const { theme } = useTheme()
  const { teamConfig, updateTeamConfig } = useTeamConfig()
  const isDark = theme === 'dark'
  const fileInputRef = useRef(null)

  const enabledCount = enabledSceneIds.length
  const totalCount = scenes.length

  const handleReorder = (draggedId, targetId) => {
    const sceneIds = scenes.map(s => s.id)
    const draggedIndex = sceneIds.indexOf(draggedId)
    const targetIndex = sceneIds.indexOf(targetId)
    
    if (draggedIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...sceneIds]
      newOrder.splice(draggedIndex, 1)
      newOrder.splice(targetIndex, 0, draggedId)
      onUpdateOrder(newOrder)
    }
  }

  const handleExportAll = () => {
    const config = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      scenes: {
        enabled: enabledSceneIds,
        order: scenes.map(s => s.id),
        durations: customDurations,
        metadata: sceneMetadata
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
        
        // Import scene configuration
        if (config.scenes) {
          const sceneConfig = {
            enabledIds: config.scenes.enabled || [],
            order: config.scenes.order || [],
            durations: config.scenes.durations || {},
            sceneMetadata: config.scenes.metadata || {}
          }
          localStorage.setItem('presentation-scene-config', JSON.stringify(sceneConfig))
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

  // Calculate total presentation time
  const totalTime = scenes
    .filter(s => enabledSceneIds.includes(s.id))
    .reduce((acc, s) => {
      const duration = customDurations?.[s.id] || s.duration || ''
      const match = duration.match(/(\d+)/)
      return acc + (match ? parseInt(match[1]) : 0)
    }, 0)

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
          className={`fixed right-0 top-0 bottom-0 w-[960px] z-50 shadow-2xl overflow-hidden flex flex-col transition-transform duration-300 ${
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
                    ? `${enabledCount} of ${totalCount} scenes • ~${totalTime} min total`
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
                onClick={() => setActiveTab('customizations')}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                  activeTab === 'customizations'
                    ? isDark 
                      ? 'bg-elastic-teal text-elastic-dev-blue' 
                      : 'bg-elastic-blue text-white'
                    : isDark 
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

                {/* Instructions & Reset */}
                <div className="mb-4 flex items-center justify-between">
                  <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                    Drag to reorder • Click to expand • Eye to toggle
                  </p>
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
                </div>

                {/* Scene List */}
                <div className="space-y-2">
                  {scenes.map((scene, index) => {
                    const isEnabled = enabledSceneIds.includes(scene.id)
                    const isLastEnabled = isEnabled && enabledCount === 1

                    return (
                      <SceneItem
                        key={scene.id}
                        scene={scene}
                        index={index}
                        isEnabled={isEnabled}
                        isLastEnabled={isLastEnabled}
                        onToggle={onToggle}
                        customDuration={customDurations?.[scene.id]}
                        onUpdateDuration={onUpdateDuration}
                        sceneMetadata={sceneMetadata}
                        onUpdateSceneMetadata={onUpdateSceneMetadata}
                        onReorder={handleReorder}
                        isDark={isDark}
                      />
                    )
                  })}
                </div>
              </>
            ) : activeTab === 'team' ? (
              <TeamEditorPanel isDark={isDark} />
            ) : (
              <CustomizationsPanel 
                isDark={isDark} 
                sceneMetadata={sceneMetadata}
                onUpdateSceneMetadata={onUpdateSceneMetadata}
              />
            )}
          </div>
        </div>
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

// Customizations Panel Component
function CustomizationsPanel({ isDark, sceneMetadata, onUpdateSceneMetadata }) {
  const [selectedScene, setSelectedScene] = useState('about')

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

  const problemPatterns = sceneMetadata?.['problem-patterns'] || {}

  const handleProblemUpdate = (category, index, value) => {
    const currentProblems = problemPatterns.problems || {}
    const categoryProblems = currentProblems[category] || []
    const newCategoryProblems = [...categoryProblems]
    newCategoryProblems[index] = value
    
    onUpdateSceneMetadata('problem-patterns', {
      ...problemPatterns,
      problems: {
        ...currentProblems,
        [category]: newCategoryProblems
      }
    })
  }

  return (
    <div className="space-y-4">
      <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
        Customize text content for your scenes
      </p>

      {/* Scene Selector */}
      <div>
        <label className={`text-xs mb-2 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
          Select Scene
        </label>
        <select
          value={selectedScene}
          onChange={(e) => setSelectedScene(e.target.value)}
          className={inputClass}
        >
          <option value="hero">Hero</option>
          <option value="about">About Elastic</option>
          <option value="business-value">Business Value</option>
          <option value="elastic-value">Metrics Dashboard</option>
          <option value="value-by-team">Card Grid</option>
          <option value="security-use-cases">Visual Gallery</option>
          <option value="unified-strategy">Platform Overview</option>
          <option value="ai-assistant">AI Capability Map</option>
          <option value="security-narrative-visual">Security: Why Now</option>
          <option value="security">Security</option>
          <option value="licensing">Licensing</option>
          <option value="customer-architect">Customer Architect</option>
          <option value="services">Services</option>
          <option value="next-steps">Next Steps</option>
          <option value="panel">Panel</option>
          <option value="problem-patterns">Problem Patterns</option>
          <option value="data-explosion">Data Explosion</option>
          <option value="logsdb">LogsDB</option>
          <option value="data-mesh">Data Mesh</option>
          <option value="cross-cluster">Cross-Cluster</option>
          <option value="schema">Schema</option>
          <option value="access-control">Access Control</option>
          <option value="data-tiering">Data Tiering</option>
          <option value="consolidation">Consolidation</option>
          <option value="esql">ES|QL</option>
          <option value="platform-operations">Deployment Models</option>
          <option value="platform-value">Platform Value</option>
        </select>
      </div>

      {selectedScene === 'hero' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Hero Content
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Text Alignment
            </label>
            <select
              value={sceneMetadata?.hero?.align || 'left'}
              onChange={(e) => onUpdateSceneMetadata('hero', { ...sceneMetadata?.hero, align: e.target.value })}
              className={inputClass}
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
            </select>
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Alignment of the revealed banner (logo, title, subtitle)
            </p>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Typing Text
            </label>
            <input
              type="text"
              value={sceneMetadata?.hero?.typingText || ''}
              onChange={(e) => onUpdateSceneMetadata('hero', { ...sceneMetadata?.hero, typingText: e.target.value })}
              className={inputClass}
              placeholder="The Elastic Search AI Platform"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Text that types out in the search bar animation
            </p>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Banner Title
            </label>
            <input
              type="text"
              value={sceneMetadata?.hero?.bannerTitle || ''}
              onChange={(e) => onUpdateSceneMetadata('hero', { ...sceneMetadata?.hero, bannerTitle: e.target.value })}
              className={inputClass}
              placeholder="The Elastic Search AI Platform:"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              First line of the banner title
            </p>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Banner Highlight Text
            </label>
            <input
              type="text"
              value={sceneMetadata?.hero?.bannerHighlight || ''}
              onChange={(e) => onUpdateSceneMetadata('hero', { ...sceneMetadata?.hero, bannerHighlight: e.target.value })}
              className={inputClass}
              placeholder="Transforming Data into Action"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Second line (highlighted in gradient/blue)
            </p>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Banner Subtitle
            </label>
            <input
              type="text"
              value={sceneMetadata?.hero?.bannerSubtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('hero', { ...sceneMetadata?.hero, bannerSubtitle: e.target.value })}
              className={inputClass}
              placeholder="Unleash the Power of Real-Time Insights, Scale, and Innovation"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Subtitle text below the main title
            </p>
          </div>
        </div>
      )}

      {selectedScene === 'about' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            About Elastic Content
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Eyebrow
            </label>
            <input
              type="text"
              value={sceneMetadata?.about?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('about', {
                ...sceneMetadata?.about,
                eyebrow: e.target.value
              })}
              className={inputClass}
              placeholder="Who We Are"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Subtitle
            </label>
            <textarea
              value={sceneMetadata?.about?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('about', {
                ...sceneMetadata?.about,
                subtitle: e.target.value
              })}
              className={textareaClass}
              rows={3}
              placeholder="The Search AI Company—powering search, observability, and security for thousands of organizations worldwide."
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Descriptive subtitle below the main title
            </p>
          </div>

          {/* Stats Cards */}
          <div>
            <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
              Statistics Cards
            </h4>
            <div className="grid grid-cols-2 gap-3">
            {[
              { index: 0, defaultValue: '5B+', defaultLabel: 'Downloads', defaultDesc: 'Open source downloads worldwide' },
              { index: 1, defaultValue: '54%', defaultLabel: 'Fortune 500', defaultDesc: 'Trust Elastic for their data needs' },
              { index: 2, defaultValue: '40+', defaultLabel: 'Countries', defaultDesc: 'Global presence and support' },
              { index: 3, defaultValue: '3,000+', defaultLabel: 'Employees', defaultDesc: 'Distributed across the globe' }
            ].map((stat) => (
              <div key={`stat-${stat.index}`} className={`p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Stat #{stat.index + 1}
                </p>
                <div className="space-y-2">
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Value
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.about?.stats?.[stat.index]?.value || ''}
                      onChange={(e) => {
                        const currentStats = sceneMetadata?.about?.stats || []
                        const newStats = [...currentStats]
                        newStats[stat.index] = { ...newStats[stat.index], value: e.target.value }
                        onUpdateSceneMetadata('about', {
                          ...sceneMetadata?.about,
                          stats: newStats
                        })
                      }}
                      className={inputClass}
                      placeholder={stat.defaultValue}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Label
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.about?.stats?.[stat.index]?.label || ''}
                      onChange={(e) => {
                        const currentStats = sceneMetadata?.about?.stats || []
                        const newStats = [...currentStats]
                        newStats[stat.index] = { ...newStats[stat.index], label: e.target.value }
                        onUpdateSceneMetadata('about', {
                          ...sceneMetadata?.about,
                          stats: newStats
                        })
                      }}
                      className={inputClass}
                      placeholder={stat.defaultLabel}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.about?.stats?.[stat.index]?.description || ''}
                      onChange={(e) => {
                        const currentStats = sceneMetadata?.about?.stats || []
                        const newStats = [...currentStats]
                        newStats[stat.index] = { ...newStats[stat.index], description: e.target.value }
                        onUpdateSceneMetadata('about', {
                          ...sceneMetadata?.about,
                          stats: newStats
                        })
                      }}
                      className={inputClass}
                      placeholder={stat.defaultDesc}
                    />
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Features Cards */}
          <div>
            <h4 className={`text-sm font-semibold mb-4 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
              Features Cards
            </h4>
            <div className="grid grid-cols-2 gap-3">
            {[
              { index: 0, defaultTitle: 'Search Pioneer', defaultDesc: 'Built on Apache Lucene, the gold standard for search', defaultIcon: 'magnifying-glass' },
              { index: 1, defaultTitle: 'Data at Scale', defaultDesc: 'Petabytes of data processed daily by our customers', defaultIcon: 'chart-column' },
              { index: 2, defaultTitle: 'AI-Native', defaultDesc: 'Vector search & ML built into the platform from day one', defaultIcon: 'brain' },
              { index: 3, defaultTitle: 'Open Source DNA', defaultDesc: 'Transparent, extensible, community-driven', defaultIcon: 'dna' }
            ].map((feature) => (
              <div key={`feature-${feature.index}`} className={`p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Feature #{feature.index + 1}
                </p>
                <div className="space-y-2">
                  <IconSelect
                    value={typeof sceneMetadata?.about?.features?.[feature.index]?.icon === 'string' ? sceneMetadata.about.features[feature.index].icon : feature.defaultIcon}
                    onChange={(name) => {
                      const currentFeatures = sceneMetadata?.about?.features || []
                      const newFeatures = [...currentFeatures]
                      newFeatures[feature.index] = { ...newFeatures[feature.index], icon: name }
                      onUpdateSceneMetadata('about', { ...sceneMetadata?.about, features: newFeatures })
                    }}
                    inputClass={inputClass}
                    isDark={isDark}
                  />
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Title
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.about?.features?.[feature.index]?.title || ''}
                      onChange={(e) => {
                        const currentFeatures = sceneMetadata?.about?.features || []
                        const newFeatures = [...currentFeatures]
                        newFeatures[feature.index] = { ...newFeatures[feature.index], title: e.target.value }
                        onUpdateSceneMetadata('about', {
                          ...sceneMetadata?.about,
                          features: newFeatures
                        })
                      }}
                      className={inputClass}
                      placeholder={feature.defaultTitle}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.about?.features?.[feature.index]?.description || ''}
                      onChange={(e) => {
                        const currentFeatures = sceneMetadata?.about?.features || []
                        const newFeatures = [...currentFeatures]
                        newFeatures[feature.index] = { ...newFeatures[feature.index], description: e.target.value }
                        onUpdateSceneMetadata('about', {
                          ...sceneMetadata?.about,
                          features: newFeatures
                        })
                      }}
                      className={inputClass}
                      placeholder={feature.defaultDesc}
                    />
                  </div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'business-value' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Business Value Content
          </h3>

          {/* Header */}
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input
              type="text"
              value={sceneMetadata?.['business-value']?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Business Value"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
            <input
              type="text"
              value={sceneMetadata?.['business-value']?.title || ''}
              onChange={(e) => onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], title: e.target.value })}
              className={inputClass}
              placeholder="Delivering Measurable"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Highlight</label>
            <input
              type="text"
              value={sceneMetadata?.['business-value']?.titleHighlight || ''}
              onChange={(e) => onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], titleHighlight: e.target.value })}
              className={inputClass}
              placeholder="Business Value"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <input
              type="text"
              value={sceneMetadata?.['business-value']?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], subtitle: e.target.value })}
              className={inputClass}
              placeholder="Elastic helps organizations in four key areas."
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Summary Message</label>
            <input
              type="text"
              value={sceneMetadata?.['business-value']?.summaryText || ''}
              onChange={(e) => onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], summaryText: e.target.value })}
              className={inputClass}
              placeholder="Elastic delivers tangible impact across all four areas with a unified platform."
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Appears after all four cards have been clicked
            </p>
          </div>

          {/* Value Cards */}
          <div>
            <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>Value Cards</h4>
            <div className="grid grid-cols-2 gap-3">
              {[
                { index: 0, defaultTitle: 'Risk Reduction',  defaultDesc: 'Reduce likelihood & severity of threats',  defaultDetail: 'Elastic helps reduce your attack surface, detect threats faster, and improve your overall security posture.', defaultIcon: 'shield' },
                { index: 1, defaultTitle: 'Time Efficiency', defaultDesc: 'Do more with less',                        defaultDetail: 'Elastic helps you automate manual tasks, streamline workflows, and get insights faster so your teams can focus on what matters most.', defaultIcon: 'clock' },
                { index: 2, defaultTitle: 'Resilience',      defaultDesc: 'Respond & recover faster',                 defaultDetail: 'Elastic helps you quickly identify and resolve issues, minimize downtime, and maintain business continuity even during incidents.', defaultIcon: 'rocket' },
                { index: 3, defaultTitle: 'Cost Savings',    defaultDesc: 'Reduce expenses & prevent losses',          defaultDetail: 'Elastic helps you consolidate tools, optimize resource usage, and prevent costly security breaches and operational incidents.', defaultIcon: 'coins' },
              ].map(({ index, defaultTitle, defaultDesc, defaultDetail, defaultIcon }) => {
                const cards = sceneMetadata?.['business-value']?.cards || []
                const updateCard = (field, value) => {
                  const updated = [...cards]
                  updated[index] = { ...(updated[index] || {}), [field]: value }
                  onUpdateSceneMetadata('business-value', { ...sceneMetadata?.['business-value'], cards: updated })
                }
                return (
                  <div key={index} className={`p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                    <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Card #{index + 1}</p>
                    <div className="space-y-2">
                      <IconSelect
                        value={typeof cards[index]?.icon === 'string' ? cards[index].icon : defaultIcon}
                        onChange={(name) => updateCard('icon', name)}
                        inputClass={inputClass}
                        isDark={isDark}
                      />
                      <div>
                        <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Title</label>
                        <input type="text" value={cards[index]?.title || ''} onChange={(e) => updateCard('title', e.target.value)} className={inputClass} placeholder={defaultTitle} />
                      </div>
                      <div>
                        <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Description</label>
                        <input type="text" value={cards[index]?.description || ''} onChange={(e) => updateCard('description', e.target.value)} className={inputClass} placeholder={defaultDesc} />
                      </div>
                      <div>
                        <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Detail Text</label>
                        <input type="text" value={cards[index]?.detailText || ''} onChange={(e) => updateCard('detailText', e.target.value)} className={inputClass} placeholder={defaultDetail} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'problem-patterns' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Problem Patterns Content
          </h3>

          {/* Header */}
          <div className="space-y-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
              <input
                type="text"
                value={problemPatterns.eyebrow || ''}
                onChange={(e) => onUpdateSceneMetadata('problem-patterns', { ...problemPatterns, eyebrow: e.target.value })}
                className={inputClass}
                placeholder="Problem Orientation"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
              <input
                type="text"
                value={problemPatterns.title || ''}
                onChange={(e) => onUpdateSceneMetadata('problem-patterns', { ...problemPatterns, title: e.target.value })}
                className={inputClass}
                placeholder="Common"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Highlight</label>
              <input
                type="text"
                value={problemPatterns.titleHighlight || ''}
                onChange={(e) => onUpdateSceneMetadata('problem-patterns', { ...problemPatterns, titleHighlight: e.target.value })}
                className={inputClass}
                placeholder="Problem Patterns"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
              <input
                type="text"
                value={problemPatterns.subtitle || ''}
                onChange={(e) => onUpdateSceneMetadata('problem-patterns', { ...problemPatterns, subtitle: e.target.value })}
                className={inputClass}
                placeholder="Elastic is broad, so rather than walk through everything, let's orient around the problems teams typically solve with it."
              />
            </div>
          </div>

          {/* Observability Problems */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-pink-400' : 'text-elastic-blue'}`}>
              Observability Problems
            </h4>
            {[0, 1, 2, 3].map((index) => (
              <div key={`obs-${index}`}>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Problem #{index + 1}
                </label>
                <input
                  type="text"
                  value={problemPatterns.problems?.observability?.[index] || ''}
                  onChange={(e) => handleProblemUpdate('observability', index, e.target.value)}
                  className={inputClass}
                  placeholder={
                    index === 0 ? 'Disconnected logs, metrics, traces' :
                    index === 1 ? 'MTTR stays high despite lots of data' :
                    index === 2 ? 'Tool sprawl and cost pressure' :
                    'Weak correlation to customer impact'
                  }
                />
              </div>
            ))}
          </div>

          {/* Security Problems */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-orange-400' : 'text-elastic-blue'}`}>
              Security Problems
            </h4>
            {[0, 1, 2, 3].map((index) => (
              <div key={`sec-${index}`}>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Problem #{index + 1}
                </label>
                <input
                  type="text"
                  value={problemPatterns.problems?.security?.[index] || ''}
                  onChange={(e) => handleProblemUpdate('security', index, e.target.value)}
                  className={inputClass}
                  placeholder={
                    index === 0 ? 'Alert fatigue and signal-to-noise ratio' :
                    index === 1 ? 'Blind spots across cloud and on-prem' :
                    index === 2 ? 'Tool sprawl and cost pressure' :
                    'Manual investigation slows response'
                  }
                />
              </div>
            ))}
          </div>

          {/* Search/Product Problems */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-yellow-400' : 'text-elastic-blue'}`}>
              Search / Product Problems
            </h4>
            {[0, 1, 2, 3].map((index) => (
              <div key={`search-${index}`}>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Problem #{index + 1}
                </label>
                <input
                  type="text"
                  value={problemPatterns.problems?.search?.[index] || ''}
                  onChange={(e) => handleProblemUpdate('search', index, e.target.value)}
                  className={inputClass}
                  placeholder={
                    index === 0 ? 'Slow or irrelevant search results' :
                    index === 1 ? 'Limited semantic or vector search' :
                    index === 2 ? 'Tool sprawl and cost pressure' :
                    'Difficulty scaling search infrastructure'
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedScene === 'data-explosion' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Data Explosion Content
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Eyebrow Text
            </label>
            <input
              type="text"
              value={sceneMetadata?.['data-explosion']?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('data-explosion', {
                ...sceneMetadata?.['data-explosion'],
                eyebrow: e.target.value
              })}
              className={inputClass}
              placeholder="The Challenge"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Verdict Line 1
            </label>
            <input
              type="text"
              value={sceneMetadata?.['data-explosion']?.verdictLine1 || ''}
              onChange={(e) => onUpdateSceneMetadata('data-explosion', {
                ...sceneMetadata?.['data-explosion'],
                verdictLine1: e.target.value
              })}
              className={inputClass}
              placeholder="Most data goes unsearched, unanalyzed, unutilized."
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Main punchline text (plain text, no color highlights)
            </p>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Verdict Line 2
            </label>
            <input
              type="text"
              value={sceneMetadata?.['data-explosion']?.verdictLine2 || ''}
              onChange={(e) => onUpdateSceneMetadata('data-explosion', {
                ...sceneMetadata?.['data-explosion'],
                verdictLine2: e.target.value
              })}
              className={inputClass}
              placeholder="Speed. Scale. Flexibility. Innovation demands all three — simultaneously."
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Supporting text below the punchline
            </p>
          </div>

          <div className="space-y-4">
            <h4 className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
              Stat Card Labels
            </h4>
            {[
              { index: 0, defaultEnd: '175', defaultSuffix: 'ZB', defaultLabel: 'of data generated in 2025', defaultSource: 'IDC / Seagate "Data Age 2025"' },
              { index: 1, defaultEnd: '90',  defaultSuffix: '%',  defaultLabel: 'of enterprise data is unstructured', defaultSource: 'IBM Research' },
              { index: 2, defaultEnd: '68',  defaultSuffix: '%',  defaultLabel: 'is "dark data" — never analyzed', defaultSource: 'Seagate / IDC Research' },
            ].map((stat) => (
              <div key={`de-stat-${stat.index}`} className={`p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Stat #{stat.index + 1}
                </p>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                        Number
                      </label>
                      <input
                        type="number"
                        value={sceneMetadata?.['data-explosion']?.stats?.[stat.index]?.end ?? ''}
                        onChange={(e) => {
                          const currentStats = sceneMetadata?.['data-explosion']?.stats || []
                          const newStats = [...currentStats]
                          newStats[stat.index] = { ...newStats[stat.index], end: e.target.value }
                          onUpdateSceneMetadata('data-explosion', {
                            ...sceneMetadata?.['data-explosion'],
                            stats: newStats
                          })
                        }}
                        className={inputClass}
                        placeholder={stat.defaultEnd}
                      />
                    </div>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                        Suffix
                      </label>
                      <input
                        type="text"
                        value={sceneMetadata?.['data-explosion']?.stats?.[stat.index]?.suffix || ''}
                        onChange={(e) => {
                          const currentStats = sceneMetadata?.['data-explosion']?.stats || []
                          const newStats = [...currentStats]
                          newStats[stat.index] = { ...newStats[stat.index], suffix: e.target.value }
                          onUpdateSceneMetadata('data-explosion', {
                            ...sceneMetadata?.['data-explosion'],
                            stats: newStats
                          })
                        }}
                        className={inputClass}
                        placeholder={stat.defaultSuffix}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Label
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.['data-explosion']?.stats?.[stat.index]?.label || ''}
                      onChange={(e) => {
                        const currentStats = sceneMetadata?.['data-explosion']?.stats || []
                        const newStats = [...currentStats]
                        newStats[stat.index] = { ...newStats[stat.index], label: e.target.value }
                        onUpdateSceneMetadata('data-explosion', {
                          ...sceneMetadata?.['data-explosion'],
                          stats: newStats
                        })
                      }}
                      className={inputClass}
                      placeholder={stat.defaultLabel}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      Source
                    </label>
                    <input
                      type="text"
                      value={sceneMetadata?.['data-explosion']?.stats?.[stat.index]?.source || ''}
                      onChange={(e) => {
                        const currentStats = sceneMetadata?.['data-explosion']?.stats || []
                        const newStats = [...currentStats]
                        newStats[stat.index] = { ...newStats[stat.index], source: e.target.value }
                        onUpdateSceneMetadata('data-explosion', {
                          ...sceneMetadata?.['data-explosion'],
                          stats: newStats
                        })
                      }}
                      className={inputClass}
                      placeholder={stat.defaultSource}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedScene === 'data-mesh' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Data Mesh Content
          </h3>

          {/* ── Header ── */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Header</h4>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.eyebrow || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], eyebrow: e.target.value })} className={inputClass} placeholder="Data Architecture" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.titlePart1 || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], titlePart1: e.target.value })} className={inputClass} placeholder="From Chaos to " />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2 (highlighted)</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.titlePart2 || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], titlePart2: e.target.value })} className={inputClass} placeholder="Clarity" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
              <textarea value={sceneMetadata?.['data-mesh']?.subtitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], subtitle: e.target.value })} className={textareaClass} rows={2} placeholder="How Elastic creates an enterprise-wide data mesh to search and act on data at scale." />
            </div>
          </div>

          {/* ── Stage Nav Labels + Stage 1 — side by side ── */}
          <div className="grid gap-4 items-start" style={{ gridTemplateColumns: '30% 1fr' }}>

            {/* Stage Nav Labels */}
            <div className="space-y-3">
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stage Nav Labels</h4>
              {['The Question', 'The Dilemma', 'The Problems', 'The Workarounds', 'The Solution'].map((placeholder, i) => (
                <div key={i}>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Stage {i + 1}</label>
                  <input
                    type="text"
                    value={sceneMetadata?.['data-mesh']?.stageLabels?.[i] || ''}
                    onChange={(e) => {
                      const labels = [...(sceneMetadata?.['data-mesh']?.stageLabels || ['', '', '', '', ''])]
                      labels[i] = e.target.value
                      onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], stageLabels: labels })
                    }}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            {/* Stage 1 — The Question */}
            <div className="space-y-3">
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`}>Stage 1 — {sceneMetadata?.['data-mesh']?.stageLabels?.[0] || 'The Question'}</h4>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Search bar question</label>
                <input type="text" value={sceneMetadata?.['data-mesh']?.question || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], question: e.target.value })} className={inputClass} placeholder="Why do we collect data?" />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Answer heading</label>
                <input type="text" value={sceneMetadata?.['data-mesh']?.answerHeading || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], answerHeading: e.target.value })} className={inputClass} placeholder="To use it." />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Answer body</label>
                <textarea value={sceneMetadata?.['data-mesh']?.answerBody || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], answerBody: e.target.value })} className={textareaClass} rows={2} placeholder="Data is a strategic asset. We need to retrieve, connect, and act on it — fast." />
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Answer footer</label>
                <textarea value={sceneMetadata?.['data-mesh']?.answerFooter || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], answerFooter: e.target.value })} className={textareaClass} rows={2} placeholder="But data is generated everywhere. How do you get total visibility at speed, at scale, without breaking the bank?" />
              </div>
            </div>

          </div>

          {/* ── Stage 1 — The Dilemma ── */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`}>Stage 2 — {sceneMetadata?.['data-mesh']?.stageLabels?.[1] || 'The Dilemma'}</h4>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Intro text</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaIntro || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaIntro: e.target.value })} className={inputClass} placeholder="The industry faced a choice..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Left card */}
              <div className={`p-3 rounded-lg border space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-elastic-teal/80' : 'text-elastic-blue'}`}>Left card</p>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Title</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaLeftTitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaLeftTitle: e.target.value })} className={inputClass} placeholder="Search" />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Subtitle</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaLeftSubtitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaLeftSubtitle: e.target.value })} className={inputClass} placeholder="Like memory" />
                </div>
                {['Query instantly ✓', 'Pivot & explore ✓', 'Milliseconds ✓', '$4+ per GB ✗'].map((placeholder, i) => (
                  <div key={i}>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Item {i + 1}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sceneMetadata?.['data-mesh']?.dilemmaLeftItems?.[i]?.text || ''}
                        onChange={(e) => {
                          const items = [...(sceneMetadata?.['data-mesh']?.dilemmaLeftItems || [{}, {}, {}, {}])]
                          items[i] = { ...items[i], text: e.target.value }
                          onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaLeftItems: items })
                        }}
                        className={`${inputClass} w-[80%]`}
                        placeholder={placeholder.replace(' ✓', '').replace(' ✗', '')}
                      />
                      <select
                        value={sceneMetadata?.['data-mesh']?.dilemmaLeftItems?.[i]?.good ?? (i < 3 ? true : false)}
                        onChange={(e) => {
                          const items = [...(sceneMetadata?.['data-mesh']?.dilemmaLeftItems || [{}, {}, {}, {}])]
                          items[i] = { ...items[i], good: e.target.value === 'true' }
                          onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaLeftItems: items })
                        }}
                        className={`${inputClass} w-[20%]`}
                      >
                        <option value="true">✓</option>
                        <option value="false">✗</option>
                      </select>
                    </div>
                  </div>
                ))}
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Footer note</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaLeftFooter || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaLeftFooter: e.target.value })} className={inputClass} placeholder="Fast & flexible, but expensive" />
                </div>
              </div>

              {/* Right card */}
              <div className={`p-3 rounded-lg border space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-orange-400/80' : 'text-elastic-midnight'}`}>Right card</p>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Title</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaRightTitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaRightTitle: e.target.value })} className={inputClass} placeholder="Storage" />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Subtitle</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaRightSubtitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaRightSubtitle: e.target.value })} className={inputClass} placeholder="Like disk" />
                </div>
                {['Batch scan only ✗', 'Rehydrate first ✗', 'Minutes to hours ✗', '$0.02 per GB ✓'].map((placeholder, i) => (
                  <div key={i}>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Item {i + 1}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={sceneMetadata?.['data-mesh']?.dilemmaRightItems?.[i]?.text || ''}
                        onChange={(e) => {
                          const items = [...(sceneMetadata?.['data-mesh']?.dilemmaRightItems || [{}, {}, {}, {}])]
                          items[i] = { ...items[i], text: e.target.value }
                          onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaRightItems: items })
                        }}
                        className={`${inputClass} w-[80%]`}
                        placeholder={placeholder.replace(' ✓', '').replace(' ✗', '')}
                      />
                      <select
                        value={sceneMetadata?.['data-mesh']?.dilemmaRightItems?.[i]?.good ?? (i === 3 ? true : false)}
                        onChange={(e) => {
                          const items = [...(sceneMetadata?.['data-mesh']?.dilemmaRightItems || [{}, {}, {}, {}])]
                          items[i] = { ...items[i], good: e.target.value === 'true' }
                          onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaRightItems: items })
                        }}
                        className={`${inputClass} w-[20%]`}
                      >
                        <option value="true">✓</option>
                        <option value="false">✗</option>
                      </select>
                    </div>
                  </div>
                ))}
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Footer note</label>
                  <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaRightFooter || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaRightFooter: e.target.value })} className={inputClass} placeholder="Cheap but slow" />
                </div>
              </div>
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Callout prefix</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaCalloutPrefix || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaCalloutPrefix: e.target.value })} className={inputClass} placeholder="Cost won. The industry went" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Callout highlighted word</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaCalloutHighlight || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaCalloutHighlight: e.target.value })} className={inputClass} placeholder="storage-first" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Callout sub-text</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.dilemmaCalloutSub || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], dilemmaCalloutSub: e.target.value })} className={inputClass} placeholder="But that created new problems..." />
            </div>
          </div>

          {/* ── Stage 2 — The Problems ── */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`}>Stage 3 — {sceneMetadata?.['data-mesh']?.stageLabels?.[2] || 'The Problems'}</h4>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Intro text</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.problemsIntro || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], problemsIntro: e.target.value })} className={inputClass} placeholder="Storage-first seemed smart… until the cracks appeared" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { placeholder: 'Data Silos', descPlaceholder: "Isolated pools that can't talk to each other" },
                { placeholder: 'Slow Insights', descPlaceholder: 'Minutes to hours before you can query' },
                { placeholder: 'No Visibility', descPlaceholder: "Can't see across the enterprise" },
                { placeholder: 'Data Sprawl', descPlaceholder: 'Copies everywhere, truth nowhere' },
              ].map(({ placeholder, descPlaceholder }, i) => (
                <div key={i} className={`p-3 rounded-lg border space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Problem #{i + 1}</p>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Title</label>
                    <input
                      type="text"
                      value={sceneMetadata?.['data-mesh']?.problemsCards?.[i]?.title || ''}
                      onChange={(e) => {
                        const cards = [...(sceneMetadata?.['data-mesh']?.problemsCards || [{}, {}, {}, {}])]
                        cards[i] = { ...cards[i], title: e.target.value }
                        onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], problemsCards: cards })
                      }}
                      className={inputClass}
                      placeholder={placeholder}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Description</label>
                    <input
                      type="text"
                      value={sceneMetadata?.['data-mesh']?.problemsCards?.[i]?.desc || ''}
                      onChange={(e) => {
                        const cards = [...(sceneMetadata?.['data-mesh']?.problemsCards || [{}, {}, {}, {}])]
                        cards[i] = { ...cards[i], desc: e.target.value }
                        onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], problemsCards: cards })
                      }}
                      className={inputClass}
                      placeholder={descPlaceholder}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Bottom callout</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.problemsCallout || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], problemsCallout: e.target.value })} className={inputClass} placeholder="The industry needed solutions. Workarounds emerged…" />
            </div>
          </div>

          {/* ── Stage 3 — The Workarounds ── */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`}>Stage 4 — {sceneMetadata?.['data-mesh']?.stageLabels?.[3] || 'The Workarounds'}</h4>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.workaroundsEyebrow || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], workaroundsEyebrow: e.target.value })} className={inputClass} placeholder="The Industry's Attempts" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading prefix</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.workaroundsHeadingPrefix || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], workaroundsHeadingPrefix: e.target.value })} className={inputClass} placeholder="Workarounds emerged… but data stayed" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading highlighted word</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.workaroundsHighlight || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], workaroundsHighlight: e.target.value })} className={inputClass} placeholder="trapped" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Empty state hint</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.workaroundsEmptyState || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], workaroundsEmptyState: e.target.value })} className={inputClass} placeholder="Select a workaround to see why it falls short" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Problems panel subtitle</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.workaroundsFallsShort || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], workaroundsFallsShort: e.target.value })} className={inputClass} placeholder="Why it falls short" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Summary callout (leave blank for default styled version)</label>
              <textarea value={sceneMetadata?.['data-mesh']?.summaryCallout || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], summaryCallout: e.target.value || null })} className={textareaClass} rows={2} placeholder="The problem isn't where data lives… It's whether you can search it all at once." />
            </div>
            {/* Arch items */}
            <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'catalog',    placeholder: 'Metadata Catalog',  subtitlePlaceholder: 'The Dewey Decimal approach' },
              { key: 'warehouse',  placeholder: 'Data Warehouse',    subtitlePlaceholder: 'Rigid structured storage'   },
              { key: 'lake',       placeholder: 'Data Lake',         subtitlePlaceholder: 'Store everything raw'       },
              { key: 'federation', placeholder: 'Federated Search',  subtitlePlaceholder: 'Query translator'           },
            ].map(({ key, placeholder, subtitlePlaceholder }, i) => (
              <div key={key} className={`p-3 rounded-lg border space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Workaround #{i + 1} ({key})</p>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Label</label>
                  <input
                    type="text"
                    value={sceneMetadata?.['data-mesh']?.archItems?.[i]?.label || ''}
                    onChange={(e) => {
                      const items = [...(sceneMetadata?.['data-mesh']?.archItems || [{}, {}, {}, {}])]
                      items[i] = { ...items[i], label: e.target.value }
                      onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], archItems: items })
                    }}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Subtitle</label>
                  <input
                    type="text"
                    value={sceneMetadata?.['data-mesh']?.archItems?.[i]?.subtitle || ''}
                    onChange={(e) => {
                      const items = [...(sceneMetadata?.['data-mesh']?.archItems || [{}, {}, {}, {}])]
                      items[i] = { ...items[i], subtitle: e.target.value }
                      onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], archItems: items })
                    }}
                    className={inputClass}
                    placeholder={subtitlePlaceholder}
                  />
                </div>
                {[0, 1, 2, 3].map((pi) => (
                  <div key={pi}>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Problem {pi + 1}</label>
                    <input
                      type="text"
                      value={sceneMetadata?.['data-mesh']?.archItems?.[i]?.problems?.[pi] || ''}
                      onChange={(e) => {
                        const items = [...(sceneMetadata?.['data-mesh']?.archItems || [{}, {}, {}, {}])]
                        const problems = [...(items[i]?.problems || ['', '', '', ''])]
                        problems[pi] = e.target.value
                        items[i] = { ...items[i], problems }
                        onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], archItems: items })
                      }}
                      className={inputClass}
                      placeholder={`Problem ${pi + 1}`}
                    />
                  </div>
                ))}
              </div>
            ))}
            </div>
          </div>

          {/* ── Stage 4 — The Transformation ── */}
          <div className="space-y-3">
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-elastic-teal/70' : 'text-elastic-blue'}`}>Stage 5 — {sceneMetadata?.['data-mesh']?.stageLabels?.[4] || 'The Transformation'}</h4>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Before mesh title (scattered silos view)</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.siloTitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], siloTitle: e.target.value })} className={inputClass} placeholder="What if you could search everywhere without copying anything?" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>After mesh title (connected mesh view)</label>
              <input type="text" value={sceneMetadata?.['data-mesh']?.meshTitle || ''} onChange={(e) => onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], meshTitle: e.target.value })} className={inputClass} placeholder="The Elastic Data Mesh: Query globally, store locally" />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Mesh node labels</label>
              {[{ placeholder: 'Site 1' }, { placeholder: 'Site 2' }, { placeholder: 'Site N' }].map(({ placeholder }, i) => (
                <div key={i} className="mt-1">
                  <input
                    type="text"
                    value={sceneMetadata?.['data-mesh']?.meshNodes?.[i]?.label || ''}
                    onChange={(e) => {
                      const nodes = [...(sceneMetadata?.['data-mesh']?.meshNodes || [{}, {}, {}])]
                      nodes[i] = { ...nodes[i], label: e.target.value }
                      onUpdateSceneMetadata('data-mesh', { ...sceneMetadata?.['data-mesh'], meshNodes: nodes })
                    }}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>Labels for Site 1, Site 2, Site N nodes in the connected mesh diagram</p>
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'cross-cluster' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Cross-Cluster Content
          </h3>

          {/* Header */}
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.['cross-cluster']?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Distributed Architecture"
            />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1 (plain)</label>
            <input
              type="text"
              value={sceneMetadata?.['cross-cluster']?.titlePart1 || ''}
              onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], titlePart1: e.target.value })}
              className={inputClass}
              placeholder="Distributed by Design, "
            />
          </div>
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2 (accent colour)</label>
            <input
              type="text"
              value={sceneMetadata?.['cross-cluster']?.titlePart2 || ''}
              onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], titlePart2: e.target.value })}
              className={inputClass}
              placeholder="Connected by Elastic"
            />
          </div>

          {/* Benefit cards */}
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
              Benefit Cards
            </h4>
            <div className="grid grid-cols-2 gap-3">
            {[
              { defaultText: 'Search across all data',        defaultHighlight: 'limit data transfer costs'  },
              { defaultText: 'Data privacy & sovereignty',    defaultHighlight: 'global compliance'          },
              { defaultText: 'Faster, more responsive',       defaultHighlight: 'reduced app latency'        },
              { defaultText: 'High availability for DR',      defaultHighlight: 'business continuity'        },
              { defaultText: 'Seamless hybrid & multi-cloud', defaultHighlight: 'deployment flexibility'     },
            ].map((defaults, i) => {
              const updateBenefit = (field, value) => {
                const benefits = [...(sceneMetadata?.['cross-cluster']?.benefits || [])]
                benefits[i] = { ...(benefits[i] || {}), [field]: value }
                onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], benefits })
              }
              return (
                <div key={`cc-benefit-${i}`} className={`p-3 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.03]'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Card #{i + 1}</p>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Main text</label>
                      <input
                        type="text"
                        value={sceneMetadata?.['cross-cluster']?.benefits?.[i]?.text || ''}
                        onChange={(e) => updateBenefit('text', e.target.value)}
                        className={inputClass}
                        placeholder={defaults.defaultText}
                      />
                    </div>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Highlight text</label>
                      <input
                        type="text"
                        value={sceneMetadata?.['cross-cluster']?.benefits?.[i]?.highlight || ''}
                        onChange={(e) => updateBenefit('highlight', e.target.value)}
                        className={inputClass}
                        placeholder={defaults.defaultHighlight}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* ── Stage 0: Remote Clusters ───────────────────────────────────── */}
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
              Remote Clusters (Stage 0)
            </h4>
            <div className="grid grid-cols-4 gap-3">
            {[
              { defaultLabel: 'elastic', defaultName: 'On-Prem', defaultType: 'onprem' },
              { defaultLabel: 'elastic', defaultName: 'AWS',     defaultType: 'cloud'  },
              { defaultLabel: 'elastic', defaultName: 'GCP',     defaultType: 'cloud'  },
              { defaultLabel: 'elastic', defaultName: 'Azure',   defaultType: 'cloud'  },
            ].map((defaults, i) => {
              const updateCluster = (field, value) => {
                const clusters = [...(sceneMetadata?.['cross-cluster']?.clusters || [])]
                clusters[i] = { ...(clusters[i] || {}), [field]: value }
                onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], clusters })
              }
              return (
                <div key={`cc-cluster-${i}`} className={`p-3 rounded-lg ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.03]'}`}>
                  <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Cluster #{i + 1}</p>
                  <div className="space-y-2">
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Label (e.g. "elastic")</label>
                      <input
                        type="text"
                        value={sceneMetadata?.['cross-cluster']?.clusters?.[i]?.label || ''}
                        onChange={(e) => updateCluster('label', e.target.value)}
                        className={inputClass}
                        placeholder={defaults.defaultLabel}
                      />
                    </div>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Name badge (e.g. "On-Prem")</label>
                      <input
                        type="text"
                        value={sceneMetadata?.['cross-cluster']?.clusters?.[i]?.name || ''}
                        onChange={(e) => updateCluster('name', e.target.value)}
                        className={inputClass}
                        placeholder={defaults.defaultName}
                      />
                    </div>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Icon</label>
                      <select
                        value={sceneMetadata?.['cross-cluster']?.clusters?.[i]?.type || defaults.defaultType}
                        onChange={(e) => updateCluster('type', e.target.value)}
                        className={inputClass}
                      >
                        <option value="cloud">Cloud</option>
                        <option value="onprem">Building (On-Prem)</option>
                        <option value="server">Server</option>
                        <option value="database">Database</option>
                        <option value="network">Network</option>
                      </select>
                    </div>
                  </div>
                </div>
              )
            })}
            </div>
          </div>

          {/* ── Stage 1: In Practice ──────────────────────────────────── */}
          <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
              Stage 1: In Practice
            </h4>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Hub Name</label>
              <input
                type="text"
                value={sceneMetadata?.['cross-cluster']?.stage1HubName || ''}
                onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], stage1HubName: e.target.value })}
                className={inputClass}
                placeholder="Your Organization"
              />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Hub Subtitle</label>
              <input
                type="text"
                value={sceneMetadata?.['cross-cluster']?.stage1HubSubtitle || ''}
                onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], stage1HubSubtitle: e.target.value })}
                className={inputClass}
                placeholder="Main Elastic Cluster"
              />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Search Query</label>
              <input
                type="text"
                value={sceneMetadata?.['cross-cluster']?.stage1Query || ''}
                onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], stage1Query: e.target.value })}
                className={inputClass}
                placeholder="GET _remote/*:logs-*/_search"
              />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Number of Sites</label>
              <select
                value={sceneMetadata?.['cross-cluster']?.siteCount || '7'}
                onChange={(e) => onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], siteCount: e.target.value })}
                className={inputClass}
              >
                {[2, 3, 4, 5, 6, 7, 8].map(n => (
                  <option key={n} value={String(n)}>{n} sites</option>
                ))}
              </select>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                2–4 sites appear in a single row. 5–8 sites use two rows.
              </p>
            </div>
          </div>

          {/* Stage 1 site list */}
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
              Sites (Stage 1)
            </h4>
            <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: parseInt(sceneMetadata?.['cross-cluster']?.siteCount || '7') }, (_, i) => {
              const defaultNames    = ['HQ Data Center', 'AWS us-east-1', 'Azure West EU', 'GCP Asia Pacific', 'DR Backup', 'Edge — LATAM', 'On-Prem EU']
              const defaultRegions  = ['US-East', 'US-East', 'EU-West', 'APAC', 'US-West', 'SA-East', 'EU-East']
              const defaultDocs     = ['2.4M', '8.1M', '3.7M', '1.9M', '2.4M', '0.9M', '1.5M']
              const site = sceneMetadata?.['cross-cluster']?.sites?.[i] || {}
              const updateSite = (patch) => {
                const sites = [...(sceneMetadata?.['cross-cluster']?.sites || [])]
                sites[i] = { ...(sites[i] || {}), ...patch }
                onUpdateSceneMetadata('cross-cluster', { ...sceneMetadata?.['cross-cluster'], sites })
              }
              return (
                <div key={`site-${i}`} className={`p-3 rounded-lg border space-y-2 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`}>
                  <p className={`text-xs font-semibold ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Site {i + 1}</p>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Name</label>
                    <input type="text" value={site.name || ''} onChange={(e) => updateSite({ name: e.target.value })} className={inputClass} placeholder={defaultNames[i] ?? `Site ${i + 1}`} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Type</label>
                      <select value={site.type || 'cloud'} onChange={(e) => updateSite({ type: e.target.value })} className={inputClass}>
                        <option value="cloud">Cloud</option>
                        <option value="onprem">On-Prem</option>
                        <option value="server">Server</option>
                        <option value="database">Database</option>
                        <option value="network">Network</option>
                      </select>
                    </div>
                    <div>
                      <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Region</label>
                      <input type="text" value={site.region || ''} onChange={(e) => updateSite({ region: e.target.value })} className={inputClass} placeholder={defaultRegions[i] ?? 'Global'} />
                    </div>
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Doc Count</label>
                    <input type="text" value={site.docs || ''} onChange={(e) => updateSite({ docs: e.target.value })} className={inputClass} placeholder={defaultDocs[i] ?? '1.0M'} />
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'unified-strategy' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Platform Overview Content
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Eyebrow Text
            </label>
            <input
              type="text"
              value={sceneMetadata?.['unified-strategy']?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('unified-strategy', {
                ...sceneMetadata?.['unified-strategy'],
                eyebrow: e.target.value
              })}
              className={inputClass}
              placeholder="The Elastic Search AI Platform"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Small text above the main title
            </p>
          </div>
          
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Title (Part 1)
            </label>
            <input
              type="text"
              value={sceneMetadata?.['unified-strategy']?.titlePart1 || ''}
              onChange={(e) => onUpdateSceneMetadata('unified-strategy', {
                ...sceneMetadata?.['unified-strategy'],
                titlePart1: e.target.value
              })}
              className={inputClass}
              placeholder="All Your Data"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              First part of title (will be shown in teal/blue)
            </p>
          </div>
          
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Title (Part 2)
            </label>
            <input
              type="text"
              value={sceneMetadata?.['unified-strategy']?.titlePart2 || ''}
              onChange={(e) => onUpdateSceneMetadata('unified-strategy', {
                ...sceneMetadata?.['unified-strategy'],
                titlePart2: e.target.value
              })}
              className={inputClass}
              placeholder=", Real-Time, At Scale"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Second part of title (white/black)
            </p>
          </div>
          
          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              Subtitle
            </label>
            <input
              type="text"
              value={sceneMetadata?.['unified-strategy']?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('unified-strategy', {
                ...sceneMetadata?.['unified-strategy'],
                subtitle: e.target.value
              })}
              className={inputClass}
              placeholder="Accelerate mission outcomes by finding insights from any data source"
            />
            <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
              Descriptive subtitle below the main title
            </p>
          </div>
        </div>
      )}

      {selectedScene === 'access-control' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Access Control Content
          </h3>

          <div className="grid grid-cols-2 gap-4 items-stretch">

            {/* Identity */}
            <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                Identity
              </h4>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Company Domain
                </label>
                <input
                  type="text"
                  value={sceneMetadata?.['access-control']?.domain || ''}
                  onChange={(e) => onUpdateSceneMetadata('access-control', {
                    ...sceneMetadata?.['access-control'],
                    domain: e.target.value
                  })}
                  className={inputClass}
                  placeholder="acme.com"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                  Replaces the email domain in all log entries (e.g. user@acme.com)
                </p>
              </div>
              <div>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  Departments
                </label>
                <input
                  type="text"
                  value={sceneMetadata?.['access-control']?.departments || ''}
                  onChange={(e) => onUpdateSceneMetadata('access-control', {
                    ...sceneMetadata?.['access-control'],
                    departments: e.target.value
                  })}
                  className={inputClass}
                  placeholder="Engineering, Finance, Sales, IT"
                />
                <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                  Comma-separated list. Updates the ABAC department filter chips and redistributes log entries automatically.
                </p>
              </div>
            </div>

            {/* Column Labels */}
            <div className={`p-4 rounded-xl space-y-3 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                Column Labels
              </h4>
              <p className={`text-xs ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                Rename table columns to match your terminology.
              </p>
              {[
                { key: 'action',      placeholder: 'Action'      },
                { key: 'credit_card', placeholder: 'Credit Card' },
                { key: 'ssn',         placeholder: 'SSN'         },
              ].map(({ key, placeholder }) => (
                <div key={key}>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                    {placeholder} column
                  </label>
                  <input
                    type="text"
                    value={sceneMetadata?.['access-control']?.[`label_${key}`] || ''}
                    onChange={(e) => onUpdateSceneMetadata('access-control', {
                      ...sceneMetadata?.['access-control'],
                      [`label_${key}`]: e.target.value
                    })}
                    className={inputClass}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

          </div>

          {/* Sample Values */}
          <div className={`p-4 rounded-xl space-y-4 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.02]'}`}>
            <div>
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                Sample Values
              </h4>
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                Comma-separated values distributed across log entries. Leave blank to use defaults.
              </p>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                Action values
              </label>
              <input
                type="text"
                value={sceneMetadata?.['access-control']?.actions || ''}
                onChange={(e) => onUpdateSceneMetadata('access-control', {
                  ...sceneMetadata?.['access-control'],
                  actions: e.target.value
                })}
                className={inputClass}
                placeholder="login_success, payment_processed, config_change"
              />
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                {sceneMetadata?.['access-control']?.label_credit_card || 'Credit Card'} values
              </label>
              <input
                type="text"
                value={sceneMetadata?.['access-control']?.sensitive1Values || ''}
                onChange={(e) => onUpdateSceneMetadata('access-control', {
                  ...sceneMetadata?.['access-control'],
                  sensitive1Values: e.target.value
                })}
                className={inputClass}
                placeholder="4532-8821-3347-9912, 5421-3345-9921-7788"
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                Masking is format-aware: NNNN-NNNN-NNNN-NNNN → keeps first/last group. Other formats masked generically.
              </p>
            </div>

            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                {sceneMetadata?.['access-control']?.label_ssn || 'SSN'} values
              </label>
              <input
                type="text"
                value={sceneMetadata?.['access-control']?.sensitive2Values || ''}
                onChange={(e) => onUpdateSceneMetadata('access-control', {
                  ...sceneMetadata?.['access-control'],
                  sensitive2Values: e.target.value
                })}
                className={inputClass}
                placeholder="123-45-6789, EMP-2024-0042, ID-94821"
              />
              <p className={`text-xs mt-1 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>
                NNN-NN-NNNN → SSN masking. Any other format (e.g. EMP-2024-0042) → generic masking.
              </p>
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'consolidation' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Consolidation Scene — Header
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Unified Platform"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Plain</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.headingPlain || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, headingPlain: e.target.value })}
              className={inputClass}
              placeholder="Consolidate Point Solutions, "
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Accent</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.headingAccent || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, headingAccent: e.target.value })}
              className={inputClass}
              placeholder="Centralize Data Workflows"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea
              value={sceneMetadata?.consolidation?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, subtitle: e.target.value })}
              className={textareaClass}
              rows={2}
              placeholder="Comprehensive capabilities to replace disparate tools while integrating with your broader ecosystem"
            />
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Before State (Tool Sprawl)
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Sidebar Title</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.beforeTitle || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, beforeTitle: e.target.value })}
              className={inputClass}
              placeholder="Tool Sprawl"
            />
          </div>

          <div className="space-y-2">
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Pain Points (5 items)</label>
            {['Multiple licenses & contracts', 'Data silos & duplication', 'Context switching', 'Integration overhead', 'Inconsistent alerting'].map((defaultVal, i) => (
              <input
                key={i}
                type="text"
                value={sceneMetadata?.consolidation?.painPoints?.[i] || ''}
                onChange={(e) => {
                  const current = sceneMetadata?.consolidation?.painPoints || []
                  const updated = [...current]
                  updated[i] = e.target.value
                  onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, painPoints: updated })
                }}
                className={inputClass}
                placeholder={defaultVal}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat Value</label>
              <input
                type="text"
                value={sceneMetadata?.consolidation?.beforeStatValue || ''}
                onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, beforeStatValue: e.target.value })}
                className={inputClass}
                placeholder="76+"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat Label</label>
              <input
                type="text"
                value={sceneMetadata?.consolidation?.beforeStatLabel || ''}
                onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, beforeStatLabel: e.target.value })}
                className={inputClass}
                placeholder="Avg. security tools per org"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat Source</label>
              <input
                type="text"
                value={sceneMetadata?.consolidation?.beforeStatSource || ''}
                onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, beforeStatSource: e.target.value })}
                className={inputClass}
                placeholder="IBM / Palo Alto Networks"
              />
            </div>
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Chaos Label</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.chaosLabel || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, chaosLabel: e.target.value })}
              className={inputClass}
              placeholder="Disconnected tools • Duplicated data • Fragmented workflows"
            />
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            After State (With Elastic)
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Sidebar Title</label>
            <input
              type="text"
              value={sceneMetadata?.consolidation?.afterTitle || ''}
              onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, afterTitle: e.target.value })}
              className={inputClass}
              placeholder="With Elastic"
            />
          </div>

          <div className="space-y-2">
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Benefit Text (5 items)</label>
            {['Reduced licensing costs', 'Faster triage & response', 'Unified data layer', 'No data duplication', 'Shared context'].map((defaultVal, i) => (
              <input
                key={i}
                type="text"
                value={sceneMetadata?.consolidation?.benefitTexts?.[i] || ''}
                onChange={(e) => {
                  const current = sceneMetadata?.consolidation?.benefitTexts || []
                  const updated = [...current]
                  updated[i] = e.target.value
                  onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, benefitTexts: updated })
                }}
                className={inputClass}
                placeholder={defaultVal}
              />
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat Value</label>
              <input
                type="text"
                value={sceneMetadata?.consolidation?.afterStatValue || ''}
                onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, afterStatValue: e.target.value })}
                className={inputClass}
                placeholder="3-5"
              />
            </div>
            <div>
              <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stat Label</label>
              <input
                type="text"
                value={sceneMetadata?.consolidation?.afterStatLabel || ''}
                onChange={(e) => onUpdateSceneMetadata('consolidation', { ...sceneMetadata?.consolidation, afterStatLabel: e.target.value })}
                className={inputClass}
                placeholder="Vendors eliminated on average"
              />
            </div>
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Consolidation Scene — Tools
          </h3>
          <ConsolidationToolEditor
            metadata={sceneMetadata?.consolidation || {}}
            onUpdate={(tools) => onUpdateSceneMetadata('consolidation', {
              ...(sceneMetadata?.consolidation || {}),
              tools,
            })}
            isDark={isDark}
            inputClass={inputClass}
          />
        </div>
      )}

      {selectedScene === 'schema' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Schema Scene Content
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.schema?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Elastic Common Schema"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 1 (plain)</label>
            <input
              type="text"
              value={sceneMetadata?.schema?.titlePart1 || ''}
              onChange={(e) => onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, titlePart1: e.target.value })}
              className={inputClass}
              placeholder="Schema on Read"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Part 2 (accent colour)</label>
            <input
              type="text"
              value={sceneMetadata?.schema?.titlePart2 || ''}
              onChange={(e) => onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, titlePart2: e.target.value })}
              className={inputClass}
              placeholder="Schema on Write"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stage 0 Subtitle</label>
            <input
              type="text"
              value={sceneMetadata?.schema?.subtitle0 || ''}
              onChange={(e) => onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, subtitle0: e.target.value })}
              className={inputClass}
              placeholder="How you organize data determines how fast you can find it"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Stage 1 Subtitle</label>
            <input
              type="text"
              value={sceneMetadata?.schema?.subtitle1 || ''}
              onChange={(e) => onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, subtitle1: e.target.value })}
              className={inputClass}
              placeholder="One field name. Any source. Zero guesswork."
            />
          </div>

          {/* Sources */}
          <div>
            <h4 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
              Data Sources (Stage 1)
            </h4>
            <div className="grid grid-cols-2 gap-3">
            {[
              { defaultLabel: 'Firewall',       defaultField: 'src_ip',         defaultHits: 14 },
              { defaultLabel: 'Windows Events', defaultField: 'source_address', defaultHits: 31 },
              { defaultLabel: 'Web Server',     defaultField: 'client.ip',      defaultHits: 7  },
              { defaultLabel: 'EDR',            defaultField: 'RemoteIP',       defaultHits: 5  },
            ].map((defaults, i) => {
              const src = sceneMetadata?.schema?.sources?.[i] || {}
              const update = (patch) => {
                const sources = [...(sceneMetadata?.schema?.sources || [{}, {}, {}, {}])]
                sources[i] = { ...sources[i], ...patch }
                onUpdateSceneMetadata('schema', { ...sceneMetadata?.schema, sources })
              }
              return (
                <div key={i} className="space-y-2">
                  <p className={`text-xs font-medium ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                    Source {i + 1}
                  </p>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                    <input
                      type="text"
                      value={src.label || ''}
                      onChange={(e) => update({ label: e.target.value })}
                      className={inputClass}
                      placeholder={defaults.defaultLabel}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Raw Field Name</label>
                    <input
                      type="text"
                      value={src.rawField || ''}
                      onChange={(e) => update({ rawField: e.target.value })}
                      className={inputClass}
                      placeholder={defaults.defaultField}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Hit Count</label>
                    <input
                      type="number"
                      value={src.hitCount ?? ''}
                      onChange={(e) => update({ hitCount: e.target.value })}
                      className={inputClass}
                      placeholder={defaults.defaultHits}
                    />
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        </div>
      )}

      {selectedScene === 'esql' && (
        <div className="space-y-6 mt-6">
          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            ES|QL Scene — Header
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.esql?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="ES|QL · Elasticsearch Query Language"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Plain</label>
            <input
              type="text"
              value={sceneMetadata?.esql?.headingPlain || ''}
              onChange={(e) => onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, headingPlain: e.target.value })}
              className={inputClass}
              placeholder="Transform Your "
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Accent</label>
            <input
              type="text"
              value={sceneMetadata?.esql?.headingAccent || ''}
              onChange={(e) => onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, headingAccent: e.target.value })}
              className={inputClass}
              placeholder="Investigation Workflows."
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea
              rows={2}
              value={sceneMetadata?.esql?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, subtitle: e.target.value })}
              className={inputClass}
              placeholder="A next-generation piped query language. Search, aggregate, transform, and visualize from a single query."
            />
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            ES|QL Scene — Value Propositions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Card 1', titlePlaceholder: 'Faster queries, at scale.', descPlaceholder: 'Multi-stage concurrent execution delivers greater speed and efficiency across billions of events. No pre-aggregation required.' },
              { label: 'Card 2', titlePlaceholder: 'One query. One window.', descPlaceholder: 'Search, aggregate, calculate, transform, and visualize from a single pipeline. Refine as you go.' },
              { label: 'Card 3', titlePlaceholder: 'Lookup, join, and transform.', descPlaceholder: 'Perform data transformations in one query with lookup and joins. No convoluted scripts. No redundant requests.' },
              { label: 'Card 4', titlePlaceholder: 'More accurate alerting.', descPlaceholder: 'Review trends over isolated incidents to reduce false positives and surface more actionable notifications.' },
            ].map(({ label, titlePlaceholder, descPlaceholder }, i) => {
              const titles = sceneMetadata?.esql?.valuePropTitles || []
              const descs  = sceneMetadata?.esql?.valuePropDescriptions || []
              return (
                <div key={i} className="space-y-3">
                  <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{label}</p>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
                    <input
                      type="text"
                      value={titles[i] || ''}
                      onChange={(e) => {
                        const next = [...titles]
                        next[i] = e.target.value
                        onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, valuePropTitles: next })
                      }}
                      className={inputClass}
                      placeholder={titlePlaceholder}
                    />
                  </div>
                  <div>
                    <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Description</label>
                    <textarea
                      rows={2}
                      value={descs[i] || ''}
                      onChange={(e) => {
                        const next = [...descs]
                        next[i] = e.target.value
                        onUpdateSceneMetadata('esql', { ...sceneMetadata?.esql, valuePropDescriptions: next })
                      }}
                      className={inputClass}
                      placeholder={descPlaceholder}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Services Scene ─────────────────────────────────────────────── */}
      {selectedScene === 'services' && (
        <div className="space-y-6 mt-6">

          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Services Scene — Header
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.services?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('services', { ...sceneMetadata?.services, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Your Path to Success"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Plain</label>
            <input
              type="text"
              value={sceneMetadata?.services?.headingPlain || ''}
              onChange={(e) => onUpdateSceneMetadata('services', { ...sceneMetadata?.services, headingPlain: e.target.value })}
              className={inputClass}
              placeholder="Transform Faster "
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Accent</label>
            <input
              type="text"
              value={sceneMetadata?.services?.headingAccent || ''}
              onChange={(e) => onUpdateSceneMetadata('services', { ...sceneMetadata?.services, headingAccent: e.target.value })}
              className={inputClass}
              placeholder="with Expert Guidance."
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea
              rows={3}
              value={sceneMetadata?.services?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('services', { ...sceneMetadata?.services, subtitle: e.target.value })}
              className={inputClass}
              placeholder="Skip the guesswork. Elastic Professional Services accelerates your deployment, migration, and adoption — so your team focuses on outcomes, not overhead."
            />
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Services Scene — Hidden Costs
          </h3>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
            DIY Reality stage — cost items with severity (HIGH / MEDIUM / LOW).
          </p>

          {[
            { placeholder: 'Opportunity cost of delayed insights',      sev: 'HIGH'   },
            { placeholder: 'Engineer time diverted from impactful work', sev: 'HIGH'  },
            { placeholder: 'Production incidents during migration',      sev: 'MEDIUM' },
            { placeholder: 'Vendor support for edge cases',             sev: 'MEDIUM' },
            { placeholder: 'Re-work from initial mistakes',             sev: 'HIGH'   },
          ].map((item, i) => {
            const costs = sceneMetadata?.services?.hiddenCosts || []
            return (
              <div key={i} className="space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Cost {i + 1}</p>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Label</label>
                  <input
                    type="text"
                    value={costs[i]?.label || ''}
                    onChange={(e) => {
                      const next = [...costs]
                      next[i] = { ...next[i], label: e.target.value }
                      onUpdateSceneMetadata('services', { ...sceneMetadata?.services, hiddenCosts: next })
                    }}
                    className={inputClass}
                    placeholder={item.placeholder}
                  />
                </div>
                <div>
                  <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Severity</label>
                  <select
                    value={costs[i]?.severity || ''}
                    onChange={(e) => {
                      const next = [...costs]
                      next[i] = { ...next[i], severity: e.target.value }
                      onUpdateSceneMetadata('services', { ...sceneMetadata?.services, hiddenCosts: next })
                    }}
                    className={inputClass}
                  >
                    <option value="">Default ({item.sev})</option>
                    <option value="HIGH">HIGH</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="LOW">LOW</option>
                  </select>
                </div>
              </div>
            )
          })}

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Services Scene — Data Sources
          </h3>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
            Zero Downtime demo — data source names shown in the left panel.
          </p>

          {['AWS', 'Linux Systems', 'Windows Systems', 'Palo Alto', 'CrowdStrike'].map((def, i) => {
            const sources = sceneMetadata?.services?.dataSources || []
            return (
              <div key={i}>
                <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Source {i + 1}</label>
                <input
                  type="text"
                  value={sources[i]?.name || ''}
                  onChange={(e) => {
                    const next = [...sources]
                    next[i] = { ...next[i], name: e.target.value }
                    onUpdateSceneMetadata('services', { ...sceneMetadata?.services, dataSources: next })
                  }}
                  className={inputClass}
                  placeholder={def}
                />
              </div>
            )
          })}

        </div>
      )}

      {/* ── Next Steps Scene ───────────────────────────────────────────── */}
      {selectedScene === 'next-steps' && (
        <div className="space-y-6 mt-6">

          <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Next Steps — Header
          </h3>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow Text</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], eyebrow: e.target.value })}
              className={inputClass}
              placeholder="What Comes Next"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Plain</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.headingPlain || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], headingPlain: e.target.value })}
              className={inputClass}
              placeholder="Ready to "
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Heading — Accent</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.headingAccent || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], headingAccent: e.target.value })}
              className={inputClass}
              placeholder="Get Started?"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Subtitle</label>
            <textarea
              rows={2}
              value={sceneMetadata?.['next-steps']?.subtitle || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], subtitle: e.target.value })}
              className={inputClass}
              placeholder="Here's a clear path forward — we'll guide you every step of the way."
            />
          </div>

          <h3 className={`text-sm font-semibold pt-2 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
            Next Steps — Your Contact Info
          </h3>
          <p className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
            Shown in the contact panel at the bottom right of the scene.
          </p>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Panel Heading</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.ctaHeading || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], ctaHeading: e.target.value })}
              className={inputClass}
              placeholder="Let's keep the momentum going."
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Your Name / Role</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.ctaName || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], ctaName: e.target.value })}
              className={inputClass}
              placeholder="Jane Smith · Solutions Architect"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Email</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.ctaEmail || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], ctaEmail: e.target.value })}
              className={inputClass}
              placeholder="jane.smith@elastic.co"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Scheduling Link / Phone</label>
            <input
              type="text"
              value={sceneMetadata?.['next-steps']?.ctaPhone || ''}
              onChange={(e) => onUpdateSceneMetadata('next-steps', { ...sceneMetadata?.['next-steps'], ctaPhone: e.target.value })}
              className={inputClass}
              placeholder="calendly.com/jane-smith"
            />
          </div>

        </div>
      )}

      {selectedScene === 'panel' && (
        <div className="space-y-4">
          <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Header</p>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Eyebrow</label>
            <input
              type="text"
              value={sceneMetadata?.panel?.eyebrow || ''}
              onChange={(e) => onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, eyebrow: e.target.value })}
              className={inputClass}
              placeholder="Featured Panel"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title</label>
            <input
              type="text"
              value={sceneMetadata?.panel?.title || ''}
              onChange={(e) => onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, title: e.target.value })}
              className={inputClass}
              placeholder="Understanding Security in Linking Infrastructure to Governing"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Title Accent (highlighted portion)</label>
            <input
              type="text"
              value={sceneMetadata?.panel?.titleAccent || ''}
              onChange={(e) => onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, titleAccent: e.target.value })}
              className={inputClass}
              placeholder="Infrastructure to Governing"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Date</label>
            <input
              type="text"
              value={sceneMetadata?.panel?.date || ''}
              onChange={(e) => onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, date: e.target.value })}
              className={inputClass}
              placeholder="March 11, 2025"
            />
          </div>

          <div>
            <label className={`text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Time</label>
            <input
              type="text"
              value={sceneMetadata?.panel?.time || ''}
              onChange={(e) => onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, time: e.target.value })}
              className={inputClass}
              placeholder="10:45 AM – 11:30 AM"
            />
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider pt-2 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Speakers</p>

          {(() => {
            const panelDefaultSpeakers = [
              { name: 'Panelist Name', role: 'Moderator', org: 'Your Organization', moderator: true },
              { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
              { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
              { name: 'Panelist Name', role: 'CIO', org: 'Your Organization' },
              { name: 'Panelist Name', role: 'Senior Director Solutions Architecture', org: 'Elastic', highlight: true },
            ]
            const speakers = sceneMetadata?.panel?.speakers?.length
              ? sceneMetadata.panel.speakers
              : panelDefaultSpeakers

            const saveSpeakers = (updated) =>
              onUpdateSceneMetadata('panel', { ...sceneMetadata?.panel, speakers: updated })

            const updateSpeaker = (i, field, value) => {
              const updated = speakers.map((s, idx) =>
                idx === i ? { ...s, [field]: value } : s
              )
              saveSpeakers(updated)
            }

            const deleteSpeaker = (i) =>
              saveSpeakers(speakers.filter((_, idx) => idx !== i))

            const addSpeaker = () =>
              saveSpeakers([...speakers, { name: '', role: '', org: '' }])

            const toggleClass = (active) =>
              `text-[11px] font-bold uppercase px-2 py-1 rounded cursor-pointer border transition-colors ${
                active
                  ? isDark ? 'bg-elastic-teal/20 border-elastic-teal/40 text-elastic-teal' : 'bg-elastic-blue/10 border-elastic-blue/30 text-elastic-blue'
                  : isDark ? 'bg-white/5 border-white/10 text-white/40'                    : 'bg-white border-elastic-dev-blue/15 text-elastic-dev-blue/40'
              }`

            return (
              <>
                {speakers.map((speaker, i) => (
                  <div key={i} className={`p-3 rounded-lg border space-y-2 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
                    <div className="flex items-center justify-between">
                      <p className={`text-xs font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink'}`}>Speaker {i + 1}</p>
                      <button
                        onClick={() => deleteSpeaker(i)}
                        className={`text-[11px] px-2 py-0.5 rounded border transition-colors ${isDark ? 'border-red-500/30 text-red-400/70 hover:bg-red-500/10' : 'border-red-400/30 text-red-400 hover:bg-red-50'}`}
                      >
                        Remove
                      </button>
                    </div>

                    <div>
                      <label className={`text-[11px] mb-0.5 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Name</label>
                      <input type="text" value={speaker.name || ''} onChange={(e) => updateSpeaker(i, 'name', e.target.value)} className={inputClass} placeholder="Full name" />
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className={`text-[11px] mb-0.5 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Role</label>
                        <input type="text" value={speaker.role || ''} onChange={(e) => updateSpeaker(i, 'role', e.target.value)} className={inputClass} placeholder="Title" />
                      </div>
                      <div className="flex-1">
                        <label className={`text-[11px] mb-0.5 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Organization</label>
                        <input type="text" value={speaker.org || ''} onChange={(e) => updateSpeaker(i, 'org', e.target.value)} className={inputClass} placeholder="Company" />
                      </div>
                    </div>

                    <div>
                      <label className={`text-[11px] mb-0.5 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Note (optional)</label>
                      <input type="text" value={speaker.note || ''} onChange={(e) => updateSpeaker(i, 'note', e.target.value)} className={inputClass} placeholder="e.g. Invited Pending Approval" />
                    </div>

                    <div>
                      <label className={`text-[11px] mb-1 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>Avatar URL (leave blank for initials)</label>
                      <input type="text" value={speaker.avatar || ''} onChange={(e) => updateSpeaker(i, 'avatar', e.target.value)} className={inputClass} placeholder="https://..." />
                    </div>

                    <div className="flex gap-2 pt-0.5">
                      <button onClick={() => updateSpeaker(i, 'moderator', !speaker.moderator)} className={toggleClass(!!speaker.moderator)}>Moderator</button>
                      <button onClick={() => updateSpeaker(i, 'highlight', !speaker.highlight)} className={toggleClass(!!speaker.highlight)}>Elastic</button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addSpeaker}
                  className={`w-full py-2 rounded-lg border border-dashed text-xs font-semibold transition-colors ${
                    isDark
                      ? 'border-white/20 text-white/40 hover:border-elastic-teal/40 hover:text-elastic-teal/70'
                      : 'border-elastic-dev-blue/20 text-elastic-dev-blue/40 hover:border-elastic-blue/40 hover:text-elastic-blue/70'
                  }`}
                >
                  + Add Speaker
                </button>
              </>
            )
          })()}
        </div>
      )}

      {(() => {
        const ModularEditor = MODULAR_SCENE_EDITORS[selectedScene]
        return ModularEditor ? (
          <ModularEditor
            sceneMetadata={sceneMetadata}
            onUpdateSceneMetadata={onUpdateSceneMetadata}
            isDark={isDark}
            inputClass={inputClass}
            textareaClass={textareaClass}
          />
        ) : null
      })()}
    </div>
  )
}
