import { createContext, useContext, useState, useEffect } from 'react'

const TeamContext = createContext()
const TEAM_STORAGE_KEY = 'presentation-team-config'

const DEFAULT_TEAM_CONFIG = {
  eyebrow: 'Your Support',
  title: 'Meet Your Elastic Team',
  subtitle: 'Our dedicated team is here to support your success.',
  members: [
    {
      id: 'member-1',
      name: 'Dave Stroth',
      role: 'Global Public Sector AVP',
      email: 'dave.stroth@elastic.co',
      color: '#48EFCF',
      initials: 'DS',
      photo: 'photos/dave-stroth.jpg'
    },
    {
      id: 'member-2',
      name: 'Greg DeYoung',
      role: 'Regional VP',
      email: 'greg.deyoung@elastic.co',
      color: '#0B64DD',
      initials: 'GD',
      photo: 'photos/greg-deyoung.jpg'
    },
    {
      id: 'member-3',
      name: 'Baha Azarmi',
      role: 'GM, Observability',
      email: 'baha@elastic.co',
      color: '#F04E98',
      initials: 'BA',
      photo: 'photos/baha-azarmi.png'
    },
    {
      id: 'member-4',
      name: 'John Harmon',
      role: 'Global Public Sector AM',
      email: 'john.harmon@elastic.co',
      color: '#FEC514',
      initials: 'JH',
      photo: 'photos/john-harmon.png'
    },
    {
      id: 'member-5',
      name: 'Bobby Suber',
      role: 'SA Manager',
      email: 'bobby.suber@elastic.co',
      color: '#FF957D',
      initials: 'BS',
      photo: 'photos/bobby-suber.png'
    },
    {
      id: 'member-6',
      name: 'Brent Cox',
      role: 'Senior Principal SA',
      email: 'brent.cox@elastic.co',
      color: '#153385',
      initials: 'BC',
      photo: 'photos/brent-cox.jpg'
    },
    {
      id: 'member-7',
      name: 'Kip Welty',
      role: 'Public Sector AE',
      email: 'kip.welty@elastic.co',
      color: '#48EFCF',
      initials: 'KW',
      photo: 'photos/kip-welty.jpg'
    },
    {
      id: 'member-8',
      name: 'Customer CA',
      role: 'Customer Architect',
      email: 'ca@elastic.co',
      color: '#0B64DD',
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
