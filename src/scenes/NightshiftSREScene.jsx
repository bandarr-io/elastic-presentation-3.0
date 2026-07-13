import { useEffect, useRef } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneStepper from '../components/SceneStepper'
import CountUp from '../components/CountUp'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBurst, faWandMagicSparkles, faServer, faBrain, faCircleCheck,
  faTriangleExclamation, faMagnifyingGlass, faPaperPlane, faBoltLightning,
} from '@fortawesome/free-solid-svg-icons'

// Source: giphy.mp4 — the "Nightshift, the Elastic AI SRE" agent console demo.
const RAIL = [
  { name: 'Blast Radius', desc: 'Real-time scoring of how far an incident has spread.', icon: faBurst, beat: 0 },
  { name: 'AI Remediation', desc: 'Agent-driven root-cause analysis with subagent-ready next steps.', icon: faWandMagicSparkles, beat: 1 },
  { name: 'Background Execution', desc: 'Remediates autonomously — wake up to a resolved incident.', icon: faServer, beat: 2 },
]

const EVIDENCE = [
  { src: 'logs.otel', detail: '"could not charge the card: rpc error: code = ECONNREFUSED"' },
  { src: 'metrics.k8s', detail: '1,418 TCP failures on port 9999 in 30-min window at 04:30' },
]
const PLAN = [
  ['Verify pod status', 'kubectl get pods -n payments'],
  ['Confirm port 9999 not bound', 'netstat inside pod'],
  ['Delete CrashLoopBackOff pod', 'let Kubernetes restart clean'],
  ['Watch recovery', 'verify port 9999 responds'],
]

const STATUS = [
  { s: '✓ Approved — executing now', ok: true },
  { s: 'Inspecting pods and logs in payments namespace…' },
  { s: 'Deleting CrashLoopBackOff pod — triggering clean restart…' },
  { s: 'Monitoring pod recovery…' },
]
const TERM_FIX = [
  { t: 'cmd', s: '$ kubectl get pods -n payments' },
  { t: 'dim', s: 'NAME                    READY  STATUS            RESTARTS' },
  { t: 'err', s: 'payment-service-xk8pq   0/1    CrashLoopBackOff  14' },
  { t: 'dim', s: 'checkout-service-wl3rt  1/1    Running           0' },
  { t: 'cmd', s: '$ kubectl logs payment-service-xk8pq --tail=2' },
  { t: 'err', s: 'FATAL: listen tcp 0.0.0.0:9999: bind: address already in use' },
  { t: 'cmd', s: '$ kubectl delete pod payment-service-xk8pq' },
  { t: 'ok', s: 'pod "payment-service-xk8pq" deleted' },
  { t: 'cmd', s: '$ kubectl get pods -w' },
  { t: 'dim', s: 'payment-service-r4nms   0/1    ContainerCreating 0' },
  { t: 'ok', s: 'payment-service-r4nms   1/1    Running           0' },
]
const TERM_VERIFY = [
  { t: 'cmd', s: '$ kubectl exec payment-service-r4nms -- nc -zv localhost 9999' },
  { t: 'ok', s: 'Connection to localhost 9999 port [tcp] succeeded!' },
  { t: 'ok', s: '✓ Port 9999 bound and accepting connections' },
  { t: 'ok', s: '✓ gRPC placeOrder: 0 errors in last 60s' },
  { t: 'ok', s: '✓ Incident resolved — 0 alerts firing' },
]
const SIGNATURE = [
  ['Service', 'payment-service / payments namespace'],
  ['Root cause', 'Port 9999 bind failure — leaked socket from previous process not released on restart'],
  ['Pattern', 'CrashLoopBackOff (14×) · gRPC listener failing silently · no port output on netstat'],
  ['Fix', 'Force pod termination — clean init clears bind conflict, port recovers immediately'],
  ['TTR', '8 min · 0 pages sent · team uninterrupted'],
]

const BEATS = [
  { key: 'detect', step: 'Detect', tab: 'Chat', path: 'nightshift/overview', hold: 4200 },
  { key: 'investigate', step: 'Investigate', tab: 'Chat', path: 'nightshift/event/payment-service', hold: 4800 },
  { key: 'remediate', step: 'Remediate', tab: 'Background', path: 'nightshift/chat', hold: 5400 },
  { key: 'learn', step: 'Learn', tab: 'Background', path: 'nightshift/chat', hold: 4800 },
]

function NightshiftSREScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)

  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const danger = '#F04E98'
  const warn = '#FEC514'
  const okGreen = isDark ? '#34D399' : '#0F9D6B'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const termBg = isDark ? 'bg-black/40' : 'bg-elastic-dev-blue/[0.04]'
  const gaugeTrack = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)'

  const R = 26
  const C = 2 * Math.PI * R
  const SCORE = 85

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anims = []
    anims.push(animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [14, 0], duration: 440, delay: stagger(55), easing: 'easeOutQuad',
    }))
    const flyout = el.querySelectorAll('.slide-r')
    if (flyout.length) anims.push(animate(flyout, { opacity: [0, 1], translateX: [22, 0], duration: 560, delay: 250, easing: 'easeOutCubic' }))

    const arc = el.querySelector('.gauge-arc')
    if (arc) {
      arc.style.strokeDasharray = String(C)
      arc.style.strokeDashoffset = String(C)
      anims.push(animate(arc, { strokeDashoffset: [C, C * (1 - SCORE / 100)], duration: 1100, delay: 300, easing: 'easeOutCubic' }))
    }
    const bar = el.querySelector('[data-blast]')
    if (bar) anims.push(animate(bar, { width: ['0%', '100%'], duration: 1000, delay: 400, easing: 'easeOutCubic' }))

    const term = el.querySelectorAll('.term-line')
    if (term.length) anims.push(animate(term, { opacity: [0, 1], translateX: [-8, 0], duration: 220, delay: stagger(140, { start: 300 }), easing: 'easeOutQuad' }))
    const steps = el.querySelectorAll('.status-line')
    if (steps.length) anims.push(animate(steps, { opacity: [0, 1], translateX: [-8, 0], duration: 300, delay: stagger(360, { start: 300 }), easing: 'easeOutQuad' }))
    return () => anims.forEach((a) => a?.pause?.())
  }, [beat, playKey, C])

  const tabs = ['Chat', 'Background', 'Agent Client']
  const chip = (label, color) => (
    <span key={label} className="text-[11px] font-bold rounded-full px-2.5 py-1 border" style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}>{label}</span>
  )
  const codeChip = (t, color = accent) => (
    <span className="font-mono text-[11px] rounded px-1 py-0.5" style={{ backgroundColor: `${color}1c`, color }}>{t}</span>
  )

  const consoleHeader = (
    <div className={`flex items-center gap-2 px-3 py-2 border-b flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
      <span className="flex gap-1.5">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
      </span>
      <span className={`font-mono text-[10px] ${mutedText}`}>app/observability/{current.path}</span>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1440px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          {/* Header */}
          <div className="reveal flex items-start justify-between mb-2">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] mb-1" style={{ color: accent }}>Observability · Agentic SRE</div>
              <h2 className={`font-headline font-extrabold text-3xl leading-none ${headText}`}>
                <span style={{ color: accent }}>Nightshift</span>, the Elastic AI SRE
              </h2>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {chip('Blast Radius: HIGH', danger)}
              {chip('Nightshift Active', accent)}
              {chip('Agent Ready', accent)}
            </div>
          </div>

          {/* Mode tabs */}
          <div className="reveal flex items-center gap-2 mb-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${mutedText}`}>Mode</span>
            {tabs.map((t) => {
              const active = t === current.tab
              return (
                <span key={t} className={`text-xs font-semibold rounded-full px-3 py-1 ${active ? '' : mutedText}`} style={active ? { backgroundColor: `${accent}1f`, color: accent } : {}}>{t}</span>
              )
            })}
          </div>

          <div className="flex-1 min-h-0 flex gap-4">
            {/* Left rail */}
            <div className="reveal w-60 shrink-0 flex flex-col gap-3 min-h-0">
              <p className={`text-[12px] leading-snug ${mutedText}`}>
                Nightshift monitors your systems while your team rests — detecting anomalies, grouping significant events, and surfacing <span className={`font-semibold ${headText}`}>AI-driven remediation</span> the moment something goes wrong.
              </p>
              <div className="flex flex-col gap-2">
                {RAIL.map((r) => {
                  const active = current.key === 'learn' ? r.beat === 2 : r.beat === beat
                  return (
                    <div key={r.name} className={`rounded-xl border p-2.5 transition-all ${cardBase}`} style={active ? { borderLeftWidth: '3px', borderLeftColor: accent, background: `${accent}0f` } : { borderLeftWidth: '3px', borderLeftColor: 'transparent' }}>
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={r.icon} className="text-xs" style={{ color: active ? accent : undefined }} />
                        <span className={`text-xs font-bold ${active ? '' : headText}`} style={active ? { color: accent } : {}}>{r.name}</span>
                      </div>
                      <div className={`text-[10px] leading-snug mt-0.5 ${mutedText}`}>{r.desc}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Console */}
            <div className={`flex-1 min-h-0 flex flex-col rounded-2xl border overflow-hidden ${cardBase}`}>
              {consoleHeader}

              <div className="flex-1 min-h-0 p-4 overflow-hidden flex flex-col">
                {/* ── Beat 1: Detect ─────────────────────────────────────── */}
                {beat === 0 && (
                  <div className="w-full my-auto flex flex-col">
                    <div className="reveal flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style={{ backgroundColor: `${accent}1f`, color: accent }}>Nightshift</span>
                      <span className="w-1.5 h-1.5 rounded-full motion-blink" style={{ backgroundColor: danger }} />
                      <span className={`font-bold text-base ${headText}`}>payment-service is down</span>
                      <span className={`text-[11px] ml-auto ${mutedText}`}>5 minutes ago</span>
                    </div>
                    <p className={`reveal text-[12px] mb-3 ${mutedText}`}>CrashLoopBackOff in payments namespace — checkout and order pipelines blocked.</p>

                    <div className="reveal flex items-center gap-4 rounded-xl border p-3 mb-3" style={{ borderColor: `${danger}40`, backgroundColor: `${danger}0d` }}>
                      <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
                        <svg width="64" height="64" viewBox="0 0 64 64">
                          <circle cx="32" cy="32" r={R} fill="none" stroke={gaugeTrack} strokeWidth="6" />
                          <circle className="gauge-arc" cx="32" cy="32" r={R} fill="none" stroke={danger} strokeWidth="6" strokeLinecap="round" transform="rotate(-90 32 32)" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <CountUp value={SCORE} duration={1100} replayKey={playKey} className="font-headline font-extrabold text-xl" style={{ color: danger }} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: danger }}>Blast radius score</div>
                        <div className="font-headline font-extrabold text-lg leading-none mb-1" style={{ color: danger }}>HIGH</div>
                        <p className={`text-[12px] leading-snug ${headText}`}>
                          payment-service is in CrashLoopBackOff — gRPC port 9999 unbound after {codeChip('14 restarts', warn)}. Checkout and order pipelines blocked, {codeChip('3 downstream services', warn)} degraded.
                        </p>
                      </div>
                    </div>

                    <div className="reveal mb-1 flex items-center justify-between">
                      <span className={`text-[11px] font-semibold ${headText}`}>Blast radius</span>
                      <span className={`text-[11px] ${mutedText}`}>4 of 4 services at risk</span>
                    </div>
                    <div className="reveal h-2.5 rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: gaugeTrack }}>
                      <div data-blast className="h-full rounded-full" style={{ width: 0, background: `linear-gradient(90deg, ${danger}, ${warn})` }} />
                    </div>
                    <div className="reveal flex items-center gap-4 text-[11px]">
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: danger }} /><span className={mutedText}>1 confirmed</span></span>
                      <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: warn }} /><span className={mutedText}>3 exposed</span></span>
                    </div>

                    <div className="reveal rounded-xl border p-3 mt-3" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}>
                      <p className={`text-[12px] mb-2.5 ${headText}`}>You can start remediation now, or let Nightshift handle it in the background.</p>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold rounded-lg px-3 py-1.5 border ${headText}`} style={{ borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(16,28,63,0.15)' }}>Blast Radius</span>
                        <span className="text-xs font-bold rounded-lg px-3 py-1.5" style={{ backgroundColor: accent, color: isDark ? '#07231d' : '#fff' }}><FontAwesomeIcon icon={faBoltLightning} className="mr-1.5" />Remediate</span>
                        <span className={`text-xs font-semibold rounded-lg px-3 py-1.5 ${mutedText}`}>Run in background</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Beat 2: Investigate ────────────────────────────────── */}
                {beat === 1 && (
                  <div className="w-full my-auto flex flex-col">
                    <div className="reveal flex items-center gap-2 mb-2">
                      <FontAwesomeIcon icon={faMagnifyingGlass} style={{ color: accent }} />
                      <span className={`font-bold text-base ${headText}`}>Payment Service — Root Cause Analysis</span>
                    </div>
                    <div className="reveal rounded-xl border p-3 mb-3" style={{ borderColor: `${danger}40`, backgroundColor: `${danger}0d` }}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: danger }} />
                        <span className="text-xs font-bold" style={{ color: danger }}>Root Cause · Confirmed · High Confidence</span>
                      </div>
                      <p className={`text-[12px] leading-snug ${headText}`}>
                        payment-service is unreachable on TCP port {codeChip('9999')}. The {codeChip('checkout')} service’s {codeChip('placeOrder')} gRPC call fails with {codeChip('ECONNREFUSED', danger)} — and the pod cannot reach the GCP metadata endpoint {codeChip('169.254.169.254', warn)}, a misconfigured workload identity is the likely trigger.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="reveal flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-bold mb-1.5" style={{ color: accent }}><FontAwesomeIcon icon={faTriangleExclamation} className="text-[11px]" /> Evidence</div>
                        <div className="flex flex-col gap-1.5">
                          {EVIDENCE.map((e, i) => (
                            <div key={i} className={`rounded-lg border p-2 ${cardBase}`}>
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[11px]" style={{ color: accent }}>{e.src}</span>
                                <span className="text-[10px] font-bold flex items-center gap-1" style={{ color: danger }}><span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: danger }} />High</span>
                              </div>
                              <p className={`text-[10px] leading-snug mt-0.5 ${mutedText}`}>{e.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="reveal flex flex-col">
                        <div className="flex items-center gap-2 text-xs font-bold mb-1.5" style={{ color: accent }}><FontAwesomeIcon icon={faWandMagicSparkles} className="text-[11px]" /> Remediation Plan</div>
                        <div className="flex flex-col gap-1.5">
                          {PLAN.map(([name, cmd], i) => (
                            <div key={i} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 mt-0.5" style={{ backgroundColor: `${accent}22`, color: accent }}>{i + 1}</span>
                              <div className="min-w-0">
                                <span className={`text-[12px] font-semibold ${headText}`}>{name} — </span>
                                <span className="font-mono text-[11px]" style={{ color: accent }}>{cmd}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Beat 3: Remediate (split) ──────────────────────────── */}
                {beat === 2 && (
                  <div className="w-full my-auto grid grid-cols-2 gap-3">
                    <div className="flex flex-col min-h-0">
                      <div className="reveal rounded-lg border p-2.5 mb-2" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}0d` }}>
                        <span className="text-xs font-bold" style={{ color: accent }}>Root cause confirmed.</span>
                        <span className={`text-[11px] ${headText}`}> Pod in CrashLoopBackOff (14 restarts), port 9999 unbound. Executing the remediation now.</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {STATUS.map((s, i) => (
                          <div key={i} className={`status-line flex items-center gap-2 text-[12px] ${s.ok ? '' : mutedText}`} style={s.ok ? { color: accent } : {}}>
                            <FontAwesomeIcon icon={s.ok ? faCircleCheck : faBoltLightning} className="text-[10px]" style={{ color: s.ok ? accent : warn }} />
                            {s.s}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={`flex flex-col rounded-lg overflow-hidden ${termBg}`}>
                      <div className={`px-3 py-1.5 text-[10px] font-mono border-b ${mutedText} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>nightshift — payments</div>
                      <div className="flex-1 min-h-0 p-2.5 font-mono text-[10.5px] leading-relaxed overflow-hidden">
                        {TERM_FIX.map((l, i) => (
                          <div key={i} className="term-line whitespace-pre" style={{ color: l.t === 'err' ? danger : l.t === 'ok' ? okGreen : l.t === 'cmd' ? (isDark ? '#fff' : '#101C3F') : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,28,63,0.5)') }}>{l.s}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Beat 4: Learn ──────────────────────────────────────── */}
                {beat === 3 && (
                  <div className="w-full my-auto grid grid-cols-2 gap-3">
                    <div className="flex flex-col min-h-0">
                      <div className="reveal flex items-center gap-2 rounded-lg border p-2.5 mb-2" style={{ borderColor: `${okGreen}55`, backgroundColor: `${okGreen}12` }}>
                        <FontAwesomeIcon icon={faCircleCheck} style={{ color: okGreen }} />
                        <span className={`text-[12px] font-semibold ${headText}`}>Incident resolved — payment-service healthy, port 9999 responding, 0 alerts firing.</span>
                      </div>
                      <div className="reveal rounded-xl border p-3 flex-1 min-h-0" style={{ borderColor: `${accent}45`, background: `${accent}0a` }}>
                        <div className="flex items-center gap-2 mb-2">
                          <FontAwesomeIcon icon={faBoltLightning} style={{ color: accent }} />
                          <span className={`font-bold text-sm ${headText}`}>Failure Signature Captured</span>
                          <span className="ml-auto text-[10px] font-bold rounded-full px-2 py-0.5 flex items-center gap-1" style={{ backgroundColor: `${accent}1f`, color: accent }}><FontAwesomeIcon icon={faBrain} className="text-[9px]" />Brain</span>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {SIGNATURE.map(([k, v], i) => (
                            <div key={i} className="flex gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider w-16 shrink-0 pt-0.5" style={{ color: accent }}>{k}</span>
                              <span className={`text-[11px] leading-snug ${headText}`}>{v}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2.5 pt-2.5 text-[11px] leading-snug border-t" style={{ borderColor: `${accent}2e`, color: accent }}>
                          <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />Saved to Elastic Brain — the next matching incident auto-resolves in &lt;60s, no human required.
                        </div>
                      </div>
                    </div>
                    <div className={`flex flex-col rounded-lg overflow-hidden ${termBg}`}>
                      <div className={`px-3 py-1.5 text-[10px] font-mono border-b ${mutedText} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>nightshift — payments</div>
                      <div className="flex-1 min-h-0 p-2.5 font-mono text-[10.5px] leading-relaxed overflow-hidden flex flex-col justify-center">
                        {TERM_VERIFY.map((l, i) => (
                          <div key={i} className="term-line whitespace-pre-wrap" style={{ color: l.t === 'ok' ? okGreen : l.t === 'cmd' ? (isDark ? '#fff' : '#101C3F') : (isDark ? 'rgba(255,255,255,0.45)' : 'rgba(16,28,63,0.5)') }}>{l.s}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Console input mock */}
              <div className={`flex items-center gap-2 px-3 py-2 border-t flex-shrink-0 ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                <div className={`flex-1 rounded-lg border px-3 py-1.5 text-[11px] ${mutedText} ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>Ask Nightshift…</div>
                <span className={`font-mono text-[10px] ${mutedText}`}>Sonnet 4.5</span>
                <span className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: accent, color: isDark ? '#07231d' : '#fff' }}><FontAwesomeIcon icon={faPaperPlane} className="text-[11px]" /></span>
              </div>
            </div>
          </div>
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} />
      </div>
    </div>
  )
}

export default NightshiftSREScene
