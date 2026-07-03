import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import ClusterMark from '../components/ClusterMark'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChartColumn, faDatabase, faSatelliteDish, faSliders, faFilter, faShieldHalved, faArrowRightLong, faArrowDownLong } from '@fortawesome/free-solid-svg-icons'

// Source: "Elastic Overview" / "Elastic Overview w/ Management Plane" reference diagrams.
// Built as a bottom-up story: data is collected in the ETL plane, rises into the Data
// plane to be stored & reasoned over, and surfaces in the Visualization plane — with a
// Management Plane that governs the platform across the Data and ETL planes.
const PINK = '#F04E98'
const TEAL = '#48EFCF'
const YELLOW = '#FEC514'
const BLUE = '#0B64DD'
const PURPLE = '#9B72CF'

// Stage → highest plane revealed (0 ETL, 1 +Data, 2 +Viz); stage 3 adds Management.
const STAGE_COUNT = 4

const DEFAULT_BEATS = [
  { key: 'collect', step: 'Collect' },
  { key: 'store', step: 'Store & Reason' },
  { key: 'visualize', step: 'Visualize & Act' },
  { key: 'govern', step: 'Govern' },
]

function ElasticOverviewScene({ metadata = {}, externalStage = 0, onStageChange }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [focus, setFocus] = useState(null)
  const [playKey, setPlayKey] = useState(0)

  const stage = Math.max(0, Math.min(externalStage, STAGE_COUNT - 1))
  const setStage = (val) => onStageChange?.(typeof val === 'function' ? val(externalStage) : val)

  const eyebrow = metadata.eyebrow || 'Platform Architecture'
  const titlePlain = metadata.titlePlain || 'Elastic '
  const titleAccent = metadata.titleAccent || 'Overview'
  const subtitle =
    metadata.subtitle ||
    'One platform to collect any data, search and reason over it at scale, and act on what you find — all centrally managed.'
  const beats = metadata.beats || DEFAULT_BEATS

  const dataRevealed = stage >= 1
  const vizRevealed = stage >= 2
  const mgmtActive = stage >= 3

  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const cardBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.92)'
  const ghostBorder = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(16,28,63,0.12)'
  const slab = isDark ? '0 12px 26px rgba(0,0,0,0.38)' : '0 14px 26px rgba(16,28,63,0.10)'

  // Light theme is blue-forward to match the rest of the deck: every plane
  // collapses to the elastic-blue accent (planes stay distinct by label + stack
  // position). Dark theme keeps the per-plane brand hues.
  const viz = isDark ? PINK : BLUE
  const data = isDark ? TEAL : BLUE
  const etl = BLUE
  const mgmt = isDark ? PURPLE : BLUE
  const logstash = isDark ? YELLOW : BLUE

  // Text colors tuned for contrast in each theme.
  const TEXT = isDark
    ? { viz: PINK, data: TEAL, etl: '#4C8DFF', mgmt: '#C9B4EA' }
    : { viz: BLUE, data: BLUE, etl: BLUE, mgmt: BLUE }

  // Entrance for the header + chrome (planes handle their own reveal via stage).
  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [14, 0], duration: 440, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [])

  const box = (label, color, sizeClass, icon, mark) => (
    <div
      className="rounded-xl border flex items-center justify-center gap-2 text-center px-3 h-full"
      style={{ borderColor: `${color}66`, background: `${color}1c` }}
    >
      {mark}
      {icon && <FontAwesomeIcon icon={icon} className="text-sm shrink-0" style={{ color }} />}
      <span className={`font-bold leading-tight ${sizeClass} ${headText}`}>{label}</span>
    </div>
  )

  // A plane row: dimmed/dashed when not yet revealed, slab + hover-focus when active.
  const Plane = ({ pkey, color, textColor, icon, name, role, active, children }) => {
    const dim = !active ? 0.24 : focus && focus !== pkey ? 0.42 : 1
    return (
      <div
        className="flex gap-3 h-full min-h-0 transition-all duration-500"
        style={{ opacity: dim }}
        onMouseEnter={() => active && setFocus(pkey)}
        onMouseLeave={() => active && setFocus(null)}
      >
        {/* Plane label */}
        <div className="w-32 shrink-0 flex">
          <div
            className="w-full h-full rounded-xl border px-2.5 py-2 flex flex-col justify-center transition-all duration-500"
            style={{ borderColor: active ? `${color}66` : ghostBorder, background: active ? cardBg : 'transparent' }}
          >
            <FontAwesomeIcon icon={icon} className="text-base mb-1" style={{ color: active ? textColor : ghostBorder }} />
            <p className="text-xs font-bold uppercase tracking-wide leading-tight" style={{ color: active ? textColor : undefined }}>
              {name}
            </p>
            <p className={`text-[11px] leading-tight ${isDark ? 'text-white/50' : 'text-elastic-dark-ink/50'}`}>{role}</p>
          </div>
        </div>

        {/* Plane content slab */}
        <div
          className="flex-1 min-h-0 rounded-2xl border p-2.5 flex flex-col gap-2 transition-all duration-500"
          style={{
            // borderColor: active ? `${color}66` : ghostBorder,
            // borderStyle: active ? 'solid' : 'dashed',
            // borderBottom: active ? `3px solid ${color}77` : undefined,
            background: active ? cardBg : 'transparent',
            boxShadow: active ? slab : 'none',
            transform: active && focus === pkey ? 'translateY(-3px)' : 'none',
          }}
        >
          {children}
        </div>
      </div>
    )
  }

  // Vertical connector down the rail's center (aligned with the header), showing
  // the Management Plane flowing down into its capability groups.
  const mgmtFlow = (row) => (
    <div className="relative" style={{ gridRow: row }}>
      <span className="absolute left-1/2 -translate-x-1/2 top-0 bottom-1.5 w-0.5" style={{ background: `${mgmt}88` }} />
      <FontAwesomeIcon icon={faArrowDownLong} className="absolute left-1/2 -translate-x-1/2 bottom-0 text-[11px]" style={{ color: mgmt }} />
    </div>
  )

  const mgmtChip = (label) => (
    <div className="relative rounded-lg border text-center px-2 py-1.5" style={{ borderColor: `${mgmt}88`, background: `${mgmt}22` }}>
      {/* connector into the platform */}
      <span className="absolute right-full top-1/2 -translate-y-1/2 mr-1 w-5 border-t border-dashed" style={{ borderColor: `${mgmt}99` }} />
      <span className="text-[11px] font-semibold leading-tight" style={{ color: TEXT.mgmt }}>{label}</span>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-4 overflow-hidden">
      <div ref={rootRef} className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div className="reveal">
          <SceneHeader eyebrow={eyebrow} titlePlain={titlePlain} titleAccent={titleAccent} subtitle={subtitle} />
        </div>

        {/* Planes stack (bottom-up: ETL → Data → Viz). CSS grid keeps all three
            plane rows exactly equal height; the Management Plane frame + rail are
            grid items spanning the bottom two rows. */}
        <div
          className="reveal flex-1 min-h-0 grid"
          style={{
            gridTemplateRows: '1fr 1.75rem 1fr 1.75rem 1fr',
            gridTemplateColumns: mgmtActive ? '1fr 12.5rem' : '1fr 0rem',
            columnGap: mgmtActive ? '0.75rem' : '0rem',
            transition: 'grid-template-columns 500ms ease, column-gap 500ms ease',
          }}
        >
          {/* Visualization plane */}
          <div className="min-h-0" style={{ gridColumn: 1, gridRow: 1 }}>
            <Plane pkey="viz" color={viz} textColor={TEXT.viz} icon={faChartColumn} name="Visualization" role="See & act" active={vizRevealed}>
              <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                {box('Elastic Observability', viz, 'text-xs md:text-sm')}
                {box('Elastic Search', viz, 'text-xs md:text-sm')}
                {box('Elastic Security', viz, 'text-xs md:text-sm')}
              </div>
              <div className="flex-1 min-h-0">{box('Kibana', viz, 'text-lg md:text-xl', faChartColumn)}</div>
              <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                {box('Workflows', viz, 'text-xs md:text-sm')}
                {box('Agent Builder', viz, 'text-xs md:text-sm')}
                {box('AI Assistant', viz, 'text-xs md:text-sm')}
              </div>
            </Plane>
          </div>

          {/* Flow: Data → Visualization */}
          <div className="relative" style={{ gridColumn: 1, gridRow: 2 }}>
            <RisingFlow color={isDark ? TEAL : BLUE} active={vizRevealed} playKey={playKey} />
          </div>

          {/* Data plane */}
          <div className="min-h-0" style={{ gridColumn: 1, gridRow: 3 }}>
            <Plane pkey="data" color={data} textColor={TEXT.data} icon={faDatabase} name="Data" role="Store & reason" active={dataRevealed}>
              <div className="grid grid-cols-3 gap-2 flex-1 min-h-0">
                {box('Ingest', data, 'text-xs md:text-sm')}
                {box('Search', data, 'text-xs md:text-sm')}
                {box('Store', data, 'text-xs md:text-sm')}
              </div>
              <div className="flex-1 min-h-0">
                {box('Elasticsearch', data, 'text-lg md:text-xl', null, (
                  <ClusterMark color={TEXT.data} className="h-4 w-4 shrink-0" />
                ))}
              </div>
              <div className="flex-1 min-h-0">{box('Machine Learning / Artificial Intelligence', data, 'text-xs md:text-sm')}</div>
            </Plane>
          </div>

          {/* Flow: ETL → Data */}
          <div className="relative" style={{ gridColumn: 1, gridRow: 4 }}>
            <RisingFlow color={isDark ? '#4C8DFF' : BLUE} active={dataRevealed} playKey={playKey} />
          </div>

          {/* ETL plane */}
          <div className="min-h-0" style={{ gridColumn: 1, gridRow: 5 }}>
            <Plane pkey="etl" color={etl} textColor={TEXT.etl} icon={faSatelliteDish} name="ETL" role="Collect" active>
              <div className="grid gap-2 flex-1 min-h-0" style={{ gridTemplateColumns: '1fr 1.5fr' }}>
                <div className="min-h-0">{box('Logstash', logstash, 'text-lg md:text-xl', faFilter)}</div>
                <div className="flex flex-col gap-2 min-h-0">
                  <div className="flex-1 min-h-0">{box('Elastic Agent', etl, 'text-xs md:text-sm', faShieldHalved)}</div>
                  <div className="flex-1 min-h-0">{box('Beats', etl, 'text-xs md:text-sm', faSatelliteDish)}</div>
                  <div className="flex-1 min-h-0">{box('Connectors · Web Crawler · Language Clients', etl, 'text-[11px] md:text-xs')}</div>
                </div>
              </div>
            </Plane>
          </div>

          {/* Management Plane rail — accessed from Kibana (arrow into the header at
              the Visualization row) and reaching into the planes it governs. The
              nested grid mirrors the parent's row template so the capability chips
              line up with the Data plane (ILM) and the ETL plane (Fleet, Integrations,
              Ingest Pipeline Management). */}
          {mgmtActive && (
            <div
              className="grid min-w-0"
              style={{ gridColumn: 2, gridRow: '1 / 6', gridTemplateRows: '1fr 1.75rem 1fr 1.75rem 1fr' }}
            >
              {/* Access point — mirrors the Visualization plane's internal layout
                  (three equal rows: solutions / Kibana / surfaces) so the pill and
                  its connector center on the Kibana box, which the Management Plane
                  is accessed through. */}
              <div className="flex flex-col gap-2 p-2.5" style={{ gridRow: 1 }}>
                <div className="flex-1 min-h-0" />
                <div className="relative flex-1 min-h-0 flex items-center justify-center">
                  <span className="absolute right-full top-1/2 -translate-y-1/2 flex items-center whitespace-nowrap">
                    <span className="h-0.5 w-6" style={{ background: `${mgmt}aa` }} />
                    <FontAwesomeIcon icon={faArrowRightLong} className="text-xs -ml-1" style={{ color: mgmt }} />
                  </span>
                  <div
                    className="rounded-lg border px-2.5 py-1.5 text-center flex items-center gap-1.5 shadow-sm"
                    style={{ borderColor: mgmt, background: mgmt }}
                  >
                    <FontAwesomeIcon icon={faSliders} className="text-[10px] text-white" />
                    <span className="text-[11px] font-bold leading-tight text-white">Management Plane</span>
                  </div>
                </div>
                {/* Connector segment: bridges the pill down to the gap-row flow line. */}
                <div className="relative flex-1 min-h-0">
                  <span
                    className="absolute left-1/2 -translate-x-1/2 w-0.5"
                    style={{ top: '-0.75rem', bottom: '-0.625rem', background: `${mgmt}88` }}
                  />
                </div>
              </div>

              {/* Management Plane header → capabilities */}
              {mgmtFlow(2)}

              {/* Single framed capabilities box spanning the Data + ETL planes. A
                  nested grid mirrors the parent rows so ILM lines up with the Data
                  plane and the Fleet/Integrations/Ingest Pipeline group lines up
                  with the ETL plane. */}
              <div
                className="grid rounded-xl border border-dashed px-2 min-h-0"
                style={{ gridRow: '3 / 6', gridTemplateRows: '1fr 1.75rem 1fr', borderColor: `${mgmt}88` }}
              >
                <div className="flex flex-col justify-center gap-2 min-h-0" style={{ gridRow: 1 }}>
                  {mgmtChip('Index Lifecycle Management')}
                </div>

                <div className="flex flex-col justify-center gap-2 min-h-0" style={{ gridRow: 3 }}>
                  {mgmtChip('Fleet')}
                  {mgmtChip('Integrations')}
                  {mgmtChip('Ingest Pipeline Management')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stage stepper (also driven by nav-bar controls) */}
        <div className="reveal">
          <SceneStepper beats={beats} beat={stage} onGo={setStage} onReplay={() => setPlayKey((k) => k + 1)} />
        </div>
      </div>
    </div>
  )
}

// Upward-rising particles filling a gap, signalling data flowing up between planes.
function RisingFlow({ color, active, playKey }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!active) return
    const el = ref.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.rise-dot'), {
      translateY: [16, -16],
      opacity: [0, 1, 1, 0],
      duration: 1400,
      delay: stagger(150),
      easing: 'linear',
      loop: true,
    })
    return () => anim?.pause?.()
  }, [active, playKey])

  if (!active) return null
  return (
    <div ref={ref} className="absolute inset-0 flex items-center justify-center gap-8 pointer-events-none">
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className="rise-dot w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      ))}
    </div>
  )
}

export default ElasticOverviewScene
