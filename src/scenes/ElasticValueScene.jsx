import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase,
  faServer,
  faGaugeHigh,
  faBolt,
  faLayerGroup,
} from '@fortawesome/free-solid-svg-icons'
import { resolveIcon } from '../data/iconOptions'
import { balancedColumns, gridColumnsStyle } from '../utils/layout'

// Generic placeholder metrics — this scene is intended as a layout template.
// Override any of these via scene metadata (Settings → Customizations → Value Delivered).
const DEFAULT_HERO_STATS = [
  { value: '000', label: 'Hero metric one', icon: faDatabase },
  { value: '000', label: 'Hero metric two', icon: faServer },
  { value: '00%', label: 'Hero metric three', icon: faGaugeHigh },
  { value: '000', label: 'Hero metric four', icon: faBolt },
]

const DEFAULT_STATS = [
  { value: '00', label: 'Stat label one' },
  { value: '00', label: 'Stat label two' },
  { value: '00', label: 'Stat label three' },
  { value: '00', label: 'Stat label four' },
  { value: '00', label: 'Stat label five' },
  { value: '00', label: 'Stat label six' },
  { value: '00', label: 'Stat label seven' },
  { value: '00', label: 'Stat label eight' },
]

function ElasticValueScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const heroStats = (metadata.heroStats || DEFAULT_HERO_STATS).map((item, i) => {
    const merged = { ...(DEFAULT_HERO_STATS[i] || {}), ...item }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_HERO_STATS[i]?.icon) }
  })
  const stats = metadata.stats || DEFAULT_STATS
  const eyebrow = metadata.eyebrow || 'Eyebrow text'
  const titlePlain = metadata.titlePlain || 'Section Title'
  const titleAccent = metadata.titleAccent || ' Accent'
  const subtitle =
    metadata.subtitle ||
    'Subtitle placeholder — a short supporting sentence describing the metrics shown below.'
  const bottomLine =
    metadata.bottomLine ||
    'Bottom line placeholder — a single summary statement that ties the numbers together.'
  const bottomLineEyebrow = metadata.bottomLineEyebrow || 'The Bottom Line'
  const bottomLineIcon = resolveIcon(metadata.bottomLineIcon, faLayerGroup)

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const heroBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const statBg = isDark ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-white/70 border-elastic-dev-blue/[0.08]'

  const heroCols = balancedColumns(heroStats.length, 4)
  const statCols = balancedColumns(stats.length, 4)

  return (
    <div className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <SceneHeader
          eyebrow={eyebrow}
          titleAccent={titleAccent}
          titlePlain={titlePlain}
          subtitle={subtitle}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: gridColumnsStyle(heroCols) }}>
            {heroStats.map((s, i) => (
              <div
                key={i}
                className={`rounded-2xl border p-5 flex flex-col gap-2 ${heroBg}`}
              >
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  <FontAwesomeIcon icon={s.icon} />
                </span>
                <span
                  className="font-headline font-extrabold leading-none text-4xl"
                  style={{ color: accent }}
                >
                  {s.value}
                </span>
                <span className={`text-sm leading-snug ${mutedText}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="grid gap-4" style={{ gridTemplateColumns: gridColumnsStyle(statCols) }}>
            {stats.map((s, i) => (
              <div
                key={i}
                className={`rounded-xl border px-5 py-4 flex flex-col gap-1 ${statBg}`}
              >
                <span className={`font-headline font-bold leading-none text-3xl ${headText}`}>
                  {s.value}
                </span>
                <span className={`text-sm leading-snug ${mutedText}`}>{s.label}</span>
              </div>
            ))}
          </div>

          <div
            className="mt-auto rounded-2xl border p-5 flex items-center gap-4"
            style={{
              backgroundColor: `${accent}12`,
              borderColor: `${accent}40`,
            }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <FontAwesomeIcon icon={bottomLineIcon} />
            </span>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: accent }}
              >
                {bottomLineEyebrow}
              </p>
              <p className={`text-base md:text-lg leading-snug ${headText}`}>{bottomLine}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ElasticValueScene
