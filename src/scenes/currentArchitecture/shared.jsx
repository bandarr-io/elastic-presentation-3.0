import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightLong } from '@fortawesome/free-solid-svg-icons'

// Theme-derived class tokens shared by every architecture layout.
export function tokens(isDark) {
  return {
    cardBase: isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10',
    subCard: isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-light-grey/60',
    chip: isDark
      ? 'bg-white/[0.05] border-white/10 text-white/80'
      : 'bg-elastic-light-grey border-elastic-dev-blue/10 text-elastic-dark-ink',
    mutedText: isDark ? 'text-white/70' : 'text-elastic-dark-ink/70',
    ink: isDark ? 'text-white' : 'text-elastic-dark-ink',
    accentHex: isDark ? '#48EFCF' : '#0B64DD',
    neutralHex: isDark ? '#FFFFFF' : '#1C1E23',
  }
}

export function ZoneHeader({ icon, color, isDark, children }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
        {children}
      </h3>
    </div>
  )
}

export function PipeArrow({ isDark }) {
  return (
    <div className="flex items-center justify-center">
      <FontAwesomeIcon icon={faArrowRightLong} className={isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'} />
    </div>
  )
}
