import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../context/ThemeContext'

/**
 * Bottom stepper used by multi-beat scenes: numbered beat buttons + a replay
 * control. Mirrors the styling used across the deck's narrative scenes.
 *
 * Props:
 * - beats: [{ key, step }]
 * - beat: active index
 * - onGo: (index) => void
 * - onReplay: () => void
 */
function SceneStepper({ beats, beat, onGo, onReplay }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-3 relative">
      {beats.map((b, i) => {
        const isActive = i === beat
        return (
          <button
            key={b.key || i}
            onClick={() => onGo(i)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              isActive
                ? isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue'
                : isDark ? 'text-white/55 hover:text-white/80' : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue/80'
            }`}
          >
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
              isActive
                ? isDark ? 'border-elastic-teal' : 'border-elastic-blue'
                : isDark ? 'border-white/20' : 'border-elastic-dev-blue/20'
            }`}>{i + 1}</span>
            {b.step}
          </button>
        )
      })}
      {onReplay && (
        <button
          onClick={onReplay}
          title="Replay animation"
          className={`absolute right-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
            isDark ? 'bg-white/[0.06] text-white/50 hover:text-white/80' : 'bg-elastic-blue/10 text-elastic-blue/60 hover:text-elastic-blue'
          }`}
        >
          <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
        </button>
      )}
    </div>
  )
}

export default SceneStepper
