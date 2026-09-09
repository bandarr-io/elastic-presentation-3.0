import { useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus, faTrash, faXmark, faUpload, faUsers, faRotateLeft } from '@fortawesome/free-solid-svg-icons'
import { useTeamConfig } from '../context/TeamContext'

export default function TeamEditorPanel({ isDark }) {
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
    if (teamConfig.members.length >= 15) return
    const newMember = {
      id: `member-${Date.now()}`,
      name: '',
      role: '',
      email: '',
      phone: '',
      initials: '',
      photo: null,
    }
    updateTeamConfig({ ...teamConfig, members: [...teamConfig.members, newMember] })
  }

  return (
    <div className="space-y-4">
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
                          border: `2px solid ${accentColor}`,
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
                    ref={(el) => { fileInputRefs.current[member.id] = el }}
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
