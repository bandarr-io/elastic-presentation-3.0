import { useEffect, useState, useCallback } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faRightLeft,
  faRobot,
  faShieldHalved,
  faEnvelopeOpenText,
  faTerminal,
  faMagnifyingGlassChart,
  faTableColumns,
  faClipboardCheck,
  faXmark,
  faChevronLeft,
  faChevronRight,
  faExpand,
} from '@fortawesome/free-solid-svg-icons'

const IMG_BASE = '/screenshots/usecases'

// Live Elastic security use cases. Edit titles/tags/points freely.
const DEFAULT_USE_CASES = [
  {
    id: 'azure-signin',
    title: 'Azure Sign-In Monitoring',
    tag: 'Identity · Microsoft Entra',
    icon: faRightLeft,
    image: `${IMG_BASE}/azure-signin-monitoring.png`,
    points: [
      '12,847 sign-ins across 815 users and 74 countries in 30 days',
      'Success vs. failure split (65.7% / 34.3%) surfaced at a glance',
      'Geo-map + top business units to spot anomalous origins',
      'One pane across every tenant',
    ],
  },
  {
    id: 'ai-azure-dash',
    title: 'AI Agent: Build-a-Dashboard',
    tag: 'Elastic AI Agent · Azure',
    icon: faRobot,
    image: `${IMG_BASE}/ai-agent-azure-dashboard.png`,
    points: [
      'Analyst asks in plain language; the agent reasons and writes the ES|QL',
      'Auto-builds a per-user activity dashboard (user@yourorg.example)',
      'Trends, failed sign-ins, caller IPs, app usage — no manual queries',
      'From question to working dashboard in seconds',
    ],
  },
  {
    id: 'rapid7-vulns',
    title: 'Vulnerability Findings',
    tag: 'Posture · Rapid7',
    icon: faShieldHalved,
    image: `${IMG_BASE}/rapid7-vulnerability-findings.png`,
    points: [
      'Rapid7 vulnerabilities normalized alongside the rest of security data',
      'Critical CVEs surfaced (Log4j, Firefox) with CVSS and fix version',
      'Sort/group by severity, package, vendor, and owning domain',
      'Prioritize remediation by real exposure across your assets',
    ],
  },
  {
    id: 'checkpoint-email',
    title: 'Email Threat Visibility',
    tag: 'Messaging · Check Point',
    icon: faEnvelopeOpenText,
    image: `${IMG_BASE}/checkpoint-email-security.png`,
    points: [
      'Top problematic senders and subject lines (phishing, urgency lures)',
      'Per-team email volume to focus outreach',
      'Turns raw mail logs into targeted, meaningful action',
      'Spot campaigns hitting multiple business units at once',
    ],
  },
  {
    id: 'esql-verify',
    title: 'ES|QL Field Verification',
    tag: 'Discover · ES|QL',
    icon: faTerminal,
    image: `${IMG_BASE}/esql-field-verification.png`,
    points: [
      'Validate fields and data shape across 9.9M+ documents fast',
      'STATS by dataset / module / provider to confirm what is populated',
      'Grounds dashboards and detections in real, verified fields',
      'Piped query language that reads top-to-bottom',
    ],
  },
  {
    id: 'agent-case',
    title: 'Autonomous Alert Triage',
    tag: 'Detection Rule → Case',
    icon: faMagnifyingGlassChart,
    image: `${IMG_BASE}/agent-built-case.png`,
    points: [
      'Detection rule fires → the agent builds and investigates the case',
      '“Suspicious Non-US Authentication” auto-triaged with evidence',
      'Disposition, confidence, and justification written for the analyst',
      'Cuts time-to-decision on noisy geo-based alerts',
    ],
  },
  {
    id: 'ai-okta-dash',
    title: 'AI Agent: Okta Ingestion',
    tag: 'Elastic AI Agent · Okta',
    icon: faTableColumns,
    image: `${IMG_BASE}/ai-agent-okta-dashboard.png`,
    points: [
      '“Show me Okta events being ingested” → a dashboard, built by the agent',
      '533,806 events, success/failure outcomes, top event and actor types',
      'Iterative: ask for “more color” and the agent refines the visuals',
      'Self-service observability for identity data',
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance & Regulatory Coverage',
    tag: 'PUB 1075 · NIST 800-53 · HIPAA',
    icon: faClipboardCheck,
    image: `${IMG_BASE}/compliance-regulatory-dashboard.png`,
    points: [
      '3.7B+ events mapped to control frameworks (PUB 1075, NIST, HIPAA, CIS)',
      'Coverage by control ID and a per-host heatmap for audit readiness',
      'Evidence that logging controls are satisfied across 2,477 hosts',
      'Turns raw telemetry into regulator-ready reporting',
    ],
  },
]

function SecurityUseCasesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [activeIndex, setActiveIndex] = useState(null)

  const useCases = metadata.useCases || DEFAULT_USE_CASES
  const eyebrow = metadata.eyebrow || 'In Production Today'
  const titleAccent = metadata.titleAccent || 'Security Use Cases'
  const titlePlain = metadata.titlePlain || ' on Elastic Today'
  const subtitle =
    metadata.subtitle ||
    'Real dashboards, AI workflows, and investigations running across your environment right now.'

  const isOpen = activeIndex !== null
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const close = useCallback(() => setActiveIndex(null), [])
  const next = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i + 1) % useCases.length)),
    [useCases.length]
  )
  const prev = useCallback(
    () => setActiveIndex((i) => (i === null ? i : (i - 1 + useCases.length) % useCases.length)),
    [useCases.length]
  )

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [isOpen, close, next, prev])

  const active = isOpen ? useCases[activeIndex] : null

  const cardBg = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/55' : 'text-elastic-dark-ink/60'

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

        <div className="flex-1 min-h-0 grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          {useCases.map((uc, i) => (
            <button
              key={uc.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`group relative flex flex-col text-left rounded-2xl border overflow-hidden transition-all hover:scale-[1.015] hover:shadow-lg ${cardBg}`}
            >
              <div className="relative w-full aspect-video overflow-hidden">
                <img
                  src={uc.image}
                  alt={uc.title}
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="absolute top-2 right-2 w-7 h-7 rounded-lg flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: accent, color: isDark ? '#0B1628' : '#fff' }}
                >
                  <FontAwesomeIcon icon={faExpand} />
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <FontAwesomeIcon icon={uc.icon} style={{ color: accent }} className="text-sm" />
                  <h3 className={`font-bold text-sm leading-tight ${headText}`}>{uc.title}</h3>
                </div>
                <p className={`text-xs ${mutedText}`}>{uc.tag}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {isOpen && active && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-6 md:p-10"
          style={{ background: 'rgba(8,12,22,0.92)', backdropFilter: 'blur(6px)' }}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute top-5 right-5 w-11 h-11 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faXmark} className="text-xl" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev() }}
            aria-label="Previous"
            className="absolute left-4 md:left-6 w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronLeft} className="text-2xl" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next() }}
            aria-label="Next"
            className="absolute right-4 md:right-6 w-12 h-12 rounded-full flex items-center justify-center text-white/70 hover:text-white hover:bg-white/15 transition-colors"
          >
            <FontAwesomeIcon icon={faChevronRight} className="text-2xl" />
          </button>

          <div
            className="flex flex-col lg:flex-row gap-6 items-center w-full max-w-[1500px] max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-1 min-w-0 flex items-center justify-center max-h-full">
              {/* Framed + capped below native size: downscaling stays sharper than upscaling a low-res capture */}
              <div className="rounded-xl p-2 bg-white/[0.04] border border-white/[0.12] shadow-2xl">
                <img
                  src={active.image}
                  alt={active.title}
                  className="block max-w-[800px] max-h-[62vh] object-contain rounded-md"
                />
              </div>
            </div>

            <div className="w-full lg:w-[340px] shrink-0 text-white">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${accent}26`, color: accent }}
                >
                  <FontAwesomeIcon icon={active.icon} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
                  {active.tag}
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold mb-4 leading-tight">{active.title}</h3>
              <ul className="space-y-2.5">
                {active.points.map((p, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-sm leading-snug text-white/85">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5 text-xs text-white/40">
                {activeIndex + 1} / {useCases.length} · ← → to navigate · Esc to close
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SecurityUseCasesScene
