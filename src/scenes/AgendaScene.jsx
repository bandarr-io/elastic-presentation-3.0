import { useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { DEFAULT_AGENDA_ITEMS } from '../data/agendaDefaults'

// Session schedule (edit in Scene Settings).
// `sceneIds` maps each block to the web-app scenes shown during it (used for expand-to-show).
// Default schedule lives in a shared module so the settings panel can edit it.
const AgendaScene = ({ scenes = [], sceneMetadata = {}, customDurations = {}, metadata = {}, expanded = {}, setExpanded = () => {}, expandAllSignal = 0 }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const eyebrow = metadata.eyebrow || 'Session Schedule'
  const subtitle = metadata.subtitle || 'Date · Time · Venue'
  const items = Array.isArray(metadata.items) && metadata.items.length ? metadata.items : DEFAULT_AGENDA_ITEMS

  // Resolve a block's scene ids into displayable scene records (title/duration), skipping any not in the deck.
  const sceneById = new Map(scenes.map((s) => [s.id, s]))
  const resolveScenes = (item) =>
    (item.sceneIds || [])
      .map((id) => {
        const scene = sceneById.get(id)
        if (!scene) return null
        const meta = sceneMetadata?.[id] || {}
        return {
          id,
          title: meta.title || scene.title,
          duration: customDurations?.[id] || scene.duration || '',
        }
      })
      .filter(Boolean)

  const expandableIndices = items.map((it, i) => (resolveScenes(it).length > 0 ? i : -1)).filter((i) => i >= 0)

  // Expand-all is triggered from the nav bar via an incrementing signal.
  useEffect(() => {
    if (expandAllSignal > 0) {
      setExpanded(Object.fromEntries(expandableIndices.map((i) => [i, true])))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAllSignal])

  const toggleOne = (i) => setExpanded((prev) => ({ ...prev, [i]: !prev[i] }))

  return (
    <div className="flex flex-col h-full w-full px-6 py-4 overflow-hidden">
      {/* Header */}
      <SceneHeader
        eyebrow={eyebrow}
        titlePlain="Today's "
        titleAccent="Agenda"
        subtitle={subtitle}
      />

      {/* Timeline */}
      <div className="flex-1 min-h-0 overflow-y-auto w-full max-w-3xl mx-auto flex flex-col">
        <div className="flex flex-col gap-3 my-auto py-2">
          {items.map((item, index) => {
            const blockScenes = resolveScenes(item)
            const hasScenes = blockScenes.length > 0
            const isOpen = !!expanded[index]
            return (
              <div
                key={`${item.time}-${item.title}`}
                className={`relative flex items-stretch gap-3 rounded-xl p-4 transition-all duration-300 ${
                  isDark
                    ? 'bg-white/[0.03] border border-white/10 hover:bg-white/[0.05]'
                    : 'bg-white border border-elastic-dev-blue/10 hover:border-elastic-blue/20 hover:shadow-md'
                }`}
              >
                {/* Accent bar */}
                <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r" style={{ backgroundColor: accent }} />

                {/* Time */}
                <div
                  className="flex-shrink-0 w-36 pl-3 flex items-start pt-0.5 font-mono text-sm font-semibold whitespace-nowrap"
                  style={{ color: accent }}
                >
                  {item.time}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => hasScenes && toggleOne(index)}
                    className={`flex items-start justify-between gap-2 w-full text-left ${hasScenes ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <div className="min-w-0">
                      <h3 className={`font-bold leading-snug text-lg ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                        {item.title}
                      </h3>
                      {item.subtitle && (
                        <p className={`text-sm leading-paragraph mt-0.5 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                    {hasScenes && (
                      <span className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
                        <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-elastic-blue/60'}`}>
                          {blockScenes.length} scene{blockScenes.length > 1 ? 's' : ''}
                        </span>
                        <svg
                          className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-white/50' : 'text-elastic-blue/60'}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </span>
                    )}
                  </button>

                  {/* Expanded scene list */}
                  {hasScenes && isOpen && (
                    <ul className={`mt-2.5 space-y-1.5 border-t pt-2.5 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                      {blockScenes.map((s) => (
                        <li key={s.id} className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />
                          <span className={`text-sm ${isDark ? 'text-white/80' : 'text-elastic-dark-ink/80'}`}>{s.title}</span>
                          {s.duration && (
                            <span className={`text-xs ml-auto flex-shrink-0 ${isDark ? 'text-white/70' : 'text-elastic-blue/60'}`}>
                              {s.duration}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AgendaScene
