// Direct handoff from the whiteboard to the Pricing / ROM builder, so a sized
// cluster can become a priced scenario without a clipboard round-trip in front
// of a customer.
//
// The two scenes live in the same deck, and the ROM builder reads its
// scenarios from the deck config the rest of the app persists under this
// localStorage key (see useSceneConfiguration in SceneSettings). We append a
// new scenario there and fire a storage event, reusing the deck's existing
// cross-tab sync — the same mechanism a presenter tab uses — rather than
// inventing a new channel. Landing the rows as a new, clearly-labelled
// scenario means nothing already in the builder is overwritten.

import { normalizeScenarios } from './pricing'

export const SCENE_CONFIG_KEY = 'presentation-scene-config'
export const PRICING_SCENE_ID = 'pricing-rom'

// Append `scenario` to the Pricing / ROM scene's saved scenarios. Returns true
// when the config was written. `storage` is injectable for tests.
export function sendScenarioToPricing(scenario, storage = globalThis.localStorage) {
  if (!storage) return false

  let config = {}
  try {
    config = JSON.parse(storage.getItem(SCENE_CONFIG_KEY)) || {}
  } catch {
    config = {}
  }

  const sceneMetadata = config.sceneMetadata || {}
  const priceMeta = sceneMetadata[PRICING_SCENE_ID] || {}
  // Normalize first so a deck that never used multi-scenario mode keeps its
  // existing (or default) quote as the first option and gains this one beside it.
  const existing = normalizeScenarios(priceMeta)
  const nextConfig = {
    ...config,
    sceneMetadata: {
      ...sceneMetadata,
      [PRICING_SCENE_ID]: { ...priceMeta, scenarios: [...existing, scenario] },
    },
  }

  const serialized = JSON.stringify(nextConfig)
  try {
    storage.setItem(SCENE_CONFIG_KEY, serialized)
  } catch {
    return false
  }

  // The browser never fires a storage event in the tab that wrote the value, so
  // dispatch one ourselves; the live deck (this tab, plus any presenter tab via
  // the real event) then adopts the new scenario.
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: SCENE_CONFIG_KEY, newValue: serialized }))
  } catch {
    /* non-DOM environment: the write is still persisted for the next read */
  }
  return true
}
