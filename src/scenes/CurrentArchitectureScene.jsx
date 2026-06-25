import { animate, stagger } from 'animejs'
import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faCloud,
  faLayerGroup,
  faShieldHalved,
  faArrowRightLong,
  faCircleCheck,
  faUsers,
  faGaugeHigh,
  faDatabase,
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

// Brand → logo resolver. Three logo sources are supported:
//   si  — bundled Simple Icons (brand-colored inline SVG)
//   img — locally bundled SVG in /public/logos (brands missing from Simple Icons)
//   fa  — Font Awesome glyph fallback for brands with no available logo
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

function resolveBrand(label) {
  const l = label.toLowerCase()
  const match = BRAND_RULES.find(([kw]) => l.includes(kw))
  return match ? match[1] : null
}

// Generic concept glyphs for non-brand pipeline entries (data sources,
// Cribl stages, consumers). Used as the fallback icon when no brand matches.
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

function getConceptIcon(label) {
  const l = label.toLowerCase()
  const match = CONCEPT_RULES.find(([kw]) => l.includes(kw))
  return match ? match[1] : null
}

// Renders a brand logo by kind, falling back to `fallbackIcon` (a FA icon)
// when the label matches no brand rule.
function BrandLogo({ label, size = 13, fallbackIcon = null, isDark }) {
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

const DEFAULT_INFRA = {
  onPremPct: '70%',
  onPremLabel: 'On-Prem (Primary Data Centers)',
  onPremItems: ['VMware · Virtual Machines', 'Cisco UCS', 'Compute · Network · Storage'],
  cloudPct: '30%',
  cloudLabel: 'Cloud (Multi-Cloud)',
  cloudItems: ['Microsoft Azure', 'AWS', 'Google Cloud', 'Oracle Cloud'],
  networkNote: 'Hybrid Network (MPLS / SD-WAN) — Cisco UCS Fabric',
}

// Grouped into rows so the stack reads as Languages / Platforms / Data.
const DEFAULT_APP_STACK = [
  ['.NET', 'Java', 'SQL', 'PHP'],
  ['Linux / Red Hat', 'OpenShift', 'Kubernetes (on-prem)'],
  ['Databricks — confirmed', 'Snowflake — evaluation'],
]

const DEFAULT_CURRENT_STACK = [
  { name: 'AppDynamics', role: 'APM' },
  { name: 'ThousandEyes', role: 'Network Monitoring' },
  { name: 'SecureApp', role: 'RASP' },
  { name: 'Splunk', role: 'Log Management & SIEM', logoOnly: true, logoSize: 58 },
  { name: 'ServiceNow', role: 'ITSM' },
]

const DEFAULT_PIPELINE = {
  sources: ['Infrastructure — servers, network, cloud, containers', 'Applications & Services', 'Security Tools & Platforms'],
  criblStages: ['Collect', 'Route', 'Transform', 'Enrich'],
  elasticComponents: ['Elasticsearch', 'Kibana', 'Beats / Agents', 'Elastic Security'],
  consumers: ['Security Team', 'Ops / NOC', 'IT / Dev Teams'],
  caption: 'Your team runs licensed Elastic in production today — data routing is already in place.',
}

const DEFAULT_PROGRAM = [
  { value: '00', label: 'Certified Champions', sub: 'Enablement scorecard' },
  { value: '00', label: 'Monitoring Tools', sub: 'Under consolidation review' },
  { value: '$0M', label: 'Cost Avoidance Target', sub: 'Consolidation goal' },
  { value: 'POC', label: 'SIEM POC', sub: 'Running in parallel' },
]

function CurrentArchitectureScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  // Single accent reserved for the Elastic + Cribl hero zone; every other zone
  // is neutral so the focal block reads first. Zones differ by icon, not hue.
  const accentHex = isDark ? '#48EFCF' : '#0B64DD'
  const neutralHex = isDark ? '#FFFFFF' : '#1C1E23'
  const ACCENT = {
    infra: neutralHex,
    app: neutralHex,
    current: neutralHex,
    elastic: accentHex,
    program: neutralHex,
  }

  const eyebrow = metadata.eyebrow || 'Where Elastic Already Sits'
  const titlePart1 = metadata.titlePart1 || 'Your Environment Today,'
  const titlePart2 = metadata.titlePart2 || ' Elastic Already Inside'
  const subtitle = metadata.subtitle || 'This is not a greenfield evaluation — it is a question of scope, expansion, and consolidation.'

  const infra = { ...DEFAULT_INFRA, ...(metadata.infrastructure || {}) }
  const appStackRaw = metadata.appStack || DEFAULT_APP_STACK
  // Support both a flat list (single row) and grouped rows (array of arrays).
  const appStackRows = Array.isArray(appStackRaw[0]) ? appStackRaw : [appStackRaw]
  const currentStack = (metadata.currentStack || DEFAULT_CURRENT_STACK).map((item, i) => ({ ...(DEFAULT_CURRENT_STACK[i] || {}), ...item }))
  const pipeline = { ...DEFAULT_PIPELINE, ...(metadata.pipeline || {}) }
  const program = metadata.programStatus || DEFAULT_PROGRAM

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    animate(el.querySelectorAll('.zone'), {
      opacity: [0, 1],
      translateY: [18, 0],
      duration: 520,
      delay: stagger(90),
      easing: 'easeOutQuad',
    })
  }, [])

  const cardBase = isDark
    ? 'bg-white/[0.03] border-white/10'
    : 'bg-white/90 border-elastic-dev-blue/10'
  const chip = isDark
    ? 'bg-white/[0.05] border-white/10 text-white/80'
    : 'bg-elastic-light-grey border-elastic-dev-blue/10 text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'

  const ZoneHeader = ({ icon, color, children }) => (
    <div className="flex items-center gap-2 mb-2">
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
        style={{ backgroundColor: `${color}22`, color }}
      >
        <FontAwesomeIcon icon={icon} />
      </span>
      <h3 className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>
        {children}
      </h3>
    </div>
  )

  return (
    <div ref={rootRef} className="flex flex-col h-full w-full px-8 pt-3 pb-4 overflow-hidden">
      <div className="max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-3">
          <p className={`text-sm font-semibold uppercase tracking-eyebrow mb-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            {eyebrow}
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold leading-headline">
            <span className={isDark ? 'text-white' : 'text-elastic-dark-ink'}>{titlePart1}</span>
            <span className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'}>{titlePart2}</span>
          </h2>
          <p className={`text-sm md:text-base max-w-5xl mx-auto mt-1 ${isDark ? 'text-elastic-light-grey/80' : 'text-elastic-ink'}`}>
            {subtitle}
          </p>
        </div>

        {/* Stacked layout: main content, then full-width program metrics row */}
        <div className="flex flex-col gap-2.5">
          {/* MAIN CONTENT */}
          <div className="flex flex-col gap-2.5">
            {/* Zone 1 + Zone 2 row */}
            <div className="grid gap-2.5" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
              {/* Zone 1 — Infrastructure */}
              <div className={`zone rounded-xl border p-2.5 ${cardBase}`}>
                <ZoneHeader icon={faServer} color={ACCENT.infra}>Infrastructure</ZoneHeader>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2 border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-light-grey/60'}`}>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-mono text-lg font-bold" style={{ color: ACCENT.infra }}>{infra.onPremPct}</span>
                      <span className={`text-xs leading-tight ${mutedText}`}>{infra.onPremLabel}</span>
                    </div>
                    <ul className="space-y-1">
                      {infra.onPremItems.map((it) => (
                        <li key={it} className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink'}`}>
                          <BrandLogo label={it} isDark={isDark} size={12} />{it}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`rounded-lg p-2 border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-light-grey/60'}`}>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-mono text-lg font-bold" style={{ color: ACCENT.infra }}>{infra.cloudPct}</span>
                      <span className={`text-xs leading-tight ${mutedText}`}>{infra.cloudLabel}</span>
                    </div>
                    <ul className="space-y-1">
                      {infra.cloudItems.map((it) => (
                        <li key={it} className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink'}`}>
                          <BrandLogo label={it} isDark={isDark} size={12} fallbackIcon={faCloud} />{it}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className={`mt-2 text-xs text-center rounded-md py-1 ${chip}`}>{infra.networkNote}</div>
              </div>

              {/* Zone 2 — Application Stack */}
              <div className={`zone rounded-xl border p-2.5 flex flex-col ${cardBase}`}>
                <ZoneHeader icon={faLayerGroup} color={ACCENT.app}>Application Stack</ZoneHeader>
                <div className="flex-1 flex flex-col gap-1.5">
                  {appStackRows.map((row, ri) => (
                    <div key={ri} className="flex-1 flex gap-1.5">
                      {row.map((tech) => (
                        <span key={tech} className={`flex-1 text-sm px-2 rounded-md border flex items-center justify-center gap-2 whitespace-nowrap ${chip}`}>
                          <BrandLogo label={tech} isDark={isDark} size={18} fallbackIcon={faDatabase} />
                          {tech}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Zone 3 — Current Observability & Security Stack */}
            <div className={`zone rounded-xl border p-2.5 ${cardBase}`}>
              <ZoneHeader icon={faShieldHalved} color={ACCENT.current}>Current Observability &amp; Security Stack</ZoneHeader>
              <div className="grid grid-cols-5 gap-2">
                {currentStack.map((tool) => (
                  <div key={tool.name} className={`rounded-lg p-2 text-center border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-light-grey/60'}`}>
                    <div className="flex items-center justify-center gap-1.5 mb-0.5 h-9 overflow-hidden">
                      <BrandLogo label={tool.name} isDark={isDark} size={tool.logoOnly ? (tool.logoSize || 28) : 16} fallbackIcon={faShieldHalved} />
                      {!tool.logoOnly && (
                        <span className={`text-xs font-bold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>{tool.name}</span>
                      )}
                    </div>
                    <div className={`text-xs leading-tight ${mutedText}`}>{tool.role}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Zone 4 — Existing Elastic + Cribl (hero zone) */}
            <div
              className={`zone rounded-xl p-2.5 border-2 ${isDark ? 'bg-elastic-teal/[0.06]' : 'bg-elastic-blue/[0.04]'}`}
              style={{ borderColor: `${accentHex}55` }}
            >
              <div className="flex items-center justify-between mb-2">
                <ZoneHeader icon={faCircleCheck} color={accentHex}>Existing Elastic + Cribl Deployment</ZoneHeader>
                <span
                  className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${accentHex}22`,
                    color: accentHex,
                  }}
                >
                  Licensed · In Production Today
                </span>
              </div>
              <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1.2fr 28px 1fr 28px 1fr 28px 1fr' }}>
                <PipelineCol title="Production Data Sources" items={pipeline.sources} isDark={isDark} chip={chip} icon={faDatabase} />
                <PipeArrow isDark={isDark} />
                <PipelineCol title="Cribl" items={pipeline.criblStages} isDark={isDark} chip={chip} accent={ACCENT.program} icon={faRoute} />
                <PipeArrow isDark={isDark} />
                <PipelineCol title="Elastic" items={pipeline.elasticComponents} isDark={isDark} chip={chip} accent={accentHex} titleLogo="Elastic" highlight />
                <PipeArrow isDark={isDark} />
                <PipelineCol title="Consumers" items={pipeline.consumers} isDark={isDark} chip={chip} icon={faUsers} />
              </div>
              <p className={`mt-2 text-sm text-center font-medium ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                {pipeline.caption}
              </p>
            </div>
          </div>

          {/* Zone 5 — Program Status & Metrics (full-width row, below main content) */}
          <div className={`zone rounded-xl border p-2.5 ${cardBase}`}>
            <ZoneHeader icon={faGaugeHigh} color={ACCENT.program}>Program Status &amp; Metrics</ZoneHeader>
            <div className="grid grid-cols-4 gap-2.5">
              {program.map((stat) => (
                <div key={stat.label} className={`rounded-lg p-2.5 border flex items-center gap-3 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-light-grey/60'}`}>
                  <div className="font-mono text-3xl font-black leading-none shrink-0" style={{ color: ACCENT.program }}>{stat.value}</div>
                  <div>
                    <div className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>{stat.label}</div>
                    <div className={`text-xs ${mutedText}`}>{stat.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PipeArrow({ isDark }) {
  return (
    <div className="flex items-center justify-center">
      <FontAwesomeIcon icon={faArrowRightLong} className={isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'} />
    </div>
  )
}

function PipelineCol({ title, items, isDark, chip, accent, icon, titleLogo, highlight }) {
  return (
    <div
      className={`rounded-lg p-2 border h-full ${
        highlight
          ? isDark ? 'bg-elastic-teal/10 border-elastic-teal/40' : 'bg-elastic-blue/10 border-elastic-blue/30'
          : isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/80 border-elastic-dev-blue/10'
      }`}
    >
      <div
        className="text-xs font-bold uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1.5"
        style={{ color: accent || (isDark ? '#FFFFFF99' : '#1C1E2399') }}
      >
        {titleLogo
          ? <BrandLogo label={titleLogo} isDark={isDark} size={14} />
          : icon && <FontAwesomeIcon icon={icon} />}
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it} className={`text-xs leading-tight px-1.5 py-1 rounded flex items-center gap-1.5 ${chip}`}>
            <BrandLogo label={it} isDark={isDark} size={12} fallbackIcon={getConceptIcon(it)} />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default CurrentArchitectureScene
