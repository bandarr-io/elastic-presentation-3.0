import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, stagger } from 'animejs'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import SceneStepper from '../components/SceneStepper'
import FlowConnectors from '../components/FlowConnectors'
import { useSceneMotion } from '../hooks/useSceneMotion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase, faBrain, faRobot, faShareNodes, faArrowUpLong,
  faLock, faArrowRightLong, faCompress, faPlay, faCheck,
  faArrowDownLong, faBolt, faArrowPointer, faEllipsis,
  faCube, faServer, faCloud, faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'

// Source: nightshift-architecture.html + nightshift-ai-index.html + nightshift-brain.html + nightshift-ai-economics.html
const CONTEXT_CHIPS = ['Failure Signatures', 'Fix Outcomes', 'Pattern Library', 'Knowledge Indicators', 'System Model', 'Service Topology', 'Dependencies', 'Anomaly Events']
const TELEMETRY = [
  { name: 'Elasticsearch', sub: 'primary store · full fidelity' },
  { name: 'S3', sub: 'log archives · cold telemetry' },
  { name: 'Databricks', sub: 'lakehouse · structured events' },
  { name: 'BigQuery', sub: 'analytics · GCP telemetry' },
]
const EXTERNAL = [
  { name: 'Datadog', sub: 'metrics, alerts, dashboards' },
  { name: 'Grafana', sub: 'dashboards, Loki logs' },
  { name: 'CloudWatch', sub: 'AWS logs & metrics' },
  { name: 'Dynatrace', sub: 'traces, APM alerts' },
]

// Architecture beat — the cluster stack (bottom-up: data → context → agent),
// the external touchpoints on the left, and the shared Elastic Brain on the
// right. The dashed connectors close the loop: Agent → Brain → Context Layer.
const AGENT_LAYER = {
  name: 'SRE Agent', label: 'Agent Layer',
  chips: ['Sig Events', 'Blast Radius', 'Alert Triage', 'RCA', 'Correlation', 'Remediation', 'Runbook Execution', 'Approval Workflow', 'Post-Incident Review'],
}
const CONTEXT_LAYER = {
  name: 'Context Layer', label: 'Context Layer', sub: 'self-updating',
  chips: ['failure signatures', 'fix outcomes', 'pattern library', 'knowledge indicators', 'system model', 'service topology', 'dependencies', 'anomaly events'],
}
const DATA_CARDS = [
  { id: 'telemetry', name: 'Telemetry', label: 'Telemetry', sub: 'Signals · Elastic', tone: 'blue', chips: ['Logs', 'Traces', 'Metrics', 'Synthetics', 'Profiles'] },
  { id: 'artifacts', name: 'Artifacts', label: 'Artifacts', sub: 'Source · History · Runbooks', tone: 'coral', chips: ['Code', 'Git', 'Commits', 'Deployments', 'Ownership', 'Runbooks'] },
]
const EXT_AGENTS = [
  { label: 'Claude', icon: faRobot },
  { label: 'Cursor', icon: faArrowPointer },
  { label: 'more', icon: faEllipsis },
]
const EXT_SYSTEMS = [faCodeBranch, faCube, faServer, faCloud, faDatabase, faEllipsis]
const ARCH_EDGES = [
  { key: 'agents', from: 'ext-agents', to: 'agent', fromSide: 'right', toSide: 'left', arrowStart: true, arrowEnd: true },
  { key: 'systems', from: 'ext-systems', to: 'context', fromSide: 'right', toSide: 'left', arrowEnd: true },
  { key: 'to-brain', from: 'agent', to: 'brain', fromSide: 'right', toSide: 'top', arrowEnd: true, orthogonal: true },
  { key: 'from-brain', from: 'brain', to: 'context', fromSide: 'left', toSide: 'right', arrowEnd: true },
]

const YOUR_BRAIN = [
  'Your resolved incidents + investigation notes',
  'Your service topology + System Model',
  'Your runbooks + team memory',
  'Raw telemetry + source code',
]

const OPT_IN_STEPS = ['strips names', 'strips values', 'strips topology', 'keeps patterns']

const SIGNATURES = [
  {
    id: 'redis.pool.exhaustion.v3',
    meta: 'seen 23× · 14 deployments · last 90d',
    rows: [
      { k: 'technology', v: 'Redis · connection pooling' },
      { k: 'observable signals', v: 'pool_usage > 95% · connection_timeout errors · p99 latency ↑ 4× baseline' },
      { k: 'root cause class', v: 'pool saturation under write burst — not a memory leak, not a network issue' },
    ],
    fixes: [
      { label: 'best fix', v: 'restart + raise pool_size', pct: '82% success', note: '(23 incidents)', best: true },
      { label: 'alt fix', v: 'raise pool_size only', pct: '61% success', note: '(11 incidents)' },
      { label: 'alt fix', v: 'restart only', pct: '34% success', note: '(8 incidents)' },
    ],
    stripped: 'service names · hostnames · actual metric values · customer topology · team names',
  },
  {
    id: 'k8s.oomkill.cascade.v2',
    isNew: true,
    meta: 'seen 1× · 1 deployment · just now',
    rows: [
      { k: 'technology', v: 'Kubernetes · container lifecycle' },
      { k: 'observable signals', v: 'exit code 137 · memory 98% · upstream p99 ↑ 7.6×' },
      { k: 'root cause class', v: 'upstream degradation → memory accumulation → OOMKill cascade' },
    ],
    fixes: [
      { label: 'best fix', v: 'limit increase + upstream throttle', note: '(1 incident, new)', best: true },
    ],
    stripped: 'namespace · pod names · image tags · cluster · customer',
  },
]

const FUNNEL = [
  { name: 'Raw Telemetry', scale: 'Petabytes', sym: 'PB', icon: faDatabase, width: 100, note: 'Never sent to the LLM — stored low-cost, queried via ES|QL', reduce: '≈ 10⁹× smaller' },
  { name: 'Knowledge Indicators', scale: 'Megabytes', sym: 'MB', icon: faBrain, width: 58, note: 'Structured system understanding for the agent', reduce: '≈ 10³× smaller' },
  { name: 'Significant Events', scale: 'Kilobytes', sym: 'KB', icon: faBolt, width: 26, note: 'Correlated RCA, blast radius, severity — what matters', llm: true },
]

const BEATS = [
  { key: 'context', step: 'Context Layer', titlePlain: 'The context layer ', titleAccent: 'above every stack.', subtitle: 'It connects to the monitoring tools and data stores already in your environment — no migration required.', hold: 4600 },
  { key: 'arch', step: 'Architecture', titlePlain: 'A flywheel inside ', titleAccent: 'your cluster.', subtitle: 'Telemetry feeds a self-updating Context Layer; the agent reasons over it and reaches out to your tools — no direct infra access.' },
  { key: 'brain', step: 'Elastic Brain', eyebrow: 'Elastic Brain', titlePlain: 'What’s yours. ', titleAccent: 'What’s shared.', subtitle: 'The memory layer behind Nightshift — learns from every incident, gets smarter every time.' },
  { key: 'economics', step: 'AI Economics', titlePlain: 'The hierarchy ', titleAccent: 'is the token strategy.', subtitle: 'You can’t pass petabytes of logs to an LLM — so Elastic compresses meaning at every layer.' },
]

function NightshiftArchScene({ metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const rootRef = useRef(null)
  const archRef = useRef(null)

  const eyebrow = metadata.eyebrow || 'Elastic Observability · Inside Nightshift'
  const beats = (metadata.beats || BEATS).map((b, i) => ({ ...(BEATS[i] || {}), ...b }))
  const { beat, playKey, isPlaying, goTo, replay, toggleAutoplay } = useSceneMotion(beats)
  const current = beats[beat]

  // Beat 3 mini-sequence (button-driven): a freshly resolved incident in
  // "Your Brain" is anonymized (stage 1) and then surfaces as the NEW
  // signature in the "Shared Brain" (stage 2).
  const [brainStage, setBrainStage] = useState(0)
  const brainTimer = useRef(null)
  const runContribution = useCallback(() => {
    if (brainTimer.current) clearTimeout(brainTimer.current)
    setBrainStage(1)
    brainTimer.current = setTimeout(() => setBrainStage(2), 1400)
  }, [])
  useEffect(() => {
    setBrainStage(0)
    if (brainTimer.current) clearTimeout(brainTimer.current)
    return () => { if (brainTimer.current) clearTimeout(brainTimer.current) }
  }, [beat, playKey])

  // Publish the "contribute pattern" trigger to the nav bar, but only on the
  // Elastic Brain beat.
  const brainAction = useMemo(() => (
    beat === 2
      ? {
        onClick: runContribution,
        icon: brainStage === 2 ? faCheck : faPlay,
        title: brainStage === 0 ? 'Contribute anonymized pattern'
          : brainStage === 1 ? 'Extracting pattern…' : 'Pattern contributed',
        disabled: brainStage !== 0,
      }
      : null
  ), [beat, brainStage, runContribution])

  const accent = isDark ? '#48EFCF' : '#0B64DD'
  const onAccent = isDark ? '#04140f' : '#ffffff'
  const headText = isDark ? 'text-white' : 'text-elastic-dark-ink'
  const mutedText = isDark ? 'text-white/60' : 'text-elastic-dark-ink/65'
  const cardBase = isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white/90 border-elastic-dev-blue/10'
  const iconMuted = isDark ? 'rgba(255,255,255,0.62)' : 'rgba(16,28,63,0.6)'
  // Telemetry reads blue, artifacts read coral — matching the reference diagram
  // while the agent/context/brain layers stay on the scene accent.
  const toneColor = (t) => (t === 'coral' ? '#FF957D' : isDark ? '#5AA9FF' : '#0B64DD')

  useEffect(() => {
    const el = rootRef.current
    if (!el) return undefined
    const anim = animate(el.querySelectorAll('.reveal'), {
      opacity: [0, 1], translateY: [16, 0], duration: 460, delay: stagger(70), easing: 'easeOutQuad',
    })
    const up = el.querySelectorAll('.rise')
    const upAnim = up.length ? animate(up, { opacity: [0, 1], translateY: [28, 0], duration: 620, delay: stagger(120, { start: 250 }), easing: 'easeOutCubic' }) : null
    const bars = el.querySelectorAll('[data-funnel]')
    const barAnim = bars.length ? animate(bars, { width: (b) => ['0%', `${b.getAttribute('data-funnel')}%`], duration: 900, delay: stagger(150, { start: 200 }), easing: 'easeOutCubic' }) : null
    return () => { anim?.pause?.(); upAnim?.pause?.(); barAnim?.pause?.() }
  }, [beat, playKey])

  const groupCard = (title, eyebrowText, body, items, highlight) => (
    <div className={`rise rounded-2xl border flex flex-col p-4 min-h-0 ${cardBase}`} style={highlight ? { borderColor: `${accent}45` } : undefined}>
      <div className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: accent }}>{eyebrowText}</div>
      <div className={`font-bold text-sm leading-tight ${headText}`}>{title}</div>
      <p className={`text-[11px] leading-snug mt-0.5 mb-3 ${mutedText}`}>{body}</p>
      <div className="grid grid-cols-2 gap-2.5 my-auto">
        {items.map((it, i) => (
          <div key={i} className="rounded-lg px-3.5 py-3 flex flex-col justify-center" style={{ backgroundColor: `${accent}0f` }}>
            <div className={`text-base font-bold leading-tight ${headText}`}>{it.name}</div>
            <div className={`text-xs leading-snug mt-1 ${mutedText}`}>{it.sub}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // A labelled layer inside the cluster (Agent / Context / Telemetry / Artifacts).
  const clusterCard = ({ node, color, name, sub, label, chips }) => (
    <div key={node} data-node={node} className="rounded-xl border p-3" style={{ borderColor: `${color}59`, backgroundColor: `${color}0e` }}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-bold text-sm uppercase tracking-wide" style={{ color }}>{name}</span>
          {sub && <span className={`text-[11px] ${mutedText}`}>{sub}</span>}
        </div>
        <span className="text-[9px] font-bold uppercase tracking-wider shrink-0 mt-0.5" style={{ color: `${color}99` }}>{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {chips.map((c, i) => (
          <span key={i} className="text-[11px] rounded px-2 py-0.5" style={{ backgroundColor: `${color}1f`, color }}>{c}</span>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-full w-full flex flex-col px-8 pt-2 pb-3 overflow-hidden">
      <div className="max-w-[1340px] mx-auto w-full flex-1 flex flex-col min-h-0">
        <div ref={rootRef} className="flex-1 min-h-0 flex flex-col" key={`${beat}-${playKey}`}>
          <div className="reveal">
            <SceneHeader eyebrow={current.eyebrow || eyebrow} titlePlain={current.titlePlain} titleAccent={current.titleAccent} subtitle={current.subtitle} />
          </div>

          {/* Beat 1 — Context Layer above every stack */}
          {beat === 0 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-3">
              {/* Context Layer box */}
              <div className="reveal rounded-2xl border p-4 text-center" style={{ borderColor: `${accent}66`, background: `linear-gradient(160deg, ${accent}1c, ${accent}06)` }}>
                <div className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: accent }}>Elastic · Context Layer</div>
                <div className={`font-headline font-extrabold text-xl leading-tight mb-1 ${headText}`}>Failure Signatures · Knowledge Indicators · System Model · Pattern Library</div>
                <p className={`text-xs mb-3 ${mutedText}`}>Accumulated intelligence built from every telemetry source you own.</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {CONTEXT_CHIPS.map((c, i) => (
                    <span key={i} className="text-[11px] font-semibold rounded-full px-2.5 py-1" style={{ backgroundColor: `${accent}18`, color: accent }}>{c}</span>
                  ))}
                </div>
              </div>

              {/* Upward arrows */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                {['Raw telemetry → KI extraction · System model', 'Alerts & events → Signal augmentation'].map((t, i) => (
                  <div key={i} className="flex flex-col items-center gap-0.5">
                    <FontAwesomeIcon icon={faArrowUpLong} style={{ color: `${accent}aa` }} />
                    <span className={`text-[9px] font-bold uppercase tracking-wider ${mutedText}`}>{t}</span>
                  </div>
                ))}
              </div>

              {/* Two source groups */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                {groupCard('Data stays where it is. We read directly from any store.', 'Telemetry Datastores', 'No re-indexing, no lift-and-shift — the model reads your telemetry in place.', TELEMETRY, true)}
                {groupCard('No migration. We read alerts and anomalies from your existing stack.', 'External Monitoring Signals', 'Datadog, Grafana, CloudWatch, and Dynatrace signals augment the model as-is.', EXTERNAL, false)}
              </div>
            </div>
          )}

          {/* Beat 2 — Architecture: the cluster stack, external touchpoints, and
              the shared Elastic Brain, wired into a closed learning loop. The
              grid keeps the external cards on the same rows as the Agent and
              Context layers, so their connectors run straight through the middle. */}
          {beat === 1 && (
            <div ref={archRef} className="reveal relative flex-1 min-h-0">
              <FlowConnectors containerRef={archRef} edges={ARCH_EDGES} playKey={playKey} defaultColor={accent} animateIn={false} />

              <div
                className="relative z-10 h-full grid gap-x-6 gap-y-1.5 content-center items-center"
                style={{ gridTemplateColumns: '0.82fr 2.05fr 0.82fr', gridTemplateRows: 'repeat(6, auto)' }}
              >
                {/* Cluster frame — spans the whole centre column */}
                <div className="rounded-2xl border" style={{ gridColumn: 2, gridRow: '1 / -1', alignSelf: 'stretch', borderColor: `${accent}33`, background: isDark ? 'rgba(72,239,207,0.03)' : 'rgba(11,100,221,0.02)' }} />

                {/* Cluster title */}
                <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-center pt-3 px-3" style={{ gridColumn: 2, gridRow: 1, color: `${accent}cc` }}>
                  User&apos;s Elastic Cluster
                </div>

                {/* Agent layer + External Agents (row 2) */}
                <div className="px-3" style={{ gridColumn: 2, gridRow: 2 }}>
                  {clusterCard({ node: 'agent', color: accent, name: AGENT_LAYER.name, label: AGENT_LAYER.label, chips: AGENT_LAYER.chips })}
                </div>
                <div className="relative z-10" style={{ gridColumn: 1, gridRow: 2 }}>
                  <div data-node="ext-agents" className={`rounded-2xl border p-3 ${cardBase}`}>
                    <div className={`text-xs font-bold mb-2.5 ${headText}`}>External Agents</div>
                    <div className="grid grid-cols-3 gap-2">
                      {EXT_AGENTS.map((a, i) => (
                        <div key={i} className="flex flex-col items-center gap-1">
                          <span className="w-full h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}12`, color: iconMuted }}>
                            <FontAwesomeIcon icon={a.icon} />
                          </span>
                          <span className={`text-[9px] ${mutedText}`}>{a.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Arrow (row 3) */}
                <div className="flex justify-center" style={{ gridColumn: 2, gridRow: 3 }}>
                  <FontAwesomeIcon icon={faArrowUpLong} className="text-xs" style={{ color: `${accent}99` }} />
                </div>

                {/* Context layer + External systems + Elastic Brain (row 4) */}
                <div className="px-3" style={{ gridColumn: 2, gridRow: 4 }}>
                  {clusterCard({ node: 'context', color: accent, name: CONTEXT_LAYER.name, sub: CONTEXT_LAYER.sub, label: CONTEXT_LAYER.label, chips: CONTEXT_LAYER.chips })}
                </div>
                <div className="relative z-10" style={{ gridColumn: 1, gridRow: 4 }}>
                  <div data-node="ext-systems" className={`rounded-2xl border p-3 ${cardBase}`}>
                    <div className={`text-xs font-bold ${headText}`}>External systems</div>
                    <div className={`text-[10px] mb-2.5 ${mutedText}`}>per user</div>
                    <div className="grid grid-cols-3 gap-2">
                      {EXT_SYSTEMS.map((icon, i) => (
                        <span key={i} className="h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${accent}12`, color: iconMuted }}>
                          <FontAwesomeIcon icon={icon} />
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative z-10" style={{ gridColumn: 3, gridRow: 4 }}>
                  <div data-node="brain" className="rounded-2xl border p-4" style={{ borderColor: `${accent}66`, background: `linear-gradient(160deg, ${accent}1f, ${accent}08)` }}>
                    <div className="flex items-center gap-2 mb-1">
                      <FontAwesomeIcon icon={faBrain} className="text-lg" style={{ color: accent }} />
                      <span className={`font-bold text-base ${headText}`}>Elastic Brain</span>
                    </div>
                    <div className={`text-xs ${mutedText}`}>global · shared</div>
                  </div>
                </div>

                {/* Arrow (row 5) */}
                <div className="flex justify-center" style={{ gridColumn: 2, gridRow: 5 }}>
                  <FontAwesomeIcon icon={faArrowUpLong} className="text-xs" style={{ color: `${accent}99` }} />
                </div>

                {/* Data layer (row 6) */}
                <div className="px-3 pb-3" style={{ gridColumn: 2, gridRow: 6 }}>
                  <div className={`text-[9px] font-bold uppercase tracking-wider mb-1.5 ${mutedText}`}>Data Layer</div>
                  <div className="grid grid-cols-2 gap-3">
                    {DATA_CARDS.map((dc) => clusterCard({ node: dc.id, color: toneColor(dc.tone), name: dc.name, sub: dc.sub, label: dc.label, chips: dc.chips }))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 3 — Elastic Brain */}
          {beat === 2 && (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              <p className={`reveal text-center text-sm md:text-base leading-snug max-w-4xl mx-auto shrink-0 ${mutedText}`}>
                Every incident your team resolves becomes a <span className={`font-semibold ${headText}`}>failure signature</span> — an anonymized pattern the entire network can learn from.{' '}
                <span className="font-semibold" style={{ color: accent }}>Your data never leaves. The knowledge does.</span>
              </p>

              <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[0.8fr_auto_1.55fr] gap-4 items-stretch">
                {/* Your brain */}
                <div className="reveal rounded-2xl border flex flex-col p-4 min-h-0" style={{ borderColor: `${accent}55`, background: isDark ? 'rgba(72,239,207,0.05)' : 'rgba(11,100,221,0.04)' }}>
                  <span className="text-[11px] font-bold uppercase tracking-wider rounded px-2 py-1 self-start mb-3" style={{ backgroundColor: `${accent}1f`, color: accent }}>Your Brain</span>
                  <ul className="flex flex-col gap-2.5">
                    {YOUR_BRAIN.map((b, i) => (
                      <li key={i} className={`flex items-start gap-2 text-sm leading-snug ${headText}`}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex flex-col gap-2.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider rounded px-2.5 py-1.5 self-start flex items-center gap-1.5" style={{ backgroundColor: `${accent}18`, color: accent }}>
                      <FontAwesomeIcon icon={faLock} /> Never leaves your environment
                    </span>
                    {/* Freshly resolved incident being distilled into a pattern */}
                    <div className="rounded-lg border p-2.5" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 text-elastic-dev-blue" style={{ backgroundColor: accent }}>Resolved</span>
                        <span className={`text-[11px] font-mono ${headText}`}>k8s · checkout-svc · OOMKilled</span>
                      </div>
                      {brainStage === 0 && <div className={`text-[10px] font-mono ${mutedText}`}>resolved · ready to contribute</div>}
                      {brainStage === 1 && <div className={`text-[10px] font-mono motion-blink ${mutedText}`}>extracting pattern…</div>}
                      {brainStage === 2 && <div className="text-[10px] font-mono font-semibold" style={{ color: accent }}>pattern contributed → shared brain ✓</div>}
                    </div>
                  </div>
                </div>

                {/* Opt-in transform */}
                <div className="reveal flex flex-col items-center justify-center gap-3 px-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: accent }}>Opt-in</span>
                  <FontAwesomeIcon icon={faArrowRightLong} className={brainStage === 1 ? 'motion-blink' : ''} style={{ color: `${accent}aa` }} />
                  <div className="flex flex-col items-center gap-1.5">
                    {OPT_IN_STEPS.map((s, i) => (
                      <span key={i} className={`text-[11px] font-mono ${mutedText}`}>{s}</span>
                    ))}
                  </div>
                </div>

                {/* Shared brain */}
                <div className="reveal rounded-2xl border flex flex-col p-4 min-h-0 overflow-hidden" style={{ borderColor: `${accent}59`, background: `linear-gradient(160deg, ${accent}12, ${accent}05)` }}>
                  <div className="flex items-center gap-2.5 mb-2.5 shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider rounded px-2 py-1" style={{ backgroundColor: `${accent}1f`, color: accent }}>Shared Brain</span>
                    <span className={`text-[11px] font-mono ${mutedText}`}>cross-customer · anonymized · aggregate only</span>
                  </div>
                  <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
                    {SIGNATURES.map((sig) => {
                      if (sig.isNew && brainStage < 2) return null
                      return (
                      <div
                        key={sig.id}
                        className={`rounded-xl border p-3 font-mono ${sig.isNew ? 'motion-msg-in' : ''}`}
                        style={{
                          borderColor: sig.isNew ? `${accent}99` : `${accent}33`,
                          backgroundColor: isDark ? 'rgba(0,0,0,0.28)' : 'rgba(255,255,255,0.75)',
                          boxShadow: sig.isNew ? `0 0 0 1px ${accent}55, 0 0 18px ${accent}33` : undefined,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            {sig.isNew && <span className="text-[9px] font-bold rounded px-1.5 py-0.5 text-elastic-dev-blue" style={{ backgroundColor: accent }}>NEW</span>}
                            <span className={`text-[10px] uppercase tracking-wider ${mutedText}`}>Failure signature</span>
                            <span className="text-[13px] font-bold truncate" style={{ color: accent }}>{sig.id}</span>
                          </div>
                          <span className={`text-[10px] whitespace-nowrap shrink-0 ${mutedText}`}>{sig.meta}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          {sig.rows.map((r) => (
                            <div key={r.k} className="grid grid-cols-[118px_1fr] gap-2 text-[11px] leading-snug">
                              <span className={`${mutedText} truncate`}>{r.k}</span>
                              <span className={headText}>{r.v}</span>
                            </div>
                          ))}
                          {sig.fixes.map((f, i) => (
                            <div key={i} className="grid grid-cols-[118px_1fr] gap-2 text-[11px] leading-snug">
                              <span className={mutedText}>{f.label}</span>
                              <span>
                                <span className={headText}>{f.v}</span>
                                {f.pct && <> → <span className="font-bold" style={{ color: accent }}>{f.pct}</span></>}
                                {f.note && <span className={` ${mutedText}`}> {f.note}</span>}
                              </span>
                            </div>
                          ))}
                          <div className="grid grid-cols-[118px_1fr] gap-2 text-[10px] leading-snug mt-1.5 pt-1.5 border-t" style={{ borderColor: `${accent}1f` }}>
                            <span className={`${mutedText} truncate`}>what&apos;s stripped</span>
                            <span className={`italic ${mutedText}`}>{sig.stripped}</span>
                          </div>
                        </div>
                      </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Beat 4 — AI economics funnel: petabytes distilled to the kilobytes
              of meaning that actually reach the LLM. Left-anchored bars taper
              down; each layer's label, note, and reduction sit to the right. */}
          {beat === 3 && (
            <div className="flex-1 min-h-0 flex flex-col justify-center gap-4 w-full">
              {FUNNEL.map((f, i) => (
                <div key={i} className="reveal flex items-center gap-6">
                  {/* Left: the tapering bar */}
                  <div className="basis-[54%] shrink-0 flex">
                    <div
                      data-funnel={f.width}
                      className="relative h-16 rounded-xl flex items-center gap-3 px-4 overflow-hidden shadow-sm"
                      style={{
                        width: 0,
                        minWidth: 150,
                        border: f.llm ? 'none' : `1px solid ${accent}${i === 0 ? '33' : '55'}`,
                        background: f.llm
                          ? `linear-gradient(135deg, ${accent}, ${accent}c0)`
                          : `${accent}${i === 0 ? '12' : '20'}`,
                      }}
                    >
                      <span
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0"
                        style={{ backgroundColor: f.llm ? 'rgba(255,255,255,0.22)' : `${accent}26`, color: f.llm ? onAccent : accent }}
                      >
                        <FontAwesomeIcon icon={f.icon} />
                      </span>
                      <div className="flex items-baseline gap-1.5 leading-none">
                        <span className="font-headline font-extrabold text-2xl" style={{ color: f.llm ? onAccent : accent }}>{f.sym}</span>
                        <span
                          className={`text-xs font-semibold ${f.llm ? '' : mutedText}`}
                          style={f.llm ? { color: onAccent, opacity: 0.82 } : undefined}
                        >
                          {f.scale}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: label + note + reduction */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-bold text-base leading-tight ${headText}`}>{f.name}</span>
                      {f.llm && (
                        <span className="text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5" style={{ backgroundColor: accent, color: onAccent }}>
                          Reaches the LLM
                        </span>
                      )}
                    </div>
                    <p className={`text-sm leading-snug mt-0.5 ${mutedText}`}>{f.note}</p>
                    {f.reduce && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs font-bold" style={{ color: accent }}>
                        <FontAwesomeIcon icon={faArrowDownLong} />
                        <span>{f.reduce}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="reveal flex items-center justify-center gap-3 rounded-2xl border px-6 py-3 mt-1" style={{ borderColor: `${accent}45`, backgroundColor: `${accent}12` }}>
                <FontAwesomeIcon icon={faCompress} style={{ color: accent }} />
                <p className={`text-base md:text-lg font-semibold ${headText}`}>Token efficiency is a core differentiator — meaning, not raw data, reaches the LLM.</p>
              </div>
            </div>
          )}
        </div>

        <SceneStepper beats={beats} beat={beat} onGo={goTo} onReplay={replay} isPlaying={isPlaying} onTogglePlay={toggleAutoplay} action={brainAction} />
      </div>
    </div>
  )
}

export default NightshiftArchScene
