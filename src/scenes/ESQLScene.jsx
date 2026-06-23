import { useEffect, useRef } from 'react'
import { useTheme } from '../context/ThemeContext'
import SceneHeader from '../components/SceneHeader'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faDatabase,
  faFilter,
  faChartBar,
  faArrowDownShortWide,
  faBullseye,
  faLayerGroup,
  faGaugeHigh,
  faWandMagicSparkles,
  faCodeBranch,
} from '@fortawesome/free-solid-svg-icons'

// ─── Pipeline stages ─────────────────────────────────────────────────────────

const pipelineStages = [
  {
    id: 'from',
    prefix: 'FROM',
    body: 'logs-*',
    description: 'Select one or many indices as your data source.',
    icon: faDatabase,
    color: '#0B64DD',
    eventLabel: '1,000,000 events',
    barWidth: 100,
  },
  {
    id: 'where-1',
    prefix: '| WHERE',
    body: 'event.category == "authentication"\n  AND event.outcome == "failure"',
    description: 'Push filtering close to the data — only failed logins survive.',
    icon: faFilter,
    color: '#F04E98',
    eventLabel: '12,400 events',
    barWidth: 62,
  },
  {
    id: 'stats',
    prefix: '| STATS',
    body: 'attempts = COUNT(*),\n  hosts    = COUNT_DISTINCT(host.name)\n  BY user.name',
    description: 'Aggregate across all matching events — no separate analytics layer.',
    icon: faChartBar,
    color: '#48EFCF',
    eventLabel: '843 users',
    barWidth: 42,
  },
  {
    id: 'where-2',
    prefix: '| WHERE',
    body: 'attempts > 50',
    description: 'Chain a second filter at any stage — logic is fully composable.',
    icon: faFilter,
    color: '#FEC514',
    eventLabel: '17 users',
    barWidth: 22,
  },
  {
    id: 'sort',
    prefix: '| SORT',
    body: 'attempts DESC',
    description: 'Order results for immediate triage — worst offenders first.',
    icon: faArrowDownShortWide,
    color: '#FF957D',
    eventLabel: '17 users',
    barWidth: 22,
    ordered: true,
  },
  {
    id: 'limit',
    prefix: '| LIMIT',
    body: '5',
    description: 'Surface only the top suspects — signal without the noise.',
    icon: faBullseye,
    color: '#A47CF3',
    eventLabel: '5 results',
    barWidth: 5,
  },
]

// ─── Mock results table ───────────────────────────────────────────────────────

const mockResults = [
  { user: 'svc-backup',  attempts: 847, hosts: 12 },
  { user: 'j.peterson',  attempts: 412, hosts: 3  },
  { user: 'admin',       attempts: 389, hosts: 28 },
  { user: 'sa-deploy',   attempts: 271, hosts: 7  },
  { user: 'r.chen',      attempts: 204, hosts: 2  },
]

// ─── Value props ──────────────────────────────────────────────────────────────

const valueProps = [
  {
    icon: faGaugeHigh,
    title: 'Faster queries, at scale.',
    description: 'Multi-stage concurrent execution delivers greater speed and efficiency across your event data.',
    color: '#48EFCF',
  },
  {
    icon: faLayerGroup,
    title: 'One query. One window.',
    description: 'Search, aggregate, calculate, transform, and visualize from a single pipeline. Refine as you go.',
    color: '#F04E98',
  },
  {
    icon: faCodeBranch,
    title: 'Lookup, join, and transform.',
    description: 'Perform data transformations in one query with lookups and joins.',
    color: '#FEC514',
  },
  {
    icon: faWandMagicSparkles,
    title: 'More accurate alerting.',
    description: 'Review trends over isolated incidents to reduce false positives and surface more actionable notifications.',
    color: '#0B64DD',
  },
]

// ─── Query lines (tokenised for syntax highlighting) ─────────────────────────

const queryLines = [
  {
    stageIdx: 0,
    tokens: [
      { text: 'FROM', type: 'keyword-badge' },
      { text: ' logs-*', type: 'index' },
    ],
  },
  {
    stageIdx: 1,
    tokens: [
      { text: '  | ', type: 'pipe' },
      { text: 'WHERE', type: 'keyword' },
      { text: ' event.category ', type: 'field' },
      { text: '==', type: 'operator' },
      { text: ' "authentication"', type: 'string' },
    ],
  },
  {
    stageIdx: 1,
    tokens: [
      { text: '          ', type: 'indent' },
      { text: 'AND', type: 'operator' },
      { text: ' event.outcome ', type: 'field' },
      { text: '==', type: 'operator' },
      { text: ' "failure"', type: 'string' },
    ],
  },
  {
    stageIdx: 2,
    tokens: [
      { text: '  | ', type: 'pipe' },
      { text: 'STATS', type: 'keyword' },
      { text: ' attempts ', type: 'field' },
      { text: '= ', type: 'operator' },
      { text: 'COUNT', type: 'function' },
      { text: '(*),', type: 'punctuation' },
    ],
  },
  {
    stageIdx: 2,
    tokens: [
      { text: '          ', type: 'indent' },
      { text: 'hosts ', type: 'field' },
      { text: '= ', type: 'operator' },
      { text: 'COUNT_DISTINCT', type: 'function' },
      { text: '(host.name)', type: 'punctuation' },
    ],
  },
  {
    stageIdx: 2,
    tokens: [
      { text: '          ', type: 'indent' },
      { text: 'BY', type: 'keyword-by' },
      { text: ' user.name', type: 'field' },
    ],
  },
  {
    stageIdx: 3,
    tokens: [
      { text: '  | ', type: 'pipe' },
      { text: 'WHERE', type: 'keyword' },
      { text: ' attempts ', type: 'field' },
      { text: '> ', type: 'operator' },
      { text: '50', type: 'number' },
    ],
  },
  {
    stageIdx: 4,
    tokens: [
      { text: '  | ', type: 'pipe' },
      { text: 'SORT', type: 'keyword' },
      { text: ' attempts ', type: 'field' },
      { text: 'DESC', type: 'keyword-sub' },
    ],
  },
  {
    stageIdx: 5,
    tokens: [
      { text: '  | ', type: 'pipe' },
      { text: 'LIMIT', type: 'keyword' },
      { text: ' 5', type: 'number' },
    ],
  },
]

const TOKEN_STYLES = {
  keyword:     { color: '#F04E98', fontWeight: 'bold' },
  'keyword-by':  { color: '#48EFCF', fontWeight: 'bold' },
  'keyword-sub': { color: '#48EFCF' },
  pipe:        { color: 'rgba(255,255,255,0.22)' },
  index:       { color: 'rgba(255,255,255,0.9)' },
  field:       { color: 'rgba(255,255,255,0.85)' },
  function:    { color: '#48EFCF' },
  operator:    { color: 'rgba(255,255,255,0.35)' },
  string:      { color: '#FEC514' },
  number:      { color: '#79c0ff' },
  punctuation: { color: 'rgba(255,255,255,0.45)' },
  indent:      { color: 'transparent' },
}

function renderToken(token, key) {
  if (token.type === 'keyword-badge') {
    return (
      <span
        key={key}
        className="rounded px-1.5 py-px font-bold mr-1.5"
        style={{ backgroundColor: 'rgba(11,100,221,0.55)', color: '#fff' }}
      >
        {token.text}
      </span>
    )
  }
  return (
    <span key={key} style={TOKEN_STYLES[token.type] ?? { color: 'rgba(255,255,255,0.7)' }}>
      {token.text}
    </span>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

function ESQLScene({ metadata = {}, externalStage = 0, onStageChange }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const activeStage = externalStage
  const setActiveStage = (val) => onStageChange?.(typeof val === 'function' ? val(externalStage) : val)

  const eyebrow       = metadata.eyebrow       || 'ES|QL · Elasticsearch Query Language'
  const headingPlain  = metadata.headingPlain  || 'Transform Your '
  const headingAccent = metadata.headingAccent || 'Investigation Workflows.'
  const subtitle      = metadata.subtitle      || 'A next-generation piped query language. Search, aggregate, transform, and visualize from a single query.'

  const resolvedValueProps = valueProps.map((prop, i) => ({
    ...prop,
    title:       metadata.valuePropTitles?.[i]       ?? prop.title,
    description: metadata.valuePropDescriptions?.[i] ?? prop.description,
  }))
  const barRefs = useRef([])

  const isComplete = activeStage === pipelineStages.length - 1
  const currentStage = pipelineStages[activeStage]

  // Animate the newly revealed bar in
  useEffect(() => {
    const el = barRefs.current[activeStage]
    if (!el) return
    el.style.width = '0%'
    el.style.opacity = '0'
    const frame = requestAnimationFrame(() => {
      el.style.transition = 'width 600ms cubic-bezier(0.16, 1, 0.3, 1), opacity 300ms ease'
      el.style.width = `${currentStage.barWidth}%`
      el.style.opacity = activeStage === 0 ? '1' : '0.75'
    })
    return () => cancelAnimationFrame(frame)
  }, [activeStage, currentStage.barWidth])

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

        {/* Main content */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">

          {/* ── Top row: Terminal + Funnel ──────────────────────────── */}
          <div className="flex gap-4 min-h-0" style={{ flex: '1 1 0' }}>

          {/* ── Left: Terminal query panel ───────────────────────────── */}
          <div
            className="w-[520px] flex-shrink-0 flex flex-col rounded-2xl border overflow-hidden"
            style={{ background: '#0A0F1E', borderColor: 'rgba(255,255,255,0.08)' }}
          >

            {/* Terminal chrome */}
            <div
              className="flex items-center gap-2 px-4 py-3 border-b flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)' }}
            >
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <span className="ml-2 text-xs font-mono" style={{ color: 'rgba(255,255,255,0.2)' }}>
                investigation.esql
              </span>
            </div>

            {/* Syntax-highlighted query */}
            <div className="flex-1 px-3 py-3 font-mono text-sm overflow-auto">
              {queryLines.map((line, lineIdx) => {
                const isRevealed = line.stageIdx <= activeStage
                const isActive   = line.stageIdx === activeStage
                return (
                  <div
                    key={lineIdx}
                    onClick={() => isRevealed && setActiveStage(line.stageIdx)}
                    className={`flex items-center rounded px-1 transition-all duration-200 ${
                      isRevealed && !isActive ? 'cursor-pointer hover:bg-white/[0.04]' : isActive ? '' : 'cursor-default'
                    }`}
                    style={{
                      height: '24px',
                      opacity: isRevealed ? 1 : 0.18,
                      backgroundColor: isActive ? 'rgba(255,255,255,0.06)' : undefined,
                    }}
                  >
                    <span
                      className="select-none w-5 flex-shrink-0 text-right mr-4 text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      {lineIdx + 1}
                    </span>
                    <span className="whitespace-pre leading-5">
                      {line.tokens.map((token, ti) => renderToken(token, ti))}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Active stage description */}
            <div
              className="px-4 py-2.5 border-t flex-shrink-0"
              style={{ borderColor: 'rgba(255,255,255,0.07)', minHeight: '48px' }}
            >
              <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.38)' }}>
                {currentStage.description}
              </p>
            </div>

          </div>

          {/* ── Center: Data reduction funnel ────────────────────────── */}
          <div className={`flex-1 min-w-0 rounded-2xl border p-3 flex flex-col ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}>
            <p className={`text-sm font-semibold uppercase tracking-wider mb-2 flex-shrink-0 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
              Data Reduction
            </p>
            <div className="flex flex-col flex-1 gap-2">
              {pipelineStages.map((stage, i) => {
                const isRevealed = i <= activeStage
                const isActive   = i === activeStage

                return (
                  <div
                    key={stage.id}
                    className={`flex-1 flex items-center transition-opacity duration-300 ${isRevealed ? 'opacity-100' : 'opacity-20'}`}
                  >
                    <div className="flex items-center gap-2 w-full">

                      {/* Stage icon */}
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                        style={{ backgroundColor: isRevealed
                          ? isDark ? 'rgba(72,239,207,0.18)' : 'rgba(11,100,221,0.12)'
                          : 'rgba(255,255,255,0.04)'
                        }}
                      >
                        <FontAwesomeIcon
                          icon={stage.icon}
                          className="text-xs"
                          style={{ color: isRevealed ? (isDark ? '#48EFCF' : '#0B64DD') : '#666' }}
                        />
                      </div>

                      {/* Bar track */}
                      <div className={`flex-1 h-6 rounded overflow-hidden relative ${isDark ? 'bg-white/5' : 'bg-elastic-dev-blue/5'}`}>
                        <div
                          ref={el => { barRefs.current[i] = el }}
                          className="h-full rounded"
                          style={{
                            width: isRevealed ? `${stage.barWidth}%` : '0%',
                            backgroundColor: isDark ? '#48EFCF' : '#0B64DD',
                            opacity: isActive ? 1 : isRevealed ? 0.55 : 0,
                          }}
                        />
                      </div>

                      {/* Label to the right of bar */}
                      {isRevealed && (
                        <span className={`text-xs font-semibold whitespace-nowrap tabular-nums w-28 flex items-center gap-1 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                          {stage.eventLabel}
                          {stage.ordered && (
                            <FontAwesomeIcon
                              icon={faArrowDownShortWide}
                              className="text-[10px] opacity-70"
                              title="Reordered, not reduced"
                            />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Right: Results table ──────────────────────────────────── */}
          <div
            className={`flex-1 min-w-0 rounded-2xl border transition-opacity duration-500 ${
              isComplete ? 'opacity-100' : 'opacity-25'
            } ${isDark ? 'bg-white/[0.02] border-white/10' : 'bg-white/60 border-elastic-dev-blue/10'}`}
          >
            <div className="p-3">
              <p className={`text-sm font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-white/60' : 'text-elastic-dev-blue/60'}`}>
                Query Results · Top 5 Suspicious Accounts
              </p>
              <table className="w-full text-sm font-mono">
                <thead>
                  <tr className={isDark ? 'text-white/30' : 'text-elastic-dev-blue/40'}>
                    <th className="text-left pb-2 font-medium">user.name</th>
                    <th className="text-right pb-2 font-medium">attempts</th>
                    <th className="text-right pb-2 font-medium">hosts</th>
                  </tr>
                </thead>
                <tbody>
                  {mockResults.map((row) => (
                    <tr
                      key={row.user}
                      className={`border-t ${isDark ? 'border-white/5' : 'border-elastic-dev-blue/5'}`}
                    >
                      <td className={`py-1.5 ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>
                        {row.user}
                      </td>
                      <td className={`text-right py-1.5 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                        {row.attempts.toLocaleString()}
                      </td>
                      <td className={`text-right py-1.5 ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                        {row.hosts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={`text-sm mt-3 pt-3 border-t transition-opacity duration-500 ${
                isComplete ? 'opacity-100' : 'opacity-0'
              } ${isDark ? 'border-white/10 text-white/40' : 'border-elastic-dev-blue/10 text-elastic-dev-blue/50'}`}>
                From{' '}
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-elastic-blue'}`}>1,000,000 events</span>
                {' '}→{' '}
                <span className={`font-semibold ${isDark ? 'text-elastic-teal' : 'text-elastic-blue'}`}>5 actionable results</span>
                {' '}in a single query.
              </p>
            </div>
          </div>

          </div>

          {/* ── Bottom row: Value props — revealed once the pipeline completes ─ */}
          <div className={`flex gap-3 flex-shrink-0 transition-opacity duration-500 ${isComplete ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
            {resolvedValueProps.map((prop) => (
              <div
                key={prop.title}
                className={`flex-1 p-4 rounded-2xl border ${isDark ? 'bg-white/[0.03] border-white/10' : 'bg-white border-elastic-dev-blue/10'}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: isDark ? 'rgba(72,239,207,0.13)' : 'rgba(11,100,221,0.1)' }}
                  >
                    <FontAwesomeIcon icon={prop.icon} className="text-xs" style={{ color: isDark ? '#48EFCF' : '#0B64DD' }} />
                  </div>
                  <div>
                    <p className={`font-bold text-sm mb-1 leading-snug ${isDark ? 'text-white' : 'text-elastic-dev-blue'}`}>
                      {prop.title}
                    </p>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-white/70' : 'text-elastic-dev-blue/70'}`}>
                      {prop.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}

export default ESQLScene
