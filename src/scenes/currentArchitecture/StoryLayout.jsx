import { useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faServer,
  faUsers,
  faDatabase,
  faRoute,
  faChevronLeft,
  faChevronRight,
  faCircleCheck,
  faArrowsToCircle,
} from '@fortawesome/free-solid-svg-icons'
import { BrandLogo, getConceptIcon } from './brand'
import { tokens } from './shared'

const CORE_X = 50
const CORE_Y = 50
const ROUTER_X = 34
const SRC_X = 13
const OUT_X = 87

// Distributes n nodes vertically between 22% and 78% of the stage height.
function spreadY(n, i) {
  if (n <= 1) return 50
  const top = 22
  const bottom = 78
  return top + (bottom - top) * (i / (n - 1))
}

// Trims a long source label down to its lead noun (before an em dash / "&").
function shortLabel(label) {
  return label.split(/—|&|\/|,/)[0].trim() || label
}

// An animated, presenter-advanced architecture narrative. The diagram assembles
// beat-by-beat: sprawl -> Elastic ignites -> data flows -> tools consolidate ->
// expansion. Advances via on-screen controls (the deck's arrow keys move between
// scenes), matching the pattern used by other stage-driven scenes.
export default function StoryLayout({ model, isDark }) {
  const t = tokens(isDark)
  const beats = model.story.beats
  const [beat, setBeat] = useState(0)

  const coreLit = beat >= 1
  const flows = beat >= 2
  const outcomesShown = beat >= 2
  const absorbed = beat >= 3
  const expand = beat >= 4

  const srcNodes = model.sources.slice(0, 3).map((label, i, arr) => ({ label, i, y: spreadY(arr.length, i) }))
  const outNodes = model.consumers.slice(0, 3).map((label, i, arr) => ({ label, i, y: spreadY(arr.length, i) }))
  const routerOn = model.router.enabled

  const ingestTarget = routerOn ? { x: ROUTER_X, y: CORE_Y } : { x: CORE_X, y: CORE_Y }
  const lineColor = t.accentHex

  const next = () => setBeat((b) => Math.min(b + 1, beats.length - 1))
  const prev = () => setBeat((b) => Math.max(b - 1, 0))

  const current = beats[beat] || {}

  return (
    <div className="flex flex-col h-full w-full select-none">
      <style>{`
        @keyframes archFlow { to { stroke-dashoffset: -14; } }
        @keyframes archPulse { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.6); opacity: 0; } }
      `}</style>

      {/* Beat headline */}
      <div className="text-center mb-1 min-h-[62px]">
        <p className={`text-[11px] font-semibold uppercase tracking-eyebrow mb-0.5 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
          {model.header.eyebrow} · {beat + 1} / {beats.length}
        </p>
        <h2 className={`font-headline text-2xl md:text-3xl font-extrabold leading-tight ${t.ink}`} key={`t-${beat}`}>
          {current.title}
        </h2>
        <p className={`text-sm mt-0.5 max-w-3xl mx-auto ${isDark ? 'text-elastic-light-grey/80' : 'text-elastic-ink'}`} key={`c-${beat}`}>
          {current.caption}
        </p>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 min-h-[320px] cursor-pointer"
        onClick={next}
        role="presentation"
      >
        {/* Connectors */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {srcNodes.map((s) => (
            <line
              key={`in-${s.i}`}
              x1={SRC_X} y1={s.y} x2={ingestTarget.x} y2={ingestTarget.y}
              stroke={lineColor}
              style={{
                strokeWidth: 1.5,
                vectorEffect: 'non-scaling-stroke',
                opacity: flows ? 0.9 : 0,
                transition: 'opacity .5s',
                strokeDasharray: flows ? '4 3' : undefined,
                animation: flows ? 'archFlow 1s linear infinite' : undefined,
              }}
            />
          ))}
          {routerOn && (
            <line
              x1={ROUTER_X} y1={CORE_Y} x2={CORE_X} y2={CORE_Y}
              stroke={lineColor}
              style={{
                strokeWidth: 1.5,
                vectorEffect: 'non-scaling-stroke',
                opacity: flows ? 0.9 : 0,
                transition: 'opacity .5s',
                strokeDasharray: flows ? '4 3' : undefined,
                animation: flows ? 'archFlow 1s linear infinite' : undefined,
              }}
            />
          )}
          {outNodes.map((o) => (
            <line
              key={`out-${o.i}`}
              x1={CORE_X} y1={CORE_Y} x2={OUT_X} y2={o.y}
              stroke={lineColor}
              style={{
                strokeWidth: 1.5,
                vectorEffect: 'non-scaling-stroke',
                opacity: outcomesShown ? 0.9 : 0,
                transition: 'opacity .5s',
                strokeDasharray: outcomesShown ? '4 3' : undefined,
                animation: outcomesShown ? 'archFlow 1s linear infinite' : undefined,
              }}
            />
          ))}
        </svg>

        {/* Source nodes */}
        {srcNodes.map((s) => (
          <StageNode key={`src-${s.i}`} x={SRC_X} y={s.y} isDark={isDark} t={t}>
            <BrandLogo label={s.label} isDark={isDark} size={16} fallbackIcon={getConceptIcon(s.label) || faServer} />
            <span className="text-xs font-semibold">{shortLabel(s.label)}</span>
          </StageNode>
        ))}

        {/* Router waypoint */}
        {routerOn && (
          <div
            className="absolute z-10"
            style={{ left: `${ROUTER_X}%`, top: `${CORE_Y}%`, transform: 'translate(-50%,-50%)', opacity: flows ? 1 : 0, transition: 'opacity .5s' }}
          >
            <div className={`px-2 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${t.chip}`}>
              <FontAwesomeIcon icon={faRoute} style={{ color: t.neutralHex }} />
              {model.router.label}
            </div>
          </div>
        )}

        {/* Incumbent sprawl (absorbs into the core on the consolidation beat) */}
        {model.sections.incumbents && model.incumbents.length > 0 && (
          <div
            className="absolute z-10 flex flex-wrap justify-center gap-1.5 max-w-[42%]"
            style={{
              left: '50%',
              top: '6%',
              transform: `translate(-50%, ${absorbed ? '190%' : '0'}) scale(${absorbed ? 0.5 : 1})`,
              opacity: absorbed ? 0 : 1,
              transition: 'transform .7s cubic-bezier(.4,0,.2,1), opacity .7s',
            }}
          >
            {model.incumbents.map((tool) => (
              <span key={tool.name} className={`px-2 py-1 rounded-md border text-xs flex items-center gap-1.5 ${t.chip}`}>
                <BrandLogo label={tool.name} isDark={isDark} size={13} fallbackIcon={faServer} />
                {tool.name}
              </span>
            ))}
          </div>
        )}

        {/* Elastic core */}
        <div
          className="absolute z-20"
          style={{ left: `${CORE_X}%`, top: `${CORE_Y}%`, transform: `translate(-50%,-50%) scale(${coreLit ? 1 : 0.88})`, transition: 'transform .6s cubic-bezier(.34,1.56,.64,1)' }}
        >
          {expand && (
            <span
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{ border: `2px solid ${t.accentHex}`, animation: 'archPulse 1.8s ease-out infinite' }}
            />
          )}
          <div
            className={`relative rounded-2xl border-2 px-4 py-3 text-center w-44 ${isDark ? 'bg-elastic-teal/[0.08]' : 'bg-elastic-blue/[0.05]'}`}
            style={{
              borderColor: coreLit ? t.accentHex : `${t.neutralHex}44`,
              boxShadow: coreLit ? `0 0 34px ${t.accentHex}55` : 'none',
              opacity: coreLit ? 1 : 0.55,
              transition: 'border-color .5s, box-shadow .5s, opacity .5s',
            }}
          >
            <div className="flex items-center justify-center mb-1">
              <BrandLogo label="Elastic" isDark={isDark} size={30} />
            </div>
            <div className={`text-xs font-bold leading-tight ${t.ink}`}>{model.hero.title}</div>
            <div
              className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${t.accentHex}22`, color: t.accentHex, opacity: coreLit ? 1 : 0, transition: 'opacity .5s' }}
            >
              <FontAwesomeIcon icon={faCircleCheck} />
              {model.hero.badge}
            </div>
          </div>

          {/* Consolidation callout */}
          <div
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
            style={{ top: 'calc(100% + 8px)', opacity: absorbed ? 1 : 0, transition: 'opacity .5s .3s' }}
          >
            <span
              className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: `${t.accentHex}1f`, color: t.accentHex }}
            >
              <FontAwesomeIcon icon={faArrowsToCircle} />
              {model.incumbents.length} tools → 1 platform
            </span>
          </div>
        </div>

        {/* Outcome / team nodes */}
        {outNodes.map((o) => (
          <StageNode
            key={`out-${o.i}`}
            x={OUT_X}
            y={o.y}
            isDark={isDark}
            t={t}
            hidden={!outcomesShown}
            highlight={expand}
          >
            <BrandLogo label={o.label} isDark={isDark} size={16} fallbackIcon={getConceptIcon(o.label) || faUsers} />
            <span className="text-xs font-semibold">{o.label}</span>
          </StageNode>
        ))}
      </div>

      {/* Beat controls */}
      <div className="flex items-center justify-center gap-3 mt-1">
        <ControlButton icon={faChevronLeft} onClick={prev} disabled={beat === 0} isDark={isDark} />
        <div className="flex items-center gap-1.5">
          {beats.map((b, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setBeat(i)}
              className="group flex items-center gap-1.5"
              title={b.title}
            >
              <span
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  backgroundColor: i === beat ? t.accentHex : (isDark ? '#FFFFFF33' : '#1C1E2333'),
                  transform: i === beat ? 'scale(1.4)' : 'scale(1)',
                }}
              />
            </button>
          ))}
        </div>
        <ControlButton icon={faChevronRight} onClick={next} disabled={beat === beats.length - 1} isDark={isDark} />
      </div>
    </div>
  )
}

function StageNode({ x, y, isDark, t, hidden, highlight, children }) {
  return (
    <div
      className="absolute z-10"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%,-50%) scale(${hidden ? 0.85 : 1})`,
        opacity: hidden ? 0 : 1,
        transition: 'opacity .5s, transform .5s',
      }}
    >
      <div
        className={`px-3 py-2 rounded-xl border flex items-center gap-2 whitespace-nowrap ${t.cardBase} ${t.ink}`}
        style={highlight ? { borderColor: t.accentHex, boxShadow: `0 0 16px ${t.accentHex}44` } : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function ControlButton({ icon, onClick, disabled, isDark }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
        disabled
          ? isDark ? 'border-white/10 text-white/20' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/20'
          : isDark ? 'border-white/20 text-white/70 hover:border-elastic-teal hover:text-elastic-teal' : 'border-elastic-dev-blue/20 text-elastic-dev-blue/70 hover:border-elastic-blue hover:text-elastic-blue'
      }`}
    >
      <FontAwesomeIcon icon={icon} className="text-xs" />
    </button>
  )
}
