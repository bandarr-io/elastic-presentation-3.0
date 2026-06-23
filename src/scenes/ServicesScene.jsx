import { animate, stagger } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faHandshake, faRocket, faShieldHalved, faCheck, faHeadset,
  faClock, faUsers, faGraduationCap, faChartLine, faExchangeAlt,
  faCogs, faLightbulb, faExclamationTriangle, faCalendarXmark,
  faPersonDigging, faCircleQuestion, faDatabase, faBolt,
  faArrowsRotate, faCheckCircle, faRotateRight, faServer,
  faXmark, faBullseye, faMagnifyingGlass, faTrash,
  faGear, faBrain, faChartBar, faRotate, faLayerGroup,
} from '@fortawesome/free-solid-svg-icons'

// ─── Data ─────────────────────────────────────────────────────────────────────

const diyPainPoints = [
  { icon: faCalendarXmark,       title: '18+ Months',     subtitle: 'Average timeline',         desc: 'Extended timelines with uncertain milestones and shifting scope.' },
  { icon: faExclamationTriangle, title: 'High Risk',      subtitle: 'Unpredictable outcomes',   desc: 'No proven methodology or safety nets when things go wrong.' },
  { icon: faPersonDigging,       title: 'Resource Drain', subtitle: 'Internal teams stretched', desc: 'Your best engineers pulled from core work for months.' },
  { icon: faCircleQuestion,      title: 'Knowledge Gaps', subtitle: 'Learning on the job',      desc: 'Costly mistakes without expert guidance.' },
]

const elasticBenefits = [
  { icon: faClock,         title: '4–7 Months',        subtitle: 'Proven timeline',     desc: 'Structured phases with clear milestones and accountability.' },
  { icon: faShieldHalved,  title: 'Zero Downtime',      subtitle: 'Risk mitigated',      desc: 'Parallel environments, data validation, and tested rollback plans.' },
  { icon: faUsers,         title: 'Expert Team',        subtitle: 'Dedicated resources', desc: 'Certified specialists focused entirely on your success.' },
  { icon: faGraduationCap, title: 'Knowledge Transfer', subtitle: 'Enablement included', desc: 'Your team trained and confident before handover.' },
]

const servicePillars = [
  {
    id: 'consulting',
    name: 'Consulting',
    icon: faHandshake,
    color: '#48EFCF',
    items: ['Solution Design', 'Best Practices', 'Implementation', 'Strategic Planning'],
  },
  {
    id: 'migration',
    name: 'Migration',
    icon: faExchangeAlt,
    color: '#F04E98',
    items: ['Risk Mitigation', 'Data Validation', 'Training & Workshops', 'Use Case Transition'],
  },
  {
    id: 'support',
    name: 'Support',
    icon: faHeadset,
    color: '#0B64DD',
    items: ['24/7 Coverage', 'Dedicated Support Engineer', 'Break / Fix Support', 'Service Level Agreements'],
  },
]

const journeyPhases = [
  { name: 'Discover',  desc: 'Assess & define success', color: '#48EFCF', icon: faBullseye },
  { name: 'Plan',      desc: 'Architecture & sprints',  color: '#FF957D', icon: faLightbulb },
  { name: 'Implement', desc: 'Deploy & configure',      color: '#F04E98', icon: faCogs },
  { name: 'Migrate',   desc: 'Data onboarding',         color: '#0B64DD', icon: faExchangeAlt },
  { name: 'Optimize',  desc: 'Tune & expand',           color: '#FEC514', icon: faChartLine },
  { name: 'Partner',   desc: 'Ongoing success',         color: '#00BFB3', icon: faHandshake },
]

const dataSources = [
  { name: 'Network',             color: '#FF9900' },
  { name: 'Linux',   color: '#FCC624' },
  { name: 'Windows', color: '#00A4EF' },
  { name: 'Palo Alto',       color: '#F04E23' },
  { name: 'CrowdStrike',     color: '#E01E5A' },
]

const shippers = [
  { name: 'Logstash',          color: '#F1B400' },
  { name: 'Elastic Agent',     color: '#48EFCF' },
  { name: 'OOTB Integrations', color: '#F04E98' },
  { name: 'Streams', color: '#00BFB3' },
  // { name: 'Auto Import', color: '#FEC514' },
]

// ─── Animated Counter (anime.js) ──────────────────────────────────────────────

function AnimatedCounter({ value, suffix = '' }) {
  const [display, setDisplay] = useState(0)
  const numeric = parseInt(value) || 0

  useEffect(() => {
    const counter = { value: 0 }
    const anim = animate(counter, {
      value: numeric,
      duration: 1800,
      ease: 'outExpo',
      onUpdate: () => setDisplay(Math.round(counter.value)),
    })
    return () => anim.pause()
  }, [numeric])

  return <span>{display}{suffix}</span>
}

// ─── Flow Line (anime.js particles) ──────────────────────────────────────────

function FlowLine({ color, active }) {
  const trackRef = useRef(null)
  const animRef  = useRef(null)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    // Teardown previous
    if (animRef.current) animRef.current.pause()
    track.querySelectorAll('.flow-particle').forEach(el => el.remove())

    if (!active) return

    const trackWidth = track.offsetWidth

    const particles = Array.from({ length: 3 }, () => {
      const el = document.createElement('div')
      el.className = 'flow-particle'
      el.style.cssText = `
        position: absolute;
        width: 7px; height: 7px;
        border-radius: 50%;
        background: ${color};
        top: 50%; margin-top: -3.5px;
        left: 0;
        opacity: 0;
        box-shadow: 0 0 6px ${color};
        pointer-events: none;
      `
      track.appendChild(el)
      return el
    })

    animRef.current = animate(particles, {
      left: [`-4px`, `${trackWidth - 4}px`],
      opacity: [0, 1, 1, 0],
      duration: 950,
      delay: stagger(300),
      ease: 'linear',
      loop: true,
    })

    return () => {
      if (animRef.current) animRef.current.pause()
      particles.forEach(el => el.remove())
    }
  }, [active, color])

  return (
    <div className="flex-shrink-0 self-center flex flex-col items-center gap-0.5">
      <div ref={trackRef} className="w-10 relative" style={{ height: '2px' }}>
        <div className="absolute inset-0 rounded-full" style={{ background: `${color}35` }} />
      </div>
    </div>
  )
}

// ─── Branch Connector (SVG Y-split with particles) ───────────────────────────

function BranchConnector({ legacyColor, elasticColor, legacyActive, legacyVisible, elasticActive, straight }) {
  const svgRef        = useRef(null)
  const legacyPathRef = useRef(null)
  const elasticPathRef = useRef(null)
  const animsRef      = useRef([])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return

    animsRef.current.forEach(a => a?.pause())
    animsRef.current = []
    svg.querySelectorAll('.branch-particle').forEach(el => el.remove())

    const spawnParticles = (pathEl, color, active) => {
      if (!pathEl || !active) return
      const total = pathEl.getTotalLength()

      Array.from({ length: 3 }).forEach((_, i) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.classList.add('branch-particle')
        circle.setAttribute('r', '3')
        circle.setAttribute('fill', color)
        circle.setAttribute('opacity', '0')
        circle.style.filter = `drop-shadow(0 0 4px ${color})`
        svg.appendChild(circle)

        const counter = { t: 0 }
        const anim = animate(counter, {
          t: 1,
          duration: 1100,
          delay: i * 360,
          ease: 'linear',
          loop: true,
          onUpdate: () => {
            const pt = pathEl.getPointAtLength(counter.t * total)
            circle.setAttribute('cx', pt.x)
            circle.setAttribute('cy', pt.y)
            const p = counter.t
            circle.setAttribute('opacity', p > 0.05 && p < 0.92 ? '1' : '0')
          },
        })
        animsRef.current.push(anim)
      })
    }

    spawnParticles(legacyPathRef.current, legacyColor, legacyActive)
    spawnParticles(elasticPathRef.current, elasticColor, elasticActive)

    return () => {
      animsRef.current.forEach(a => a?.pause())
      svg?.querySelectorAll('.branch-particle').forEach(el => el.remove())
    }
  }, [legacyActive, elasticActive, legacyColor, elasticColor])

  const cy = 104
  const elasticD = straight
    ? `M 0 ${cy} L 40 ${cy}`                   // straight line when only Elastic remains
    : `M 0 ${cy} C 20 ${cy}, 20 159, 40 159`   // curve down otherwise
  return (
    <div className="flex-shrink-0 self-stretch relative" style={{ width: '40px' }}>
      <svg
        ref={svgRef}
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 40 208"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Upper curve → Legacy (faint when visible but inactive, hidden otherwise) */}
        <path
          ref={legacyPathRef}
          d={`M 0 ${cy} C 20 ${cy}, 20 49, 40 49`}
          stroke={legacyColor}
          strokeWidth="1.5"
          strokeOpacity={legacyActive ? 0.35 : legacyVisible ? 0.15 : 0}
          style={{ transition: 'stroke-opacity 0.7s' }}
        />
        {/* Elastic path — curves down or goes straight */}
        <path
          ref={elasticPathRef}
          d={elasticD}
          stroke={elasticColor}
          strokeWidth="1.5"
          strokeOpacity={elasticActive ? 0.35 : 0.1}
          style={{ transition: 'stroke-opacity 0.7s' }}
        />
      </svg>
    </div>
  )
}

// Straight dashed line to Trash + curved arch from Legacy down to Elastic (with particles)
function DestBranchConnector({ elasticColor }) {
  const svgRef      = useRef(null)
  const archPathRef = useRef(null)
  const trashPathRef = useRef(null)
  const animsRef    = useRef([])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    animsRef.current.forEach(a => a?.pause())
    animsRef.current = []
    svg.querySelectorAll('.dest-particle').forEach(el => el.remove())

    const spawnParticles = (pathEl, color, count, duration) => {
      if (!pathEl) return
      const total = pathEl.getTotalLength()
      Array.from({ length: count }).forEach((_, i) => {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
        circle.classList.add('dest-particle')
        circle.setAttribute('r', '3')
        circle.setAttribute('fill', color)
        circle.setAttribute('opacity', '0')
        circle.style.filter = `drop-shadow(0 0 4px ${color})`
        svg.appendChild(circle)
        const counter = { t: 0 }
        const anim = animate(counter, {
          t: 1, duration, delay: i * (duration / count), ease: 'linear', loop: true,
          onUpdate: () => {
            const pt = pathEl.getPointAtLength(counter.t * total)
            circle.setAttribute('cx', pt.x)
            circle.setAttribute('cy', pt.y)
            const p = counter.t
            circle.setAttribute('opacity', p > 0.05 && p < 0.92 ? '1' : '0')
          },
        })
        animsRef.current.push(anim)
      })
    }

    spawnParticles(archPathRef.current, elasticColor, 3, 2400)
    spawnParticles(trashPathRef.current, '#EF4444', 1, 800)

    return () => {
      animsRef.current.forEach(a => a?.pause())
      svg?.querySelectorAll('.dest-particle').forEach(el => el.remove())
    }
  }, [elasticColor])

  return (
    <div className="flex-shrink-0 self-stretch relative" style={{ width: '40px' }}>
      <svg
        ref={svgRef}
        className="absolute inset-0"
        width="100%"
        height="100%"
        viewBox="0 0 40 208"
        preserveAspectRatio="none"
        fill="none"
      >
        {/* Straight dashed line → Trash at same level as Legacy */}
        <path
          ref={trashPathRef}
          d="M 0 49 L 40 49"
          stroke="#EF4444"
          strokeWidth="1.5"
          strokeOpacity={0.3}
          strokeDasharray="4 3"
        />
        {/* Arch from Legacy (0,49) curving right then down to Elastic (0,159) */}
        <path
          ref={archPathRef}
          d="M 0 49 C 50 49, 50 159, 0 159"
          stroke={elasticColor}
          strokeWidth="1.5"
          strokeOpacity={0.35}
        />
      </svg>
    </div>
  )
}

// ─── Zero Downtime Demo ───────────────────────────────────────────────────────

function ZeroDowntimeDemo({ isDark, externalPhase = 'idle', dataSources: resolvedDataSources = dataSources }) {
  const phase    = externalPhase
  const [progress, setProgress] = useState(0)

  const isDeployed = phase !== 'idle'
  const isCutting  = ['preparing', 'stopping', 'validating', 'usecases'].includes(phase)
  const isComplete = phase === 'complete'

  const legacyColor  = isDark
    ? (phase === 'stopping' ? '#EF4444' : phase === 'validating' ? '#EAB308' : '#F97316')
    : '#F97316'
  const elasticColor = isDark ? '#48EFCF' : '#0B64DD'

  useEffect(() => {
    const map = { idle: 0, deployed: 0, preparing: 20, stopping: 50, validating: 75, usecases: 88, complete: 100 }
    setProgress(map[phase] ?? 0)
  }, [phase])

  const statusText = {
    idle:       'Legacy system receiving all data',
    deployed:   'Dual-write active — both systems validated in parallel',
    preparing:  'Preparing cutover sequence...',
    stopping:   'Stopping legacy writes...',
    validating: 'Validating data integrity...',
    complete:   'Migration complete. Zero events lost.',
    usecases:   'Migrating use cases and removing technical debt.',
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Visualization */}
      <div className={`rounded-2xl border p-5 flex flex-col ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/80 border-elastic-dev-blue/10'}`}>

        {/* Header */}
        <div className="flex items-start justify-between mb-5 flex-shrink-0">
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
              Zero Downtime Migration
            </h3>
            <p className={`text-sm mt-0.5 transition-all duration-500 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
              {statusText[phase]}
            </p>
          </div>
          {(() => {
            const badgeConfig = {
              idle:       { label: 'Legacy Only',        icon: faDatabase,      cls: 'bg-orange-500/20 text-orange-400' },
              deployed:   { label: 'Dual-Write Active',  icon: faBolt,          cls: isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue' },
              preparing:  { label: 'Preparing',          icon: faArrowsRotate,  cls: isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue', spin: true },
              stopping:   { label: 'Stopping Writes',    icon: faXmark,         cls: 'bg-red-500/20 text-red-400' },
              validating: { label: 'Validating',         icon: faArrowsRotate,  cls: isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue', spin: true },
              complete:   { label: 'Migration Complete', icon: faCheckCircle,   cls: isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue' },
              usecases:   { label: 'Use Case Migration', icon: faArrowsRotate,  cls: isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/20 text-elastic-blue', spin: true },
            }
            const { label, icon, cls, spin } = badgeConfig[phase] ?? badgeConfig.idle
            return (
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-500 ${cls}`}>
                <FontAwesomeIcon icon={icon} className={`mr-1.5${spin ? ' animate-spin' : ''}`} />
                {label}
              </div>
            )
          })()}
        </div>

        {/* Architecture flow */}
        <div className="flex items-stretch gap-4 h-52">

          {/* Data Sources */}
          <div className={`flex-shrink-0 w-36 rounded-xl border-2 p-3 flex flex-col ${isDark ? 'border-elastic-blue/30 bg-elastic-blue/10' : 'border-elastic-dev-blue/20 bg-elastic-blue/5'}`}>
            <div className="flex items-center gap-1.5 mb-3">
              <FontAwesomeIcon icon={faServer} className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
              <span className={`text-xs font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Data Sources</span>
            </div>
            <div className="space-y-1.5 flex-1">
              {resolvedDataSources.map(src => (
                <div key={src.name} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0 animate-pulse" style={{ backgroundColor: src.color }} />
                  <span className={isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}>{src.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow: Sources → Pipeline */}
          <FlowLine color={isDark ? '#48EFCF' : '#0B64DD'} active={true} />

          {/* Pipeline */}
          <div className={`flex-shrink-0 w-44 rounded-xl border-2 p-3 flex flex-col transition-all duration-700 ${
            isDeployed
              ? isDark ? 'border-elastic-teal/50 bg-elastic-teal/10' : 'border-elastic-blue/50 bg-elastic-blue/10'
              : isDark ? 'border-orange-500/30 bg-orange-500/10' : 'border-orange-500/30 bg-orange-500/5'
          }`}>
            <div className={`text-xs font-bold text-center mb-3 transition-colors duration-700 ${isDeployed ? isDark ? 'text-elastic-teal' : 'text-elastic-blue' : 'text-orange-400'}`}>
              {isDeployed ? 'Data Pipelines' : 'Data Pipeline'}
            </div>
            <div className="space-y-1 flex-1 overflow-hidden">
              <div className={`flex items-center gap-2 px-2 py-[5px] rounded-lg text-xs ${isDark ? 'bg-white/[0.07]' : 'bg-white/70'}`}>
                <div className="w-2 h-2 rounded-full flex-shrink-0 bg-orange-400" />
                <span className={`truncate ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>Existing Pipeline</span>
              </div>
              {isDeployed && shippers.map(s => (
                <div key={s.name} className={`flex items-center gap-2 px-2 py-[5px] rounded-lg text-xs ${isDark ? 'bg-white/[0.07]' : 'bg-white/70'}`}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className={`truncate ${isDark ? 'text-white/80' : 'text-elastic-dev-blue/80'}`}>{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Flow: Pipeline → Destinations */}
          {isDeployed
            ? <BranchConnector
                legacyColor={legacyColor}
                elasticColor={elasticColor}
                legacyActive={phase === 'deployed' || phase === 'preparing'}
                legacyVisible={phase === 'deployed' || phase === 'preparing' || phase === 'stopping'}
                straight={isComplete}
                elasticActive={true}
              />
            : <FlowLine color={legacyColor} active={true} />
          }

          {/* Destinations */}
          <div className={`flex flex-col gap-3 transition-all duration-700 ${phase === 'usecases' ? 'w-72' : 'flex-1'} ${isDeployed ? 'justify-between' : 'justify-center'}`}>

            {/* Legacy */}
            {!isComplete && (
              <div className={`flex-1 relative rounded-xl border-2 p-4 flex items-center justify-center transition-all duration-700 ${
                phase === 'stopping'   ? 'border-red-500 bg-red-500/15'
                : (phase === 'validating' || phase === 'usecases') ? 'border-yellow-500/60 bg-yellow-500/10'
                : 'border-orange-500/40 bg-orange-500/10'
              }`}>
                {(phase === 'stopping' || phase === 'validating' || phase === 'usecases') && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/30">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      phase === 'stopping' ? 'bg-red-500 text-white' : 'bg-yellow-500 text-black'
                    }`}>
                      {phase === 'stopping' ? 'STOPPING WRITES' : 'WRITES STOPPED'}
                    </span>
                  </div>
                )}
                <div className={`flex items-center gap-3 ${isCutting ? 'opacity-30' : ''}`}>
                  <FontAwesomeIcon icon={faDatabase} className="text-lg text-orange-500" />
                  <div>
                    <div className="text-sm font-bold text-orange-500">Legacy System</div>
                    <div className={`text-xs ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                      {phase === 'deployed' ? 'Receiving data' : 'Active'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Elastic — separate flow line when deployed */}
            {isDeployed && !isComplete && (
              <div className={`flex-1 rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all duration-700 ${
                isDark ? 'border-elastic-teal/40 bg-elastic-teal/10' : 'border-elastic-blue/40 bg-elastic-blue/10'
              }`}>
                <div className="flex items-center gap-3">
                  <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-10 h-10 object-contain" />
                  <div>
                    <div className={`font-bold text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Elastic</div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Receiving data</div>
                  </div>
                </div>
              </div>
            )}

            {/* Complete state — solution cards + Elastic platform container */}
            {isComplete && (
              <div className="flex-1 flex flex-col gap-2">

                {/* Solution cards — 1/3 */}
                <div className="flex gap-2" style={{ flex: '1 1 33%' }}>
                  {[
                    { type: 'Build Your Own', name: 'Elasticsearch', color: '#FEC514' },
                    { type: 'Out-of-the-Box', name: 'Observability', color: '#F04E98' },
                    { type: 'Out-of-the-Box', name: 'Security',      color: '#FF7E6B' },
                  ].map(sol => (
                    <div
                      key={sol.name}
                      className={`flex-1 rounded-xl border-2 flex flex-col items-center justify-center py-2 px-1 ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`}
                      style={{ borderColor: sol.color }}
                    >
                      <div className={`text-[9px] mb-0.5 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{sol.type}</div>
                      <div className={`text-xs font-extrabold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{sol.name}</div>
                    </div>
                  ))}
                </div>

                {/* Elastic Platform box — 2/3 */}
                <div
                  className={`rounded-xl border-2 px-3 py-2 flex flex-col gap-2 transition-all duration-700 ${
                    isDark ? 'border-elastic-teal bg-elastic-teal/10' : 'border-elastic-blue bg-elastic-blue/10'
                  }`}
                  style={{ flex: '2 2 67%' }}
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <img src="/logo-elastic-glyph-color.png" alt="Elastic" className="w-4 h-4 object-contain" />
                    <span className={`font-bold text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Elastic Platform</span>
                    <span className={`ml-auto text-[9px] font-bold flex items-center gap-1 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                      <FontAwesomeIcon icon={faCheckCircle} />All traffic
                    </span>
                  </div>

                  {/* Capability tiles */}
                  <div className="flex gap-1.5 flex-1">
                    {[
                      { label: 'Ingestion',      icon: faBolt,           active: false },
                      { label: 'Processing',     icon: faGear,           active: false },
                      { label: 'Storage',        icon: faDatabase,       active: true  },
                      { label: 'Search',         icon: faMagnifyingGlass,active: true  },
                      { label: 'AI & ML',        icon: faBrain,          active: true  },
                      { label: 'Visualization',  icon: faChartBar,       active: false },
                      { label: 'Automation',     icon: faRotate,         active: false },
                    ].map(cap => (
                      <div
                        key={cap.label}
                        className={`flex-1 rounded-lg flex flex-col items-center justify-center gap-1 border transition-all ${
                          cap.active
                            ? isDark
                              ? 'border-elastic-teal/60 bg-elastic-teal/15 text-elastic-teal'
                              : 'border-elastic-blue/50 bg-elastic-blue/10 text-elastic-blue'
                            : isDark
                              ? 'border-white/10 bg-white/5 text-white/40'
                              : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/5 text-elastic-dev-blue/40'
                        }`}
                      >
                        <FontAwesomeIcon icon={cap.icon} className="text-[11px]" />
                        <span className="text-[8px] font-semibold leading-tight text-center">{cap.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Search AI Lake pill */}
                  <div className={`flex-shrink-0 rounded-full border py-1 text-center text-[10px] font-bold ${
                    isDark ? 'border-elastic-teal/40 text-elastic-teal bg-elastic-teal/10' : 'border-elastic-blue/30 text-elastic-blue bg-elastic-blue/5'
                  }`}>
                    Search AI Lake
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Use case phase: connector + Trash + Elastic column */}
          {phase === 'usecases' && <>
            <DestBranchConnector elasticColor={elasticColor} />

            {/* Trash — decommissioned legacy data */}
            <div className={`w-36 flex-shrink-0 self-stretch rounded-xl border-2 border-dashed p-3 flex flex-col items-center justify-center gap-1 transition-all duration-700 ${
              isDark ? 'border-red-500/40 bg-red-500/10' : 'border-red-400/40 bg-red-400/5'
            }`}>
              <FontAwesomeIcon icon={faTrash} className="text-base text-red-400" />
              <div className="text-xs font-bold text-red-400 text-center">Decommissioned</div>
              <div className={`text-xs text-center ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>Technical Debt</div>
            </div>
          </>}

        </div>
        {/* Progress bar during cutover */}
        {isCutting && (
          <div className="mt-4 flex-shrink-0">
            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`}>
              <div
                className={`h-full rounded-full transition-all duration-1000 ${isDark ? 'bg-gradient-to-r from-elastic-pink to-elastic-teal' : 'bg-gradient-to-r from-elastic-dev-blue to-elastic-blue'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Success strip */}
        {isComplete && (
          <div className={`mt-4 flex-shrink-0 py-2.5 px-4 rounded-xl border flex items-center justify-center gap-8 ${isDark ? 'bg-elastic-teal/15 border-elastic-teal/30' : 'bg-elastic-blue/10 border-elastic-blue/20'}`}>
            {['Zero Downtime', 'Zero Data Loss', '100% Success'].map((label, i) => (
              <div key={label} className="flex items-center gap-6">
                {i > 0 && <div className={`w-px h-5 ${isDark ? 'bg-white/20' : 'bg-elastic-dev-blue/20'}`} />}
                <div className={`font-bold text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                  <FontAwesomeIcon icon={faCheckCircle} className="mr-1.5" />
                  {label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Feature badges */}
      <div className="flex items-center gap-3 flex-shrink-0 mt-1">
        {[
          { icon: faShieldHalved, label: 'Parallel Validation', active: isDeployed },
          { icon: faClock,        label: 'Instant Rollback',    active: !isComplete },
          { icon: faCheckCircle,  label: 'No Interruptions',    active: true },
        ].map(btn => (
          <div
            key={btn.label}
            className={`flex-1 py-2.5 px-3 rounded-xl flex items-center gap-2.5 transition-all ${
              btn.active ? isDark ? 'bg-white/[0.04]' : 'bg-elastic-dev-blue/5' : 'opacity-30'
            }`}
          >
            <FontAwesomeIcon icon={btn.icon} className={btn.active ? isDark ? 'text-elastic-teal' : 'text-elastic-blue' : 'text-gray-500'} />
            <span className={`text-xs font-medium ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{btn.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function ServicesScene({ externalStage = 0, onStageChange, demoPhase = 'idle', metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const stage    = externalStage
  const setStage = (val) => onStageChange?.(val)

  // ── Header customisation ──────────────────────────────────────────────────
  const eyebrow       = metadata.eyebrow       || 'Your Path to Success'
  const headingPlain  = metadata.headingPlain  || 'Transform Faster '
  const headingAccent = metadata.headingAccent || 'with Expert Guidance.'
  const subtitle      = metadata.subtitle      || 'Skip the guesswork. Elastic Professional Services accelerates your deployment, migration, and adoption — so your team focuses on outcomes, not overhead.'

  // ── Data Sources (Zero Downtime demo) ────────────────────────────────────
  const resolvedDataSources = (metadata.dataSources || dataSources).map((src, i) => ({
    ...dataSources[i],
    ...src,
  }))

  // ── Hidden Costs (DIY Reality stage) ─────────────────────────────────────
  const defaultHiddenCosts = [
    { label: 'Opportunity cost of delayed insights',      severity: 'HIGH'   },
    { label: 'Engineer time diverted from impactful work', severity: 'HIGH'  },
    { label: 'Production incidents during migration',     severity: 'MEDIUM' },
    { label: 'Vendor support for edge cases',            severity: 'MEDIUM' },
    { label: 'Re-work from initial mistakes',            severity: 'HIGH'   },
  ]
  const resolvedHiddenCosts = metadata.hiddenCosts
    ? metadata.hiddenCosts.map((c, i) => ({ ...defaultHiddenCosts[i], ...c }))
    : defaultHiddenCosts
  const [activePhase, setActivePhase] = useState(0)
  const contentRef = useRef(null)

  // Auto-advance journey phases on stage 1
  useEffect(() => {
    if (stage !== 1) return
    const timer = setInterval(() => setActivePhase(p => (p + 1) % journeyPhases.length), 2000)
    return () => clearInterval(timer)
  }, [stage])

  // Staggered card entrance on stage change (anime.js)
  useEffect(() => {
    if (!contentRef.current) return
    const cards = contentRef.current.querySelectorAll('.stagger-card')
    if (!cards.length) return
    // Snap to hidden first
    animate(cards, { opacity: 0, translateY: 18, duration: 0 })
    // Animate in
    animate(cards, {
      opacity: [0, 1],
      translateY: [18, 0],
      delay: stagger(55),
      duration: 480,
      ease: 'outExpo',
    })
  }, [stage])

  return (
    <div className="scene !py-4 w-full h-full">
      <div className="max-w-[95%] mx-auto w-full h-full flex flex-col">

        {/* Header */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={headingPlain}
          titleAccent={headingAccent}
          subtitle={subtitle}
        />

        {/* Content + right navigator */}
        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
        <div ref={contentRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Stage 3: The Challenge */}
          {stage === 3 && (
            <div className="flex-1 flex gap-5 min-h-0">

              {/* DIY panel */}
              <div className="stagger-card flex-1 rounded-2xl border-2 border-pink-500/30 overflow-hidden bg-pink-500/5">
                <div className="p-4 border-b border-pink-500/20 bg-pink-500/10 flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>DIY Migration</h3>
                    <p className="text-sm text-pink-400">Going it alone</p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black" style={{ color: '#F04E98' }}><AnimatedCounter value={18} suffix="+" /></div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>months average</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {diyPainPoints.map((pt, i) => (
                    <div key={i} className={`stagger-card p-3 rounded-xl flex items-start gap-3 ${isDark ? 'bg-white/[0.03]' : 'bg-white/60'}`}>
                      <div className="w-9 h-9 rounded-lg bg-pink-500/20 flex items-center justify-center flex-shrink-0">
                        <FontAwesomeIcon icon={pt.icon} style={{ color: '#F04E98' }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{pt.title}</span>
                          <span className="text-xs text-pink-400">{pt.subtitle}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{pt.desc}</p>
                      </div>
                      <FontAwesomeIcon icon={faXmark} className="text-pink-500/50 mt-0.5" />
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Risk Level</span>
                    <span className="text-xs font-bold text-pink-400">HIGH</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-pink-500/10'}`}>
                    <div className="h-full w-[88%] bg-gradient-to-r from-pink-300 via-pink-500 to-pink-600 rounded-full" />
                  </div>
                </div>
              </div>

              {/* VS */}
              <div className="flex-shrink-0 flex flex-col items-center justify-center">
                <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center font-black text-lg ${isDark ? 'border-white/20 text-white/30' : 'border-elastic-dev-blue/20 text-elastic-dev-blue/30'}`}>
                  VS
                </div>
              </div>

              {/* Elastic panel */}
              <div className={`stagger-card flex-1 rounded-2xl border-2 overflow-hidden ${isDark ? 'border-elastic-teal/30 bg-elastic-teal/5' : 'border-elastic-blue/30 bg-elastic-blue/5'}`}>
                <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-elastic-teal/20 bg-elastic-teal/10' : 'border-elastic-blue/20 bg-elastic-blue/10'}`}>
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>With Elastic Services</h3>
                    <p className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>Expert-led transformation</p>
                  </div>
                  <div className="text-right">
                    <div className={`text-4xl font-black ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>4–7</div>
                    <div className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>months</div>
                  </div>
                </div>
                <div className="p-4 space-y-3">
                  {elasticBenefits.map((b, i) => (
                    <div key={i} className={`stagger-card p-3 rounded-xl flex items-start gap-3 ${isDark ? 'bg-white/[0.03]' : 'bg-white/60'}`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-elastic-teal/20' : 'bg-elastic-blue/20'}`}>
                        <FontAwesomeIcon icon={b.icon} className={isDark ? 'text-elastic-teal' : 'text-elastic-blue'} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{b.title}</span>
                          <span className={`text-xs ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{b.subtitle}</span>
                        </div>
                        <p className={`text-xs mt-0.5 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{b.desc}</p>
                      </div>
                      <FontAwesomeIcon icon={faCheck} className={`mt-0.5 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Risk Level</span>
                    <span className={`text-xs font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>LOW</span>
                  </div>
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`}>
                    <div className={`h-full w-[8%] rounded-full ${isDark ? 'bg-gradient-to-r from-elastic-teal to-elastic-blue' : 'bg-gradient-to-r from-elastic-dev-blue to-elastic-blue'}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 0: The Reality of DIY Migration */}
          {stage === 0 && (() => {
            const timelinePhases = [
              { label: 'Planning & Research',    pct: 86 },
              { label: 'Infrastructure Setup',   pct: 70 },
              { label: 'Data Migration',         pct: 76 },
              { label: 'Troubleshooting',        pct: 36, warn: true },
              { label: 'Testing & Validation',   pct: 65 },
              { label: 'More Troubleshooting',   pct: 80, warn: true },
              { label: 'Production Cutover',     pct: 62 },
            ]
            const hiddenCosts = resolvedHiddenCosts
            const severityStyle = (s) => s === 'HIGH'
              ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30'
              : 'bg-pink-400/15 text-pink-300 border border-pink-400/20'

            return (
              <div className="flex-1 flex flex-col rounded-2xl border-2 border-pink-500/20 overflow-hidden" style={{ background: isDark ? 'rgba(10,15,30,0.8)' : 'rgba(255,255,255,0.7)' }}>
                {/* Header row */}
                <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-pink-500/15">
                  <div>
                    <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>The Reality of DIY Migration</h3>
                    <p className="text-sm text-pink-400 mt-0.5">Common challenges organizations face going alone</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-6">
                    <div className="text-5xl font-black leading-none" style={{ color: '#F04E98' }}>18+</div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>months average</div>
                  </div>
                </div>

                {/* Two-column body */}
                <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">

                  {/* Left: Timeline Gantt */}
                  <div className={`flex-[3_3_60%] p-5 border-r ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                    <h4 className={`text-sm font-bold mb-4 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>Typical DIY Timeline</h4>
                    <div className="space-y-3">
                      {timelinePhases.map((phase, i) => (
                        <div key={i} className="stagger-card flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${phase.warn ? 'bg-pink-500/20 text-pink-400' : isDark ? 'bg-white/10 text-white/40' : 'bg-elastic-dev-blue/10 text-elastic-dev-blue/40'}`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 h-5 rounded overflow-hidden relative" style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,100,221,0.06)' }}>
                            <div
                              className="h-full rounded"
                              style={{
                                width: `${phase.pct}%`,
                                background: phase.warn
                                  ? '#F04E98'
                                  : isDark ? 'rgba(255,255,255,0.18)' : 'rgba(240,78,152,0.25)',
                              }}
                            />
                          </div>
                          <span className={`text-xs w-36 text-right flex-shrink-0 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{phase.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className={`text-xs mt-4 italic ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>* Actual timelines vary. Usually longer.</p>
                  </div>

                  {/* Right: Hidden Costs */}
                  <div className="flex-[2_2_40%] p-5">
                    <h4 className={`text-sm font-bold mb-4 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>Hidden Costs</h4>
                    <div className="space-y-3">
                      {hiddenCosts.map((cost, i) => (
                        <div key={i} className="stagger-card flex items-center justify-between gap-4">
                          <span className={`text-sm ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{cost.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${severityStyle(cost.severity)}`}>
                            {cost.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )
          })()}

          {/* Stage 1: The Solution */}
          {stage === 1 && (
            <div className="flex-1 flex flex-col justify-center gap-2 min-h-0">

              {/* Hero stats */}
              <div className="grid grid-cols-4 gap-2 flex-shrink-0">
                {[
                  { value: '90', suffix: '%',        label: 'Data sources migrated in 6 weeks', darkColor: '#48EFCF' },
                  { value: '0',  suffix: '',          label: 'Downtime during transition',       darkColor: '#F04E98' },
                  { value: '4',  suffix: '–7 months', label: 'Typical migration timeline',       darkColor: '#0B64DD', noAnimate: true },
                  { value: '24', suffix: '/7',        label: 'Global support coverage',          darkColor: '#FEC514' },
                ].map((stat, i) => (
                  <div key={i} className={`stagger-card p-4 rounded-2xl text-center border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
                    <div className="text-3xl font-black" style={{ color: isDark ? '#48EFCF' : '#0B64DD' }}>
                      {stat.noAnimate ? `${stat.value}${stat.suffix}` : <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
                    </div>
                    <div className={`text-xs mt-1 ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>{stat.label}</div>
                  </div>
                ))}
              </div>

              {/* Service pillars */}
              <div className="grid grid-cols-3 gap-2 flex-shrink-0">
                {servicePillars.map(pillar => (
                  <div
                    key={pillar.id}
                    className={`stagger-card p-3 rounded-2xl border-2 ${isDark ? 'bg-white/[0.02]' : 'bg-white/60'}`}
                    style={{ borderColor: isDark ? 'rgba(72,239,207,0.25)' : 'rgba(11,100,221,0.2)' }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.15)' : 'rgba(11,100,221,0.1)' }}>
                        <FontAwesomeIcon icon={pillar.icon} className="text-sm" style={{ color: isDark ? '#48EFCF' : '#0B64DD' }} />
                      </div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>{pillar.name}</h4>
                    </div>
                    <div className="space-y-1">
                      {pillar.items.map(item => (
                        <div key={item} className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCheck} className="text-xs" style={{ color: isDark ? '#48EFCF' : '#0B64DD' }} />
                          <span className={`text-xs ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Journey timeline */}
              <div className={`stagger-card self-start w-full rounded-2xl border p-4 ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
                <div className="mb-3">
                  <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>Your Transformation Journey</h4>
                  <p className={`text-xs ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>Proven methodology from discovery to ongoing partnership</p>
                </div>
                <div className="relative">
                  <div className={`absolute top-5 left-0 right-0 h-1 rounded-full ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
                  <div
                    className={`absolute top-5 left-0 h-1 rounded-full transition-all duration-500 ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`}
                    style={{ width: `${((activePhase + 1) / journeyPhases.length) * 100}%` }}
                  />
                  <div className="relative flex justify-between">
                    {journeyPhases.map((phase, i) => {
                      const isActive = i === activePhase
                      const isPast   = i < activePhase
                      return (
                        <button key={i} onClick={() => setActivePhase(i)} className="flex flex-col items-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                              isActive || isPast ? 'border-transparent' : isDark ? 'border-white/20 bg-elastic-dev-blue' : 'border-elastic-dev-blue/20 bg-white'
                            }`}
                            style={{
                              backgroundColor: isActive || isPast ? (isDark ? '#48EFCF' : '#0B64DD') : undefined,
                              boxShadow: isActive ? `0 0 16px ${isDark ? '#48EFCF' : '#0B64DD'}60` : undefined,
                            }}
                          >
                            <FontAwesomeIcon
                              icon={isPast && !isActive ? faCheck : phase.icon}
                              className={`text-sm ${isActive || isPast ? 'text-white' : isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}
                            />
                          </div>
                          <div className={`mt-2 text-center transition-opacity ${isActive || isPast ? 'opacity-100' : 'opacity-50'}`}>
                            <div className="text-sm font-bold" style={{ color: isActive || isPast ? (isDark ? '#48EFCF' : '#0B64DD') : undefined }}>
                              {phase.name}
                            </div>
                            <div className={`text-xs max-w-[96px] ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                              {phase.desc}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 2: Zero Downtime Demo */}
          {stage === 2 && (
            <div className="flex-1 flex items-center justify-center min-h-0 py-2">
              <div className="w-full max-w-5xl">
                <ZeroDowntimeDemo isDark={isDark} externalPhase={demoPhase} dataSources={resolvedDataSources} />
              </div>
            </div>
          )}

        </div>{/* /content */}

        {/* ── Right-side stage navigator ─────────────────────────── */}
        {(() => {
          const navStages = [
            { id: 'reality',   label: 'DIY Reality',   icon: faExclamationTriangle },
            { id: 'solution',  label: 'The Solution',  icon: faRocket },
            { id: 'migration', label: 'Zero Downtime', icon: faExchangeAlt },
            { id: 'challenge', label: 'The Challenge', icon: faPersonDigging },
          ]
          return (
            <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center relative select-none">
              {/* Track line */}
              <div className={`absolute w-px top-[20%] bottom-[20%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
              {/* Progress fill */}
              <div
                className={`absolute w-px top-[20%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
                style={{ height: `${(stage / (navStages.length - 1)) * 60}%` }}
              />
              {navStages.map((s, i) => {
                const isActive = i === stage
                const isDone   = i < stage
                return (
                  <button
                    key={s.id}
                    onClick={() => setStage(i)}
                    className="relative z-10 group flex flex-col items-center py-7"
                    title={s.label}
                  >
                    {/* Hover label (appears to the left) */}
                    <span className={`absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap text-xs px-2.5 py-1.5 rounded-lg pointer-events-none transition-all duration-200 opacity-0 group-hover:opacity-100 border ${
                      isDark
                        ? 'bg-elastic-dev-blue/95 text-white/80 border-white/10'
                        : 'bg-white/95 text-elastic-dark-ink/80 border-elastic-dev-blue/10'
                    } shadow-lg`}>
                      {s.label}
                    </span>
                    {/* Circle */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                      isActive
                        ? isDark
                          ? 'bg-elastic-dev-blue border-elastic-teal text-elastic-teal scale-110 shadow-[0_0_14px_rgba(72,239,207,0.3)]'
                          : 'bg-elastic-light-grey border-elastic-blue text-elastic-blue scale-110 shadow-[0_0_14px_rgba(11,100,221,0.2)]'
                        : isDone
                          ? isDark
                            ? 'bg-elastic-dev-blue border-elastic-teal/40 text-elastic-teal/70'
                            : 'bg-elastic-light-grey border-elastic-blue/30 text-elastic-blue/60'
                          : isDark
                            ? 'bg-elastic-dev-blue border-white/15 text-white/25 hover:border-white/30 hover:text-white/50'
                            : 'bg-elastic-light-grey border-black/10 text-black/25 hover:border-elastic-blue/30 hover:text-elastic-blue/50'
                    }`}>
                      {isDone
                        ? <FontAwesomeIcon icon={faCheck} className="text-[10px]" />
                        : <FontAwesomeIcon icon={s.icon} className="text-xs" />
                      }
                    </div>
                  </button>
                )
              })}
            </div>
          )
        })()}

        </div>{/* /content + navigator row */}
      </div>
    </div>
  )
}

export default ServicesScene
