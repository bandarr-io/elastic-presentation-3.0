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

// Headline platform metrics — replace with your customer's deployment figures.
// Override any of these via scene metadata.
const DEFAULT_HERO_STATS = [
  { value: '720B', label: 'Documents stored & searchable', icon: faDatabase },
  { value: '640TB', label: 'Total data under management', icon: faServer },
  { value: '99.99%', label: 'Cluster uptime', icon: faGaugeHigh },
  { value: '6TB', label: 'Ingested every day', icon: faBolt },
]

const DEFAULT_STATS = [
  { value: '159', label: 'Users served (40–60 daily)' },
  { value: '57', label: 'Servers run by a team of 3' },
  { value: '20+', label: 'High-volume log sources' },
  { value: '163', label: 'Active ingest pipelines' },
  { value: 'v9.4.2', label: 'Live since 2015 (from v2.x)' },
  { value: '1 yr', label: 'Historical log retention' },
  { value: '20–40%', label: 'Storage saved via LogsDB' },
  { value: '180', label: 'WEC subscriptions via GPO' },
]

function ElasticValueScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const heroStats = metadata.heroStats || DEFAULT_HERO_STATS
  const stats = metadata.stats || DEFAULT_STATS
  const eyebrow = metadata.eyebrow || 'Already Delivering Value'
  const titlePlain = metadata.titlePlain || 'Your Platform,'
  const titleAccent = metadata.titleAccent || ' by the Numbers'
  const subtitle =
    metadata.subtitle ||
    'One self-managed, on-premises platform powering security, identity, compliance, and operations across your users and teams — end to end.'
  const bottomLine =
    metadata.bottomLine ||
    'A single on-prem platform that consolidates 20+ vendor portals into one customizable window — accelerating investigations and giving every team enterprise search over the data they depend on.'

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'
  const heroBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const statBg = isDark ? 'bg-white/[0.02] border-white/[0.07]' : 'bg-white/70 border-elastic-dev-blue/[0.08]'

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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {heroStats.map((s) => (
              <div
                key={s.label}
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <div
                key={s.label}
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
              <FontAwesomeIcon icon={faLayerGroup} />
            </span>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: accent }}
              >
                The Bottom Line
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
