import { animate, stagger } from 'animejs'
import { useState, useCallback, useRef, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faShieldHalved, faBell, faTriangleExclamation, faBolt,
  faCheck, faRobot, faBook,
  faCircleCheck, faCircleXmark, faLock,
  faWandMagicSparkles, faMagnifyingGlass,
  faUser, faServer, faGear, faClock,
} from '@fortawesome/free-solid-svg-icons'

// ─── Stage Configuration ─────────────────────────────────────────────
const DEFAULT_STAGES = [
  { id: 'attack-discovery',    label: 'Attack Discovery'    },
  { id: 'threat-hunting',      label: 'AI Assistant'        },
  { id: 'automated-workflows', label: 'Automated Response'  },
]

const DEFAULT_STAGE_SUBTITLES = [
  'Prioritize Attacks, Not Alerts',
  'Make every analyst a power user',
  'Automated response at machine speed',
]

// ─── Severity Colors ─────────────────────────────────────────────────
const severityColors = {
  critical: '#F04E98',
  high:     '#FF957D',
  medium:   '#FEC514',
  low:      '#48EFCF',
}

// ─── Attack Stories ──────────────────────────────────────────────────
const DEFAULT_ATTACK_STORIES = [
  {
    id: 1,
    title: 'Credential Compromise Campaign',
    summary: 'Brute force attempts on DC-PROD-01 succeeded, followed by credential dumping and Golden Ticket creation targeting domain admin accounts.',
    mitre: ['T1110 Brute Force', 'T1003 Credential Dumping', 'T1558 Golden Ticket'],
    entities: ['DC-PROD-01', 'DC-PROD-02', '10.0.1.45'],
    severity: 'critical',
    alertCount: 6,
    color: '#F04E98',
  },
  {
    id: 2,
    title: 'Malware Lateral Spread',
    summary: 'Malware detected on WS-PC-0142 with DLL injection, spreading laterally to 10.0.3.22 via SMB. Ransomware IOCs found on WS-PC-0089.',
    mitre: ['T1059 Execution', 'T1055 Process Injection', 'T1021 Lateral Movement'],
    entities: ['WS-PC-0142', '10.0.3.22', 'WS-PC-0089'],
    severity: 'critical',
    alertCount: 5,
    color: '#FF957D',
  },
  {
    id: 3,
    title: 'Data Exfiltration via C2 Channel',
    summary: 'C2 beacon from 10.0.1.87 communicating with external IP. Data exfiltration from SRV-FILE-03 detected through anomalous traffic patterns.',
    mitre: ['T1071 Application Layer Protocol', 'T1041 Exfiltration Over C2'],
    entities: ['10.0.1.87', 'SRV-FILE-03', 'FW-EDGE-01'],
    severity: 'high',
    alertCount: 4,
    color: '#0B64DD',
  },
  {
    id: 4,
    title: 'Web Server Persistence',
    summary: 'Webshell uploaded to SRV-WEB-02 with suspicious process execution and registry modifications to establish persistence.',
    mitre: ['T1505 Server Software Component', 'T1112 Modify Registry'],
    entities: ['SRV-WEB-02', 'WS-PC-0201'],
    severity: 'high',
    alertCount: 3,
    color: '#48EFCF',
  },
]

// ─── Chat Script ─────────────────────────────────────────────────────
const DEFAULT_CHAT_SCRIPT = [
  { role: 'user',  text: 'Investigate the credential compromise on DC-PROD-01. What happened?' },
  {
    role: 'agent',
    text: 'I analyzed 6 related alerts. Here\'s what I found:\n\n• Brute force from 10.0.1.45 at 02:14 UTC\n• Successful admin logon 3 minutes later\n• LSASS credential dump detected\n• Golden Ticket forged for domain admin\n\nThis matches attack patterns for APT29 TTPs.',
  },
  { role: 'user', text: 'What remediation steps should we take?' },
  {
    role: 'agent',
    text: 'Based on your internal runbook (KB-SEC-2024-017):\n\n1. Reset krbtgt account password (twice)\n2. Isolate DC-PROD-01 from network\n3. Force password reset for all admin accounts\n4. Review all Kerberos tickets issued in last 24h\n5. Enable enhanced monitoring on domain controllers',
    hasKB: true,
  },
]

// ─── Knowledge Bases ─────────────────────────────────────────────────
const DEFAULT_KNOWLEDGE_BASES = [
  { name: 'Internal Runbooks',       icon: faBook,           items: 'KB-SEC-2024-017 · 23 docs'  },
  { name: 'Threat Intel Feeds',      icon: faShieldHalved,   items: 'MITRE ATT&CK · CrowdStrike' },
  { name: 'Detection Rule Library',  icon: faWandMagicSparkles, items: 'Sigma · YARA · 1,240 rules'   },
  { name: 'CVE / Vulnerability DB',  icon: faMagnifyingGlass, items: 'NVD · Tenable · Qualys'    },
  { name: 'Asset & Network Topology',icon: faServer,         items: 'CMDB · 4,821 assets indexed' },
]

// ─── Available Workflows ─────────────────────────────────────────────
const DEFAULT_WORKFLOWS = [
  { id: 'isolate-host', name: 'Isolate Host',             type: 'Response',      description: 'Quarantine compromised endpoints',  icon: faLock,            color: '#F04E98', active: true },
  { id: 'search-siem',  name: 'Search Across SIEM',       type: 'ES|QL Query',   description: 'Query all data sources for IOC matches',          icon: faMagnifyingGlass, color: '#48EFCF' },
  { id: 'block-ip',     name: 'Block IP at Firewall',     type: 'Response',      description: 'Add malicious IPs to network deny list',          icon: faShieldHalved,    color: '#F04E98' },
  { id: 'disable-user', name: 'Disable User Account',     type: 'Response',      description: 'Suspend compromised user credentials',            icon: faUser,            color: '#F04E98' },
  { id: 'enrich-intel', name: 'Enrich with Threat Intel', type: 'Enrichment',    description: 'Cross-reference IOCs with threat feeds',          icon: faMagnifyingGlass, color: '#0B64DD' },
  { id: 'yara-scan',    name: 'Scan with OSQuery',        type: 'Investigation', description: 'Deep file analysis on target hosts',              icon: faBolt,            color: '#FEC514' },
  { id: 'jira-ticket',  name: 'Create Jira Ticket',       type: 'Notification',  description: 'Auto-generate incident tickets',                  icon: faBell,            color: '#FF957D' },
]

const APPROVAL_HIGHLIGHT_IDS = new Set(['isolate-host', 'search-siem', 'jira-ticket'])

const workflowTypeBadgeColor = {
  'Response':      { bg: 'bg-elastic-pink/15',   text: 'text-elastic-pink'   },
  'Enrichment':    { bg: 'bg-elastic-blue/15',   text: 'text-elastic-blue'   },
  'Investigation': { bg: 'bg-elastic-yellow/15', text: 'text-elastic-yellow' },
  'ES|QL Query':   { bg: 'bg-elastic-teal/15',   text: 'text-elastic-teal'   },
  'Notification':  { bg: 'bg-elastic-poppy/15',  text: 'text-elastic-poppy'  },
}

// ─── Terminal Commands ────────────────────────────────────────────────
const DEFAULT_TERMINAL_COMMANDS = [
  '$ elastic-agent isolate --host WS-PC-0142 --force',
  '[INFO] Connecting to Elastic Security endpoint...',
  '[INFO] Host WS-PC-0142 found — Agent v8.15.1',
  '[EXEC] Blocking all network interfaces...',
  '[EXEC] Preserving forensic artifacts...',
  '[OK]   Host WS-PC-0142 isolated successfully',
]

// ─── MITRE Tactics shown during AI analysis ───────────────────────────
const DEFAULT_ANALYZE_TACTICS = [
  'T1110 — Brute Force',
  'T1003 — Credential Dumping',
  'T1558 — Golden Ticket',
  'T1021 — Lateral Movement',
  'T1041 — Data Exfiltration',
]

// Delay (ms) for each tactic — synced to when its corresponding node is revealed
// conn stagger = 700ms, to-node arrives at connDelay + 420ms
const TACTIC_DELAYS = [
   100,  // T1110: 10.0.1.45 surfaces as from-node of conn 0
   470,  // T1003: DC-PROD-01 revealed as to-node of conn 0  (0   + 420 + 50)
  1170,  // T1558: Golden Ticket revealed as to-node of conn 1 (700 + 420 + 50)
  1870,  // T1021: WS-PC-0142 revealed as to-node of conn 2 (1400 + 420 + 50)
  3970,  // T1041: C2 Beacon revealed as to-node of conn 5   (3500 + 420 + 50)
]

// ─── Node Graph: scattered alert identifiers ──────────────────────────
// All nodes rendered as gray dots during flooding.
// Only nodes with selected:true get revealed as labeled pills during correlation.
const graphNodes = [
  // ── 6 selected "key" nodes — AI will surface these (attack chain order) ──
  { id: 1,  label: '10.0.1.45',   severity: 'critical', selected: true, x: 14, y: 32 },
  { id: 2,  label: 'DC-PROD-01',  severity: 'critical', selected: true, x: 42, y: 18 },
  { id: 3,  label: 'WS-PC-0142',  severity: 'high',     selected: true, x: 18, y: 72 },
  { id: 4,  label: '10.0.3.22',   severity: 'high',     selected: true, x: 54, y: 68 },
  { id: 5,  label: 'SRV-FILE-03', severity: 'high',     selected: true, x: 85, y: 55 },
  { id: 6,  label: 'C2 Beacon',   severity: 'medium',   selected: true, x: 50, y: 44 },
  // ── Background gray dots (sea of 80 alerts, no labels) ──────────────────
  { id: 7,  severity: 'low',    x:  8, y: 14 },
  { id: 8,  severity: 'medium', x: 26, y:  8 },
  { id: 9,  severity: 'medium', x: 62, y: 12 },
  { id: 10, severity: 'high',   x: 78, y:  8 },
  { id: 11, severity: 'low',    x: 90, y: 20 },
  { id: 12, severity: 'medium', x:  5, y: 48 },
  { id: 13, severity: 'low',    x: 32, y: 44 },
  { id: 14, severity: 'high',   x: 68, y: 38 },
  { id: 15, severity: 'medium', x: 88, y: 42 },
  { id: 16, severity: 'low',    x: 10, y: 58 },
  { id: 17, severity: 'medium', x: 36, y: 55 },
  { id: 18, severity: 'high',   x: 72, y: 60 },
  { id: 19, severity: 'low',    x:  4, y: 82 },
  { id: 20, severity: 'medium', x: 28, y: 84 },
  { id: 21, severity: 'low',    x: 46, y: 80 },
  { id: 22, severity: 'medium', x: 62, y: 86 },
  { id: 23, severity: 'low',    x: 78, y: 80 },
  { id: 24, severity: 'high',   x: 93, y: 70 },
  { id: 25, severity: 'medium', x: 20, y: 24 },
  { id: 26, label: 'Golden Ticket', severity: 'critical', selected: true, x: 76, y: 26 },
  { id: 27, severity: 'medium', x: 40, y: 60 },
  { id: 28, severity: 'low',    x: 60, y: 24 },
  { id: 29, severity: 'medium', x: 90, y: 35 },
  { id: 30, severity: 'high',   x: 35, y: 75 },
  { id: 31, severity: 'low',    x: 55, y: 20 },
  { id: 32, severity: 'medium', x: 70, y: 48 },
]

// Attack-chain connections — drawn one at a time to tell the story
const selectedConnections = [
  { from: 1, to: 2, color: '#F04E98' }, // attacker IP → compromised DC
  { from: 2, to: 26, color: '#F04E98' }, // DC → Golden Ticket (credential escalation branch)
  { from: 2, to: 3, color: '#F04E98' }, // DC → lateral spread to workstation
  { from: 3, to: 4, color: '#FF957D' }, // workstation → pivot point
  { from: 4, to: 5, color: '#0B64DD' }, // pivot → file server
  { from: 5, to: 6, color: '#0B64DD' }, // file server → C2 exfil channel
]

const DEFAULT_HOST_DETAILS = [
  { label: 'Hostname',   value: 'WS-PC-0142'     },
  { label: 'IP Address', value: '10.0.3.22'      },
  { label: 'OS',         value: 'Windows 11 Pro' },
  { label: 'User',       value: 'j.martinez'     },
  { label: 'Agent',      value: 'v8.15.1'        },
]

const DEFAULT_PIPELINE_STEPS = {
  threatDetected:   { title: 'Threat Detected',   subtitle: 'Isolate Host WS-PC-0142' },
  analystApproval:  { title: 'Analyst Approval',  subtitle: 'SOC Analyst: J. Mitchell' },
  execute: {
    titleIdle: 'Execute', titleDone: 'Isolated', titleDenied: 'Blocked',
    subtitleIdle: 'Response action', subtitleDone: 'WS-PC-0142 quarantined', subtitleDenied: 'Analyst override',
  },
}

const DEFAULT_MTTR = {
  label: 'MTTR',
  beforeLabel: 'Before',
  beforeValue: '~4h',
  afterLabel: 'After',
  afterValue: '14 min',
  improvement: '↓ 94% faster',
}


// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

function SecurityScene({ externalStage, onStageChange, playSignal = 0, phaseAdvanceSignal = 0, onAlertPhaseChange, metadata = {} }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  const eyebrow = metadata.eyebrow || 'Elastic Security'
  const titlePlain = metadata.titlePlain || 'Modernizing Cyber Defense with '
  const titleAccent = metadata.titleAccent || 'AI-Driven Efficiency'
  const stageSubtitles = metadata.stageSubtitles || DEFAULT_STAGE_SUBTITLES
  const stages = (metadata.stages || DEFAULT_STAGES).map((s, i) => ({ ...(DEFAULT_STAGES[i] || {}), ...s }))
  const attackStories = (metadata.attackStories || DEFAULT_ATTACK_STORIES).map((s, i) => ({ ...(DEFAULT_ATTACK_STORIES[i] || {}), ...s }))
  const chatScript = (metadata.chatScript || DEFAULT_CHAT_SCRIPT).map((m, i) => ({ ...(DEFAULT_CHAT_SCRIPT[i] || {}), ...m }))
  const knowledgeBases = (metadata.knowledgeBases || DEFAULT_KNOWLEDGE_BASES).map((kb, i) => ({ ...(DEFAULT_KNOWLEDGE_BASES[i] || {}), ...kb }))
  const availableWorkflows = (metadata.workflows || DEFAULT_WORKFLOWS).map((wf, i) => ({ ...(DEFAULT_WORKFLOWS[i] || {}), ...wf }))
  const terminalCommands = metadata.terminalCommands || DEFAULT_TERMINAL_COMMANDS
  const analyzeTactics = metadata.analyzeTactics || DEFAULT_ANALYZE_TACTICS
  const hostDetails = (metadata.hostDetails || DEFAULT_HOST_DETAILS).map((item, i) => ({ ...(DEFAULT_HOST_DETAILS[i] || {}), ...item }))
  const pipelineSteps = {
    threatDetected:  { ...DEFAULT_PIPELINE_STEPS.threatDetected,  ...(metadata.pipelineSteps?.threatDetected  || {}) },
    analystApproval: { ...DEFAULT_PIPELINE_STEPS.analystApproval, ...(metadata.pipelineSteps?.analystApproval || {}) },
    execute:         { ...DEFAULT_PIPELINE_STEPS.execute,         ...(metadata.pipelineSteps?.execute         || {}) },
  }
  const mttr = { ...DEFAULT_MTTR, ...(metadata.mttr || {}) }

  const stage0Label = metadata.stage0Label || stages[0]?.label || 'Attack Discovery'
  const groupedSummaryBadge = metadata.groupedSummaryBadge || '80 alerts → 4 attack stories'
  const attackDiscoveryIdleHint = metadata.attackDiscoveryIdleHint || 'See how AI turns raw alerts into clear attack stories.'
  const mitreSectionLabel = metadata.mitreSectionLabel || 'MITRE ATT&CK'
  const entitiesSectionLabel = metadata.entitiesSectionLabel || 'Affected Entities'
  const alertsSuffix = metadata.alertsSuffix || 'alerts'
  const storyFooterPrefix = metadata.storyFooterPrefix || 'Attack stories triaged and routed to analysts via'
  const jiraLabel = metadata.jiraLabel || 'Jira'
  const servicenowLabel = metadata.servicenowLabel || 'ServiceNow'

  const stage1Label = metadata.stage1Label || stages[1]?.label || 'AI Assistant'
  const huntingBadge = metadata.huntingBadge || 'Agent Builder'
  const assistantName = metadata.assistantName || 'Elastic AI Assistant'
  const assistantStatus = metadata.assistantStatus || 'Online'
  const huntingIdleHint = metadata.huntingIdleHint || 'AI-guided investigation starting...'
  const chatAgentLabel = metadata.chatAgentLabel || 'AI Assistant'
  const kbReferenceBadge = metadata.kbReferenceBadge || 'via KB-SEC-2024-017'
  const agentBuilderTitle = metadata.agentBuilderTitle || 'Agent Builder'
  const agentBuilderSubtitle = metadata.agentBuilderSubtitle || 'Agentic AI Configuration'
  const knowledgeBasesSectionLabel = metadata.knowledgeBasesSectionLabel || 'Connected Knowledge Bases'

  const stage2Label = metadata.stage2Label || 'Automated Response Workflows'
  const targetHostLabel = metadata.targetHostLabel || 'Target Host'
  const threatScoreLabel = metadata.threatScoreLabel || 'Threat Score'
  const threatScoreValue = metadata.threatScoreValue || '87'
  const approveLabel = metadata.approveLabel || 'Approve'
  const denyLabel = metadata.denyLabel || 'Deny'
  const terminalTitle = metadata.terminalTitle || 'elastic-response-workflow'
  const terminalIdleHint = metadata.terminalIdleHint || 'Waiting for workflow trigger...'
  const terminalAwaitingHint = metadata.terminalAwaitingHint || 'Awaiting approval to execute...'
  const terminalDeniedLine1 = metadata.terminalDeniedLine1 || '$ workflow halted — analyst denied action'
  const terminalDeniedLine2 = metadata.terminalDeniedLine2 || '[INFO] Manual investigation required'
  const workflowLibraryLabel = metadata.workflowLibraryLabel || 'Workflow Library'
  const workflowDoneBadge = metadata.workflowDoneBadge || 'Done'
  const workflowBlockedBadge = metadata.workflowBlockedBadge || 'Blocked'

  const timersRef     = useRef([])
  const approvalTimer = useRef(null)
  const chatContainerRef = useRef(null)

  // ─── Stage state (can be driven externally via props) ────────────────
  const [stage, setStage] = useState(0)

  // Sync external stage prop → internal state (App.jsx drives with Prev/Next)
  useEffect(() => {
    if (externalStage !== undefined) setStage(externalStage)
  }, [externalStage])

  // Always-current ref to avoid stale closures in signal effects
  const stageRef = useRef(stage)
  stageRef.current = stage

  // Call onStageChange when stage buttons inside the scene are clicked
  const changeStage = useCallback((s) => {
    setStage(s)
    onStageChange?.(s)
  }, [onStageChange])

  // ─── Phase 1: Attack Discovery ────────────────────────────────────────
  const [alertPhase,    setAlertPhase]    = useState('idle') // idle|flooding|connecting|grouped
  const [analyzeCount,  setAnalyzeCount]  = useState(0)
  const [visibleTactics,setVisibleTactics]= useState(0)
  const [selectedStory, setSelectedStory] = useState(null)
  const [revealedNodes, setRevealedNodes] = useState(new Set())

  // ─── Phase 2: Threat Hunting ──────────────────────────────────────────
  const [visibleMessages, setVisibleMessages] = useState([])
  const [isAgentTyping,   setIsAgentTyping]   = useState(false)
  const [huntingStarted,  setHuntingStarted]  = useState(false)
  const [kbHighlight,     setKbHighlight]     = useState([])

  // ─── Phase 3: Automated Response ──────────────────────────────────────
  const [workflowPhase,        setWorkflowPhase]        = useState('idle')
  const [terminalLines,        setTerminalLines]        = useState([])
  const [showMTTR,             setShowMTTR]             = useState(false)

  // alertPhaseRef must be declared AFTER alertPhase state above
  const alertPhaseRef = useRef(alertPhase)
  alertPhaseRef.current = alertPhase

  // ─── Animation refs ───────────────────────────────────────────────────
  const revealAnimatedRef   = useRef(new Set()) // tracks which nodes have had reveal animation run
  const stageContentRef   = useRef(null)
  const graphContainerRef = useRef(null)
  const nodeRefs          = useRef([])
  const svgLineRefs       = useRef([])
  const storyRefs         = useRef([])
  const storyFooterRef    = useRef(null)
  const threatScoreBarRef = useRef(null)
  const mttrRef           = useRef(null)

  // ─── Timer helpers ────────────────────────────────────────────────────
  const addTimer = useCallback((fn, delay) => {
    const id = setTimeout(fn, delay)
    timersRef.current.push(id)
    return id
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }, [])

  useEffect(() => () => {
    clearTimers()
    if (approvalTimer.current) clearTimeout(approvalTimer.current)
  }, [clearTimers])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [visibleMessages, isAgentTyping])

  // ─── Reset all phase state ────────────────────────────────────────────
  const resetPhaseStates = useCallback(() => {
    clearTimers()
    if (approvalTimer.current) { clearTimeout(approvalTimer.current); approvalTimer.current = null }
    setAlertPhase('idle')
    setAnalyzeCount(0)
    setVisibleTactics(0)
    setSelectedStory(null)
    setRevealedNodes(new Set())
    revealAnimatedRef.current = new Set()
    setVisibleMessages([])
    setIsAgentTyping(false)
    setHuntingStarted(false)
    setKbHighlight([])
    setWorkflowPhase('idle')
    setTerminalLines([])
    setShowMTTR(false)
  }, [clearTimers])


  // ─── Stage content fade-in on stage change ────────────────────────────
  // (handled inside the auto-loop effect below)

  // ─── Phase 1: Node entrance + SVG connection animation ───────────────
  useEffect(() => {
    if (alertPhase === 'flooding') {
      const els = nodeRefs.current.filter(Boolean)
      if (els.length) {
        animate(els, {
          opacity: [0, 1],
          translateY: [24, 0],
          duration: 525,
          delay: stagger(53),
          easing: 'easeOutBack',
        })
      }
    }

    if (alertPhase === 'connecting') {
      if (!graphContainerRef.current) return
      const { width, height } = graphContainerRef.current.getBoundingClientRect()
      if (!width || !height) return

      // Set pixel positions for each attack-chain connection line
      selectedConnections.forEach((conn, i) => {
        const el = svgLineRefs.current[i]
        if (!el) return
        const from = graphNodes.find(n => n.id === conn.from)
        const to   = graphNodes.find(n => n.id === conn.to)
        el.setAttribute('x1', (from.x / 100) * width)
        el.setAttribute('y1', (from.y / 100) * height)
        el.setAttribute('x2', (to.x   / 100) * width)
        el.setAttribute('y2', (to.y   / 100) * height)
      })

      // Draw connections one at a time; surface both endpoints as each line arrives
      selectedConnections.forEach((conn, i) => {
        const el    = svgLineRefs.current[i]
        const delay = i * 700

        if (el) {
          animate(el, { opacity: [0, 0.9], duration: 600, delay, easing: 'easeOutCubic' })
        }
        // Reveal from-node just before line draws, to-node as it lands
        addTimer(() => setRevealedNodes(prev => new Set([...prev, conn.from])), Math.max(0, delay - 80))
        addTimer(() => setRevealedNodes(prev => new Set([...prev, conn.to])),   delay + 420)
      })
    }

    if (alertPhase === 'grouped') {
      storyRefs.current.forEach((el, i) => {
        if (!el) return
        animate(el, { opacity: [0, 1], translateY: [20, 0], duration: 675, delay: i * 180, easing: 'easeOutCubic' })
      })
      if (storyFooterRef.current) {
        animate(storyFooterRef.current, { opacity: [0, 1], translateY: [10, 0], duration: 600, delay: 900, easing: 'easeOutCubic' })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertPhase])

  // ─── Animate each node the first time it is revealed as a labeled pill ─
  useEffect(() => {
    if (alertPhase !== 'connecting') return
    revealedNodes.forEach(id => {
      if (revealAnimatedRef.current.has(id)) return
      revealAnimatedRef.current.add(id)
      const idx = graphNodes.findIndex(n => n.id === id)
      const el  = nodeRefs.current[idx]
      // Element is already visible as a dot (opacity 1 from flooding); just pop scale to pill
      if (el) animate(el, { scale: [0.5, 1.15, 1], duration: 480, easing: 'easeOutBack' })
    })
  }, [revealedNodes, alertPhase])

  // ─── Live counter + MITRE tactics (during connecting phase) ──────────
  useEffect(() => {
    if (alertPhase !== 'connecting') { setAnalyzeCount(0); setVisibleTactics(0); return }

    let count = 0
    const intervalId = setInterval(() => {
      count = Math.min(count + Math.ceil(Math.random() * 5 + 1), 80)
      setAnalyzeCount(count)
      if (count >= 80) clearInterval(intervalId)
    }, 42)

    const tacticTimers = TACTIC_DELAYS.map(delay =>
      setTimeout(() => setVisibleTactics(t => t + 1), delay)
    )

    return () => {
      clearInterval(intervalId)
      tacticTimers.forEach(clearTimeout)
    }
  }, [alertPhase])

  // ─── Threat score bar ─────────────────────────────────────────────────
  useEffect(() => {
    if (workflowPhase === 'triggered' && threatScoreBarRef.current) {
      animate(threatScoreBarRef.current, { width: '87%', duration: 1500, easing: 'easeOutCubic', delay: 300 })
    }
    if (workflowPhase === 'idle' && threatScoreBarRef.current) {
      threatScoreBarRef.current.style.width = '0%'
    }
  }, [workflowPhase])

  // ─── MTTR card entrance ───────────────────────────────────────────────
  useEffect(() => {
    if (showMTTR && mttrRef.current) {
      animate(mttrRef.current, { opacity: [0, 1], translateY: [12, 0], duration: 750, easing: 'easeOutCubic' })
    }
  }, [showMTTR])

  // ─── Phase 1: Attack Discovery ────────────────────────────────────────
  const runAttackDiscovery = useCallback(() => {
    setAlertPhase('flooding')
    // Presenter advances manually: flooding → connecting → grouped
  }, [])

  // ─── Phase 2: AI Threat Hunting ───────────────────────────────────────
  const runThreatHunting = useCallback(() => {
    setHuntingStarted(true)
    addTimer(() => setVisibleMessages([chatScript[0]]), 300)
    addTimer(() => setIsAgentTyping(true), 1200)
    addTimer(() => {
      setIsAgentTyping(false)
      setVisibleMessages([chatScript[0], chatScript[1]])
      setKbHighlight([1])
    }, 3200)
    addTimer(() => setVisibleMessages([chatScript[0], chatScript[1], chatScript[2]]), 4500)
    addTimer(() => setIsAgentTyping(true), 5300)
    addTimer(() => {
      setIsAgentTyping(false)
      setVisibleMessages(chatScript)
      setKbHighlight([0, 1])
    }, 7300)
  }, [addTimer, chatScript])

  // ─── Phase 3: Execution chain ─────────────────────────────────────────
  const executeAfterApproval = useCallback(() => {
    setWorkflowPhase('approved')
    addTimer(() => {
      setWorkflowPhase('executing')
      terminalCommands.forEach((_, i) => {
        addTimer(() => setTerminalLines(prev => [...prev, terminalCommands[i]]), 300 + i * 350)
      })
    }, 600)
    const afterTerminal = 600 + 300 + terminalCommands.length * 350 + 500
    addTimer(() => setWorkflowPhase('done'),                            afterTerminal)
    addTimer(() => setWorkflowPhase('notifying'),                       afterTerminal + 600)
    addTimer(() => { setWorkflowPhase('complete'); setShowMTTR(true) }, afterTerminal + 2500)
  }, [addTimer, terminalCommands])

  // ─── Phase 3: Workflow trigger ────────────────────────────────────────
  const runWorkflow = useCallback(() => {
    setWorkflowPhase('triggered')
    addTimer(() => setWorkflowPhase('pending'), 1200)
    // Auto-approve after ~5s if presenter doesn't click
    approvalTimer.current = setTimeout(executeAfterApproval, 6400)
  }, [addTimer, executeAfterApproval])

  const approveWorkflow = useCallback(() => {
    if (approvalTimer.current) { clearTimeout(approvalTimer.current); approvalTimer.current = null }
    executeAfterApproval()
  }, [executeAfterApproval])

  const denyWorkflow = useCallback(() => {
    if (approvalTimer.current) { clearTimeout(approvalTimer.current); approvalTimer.current = null }
    setWorkflowPhase('denied')
  }, [])

  // ─── Stage change: reset and fade in — wait for play button ─────────
  useEffect(() => {
    resetPhaseStates()
    if (stageContentRef.current) {
      animate(stageContentRef.current, { opacity: [0, 1], duration: 525, easing: 'easeOutCubic' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // ─── Play trigger: fires when presenter clicks the play button ────────
  useEffect(() => {
    if (!playSignal) return
    resetPhaseStates()
    const s = stageRef.current
    addTimer(() => {
      if (s === 0) runAttackDiscovery()
      else if (s === 1) runThreatHunting()
      else if (s === 2) runWorkflow()
    }, 200)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playSignal])

  // ─── Report alertPhase changes up to App.jsx ─────────────────────────
  useEffect(() => {
    onAlertPhaseChange?.(alertPhase)
  }, [alertPhase, onAlertPhaseChange])

  // ─── Phase advance: presenter clicks chevron button ──────────────────
  useEffect(() => {
    if (!phaseAdvanceSignal) return
    if (alertPhaseRef.current === 'flooding') {
      setAlertPhase('connecting')
    } else if (alertPhaseRef.current === 'connecting') {
      setAlertPhase('grouped')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseAdvanceSignal])

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════

  const approvedPhases = ['approved', 'executing', 'done', 'notifying', 'complete']

  return (
    <div className="h-full w-full flex flex-col px-6 pt-4 pb-2 overflow-hidden">
      <div className="max-w-[95%] mx-auto w-full flex flex-col">

        {/* ── Header ──────────────────────────────────────────────── */}
        <SceneHeader
          eyebrow={eyebrow}
          titlePlain={titlePlain}
          titleAccent={titleAccent}
          subtitle={
            <>
              {stage === 0 && stageSubtitles[0]}
              {stage === 1 && stageSubtitles[1]}
              {stage === 2 && stageSubtitles[2]}
            </>
          }
        />

        {/* ── Main row: stage content + right-side navigator ─────── */}
        <div className="flex gap-3 overflow-hidden min-h-0 h-[calc(100vh-320px)]">

        {/* ── Stage Container ────────────────────────────────────── */}
        <div
          ref={stageContentRef}
          style={{ opacity: 0 }}
          className={`flex-1 relative overflow-hidden rounded-2xl border bg-gradient-to-br from-transparent to-white/[0.02] ${
            isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'
          }`}
        >

          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 1: Attack Discovery — Node Graph                 */}
          {/* ═══════════════════════════════════════════════════════ */}
          {stage === 0 && (
            <div className="absolute inset-0 p-4 flex flex-col">

              {/* Phase label */}
              <div className="flex items-center gap-2 mb-2 flex-shrink-0">
                <FontAwesomeIcon icon={faShieldHalved} className={`text-base ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                <span className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  {stage0Label}
                </span>
                {alertPhase === 'grouped' && (
                  <span className={`text-sm ml-auto px-3 py-1 rounded-full font-medium ${isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>
                    {groupedSummaryBadge}
                  </span>
                )}
              </div>

              {/* Graph canvas */}
              <div ref={graphContainerRef} className="flex-1 relative overflow-hidden">

                {/* ── Idle hint ── */}
                {alertPhase === 'idle' && (
                  <div className="absolute inset-0 flex items-center justify-center z-10">
                    <div className={`text-center px-8 py-6 rounded-2xl ${isDark ? 'bg-elastic-dev-blue/90 backdrop-blur-sm' : 'bg-white/90 backdrop-blur-sm'}`}>
                      <FontAwesomeIcon icon={faBell} className={`text-3xl mb-3 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`} />
                      <p className={`text-base ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                        {attackDiscoveryIdleHint}
                      </p>
                    </div>
                  </div>
                )}

                {/* ── SVG connection layer ── */}
                {(alertPhase === 'flooding' || alertPhase === 'connecting') && (
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{ zIndex: 1 }}
                  >
                    {selectedConnections.map((conn, i) => (
                      <line
                        key={`${conn.from}-${conn.to}`}
                        ref={el => { svgLineRefs.current[i] = el }}
                        stroke={isDark ? conn.color : '#0B64DD'}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        style={{ opacity: 0 }}
                      />
                    ))}
                  </svg>
                )}

                {/* ── Alert nodes ── */}
                {(alertPhase === 'flooding' || alertPhase === 'connecting') && graphNodes.map((node, i) => {
                  const isRevealed = node.selected && revealedNodes.has(node.id)
                  return (
                    <div
                      key={node.id}
                      ref={el => { nodeRefs.current[i] = el }}
                      className={`opacity-0 ${
                        isRevealed
                          ? `flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs border whitespace-nowrap ${isDark ? 'bg-elastic-dev-blue border-white/20' : 'bg-white border-elastic-dev-blue/20'}`
                          : `w-3 h-3 rounded-full ${isDark ? 'bg-white/20' : 'bg-elastic-dev-blue/20'}`
                      }`}
                      style={{
                        position: 'absolute',
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 2,
                      }}
                    >
                      {isRevealed && (
                        <>
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: isDark ? severityColors[node.severity] : '#0B64DD' }} />
                          <span className={isDark ? 'text-white/85' : 'text-elastic-dark-ink/85'}>{node.label}</span>
                        </>
                      )}
                    </div>
                  )
                })}

                {/* ── Connecting overlay: MITRE tactics ── */}
                {alertPhase === 'connecting' && visibleTactics > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 z-10 pointer-events-none">
                    {analyzeTactics.slice(0, visibleTactics).map((tactic, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs backdrop-blur-sm border ${
                          isDark
                            ? 'bg-elastic-teal/15 border-elastic-teal/25'
                            : 'bg-elastic-blue/8 border-elastic-blue/15'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCheck} className={`text-[10px] flex-shrink-0 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                        <span className={isDark ? 'text-white/75' : 'text-elastic-dark-ink/75'}>{tactic}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Grouped attack stories ── */}
                {alertPhase === 'grouped' && (
                  <div className="absolute inset-0 p-2 flex flex-col gap-3">
                    <div className="flex flex-col gap-3 flex-1">
                      {attackStories.map((story, i) => (
                        <div
                          key={story.id}
                          ref={el => { storyRefs.current[i] = el }}
                          style={{ borderLeftColor: isDark ? story.color : '#0B64DD', opacity: 0 }}
                          className={`rounded-xl border-l-4 px-4 py-2.5 cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                              : 'bg-white/60 hover:bg-white/80'
                          } ${selectedStory === story.id ? (isDark ? 'ring-1 ring-white/20' : 'ring-1 ring-elastic-dev-blue/20') : ''}`}
                          onClick={() => setSelectedStory(selectedStory === story.id ? null : story.id)}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <h4 className={`text-base font-bold truncate ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>{story.title}</h4>
                              <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ backgroundColor: isDark ? `${story.color}20` : '#0B64DD1A', color: isDark ? story.color : '#0B64DD' }}>
                                {story.severity.toUpperCase()}
                              </span>
                              <span className={`text-xs flex-shrink-0 ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>
                                {story.alertCount} {alertsSuffix}
                              </span>
                            </div>
                            <FontAwesomeIcon icon={faTriangleExclamation} className="text-sm ml-2 flex-shrink-0" style={{ color: isDark ? story.color : '#0B64DD' }} />
                          </div>

                          <p className={`text-sm leading-relaxed ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                            {story.summary}
                          </p>

                          {/* Expand/collapse MITRE + entities */}
                          <div className={`overflow-hidden transition-all duration-300 ${selectedStory === story.id ? 'max-h-48 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                            <div className={`pt-2 border-t ${isDark ? 'border-white/10' : 'border-elastic-dev-blue/10'}`}>
                              <div className="mb-2">
                                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{mitreSectionLabel}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {story.mitre.map(t => (
                                    <span key={t} className={`text-xs px-2 py-0.5 rounded ${isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/60'}`}>{t}</span>
                                  ))}
                                </div>
                              </div>
                              <div>
                                <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/40' : 'text-elastic-dev-blue/40'}`}>{entitiesSectionLabel}</span>
                                <div className="flex flex-wrap gap-1.5 mt-1">
                                  {story.entities.map(e => (
                                    <span key={e} className={`text-xs px-2 py-0.5 rounded font-mono ${isDark ? 'bg-white/10 text-white/60' : 'bg-elastic-dev-blue/5 text-elastic-dev-blue/60'}`}>{e}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer: Jira & ServiceNow */}
                    <div
                      ref={storyFooterRef}
                      style={{ opacity: 0 }}
                      className={`flex items-center justify-center gap-5 py-3 rounded-xl flex-shrink-0 ${isDark ? 'bg-white/[0.03]' : 'bg-elastic-dev-blue/[0.03]'}`}
                    >
                      <span className={`text-sm ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                        {storyFooterPrefix}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.06]' : 'bg-white/70'}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M11.53 2c0 4.97 4.03 9 9 9h.47v.47c0 4.97-4.03 9-9 9v-.47c0-4.97-4.03-9-9-9H2.53v-.47c0-4.97 4.03-9 9-9V2z" fill="#2684FF"/>
                          </svg>
                          <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>{jiraLabel}</span>
                        </span>
                        <span className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${isDark ? 'bg-white/[0.06]' : 'bg-white/70'}`}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 16.5c-3.58 0-6.5-2.92-6.5-6.5S8.42 5.5 12 5.5s6.5 2.92 6.5 6.5-2.92 6.5-6.5 6.5z" fill="#81B5A1"/>
                            <path d="M12 7.5c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5-2.02-4.5-4.5-4.5z" fill="#81B5A1"/>
                          </svg>
                          <span className={`text-sm font-medium ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>{servicenowLabel}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}


          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 2: AI Threat Hunting                            */}
          {/* ═══════════════════════════════════════════════════════ */}
          {stage === 1 && (
            <div className="absolute inset-0 p-4 flex flex-col">

              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faRobot} className={`text-base ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                <span className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  {stage1Label}
                </span>
                <span className={`text-xs ml-auto px-3 py-1 rounded-full ${isDark ? 'bg-elastic-teal/10 text-elastic-teal/60' : 'bg-elastic-blue/10 text-elastic-blue/60'}`}>
                  {huntingBadge}
                </span>
              </div>

              <div className="flex-1 flex gap-5 overflow-hidden">

                {/* Chat panel */}
                <div className={`flex-[2] flex flex-col rounded-xl border overflow-hidden ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-white/40'}`}>
                  <div className={`px-5 py-3 border-b flex items-center gap-3 flex-shrink-0 ${isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/60'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-elastic-teal/20' : 'bg-elastic-blue/10'}`}>
                      <FontAwesomeIcon icon={faRobot} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>{assistantName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>{assistantStatus}</span>
                  </div>

                  <div ref={chatContainerRef} className="flex-1 p-5 overflow-y-auto flex flex-col gap-4">
                    {!huntingStarted && (
                      <div className="flex-1 flex items-center justify-center">
                        <div className="text-center">
                          <FontAwesomeIcon icon={faMagnifyingGlass} className={`text-3xl mb-3 ${isDark ? 'text-white/20' : 'text-elastic-dev-blue/20'}`} />
                          <p className={`text-sm ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>{huntingIdleHint}</p>
                        </div>
                      </div>
                    )}

                    {visibleMessages.map((msg, i) => (
                      <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                          msg.role === 'user'
                            ? isDark ? 'bg-elastic-teal/20 text-white/80 rounded-br-sm' : 'bg-elastic-blue/10 text-elastic-dark-ink/80 rounded-br-sm'
                            : isDark ? 'bg-white/[0.05] text-white/70 rounded-bl-sm' : 'bg-white/70 text-elastic-dark-ink/70 rounded-bl-sm border border-elastic-dev-blue/10'
                        }`} style={{ whiteSpace: 'pre-line' }}>
                          {msg.role === 'agent' && (
                            <div className="flex items-center gap-2 mb-2">
                              <FontAwesomeIcon icon={faRobot} className={`text-xs ${isDark ? 'text-elastic-teal/60' : 'text-elastic-blue/60'}`} />
                              <span className={`text-xs font-semibold ${isDark ? 'text-elastic-teal/60' : 'text-elastic-blue/60'}`}>{chatAgentLabel}</span>
                              {msg.hasKB && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-elastic-teal/10 text-elastic-teal/50' : 'bg-elastic-blue/10 text-elastic-blue/50'}`}>
                                  {kbReferenceBadge}
                                </span>
                              )}
                            </div>
                          )}
                          {msg.text}
                        </div>
                      </div>
                    ))}

                    {isAgentTyping && (
                      <div className="flex justify-start">
                        <div className={`flex items-center gap-2 rounded-xl px-5 py-3.5 ${isDark ? 'bg-white/[0.05]' : 'bg-white/70 border border-elastic-dev-blue/10'}`}>
                          {[0, 1, 2].map(dot => (
                            <span
                              key={dot}
                              className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-white/40' : 'bg-elastic-dev-blue/40'}`}
                              style={{ animationDelay: `${dot * 0.15}s` }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Agent Builder / KB panel */}
                <div className={`flex-1 flex flex-col gap-4 rounded-xl border p-5 ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-white/40'}`}>
                  <div className="flex items-center gap-3 mb-1">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDark ? 'bg-elastic-teal/20' : 'bg-elastic-blue/10'}`}>
                      <FontAwesomeIcon icon={faGear} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>{agentBuilderTitle}</div>
                      <div className={`text-xs ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>{agentBuilderSubtitle}</div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>{knowledgeBasesSectionLabel}</span>
                    <div className="flex flex-col gap-2 mt-2">
                      {knowledgeBases.map((kb, i) => {
                        const highlighted = kbHighlight.includes(i)
                        return (
                          <div
                            key={kb.name}
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                              highlighted
                                ? isDark ? 'bg-elastic-teal/20 border border-elastic-teal/30' : 'bg-elastic-blue/10 border border-elastic-blue/30'
                                : isDark ? 'bg-white/[0.03] border border-white/5' : 'bg-white/50 border border-elastic-dev-blue/5'
                            }`}
                          >
                            <FontAwesomeIcon icon={kb.icon} className={`text-sm ${highlighted ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') : (isDark ? 'text-white/40' : 'text-elastic-dev-blue/40')}`} />
                            <div className="flex-1">
                              <div className={highlighted ? (isDark ? 'text-white/80' : 'text-elastic-dark-ink/80') : (isDark ? 'text-white/50' : 'text-elastic-dev-blue/50')}>{kb.name}</div>
                              <div className={`text-xs ${isDark ? 'text-white/25' : 'text-elastic-dev-blue/25'}`}>{kb.items}</div>
                            </div>
                            {highlighted && <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isDark ? 'bg-elastic-teal' : 'bg-elastic-blue'}`} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}


          {/* ═══════════════════════════════════════════════════════ */}
          {/* STAGE 3: Automated Response                           */}
          {/* ═══════════════════════════════════════════════════════ */}
          {stage === 2 && (
            <div className="absolute inset-0 p-4 flex flex-col">

              <div className="flex items-center gap-2 mb-2">
                <FontAwesomeIcon icon={faBolt} className={`text-base ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                <span className={`text-sm font-semibold uppercase tracking-wider ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`}>
                  {stage2Label}
                </span>
              </div>

              <div className="flex-1 flex gap-4 overflow-hidden">

                {/* Left: Host card */}
                <div className={`w-[240px] flex-shrink-0 rounded-xl border p-4 flex flex-col transition-all duration-300 ${
                  workflowPhase !== 'idle'
                    ? isDark ? 'border-elastic-pink/30 bg-elastic-pink/5' : 'border-elastic-blue/20 bg-elastic-blue/[0.03]'
                    : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/50'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <FontAwesomeIcon icon={faServer} className={`text-base ${workflowPhase !== 'idle' ? (isDark ? 'text-elastic-pink' : 'text-elastic-blue') : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`} />
                    <span className={`text-sm font-bold ${isDark ? 'text-white/80' : 'text-elastic-dark-ink/80'}`}>{targetHostLabel}</span>
                  </div>
                  <div className="flex flex-col gap-3 flex-1">
                    {hostDetails.map(item => (
                      <div key={item.label}>
                        <div className={`text-xs uppercase tracking-wider ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>{item.label}</div>
                        <div className={`text-sm font-mono ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(16,28,63,0.1)' }}>
                    <div className={`text-xs uppercase tracking-wider mb-2 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>{threatScoreLabel}</div>
                    <div className="flex items-center gap-2">
                      <div className={`flex-1 h-2.5 rounded-full overflow-hidden ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`}>
                        <div
                          ref={threatScoreBarRef}
                          className="h-full rounded-full"
                          style={{ backgroundColor: isDark ? '#F04E98' : '#0B64DD', width: '0%' }}
                        />
                      </div>
                      {workflowPhase !== 'idle' && (
                        <span className={`text-sm font-bold ${isDark ? 'text-elastic-pink' : 'text-elastic-blue'}`}>{threatScoreValue}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Center: Workflow + Terminal + Notifications + MTTR */}
                <div className="flex-1 flex flex-col gap-3 overflow-hidden">

                  {/* Pipeline steps */}
                  <div className="flex items-center gap-3">
                    {/* Step 1 */}
                    <div className={`flex-1 rounded-lg border px-3 py-2.5 flex items-center gap-2 transition-all duration-300 ${
                      workflowPhase !== 'idle'
                        ? isDark ? 'border-elastic-pink/40 bg-elastic-pink/10' : 'border-elastic-blue/30 bg-elastic-blue/5'
                        : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/50'
                    }`}>
                      <FontAwesomeIcon icon={faTriangleExclamation} className={`text-sm ${workflowPhase !== 'idle' ? (isDark ? 'text-elastic-pink' : 'text-elastic-blue') : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`} />
                      <div>
                        <div className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>{pipelineSteps.threatDetected.title}</div>
                        <div className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>{pipelineSteps.threatDetected.subtitle}</div>
                      </div>
                    </div>

                    <div className={`h-px w-8 flex-shrink-0 ${isDark ? 'bg-white/20' : 'bg-elastic-dev-blue/20'}`} />

                    {/* Step 2: Approval */}
                    <div className={`flex-1 rounded-lg border px-3 py-2.5 flex items-center gap-2 transition-all duration-300 ${
                      workflowPhase === 'pending'
                        ? isDark ? 'border-elastic-yellow/40 bg-elastic-yellow/10 shadow-[0_0_14px_rgba(254,197,20,0.15)]' : 'border-elastic-blue/30 bg-elastic-blue/5'
                        : approvedPhases.includes(workflowPhase)
                          ? isDark ? 'border-elastic-teal/40 bg-elastic-teal/10' : 'border-elastic-blue/30 bg-elastic-blue/5'
                          : workflowPhase === 'denied'
                            ? isDark ? 'border-elastic-pink/40 bg-elastic-pink/10' : 'border-elastic-pink/30 bg-elastic-pink/5'
                            : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/50'
                    }`}>
                      <FontAwesomeIcon icon={faUser} className={`text-sm flex-shrink-0 ${
                        workflowPhase === 'pending' ? (isDark ? 'text-elastic-yellow' : 'text-elastic-blue')
                          : approvedPhases.includes(workflowPhase) ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue')
                            : workflowPhase === 'denied' ? 'text-elastic-pink'
                              : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'
                      }`} />
                      <div className="flex-1">
                        <div className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>{pipelineSteps.analystApproval.title}</div>
                        <div className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>{pipelineSteps.analystApproval.subtitle}</div>
                      </div>
                      {approvedPhases.includes(workflowPhase) && <FontAwesomeIcon icon={faCircleCheck} className={`text-sm ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />}
                      {workflowPhase === 'denied' && <FontAwesomeIcon icon={faCircleXmark} className="text-elastic-pink text-sm" />}
                    </div>

                    <div className={`h-px w-8 flex-shrink-0 ${isDark ? 'bg-white/20' : 'bg-elastic-dev-blue/20'}`} />

                    {/* Step 3: Execute */}
                    <div className={`flex-1 rounded-lg border px-3 py-2.5 flex items-center gap-2 transition-all duration-300 ${
                      ['executing', 'done', 'notifying', 'complete'].includes(workflowPhase)
                        ? isDark ? 'border-elastic-teal/40 bg-elastic-teal/10' : 'border-elastic-blue/30 bg-elastic-blue/5'
                        : workflowPhase === 'denied'
                          ? isDark ? 'border-elastic-pink/20 bg-elastic-pink/5' : 'border-elastic-pink/10 bg-elastic-pink/[0.02]'
                          : isDark ? 'border-white/10 bg-white/[0.03]' : 'border-elastic-dev-blue/10 bg-white/50'
                    }`}>
                      <FontAwesomeIcon
                        icon={['done', 'notifying', 'complete'].includes(workflowPhase) ? faCircleCheck : workflowPhase === 'denied' ? faCircleXmark : faLock}
                        className={`text-sm ${
                          ['done', 'notifying', 'complete'].includes(workflowPhase) ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue')
                            : workflowPhase === 'executing' ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue')
                              : workflowPhase === 'denied' ? 'text-elastic-pink/50'
                                : isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'
                        }`}
                      />
                      <div>
                        <div className={`text-sm font-semibold ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/70'}`}>
                          {workflowPhase === 'denied' ? pipelineSteps.execute.titleDenied : ['done', 'notifying', 'complete'].includes(workflowPhase) ? pipelineSteps.execute.titleDone : pipelineSteps.execute.titleIdle}
                        </div>
                        <div className={`text-xs ${isDark ? 'text-white/35' : 'text-elastic-dev-blue/35'}`}>
                          {workflowPhase === 'denied' ? pipelineSteps.execute.subtitleDenied : ['done', 'notifying', 'complete'].includes(workflowPhase) ? pipelineSteps.execute.subtitleDone : pipelineSteps.execute.subtitleIdle}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Approve / Deny actions */}
                  {workflowPhase === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={approveWorkflow} className={`flex-1 py-2 rounded-lg text-sm font-semibold hover:scale-[1.02] active:scale-95 transition-all ${isDark ? 'bg-elastic-teal/20 text-elastic-teal hover:bg-elastic-teal/30' : 'bg-elastic-blue/20 text-elastic-blue hover:bg-elastic-blue/30'}`}>
                        <FontAwesomeIcon icon={faCircleCheck} className="mr-1.5" />{approveLabel}
                      </button>
                      <button onClick={denyWorkflow} className="flex-1 py-2 rounded-lg text-sm font-semibold bg-elastic-pink/20 text-elastic-pink hover:bg-elastic-pink/30 hover:scale-[1.02] active:scale-95 transition-all">
                        <FontAwesomeIcon icon={faCircleXmark} className="mr-1.5" />{denyLabel}
                      </button>
                    </div>
                  )}

                  {/* Terminal */}
                  <div className={`relative flex-1 rounded-xl border overflow-hidden flex flex-col min-h-0 ${isDark ? 'border-white/10 bg-[#0d1117]' : 'border-elastic-dev-blue/15 bg-[#1a1b26]'}`}>
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border-b border-white/5 flex-shrink-0">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-red-500/60" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500/60" />
                        <span className="w-3 h-3 rounded-full bg-green-500/60" />
                      </div>
                      <span className="text-xs text-white/30 font-mono">{terminalTitle}</span>
                    </div>
                    <div className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed">
                      {terminalLines.length === 0 && workflowPhase === 'idle' && (
                        <span className="text-white/20">{terminalIdleHint}</span>
                      )}
                      {terminalLines.length === 0 && !['idle', 'executing', 'done', 'notifying', 'complete'].includes(workflowPhase) && workflowPhase !== 'denied' && (
                        <span className="text-white/20">{terminalAwaitingHint}</span>
                      )}
                      {workflowPhase === 'denied' && (
                        <div>
                          <span className="text-elastic-pink">{terminalDeniedLine1}</span>
                          <br />
                          <span className="text-white/30">{terminalDeniedLine2}</span>
                        </div>
                      )}
                      {terminalLines.map((line, i) => (
                        <div key={i} className={
                          line.startsWith('$')       ? 'text-elastic-teal'
                            : line.startsWith('[OK]')   ? 'text-green-400'
                              : line.startsWith('[EXEC]') ? 'text-elastic-yellow'
                                : 'text-white/50'
                        }>
                          {line}
                        </div>
                      ))}
                      {workflowPhase === 'executing' && (
                        <span className="inline-block w-2.5 h-4 bg-elastic-teal/60 ml-0.5 animate-pulse" />
                      )}
                    </div>

                    {/* MTTR punchline — overlays terminal */}
                    {showMTTR && (
                      <div
                        ref={mttrRef}
                        style={{ opacity: 0 }}
                        className={`absolute bottom-0 left-0 right-0 h-1/5 flex items-center justify-center rounded-b-xl ${
                          isDark ? 'bg-elastic-dev-blue/95 border border-elastic-teal/20' : 'bg-white/95 border border-elastic-blue/20'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <FontAwesomeIcon icon={faClock} className={`text-md ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`} />
                          <span className={`text-md font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`}>{mttr.label}</span>
                          <div className={`text-md font-medium ${isDark ? 'text-white/90' : 'text-elastic-dark-ink'}`}>{mttr.beforeLabel}</div>
                          <div className="text-md font-bold text-elastic-pink">{mttr.beforeValue}</div>
                          <div className={`text-md font-medium ${isDark ? 'text-white/70' : 'text-elastic-dark-ink/80'}`}>→</div>
                          <div className={`text-md font-medium ${isDark ? 'text-white/90' : 'text-elastic-dark-ink'}`}>{mttr.afterLabel}</div>
                          <div className={`text-md font-bold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>{mttr.afterValue}</div>
                          <div className={`px-2 py-1 rounded-full text-md font-bold ${isDark ? 'bg-elastic-teal/20 text-elastic-teal' : 'bg-elastic-blue/10 text-elastic-blue'}`}>
                            {mttr.improvement}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                </div>

                {/* Right: Workflow Library */}
                <div className={`w-[280px] flex-shrink-0 rounded-2xl border p-4 flex flex-col gap-2 overflow-y-auto ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-white/40'}`}>
                  <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${isDark ? 'text-white/55' : 'text-elastic-dev-blue/55'}`}>{workflowLibraryLabel}</div>
                  {availableWorkflows.map(wf => {
                    // Per-workflow phase sequencing:
                    // search-siem: executing on approved, done from executing onward
                    // isolate-host: executing on executing, done from done onward
                    // jira-ticket: executing on done/notifying, done on complete
                    const denied = workflowPhase === 'denied'
                    const isThisExecuting =
                      (!denied && wf.id === 'search-siem'  && workflowPhase === 'approved') ||
                      (!denied && wf.id === 'isolate-host' && workflowPhase === 'executing') ||
                      (!denied && wf.id === 'jira-ticket'  && ['done', 'notifying'].includes(workflowPhase))
                    const isThisDone =
                      (!denied && wf.id === 'search-siem'  && ['executing', 'done', 'notifying', 'complete'].includes(workflowPhase)) ||
                      (!denied && wf.id === 'isolate-host' && ['done', 'notifying', 'complete'].includes(workflowPhase)) ||
                      (!denied && wf.id === 'jira-ticket'  && workflowPhase === 'complete')
                    const isThisDenied = denied && APPROVAL_HIGHLIGHT_IDS.has(wf.id)
                    const isActive = isThisExecuting || isThisDone
                    const badge = workflowTypeBadgeColor[wf.type] || { bg: 'bg-white/10', text: 'text-white/50' }
                    return (
                      <div
                        key={wf.id}
                        className={`relative rounded-xl border px-3 py-2.5 transition-all duration-300 overflow-hidden ${
                          isThisDenied
                            ? isDark ? 'border-elastic-pink/40 bg-elastic-pink/10' : 'border-elastic-pink/30 bg-elastic-pink/5'
                            : isThisDone
                              ? isDark ? 'border-elastic-teal/40 bg-elastic-teal/10' : 'border-elastic-blue/30 bg-elastic-blue/5'
                              : isThisExecuting
                                ? isDark ? 'border-elastic-teal/30 bg-elastic-teal/5 shadow-[0_0_10px_rgba(72,239,207,0.15)]' : 'border-elastic-blue/20 bg-elastic-blue/[0.04]'
                                : isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-elastic-dev-blue/[0.06] bg-white/30'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <FontAwesomeIcon
                            icon={isThisDone ? faCircleCheck : isThisDenied ? faCircleXmark : wf.icon}
                            className={`text-sm mt-0.5 ${
                              isThisDone    ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') :
                              isThisDenied  ? 'text-elastic-pink' :
                              isThisExecuting ? (isDark ? 'text-elastic-teal' : 'text-elastic-blue') :
                              isDark ? 'text-white/30' : 'text-elastic-blue/40'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-semibold truncate ${isActive ? (isDark ? 'text-white/90' : 'text-elastic-dark-ink') : isDark ? 'text-white/80' : 'text-elastic-dark-ink/80'}`}>{wf.name}</span>
                              {isThisDone && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${isDark ? 'text-elastic-teal bg-elastic-teal/10' : 'text-elastic-blue bg-elastic-blue/10'}`}>{workflowDoneBadge}</span>}
                              {isThisDenied && <span className="text-[10px] font-semibold text-elastic-pink bg-elastic-pink/10 px-1.5 py-0.5 rounded">{workflowBlockedBadge}</span>}
                            </div>
                            <div className={`text-[10px] leading-snug mt-0.5 ${isDark ? 'text-white/30' : 'text-elastic-dev-blue/30'}`}>{wf.description}</div>
                            <span className={`inline-block mt-1 text-[9px] font-semibold px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>{wf.type}</span>
                          </div>
                        </div>
                        {isThisExecuting && <div className={`absolute bottom-0 left-0 h-0.5 w-full animate-pulse ${isDark ? 'bg-elastic-teal/60' : 'bg-elastic-blue/60'}`} />}
                      </div>
                    )
                  })}
                </div>

              </div>

            </div>
          )}


        </div>{/* /Stage Container */}

        {/* ── Right-side stage navigator ─────────────────────────── */}
        <div className="w-12 flex-shrink-0 flex flex-col items-center justify-center relative select-none">

          {/* Track line */}
          <div className={`absolute w-px top-[20%] bottom-[20%] ${isDark ? 'bg-white/10' : 'bg-elastic-dev-blue/10'}`} />
          {/* Progress fill */}
          <div
            className={`absolute w-px top-[20%] transition-all duration-700 ease-out ${isDark ? 'bg-elastic-teal/50' : 'bg-elastic-blue/40'}`}
            style={{ height: `${(stage / (stages.length - 1)) * 60}%` }}
          />

          {stages.map((s, i) => {
            const isActive = i === stage
            const isDone   = i < stage
            const stageIcons = [faShieldHalved, faRobot, faBolt]
            return (
              <button
                key={s.id}
                onClick={() => { resetPhaseStates(); changeStage(i) }}
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
                    : <FontAwesomeIcon icon={stageIcons[i]} className="text-xs" />
                  }
                </div>

              </button>
            )
          })}
        </div>{/* /Right nav */}

        </div>{/* /Main row */}
      </div>
    </div>
  )
}

export default SecurityScene
