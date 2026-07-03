import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SceneStepper from '../components/SceneStepper'
import {
  faTowerBroadcast, faMagnifyingGlass, faWrench, faClipboardCheck,
  faMoon, faCircleCheck, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'

// Source: nightshift-intro.html + nightshift-hero.html + nightshift-reveal.html
const CAPABILITIES = [
  { name: 'Detect', icon: faTowerBroadcast, badge: 'Always On', desc: 'ML anomaly detection, alert correlation, and blast-radius scoring — watching every signal, all the time.' },
  { name: 'Investigate', icon: faMagnifyingGlass, badge: 'Core Engine', desc: 'Runs parallel hypotheses, ranks findings by evidence, and traverses your live system model to the root cause.' },
  { name: 'Remediate', icon: faWrench, badge: 'Configurable Trust', desc: 'Suggest, confirm, or auto-apply fixes — with rollback and a trust level you set per workflow.' },
  { name: 'Audit', icon: faClipboardCheck, badge: 'Explainable', desc: 'Every step cited and logged — a full, compliance-ready trail of what happened and why.' },
]

const CALLOUTS = [
  { value: '24/7', label: 'Continuous coverage' },
  { value: '0', label: 'On-call pages' },
  { value: '∞', label: 'Parallel hypotheses' },
]

const TRUST_MODES = ['Suggest', 'Confirm', 'Auto']

const DEFAULT_BRIEFING = {
  time: '03:47 AM',
  whatHappened: 'Memory exhaustion in payment-service caused cascading failures across 3 dependent services.',
  rootCause: 'Redis connection pool exhaustion on node-03 (us-east-1) — pool limit 100.',
  fix: 'Pool limit increased to 250 via Ansible playbook. All services healthy.',
  stats: [
    { value: '4m 23s', label: 'Time to resolution' },
    { value: '2', label: 'Actions taken' },
    { value: '0', label: 'Human pages' },
  ],
}

const BEATS = [
  { key: 'meet', step: 'Meet Nightshift', titlePlain: 'Meet your ', titleAccent: 'AI SRE.', subtitle: 'Autonomous detection, investigation, and remediation — around the clock, without a page.' },
  { key: 'reveal', step: 'The Payoff', titlePlain: 'Wake up to ', titleAccent: 'this.', subtitle: 'You’re not buying observability. You’re buying the end of on-call.' },
]

function NightshiftScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const [beat, setBeat] = useState(0)
  const [playKey, setPlayKey] = useState(0)

  const eyebrow = metadata.eyebrow || 'Pillar 03 · Nightshift'
  const capabilities = metadata.capabilities || CAPABILITIES
  const callouts = metadata.callouts || CALLOUTS
  const trustModes = metadata.trustModes || TRUST_MODES
  const briefing = { ...DEFAULT_BRIEFING, ...(metadata.briefing || {}) }
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 480, delay: stagger(80), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  const goTo = (i) => { setBeat(i); setPlayKey((k) => k + 1) }

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {beat === 0 ? (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {capabilities.map((c, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex flex-col p-5 ${cardBase}`} style={{ borderTopWidth: '4px', borderTopColor: accent }}>
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-3" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={c.icon} />
                    </span>
                    <h3 className={`font-bold text-xl leading-tight mb-1.5 ${headText}`}>{c.name}</h3>
                    <span className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: accent }}>{c.badge}</span>
                    <p className={`text-base leading-snug ${mutedText}`}>{c.desc}</p>
                  </div>
                ))}
              </div>

              <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
                {callouts.map((c, i) => (
                  <div key={i} className="rounded-2xl border px-5 py-3 flex items-baseline gap-3" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
                    <span className="font-headline font-extrabold text-3xl leading-none" style={{ color: accent }}>{c.value}</span>
                    <span className={`text-base leading-tight ${mutedText}`}>{c.label}</span>
                  </div>
                ))}
                <div className="rounded-2xl border px-5 py-3 flex flex-col justify-center" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>Configurable Trust</span>
                  <div className="flex items-center gap-1.5">
                    {trustModes.map((m, i) => (
                      <span key={i} className="text-xs font-semibold rounded-md px-2 py-0.5" style={{ backgroundColor: `${accent}22`, color: accent }}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.85fr_1.15fr] gap-6 items-center">
              {/* Left message */}
              <div className="reveal flex flex-col gap-4">
                <span className="inline-flex items-center gap-2 self-start text-xs font-bold uppercase tracking-wider rounded-full px-3 py-1.5" style={{ backgroundColor: `${accent}22`, color: accent }}>
                  <FontAwesomeIcon icon={faMoon} /> The end of on-call
                </span>
                <p className={`font-headline font-extrabold text-2xl md:text-3xl leading-tight ${headText}`}>
                  Zero pages. Zero 3 AM calls. One full explanation, ready when you are.
                </p>
                <p className={`text-base leading-snug ${mutedText}`}>
                  Nightshift detected, investigated, and resolved the incident overnight — then wrote up exactly what happened.
                </p>
              </div>

              {/* Incident briefing card */}
              <div className="reveal relative overflow-hidden rounded-2xl border p-6" style={{ borderColor: `${accent}59`, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.92)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex w-3 h-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: accent }} />
                      <span className="relative inline-flex rounded-full w-3 h-3" style={{ backgroundColor: accent }} />
                    </span>
                    <span className="font-bold text-base" style={{ color: accent }}>Incident Resolved</span>
                  </div>
                  <span className="font-mono text-sm" style={{ color: accent }}>{briefing.time}</span>
                </div>

                <div className="space-y-3 mb-4">
                  {[
                    { icon: faTriangleExclamation, label: 'What happened', text: briefing.whatHappened },
                    { icon: faMagnifyingGlass, label: 'Root cause', text: briefing.rootCause },
                    { icon: faWrench, label: 'Fix applied', text: briefing.fix },
                  ].map((row, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: `${accent}1c`, color: accent }}>
                        <FontAwesomeIcon icon={row.icon} />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>{row.label}</div>
                        <p className={`text-sm leading-snug ${headText}`}>{row.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4" style={{ borderTop: `1px solid ${accent}2e` }}>
                  {briefing.stats.map((s, i) => (
                    <div key={i} className="text-center">
                      <div className="font-headline font-extrabold text-2xl leading-none" style={{ color: accent }}>{s.value}</div>
                      <div className={`text-xs leading-tight mt-1 ${mutedText}`}>{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-center gap-2 mt-4 text-sm font-semibold" style={{ color: accent }}>
                  <FontAwesomeIcon icon={faCircleCheck} /> All services healthy
                </div>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={() => setPlayKey((k) => k + 1)} />
      </div>
    </div>
  )
}

export default NightshiftScene
