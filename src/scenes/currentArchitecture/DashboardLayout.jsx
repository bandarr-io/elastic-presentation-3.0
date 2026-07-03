import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faCloud,
  faLayerGroup,
  faShieldHalved,
  faCircleCheck,
  faUsers,
  faGaugeHigh,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons'
import { BrandLogo, getConceptIcon } from './brand'
import { tokens, ZoneHeader, PipeArrow } from './shared'

// The original 5-zone inventory dashboard. Each supporting zone can be hidden
// via `model.sections`; the hero (Elastic + router pipeline) always renders.
export default function DashboardLayout({ model, isDark }) {
  const t = tokens(isDark)
  const { sections, hero, infrastructure: infra, appStackRows, incumbents, program, router } = model
  const neutralHex = t.neutralHex
  const accentHex = t.accentHex

  const showInfra = sections.infrastructure
  const showApp = sections.appStack
  const showTopRow = showInfra || showApp
  const topRowCols = showInfra && showApp ? '1.55fr 1fr' : '1fr'

  const pipelineCols = router.enabled
    ? '1.2fr 28px 1fr 28px 1fr 28px 1fr'
    : '1.2fr 28px 1fr 28px 1fr'

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-2.5">
        {showTopRow && (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: topRowCols }}>
            {showInfra && (
              <div className={`zone rounded-xl border p-2.5 ${t.cardBase}`}>
                <ZoneHeader icon={faServer} color={neutralHex} isDark={isDark}>Infrastructure</ZoneHeader>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-lg p-2 border ${t.subCard}`}>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-mono text-lg font-bold" style={{ color: neutralHex }}>{infra.onPremPct}</span>
                      <span className={`text-xs leading-tight ${t.mutedText}`}>{infra.onPremLabel}</span>
                    </div>
                    <ul className="space-y-1">
                      {infra.onPremItems.map((it) => (
                        <li key={it} className={`text-xs flex items-center gap-1.5 ${isDark ? 'text-white/70' : 'text-elastic-dark-ink'}`}>
                          <BrandLogo label={it} isDark={isDark} size={12} />{it}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className={`rounded-lg p-2 border ${t.subCard}`}>
                    <div className="flex items-baseline gap-1.5 mb-1">
                      <span className="font-mono text-lg font-bold" style={{ color: neutralHex }}>{infra.cloudPct}</span>
                      <span className={`text-xs leading-tight ${t.mutedText}`}>{infra.cloudLabel}</span>
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
                <div className={`mt-2 text-xs text-center rounded-md py-1 ${t.chip}`}>{infra.networkNote}</div>
              </div>
            )}

            {showApp && (
              <div className={`zone rounded-xl border p-2.5 flex flex-col ${t.cardBase}`}>
                <ZoneHeader icon={faLayerGroup} color={neutralHex} isDark={isDark}>Application Stack</ZoneHeader>
                <div className="flex-1 flex flex-col gap-1.5">
                  {appStackRows.map((row, ri) => (
                    <div key={ri} className="flex-1 flex gap-1.5">
                      {row.map((tech) => (
                        <span key={tech} className={`flex-1 text-sm px-2 rounded-md border flex items-center justify-center gap-2 whitespace-nowrap ${t.chip}`}>
                          <BrandLogo label={tech} isDark={isDark} size={18} fallbackIcon={faDatabase} />
                          {tech}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sections.incumbents && (
          <div className={`zone rounded-xl border p-2.5 ${t.cardBase}`}>
            <ZoneHeader icon={faShieldHalved} color={neutralHex} isDark={isDark}>Current Observability &amp; Security Stack</ZoneHeader>
            <div className="grid grid-cols-5 gap-2">
              {incumbents.map((tool) => (
                <div key={tool.name} className={`rounded-lg p-2 text-center border ${t.subCard}`}>
                  <div className="flex items-center justify-center gap-1.5 mb-0.5 h-9 overflow-hidden">
                    <BrandLogo label={tool.name} isDark={isDark} size={tool.logoOnly ? (tool.logoSize || 28) : 16} fallbackIcon={faShieldHalved} />
                    {!tool.logoOnly && (
                      <span className={`text-xs font-bold ${t.ink}`}>{tool.name}</span>
                    )}
                  </div>
                  <div className={`text-xs leading-tight ${t.mutedText}`}>{tool.role}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hero zone — Existing Elastic + router deployment (always shown) */}
        <div
          className={`zone rounded-xl p-2.5 border-2 ${isDark ? 'bg-elastic-teal/[0.06]' : 'bg-elastic-blue/[0.04]'}`}
          style={{ borderColor: `${accentHex}55` }}
        >
          <div className="flex items-center justify-between mb-2">
            <ZoneHeader icon={faCircleCheck} color={accentHex} isDark={isDark}>{hero.title}</ZoneHeader>
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accentHex}22`, color: accentHex }}
            >
              {hero.badge}
            </span>
          </div>
          <div className="grid items-center gap-2" style={{ gridTemplateColumns: pipelineCols }}>
            <PipelineCol title={hero.sourcesTitle} items={model.sources} isDark={isDark} chip={t.chip} icon={faDatabase} />
            <PipeArrow isDark={isDark} />
            {router.enabled && (
              <>
                <PipelineCol title={router.label} items={router.stages} isDark={isDark} chip={t.chip} accent={neutralHex} />
                <PipeArrow isDark={isDark} />
              </>
            )}
            <PipelineCol title={hero.elasticTitle} items={model.elastic.components} isDark={isDark} chip={t.chip} accent={accentHex} titleLogo="Elastic" highlight />
            <PipeArrow isDark={isDark} />
            <PipelineCol title={hero.consumersTitle} items={model.consumers} isDark={isDark} chip={t.chip} icon={faUsers} />
          </div>
          <p className={`mt-2 text-sm text-center font-medium ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
            {hero.caption}
          </p>
        </div>
      </div>

      {sections.program && (
        <div className={`zone rounded-xl border p-2.5 ${t.cardBase}`}>
          <ZoneHeader icon={faGaugeHigh} color={neutralHex} isDark={isDark}>Program Status &amp; Metrics</ZoneHeader>
          <div className="grid grid-cols-4 gap-2.5">
            {program.map((stat) => (
              <div key={stat.label} className={`rounded-lg p-2.5 border flex items-center gap-3 ${t.subCard}`}>
                <div className="font-mono text-3xl font-black leading-none shrink-0" style={{ color: neutralHex }}>{stat.value}</div>
                <div>
                  <div className={`text-xs font-semibold ${t.ink}`}>{stat.label}</div>
                  <div className={`text-xs ${t.mutedText}`}>{stat.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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
