import { createContext, useContext, useState, useEffect } from 'react'

const TeamContext = createContext()
const TEAM_STORAGE_KEY = 'presentation-team-config'

const DEFAULT_TEAM_CONFIG = {
  eyebrow: 'Your Support',
  title: 'Meet Your Elastic Team',
  subtitle: 'Our dedicated team is here to support your success.',
  // Placeholder roster — replace with the presenting team in Team Settings.
  // Roles "Account Executive", "Solutions Architect", and "Customer Architect"
  // are auto-surfaced in the Next Steps contact panel.
  members: [
    {
      id: 'member-1',
      name: 'Team Member',
      role: 'Account Executive',
      email: 'ae@example.com',
      color: '#48EFCF',
      initials: 'AE'
    },
    {
      id: 'member-2',
      name: 'Team Member',
      role: 'Regional VP',
      email: 'rvp@example.com',
      color: '#0B64DD',
      initials: 'VP'
    },
    {
      id: 'member-3',
      name: 'Team Member',
      role: 'Account Manager',
      email: 'am@example.com',
      color: '#F04E98',
      initials: 'AM'
    },
    {
      id: 'member-4',
      name: 'Team Member',
      role: 'SA Manager',
      email: 'sam@example.com',
      color: '#FEC514',
      initials: 'SM'
    },
    {
      id: 'member-5',
      name: 'Team Member',
      role: 'Solutions Architect',
      email: 'sa@example.com',
      color: '#FF957D',
      initials: 'SA'
    },
    {
      id: 'member-6',
      name: 'Team Member',
      role: 'Customer Architect',
      email: 'ca@example.com',
      color: '#153385',
      initials: 'CA'
    }
  ]
}

export function TeamProvider({ children }) {
  const [teamConfig, setTeamConfig] = useState(() => {
    const saved = localStorage.getItem(TEAM_STORAGE_KEY)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return DEFAULT_TEAM_CONFIG
      }
    }
    return DEFAULT_TEAM_CONFIG
  })

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamConfig))
  }, [teamConfig])

  const updateTeamConfig = (newConfig) => {
    setTeamConfig(newConfig)
  }

  const resetTeamConfig = () => {
    setTeamConfig(DEFAULT_TEAM_CONFIG)
  }

  return (
    <TeamContext.Provider value={{ 
      teamConfig, 
      updateTeamConfig, 
      resetTeamConfig,
      isLoading 
    }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeamConfig() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeamConfig must be used within a TeamProvider')
  }
  return context
}
