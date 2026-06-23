import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useTeamConfig } from '../context/TeamContext'
import SceneHeader from '../components/SceneHeader'

function TeamScene() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  // Single shared accent — no per-member hues (keeps the focus on names/roles).
  const accentColor = isDark ? '#48EFCF' : '#0B64DD'
  const [copiedEmail, setCopiedEmail] = useState(null)
  const [copiedPhone, setCopiedPhone] = useState(null)
  const [imageErrors, setImageErrors] = useState({})
  
  const { teamConfig } = useTeamConfig()

  const handleImageError = (memberId) => {
    setImageErrors(prev => ({ ...prev, [memberId]: true }))
  }

  const handleCopyEmail = async (email, id) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(id)
      setTimeout(() => setCopiedEmail(null), 2000)
    } catch (err) {
      console.error('Failed to copy email')
    }
  }

  const handleCopyPhone = async (phone, id) => {
    try {
      await navigator.clipboard.writeText(phone)
      setCopiedPhone(id)
      setTimeout(() => setCopiedPhone(null), 2000)
    } catch (err) {
      console.error('Failed to copy phone')
    }
  }

  // Calculate optimal grid layout based on number of team members
  const memberCount = teamConfig.members.length
  const getGridConfig = () => {
    if (memberCount <= 2) return { cols: memberCount, maxWidth: '900px', cardSize: 'large' }
    if (memberCount <= 4) return { cols: 2, maxWidth: '900px', cardSize: 'large' }
    if (memberCount <= 6) return { cols: 3, maxWidth: '1200px', cardSize: 'large' }
    if (memberCount <= 8) return { cols: 3, maxWidth: '1320px', cardSize: 'large' }
    if (memberCount <= 9) return { cols: 3, maxWidth: '1320px', cardSize: 'medium' }
    return { cols: 4, maxWidth: '1600px', cardSize: 'medium' }
  }

  const gridConfig = getGridConfig()
  const gridColsClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5'
  }[gridConfig.cols]

  return (
    <div className="flex flex-col h-full w-full py-4 overflow-y-auto">
      <div className="w-full px-8 mx-auto flex-1 flex flex-col" style={{ maxWidth: gridConfig.maxWidth }}>
        {/* Header */}
        <SceneHeader
          eyebrow={teamConfig.eyebrow || 'Your Support'}
          titlePlain="Meet Your "
          titleAccent="Elastic Team"
          subtitle={teamConfig.subtitle}
        />

        {/* Team Grid */}
        <div className="flex-1 flex flex-col justify-center">
        {teamConfig.members.length > 0 ? (
          <div className={`grid ${gridColsClass} gap-8`}>
            {teamConfig.members.map((member) => {
              // Dynamic sizing based on grid config
              const avatarSize = gridConfig.cardSize === 'large' ? 'w-24 h-24' : 
                                 gridConfig.cardSize === 'medium' ? 'w-20 h-20' : 
                                 'w-16 h-16'
              const avatarTextSize = gridConfig.cardSize === 'large' ? 'text-3xl' : 
                                     gridConfig.cardSize === 'medium' ? 'text-2xl' : 
                                     'text-lg'
              const nameSize = gridConfig.cardSize === 'large' ? 'text-2xl' : 
                              gridConfig.cardSize === 'medium' ? 'text-xl' : 
                              'text-base'
              const padding = gridConfig.cardSize === 'large' ? 'p-6' : 
                             gridConfig.cardSize === 'medium' ? 'p-5' : 
                             'p-4'
              const gap = gridConfig.cardSize === 'large' ? 'gap-5' : 
                         gridConfig.cardSize === 'medium' ? 'gap-5' : 
                         'gap-3'

              return (
                <div
                  key={member.id}
                  className={`group relative bg-white dark:bg-white/[0.03] rounded-2xl ${padding} border transition-all duration-300 hover:shadow-lg`}
                  style={{
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 28, 63, 0.1)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = `${accentColor}50`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(16, 28, 63, 0.1)'
                  }}
                >
                  <div className={`relative flex items-start ${gap}`}>
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      {member.photo && !imageErrors[member.id] ? (
                        <img
                          src={member.photo}
                          alt={member.name}
                          className={`${avatarSize} rounded-xl object-cover transition-transform duration-300 group-hover:scale-105`}
                          style={{ border: `3px solid ${accentColor}` }}
                          onError={() => handleImageError(member.id)}
                        />
                      ) : (
                        <div
                          className={`${avatarSize} rounded-xl flex items-center justify-center ${avatarTextSize} font-bold transition-transform duration-300 group-hover:scale-105`}
                          style={{ 
                            backgroundColor: isDark ? `${accentColor}20` : 'rgba(11, 100, 221, 0.1)',
                            color: accentColor,
                            border: `3px solid ${accentColor}`
                          }}
                        >
                          {member.initials}
                        </div>
                      )}
                      
                      {/* Online indicator */}
                      <div
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-3 border-white dark:border-elastic-dev-blue"
                        style={{ backgroundColor: accentColor }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`font-headline ${nameSize} font-bold text-elastic-dark-ink dark:text-white mb-1`}>
                        {member.name}
                      </h3>
                      <p className="font-body text-lg text-elastic-ink dark:text-elastic-light-grey/70 mb-4">
                        {member.role}
                      </p>

                    {/* Contact details */}
                    <div className="space-y-2">
                      {/* Email */}
                      {member.email && (
                        <button
                          onClick={() => handleCopyEmail(member.email, member.id)}
                          className="flex items-center gap-2 text-base text-elastic-dev-blue/70 dark:text-white/70 transition-colors group/email w-full"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = accentColor
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = ''
                          }}
                        >
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span>{member.email}</span>
                          <span 
                            className="text-xs transition-opacity ml-auto flex-shrink-0"
                            style={{ 
                              color: accentColor,
                              opacity: copiedEmail === member.id ? 1 : 0
                            }}
                          >
                            {copiedEmail === member.id ? 'Copied!' : ''}
                          </span>
                        </button>
                      )}

                      {/* Phone */}
                      {member.phone && (
                        <button
                          onClick={() => handleCopyPhone(member.phone, member.id)}
                          className="flex items-center gap-2 text-base text-elastic-dev-blue/70 dark:text-white/70 transition-colors group/phone w-full"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = accentColor
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = ''
                          }}
                        >
                          <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                          <span>{member.phone}</span>
                          <span 
                            className="text-xs transition-opacity ml-auto flex-shrink-0"
                            style={{ 
                              color: accentColor,
                              opacity: copiedPhone === member.id ? 1 : 0
                            }}
                          >
                            {copiedPhone === member.id ? 'Copied!' : ''}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                </div>
              )
            })}
          </div>
        ) : (
          // Empty state
          <div className="text-center py-16">
            <p className="text-lg text-elastic-dev-blue/70 dark:text-white/70 mb-2">
              No team members configured.
            </p>
            <p className="text-sm text-elastic-dev-blue/55 dark:text-white/55">
              Click the ⚙️ settings button to add team members.
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

export default TeamScene
