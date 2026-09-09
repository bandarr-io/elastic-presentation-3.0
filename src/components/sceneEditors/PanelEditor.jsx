import { fieldLabelClass } from './BeatsEditorBlock'

const PANEL_DEFAULT_SPEAKERS = [
  { name: 'Panelist Name', role: 'Moderator', org: 'Your Organization', moderator: true },
  { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'CISO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'CIO', org: 'Your Organization' },
  { name: 'Panelist Name', role: 'Senior Director Solutions Architecture', org: 'Elastic', highlight: true },
]

export default function PanelEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.panel || {}
  const update = (patch) => onUpdateSceneMetadata('panel', { ...meta, ...patch })

  const speakers = meta.speakers?.length ? meta.speakers : PANEL_DEFAULT_SPEAKERS

  const saveSpeakers = (updated) => update({ speakers: updated })

  const updateSpeaker = (i, field, value) => {
    saveSpeakers(speakers.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)))
  }

  const deleteSpeaker = (i) => saveSpeakers(speakers.filter((_, idx) => idx !== i))

  const addSpeaker = () => saveSpeakers([...speakers, { name: '', role: '', org: '' }])

  const toggleClass = (active) =>
    `text-[11px] font-bold uppercase px-2 py-1 rounded cursor-pointer border transition-colors ${
      active
        ? isDark ? 'bg-elastic-teal/20 border-elastic-teal/40 text-elastic-teal' : 'bg-elastic-blue/10 border-elastic-blue/30 text-elastic-blue'
        : isDark ? 'bg-white/5 border-white/10 text-white/40'                    : 'bg-white border-elastic-dev-blue/15 text-elastic-dev-blue/40'
    }`

  const speakerCardClass = `p-3 rounded-lg border space-y-2 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`
  const speakerLabelClass = `text-[11px] mb-0.5 block ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`
  const sectionLabelClass = `text-xs font-bold uppercase tracking-wider ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`

  return (
    <div className="space-y-6 mt-6">
      <div className="space-y-4">
        <p className={sectionLabelClass}>Header</p>

        <div>
          <label className={fieldLabelClass(isDark)}>Eyebrow</label>
          <input
            type="text"
            value={meta.eyebrow || ''}
            onChange={(e) => update({ eyebrow: e.target.value })}
            className={inputClass}
            placeholder="Featured Panel"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Title</label>
          <input
            type="text"
            value={meta.title || ''}
            onChange={(e) => update({ title: e.target.value })}
            className={inputClass}
            placeholder="Understanding Security in Linking Infrastructure to Governing"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Title Accent (highlighted portion)</label>
          <input
            type="text"
            value={meta.titleAccent || ''}
            onChange={(e) => update({ titleAccent: e.target.value })}
            className={inputClass}
            placeholder="Infrastructure to Governing"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Date</label>
          <input
            type="text"
            value={meta.date || ''}
            onChange={(e) => update({ date: e.target.value })}
            className={inputClass}
            placeholder="March 11, 2025"
          />
        </div>

        <div>
          <label className={fieldLabelClass(isDark)}>Time</label>
          <input
            type="text"
            value={meta.time || ''}
            onChange={(e) => update({ time: e.target.value })}
            className={inputClass}
            placeholder="10:45 AM – 11:30 AM"
          />
        </div>

        <p className={`${sectionLabelClass} pt-2`}>Speakers</p>

        {speakers.map((speaker, i) => (
          <div key={i} className={speakerCardClass}>
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
              <label className={speakerLabelClass}>Name</label>
              <input type="text" value={speaker.name || ''} onChange={(e) => updateSpeaker(i, 'name', e.target.value)} className={inputClass} placeholder="Full name" />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className={speakerLabelClass}>Role</label>
                <input type="text" value={speaker.role || ''} onChange={(e) => updateSpeaker(i, 'role', e.target.value)} className={inputClass} placeholder="Title" />
              </div>
              <div className="flex-1">
                <label className={speakerLabelClass}>Organization</label>
                <input type="text" value={speaker.org || ''} onChange={(e) => updateSpeaker(i, 'org', e.target.value)} className={inputClass} placeholder="Company" />
              </div>
            </div>

            <div>
              <label className={speakerLabelClass}>Note (optional)</label>
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
      </div>
    </div>
  )
}
