import { CUSTOM_PRESET_ID } from '../data/deckPresets'
import { baseSceneId, isDuplicateSceneId, nextDuplicateId } from './sceneIdentity'

function cloneJson(value) {
  if (value == null) return value
  return JSON.parse(JSON.stringify(value))
}

/**
 * Registry scenes plus virtual copies from `config.duplicates`.
 * Copies share the source component and pick up their own id/title.
 */
export function materializeScenes(initialScenes, duplicates = []) {
  const byId = new Map(initialScenes.map((scene) => [scene.id, scene]))
  const extra = []
  for (const entry of duplicates) {
    if (!entry?.id || !entry.sourceId) continue
    const source = byId.get(entry.sourceId) || byId.get(baseSceneId(entry.sourceId))
    if (!source) continue
    extra.push({
      ...source,
      id: entry.id,
      title: entry.label || `${source.title} (copy)`,
      sourceId: source.id,
      sourceTitle: source.title,
      isDuplicate: true,
    })
  }
  return [...initialScenes, ...extra]
}

/**
 * Editors are keyed by registry id. When the selected scene is a copy,
 * alias the copy's metadata onto the base key and rewrite updates back
 * onto the copy so existing editors keep working unchanged.
 */
export function aliasSceneEditorProps(selectedId, sceneMetadata, onUpdateSceneMetadata) {
  const base = baseSceneId(selectedId)
  if (!selectedId || base === selectedId) {
    return { sceneMetadata, onUpdateSceneMetadata }
  }
  return {
    sceneMetadata: {
      ...sceneMetadata,
      [base]: sceneMetadata?.[selectedId] || {},
    },
    onUpdateSceneMetadata: (id, metadata) => {
      onUpdateSceneMetadata(id === base ? selectedId : id, metadata)
    },
  }
}

export function duplicateSceneInConfig(config, sourceId, initialScenes) {
  const duplicates = Array.isArray(config.duplicates) ? config.duplicates : []
  const allScenes = materializeScenes(initialScenes, duplicates)
  const id = nextDuplicateId(sourceId, allScenes.map((scene) => scene.id))
  const source = allScenes.find((scene) => scene.id === sourceId)
  const baseTitle = (source?.sourceTitle || source?.title || baseSceneId(sourceId)).replace(/ \(copy\)$/, '')
  const label = `${baseTitle} (copy)`
  const registrySourceId = source?.sourceId || baseSceneId(sourceId)

  const order = [...(config.order || allScenes.map((scene) => scene.id))]
  const sourceOrderIndex = order.indexOf(sourceId)
  if (sourceOrderIndex >= 0) order.splice(sourceOrderIndex + 1, 0, id)
  else order.push(id)

  const enabledIds = [...(config.enabledIds || [])]
  const sourceEnabledIndex = enabledIds.indexOf(sourceId)
  if (sourceEnabledIndex >= 0) enabledIds.splice(sourceEnabledIndex + 1, 0, id)
  else enabledIds.push(id)

  const cloned = cloneJson(config.sceneMetadata?.[sourceId] || {})
  delete cloned.id
  const sceneMetadata = {
    ...(config.sceneMetadata || {}),
    [id]: { ...cloned, title: label },
  }

  const durations = { ...(config.durations || {}) }
  if (config.durations?.[sourceId] != null) durations[id] = config.durations[sourceId]

  return {
    ...config,
    duplicates: [...duplicates, { id, sourceId: registrySourceId, label }],
    order,
    enabledIds,
    sceneMetadata,
    durations,
    activePreset: CUSTOM_PRESET_ID,
  }
}

export function deleteDuplicateFromConfig(config, sceneId) {
  if (!isDuplicateSceneId(sceneId)) return config
  const sceneMetadata = { ...(config.sceneMetadata || {}) }
  delete sceneMetadata[sceneId]
  const durations = { ...(config.durations || {}) }
  delete durations[sceneId]
  return {
    ...config,
    duplicates: (config.duplicates || []).filter((entry) => entry.id !== sceneId),
    order: (config.order || []).filter((id) => id !== sceneId),
    enabledIds: (config.enabledIds || []).filter((id) => id !== sceneId),
    sceneMetadata,
    durations,
    activePreset: CUSTOM_PRESET_ID,
  }
}

export function mergeDuplicatesIntoMigration(migrated, parsed) {
  const duplicates = Array.isArray(parsed.duplicates) ? parsed.duplicates : []
  const dupIds = duplicates.map((entry) => entry.id).filter(Boolean)
  if (dupIds.length === 0) {
    return { ...migrated, duplicates: [] }
  }
  const order = [
    ...migrated.order.filter((id) => !dupIds.includes(id)),
    ...dupIds,
  ]
  const previouslyEnabled = new Set(parsed.enabledIds || [])
  const enabledIds = [
    ...migrated.enabledIds,
    ...dupIds.filter((id) => previouslyEnabled.has(id) && !migrated.enabledIds.includes(id)),
  ]
  return { ...migrated, duplicates, order, enabledIds }
}
