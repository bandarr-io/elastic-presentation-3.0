import { useState, useRef, useEffect } from 'react'
import { animate } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLock,
  faCoins,
  faGear,
  faCheck,
  faCloudArrowDown,
  faServer,
  faCloud,
  faBolt,
  faLayerGroup,
  faGlobe,
  faRocket,
} from '@fortawesome/free-solid-svg-icons'

// Each deployment model fills the same layout: one hero card (pillar 0, with a
// lead + highlight) plus two supporting boxes, and a "value delivered" footer.
// Override via metadata (Settings → Customizations → Deployment Models).
const DEFAULT_MODELS = [
  {
    id: 'self-managed',
    label: 'Self-Managed',
    navIcon: faServer,
    pillars: [
      {
        id: 'control',
        title: 'Full Control & Data Sovereignty',
        icon: faLock,
        lead: 'Keep your most sensitive data entirely within your environment — on your infrastructure, under your governance.',
        highlight: '100% on your infrastructure',
        points: [
          'Your data stays inside your network — nothing leaves your perimeter',
          'Meet strict data-residency, compliance, and air-gapped requirements',
          'You own the upgrade cadence, configuration, and security posture',
          'Deploy anywhere: bare metal, VMs, private cloud, or Kubernetes (ECK)',
        ],
      },
      {
        id: 'cost',
        title: 'Predictable Cost & No Lock-In',
        icon: faCoins,
        points: [
          'One license unlocks the full platform — no metered ingestion',
          'Run on hardware you already own and right-size to your workload',
          'Scale capacity without surprise overage charges',
          'Open, standards-based stack — no proprietary lock-in',
        ],
      },
      {
        id: 'performance',
        title: 'Performance & Customization',
        icon: faGear,
        points: [
          'Co-locate Elastic with your data sources for low-latency search',
          'Tune storage tiers — hot, warm, cold, frozen — to balance speed and cost',
          'Full access to every setting, plugin, and API',
          'Integrate natively with your existing identity and security stack',
        ],
      },
    ],
    footer:
      'Self-managed Elastic delivers the same search, observability, and security platform as the cloud — deployed on your infrastructure, under your governance, with no external dependencies.',
  },
  {
    id: 'cloud-hosted',
    label: 'Cloud Hosted',
    navIcon: faCloud,
    pillars: [
      {
        id: 'managed',
        title: 'Elastic-Managed in Your Cloud',
        icon: faCloud,
        lead: 'Run Elastic on AWS, Google Cloud, or Azure — Elastic operates the cluster while you stay in control of sizing and region.',
        highlight: 'Up and running in minutes',
        points: [
          'Deploy in minutes in your preferred cloud provider and region',
          'One-click upgrades and version management handled for you',
          'Autoscaling adapts capacity to demand automatically',
          'SLA-backed uptime with Elastic-managed reliability',
        ],
      },
      {
        id: 'cost-scale',
        title: 'Cost-Efficient at Scale',
        icon: faLayerGroup,
        points: [
          'Hot → warm → cold → frozen tiers cut storage costs',
          'Searchable snapshots keep long-term data cheap and queryable',
          'Pay for the capacity you provision — scale up or down anytime',
          'No hardware to buy, house, or refresh',
        ],
      },
      {
        id: 'reach',
        title: 'Flexibility & Reach',
        icon: faGlobe,
        points: [
          'Choose your cloud provider and region for data locality',
          'Cross-cluster search and replication across regions',
          'Full platform: Search, Observability, and Security',
          'Integrates with native cloud services and IAM',
        ],
      },
    ],
    footer:
      'Cloud Hosted gives you the full Elastic platform as a managed service on the cloud of your choice — fast to launch, easy to operate, and elastic by design.',
  },
  {
    id: 'serverless',
    label: 'Serverless',
    navIcon: faBolt,
    pillars: [
      {
        id: 'zero-ops',
        title: 'Fully Managed, Zero Ops',
        icon: faBolt,
        lead: 'No clusters to size, scale, or upgrade — Elastic runs everything so your team can focus on outcomes, not infrastructure.',
        highlight: 'Zero infrastructure to manage',
        points: [
          'No infrastructure to provision, size, or maintain',
          'Instant, automatic scaling that decouples compute from storage',
          'Always on the latest version — no upgrades to manage',
          'Start ingesting and searching in seconds',
        ],
      },
      {
        id: 'usage-pricing',
        title: 'Usage-Based Pricing',
        icon: faCoins,
        points: [
          'Pay only for what you ingest, store, and search',
          'No idle capacity to pay for',
          'Costs scale naturally with your workload',
          'No upfront commitment required',
        ],
      },
      {
        id: 'time-to-value',
        title: 'Fastest Time-to-Value',
        icon: faRocket,
        points: [
          'Spin up Search, Observability, or Security instantly',
          'Optimized defaults — productive out of the box',
          'Auto-scaling handles spikes without intervention',
          'Focus engineering effort on data and outcomes',
        ],
      },
    ],
    footer:
      'Serverless removes infrastructure entirely — fully managed, instantly scalable, and billed by usage, so you get value from day one.',
  },
]

function PlatformOperationsScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const models = (metadata.models || DEFAULT_MODELS).map((m, mi) => {
    const dm = DEFAULT_MODELS[mi] || {}
    const pillars = (m.pillars || dm.pillars || []).map((p, pi) => {
      const dp = dm.pillars?.[pi] || {}
      const merged = { ...dp, ...p }
      return { ...merged, icon: resolveIcon(merged.icon, dp.icon) }
    })
    const merged = { ...dm, ...m, pillars }
    return { ...merged, navIcon: resolveIcon(merged.navIcon, dm.navIcon || faServer) }
  })

  const eyebrow = metadata.eyebrow || 'Deployment Models'
  const titlePlain = metadata.titlePlain || 'Run Elastic'
  const titleAccent = metadata.titleAccent || ' Your Way'
  const subtitle =
    metadata.subtitle ||
    'One platform, deployed your way — the same Search, Observability, and Security in every option.'
  const footerLabel = metadata.footerLabel || 'Value Delivered'

  const [active, setActive] = useState(0)
  const model = models[Math.min(active, models.length - 1)]
  const pillars = model?.pillars || []

  // Fade + rise the panel each time the presenter switches models.
  const panelRef = useRef(null)
  useEffect(() => {
    if (panelRef.current) {
      animate(panelRef.current, {
        opacity: [0, 1],
        translateY: [12, 0],
        duration: 450,
        easing: 'easeOutCubic',
      })
    }
  }, [active])

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/70'
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  return (
    <div className="relative flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      {/* Ambient accent glow that shifts with the active model */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-500"
        style={{ zIndex: 0, background: `radial-gradient(55% 55% at 28% 42%, ${accent}1f, transparent 70%)` }}
      />
      <div className="relative z-10 max-w-[1400px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <SceneHeader
          eyebrow={eyebrow}
          titleAccent={titleAccent}
          titlePlain={titlePlain}
          subtitle={subtitle}
        />

        {/* Model selector */}
        <div className="shrink-0 flex justify-center mb-4">
          <div
            className={`inline-flex items-center gap-1 rounded-2xl border p-1 ${
              isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/70 border-elastic-dev-blue/10'
            }`}
          >
            {models.map((m, i) => {
              const isActive = i === active
              return (
                <button
                  key={m.id || i}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`rounded-xl px-5 py-2.5 flex items-center gap-2.5 text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? 'shadow-sm'
                      : isDark
                        ? 'text-white/65 hover:text-white hover:bg-white/[0.05]'
                        : 'text-elastic-dev-blue/70 hover:text-elastic-dev-blue hover:bg-elastic-dev-blue/[0.05]'
                  }`}
                  style={isActive ? { backgroundColor: accent, color: isDark ? '#0B1628' : '#fff' } : undefined}
                >
                  <FontAwesomeIcon icon={m.navIcon} className="text-sm" />
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Active model content */}
        <div key={model?.id} ref={panelRef} className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-4 flex-1 min-h-0">
              {pillars.map((p, idx) => {
                const isHero = idx === 0
                return (
                  <div
                    key={p.id || idx}
                    className={`relative overflow-hidden rounded-2xl border flex flex-col min-h-0 ${isHero ? 'md:row-span-2 p-6' : 'p-5'} ${isHero ? '' : cardBg}`}
                    style={isHero ? { background: `linear-gradient(135deg, ${accent}24, ${accent}08)`, borderColor: `${accent}59` } : undefined}
                  >
                    <div className={`relative z-10 flex flex-col gap-3 ${isHero ? 'flex-1 min-h-0' : ''}`}>
                      <div className="flex items-center gap-3">
                        <span
                          className={`rounded-xl flex items-center justify-center shrink-0 ${isHero ? 'w-12 h-12 text-xl' : 'w-10 h-10 text-lg'}`}
                          style={{ backgroundColor: `${accent}1f`, color: accent }}
                        >
                          <FontAwesomeIcon icon={p.icon} />
                        </span>
                        <h3 className={`font-bold leading-tight ${headText} ${isHero ? 'text-xl md:text-2xl' : 'text-base'}`}>{p.title}</h3>
                      </div>
                      {isHero && p.lead && (
                        <p className={`text-sm md:text-base leading-snug ${headText}`}>{p.lead}</p>
                      )}
                      <ul className={isHero ? 'flex-1 flex flex-col justify-center gap-4' : 'space-y-2.5'}>
                        {(p.points || []).map((pt, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <FontAwesomeIcon
                              icon={faCheck}
                              className={`shrink-0 ${isHero ? 'mt-1.5 text-sm' : 'mt-1 text-xs'}`}
                              style={{ color: accent }}
                            />
                            <span className={`leading-snug ${mutedText} ${isHero ? 'text-sm md:text-base' : 'text-sm'}`}>{pt}</span>
                          </li>
                        ))}
                      </ul>
                      {isHero && p.highlight && (
                        <div
                          className="rounded-xl px-4 py-3 flex items-center gap-3 shrink-0"
                          style={{ backgroundColor: `${accent}1f`, color: accent }}
                        >
                          <FontAwesomeIcon icon={p.icon} className="text-sm shrink-0" />
                          <span className="font-bold text-sm md:text-base leading-tight">{p.highlight}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {model?.footer && (
              <div
                className="rounded-2xl border p-5 flex items-center gap-4 shrink-0"
                style={{ backgroundColor: `${accent}12`, borderColor: `${accent}40` }}
              >
                <span
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: `${accent}26`, color: accent }}
                >
                  <FontAwesomeIcon icon={faCloudArrowDown} />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: accent }}>
                    {footerLabel}
                  </p>
                  <p className={`text-base md:text-lg leading-snug ${headText}`}>{model.footer}</p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

export default PlatformOperationsScene
