import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faBolt,
  faShieldHalved,
  faCheck,
  faCloudArrowDown,
} from '@fortawesome/free-solid-svg-icons'

// Operational detail from the on-prem platform showcase. Override via metadata.
const DEFAULT_PILLARS = [
  {
    id: 'architecture',
    title: 'Architecture & Performance',
    icon: faServer,
    points: [
      'Tiered storage — HOT on SSD, COLD on PureStorage FlashBlade appliances',
      'Full-year queries return in under 6s; same-day queries under 2s',
      'Resilient through upgrades, hardware migrations, and a new RHEL OS version',
      'LogsDB delivers a realized 20–40% reduction in storage footprint',
    ],
  },
  {
    id: 'ingestion',
    title: 'Ingestion & Scale',
    icon: faBolt,
    points: [
      '6 TB ingested daily from 30+ high-volume vendor log sources',
      '163 ingest pipelines · 180 WEC subscriptions via GPO · 36 APIs & service accounts',
      '1 year of history for core infra and Windows Event logs across all domain controllers',
      'Targeted workstation Event IDs — process command line and PowerShell',
    ],
  },
  {
    id: 'engineering',
    title: 'Security, Lifecycle & Engineering',
    icon: faShieldHalved,
    points: [
      'Cluster-wide TLS certificate renewals and deployment',
      'Data nodes firewalled — node-to-node communication only',
      'Elastic APM self-monitors ingest rates, node metrics, and cert expirations',
      'Ongoing detection-rule engineering, ML jobs, and ECS field normalization',
      'Custom enrichment fields + managed sources (assets, threat intel)',
    ],
  },
]

function PlatformOperationsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const pillars = metadata.pillars || DEFAULT_PILLARS
  const eyebrow = metadata.eyebrow || 'What We Manage On-Prem'
  const titleAccent = metadata.titleAccent || 'Run Self-Managed'
  const titlePlain = metadata.titlePlain || ', End to End'
  const subtitle =
    metadata.subtitle ||
    'Hardware, ingestion, routing, tiering, retention, security, certificates, and brokers — all owned and operated in-house.'
  const footer =
    metadata.footer ||
    'Everything above runs self-managed on-premises with no cloud dependencies — a single replacement for 20+ vendor log-visualization portals. (Hybrid is planned for 2026.)'

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/70'
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  return (
    <div className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <SceneHeader
          accentFirst
          eyebrow={eyebrow}
          titleAccent={titleAccent}
          titlePlain={titlePlain}
          subtitle={subtitle}
        />

        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pillars.map((p) => (
              <div key={p.id} className={`rounded-2xl border p-5 flex flex-col gap-3 ${cardBg}`}>
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${accent}1f`, color: accent }}
                  >
                    <FontAwesomeIcon icon={p.icon} />
                  </span>
                  <h3 className={`font-bold text-base leading-tight ${headText}`}>{p.title}</h3>
                </div>
                <ul className="space-y-2.5">
                  {p.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <FontAwesomeIcon
                        icon={faCheck}
                        className="mt-1 text-xs shrink-0"
                        style={{ color: accent }}
                      />
                      <span className={`text-sm leading-snug ${mutedText}`}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div
            className="mt-auto rounded-2xl border p-5 flex items-center gap-4"
            style={{ backgroundColor: `${accent}12`, borderColor: `${accent}40` }}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              <FontAwesomeIcon icon={faCloudArrowDown} />
            </span>
            <div className="min-w-0">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-1"
                style={{ color: accent }}
              >
                Value Delivered
              </p>
              <p className={`text-base md:text-lg leading-snug ${headText}`}>{footer}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PlatformOperationsScene
