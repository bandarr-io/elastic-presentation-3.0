import { animate, stagger } from 'animejs'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SceneHeader from '../components/SceneHeader'
import {
  faBolt, faClock, faBug, faTriangleExclamation,
  faDesktop, faGears, faLock, faDatabase,
  faUserPen, faBan, faCircleCheck,
  faEye, faBrain, faHandFist,
  faArrowRightLong, faArrowLeftLong, faRotateRight, faSkull, faPlug,
} from '@fortawesome/free-solid-svg-icons'

const COLORS = {
  teal: '#48EFCF',
  blue: '#0B64DD',
  pink: '#F04E98',
  poppy: '#FF957D',
  yellow: '#FEC514',
}

// ─── Beat 1: Threat economics (count-up) ─────────────────────────────
const THREAT_STATS = [
  { num: 90,  format: (n) => `80–${n}%`,    label: 'Lower cost to build custom malware with AI', note: 'What once took a skilled team now takes a prompt', icon: faBolt, color: COLORS.pink },
  { num: 17,  format: (n) => `Every ${n}m`, label: 'A new vulnerability published globally',       note: 'Oct 2025: 172 patches in one Patch Tuesday',     icon: faClock, color: COLORS.poppy, live: true },
  { num: 42,  format: (n) => `+${n}%`,      label: 'More zero-days exploited before disclosure',  note: 'AI agents auto-fuzz and discover vulnerabilities', icon: faBug, color: COLORS.yellow },
  { num: 100, format: (n) => `${n}+`,       label: 'CVEs per month in 2026',                      note: 'Manual patch cycles can no longer keep pace',     icon: faTriangleExclamation, color: COLORS.teal },
]

// ─── Beat 2: The SOC taxes (attack path) ─────────────────────────────
const TAXES = [
  { name: 'Endpoint Tax',     desc: 'Pay twice — protection, then telemetry.', icon: faDesktop,  breach: 'Uncovered endpoints' },
  { name: 'Automation Tax',   desc: 'A separate SOAR just to use your SIEM.',   icon: faGears,    breach: 'SOAR handoffs' },
  { name: 'AI Black-Box Tax', desc: "A vendor LLM you can't verify.",            icon: faLock,     breach: 'Black-box AI' },
  { name: 'Data Tax',         desc: 'Rehydration fees for your own data.',       icon: faDatabase, breach: 'Rehydration wall' },
]

// ─── Beat 3: SOC maturity (bolt-on vs native) ────────────────────────
const MATURITY = [
  { name: 'Legacy SOC',     mode: 'Human-in-the-loop', verdict: 'past',
    desc: 'Bolted-on tools, broken handoffs, analyst as the bottleneck.',
    parts: ['SIEM', 'SOAR', 'XDR', 'Intel'] },
  { name: 'Agentic SOC',    mode: 'Human-on-the-loop', verdict: 'elastic',
    desc: 'One platform builds the response at machine speed; the analyst approves.',
    parts: ['SIEM', 'XDR', 'AI', 'Automation'] },
  { name: 'Autonomous SOC', mode: 'Unsupervised',      verdict: 'risk',
    desc: 'No human oversight. Risky and unaccountable — not for security teams.',
    parts: ['Unified', 'No approval'] },
]

// ─── Beat 4: Senses / Brain / Hands ──────────────────────────────────
const CAPABILITIES = [
  { name: 'Senses', tagline: 'Unified data & visibility', icon: faEye,       desc: 'One agent. A hybrid data mesh across cloud, edge, and on-prem — no egress, no rehydration.' },
  { name: 'Brain',  tagline: 'Reason at machine speed',   icon: faBrain,     desc: 'Model-agnostic, data-grounded reasoning. BM25 + vector in one query, your choice of LLM.' },
  { name: 'Hands',  tagline: 'Respond fast',              icon: faHandFist,  desc: 'Deterministic + agentic workflows as code. Full automation or human-on-the-loop.' },
]

const BEATS = [
  { key: 'why-now',  step: 'Why Now',      title: 'The world has changed.',          accentTitle: '',                        subtitle: 'Nation-state capabilities are now commodity. AI has collapsed the cost of attack. Breakout times are measured in seconds, not hours.' },
  { key: 'taxes',    step: 'The Taxes',    title: 'The industry taxes your SOC. ',   accentTitle: "It doesn't secure it.",   subtitle: 'The adversary follows the money — slipping through every gap the status quo leaves open.' },
  { key: 'agentic',  step: 'Agentic SOC',  title: "You can't bolt on an ",           accentTitle: 'agentic SOC.',            subtitle: 'Machine speed with human judgment requires a platform where data, AI, and automation are native — not stitched together.' },
  { key: 'built',    step: 'Built as One', title: 'Built as one. ',                  accentTitle: 'Not stitched together.',  subtitle: 'Three capabilities a platform must have natively to operate at machine speed.' },
]

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════

function SecurityNarrativeVisualScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const headerRef = useRef(null)
  const [beat, setBeat] = useState(0)
  // Bumped on every stepper click (incl. the active one) so animations replay.
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Elastic Security · Why Now'
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))

  const accent = (c) => (isDark ? c : COLORS.blue)
  const danger = COLORS.pink
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [14, 0], duration: 440, delay: stagger(80), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat])

  const goTo = (i) => { setBeat(i); setPlayKey((k) => k + 1) }
  const replay = () => setPlayKey((k) => k + 1)
  const current = beats[beat]
  const shared = { isDark, accent, danger, headText, mutedText, cardBase }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-4 pb-2 overflow-hidden">
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">

        {/* Header */}
        <div ref={headerRef}>
          <SceneHeader
            reveal
            eyebrow={eyebrow}
            titlePlain={current.title}
            titleAccent={current.accentTitle}
            subtitle={current.subtitle}
          />
        </div>

        {/* Beat body — remounts on beat/replay so animations re-run */}
        <div key={`${beat}-${playKey}`} className="flex-1 min-h-0 flex flex-col justify-center overflow-hidden">
          {beat === 0 && <ThreatBeat {...shared} />}
          {beat === 1 && <TaxKillChainBeat {...shared} />}
          {beat === 2 && <ArchitectureBeat {...shared} />}
          {beat === 3 && <CapabilityLoopBeat {...shared} />}
        </div>

        {/* Stepper + replay */}
        <div className="flex-shrink-0 flex items-center justify-center gap-2 pt-4 relative">
          {beats.map((b, i) => {
            const isActive = i === beat
            return (
              <button
                key={b.key}
                onClick={() => goTo(i)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  isActive
                    ? isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/15 text-elastic-blue'
                    : isDark ? 'text-white/55 hover:text-white/80' : 'text-elastic-dev-blue/55 hover:text-elastic-dev-blue/80'
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  isActive
                    ? isDark ? 'border-elastic-teal' : 'border-elastic-blue'
                    : isDark ? 'border-white/20' : 'border-elastic-dev-blue/20'
                }`}>{i + 1}</span>
                {b.step}
              </button>
            )
          })}
          <button
            onClick={replay}
            title="Replay animation"
            className={`absolute right-0 w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110 ${
              isDark ? 'bg-white/[0.06] text-white/50 hover:text-white/80' : 'bg-elastic-blue/10 text-elastic-blue/60 hover:text-elastic-blue'
            }`}
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-xs" />
          </button>
        </div>

      </div>
    </div>
  )
}

// ─── Count-up stat ───────────────────────────────────────────────────
function CountUpStat({ stat, isDark, accent, headText, mutedText, cardBase }) {
  const [n, setN] = useState(0)
  // Single accent across the threat stats; the icons/labels carry the distinction.
  const color = accent(COLORS.teal)
  useEffect(() => {
    let raf
    const dur = 1100
    const start = performance.now()
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setN(Math.round(eased * stat.num))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [stat.num])

  return (
    <div className={`rounded-2xl border p-7 flex flex-col ${cardBase}`} style={{ borderTopColor: color, borderTopWidth: '5px' }}>
      <div className="flex items-center justify-between mb-4">
        <span className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: `${color}22`, color }}>
          <FontAwesomeIcon icon={stat.icon} />
        </span>
        {stat.live && (
          <span className="flex items-center gap-1.5 text-sm font-bold uppercase tracking-wider" style={{ color }}>
            <span className="inline-flex w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            Live
          </span>
        )}
      </div>
      <div className="font-headline text-5xl font-extrabold mb-2 tabular-nums" style={{ color }}>{stat.format(n)}</div>
      <div className={`text-lg font-semibold mb-2 ${headText}`}>{stat.label}</div>
      <div className={`text-sm leading-snug mt-auto ${mutedText}`}>{stat.note}</div>
    </div>
  )
}

function ThreatBeat(props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {THREAT_STATS.map((s) => <CountUpStat key={s.label} stat={s} {...props} />)}
    </div>
  )
}

// ─── Beat 2: attack-path kill-chain ──────────────────────────────────
function TaxKillChainBeat({ isDark, accent, danger, headText, mutedText, cardBase }) {
  const { prefersReducedMotion } = useReducedMotion()
  const trackRef = useRef(null)
  const pulseRef = useRef(null)
  const [breached, setBreached] = useState(() => new Set())
  const [exfil, setExfil] = useState(false)

  useEffect(() => {
    // Reduced motion: skip the travelling pulse and land on the end state.
    if (prefersReducedMotion) {
      setBreached(new Set([0, 1, 2, 3]))
      setExfil(true)
      return
    }

    const track = trackRef.current
    const pulse = pulseRef.current
    if (!track || !pulse) return
    const { width } = track.getBoundingClientRect()
    if (!width) return

    const D = 2600
    const centers = [0.125, 0.375, 0.625, 0.875]
    animate(pulse, { translateX: [0, width], duration: D, easing: 'linear' })
    animate(pulse, { opacity: [0, 1], duration: 300, easing: 'easeOutQuad' })

    const timers = centers.map((p, i) =>
      setTimeout(() => setBreached((prev) => new Set([...prev, i])), D * p)
    )
    const exfilTimer = setTimeout(() => setExfil(true), D * 0.96)
    return () => { timers.forEach(clearTimeout); clearTimeout(exfilTimer) }
  }, [prefersReducedMotion])

  return (
    <div className="flex flex-col gap-5">
      {/* Card row with a track + pulse behind it */}
      <div ref={trackRef} className="relative">
        {/* Travelling pulse */}
        <div ref={pulseRef} className="absolute top-1/2 -translate-y-1/2" style={{ left: 0, opacity: 0 }}>
          <span className="relative flex items-center justify-center" style={{ width: 18, height: 18, marginLeft: -9 }}>
            <span className="relative w-3 h-3 rounded-full" style={{ backgroundColor: danger, boxShadow: `0 0 12px ${danger}` }} />
          </span>
        </div>

        <div className="relative grid grid-cols-4 gap-4">
          {TAXES.map((t, i) => {
            const hit = breached.has(i)
            return (
              <div
                key={t.name}
                className={`rounded-2xl border p-6 flex flex-col transition-all duration-300 ${cardBase}`}
                style={hit ? { borderColor: danger, boxShadow: isDark ? `0 0 22px ${danger}33` : `0 0 18px ${danger}22` } : undefined}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="w-14 h-14 rounded-xl flex items-center justify-center transition-colors duration-300"
                    style={{ backgroundColor: hit ? `${danger}22` : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,100,221,0.06)'), color: hit ? danger : accent(COLORS.blue) }}
                  >
                    <FontAwesomeIcon icon={t.icon} className="text-2xl" />
                  </span>
                  <span className="text-sm font-bold tabular-nums" style={{ color: hit ? danger : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(11,100,221,0.25)') }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className={`text-xl font-bold ${headText}`}>{t.name}</h3>
                <p className={`text-sm leading-snug mt-1.5 mb-3 ${mutedText}`}>{t.desc}</p>
                <span
                  className="text-sm font-semibold uppercase tracking-wider mt-auto transition-opacity duration-300"
                  style={{ color: danger, opacity: hit ? 1 : 0.25 }}
                >
                  {hit ? `Breach · ${t.breach}` : t.breach}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Adversary → exfiltration caption */}
      <div className="flex items-center justify-center gap-3 text-sm">
        <span className={`flex items-center gap-2 font-semibold ${headText}`}>
          <FontAwesomeIcon icon={faSkull} style={{ color: danger }} /> Adversary
        </span>
        <FontAwesomeIcon icon={faArrowRightLong} className={mutedText} />
        <span className={mutedText}>moves through every gap…</span>
        <FontAwesomeIcon icon={faArrowRightLong} className={mutedText} />
        <span
          className="flex items-center gap-2 font-bold px-3 py-1 rounded-full transition-all duration-500"
          style={{ color: exfil ? '#fff' : danger, backgroundColor: exfil ? danger : `${danger}1A` }}
        >
          Exfiltration
        </span>
      </div>
    </div>
  )
}

// ─── Beat 3: bolt-on vs native (assemble) ────────────────────────────
function ArchitectureBeat({ isDark, accent, danger, headText, mutedText, cardBase }) {
  const rootRef = useRef(null)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const cards = el.querySelectorAll('.arch-card')
    animate(cards, { opacity: [0, 1], translateY: [18, 0], duration: 460, delay: stagger(140), easing: 'easeOutCubic' })
    // The agentic parts "click together"
    const parts = el.querySelectorAll('.agentic-part')
    if (parts.length) {
      animate(parts, { opacity: [0, 1], scale: [0.4, 1], translateX: [12, 0], duration: 420, delay: stagger(110, { start: 500 }), easing: 'easeOutBack' })
    }
    return () => {}
  }, [])

  const okColor = accent(COLORS.teal)

  return (
    <div ref={rootRef} className="flex items-stretch gap-3">
      {MATURITY.map((m, i) => {
        const isElastic = m.verdict === 'elastic'
        const isRisk = m.verdict === 'risk'
        const color = isElastic ? okColor : danger
        return (
          <div key={m.name} className="flex items-stretch flex-1 gap-3">
            <div
              className={`arch-card flex-1 rounded-2xl p-7 flex flex-col ${cardBase} ${isElastic ? 'border-2' : 'border'}`}
              style={isElastic ? { borderColor: color, boxShadow: isDark ? `0 0 26px ${color}22` : undefined } : { opacity: 0.94 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-2xl font-bold ${headText}`}>{m.name}</h3>
                {isElastic
                  ? <span className="text-sm font-bold uppercase tracking-wider px-3 py-1.5 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>Elastic</span>
                  : <FontAwesomeIcon icon={isRisk ? faBan : faUserPen} className="text-lg" style={{ color: isRisk ? danger : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(11,100,221,0.35)') }} />}
              </div>
              <div className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: isElastic ? color : mutedColorVal(isDark) }}>{m.mode}</div>

              {/* Mini architecture diagram */}
              <div className="mb-4">
                {m.verdict === 'past' && (
                  <div className="flex flex-wrap gap-2">
                    {m.parts.map((p, j) => (
                      <span key={p} className={`flex items-center gap-1.5 text-sm font-medium px-2.5 py-1.5 rounded-md border border-dashed ${isDark ? 'border-white/20 text-white/55' : 'border-elastic-dev-blue/20 text-elastic-dev-blue/55'}`}>
                        {p}{j < m.parts.length - 1 && <FontAwesomeIcon icon={faPlug} className="text-[10px] opacity-50" />}
                      </span>
                    ))}
                    <span className="text-sm font-semibold px-2.5 py-1.5 rounded-md" style={{ color: danger, backgroundColor: `${danger}14` }}>⏱ delays</span>
                  </div>
                )}
                {m.verdict === 'elastic' && (
                  <div className="flex items-center gap-2 rounded-lg p-2" style={{ backgroundColor: `${color}12`, border: `1px solid ${color}40` }}>
                    {m.parts.map((p) => (
                      <span key={p} className="agentic-part flex-1 text-center text-sm font-semibold py-2 rounded-md" style={{ backgroundColor: `${color}22`, color }}>{p}</span>
                    ))}
                  </div>
                )}
                {m.verdict === 'risk' && (
                  <div className="relative flex items-center gap-2 rounded-lg p-2" style={{ backgroundColor: `${danger}10`, border: `1px solid ${danger}33` }}>
                    {m.parts.map((p) => (
                      <span key={p} className={`flex-1 text-center text-sm font-semibold py-2 rounded-md ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(11,100,221,0.05)' }}>{p}</span>
                    ))}
                  </div>
                )}
              </div>

              <p className={`text-base leading-snug ${mutedText}`}>{m.desc}</p>
            </div>
            {i < MATURITY.length - 1 && (
              <div className="flex items-center">
                <FontAwesomeIcon icon={i === MATURITY.length - 2 ? faArrowLeftLong : faArrowRightLong} className={`text-xl ${mutedText}`} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function mutedColorVal(isDark) { return isDark ? 'rgba(255,255,255,0.55)' : 'rgba(11,100,221,0.55)' }

// ─── Beat 4: Senses → Brain → Hands ──────────────────────────────────
function CapabilityLoopBeat({ isDark, accent, headText, mutedText, cardBase }) {
  const color = accent(COLORS.teal)

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        {/* Static line connecting the three circle centers */}
        <div className="absolute top-11 -translate-y-1/2 h-0.5" style={{ left: '16.67%', right: '16.67%', backgroundColor: `${color}40` }} />
        <div className="relative grid grid-cols-3 gap-6">
          {CAPABILITIES.map((c) => (
            <div key={c.name} className="flex flex-col items-center text-center px-2">
              <span className="w-[88px] h-[88px] rounded-full flex items-center justify-center mb-5 relative z-10" style={{ backgroundColor: isDark ? '#0B1F3A' : '#fff', border: `2px solid ${color}`, color }}>
                <FontAwesomeIcon icon={c.icon} className="text-3xl" />
              </span>
              <div className={`rounded-2xl border p-6 w-full ${cardBase}`}>
                <h3 className={`text-2xl font-bold ${headText}`}>{c.name}</h3>
                <div className="text-sm font-semibold uppercase tracking-wider mb-2.5" style={{ color }}>{c.tagline}</div>
                <p className={`text-base leading-snug ${mutedText}`}>{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-semibold uppercase tracking-wider px-4 py-2 rounded-full" style={{ backgroundColor: `${color}1A`, color }}>
          <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />
          A continuous loop — detect, reason, respond
        </span>
      </div>
    </div>
  )
}

export default SecurityNarrativeVisualScene
