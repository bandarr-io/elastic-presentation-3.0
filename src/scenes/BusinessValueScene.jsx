import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShield, faClock, faRocket, faCoins } from '@fortawesome/free-solid-svg-icons'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'

const BusinessValueScene = ({ selectedCard, setSelectedCard, showUnifiedMessage, setShowUnifiedMessage, metadata = {} }) => {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const eyebrow     = metadata.eyebrow     || 'Business Value'
  const title       = metadata.title       || 'Delivering Measurable'
  const titleHighlight = metadata.titleHighlight || 'Business Value'
  const subtitle    = metadata.subtitle    || 'Elastic helps organizations in four key areas.'
  const summaryText = metadata.summaryText || 'Elastic delivers tangible impact across all four areas with a unified platform.'

  const defaultCards = [
    { title: 'Risk Reduction',  description: 'Reduce likelihood & severity of threats',  detailText: 'Elastic helps reduce your attack surface, detect threats faster, and improve your overall security posture.' },
    { title: 'Time Efficiency', description: 'Do more with less',                        detailText: 'Elastic helps you automate manual tasks, streamline workflows, and get insights faster so your teams can focus on what matters most.' },
    { title: 'Resilience',      description: 'Respond & recover faster',                 detailText: 'Elastic helps you quickly identify and resolve issues, minimize downtime, and maintain business continuity even during incidents.' },
    { title: 'Cost Savings',    description: 'Reduce expenses & prevent losses',          detailText: 'Elastic helps you consolidate tools, optimize resource usage, and prevent costly security breaches and operational incidents.' },
  ]

  // Single accent: cards differ by icon + label + weight, never hue.
  const accentHex = isDark ? '#48EFCF' : '#0B64DD'
  const cardIcons = [faShield, faClock, faRocket, faCoins]

  const valueCards = defaultCards.map((defaults, i) => ({
    id: ['risk', 'time', 'resilience', 'cost'][i],
    icon:        resolveIcon(metadata.cards?.[i]?.icon, cardIcons[i]),
    title:       metadata.cards?.[i]?.title       || defaults.title,
    description: metadata.cards?.[i]?.description || defaults.description,
    detailText:  metadata.cards?.[i]?.detailText  || defaults.detailText,
  }))

  return (
    <div className="flex flex-col h-full w-full py-4 overflow-hidden">
      <div className="w-full max-w-[1600px] px-8 md:px-16 mx-auto flex-1 flex flex-col">
        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={`${title} `}
          titleAccent={titleHighlight}
          subtitle={subtitle}
        />

        <div className="flex-1 flex flex-col justify-center gap-8">
        {/* Value Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {valueCards.map((card, index) => (
            <div
              key={index}
              role="button"
              onClick={() => {
                setSelectedCard(card)
                setShowUnifiedMessage(false)
              }}
              className={`rounded-2xl p-10 transition-all duration-300 border-2 cursor-pointer ${
                isDark ? 'bg-white/[0.03] hover:bg-white/[0.05]' : 'bg-white hover:shadow-xl'
              } ${
                selectedCard?.id === card.id && !showUnifiedMessage
                  ? `scale-105 ring-2 ${isDark ? 'ring-elastic-teal/60 border-elastic-teal/60' : 'ring-elastic-blue/50 border-elastic-blue/50'}`
                  : `hover:scale-105 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`
              }`}
            >
              {/* Icon */}
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
                style={{ backgroundColor: isDark ? 'rgba(72, 239, 207, 0.1)' : 'rgba(11, 100, 221, 0.1)' }}
              >
                <FontAwesomeIcon
                  icon={card.icon}
                  className="text-4xl"
                  style={{ color: accentHex }}
                />
              </div>

              {/* Title */}
              <h3 className={`text-4xl font-bold mb-4 ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
                {card.title}
              </h3>

              {/* Description */}
              <p className={`text-xl ${
                isDark ? 'text-white/70' : 'text-elastic-ink'
              }`}>
                {card.description}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom Section — fixed height so cards never shift */}
        <div className="text-center relative min-h-[160px] flex flex-col items-center justify-center">
          {showUnifiedMessage ? (
            // Unified Platform Message
            <div className="flex flex-col items-center gap-6">
              {/* Four Icons */}
              <div className="flex items-center gap-4">
                {valueCards.map((card) => (
                  <div
                    key={card.id}
                    className="w-14 h-14 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isDark ? 'rgba(72, 239, 207, 0.1)' : 'rgba(11, 100, 221, 0.1)' }}
                  >
                    <FontAwesomeIcon
                      icon={card.icon}
                      className="text-xl"
                      style={{ color: accentHex }}
                    />
                  </div>
                ))}
              </div>
              
              {/* Message */}
              <p className={`text-2xl font-semibold max-w-4xl ${
                isDark ? 'text-white' : 'text-elastic-dark-ink'
              }`}>
                {summaryText}
              </p>
            </div>
          ) : !selectedCard ? (
            <p className={`text-xl font-medium ${isDark ? 'text-white/70' : 'text-elastic-ink'}`}>
              Select a value area to see how Elastic delivers it.
            </p>
          ) : (
            // Selected Card Details
            <div className="flex flex-col items-center">
              {/* Detail Text */}
              <p className={`text-3xl font-medium max-w-5xl ${
                isDark ? 'text-white/90' : 'text-elastic-ink/90'
              }`}>
                {selectedCard.detailText}
              </p>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}

export default BusinessValueScene
