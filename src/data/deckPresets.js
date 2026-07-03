// Named presentation flows. Applying a preset enables exactly these scenes, in
// this order; every other scene is moved after them and disabled. Per-scene
// durations and content edits are preserved when switching presets.

export const DECK_PRESETS = [
  {
    id: 'new-prospect',
    label: 'New Prospect',
    description: 'Net-new pitch — market context first, no existing-footprint assumptions.',
    sceneIds: [
      'hero',
      'agenda',
      'team',
      'about',
      'data-explosion',
      'problem-patterns',
      'business-value',
      'unified-strategy',
      'consolidation',
      'ai-assistant',
      'security-narrative-visual',
      'security',
      'licensing',
      'customer-architect',
      'services',
      'platform-value',
      'next-steps',
    ],
  },
  {
    id: 'expansion',
    label: 'Expansion',
    description: 'Existing customer — anchors on current Elastic footprint and growth.',
    sceneIds: [
      'hero',
      'agenda',
      'team',
      'about',
      'problem-patterns',
      'business-value',
      'unified-strategy',
      'consolidation',
      'ai-assistant',
      'security-narrative-visual',
      'security',
      'licensing',
      'customer-architect',
      'services',
      'platform-value',
      'next-steps',
    ],
  },
  {
    id: 'observability',
    label: 'Observability',
    description: 'The Observability story — from efficient datastore to autonomous AI SRE (Nightshift).',
    sceneIds: [
      'hero',
      'agenda',
      'team',
      'obs-ai-scale',
      'obs-heritage',
      'obs-three-layers',
      'obs-pillars',
      'obs-streams',
      'obs-otel',
      'obs-signals',
      'obs-kubernetes',
      'obs-agentic',
      'obs-discovery',
      'obs-surfaces',
      'nightshift-sre',
      'nightshift-arch',
      'next-steps',
    ],
  },
]

export const DEFAULT_PRESET_ID = 'new-prospect'

export const CUSTOM_PRESET_ID = 'custom'

export function getPreset(presetId) {
  return DECK_PRESETS.find((p) => p.id === presetId) || null
}

// Returns { order, enabledIds } for a preset against the full scene list:
// preset scenes first (in preset order, enabled), all other scenes after (disabled).
export function presetConfig(presetId, allSceneIds) {
  const preset = getPreset(presetId)
  if (!preset) return null
  const enabledIds = preset.sceneIds.filter((id) => allSceneIds.includes(id))
  const remaining = allSceneIds.filter((id) => !enabledIds.includes(id))
  return { order: [...enabledIds, ...remaining], enabledIds }
}
