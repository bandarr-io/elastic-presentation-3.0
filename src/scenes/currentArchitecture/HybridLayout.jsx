import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGaugeHigh, faShieldHalved } from '@fortawesome/free-solid-svg-icons'
import { BrandLogo } from './brand'
import { tokens } from './shared'
import { ArchitectureFlow } from './LayeredLayout'

// The layered flow as the hero (left) with a supporting rail (right) that
// carries the incumbent-tool inventory and program metrics, so the flow stays
// uncluttered while the context still shows.
export default function HybridLayout({ model, isDark }) {
  const t = tokens(isDark)
  const { sections, incumbents, program } = model
  const hasRail = sections.incumbents || sections.program

  if (!hasRail) return <ArchitectureFlow model={model} isDark={isDark} showIncumbents={false} />

  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: '1.9fr 1fr' }}>
      <ArchitectureFlow model={model} isDark={isDark} showIncumbents={false} />

      <div className="flex flex-col gap-2.5">
        {sections.incumbents && (
          <div className={`zone rounded-xl border p-2.5 ${t.cardBase}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0" style={{ backgroundColor: `${t.neutralHex}22`, color: t.neutralHex }}>
                <FontAwesomeIcon icon={faShieldHalved} />
              </span>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${t.ink}`}>Consolidation Candidates</h3>
            </div>
            <ul className="space-y-1.5">
              {incumbents.map((tool) => (
                <li key={tool.name} className={`rounded-lg p-2 border flex items-center gap-2 ${t.subCard}`}>
                  <BrandLogo label={tool.name} isDark={isDark} size={16} fallbackIcon={faShieldHalved} />
                  <div className="min-w-0">
                    <div className={`text-xs font-semibold ${t.ink}`}>{tool.name}</div>
                    <div className={`text-xs leading-tight ${t.mutedText}`}>{tool.role}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {sections.program && (
          <div className={`zone rounded-xl border p-2.5 ${t.cardBase}`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] shrink-0" style={{ backgroundColor: `${t.neutralHex}22`, color: t.neutralHex }}>
                <FontAwesomeIcon icon={faGaugeHigh} />
              </span>
              <h3 className={`text-xs font-bold uppercase tracking-wider ${t.ink}`}>Program Status &amp; Metrics</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {program.map((stat) => (
                <div key={stat.label} className={`rounded-lg p-2 border ${t.subCard}`}>
                  <div className="font-mono text-2xl font-black leading-none mb-1" style={{ color: t.neutralHex }}>{stat.value}</div>
                  <div className={`text-xs font-semibold ${t.ink}`}>{stat.label}</div>
                  <div className={`text-xs leading-tight ${t.mutedText}`}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
