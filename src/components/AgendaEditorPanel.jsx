import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faXmark, faRotateLeft, faArrowUp, faArrowDown } from '@fortawesome/free-solid-svg-icons'
import { DEFAULT_AGENDA_ITEMS } from '../data/agendaDefaults'

export default function AgendaEditorPanel({
  isDark,
  scenes = [],
  sceneMetadata,
  onUpdateSceneMetadata,
}) {
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
