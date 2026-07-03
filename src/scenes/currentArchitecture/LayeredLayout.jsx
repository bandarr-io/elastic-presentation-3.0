import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faRoute,
  faUsers,
  faGaugeHigh,
  faDatabase,
  faLayerGroup,
  faCloud,
  faShieldHalved,
  faArrowDownLong,
  faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'
import { BrandLogo, getConceptIcon } from './brand'
import { tokens } from './shared'

// A layered reference architecture: fixed tiers (Sources -> Ingest -> Elastic
// -> Solutions & Teams) read top-to-bottom as data flow. Layers are constant
// so the frame is reusable; the chips inside each layer are per-customer.
export default function LayeredLayout({ model, isDark }) {
  const t = tokens(isDark)
  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <ArchitectureFlow model={model} isDark={isDark} showIncumbents={model.sections.incumbents} />
      {model.sections.program && <ProgramStrip program={model.program} isDark={isDark} t={t} />}
    </div>
  )
}

// The tiered flow without the program strip, so the Hybrid layout can reuse it
// alongside a side rail. `showIncumbents` keeps incumbents in the flow (Layered)
// or defers them to the rail (Hybrid).
export function ArchitectureFlow({ model, isDark, showIncumbents }) {
  const t = tokens(isDark)
  const { sections, hero, infrastructure: infra, appStackRows, incumbents, router } = model
  const appTech = appStackRows.flat()

  return (
    <div className="flex flex-col items-stretch gap-1.5">
      <Tier label={hero.sourcesTitle} icon={faDatabase} color={t.neutralHex} isDark={isDark} t={t}>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <SubGroup title="Systems" isDark={isDark}>
            {model.sources.map((s) => <Chip key={s} label={s} isDark={isDark} t={t} fallbackIcon={getConceptIcon(s) || faDatabase} />)}
          </SubGroup>
          {sections.infrastructure && (
            <SubGroup title={`Infrastructure · ${infra.onPremPct} on-prem / ${infra.cloudPct} cloud`} isDark={isDark}>
              {infra.onPremItems.map((s) => <Chip key={s} label={s} isDark={isDark} t={t} fallbackIcon={faServer} />)}
              {infra.cloudItems.map((s) => <Chip key={s} label={s} isDark={isDark} t={t} fallbackIcon={faCloud} />)}
            </SubGroup>
          )}
          {sections.appStack && (
            <SubGroup title="Applications" isDark={isDark}>
              {appTech.map((s) => <Chip key={s} label={s} isDark={isDark} t={t} fallbackIcon={faLayerGroup} />)}
            </SubGroup>
          )}
        </div>
      </Tier>

      <DownArrow isDark={isDark} />

      {router.enabled && (
        <>
          <Tier label={`Ingest & Routing — ${router.label}`} icon={faRoute} color={t.neutralHex} isDark={isDark} t={t} compact>
            <div className="flex flex-wrap justify-center gap-2">
              {router.stages.map((s) => <Chip key={s} label={s} isDark={isDark} t={t} fallbackIcon={getConceptIcon(s) || faRoute} />)}
            </div>
          </Tier>
          <DownArrow isDark={isDark} />
        </>
      )}

      <div
        className={`zone rounded-xl p-2.5 border-2 ${isDark ? 'bg-elastic-teal/[0.06]' : 'bg-elastic-blue/[0.04]'}`}
        style={{ borderColor: `${t.accentHex}66` }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-6 h-6 rounded-md flex items-center justify-center text-xs shrink-0"
              style={{ backgroundColor: `${t.accentHex}22`, color: t.accentHex }}
            >
              <BrandLogo label="Elastic" isDark={isDark} size={14} />
            </span>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${t.ink}`}>{hero.title}</h3>
          </div>
          <span
            className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1"
            style={{ backgroundColor: `${t.accentHex}22`, color: t.accentHex }}
          >
            <FontAwesomeIcon icon={faCircleCheck} />
            {hero.badge}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {model.elastic.components.map((c) => (
            <span
              key={c}
              className={`text-sm px-3 py-1 rounded-md border flex items-center gap-2 ${isDark ? 'bg-elastic-teal/10 border-elastic-teal/40 text-white' : 'bg-elastic-blue/10 border-elastic-blue/30 text-elastic-dark-ink'}`}
            >
              <BrandLogo label={c} isDark={isDark} size={16} fallbackIcon={faDatabase} />
              {c}
            </span>
          ))}
        </div>
      </div>

      <DownArrow isDark={isDark} />

      <Tier label="Solutions & Teams" icon={faUsers} color={t.neutralHex} isDark={isDark} t={t}>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {showIncumbents && sections.incumbents && (
            <SubGroup title="Incumbent tools" isDark={isDark}>
              {incumbents.map((tool) => <IncumbentChip key={tool.name} tool={tool} isDark={isDark} t={t} />)}
            </SubGroup>
          )}
          <SubGroup title={hero.consumersTitle} isDark={isDark}>
            {model.consumers.map((c) => <Chip key={c} label={c} isDark={isDark} t={t} fallbackIcon={getConceptIcon(c) || faUsers} />)}
          </SubGroup>
        </div>
      </Tier>
    </div>
  )
}

export function ProgramStrip({ program, isDark, t }) {
  return (
    <div className={`zone mt-1 rounded-xl border p-2 ${t.cardBase}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <FontAwesomeIcon icon={faGaugeHigh} style={{ color: t.neutralHex }} className="text-xs" />
        <span className={`text-xs font-bold uppercase tracking-wider ${t.ink}`}>Program Status &amp; Metrics</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {program.map((stat) => (
          <div key={stat.label} className={`rounded-lg p-2 border flex items-center gap-2.5 ${t.subCard}`}>
            <div className="font-mono text-2xl font-black leading-none shrink-0" style={{ color: t.neutralHex }}>{stat.value}</div>
            <div>
              <div className={`text-xs font-semibold ${t.ink}`}>{stat.label}</div>
              <div className={`text-xs ${t.mutedText}`}>{stat.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function IncumbentChip({ tool, isDark, t }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1.5 ${t.chip}`}>
      <BrandLogo label={tool.name} isDark={isDark} size={13} fallbackIcon={faShieldHalved} />
      <span className="font-semibold">{tool.name}</span>
      <span className={`ml-1 text-[9px] uppercase tracking-wide px-1 py-0.5 rounded ${isDark ? 'bg-amber-400/15 text-amber-300' : 'bg-amber-500/15 text-amber-700'}`}>
        consolidation candidate
      </span>
    </span>
  )
}

export function Tier({ label, icon, color, isDark, t, compact, children }) {
  return (
    <div className={`zone rounded-xl border ${compact ? 'p-2' : 'p-2.5'} ${t.cardBase}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0"
          style={{ backgroundColor: `${color}22`, color }}
        >
          <FontAwesomeIcon icon={icon} />
        </span>
        <h3 className={`text-xs font-bold uppercase tracking-wider ${t.ink}`}>{label}</h3>
      </div>
      {children}
    </div>
  )
}

export function SubGroup({ title, isDark, children }) {
  return (
    <div>
      <div className={`text-[10px] font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-white/40' : 'text-elastic-dark-ink/40'}`}>{title}</div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  )
}

export function Chip({ label, isDark, t, fallbackIcon }) {
  return (
    <span className={`text-xs px-2 py-1 rounded-md border flex items-center gap-1.5 ${t.chip}`}>
      <BrandLogo label={label} isDark={isDark} size={13} fallbackIcon={fallbackIcon} />
      {label}
    </span>
  )
}

export function DownArrow({ isDark }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <FontAwesomeIcon icon={faArrowDownLong} className={isDark ? 'text-white/25' : 'text-elastic-dev-blue/25'} />
    </div>
  )
}
