import { EyebrowField, editorCardClass, fieldLabelClass, sectionTitleClass } from './BeatsEditorBlock'
import { DEFAULT_TOUR_PAGES, TOUR_PAGE_GROUPS, TOUR_PAGE_REGISTRY } from '../../data/tourPageRegistry'

const SCENE_ID = 'scene-tour'
const OTHER_GROUP = 'Other'

// Groups registry slides that are not yet in the tour, in TOUR_PAGE_GROUPS order.
// Empty groups are omitted. Slides whose group is unknown go into a trailing 'Other' group.
export function groupAvailable(registry, groups, usedIds) {
  const used = new Set(usedIds)
  const buckets = new Map(groups.map((group) => [group, []]))
  const other = []
  for (const id of Object.keys(registry)) {
    if (used.has(id)) continue
    const bucket = buckets.get(registry[id]?.group)
    if (bucket) bucket.push(id)
    else other.push(id)
  }
  const result = []
  for (const [group, ids] of buckets) {
    if (ids.length > 0) result.push({ group, ids })
  }
  if (other.length > 0) result.push({ group: OTHER_GROUP, ids: other })
  return result
}

export function currentPages(meta) {
  const pages = meta?.pages
  if (Array.isArray(pages) && pages.some((p) => typeof p?.sceneId === 'string')) return pages
  // Legacy format: index-keyed partial overrides on the default list. Show them,
  // so the first edit does not silently discard them.
  const overrides = Array.isArray(pages) ? pages : []
  return DEFAULT_TOUR_PAGES.map((page, i) => ({ ...page, ...(overrides[i] || {}) }))
}

export function movePage(list, index, direction) {
  const target = index + direction
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return [...list]
  const next = [...list]
  const moved = next[index]
  next[index] = next[target]
  next[target] = moved
  return next
}

// A patch value of undefined removes that key from the page.
export function setPage(list, index, patch) {
  return list.map((page, i) => {
    if (i !== index) return page
    const merged = { ...page, ...patch }
    return Object.fromEntries(Object.entries(merged).filter(([, v]) => v !== undefined))
  })
}

export function removePage(list, index) {
  return list.filter((_, i) => i !== index)
}

export function addPage(list, sceneId) {
  return [...list, { sceneId }]
}

const buttonClass = (isDark) =>
  `text-xs px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed ${
    isDark
      ? 'border-white/15 text-white/70 hover:bg-white/10'
      : 'border-elastic-dev-blue/20 text-elastic-dark-ink/70 hover:bg-elastic-dev-blue/5'
  }`

export default function SceneTourEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass }) {
  const meta = sceneMetadata?.[SCENE_ID] || {}
  const update = (patch) => onUpdateSceneMetadata(SCENE_ID, { ...meta, ...patch })
  const pages = currentPages(meta)
  const enabledCount = pages.filter((p) => p.enabled !== false && TOUR_PAGE_REGISTRY[p.sceneId]).length
  const availableGroups = groupAvailable(
    TOUR_PAGE_REGISTRY,
    TOUR_PAGE_GROUPS,
    pages.map((p) => p.sceneId),
  )

  // The parent merges metadata, so deleting a key would not clear it. An undefined value does.
  const resetToDefaults = () => {
    onUpdateSceneMetadata(SCENE_ID, { pages: undefined })
  }

  return (
    <div className="space-y-6 mt-6">
      <EyebrowField
        value={meta.eyebrow || ''}
        onChange={(eyebrow) => update({ eyebrow })}
        placeholder="Elastic · Scene Tour"
        inputClass={inputClass}
        isDark={isDark}
      />

      <div>
        <h3 className={sectionTitleClass(isDark)}>Slides</h3>
        <div className="space-y-3 mt-3">
          {pages.map((page, i) => {
            const entry = TOUR_PAGE_REGISTRY[page.sceneId]
            const defaultTitle = entry ? entry.title : page.sceneId
            const label = page.title || defaultTitle
            const hasBeats = Boolean(entry?.beats)
            const holdId = `scene-tour-hold-${i}`
            const checkId = `scene-tour-enabled-${i}`
            return (
              <div key={`${page.sceneId}-${i}`} className={editorCardClass(isDark)}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <label htmlFor={checkId} className={`flex items-center gap-2 text-sm ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                    <input
                      id={checkId}
                      type="checkbox"
                      checked={page.enabled !== false}
                      // The last enabled page stays on: with none, the engine would
                      // fall back to the default tour and drop these settings.
                      disabled={page.enabled !== false && enabledCount === 1}
                      onChange={(e) => update({ pages: setPage(pages, i, { enabled: e.target.checked }) })}
                    />
                    {defaultTitle}
                    {!entry && <span className="text-xs opacity-60">(not available)</span>}
                  </label>
                  <div className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      aria-label={`Move up ${label}`}
                      className={buttonClass(isDark)}
                      disabled={i === 0}
                      onClick={() => update({ pages: movePage(pages, i, -1) })}
                    >
                      Move up
                    </button>
                    <button
                      type="button"
                      aria-label={`Move down ${label}`}
                      className={buttonClass(isDark)}
                      disabled={i === pages.length - 1}
                      onClick={() => update({ pages: movePage(pages, i, 1) })}
                    >
                      Move down
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${label}`}
                      className={buttonClass(isDark)}
                      // Removing the only enabled page would silently bring the defaults back.
                      // A single page is also blocked, since removing it leaves nothing to show.
                      disabled={pages.length === 1 || (page.enabled !== false && enabledCount === 1)}
                      onClick={() => update({ pages: removePage(pages, i) })}
                    >
                      Remove
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={`scene-tour-title-${i}`} className={fieldLabelClass(isDark)}>Title</label>
                    <input
                      id={`scene-tour-title-${i}`}
                      type="text"
                      value={page.title || ''}
                      onChange={(e) => update({ pages: setPage(pages, i, { title: e.target.value }) })}
                      className={inputClass}
                      placeholder={defaultTitle}
                    />
                  </div>
                  <div>
                    <label htmlFor={holdId} className={fieldLabelClass(isDark)}>Hold (seconds)</label>
                    <input
                      id={holdId}
                      type="number"
                      min="1"
                      step="0.5"
                      disabled={hasBeats}
                      value={page.hold != null && !hasBeats ? page.hold / 1000 : ''}
                      onChange={(e) => {
                        const seconds = Number(e.target.value)
                        const hasValue = e.target.value !== '' && Number.isFinite(seconds) && seconds >= 1
                        update({
                          pages: setPage(pages, i, { hold: hasValue ? Math.round(seconds * 1000) : undefined }),
                        })
                      }}
                      className={inputClass}
                      placeholder="default"
                    />
                    {hasBeats && (
                      <p className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        Timing follows the scene's own beats
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {availableGroups.length > 0 && (
          <div className="mt-3">
            <select
              aria-label="Add slide"
              value=""
              className={inputClass}
              onChange={(e) => {
                if (e.target.value) update({ pages: addPage(pages, e.target.value) })
              }}
            >
              <option value="">Add a slide...</option>
              {availableGroups.map(({ group, ids }) => (
                <optgroup key={group} label={group}>
                  {ids.map((id) => (
                    <option key={id} value={id}>
                      {TOUR_PAGE_REGISTRY[id].title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <button type="button" className={buttonClass(isDark)} onClick={resetToDefaults}>
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
