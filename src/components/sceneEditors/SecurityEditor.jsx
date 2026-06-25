export default function SecurityEditor({ sceneMetadata, onUpdateSceneMetadata, isDark, inputClass, textareaClass }) {
  const meta = sceneMetadata?.['security'] || {}
  const update = (patch) => onUpdateSceneMetadata('security', { ...meta, ...patch })

  const cardClass = `p-3 rounded-lg border ${isDark ? 'border-white/10 bg-white/[0.02]' : 'border-elastic-dev-blue/10 bg-elastic-dev-blue/[0.02]'}`

  const DEFAULT_STAGE_SUBTITLES = [
    'Prioritize Attacks, Not Alerts',
    'Make every analyst a power user',
    'Automated response at machine speed',
  ]
  const stageSubtitles = meta.stageSubtitles || DEFAULT_STAGE_SUBTITLES
  const setStageSubtitles = (next) => update({ stageSubtitles: next })

  const DEFAULT_STAGES = [
    { label: 'Attack Discovery' },
    { label: 'AI Assistant' },
    { label: 'Automated Response' },
  ]
  const stages = meta.stages || DEFAULT_STAGES
  const setStages = (next) => update({ stages: next })
  const setStage = (i, patch) => setStages(stages.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_ATTACK_STORIES = [
    {
      title: 'Credential Compromise Campaign',
      summary: 'Brute force attempts on DC-PROD-01 succeeded, followed by credential dumping and Golden Ticket creation targeting domain admin accounts.',
      mitre: ['T1110 Brute Force', 'T1003 Credential Dumping', 'T1558 Golden Ticket'],
      entities: ['DC-PROD-01', 'DC-PROD-02', '10.0.1.45'],
      alertCount: 6,
    },
    {
      title: 'Malware Lateral Spread',
      summary: 'Malware detected on WS-PC-0142 with DLL injection, spreading laterally to 10.0.3.22 via SMB. Ransomware IOCs found on WS-PC-0089.',
      mitre: ['T1059 Execution', 'T1055 Process Injection', 'T1021 Lateral Movement'],
      entities: ['WS-PC-0142', '10.0.3.22', 'WS-PC-0089'],
      alertCount: 5,
    },
    {
      title: 'Data Exfiltration via C2 Channel',
      summary: 'C2 beacon from 10.0.1.87 communicating with external IP. Data exfiltration from SRV-FILE-03 detected through anomalous traffic patterns.',
      mitre: ['T1071 Application Layer Protocol', 'T1041 Exfiltration Over C2'],
      entities: ['10.0.1.87', 'SRV-FILE-03', 'FW-EDGE-01'],
      alertCount: 4,
    },
    {
      title: 'Web Server Persistence',
      summary: 'Webshell uploaded to SRV-WEB-02 with suspicious process execution and registry modifications to establish persistence.',
      mitre: ['T1505 Server Software Component', 'T1112 Modify Registry'],
      entities: ['SRV-WEB-02', 'WS-PC-0201'],
      alertCount: 3,
    },
  ]
  const attackStories = meta.attackStories || DEFAULT_ATTACK_STORIES
  const setAttackStories = (next) => update({ attackStories: next })
  const setAttackStory = (i, patch) => setAttackStories(attackStories.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  const setAttackStoryList = (i, key, j, value) => {
    const list = attackStories[i]?.[key] || DEFAULT_ATTACK_STORIES[i]?.[key] || []
    setAttackStory(i, { [key]: list.map((x, idx) => (idx === j ? value : x)) })
  }

  const DEFAULT_ANALYZE_TACTICS = [
    'T1110 — Brute Force',
    'T1003 — Credential Dumping',
    'T1558 — Golden Ticket',
    'T1021 — Lateral Movement',
    'T1041 — Data Exfiltration',
  ]
  const analyzeTactics = meta.analyzeTactics || DEFAULT_ANALYZE_TACTICS
  const setAnalyzeTactics = (next) => update({ analyzeTactics: next })

  const DEFAULT_CHAT_SCRIPT = [
    { role: 'user', text: 'Investigate the credential compromise on DC-PROD-01. What happened?' },
    {
      role: 'agent',
      text: "I analyzed 6 related alerts. Here's what I found:\n\n• Brute force from 10.0.1.45 at 02:14 UTC\n• Successful admin logon 3 minutes later\n• LSASS credential dump detected\n• Golden Ticket forged for domain admin\n\nThis matches attack patterns for APT29 TTPs.",
    },
    { role: 'user', text: 'What remediation steps should we take?' },
    {
      role: 'agent',
      text: 'Based on your internal runbook (KB-SEC-2024-017):\n\n1. Reset krbtgt account password (twice)\n2. Isolate DC-PROD-01 from network\n3. Force password reset for all admin accounts\n4. Review all Kerberos tickets issued in last 24h\n5. Enable enhanced monitoring on domain controllers',
    },
  ]
  const chatScript = meta.chatScript || DEFAULT_CHAT_SCRIPT
  const setChatScript = (next) => update({ chatScript: next })
  const setChatMessage = (i, patch) => setChatScript(chatScript.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_KNOWLEDGE_BASES = [
    { name: 'Internal Runbooks', items: 'KB-SEC-2024-017 · 23 docs' },
    { name: 'Threat Intel Feeds', items: 'MITRE ATT&CK · CrowdStrike' },
    { name: 'Detection Rule Library', items: 'Sigma · YARA · 1,240 rules' },
    { name: 'CVE / Vulnerability DB', items: 'NVD · Tenable · Qualys' },
    { name: 'Asset & Network Topology', items: 'CMDB · 4,821 assets indexed' },
  ]
  const knowledgeBases = meta.knowledgeBases || DEFAULT_KNOWLEDGE_BASES
  const setKnowledgeBases = (next) => update({ knowledgeBases: next })
  const setKnowledgeBase = (i, patch) => setKnowledgeBases(knowledgeBases.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_HOST_DETAILS = [
    { label: 'Hostname', value: 'WS-PC-0142' },
    { label: 'IP Address', value: '10.0.3.22' },
    { label: 'OS', value: 'Windows 11 Pro' },
    { label: 'User', value: 'j.martinez' },
    { label: 'Agent', value: 'v8.15.1' },
  ]
  const hostDetails = meta.hostDetails || DEFAULT_HOST_DETAILS
  const setHostDetails = (next) => update({ hostDetails: next })
  const setHostDetail = (i, patch) => setHostDetails(hostDetails.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const DEFAULT_PIPELINE_STEPS = {
    threatDetected: { title: 'Threat Detected', subtitle: 'Isolate Host WS-PC-0142' },
    analystApproval: { title: 'Analyst Approval', subtitle: 'SOC Analyst: J. Mitchell' },
    execute: {
      titleIdle: 'Execute',
      titleDone: 'Isolated',
      titleDenied: 'Blocked',
      subtitleIdle: 'Response action',
      subtitleDone: 'WS-PC-0142 quarantined',
      subtitleDenied: 'Analyst override',
    },
  }
  const pipelineSteps = {
    threatDetected: { ...DEFAULT_PIPELINE_STEPS.threatDetected, ...(meta.pipelineSteps?.threatDetected || {}) },
    analystApproval: { ...DEFAULT_PIPELINE_STEPS.analystApproval, ...(meta.pipelineSteps?.analystApproval || {}) },
    execute: { ...DEFAULT_PIPELINE_STEPS.execute, ...(meta.pipelineSteps?.execute || {}) },
  }
  const updatePipelineStep = (key, patch) =>
    update({ pipelineSteps: { ...(meta.pipelineSteps || {}), [key]: { ...(meta.pipelineSteps?.[key] || {}), ...patch } } })

  const DEFAULT_MTTR = {
    label: 'MTTR',
    beforeLabel: 'Before',
    beforeValue: '~4h',
    afterLabel: 'After',
    afterValue: '14 min',
    improvement: '↓ 94% faster',
  }
  const mttr = { ...DEFAULT_MTTR, ...(meta.mttr || {}) }
  const updateMttr = (patch) => update({ mttr: { ...(meta.mttr || {}), ...patch } })

  const DEFAULT_TERMINAL_COMMANDS = [
    '$ elastic-agent isolate --host WS-PC-0142 --force',
    '[INFO] Connecting to Elastic Security endpoint...',
    '[INFO] Host WS-PC-0142 found — Agent v8.15.1',
    '[EXEC] Blocking all network interfaces...',
    '[EXEC] Preserving forensic artifacts...',
    '[OK]   Host WS-PC-0142 isolated successfully',
  ]
  const terminalCommands = meta.terminalCommands || DEFAULT_TERMINAL_COMMANDS
  const setTerminalCommands = (next) => update({ terminalCommands: next })

  const DEFAULT_WORKFLOWS = [
    { name: 'Isolate Host', type: 'Response', description: 'Quarantine compromised endpoints' },
    { name: 'Search Across SIEM', type: 'ES|QL Query', description: 'Query all data sources for IOC matches' },
    { name: 'Block IP at Firewall', type: 'Response', description: 'Add malicious IPs to network deny list' },
    { name: 'Disable User Account', type: 'Response', description: 'Suspend compromised user credentials' },
    { name: 'Enrich with Threat Intel', type: 'Enrichment', description: 'Cross-reference IOCs with threat feeds' },
    { name: 'Scan with OSQuery', type: 'Investigation', description: 'Deep file analysis on target hosts' },
    { name: 'Create Jira Ticket', type: 'Notification', description: 'Auto-generate incident tickets' },
  ]
  const workflows = meta.workflows || DEFAULT_WORKFLOWS
  const setWorkflows = (next) => update({ workflows: next })
  const setWorkflow = (i, patch) => setWorkflows(workflows.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))

  const labelClass = `text-xs mb-1 block ${isDark ? 'text-white/50' : 'text-elastic-dev-blue/50'}`
  const sectionClass = `text-sm font-semibold ${isDark ? 'text-white' : 'text-elastic-dark-ink'}`
  const cardTitleClass = `text-xs font-semibold mb-2 block ${isDark ? 'text-white/60' : 'text-elastic-dark-ink/60'}`

  return (
    <div className="space-y-6 mt-6">
      <div>
        <h3 className={sectionClass}>Header</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Eyebrow</label>
            <input type="text" value={meta.eyebrow || ''} onChange={(e) => update({ eyebrow: e.target.value })} className={inputClass} placeholder="Elastic Security" />
          </div>
          <div>
            <label className={labelClass}>Title Plain</label>
            <input type="text" value={meta.titlePlain || ''} onChange={(e) => update({ titlePlain: e.target.value })} className={inputClass} placeholder="Modernizing Cyber Defense with " />
          </div>
          <div>
            <label className={labelClass}>Title Accent</label>
            <input type="text" value={meta.titleAccent || ''} onChange={(e) => update({ titleAccent: e.target.value })} className={inputClass} placeholder="AI-Driven Efficiency" />
          </div>
          {DEFAULT_STAGE_SUBTITLES.map((defaultSub, i) => (
            <div key={i}>
              <label className={labelClass}>Stage {i + 1} Subtitle</label>
              <input
                type="text"
                value={stageSubtitles[i] || ''}
                onChange={(e) => setStageSubtitles(stageSubtitles.map((x, idx) => (idx === i ? e.target.value : x)))}
                className={inputClass}
                placeholder={defaultSub}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Stage Navigation</h3>
        <div className="space-y-3 mt-3">
          {stages.map((stage, i) => (
            <div key={i} className={cardClass}>
              <span className={cardTitleClass}>{DEFAULT_STAGES[i]?.label || `Stage ${i + 1}`}</span>
              <div>
                <label className={labelClass}>Nav Label</label>
                <input type="text" value={stage.label || ''} onChange={(e) => setStage(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_STAGES[i]?.label || ''} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Attack Discovery (Stage 1)</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Stage Label</label>
            <input type="text" value={meta.stage0Label || ''} onChange={(e) => update({ stage0Label: e.target.value })} className={inputClass} placeholder="Attack Discovery" />
          </div>
          <div>
            <label className={labelClass}>Grouped Summary Badge</label>
            <input type="text" value={meta.groupedSummaryBadge || ''} onChange={(e) => update({ groupedSummaryBadge: e.target.value })} className={inputClass} placeholder="80 alerts → 4 attack stories" />
          </div>
          <div>
            <label className={labelClass}>Idle Hint</label>
            <textarea rows={2} value={meta.attackDiscoveryIdleHint || ''} onChange={(e) => update({ attackDiscoveryIdleHint: e.target.value })} className={textareaClass} placeholder="See how AI turns raw alerts into clear attack stories." />
          </div>
          <div>
            <label className={labelClass}>MITRE Section Label</label>
            <input type="text" value={meta.mitreSectionLabel || ''} onChange={(e) => update({ mitreSectionLabel: e.target.value })} className={inputClass} placeholder="MITRE ATT&CK" />
          </div>
          <div>
            <label className={labelClass}>Entities Section Label</label>
            <input type="text" value={meta.entitiesSectionLabel || ''} onChange={(e) => update({ entitiesSectionLabel: e.target.value })} className={inputClass} placeholder="Affected Entities" />
          </div>
          <div>
            <label className={labelClass}>Alerts Suffix</label>
            <input type="text" value={meta.alertsSuffix || ''} onChange={(e) => update({ alertsSuffix: e.target.value })} className={inputClass} placeholder="alerts" />
          </div>
          <div>
            <label className={labelClass}>Story Footer Prefix</label>
            <input type="text" value={meta.storyFooterPrefix || ''} onChange={(e) => update({ storyFooterPrefix: e.target.value })} className={inputClass} placeholder="Attack stories triaged and routed to analysts via" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Jira Label</label>
              <input type="text" value={meta.jiraLabel || ''} onChange={(e) => update({ jiraLabel: e.target.value })} className={inputClass} placeholder="Jira" />
            </div>
            <div>
              <label className={labelClass}>ServiceNow Label</label>
              <input type="text" value={meta.servicenowLabel || ''} onChange={(e) => update({ servicenowLabel: e.target.value })} className={inputClass} placeholder="ServiceNow" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Analyze Tactics</h3>
        <div className="space-y-2 mt-3">
          {analyzeTactics.map((tactic, i) => (
            <input
              key={i}
              type="text"
              value={tactic}
              onChange={(e) => setAnalyzeTactics(analyzeTactics.map((x, idx) => (idx === i ? e.target.value : x)))}
              className={inputClass}
              placeholder={DEFAULT_ANALYZE_TACTICS[i] || ''}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Attack Stories</h3>
        <div className="space-y-3 mt-3">
          {attackStories.map((story, i) => {
            const defaults = DEFAULT_ATTACK_STORIES[i] || {}
            const mitre = story.mitre || defaults.mitre || []
            const entities = story.entities || defaults.entities || []
            return (
              <div key={i} className={cardClass}>
                <span className={cardTitleClass}>{defaults.title || `Story ${i + 1}`}</span>
                <div className="space-y-2">
                  <div>
                    <label className={labelClass}>Title</label>
                    <input type="text" value={story.title || ''} onChange={(e) => setAttackStory(i, { title: e.target.value })} className={inputClass} placeholder={defaults.title || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Summary</label>
                    <textarea rows={3} value={story.summary || ''} onChange={(e) => setAttackStory(i, { summary: e.target.value })} className={textareaClass} placeholder={defaults.summary || ''} />
                  </div>
                  <div>
                    <label className={labelClass}>Alert Count</label>
                    <input type="text" value={story.alertCount ?? ''} onChange={(e) => setAttackStory(i, { alertCount: e.target.value })} className={inputClass} placeholder={String(defaults.alertCount ?? '')} />
                  </div>
                  <div>
                    <label className={labelClass}>MITRE Tags</label>
                    <div className="space-y-2">
                      {mitre.map((tag, j) => (
                        <input key={j} type="text" value={tag} onChange={(e) => setAttackStoryList(i, 'mitre', j, e.target.value)} className={inputClass} placeholder={(defaults.mitre || [])[j] || ''} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Affected Entities</label>
                    <div className="space-y-2">
                      {entities.map((entity, j) => (
                        <input key={j} type="text" value={entity} onChange={(e) => setAttackStoryList(i, 'entities', j, e.target.value)} className={inputClass} placeholder={(defaults.entities || [])[j] || ''} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>AI Assistant (Stage 2)</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Stage Label</label>
            <input type="text" value={meta.stage1Label || ''} onChange={(e) => update({ stage1Label: e.target.value })} className={inputClass} placeholder="AI Assistant" />
          </div>
          <div>
            <label className={labelClass}>Badge</label>
            <input type="text" value={meta.huntingBadge || ''} onChange={(e) => update({ huntingBadge: e.target.value })} className={inputClass} placeholder="Agent Builder" />
          </div>
          <div>
            <label className={labelClass}>Assistant Name</label>
            <input type="text" value={meta.assistantName || ''} onChange={(e) => update({ assistantName: e.target.value })} className={inputClass} placeholder="Elastic AI Assistant" />
          </div>
          <div>
            <label className={labelClass}>Assistant Status</label>
            <input type="text" value={meta.assistantStatus || ''} onChange={(e) => update({ assistantStatus: e.target.value })} className={inputClass} placeholder="Online" />
          </div>
          <div>
            <label className={labelClass}>Idle Hint</label>
            <input type="text" value={meta.huntingIdleHint || ''} onChange={(e) => update({ huntingIdleHint: e.target.value })} className={inputClass} placeholder="AI-guided investigation starting..." />
          </div>
          <div>
            <label className={labelClass}>Chat Agent Label</label>
            <input type="text" value={meta.chatAgentLabel || ''} onChange={(e) => update({ chatAgentLabel: e.target.value })} className={inputClass} placeholder="AI Assistant" />
          </div>
          <div>
            <label className={labelClass}>KB Reference Badge</label>
            <input type="text" value={meta.kbReferenceBadge || ''} onChange={(e) => update({ kbReferenceBadge: e.target.value })} className={inputClass} placeholder="via KB-SEC-2024-017" />
          </div>
          <div>
            <label className={labelClass}>Agent Builder Title</label>
            <input type="text" value={meta.agentBuilderTitle || ''} onChange={(e) => update({ agentBuilderTitle: e.target.value })} className={inputClass} placeholder="Agent Builder" />
          </div>
          <div>
            <label className={labelClass}>Agent Builder Subtitle</label>
            <input type="text" value={meta.agentBuilderSubtitle || ''} onChange={(e) => update({ agentBuilderSubtitle: e.target.value })} className={inputClass} placeholder="Agentic AI Configuration" />
          </div>
          <div>
            <label className={labelClass}>Knowledge Bases Section Label</label>
            <input type="text" value={meta.knowledgeBasesSectionLabel || ''} onChange={(e) => update({ knowledgeBasesSectionLabel: e.target.value })} className={inputClass} placeholder="Connected Knowledge Bases" />
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Chat Script</h3>
        <div className="space-y-3 mt-3">
          {chatScript.map((msg, i) => (
            <div key={i} className={cardClass}>
              <span className={cardTitleClass}>{DEFAULT_CHAT_SCRIPT[i]?.role === 'user' ? 'User' : 'Agent'} Message {i + 1}</span>
              <textarea rows={4} value={msg.text || ''} onChange={(e) => setChatMessage(i, { text: e.target.value })} className={textareaClass} placeholder={DEFAULT_CHAT_SCRIPT[i]?.text || ''} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Knowledge Bases</h3>
        <div className="space-y-3 mt-3">
          {knowledgeBases.map((kb, i) => (
            <div key={i} className={cardClass}>
              <span className={cardTitleClass}>{DEFAULT_KNOWLEDGE_BASES[i]?.name || `KB ${i + 1}`}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" value={kb.name || ''} onChange={(e) => setKnowledgeBase(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_KNOWLEDGE_BASES[i]?.name || ''} />
                </div>
                <div>
                  <label className={labelClass}>Items</label>
                  <input type="text" value={kb.items || ''} onChange={(e) => setKnowledgeBase(i, { items: e.target.value })} className={inputClass} placeholder={DEFAULT_KNOWLEDGE_BASES[i]?.items || ''} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Automated Response (Stage 3)</h3>
        <div className="space-y-3 mt-3">
          <div>
            <label className={labelClass}>Stage Label</label>
            <input type="text" value={meta.stage2Label || ''} onChange={(e) => update({ stage2Label: e.target.value })} className={inputClass} placeholder="Automated Response Workflows" />
          </div>
          <div>
            <label className={labelClass}>Target Host Label</label>
            <input type="text" value={meta.targetHostLabel || ''} onChange={(e) => update({ targetHostLabel: e.target.value })} className={inputClass} placeholder="Target Host" />
          </div>
          <div>
            <label className={labelClass}>Threat Score Label</label>
            <input type="text" value={meta.threatScoreLabel || ''} onChange={(e) => update({ threatScoreLabel: e.target.value })} className={inputClass} placeholder="Threat Score" />
          </div>
          <div>
            <label className={labelClass}>Threat Score Value</label>
            <input type="text" value={meta.threatScoreValue || ''} onChange={(e) => update({ threatScoreValue: e.target.value })} className={inputClass} placeholder="87" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Approve Label</label>
              <input type="text" value={meta.approveLabel || ''} onChange={(e) => update({ approveLabel: e.target.value })} className={inputClass} placeholder="Approve" />
            </div>
            <div>
              <label className={labelClass}>Deny Label</label>
              <input type="text" value={meta.denyLabel || ''} onChange={(e) => update({ denyLabel: e.target.value })} className={inputClass} placeholder="Deny" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Terminal Title</label>
            <input type="text" value={meta.terminalTitle || ''} onChange={(e) => update({ terminalTitle: e.target.value })} className={inputClass} placeholder="elastic-response-workflow" />
          </div>
          <div>
            <label className={labelClass}>Terminal Idle Hint</label>
            <input type="text" value={meta.terminalIdleHint || ''} onChange={(e) => update({ terminalIdleHint: e.target.value })} className={inputClass} placeholder="Waiting for workflow trigger..." />
          </div>
          <div>
            <label className={labelClass}>Terminal Awaiting Hint</label>
            <input type="text" value={meta.terminalAwaitingHint || ''} onChange={(e) => update({ terminalAwaitingHint: e.target.value })} className={inputClass} placeholder="Awaiting approval to execute..." />
          </div>
          <div>
            <label className={labelClass}>Terminal Denied Line 1</label>
            <input type="text" value={meta.terminalDeniedLine1 || ''} onChange={(e) => update({ terminalDeniedLine1: e.target.value })} className={inputClass} placeholder="$ workflow halted — analyst denied action" />
          </div>
          <div>
            <label className={labelClass}>Terminal Denied Line 2</label>
            <input type="text" value={meta.terminalDeniedLine2 || ''} onChange={(e) => update({ terminalDeniedLine2: e.target.value })} className={inputClass} placeholder="[INFO] Manual investigation required" />
          </div>
          <div>
            <label className={labelClass}>Workflow Library Label</label>
            <input type="text" value={meta.workflowLibraryLabel || ''} onChange={(e) => update({ workflowLibraryLabel: e.target.value })} className={inputClass} placeholder="Workflow Library" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Done Badge</label>
              <input type="text" value={meta.workflowDoneBadge || ''} onChange={(e) => update({ workflowDoneBadge: e.target.value })} className={inputClass} placeholder="Done" />
            </div>
            <div>
              <label className={labelClass}>Blocked Badge</label>
              <input type="text" value={meta.workflowBlockedBadge || ''} onChange={(e) => update({ workflowBlockedBadge: e.target.value })} className={inputClass} placeholder="Blocked" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Host Details</h3>
        <div className="space-y-3 mt-3">
          {hostDetails.map((item, i) => (
            <div key={i} className={cardClass}>
              <span className={cardTitleClass}>{DEFAULT_HOST_DETAILS[i]?.label || `Field ${i + 1}`}</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Label</label>
                  <input type="text" value={item.label || ''} onChange={(e) => setHostDetail(i, { label: e.target.value })} className={inputClass} placeholder={DEFAULT_HOST_DETAILS[i]?.label || ''} />
                </div>
                <div>
                  <label className={labelClass}>Value</label>
                  <input type="text" value={item.value || ''} onChange={(e) => setHostDetail(i, { value: e.target.value })} className={inputClass} placeholder={DEFAULT_HOST_DETAILS[i]?.value || ''} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Pipeline Steps</h3>
        <div className="space-y-3 mt-3">
          <div className={cardClass}>
            <span className={cardTitleClass}>Threat Detected</span>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Title</label>
                <input type="text" value={pipelineSteps.threatDetected.title || ''} onChange={(e) => updatePipelineStep('threatDetected', { title: e.target.value })} className={inputClass} placeholder={DEFAULT_PIPELINE_STEPS.threatDetected.title} />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input type="text" value={pipelineSteps.threatDetected.subtitle || ''} onChange={(e) => updatePipelineStep('threatDetected', { subtitle: e.target.value })} className={inputClass} placeholder={DEFAULT_PIPELINE_STEPS.threatDetected.subtitle} />
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <span className={cardTitleClass}>Analyst Approval</span>
            <div className="space-y-2">
              <div>
                <label className={labelClass}>Title</label>
                <input type="text" value={pipelineSteps.analystApproval.title || ''} onChange={(e) => updatePipelineStep('analystApproval', { title: e.target.value })} className={inputClass} placeholder={DEFAULT_PIPELINE_STEPS.analystApproval.title} />
              </div>
              <div>
                <label className={labelClass}>Subtitle</label>
                <input type="text" value={pipelineSteps.analystApproval.subtitle || ''} onChange={(e) => updatePipelineStep('analystApproval', { subtitle: e.target.value })} className={inputClass} placeholder={DEFAULT_PIPELINE_STEPS.analystApproval.subtitle} />
              </div>
            </div>
          </div>
          <div className={cardClass}>
            <span className={cardTitleClass}>Execute Step</span>
            <div className="space-y-2">
              {[
                ['titleIdle', 'Title (Idle)'],
                ['titleDone', 'Title (Done)'],
                ['titleDenied', 'Title (Denied)'],
                ['subtitleIdle', 'Subtitle (Idle)'],
                ['subtitleDone', 'Subtitle (Done)'],
                ['subtitleDenied', 'Subtitle (Denied)'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input type="text" value={pipelineSteps.execute[key] || ''} onChange={(e) => updatePipelineStep('execute', { [key]: e.target.value })} className={inputClass} placeholder={DEFAULT_PIPELINE_STEPS.execute[key] || ''} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>MTTR</h3>
        <div className={`space-y-2 mt-3 ${cardClass}`}>
          {[
            ['label', 'Label'],
            ['beforeLabel', 'Before Label'],
            ['beforeValue', 'Before Value'],
            ['afterLabel', 'After Label'],
            ['afterValue', 'After Value'],
            ['improvement', 'Improvement Badge'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <input type="text" value={mttr[key] || ''} onChange={(e) => updateMttr({ [key]: e.target.value })} className={inputClass} placeholder={DEFAULT_MTTR[key] || ''} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Terminal Commands</h3>
        <div className="space-y-2 mt-3">
          {terminalCommands.map((line, i) => (
            <input
              key={i}
              type="text"
              value={line}
              onChange={(e) => setTerminalCommands(terminalCommands.map((x, idx) => (idx === i ? e.target.value : x)))}
              className={inputClass}
              placeholder={DEFAULT_TERMINAL_COMMANDS[i] || ''}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className={sectionClass}>Workflow Library</h3>
        <div className="space-y-3 mt-3">
          {workflows.map((wf, i) => (
            <div key={i} className={cardClass}>
              <span className={cardTitleClass}>{DEFAULT_WORKFLOWS[i]?.name || `Workflow ${i + 1}`}</span>
              <div className="space-y-2">
                <div>
                  <label className={labelClass}>Name</label>
                  <input type="text" value={wf.name || ''} onChange={(e) => setWorkflow(i, { name: e.target.value })} className={inputClass} placeholder={DEFAULT_WORKFLOWS[i]?.name || ''} />
                </div>
                <div>
                  <label className={labelClass}>Type</label>
                  <input type="text" value={wf.type || ''} onChange={(e) => setWorkflow(i, { type: e.target.value })} className={inputClass} placeholder={DEFAULT_WORKFLOWS[i]?.type || ''} />
                </div>
                <div>
                  <label className={labelClass}>Description</label>
                  <textarea rows={2} value={wf.description || ''} onChange={(e) => setWorkflow(i, { description: e.target.value })} className={textareaClass} placeholder={DEFAULT_WORKFLOWS[i]?.description || ''} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
