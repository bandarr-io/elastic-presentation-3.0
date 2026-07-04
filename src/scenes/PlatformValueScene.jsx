import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { resolveIcon } from '../data/iconOptions'
import { balancedColumns, gridColumnsStyle } from '../utils/layout'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLayerGroup, faBrain, faCloud, faBolt, faStar } from '@fortawesome/free-solid-svg-icons'

// Closing hero: the value of the Elastic platform as a whole.
// Override via metadata (Settings → Customizations → Platform Value).
const DEFAULT_VALUES = [
  { id: 'unified', icon: faLayerGroup, title: 'One Unified Platform', desc: 'Search, Observability, and Security on a single stack — no silos, no stitching.' },
  { id: 'ai', icon: faBrain, title: 'AI-Native', desc: 'GenAI, vector search, ELSER, and Agent Builder built in — not bolted on.' },
  { id: 'anywhere', icon: faCloud, title: 'Deploy Anywhere', desc: 'Self-managed, cloud hosted, or serverless — the same platform, your choice.' },
  { id: 'scale', icon: faBolt, title: 'Real-Time at Scale', desc: 'Billions of events, sub-second queries — proven at the world\u2019s largest scale.' },
]

function PlatformValueScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const accent = isDark ? '#48EFCF' : '#0B64DD'

  const values = (metadata.values || DEFAULT_VALUES).map((item, i) => {
    const merged = { ...(DEFAULT_VALUES[i] || {}), ...item }
    return { ...merged, icon: resolveIcon(merged.icon, DEFAULT_VALUES[i]?.icon || faStar) }
  })

  const eyebrow = metadata.eyebrow || 'The Elastic Platform'
  const titlePlain = metadata.titlePlain || 'One Platform for '
  const titleAccent = metadata.titleAccent || 'Everything'
  const subtitle =
    metadata.subtitle ||
    'Search, Observability, and Security — powered by AI and built on the speed of Elasticsearch.'
  const closing =
    metadata.closing ??
    'One platform to search, observe, and protect everything — wherever your data lives.'

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dark-ink/70'
  const cardBg = isDark ? 'bg-white/[0.04] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  const cols = balancedColumns(values.length, 4)

  return (
    <div className="flex flex-col h-full w-full px-8 py-6 overflow-hidden">
      <div className="max-w-[1400px] mx-auto w-full flex-1 flex flex-col justify-center min-h-0 gap-8">
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePlain}
          titleAccent={titleAccent}
          subtitle={subtitle}
        />

        <div className="grid gap-4" style={{ gridTemplateColumns: gridColumnsStyle(cols) }}>
          {values.map((v, i) => (
            <div key={v.id || i} className={`rounded-2xl border p-6 flex flex-col gap-3 ${cardBg}`}>
              <span
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: `${accent}1f`, color: accent }}
              >
                <FontAwesomeIcon icon={v.icon} />
              </span>
              <h3 className={`font-bold text-xl leading-tight ${headText}`}>{v.title}</h3>
              <p className={`text-base leading-snug ${mutedText}`}>{v.desc}</p>
            </div>
          ))}
        </div>

        {closing && (
          <div
            className="rounded-2xl border px-8 py-6 text-center"
            style={{ background: `linear-gradient(135deg, ${accent}24, ${accent}08)`, borderColor: `${accent}45` }}
          >
            <p className={`font-headline font-extrabold text-2xl md:text-3xl leading-snug ${headText}`}>
              {closing}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlatformValueScene
