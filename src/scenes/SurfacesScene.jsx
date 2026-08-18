import { useEffect, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import { useSceneMotion } from '../hooks/useSceneMotion'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import CountUp from '../components/CountUp'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTableColumns, faComments, faTerminal, faRobot, faCode,
  faLayerGroup, faPlug, faArrowRightLong, faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'

// Source: 10-gen-obs.html + plain-english.html + mcp-demo.html
const SURFACES = [
  { name: 'Kibana / UI', verb: 'Validate', icon: faTableColumns },
  { name: 'Chat / Agent', verb: 'Explore', icon: faComments },
  { name: 'CLI / Terminal', verb: 'Operate', icon: faTerminal },
  { name: 'Agent Harness', verb: 'Automate', icon: faRobot },
  { name: 'API / Automation', verb: 'Integrate', icon: faCode },
]
const PRINCIPLES = ['Content is generated in Skills', 'Skills are reusable everywhere', 'Surfaces are just projections']

const MCP_FEATURES = [
  { name: 'Native MCP server', icon: faPlug, desc: 'Claude-compatible clients connect straight to Elastic.' },
  { name: 'Skills loaded automatically', icon: faLayerGroup, desc: 'Significant Events RCA, anomaly detection, remediation.' },
  { name: 'Surface-aware rendering', icon: faTableColumns, desc: 'Rich result cards, not raw JSON.' },
]

const BEATS = [
  { key: 'surfaces', step: 'Skills Layer', titlePlain: 'Meet users ', titleAccent: 'where they are.', subtitle: 'One Skills layer defines what to compute and how to present it — the same insight on every surface your team uses.' },
  { key: 'mcp', step: 'Plain English', titlePlain: 'Talk to your systems in ', titleAccent: 'plain English.', subtitle: 'A native MCP server brings full observability into Claude — results rendered as cards, inside your existing workflows.' },
]

function SurfacesScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  // Chat card (beat 2) streams its turns in sequence, with a typing indicator
  // between them — mirrors the AI Assistant conversation in the Security scene.
  const [chatStep, setChatStep] = useState(0)
  const [chatTyping, setChatTyping] = useState(false)

  const eyebrow = metadata.eyebrow || 'Observability · Surfaces'
  const surfaces = metadata.surfaces || SURFACES
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, goTo, replay } = useSceneMotion(beats)
  const current = beats[beat]

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const orange = isDark ? '#FF957D' : '#0B64DD'
  const pink = '#F04E98'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(70), easing: 'easeOutQuad',
    })
    return () => anim?.pause?.()
  }, [beat, playKey])

  // Drive the chat conversation: reveal one turn at a time, showing the typing
  // indicator while the "agent" works, then land the anomaly card last.
  useEffect(() => {
    if (beat !== 1) return undefined
    setChatStep(0)
    setChatTyping(false)
    const timers = []
    const at = (ms, fn) => timers.push(setTimeout(fn, ms))
    at(400, () => setChatStep(1))            // user prompt
    at(1100, () => setChatTyping(true))      // agent thinking
    at(2100, () => { setChatTyping(false); setChatStep(2) }) // tool call
    at(2600, () => setChatStep(3))           // "got the data"
    at(3200, () => setChatTyping(true))      // rendering
    at(4200, () => { setChatTyping(false); setChatStep(4) }) // anomaly card
    return () => timers.forEach(clearTimeout)
  }, [beat, playKey])

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1300px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {beat === 0 ? (
            <div className="flex-1 min-h-0 flex flex-col gap-4 justify-center">
              {/* Surfaces row */}
              <div className="reveal grid grid-cols-5 gap-3">
                {surfaces.map((s, i) => (
                  <div key={i} className={`rounded-2xl border flex flex-col items-center text-center p-4 ${cardBase}`}>
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-lg mb-2" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={s.icon} />
                    </span>
                    <div className={`font-bold text-sm leading-tight ${headText}`}>{s.name}</div>
                    <div className="text-xs font-semibold mt-1" style={{ color: accent }}>{s.verb}</div>
                  </div>
                ))}
              </div>

              <div className="reveal flex justify-center"><FontAwesomeIcon icon={faArrowRightLong} className="rotate-90" style={{ color: `${orange}99` }} /></div>

              {/* Skills layer */}
              <div className="reveal rounded-2xl border p-5 text-center" style={{ borderColor: `${orange}66`, background: `linear-gradient(160deg, ${orange}1c, ${orange}06)` }}>
                <div className="flex items-center justify-center gap-2.5 mb-2">
                  <span className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${orange}26`, color: orange }}>
                    <FontAwesomeIcon icon={faLayerGroup} />
                  </span>
                  <h3 className={`font-headline font-extrabold text-xl ${headText}`}>Skills: Execution & Rendering Layer</h3>
                </div>
                <p className={`text-sm ${mutedText}`}>Data access · system understanding · event analysis · content generation · remediation — rendered per surface.</p>
              </div>

              {/* Principles */}
              <div className="reveal grid grid-cols-3 gap-3">
                {PRINCIPLES.map((p, i) => (
                  <div key={i} className={`rounded-xl border px-4 py-3 text-sm font-semibold text-center ${headText}`} style={{ borderColor: `${accent}33`, backgroundColor: `${accent}0d` }}>{p}</div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-5 items-center">
              {/* Features */}
              <div className="flex flex-col gap-3">
                {MCP_FEATURES.map((f, i) => (
                  <div key={i} className={`reveal rounded-2xl border flex items-center gap-3.5 p-5 ${cardBase}`}>
                    <span className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ backgroundColor: `${accent}1f`, color: accent }}>
                      <FontAwesomeIcon icon={f.icon} />
                    </span>
                    <div className="min-w-0">
                      <div className={`font-bold text-lg leading-tight ${headText}`}>{f.name}</div>
                      <p className={`text-sm leading-snug mt-1 ${mutedText}`}>{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat card */}
              <div className="reveal rounded-2xl border overflow-hidden" style={{ borderColor: `${accent}33`, backgroundColor: isDark ? '#0a1422' : '#0B1628' }}>
                <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: `1px solid ${accent}1f` }}>
                  <span className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#FF5F57]" /><span className="w-3 h-3 rounded-full bg-[#FEBC2E]" /><span className="w-3 h-3 rounded-full bg-[#28C840]" />
                  </span>
                  <span className="font-mono text-xs text-white/70 ml-1">K8s-Agentic-Investigation — Claude</span>
                </div>
                <div className="p-4 space-y-3 h-[380px] overflow-y-auto">
                  {chatStep >= 1 && (
                    <div className="flex justify-end motion-msg-in">
                      <div className="rounded-2xl rounded-tr-sm px-3.5 py-2 text-sm text-white max-w-[80%]" style={{ backgroundColor: `${accent}26` }}>
                        Call forge_ml_anomalies for entity “frontend”, last 1h. Render in the anomaly-explainer.
                      </div>
                    </div>
                  )}
                  {chatStep >= 2 && (
                    <div className="font-mono text-xs text-white/55 motion-msg-in">&gt; forge_ml_anomalies entity: frontend · lookback: 1h</div>
                  )}
                  {chatStep >= 3 && (
                    <div className="text-sm text-white/80 motion-msg-in">Got the data. Rendering it in the anomaly-explainer app.</div>
                  )}
                  {/* anomaly card */}
                  {chatStep >= 4 && (
                  <div className="rounded-xl border p-3.5 motion-msg-in" style={{ borderColor: `${pink}59`, backgroundColor: `${pink}12` }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faTriangleExclamation} style={{ color: pink }} />
                        <span className="font-mono text-sm text-white">k8s-pod-memory-growth</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider rounded px-2 py-0.5" style={{ backgroundColor: pink, color: '#fff' }}>Critical</span>
                    </div>
                    <div className="font-mono text-xs text-white/50 mb-3">frontend-7847f66d84-27cfw · mean(pod.memory.working_set)</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Anomaly score', value: 96, suffix: '.2', accent: true },
                        { label: 'Deviation', value: 38, prefix: '+', suffix: '.4%', accent: true },
                        { label: 'Actual memory', text: '104.5 MB' },
                        { label: 'Typical', text: '75.5 MB' },
                      ].map((s, i) => (
                        <div key={i}>
                          <div className="text-[11px] text-white/50">{s.label}</div>
                          <div className="font-headline font-extrabold text-xl" style={{ color: s.accent ? pink : '#fff' }}>
                            {s.text != null
                              ? s.text
                              : <CountUp value={s.value} duration={1600} format={(n) => `${s.prefix || ''}${n}${s.suffix || ''}`} replayKey={playKey} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  )}
                  {chatTyping && (
                    <div className="flex justify-start motion-msg-in">
                      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                        {[0, 1, 2].map((dot) => (
                          <span key={dot} className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${dot * 0.15}s` }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} />
      </div>
    </div>
  )
}

export default SurfacesScene
