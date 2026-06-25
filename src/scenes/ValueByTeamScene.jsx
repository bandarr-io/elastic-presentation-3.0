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
import { resolveIcon } from '../data/iconOptions'
import { balancedColumns, gridColumnsStyle } from '../utils/layout'

// Generic placeholder teams — this scene is intended as a layout template.
// Override via metadata (Settings → Customizations → By Team).
const DEFAULT_TEAMS = [
  {
    id: 'team-1',
    title: 'Team One',
    tag: 'Category · Subtitle',
    icon: faShieldHalved,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
      'Bullet point placeholder three',
      'Bullet point placeholder four',
    ],
  },
  {
    id: 'team-2',
    title: 'Team Two',
    tag: 'Category · Subtitle',
    icon: faFingerprint,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
      'Bullet point placeholder three',
    ],
  },
  {
    id: 'team-3',
    title: 'Team Three',
    tag: 'Category · Subtitle',
    icon: faHeadset,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
    ],
  },
  {
    id: 'team-4',
    title: 'Team Four',
    tag: 'Category · Subtitle',
    icon: faGlobe,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
    ],
  },
  {
    id: 'team-5',
    title: 'Team Five',
    tag: 'Category · Subtitle',
    icon: faClipboardCheck,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
      'Bullet point placeholder three',
    ],
  },
  {
    id: 'team-6',
    title: 'Team Six',
    tag: 'Category · Subtitle',
    icon: faBuildingColumns,
    points: [
      'Bullet point placeholder one',
      'Bullet point placeholder two',
    ],
  },
]

function ValueByTeamScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const teams = (metadata.teams || DEFAULT_TEAMS).slice(0, 6).map((item, i) => {
    const merged = { ...(DEFAULT_TEAMS[i] || {}), ...item }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_TEAMS[i]?.icon) }
  })
  const eyebrow = metadata.eyebrow || 'Eyebrow text'
  const titlePlain = metadata.titlePlain || 'Section Title'
  const titleAccent = metadata.titleAccent || ' Accent'
  const subtitle =
    metadata.subtitle ||
    'Subtitle placeholder — a short supporting sentence describing the teams shown below.'
  const impactStat = metadata.impactStat || '00%'
  const impactEyebrow = metadata.impactEyebrow || 'Measured Impact'
  const impactIcon = resolveIcon(metadata.impactIcon, faStopwatch)
  const impactLabel = metadata.impactLabel || 'Impact label placeholder'
  const impactDetail =
    metadata.impactDetail ||
    'Impact detail placeholder — a sentence expanding on the headline statistic shown at left.'

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/70'
  const tagText = isDark ? 'text-white/45' : 'text-elastic-dark-ink/50'
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  const cardCols = balancedColumns(teams.length, 3)

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
          <div className="grid gap-5" style={{ gridTemplateColumns: gridColumnsStyle(cardCols) }}>
            {teams.map((t, i) => (
              <div key={i} className={`rounded-2xl border p-6 flex flex-col gap-4 ${cardBg}`}>
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
                  {t.points.slice(0, 3).map((pt, i) => (
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
                icon={impactIcon}
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
                {impactEyebrow}
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
