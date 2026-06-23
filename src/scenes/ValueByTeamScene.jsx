import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved,
  faFingerprint,
  faHeadset,
  faGlobe,
  faClipboardCheck,
  faBuildingColumns,
  faStopwatch,
} from '@fortawesome/free-solid-svg-icons'

// Use cases by team & department from the platform showcase. Override via metadata.
const DEFAULT_TEAMS = [
  {
    id: 'soc',
    title: 'Security Ops / CTI',
    tag: 'SOC · Threat Intel',
    icon: faShieldHalved,
    points: [
      'Near-real-time detection across CrowdStrike, Okta, Azure, Entra, Cloudflare, O365 & more',
      'ML risk scoring on users, accounts, hosts, IPs and URLs',
      'AI agents query, build dashboards, correlate threats & collect evidence',
      'Auto-builds ServiceNow incidents with agent-collected evidence',
    ],
  },
  {
    id: 'identity',
    title: 'Identity',
    tag: 'Accounts & Access',
    icon: faFingerprint,
    points: [
      'Account-lockout analysis — location, reason, affected accounts',
      'User & group-membership change monitoring',
      'Brute-force, privileged- and service-account detection',
    ],
  },
  {
    id: 'helpdesk',
    title: 'Help Desk',
    tag: 'Frontline Support',
    icon: faHeadset,
    points: [
      'Self-service user unlocks',
      'Authentication investigations',
    ],
  },
  {
    id: 'webapp',
    title: 'Web Application',
    tag: 'WAF Rules',
    icon: faGlobe,
    points: [
      'Test, deploy & monitor WAF rules across your organization',
      'Attack detection — injection, XSS, and threat-correlated rules',
    ],
  },
  {
    id: 'compliance',
    title: 'Risk & Compliance',
    tag: 'Audit-Ready',
    icon: faClipboardCheck,
    points: [
      'Compliance adherence + audit evidence (proof validation)',
      'One-year retention for regulated agencies',
      'Dashboards mapped to PUB 1075, NIST 800-53 & HIPAA',
    ],
  },
  {
    id: 'agencies',
    title: 'New Business Units',
    tag: 'Newly Onboarded',
    icon: faBuildingColumns,
    points: [
      'Policy-adherence monitoring',
      'Monitoring, alerting & reporting tailored per team',
    ],
  },
]

function ValueByTeamScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const teams = metadata.teams || DEFAULT_TEAMS
  const eyebrow = metadata.eyebrow || 'Value Across the Enterprise'
  const titlePlain = metadata.titlePlain || 'Every Team,'
  const titleAccent = metadata.titleAccent || ' One Platform'
  const subtitle =
    metadata.subtitle ||
    'Hundreds of users across Security, Identity, Help Desk, Web Application, Risk & Compliance, and newly onboarded business units — each in its own isolated instance.'
  const impactStat = metadata.impactStat || '90%'
  const impactLabel = metadata.impactLabel || 'Less time gathering for investigations'
  const impactDetail =
    metadata.impactDetail ||
    'What took five minutes of manual searching across sources is now collected and presented automatically by AI-driven rules.'

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/70'
  const tagText = isDark ? 'text-white/45' : 'text-elastic-dark-ink/50'
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {teams.map((t) => (
              <div key={t.id} className={`rounded-2xl border p-6 flex flex-col gap-4 ${cardBg}`}>
                <div className="flex items-center gap-3.5">
                  <span
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${accent}1f`, color: accent }}
                  >
                    <FontAwesomeIcon icon={t.icon} />
                  </span>
                  <div className="min-w-0">
                    <h3 className={`font-bold text-lg leading-tight ${headText}`}>{t.title}</h3>
                    <p className={`text-xs uppercase tracking-wider ${tagText}`}>{t.tag}</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {t.points.map((pt, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span
                        className="mt-[7px] w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: accent }}
                      />
                      <span className={`text-sm leading-snug ${mutedText}`}>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className={`mt-auto rounded-2xl border flex items-stretch overflow-hidden ${cardBg}`}>
            <div
              className="flex items-center gap-3 px-6 py-4 shrink-0"
              style={{ backgroundColor: accent }}
            >
              <FontAwesomeIcon
                icon={faStopwatch}
                className="text-xl"
                style={{ color: isDark ? '#0B1628' : '#fff' }}
              />
              <span
                className="font-headline font-extrabold leading-none text-4xl md:text-5xl"
                style={{ color: isDark ? '#0B1628' : '#fff' }}
              >
                {impactStat}
              </span>
            </div>
            <div className="flex-1 min-w-0 px-5 py-3 flex flex-col justify-center">
              <p
                className="text-xs font-semibold uppercase tracking-wider mb-0.5"
                style={{ color: accent }}
              >
                Measured Impact
              </p>
              <p className={`font-bold text-base md:text-lg leading-tight ${headText}`}>{impactLabel}</p>
              <p className={`text-xs md:text-sm leading-snug ${mutedText}`}>{impactDetail}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ValueByTeamScene
