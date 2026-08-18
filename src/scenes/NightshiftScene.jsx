import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTowerBroadcast, faMagnifyingGlass, faWrench, faClipboardCheck,
  faCircleCheck, faTriangleExclamation, faBullseye, faCode, faShieldHalved, faServer,
} from '@fortawesome/free-solid-svg-icons'

// Source: nightshift-capabilities.html + nightshift-hero.html + nightshift-reveal.html + arcs-option-b.html
const CAPABILITIES = [
  { name: 'Detect', icon: faTowerBroadcast, badge: 'Always On', desc: 'Correlates alerts, surfaces anomalies, and ranks incidents by blast radius — before a human wakes up.', bullets: ['ML anomaly detection', 'Alert correlation & dedup', 'Blast radius scoring'] },
  { name: 'Investigate', icon: faMagnifyingGlass, badge: 'Core Engine', desc: 'Runs parallel hypotheses, pulls context from every signal, and ranks findings by evidence strength.', bullets: ['Parallel hypothesis engine', 'Evidence-ranked findings', 'Full signal context'] },
  { name: 'Remediate', icon: faWrench, badge: 'Configurable', desc: 'Proposes and executes fixes at the trust level you define — from suggest-only to fully autonomous.', bullets: ['Configurable trust levels', 'Auto-fix execution', 'Rollback safety'] },
  { name: 'Audit', icon: faClipboardCheck, badge: 'Explainable', desc: 'Every step cited, logged, and explainable. Full compliance trail from trigger to resolution.', bullets: ['Full audit trail', 'Explainable decisions', 'Compliance-ready'] },
]

const CALLOUTS = [
  { value: '24/7', label: 'continuous coverage' },
  { value: '0', label: 'on-call pages' },
  { value: '∞', label: 'parallel hypotheses' },
]
const TRUST_MODES = [
  { name: 'Suggest', sub: 'read-only mode' },
  { name: 'Confirm', sub: 'human-in-the-loop' },
  { name: 'Auto', sub: 'fully autonomous' },
]

const ARCS = [
  { eyebrow: 'Developer Arc', name: 'Developer', num: '01', icon: faCode, desc: 'Code quality and delivery — from error to merged fix.', rows: [['Sentry', 'Error → Fix → PR'], ['Perf', 'Regression → Commit'], ['Deploy', 'Rollout → Safe / Stop']] },
  { eyebrow: 'Reliability Arc', name: 'Reliability', num: '02', icon: faShieldHalved, desc: 'Incident operations — from alert to resolution.', rows: [['RCA', 'Incident → Root cause'], ['Triage', 'Page → Brief'], ['SLO', 'Burn → Mitigation']] },
  { eyebrow: 'Infrastructure Arc', name: 'Infrastructure', num: '03', icon: faServer, desc: 'Resource efficiency — cost, scale, and drift under control.', rows: [['Cost', 'Waste → Savings'], ['Capacity', 'Trend → Pre-scale'], ['Drift', 'Diverge → PR']] },
]

const DEFAULT_BRIEFING = {
  time: '03:47 AM',
  whatHappened: 'Memory exhaustion in payment-service causing cascading failures across 3 dependent services.',
  rootCause: 'Redis connection pool exhaustion on node-03 (us-east-1). Pool limit of 100 reached under increased checkout load.',
  fix: 'Connection pool limit increased to 250 via Ansible playbook. Configuration pushed to all affected nodes.',
  stats: [
    { value: '4m 23s', label: 'Duration' },
    { value: '2', label: 'Actions taken' },
    { value: '0', label: 'Human pages' },
    { value: 'Healthy', label: 'All services', ok: true },
  ],
}

const BEATS = [
  { key: 'meet', step: 'Meet Nightshift', titlePlain: 'Meet your ', titleAccent: 'AI SRE.', subtitle: 'Autonomous detection, investigation, and remediation — around the clock, without a page.', hold: 4200 },
  { key: 'arcs', step: 'Three Arcs', titlePlain: 'One SRE across ', titleAccent: 'three arcs.', subtitle: 'Developer, Reliability, and Infrastructure — Nightshift closes the loop from signal to fix in each.', hold: 4200 },
  { key: 'reveal', step: 'The Payoff', titlePlain: 'Wake up to ', titleAccent: 'this.', subtitle: 'You’re not buying observability. You’re buying the end of on-call.' },
]

function NightshiftScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Observability · Nightshift'
  const capabilities = metadata.capabilities || CAPABILITIES
  const callouts = metadata.callouts || CALLOUTS
  const trustModes = metadata.trustModes || TRUST_MODES
  const arcs = metadata.arcs || ARCS
  const briefing = { ...DEFAULT_BRIEFING, ...(metadata.briefing || {}) }
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const amber = '#FEC514'
  const green = isDark ? '#34D399' : '#0F9D6B'
  const highlight = '#FF957D'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(75), easing: 'easeOutQuad',
    })
    const l = el.querySelectorAll('.slide-l')
    const r = el.querySelectorAll('.slide-r')
    const la = l.length ? animate(l, { opacity: [0, 1], translateX: [-24, 0], duration: 600, delay: 350, easing: 'easeOutCubic' }) : null
    const ra = r.length ? animate(r, { opacity: [0, 1], translateX: [24, 0], duration: 600, delay: 550, easing: 'easeOutCubic' }) : null
    return () => { anim?.pause?.(); la?.pause?.(); ra?.pause?.() }
  }, [beat, playKey])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1360px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          {beat !== 2 && (
            <div className="reveal">
              <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
            </div>
          )}

          {/* Beat 1 — Meet Nightshift */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {capabilities.map((c, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col p-4 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: accent }}>
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-2.5" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={c.icon} />
                    </span>
                    <h3 className={`font-bold text-lg leading-tight ${headText}`}>{c.name}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>{c.badge}</span>
                    <p className={`text-[12px] leading-snug mb-2.5 ${mutedText}`}>{c.desc}</p>
                    <ul className="mt-auto flex flex-col gap-1">
                      {c.bullets.map((b, j) => (
                        <li key={j} className={`flex items-start gap-1.5 text-[11px] leading-snug ${mutedText}`}>
                          <span className="mt-1 w-1 h-1 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 shrink-0">
                <div className="slide-l rounded-2xl border p-4" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0d` }}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>Autonomous coverage</div>
                  <div className={`font-bold text-base leading-tight mb-2 ${headText}`}>Around the clock — no page needed</div>
                  <div className="flex gap-6">
                    {callouts.map((c, i) => (
                      <div key={i}>
                        <div className="font-headline font-extrabold text-2xl leading-none" style={{ color: accent }}>{c.value}</div>
                        <div className={`text-[10px] leading-tight mt-1 ${mutedText}`}>{c.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`slide-r rounded-2xl border p-4 ${cardBase}`}>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>Configurable trust</div>
                  <div className={`font-bold text-base leading-tight mb-2 ${headText}`}>You choose the autonomy level</div>
                  <div className="flex gap-2">
                    {trustModes.map((m, i) => (
                      <div key={i} className="flex-1 rounded-lg px-2.5 py-1.5 text-center" style={{ backgroundColor: `${accent}14` }}>
                        <div className="text-sm font-bold" style={{ color: accent }}>{m.name}</div>
                        <div className={`text-[9px] leading-tight ${mutedText}`}>{m.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 2 — The Three Arcs */}
          {beat === 1 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-4 content-center items-stretch">
              {arcs.map((a) => (
                <div key={a.num} className={`reveal relative overflow-hidden rounded-2xl border flex flex-col p-5 ${cardBase}`}>
                  <span className="absolute right-4 top-2 font-headline font-extrabold leading-none select-none" style={{ fontSize: '4.5rem', color: `${accent}14` }}>{a.num}</span>
                  <div className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>{a.eyebrow}</div>
                  <div className="flex items-center gap-2 mb-1">
                    <FontAwesomeIcon icon={a.icon} style={{ color: accent }} />
                    <h3 className={`font-headline font-extrabold text-3xl leading-none ${headText}`}>{a.name}</h3>
                  </div>
                  <p className={`text-sm leading-snug mb-4 ${mutedText}`}>{a.desc}</p>
                  <div className="mt-auto flex flex-col gap-3">
                    {a.rows.map(([label, flow], j) => (
                      <div key={j} className="pl-3 border-l-2" style={{ borderColor: `${accent}66` }}>
                        <div className={`text-lg font-bold leading-tight ${headText}`}>{label}</div>
                        <div className={`text-sm leading-tight ${mutedText}`}>{flow}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Beat 3 — The Payoff */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left — hero */}
              <div className="reveal flex flex-col gap-6">
                <div className="text-[13px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>{eyebrow}</div>
                <h2 className={`font-headline font-extrabold leading-[0.92] text-7xl md:text-8xl ${headText}`}>
                  Wake up<br />to <span style={{ color: accent }}>this.</span>
                </h2>
                <div className="flex flex-col gap-2.5">
                  <p className={`text-xl leading-snug ${mutedText}`}>You’re not buying <span className="italic">observability</span>.</p>
                  <p className={`text-xl leading-snug font-semibold ${headText}`}>
                    You’re buying the{' '}
                    <span className="inline-block rounded-md px-2.5 py-0.5 font-bold text-elastic-dark-ink" style={{ backgroundColor: highlight }}>end of on-call.</span>
                  </p>
                </div>
                <p className={`font-headline font-extrabold text-3xl md:text-4xl leading-tight ${headText}`}>Zero pages. Zero 3 AM calls.</p>
                <p className={`text-base ${mutedText}`}>One full explanation — ready when you are.</p>
              </div>

              {/* Right — resolved briefing */}
              <div className="reveal relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: `${accent}59`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex w-3 h-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: green }} />
                      <span className="relative inline-flex rounded-full w-3 h-3" style={{ backgroundColor: green }} />
                    </span>
                    <span className="font-bold text-base" style={{ color: green }}>Incident Resolved</span>
                  </div>
                  <span className={`font-mono text-sm ${mutedText}`}>{briefing.time}</span>
                </div>

                <div className="space-y-3 mb-4">
                  {[
                    { icon: faTriangleExclamation, color: amber, label: 'What happened', text: briefing.whatHappened },
                    { icon: faBullseye, color: accent, label: 'Root cause', text: briefing.rootCause },
                    { icon: faCircleCheck, color: green, label: 'Fix applied', text: briefing.fix },
                  ].map((row, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: `${row.color}1c`, color: row.color }}>
                        <FontAwesomeIcon icon={row.icon} />
                      </span>
                      <div className="min-w-0">
                        <div className={`text-[11px] font-bold uppercase tracking-wider mb-0.5 ${mutedText}`}>{row.label}</div>
                        <p className={`text-sm leading-snug ${headText}`}>{row.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-3 pt-4" style={{ borderTop: `1px solid ${accent}2e` }}>
                  {briefing.stats.map((s, i) => (
                    <div key={i}>
                      <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${mutedText}`}>{s.label}</div>
                      <div className="font-headline font-extrabold text-xl leading-none" style={{ color: s.ok ? green : accent }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default NightshiftScene
