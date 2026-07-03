import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faLayerGroup,
  faShieldHalved,
  faUsers,
  faGaugeHigh,
  faGlobe,
  faRoute,
  faDownload,
  faWandMagicSparkles,
  faCirclePlus,
  faUserShield,
  faCode,
} from '@fortawesome/free-solid-svg-icons'
import {
  siDotnet,
  siOpenjdk,
  siPhp,
  siLinux,
  siRedhat,
  siRedhatopenshift,
  siKubernetes,
  siDatabricks,
  siSnowflake,
  siVmware,
  siCisco,
  siGooglecloud,
  siSplunk,
  siElasticsearch,
  siKibana,
  siElastic,
} from 'simple-icons'

// Brand -> logo resolver. Three logo sources are supported:
//   si  - bundled Simple Icons (brand-colored inline SVG)
//   img - locally bundled SVG in /public/logos (brands missing from Simple Icons)
//   fa  - Font Awesome glyph fallback for brands with no available logo
// Ordered most-specific first so e.g. "appdynamics" wins before "cisco".
const BRAND_RULES = [
  ['elasticsearch', { kind: 'si', icon: siElasticsearch }],
  ['kibana', { kind: 'si', icon: siKibana }],
  ['beats', { kind: 'si', icon: siElastic }],
  ['elastic security', { kind: 'si', icon: siElastic }],
  ['elastic', { kind: 'si', icon: siElastic }],
  ['appdynamics', { kind: 'img', src: '/logos/appdynamics.svg' }],
  ['thousandeyes', { kind: 'fa', icon: faGlobe }],
  ['secureapp', { kind: 'fa', icon: faShieldHalved }],
  ['servicenow', { kind: 'img', src: '/logos/servicenow.svg' }],
  ['splunk', { kind: 'si', icon: siSplunk }],
  ['azure', { kind: 'img', src: '/logos/azure.svg' }],
  ['aws', { kind: 'img', src: '/logos/aws.svg' }],
  ['google', { kind: 'si', icon: siGooglecloud }],
  ['oracle', { kind: 'img', src: '/logos/oracle.svg' }],
  ['vmware', { kind: 'si', icon: siVmware }],
  ['cisco', { kind: 'si', icon: siCisco }],
  ['openshift', { kind: 'si', icon: siRedhatopenshift }],
  ['.net', { kind: 'si', icon: siDotnet }],
  ['java', { kind: 'si', icon: siOpenjdk }],
  ['php', { kind: 'si', icon: siPhp }],
  ['kubernetes', { kind: 'si', icon: siKubernetes }],
  ['databricks', { kind: 'si', icon: siDatabricks }],
  ['snowflake', { kind: 'si', icon: siSnowflake }],
  ['red hat', { kind: 'si', icon: siRedhat }],
  ['linux', { kind: 'si', icon: siLinux }],
]

export function resolveBrand(label) {
  const l = label.toLowerCase()
  const match = BRAND_RULES.find(([kw]) => l.includes(kw))
  return match ? match[1] : null
}

// Generic concept glyphs for non-brand pipeline entries (data sources,
// routing stages, consumers). Used as the fallback icon when no brand matches.
const CONCEPT_RULES = [
  ['infrastructure', faServer],
  ['application', faLayerGroup],
  ['security tools', faShieldHalved],
  ['security team', faUserShield],
  ['collect', faDownload],
  ['route', faRoute],
  ['transform', faWandMagicSparkles],
  ['enrich', faCirclePlus],
  ['ops', faGaugeHigh],
  ['noc', faGaugeHigh],
  ['dev team', faCode],
]

export function getConceptIcon(label) {
  const l = label.toLowerCase()
  const match = CONCEPT_RULES.find(([kw]) => l.includes(kw))
  return match ? match[1] : null
}

// Renders a brand logo by kind, falling back to `fallbackIcon` (a FA icon)
// when the label matches no brand rule.
export function BrandLogo({ label, size = 13, fallbackIcon = null, isDark }) {
  const brand = resolveBrand(label)
  const mutedGlyph = isDark ? 'text-white/40' : 'text-elastic-dark-ink/40'

  if (!brand) {
    return fallbackIcon
      ? <FontAwesomeIcon icon={fallbackIcon} className={`${mutedGlyph} shrink-0`} style={{ fontSize: size - 2 }} />
      : null
  }
  if (brand.kind === 'si') {
    return (
      <svg role="img" viewBox="0 0 24 24" width={size} height={size} fill={`#${brand.icon.hex}`} className="shrink-0" aria-label={brand.icon.title}>
        <path d={brand.icon.path} />
      </svg>
    )
  }
  if (brand.kind === 'img') {
    return <img src={brand.src} alt={label} className="shrink-0 object-contain" style={{ height: size, width: 'auto', maxWidth: size * 2.4 }} />
  }
  return <FontAwesomeIcon icon={brand.icon} className={`${isDark ? 'text-elastic-teal' : 'text-elastic-blue'} shrink-0`} style={{ fontSize: size - 2 }} />
}
