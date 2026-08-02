import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { useSceneMotion } from '../hooks/useSceneMotion'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye, faBrain, faHandFist,
  faDiagramProject, faDatabase, faDesktop,
  faMagnifyingGlass, faPlug, faRobot,
  faCode, faGears, faShieldHalved, faCircleCheck,
} from '@fortawesome/free-solid-svg-icons'

// Slides 8–10 — Senses / Brain / Hands deep-dives. Each layer is a beat with
// three capability cards, and every card carries a competitive "vs." call-out.

const LAYERS = [
  {
    key: 'senses', step: 'Senses', name: 'Senses', icon: faEye,
    tagline: 'Unified data & visibility',
    summary: 'One agent. A hybrid data mesh across cloud, edge, and on-prem \u2014 no egress, no rehydration.',
    titlePlain: 'Senses \u2014 ', titleAccent: 'unified data & visibility.',
    subtitle: 'Search across cloud, edge, and on-prem without moving data. One agent, petabyte scale, no egress or rehydration penalties.',
    cards: [
      { title: 'Hybrid data mesh', icon: faDiagramProject,
        desc: 'Search across cloud, edge, and on-prem without moving anything. No egress, no rehydration.',
        vs: 'Legacy vendors charge rehydration penalties and egress fees.' },
      { title: 'SIEM', icon: faDatabase,
        desc: 'Any data in, fast \u2014 threat intel, cloud logs, events, and alerts on one platform. Petabyte scale, pennies per GB, years searched in seconds.',
        vs: 'Splunk forces slow searches across fragmented data buckets.' },
      { title: 'Endpoint', icon: faDesktop,
        desc: 'One agent pulls process, file, and network telemetry \u2014 no per-device fees. Already run another EDR? Pull its telemetry in too.',
        vs: 'CrowdStrike charges once for protection, then again for telemetry.' },
    ],
  },
  {
    key: 'brain', step: 'Brain', name: 'Brain', icon: faBrain,
    tagline: 'Reason at machine speed',
    summary: 'Model-agnostic, data-grounded reasoning. BM25 + vector in one query, your choice of LLM.',
    titlePlain: 'Brain \u2014 ', titleAccent: 'reason at machine speed.',
    subtitle: 'Model-agnostic, data-grounded reasoning. Hybrid search, an open inference gateway, and agents that run anywhere.',
    cards: [
      { title: 'Native hybrid search', icon: faMagnifyingGlass,
        desc: 'BM25 + vector in a single query \u2014 reasoning grounded in your data at petabyte scale. One platform for detection, semantic search, agents, and AI apps.',
        vs: 'Disconnected architectures need complex DIY re-ranking and can\u2019t operate at this scale.' },
      { title: 'Elastic Inference Service', icon: faPlug,
        desc: 'Jina AI\u2013powered, model-agnostic gateway. Use OpenAI, Anthropic, or local air-gapped models through one gateway.',
        vs: 'Charlotte AI locks you into CrowdStrike\u2019s proprietary model.' },
      { title: 'Agent Builder & skills', icon: faRobot,
        desc: 'Agents that run anywhere \u2014 Elastic, Claude Code, your IDE. Open by default: ECS, detection rules, OCSF, open APIs.',
        vs: 'Agents that only work inside one platform\u2019s walls.' },
    ],
  },
  {
    key: 'hands', step: 'Hands', name: 'Hands', icon: faHandFist,
    tagline: 'Respond fast',
    summary: 'Deterministic + agentic workflows as code. Full automation or human-on-the-loop.',
    titlePlain: 'Hands \u2014 ', titleAccent: 'respond fast.',
    subtitle: 'Deterministic + agentic workflows as code. #1-rated endpoint protection. Full automation or human-on-the-loop \u2014 your call.',
    cards: [
      { title: 'Workflows-as-Code', icon: faCode,
        desc: 'YAML-based and LLM-friendly. Describe what you need in natural language and the LLM writes the workflow \u2014 portable, reviewable before it runs.',
        vs: 'No-code workflows built and locked inside a proprietary platform.' },
      { title: 'Deterministic + Agentic', icon: faGears,
        desc: 'Scripted logic for known threats, AI judgment for novel ones \u2014 reasons over live context, threat intel, and history, and shows its work.',
        vs: 'Legacy SOAR: brittle playbooks that break when the attack pivots.' },
      { title: 'Prevention & Extended Response', icon: faShieldHalved,
        desc: '#1-rated endpoint protection stops threats at the endpoint; workflows extend the response across cloud, identity, and network.',
        vs: 'Competitors unbundle SOAR, EDR, and telemetry into separate SKUs.' },
    ],
  },
]

// Distinct, theme-aware accent per layer so the rail reads at a glance.
const LAYER_COLORS = {
  senses: { light: '#0B64DD', dark: '#48EFCF' },
  brain:  { light: '#0B64DD', dark: '#B794F6' },
  hands:  { light: '#0B64DD', dark: '#FF8FB3' },
}

// Final recap beat — the three layers as one continuous loop.
const SUMMARY_BEAT = {
  key: 'built', step: 'Together',
  titlePlain: 'Built as one. ', titleAccent: 'Not stitched together.',
  subtitle: 'Three capabilities a platform must have natively to operate at machine speed.',
}

const BEATS = [
  ...LAYERS.map((l) => ({
    key: l.key, step: l.step, titlePlain: l.titlePlain, titleAccent: l.titleAccent, subtitle: l.subtitle,
  })),
  SUMMARY_BEAT,
]

function LayerRail({ activeIndex, onGo, isDark, headText, mutedText, cardBase, colorFor }) {
  return (
    <div className="flex flex-col gap-3 w-[220px]">
      {LAYERS.map((l, i) => {
        const isActive = i === activeIndex
        const color = colorFor(l.key)
        return (
          <button
            key={l.key}
            onClick={() => onGo(i)}
            className={`reveal text-left rounded-2xl border p-4 flex items-center gap-3 transition-all ${cardBase} ${isActive ? 'border-2' : 'opacity-55 hover:opacity-90'}`}
            style={isActive ? { borderColor: color, boxShadow: isDark ? `0 0 22px ${color}22` : `0 0 16px ${color}1f` } : undefined}
          >
            <span
              className="w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 transition-colors"
              style={{ backgroundColor: `${color}22`, color }}
            >
              <FontAwesomeIcon icon={l.icon} />
            </span>
            <span className="min-w-0">
              <span className={`block font-bold leading-tight ${headText}`}>{l.name}</span>
              <span className={`block text-xs leading-tight ${mutedText}`}>{l.tagline}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function CapabilityCard({ card, color, danger, isDark, headText, mutedText, cardBase }) {
  return (
    <div className={`cap-card rounded-2xl border flex flex-col p-5 min-h-0 ${cardBase}`} style={{ borderTopColor: color, borderTopWidth: '4px' }}>
      <div className="flex items-center gap-3 mb-3">
        <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${color}1f`, color }}>
          <FontAwesomeIcon icon={card.icon} />
        </span>
        <h3 className={`text-xl font-bold leading-tight ${headText}`}>{card.title}</h3>
      </div>
      <p className={`text-base leading-snug ${mutedText}`}>{card.desc}</p>
      <div className={`mt-auto pt-3 flex items-start gap-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
        <span className="text-[11px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 mt-0.5" style={{ color: danger, backgroundColor: `${danger}1a` }}>vs</span>
        <span className={`text-sm leading-snug ${mutedText}`}>{card.vs}</span>
      </div>
    </div>
  )
}

function CapabilityOverview({ isDark, headText, mutedText, cardBase, colorFor, baseAccent }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col justify-center gap-6">
      <div className="relative">
        {/* line connecting the three circle centers */}
        <div className="absolute top-11 -translate-y-1/2 h-0.5" style={{ left: '16.67%', right: '16.67%', backgroundColor: `${baseAccent}40` }} />
        <div className="relative grid grid-cols-3 gap-6">
          {LAYERS.map((l) => {
            const color = colorFor(l.key)
            return (
              <div key={l.key} className="cap-card flex flex-col items-center text-center px-2">
                <span className="w-[88px] h-[88px] rounded-full flex items-center justify-center mb-5 relative z-10" style={{ backgroundColor: isDark ? '#0B1F3A' : '#fff', border: `2px solid ${color}`, color }}>
                  <FontAwesomeIcon icon={l.icon} className="text-3xl" />
                </span>
                <div className={`rounded-2xl border p-6 w-full ${cardBase}`}>
                  <h3 className={`text-2xl font-bold ${headText}`}>{l.name}</h3>
                  <div className="text-sm font-semibold uppercase tracking-wider mb-2.5" style={{ color }}>{l.tagline}</div>
                  <p className={`text-base leading-snug ${mutedText}`}>{l.summary}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-full" style={{ backgroundColor: `${baseAccent}1A`, color: baseAccent }}>
          <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />
          A continuous loop — detect, reason, respond
        </span>
      </div>
    </div>
  )
}

function SecurityCapabilitiesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const isSummary = beat >= LAYERS.length
  const layer = isSummary ? null : LAYERS[beat]
  const current = beats[beat]

  const danger = '#F04E98'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/65' : 'text-elastic-dev-blue/70'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const colorFor = (key) => (isDark ? LAYER_COLORS[key].dark : LAYER_COLORS[key].light)
  const baseAccent = isDark ? '#48EFCF' : '#0B64DD'
  const color = layer ? colorFor(layer.key) : baseAccent

  const eyebrow = metadata.eyebrow || (isSummary ? 'Elastic Security \u00b7 Built as One' : `Elastic Security \u00b7 The ${layer.name} Layer`)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal, .cap-card'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col">
          <SceneHeader reveal eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />

          {isSummary ? (
            <CapabilityOverview key={`${beat}-${playKey}`} isDark={isDark} headText={headText} mutedText={mutedText} cardBase={cardBase} colorFor={colorFor} baseAccent={baseAccent} />
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-[220px_1fr] gap-6 items-center">
              <LayerRail activeIndex={beat} onGo={goTo} isDark={isDark} headText={headText} mutedText={mutedText} cardBase={cardBase} colorFor={colorFor} />

              <div key={`${beat}-${playKey}`} className="grid grid-cols-3 gap-4 min-h-0">
                {layer.cards.map((card) => (
                  <CapabilityCard key={card.title} card={card} color={color} danger={danger} isDark={isDark} headText={headText} mutedText={mutedText} cardBase={cardBase} />
                ))}
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default SecurityCapabilitiesScene
